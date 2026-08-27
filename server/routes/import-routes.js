const multer = require('multer');
const ExcelJS = require('exceljs');
const { resolvePrefix } = require('../utils/issueKeys');

/**
 * Importing a content-calendar spreadsheet as work items.
 *
 * The sheet is a grid rather than a list: column A is one row per calendar day, row 1 names
 * a client per column, and every filled cell is a piece of work for that client on that day.
 *
 *        A            B                 C
 *   1    Dates        Bakul Catering    Other Client
 *   2    08/01/26
 *   6    08/05/26     Creative 1
 *   9    08/08/26     Creative 2        Reel 3
 *
 * Import is deliberately two steps — parse to a preview, then commit what was confirmed.
 * A wrong date column silently creating sixty tasks is not something anyone wants to undo
 * by hand, so nothing is written until the caller sends back the rows they approved.
 */
module.exports = function setupImportRoutes(app, pool) {
  const db = { query: (sql, params) => pool.query(sql, params) };

  const responseError = (res, statusCode, message, error) => {
    console.error(`Error: ${message}`, error?.message || error);
    return res.status(statusCode).json({ error: message, details: error?.message || error });
  };

  // Held in memory: the file is parsed and discarded, never stored.
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }
  });

  // Local date parts — a spreadsheet date means the day written on it, not a UTC instant.
  const toISODate = (d) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  /**
   * Excel dates arrive as real Date objects when the cell was formatted as a date, and as
   * plain text when someone typed them. Text is genuinely ambiguous — 08/01/26 is either
   * 8 January or 1 August — so the caller states which order the file uses and we honour it
   * rather than guessing per row.
   */
  const parseCellDate = (value, dayFirst) => {
    if (value == null || value === '') return { date: null, ambiguous: false };
    if (value instanceof Date && !isNaN(value.getTime())) {
      return { date: toISODate(value), ambiguous: false };
    }

    const text = String(value).trim();
    const m = text.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
    if (m) {
      const a = Number(m[1]);
      const b = Number(m[2]);
      let year = Number(m[3]);
      if (year < 100) year += 2000;

      let day = dayFirst ? a : b;
      let month = dayFirst ? b : a;

      // One of the two numbers being over 12 settles the order regardless of the setting.
      if (a > 12) { day = a; month = b; }
      else if (b > 12) { day = b; month = a; }

      const d = new Date(year, month - 1, day);
      if (isNaN(d.getTime()) || d.getMonth() !== month - 1) return { date: null, ambiguous: false };
      return { date: toISODate(d), ambiguous: a <= 12 && b <= 12 };
    }

    const loose = new Date(text);
    if (!isNaN(loose.getTime())) return { date: toISODate(loose), ambiguous: false };
    return { date: null, ambiguous: false };
  };

  // exceljs cells can hold rich text or formula results, not just plain values.
  const cellText = (cell) => {
    const v = cell?.value;
    if (v == null) return '';
    if (typeof v === 'object') {
      if (v.richText) return v.richText.map(r => r.text).join('').trim();
      if (v.text) return String(v.text).trim();
      if (v.result != null) return String(v.result).trim();
      if (v instanceof Date) return v;
      return '';
    }
    return String(v).trim();
  };

  // ── Step 1: parse to a preview ────────────────────────────────────────
  app.post('/api/it-kanban/import/preview', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

      const dayFirst = String(req.query.dayFirst || req.body.dayFirst || 'false') === 'true';
      const department = String(req.query.department || req.body.department || 'IT')
        .replace(/\s*department\s*$/i, '').trim();

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.file.buffer);
      const sheet = workbook.worksheets[0];
      if (!sheet) return res.status(400).json({ error: 'The file has no worksheets' });

      // Row 1, column B onward: one client per column.
      const headerRow = sheet.getRow(1);
      const columns = [];
      headerRow.eachCell((cell, colNumber) => {
        if (colNumber === 1) return; // column A is the date column
        const name = cellText(cell);
        if (name) columns.push({ colNumber, name: String(name) });
      });

      if (columns.length === 0) {
        return res.status(400).json({
          error: 'No client columns found. Row 1 should name a client in column B onward.'
        });
      }

      // Suggest a project per column by matching the header against project names.
      const [projects] = await db.query(
        'SELECT id, name FROM projects WHERE name IS NOT NULL'
      );
      const matchProject = (header) => {
        const h = String(header).toLowerCase().trim();
        const exact = projects.find(p => String(p.name).toLowerCase().trim() === h);
        if (exact) return exact;
        return projects.find(p => {
          const n = String(p.name).toLowerCase().trim();
          return n.includes(h) || h.includes(n);
        }) || null;
      };
      const columnMap = columns.map(c => {
        const p = matchProject(c.name);
        return { ...c, projectId: p ? p.id : null, projectName: p ? p.name : null };
      });

      const rows = [];
      let ambiguousDates = 0;
      let skippedNoDate = 0;

      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const { date, ambiguous } = parseCellDate(cellText(row.getCell(1)), dayFirst);

        for (const col of columnMap) {
          const title = cellText(row.getCell(col.colNumber));
          if (!title || title instanceof Date) continue;

          if (!date) { skippedNoDate++; continue; }
          if (ambiguous) ambiguousDates++;

          rows.push({
            rowNumber,
            date,
            title: String(title),
            column: col.name,
            projectId: col.projectId,
            projectName: col.projectName
          });
        }
      });

      // Flag anything already imported so a re-upload doesn't duplicate the calendar.
      let duplicates = 0;
      if (rows.length > 0) {
        const [existing] = await db.query(
          'SELECT title, due_date, start_date, project_id FROM it_kanban_issues WHERE department = ?',
          [department]
        );
        const seen = new Set();
        for (const e of existing) {
          for (const d of [e.due_date, e.start_date]) {
            if (!d) continue;
            const iso = d instanceof Date ? toISODate(d) : String(d).slice(0, 10);
            seen.add(`${String(e.title).toLowerCase().trim()}|${iso}|${e.project_id ?? ''}`);
          }
        }
        for (const r of rows) {
          r.duplicate = seen.has(`${r.title.toLowerCase().trim()}|${r.date}|${r.projectId ?? ''}`);
          if (r.duplicate) duplicates++;
        }
      }

      res.json({
        sheetName: sheet.name,
        columns: columnMap,
        rows,
        summary: {
          total: rows.length,
          duplicates,
          ambiguousDates,
          skippedNoDate,
          unmatchedColumns: columnMap.filter(c => !c.projectId).map(c => c.name)
        }
      });
    } catch (error) {
      responseError(res, 500, 'Could not read the spreadsheet', error);
    }
  });

  // ── Step 2: create the confirmed rows ─────────────────────────────────
  app.post('/api/it-kanban/import/commit', async (req, res) => {
    const conn = await pool.getConnection();
    try {
      const {
        rows, department, dateField = 'due_date', sprintId = null,
        type = 'Task', priority = 'Medium', reporter, labels = []
      } = req.body;

      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ error: 'No rows to import' });
      }
      if (!['due_date', 'start_date'].includes(dateField)) {
        return res.status(400).json({ error: 'dateField must be due_date or start_date' });
      }

      const dept = String(department || 'IT').replace(/\s*department\s*$/i, '').trim();

      // A sprint owns its project, so work imported into one takes that project.
      let sprintProjectId = null;
      if (sprintId) {
        const [[s]] = await conn.query('SELECT project_id FROM sprints WHERE id = ?', [sprintId]);
        if (s && s.project_id != null) sprintProjectId = s.project_id;
      }

      // Same rule as single creation: the key's prefix comes from the project the work
      // lands in, which for an import is the destination sprint's project.
      const prefix = await resolvePrefix(conn, {
        projectId: sprintProjectId ?? (rows.find(r => r.projectId != null)?.projectId ?? null),
        department: dept
      });

      // One key lookup up front, then increment — cheaper than a query per row. Uses the
      // highest number in use, since issue_key is UNIQUE and a reused number would fail.
      const [existing] = await conn.query(
        'SELECT issue_key FROM it_kanban_issues WHERE issue_key LIKE ?', [`${prefix}-%`]
      );
      let nextNum = 101;
      for (const row of existing) {
        const parts = String(row.issue_key).split('-');
        const n = parts.length === 2 ? parseInt(parts[1], 10) : NaN;
        if (!isNaN(n) && n >= nextNum) nextNum = n + 1;
      }

      const labelsJson = JSON.stringify(Array.isArray(labels) ? labels.filter(Boolean) : []);
      const created = [];

      await conn.beginTransaction();
      for (const row of rows) {
        const title = String(row.title || '').trim();
        if (!title) continue;

        const key = `${prefix}-${nextNum++}`;
        const projectId = sprintProjectId ?? (row.projectId != null ? Number(row.projectId) : null);

        await conn.query(
          `INSERT INTO it_kanban_issues
             (issue_key, title, type, priority, status, assignee, reporter, team, team_id,
              project_id, description, department, due_date, start_date, sprint_id, labels,
              subtasks, linked_issues, comments, progress, original_estimate, remaining_estimate,
              time_spent, components, environment, vulnerability)
           VALUES (?, ?, ?, ?, 'TO DO', 'Unassigned', ?, 'None', NULL,
              ?, '', ?, ?, ?, ?, ?,
              ?, ?, ?, 0, '0h', '0h', '0h', '', '', '')`,
          [
            key, title, type, priority, reporter || 'Unassigned',
            projectId, dept,
            dateField === 'due_date' ? row.date : null,
            dateField === 'start_date' ? row.date : null,
            sprintId ? Number(sprintId) : null,
            labelsJson,
            JSON.stringify([]), JSON.stringify([]), JSON.stringify([])
          ]
        );
        created.push({ issue_key: key, title, date: row.date });
      }
      await conn.commit();

      res.json({ success: true, created: created.length, items: created });
    } catch (error) {
      try { await conn.rollback(); } catch (e) { /* already rolled back */ }
      responseError(res, 500, 'Could not import the work items', error);
    } finally {
      conn.release();
    }
  });
};

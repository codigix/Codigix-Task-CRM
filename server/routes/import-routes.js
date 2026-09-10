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

  const isWeekdayWord = (str) => {
    if (!str || typeof str !== 'string') return false;
    const s = str.trim().toLowerCase();
    const weekdays = [
      'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
      'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'
    ];
    return weekdays.includes(s);
  };

  const isDayHeader = (header) => {
    if (!header || typeof header !== 'string') return false;
    const h = header.trim().toLowerCase();
    return h === 'day' || h === 'days' || h === 'weekday' || h === 'day of week' || isWeekdayWord(h);
  };

  const isIndexHeader = (header) => {
    if (!header || typeof header !== 'string') return false;
    const h = header.trim().toLowerCase();
    return h === 'no.' || h === 'no' || h === 'sr.' || h === 'sr' || h === 'sr no' || h === 'sr. no.' || h === '#' || h === 'id';
  };

  /**
   * Excel dates arrive as real Date objects when the cell was formatted as a date, and as
   * plain text when someone typed them. Text is genuinely ambiguous — 08/01/26 is either
   * 8 January or 1 August — so the caller states which order the file uses and we honour it
   * rather than guessing per row.
   * If expectedWeekday is provided (from a Day column), we can test which interpretation
   * matches that day of the week to eliminate ambiguity automatically.
   */
  const parseCellDate = (value, dayFirst, expectedWeekday) => {
    if (value == null || value === '') return { date: null, ambiguous: false };
    if (value instanceof Date && !isNaN(value.getTime())) {
      return { date: toISODate(value), ambiguous: false };
    }

    const text = String(value).trim();
    // Check for YYYY-MM-DD
    const isoMatch = text.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
    if (isoMatch) {
      const year = Number(isoMatch[1]);
      const month = Number(isoMatch[2]);
      const day = Number(isoMatch[3]);
      const d = new Date(year, month - 1, day);
      if (!isNaN(d.getTime()) && d.getMonth() === month - 1) {
        return { date: toISODate(d), ambiguous: false };
      }
    }

    // Check for DD-MMM-YYYY or DD MMM YYYY (e.g. 01 Sep 2026, 02-Sep-2026)
    const monthNames = {
      jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
      apr: 4, april: 4, may: 5, jun: 6, june: 6,
      jul: 7, july: 7, aug: 8, august: 8, sep: 9, september: 9,
      oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12
    };
    const mNamed = text.match(/^(\d{1,2})[\s\-/.]([a-zA-Z]{3,9})[\s\-/.],?\s*(\d{2,4})$/);
    if (mNamed) {
      const day = Number(mNamed[1]);
      const monStr = mNamed[2].toLowerCase();
      let year = Number(mNamed[3]);
      if (year < 100) year += 2000;
      const month = monthNames[monStr];
      if (month) {
        const d = new Date(year, month - 1, day);
        if (!isNaN(d.getTime()) && d.getMonth() === month - 1) {
          return { date: toISODate(d), ambiguous: false };
        }
      }
    }

    const m = text.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
    if (m) {
      const a = Number(m[1]);
      const b = Number(m[2]);
      let year = Number(m[3]);
      if (year < 100) year += 2000;

      // When weekday is known (e.g. "Tuesday" from the Day column), use it to disambiguate MM-DD vs DD-MM
      if (expectedWeekday && a <= 12 && b <= 12 && a !== b) {
        const d1 = new Date(year, a - 1, b); // MM-DD
        const name1 = d1.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const d2 = new Date(year, b - 1, a); // DD-MM
        const name2 = d2.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

        const ew = String(expectedWeekday).toLowerCase().trim();
        if (name1 === ew || name1.startsWith(ew) || ew.startsWith(name1)) {
          return { date: toISODate(d1), ambiguous: false };
        } else if (name2 === ew || name2.startsWith(ew) || ew.startsWith(name2)) {
          return { date: toISODate(d2), ambiguous: false };
        }
      }

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

  /**
   * Parses the cell string for structured content:
   * Task: <Title>
   * Description: <Description>
   * If not structured with Task:, falls back to the full text as title.
   * If Task: is present but empty, returns null so the empty template cell is ignored.
   */
  const parseCellContent = (text) => {
    if (!text || typeof text !== 'string') return null;
    const str = text.trim();
    if (!str) return null;

    // Check if cell has structured Task: format
    if (/^task\s*:/i.test(str) || /[\r\n]\s*task\s*:/i.test(str)) {
      const taskMatch = str.match(/(?:^|[\r\n])\s*task\s*:[ \t]*([^\r\n]*)/i);
      const rawTitle = (taskMatch && taskMatch[1]) ? taskMatch[1].trim() : '';
      // If Task: has no title (e.g. "Task:\nDescription:"), skip the template cell
      if (!rawTitle) return null;

      let desc = '';
      const descMatch = str.match(/(?:^|[\r\n])\s*description\s*:[ \t]*([\s\S]*)/i);
      if (descMatch && descMatch[1]) {
        desc = descMatch[1].trim();
      }
      return { title: rawTitle, description: desc };
    }

    // Fallback for legacy format (e.g. "Creative 1")
    return { title: str, description: '' };
  };

  // ── Step 1: parse to a preview ────────────────────────────────────────
  app.post('/api/it-kanban/import/preview', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

      const dayFirst = String(req.query.dayFirst || req.body.dayFirst || 'false') === 'true';
      const department = String(req.query.department || req.body.department || 'IT')
        .replace(/\s*department\s*$/i, '').trim();
      const sprintId = req.query.sprintId || req.body.sprintId || null;

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.file.buffer);
      if (!workbook.worksheets || workbook.worksheets.length === 0) {
        return res.status(400).json({ error: 'The file has no worksheets' });
      }

      // Find the best worksheet: either one that contains a 'Date' header in row 1,
      // or the first sheet that isn't a README / Guide / Instructions tab.
      let sheet = null;
      for (const s of workbook.worksheets) {
        const hRow = s.getRow(1);
        let foundDate = false;
        hRow.eachCell(cell => {
          const t = String(cellText(cell) || '').trim().toLowerCase();
          if (t === 'date' || t === 'dates') foundDate = true;
        });
        if (foundDate) {
          sheet = s;
          break;
        }
      }
      if (!sheet) {
        sheet = workbook.worksheets.find(s => !/readme|instructions|guide/i.test(s.name)) || workbook.worksheets[0];
      }

      // Find date column and day column if present
      const headerRow = sheet.getRow(1);
      let dateCol = 1;
      let dayCol = null;

      headerRow.eachCell((cell, colNumber) => {
        const text = String(cellText(cell) || '').trim().toLowerCase();
        if (text === 'date' || text === 'dates') {
          dateCol = colNumber;
        } else if (isDayHeader(text)) {
          dayCol = colNumber;
        }
      });

      // If dayCol wasn't found by header name, check if column 2 cells are mostly weekday names
      if (!dayCol && dateCol === 1) {
        let weekdayCount = 0;
        let checkedRows = 0;
        for (let r = 2; r <= Math.min(10, sheet.rowCount); r++) {
          const val = cellText(sheet.getRow(r).getCell(2));
          if (val) {
            checkedRows++;
            if (isWeekdayWord(val)) weekdayCount++;
          }
        }
        if (checkedRows > 0 && weekdayCount >= checkedRows * 0.7) {
          dayCol = 2;
        }
      }

      // Look up target sprint's project name
      let targetProjectName = '';
      let targetProjectId = null;
      if (sprintId) {
        const [[s]] = await db.query(
          `SELECT s.*, p.id AS proj_id, p.name AS proj_name
           FROM sprints s
           LEFT JOIN projects p ON s.project_id = p.id
           WHERE s.id = ?`,
          [sprintId]
        );
        if (s) {
          targetProjectId = s.proj_id || s.project_id || null;
          targetProjectName = s.proj_name || s.name || '';
        }
      }

      // Collect all service / task columns (excluding dateCol, dayCol, and index columns like "No.")
      const columns = [];
      const totalCols = Math.max(headerRow.cellCount || 0, sheet.columnCount || 0);

      for (let c = 1; c <= totalCols; c++) {
        if (c === dateCol) continue;
        if (dayCol && c === dayCol) continue;

        const rawHeader = cellText(headerRow.getCell(c));
        const headerStr = String(rawHeader || '').trim();
        if (isDayHeader(headerStr)) continue;
        if (isIndexHeader(headerStr)) continue;

        // Check if this column has header or data in subsequent rows
        let hasData = Boolean(headerStr);
        if (!hasData) {
          for (let r = 2; r <= Math.min(15, sheet.rowCount); r++) {
            const v = cellText(sheet.getRow(r).getCell(c));
            if (v && !isWeekdayWord(v) && !(v instanceof Date)) {
              hasData = true;
              break;
            }
          }
        }

        if (hasData) {
          const colName = headerStr || `Service ${columns.length + 1}`;
          columns.push({ colNumber: c, name: colName });
        }
      }

      if (columns.length === 0) {
        return res.status(400).json({
          error: 'No service or task columns found. Row 1 should name service columns (e.g. SEO, GMB, Video).'
        });
      }

      // Suggest a project per column if not already bound to a sprint project
      const [projects] = await db.query(
        'SELECT id, name FROM projects WHERE name IS NOT NULL'
      );
      const matchProject = (header) => {
        if (!header) return null;
        const h = String(header).toLowerCase().trim();
        const hBase = h.replace(/s$/i, '');
        const exact = projects.find(p => {
          const pn = String(p.name).toLowerCase().trim();
          return pn === h || pn === hBase || pn.replace(/s$/i, '') === hBase;
        });
        if (exact) return exact;
        return projects.find(p => {
          const n = String(p.name).toLowerCase().trim();
          return n.includes(h) || h.includes(n) || (hBase.length >= 3 && n.includes(hBase));
        }) || null;
      };

      const columnMap = columns.map(c => {
        const p = matchProject(c.name);
        return {
          ...c,
          projectId: targetProjectId || (p ? p.id : null),
          projectName: targetProjectName || (p ? p.name : null)
        };
      });

      const rows = [];
      let ambiguousDates = 0;
      let skippedNoDate = 0;

      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;

        const rawDate = cellText(row.getCell(dateCol));
        const rawDay = dayCol ? cellText(row.getCell(dayCol)) : '';
        const { date, ambiguous } = parseCellDate(rawDate, dayFirst, rawDay);

        // Skip rows with no content in any service/task column
        let hasAnyCell = false;
        for (const col of columnMap) {
          const v = cellText(row.getCell(col.colNumber));
          if (v && !isWeekdayWord(v) && !(v instanceof Date)) {
            const parsed = parseCellContent(String(v));
            if (parsed && parsed.title) {
              hasAnyCell = true;
              break;
            }
          }
        }
        if (!hasAnyCell) return;

        for (const col of columnMap) {
          const rawVal = cellText(row.getCell(col.colNumber));
          if (!rawVal || rawVal instanceof Date) continue;

          const parsed = parseCellContent(String(rawVal));
          if (!parsed || !parsed.title || isWeekdayWord(parsed.title)) continue;

          if (!date) { skippedNoDate++; continue; }
          if (ambiguous) ambiguousDates++;

          const rawTitle = parsed.title;
          const description = parsed.description;
          const service = col.name;

          // If targetProjectName is present, prepend it to the title unless already present
          const prefix = targetProjectName ? `${targetProjectName} - ` : '';
          const fullTitle = rawTitle.startsWith(prefix) ? rawTitle : `${prefix}${rawTitle}`;

          rows.push({
            rowNumber,
            colNumber: col.colNumber,
            date,
            title: fullTitle,
            rawTitle,
            description,
            service,
            column: col.name,
            projectId: targetProjectId || col.projectId,
            projectName: targetProjectName || col.projectName
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

      const unmatchedColumns = columnMap.filter(c => {
        if (c.projectId) return false;
        return !rows.some(r => r.colNumber === c.colNumber && r.projectId);
      }).map(c => c.name);

      res.json({
        sheetName: sheet.name,
        projectName: targetProjectName,
        projectId: targetProjectId,
        columns: columnMap,
        rows,
        summary: {
          total: rows.length,
          duplicates,
          ambiguousDates,
          skippedNoDate,
          unmatchedColumns
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
      if (!['due_date', 'start_date', 'both'].includes(dateField)) {
        return res.status(400).json({ error: 'dateField must be due_date, start_date, or both' });
      }

      const dept = String(department || 'IT').replace(/\s*department\s*$/i, '').trim();

      // A sprint owns its project, so work imported into one takes that project.
      let sprintProjectId = null;
      if (sprintId) {
        const [[s]] = await conn.query('SELECT project_id FROM sprints WHERE id = ?', [sprintId]);
        if (s && s.project_id != null) sprintProjectId = s.project_id;
      }

      // Resolve key prefix
      const prefix = await resolvePrefix(conn, {
        projectId: sprintProjectId ?? (rows.find(r => r.projectId != null)?.projectId ?? null),
        department: dept
      });

      const [existing] = await conn.query(
        'SELECT issue_key FROM it_kanban_issues WHERE issue_key LIKE ?', [`${prefix}-%`]
      );
      let nextNum = 101;
      for (const row of existing) {
        const str = String(row.issue_key || '').trim();
        let n = NaN;
        if (str.toUpperCase().startsWith(`${prefix.toUpperCase()}-`)) {
          n = parseInt(str.slice(prefix.length + 1), 10);
        }
        if (isNaN(n)) {
          const parts = str.split('-');
          n = parseInt(parts[parts.length - 1], 10);
        }
        if (!isNaN(n) && n >= nextNum) nextNum = n + 1;
      }

      const baseLabels = Array.isArray(labels) ? labels.filter(Boolean) : [];
      const created = [];

      await conn.beginTransaction();
      for (const row of rows) {
        const title = String(row.title || '').trim();
        if (!title) continue;

        const key = `${prefix}-${nextNum++}`;
        const projectId = sprintProjectId ?? (row.projectId != null ? Number(row.projectId) : null);
        const description = String(row.description || '').trim();
        const service = String(row.service || row.column || '').trim();

        // Include service in labels and components
        const rowLabels = [...new Set([...baseLabels, service].filter(Boolean))];
        const labelsJson = JSON.stringify(rowLabels);

        await conn.query(
          `INSERT INTO it_kanban_issues
             (issue_key, title, type, priority, status, assignee, reporter, team, team_id,
              project_id, description, department, due_date, start_date, sprint_id, labels,
              subtasks, linked_issues, comments, progress, original_estimate, remaining_estimate,
              time_spent, components, environment, vulnerability)
           VALUES (?, ?, ?, ?, 'TO DO', 'Unassigned', ?, 'None', NULL,
              ?, ?, ?, ?, ?, ?, ?,
              ?, ?, ?, 0, '0h', '0h', '0h', ?, '', '')`,
          [
            key, title, type, priority, reporter || 'Unassigned',
            projectId, description, dept,
            (dateField === 'due_date' || dateField === 'both') ? row.date : null,
            (dateField === 'start_date' || dateField === 'both') ? row.date : null,
            sprintId ? Number(sprintId) : null,
            labelsJson,
            JSON.stringify([]), JSON.stringify([]), JSON.stringify([]),
            service
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

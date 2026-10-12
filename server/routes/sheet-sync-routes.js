const ExcelJS = require('exceljs');
const { resolvePrefix, nextIssueKey } = require('../utils/issueKeys');
const { requireManager } = require('../middleware/session');

/**
 * Google Sheet → Backlog sync.
 *
 * A manager links a Google Sheet once (shared as "Anyone with the link can view"). Whenever
 * someone presses Sync, the sheet is downloaded and every client tab is read as a content
 * calendar (the same layout the manual import understands):
 *
 *        A     B           C          D      E        …
 *   1    No.   Date        Day        SEO    GMB      …   ← service columns become labels
 *   2    1     2026-10-01  Thursday          Publish GMB Post – …
 *
 * The tab name picks the project ("Bakul Caterings" → project Bakul Caterings) and that
 * project's running sprint; with no sprint the work goes to the Backlog. Each filled cell
 * becomes one ticket, due on that row's date.
 *
 * Every cell that became a ticket is remembered (sheet_sync_items), so syncing again only
 * adds what is new. A ticket deleted in the system is not brought back, and a cell whose
 * text changes updates its ticket while work on it has not started.
 */

const NOT_STARTED = ['', 'TO DO', 'TODO', 'BACKLOG', 'OPEN', 'NEW'];
const NON_CALENDAR_TAB = /summary|workflow|sources|readme|instructions|guide/i;
const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const pad = (n) => String(n).padStart(2, '0');
const ymdLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const sheetIdFrom = (url) => {
  const m = String(url || '').match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]{20,})/);
  return m ? m[1] : null;
};

// exceljs cells can hold rich text, hyperlinks or formula results, not just plain values.
const cellValue = (cell) => {
  const v = cell?.value;
  if (v == null) return '';
  if (v instanceof Date) return v;
  if (typeof v === 'object') {
    if (v.richText) return v.richText.map(r => r.text).join('').trim();
    if (v.text) return String(v.text).trim();
    if (v.result instanceof Date) return v.result;
    if (v.result != null) return String(v.result).trim();
    return '';
  }
  return String(v).trim();
};

// Sheet dates arrive as dates (stored as UTC midnight) or as text typed by hand. Text is read
// day-first (01/10/2026 = 1 October), as written in India.
const parseDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;
  }
  const text = String(value).trim();
  let m = text.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})/);
  if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  m = text.match(/^(\d{1,2})[\s\-/.]([a-zA-Z]{3,9})[\s\-/.,]*(\d{2,4})$/);
  if (m && MONTHS[m[2].slice(0, 3).toLowerCase()]) {
    const y = Number(m[3]) < 100 ? 2000 + Number(m[3]) : Number(m[3]);
    return `${y}-${pad(MONTHS[m[2].slice(0, 3).toLowerCase()])}-${pad(m[1])}`;
  }
  m = text.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (m) {
    let day = Number(m[1]); let month = Number(m[2]);
    if (month > 12 && day <= 12) [day, month] = [month, day];
    const y = Number(m[3]) < 100 ? 2000 + Number(m[3]) : Number(m[3]);
    const d = new Date(y, month - 1, day);
    return d.getMonth() === month - 1 ? ymdLocal(d) : null;
  }
  return null;
};

// "Task: <title>\nDescription: <text>" is supported; otherwise the whole cell is the title.
const parseCell = (text) => {
  const str = String(text || '').trim();
  if (!str) return null;
  if (/(^|[\r\n])\s*task\s*:/i.test(str)) {
    const t = str.match(/(?:^|[\r\n])\s*task\s*:[ \t]*([^\r\n]*)/i);
    const title = t && t[1] ? t[1].trim() : '';
    if (!title) return null;
    const d = str.match(/(?:^|[\r\n])\s*description\s*:[ \t]*([\s\S]*)/i);
    return { title, description: d && d[1] ? d[1].trim() : '' };
  }
  const [first, ...rest] = str.split(/\r?\n/);
  return { title: first.trim(), description: rest.join('\n').trim() };
};

/** Reads one tab as a calendar. Returns null when the tab has no Date column. */
const readCalendarTab = (sheet) => {
  let headerRowNum = null;
  let dateCol = null;
  for (let r = 1; r <= Math.min(3, sheet.rowCount) && !dateCol; r++) {
    sheet.getRow(r).eachCell((cell, c) => {
      const t = String(cellValue(cell) || '').toLowerCase();
      if (!dateCol && (t === 'date' || t === 'dates')) { dateCol = c; headerRowNum = r; }
    });
  }
  if (!dateCol) return null;

  const header = sheet.getRow(headerRowNum);
  const services = [];
  for (let c = 1; c <= sheet.columnCount; c++) {
    if (c === dateCol) continue;
    const name = String(cellValue(header.getCell(c)) || '').trim();
    const h = name.toLowerCase();
    if (!name || ['no', 'no.', 'sr', 'sr.', 'sr no', 'sr. no.', '#', 'id', 'day', 'days', 'weekday'].includes(h) || WEEKDAYS.includes(h)) continue;
    services.push({ col: c, name });
  }

  const cells = [];
  for (let r = headerRowNum + 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const date = parseDate(cellValue(row.getCell(dateCol)));
    for (const s of services) {
      const raw = cellValue(row.getCell(s.col));
      if (!raw || raw instanceof Date) continue;
      const parsed = parseCell(raw);
      if (!parsed || !parsed.title || WEEKDAYS.includes(parsed.title.toLowerCase())) continue;
      cells.push({ row: r, date, service: s.name, ...parsed });
    }
  }
  return { services: services.map(s => s.name), cells };
};

module.exports = function setupSheetSyncRoutes(app, pool) {
  const running = new Set(); // one sync per sheet at a time

  const ensureTables = (async () => {
    await pool.query(`CREATE TABLE IF NOT EXISTS sheet_sync_sources (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(160) NULL,
      sheet_url VARCHAR(600) NOT NULL,
      sheet_id VARCHAR(120) NOT NULL,
      department VARCHAR(60) NOT NULL DEFAULT 'Marketing',
      created_by VARCHAR(120) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_synced_at DATETIME NULL,
      last_synced_by VARCHAR(120) NULL,
      last_result JSON NULL
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS sheet_sync_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      source_id INT NOT NULL,
      cell_key VARCHAR(400) NOT NULL,
      issue_key VARCHAR(60) NOT NULL,
      title VARCHAR(500) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_cell (source_id, cell_key(255)),
      KEY idx_issue (issue_key)
    )`);
  })().catch(e => console.error('sheet sync tables:', e.message));

  const deptOf = (d) => String(d || 'Marketing').replace(/\s*department\s*$/i, '').trim() || 'Marketing';

  const download = async (sheetId) => {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 45000);
    try {
      const r = await fetch(url, { signal: ctrl.signal, redirect: 'follow' });
      const type = r.headers.get('content-type') || '';
      if (!r.ok || !type.includes('spreadsheetml')) {
        const err = new Error('The sheet could not be opened. In Google Sheets choose Share → General access → "Anyone with the link" (Viewer), then try again.');
        err.status = 400;
        throw err;
      }
      const buf = Buffer.from(await r.arrayBuffer());
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buf);
      return wb;
    } catch (e) {
      if (e.name === 'AbortError') { const err = new Error('Google Sheets took too long to respond. Try again.'); err.status = 504; throw err; }
      throw e;
    } finally {
      clearTimeout(timer);
    }
  };

  const publicSource = (s) => s && ({
    id: s.id, name: s.name, url: s.sheet_url, department: s.department,
    createdBy: s.created_by, lastSyncedAt: s.last_synced_at, lastSyncedBy: s.last_synced_by,
    lastResult: typeof s.last_result === 'string' ? JSON.parse(s.last_result) : s.last_result
  });

  // ── Linked sheets for a board ─────────────────────────────────────────
  app.get('/api/sheet-sync/sources', async (req, res) => {
    try {
      await ensureTables;
      const dept = deptOf(req.query.department);
      const [rows] = await pool.query('SELECT * FROM sheet_sync_sources WHERE department = ? ORDER BY id', [dept]);
      res.json({ sources: rows.map(publicSource), canManage: Boolean(req.user?.isManager || req.user?.isAdmin) });
    } catch (e) {
      console.error('sheet sources:', e.message);
      res.status(500).json({ error: 'Could not load the linked sheets' });
    }
  });

  app.post('/api/sheet-sync/sources', requireManager, async (req, res) => {
    try {
      await ensureTables;
      const url = String(req.body.url || '').trim();
      const sheetId = sheetIdFrom(url);
      if (!sheetId) return res.status(400).json({ error: 'Paste the link of a Google Sheet (it contains /spreadsheets/d/…).' });
      const dept = deptOf(req.body.department);
      // Opening it now tells the manager straight away if sharing is wrong.
      const wb = await download(sheetId);
      const tabs = wb.worksheets.filter(s => !NON_CALENDAR_TAB.test(s.name) && readCalendarTab(s)).map(s => s.name);
      const name = String(req.body.name || '').trim() || `Google Sheet (${tabs.length} client tab${tabs.length === 1 ? '' : 's'})`;
      const [r] = await pool.query(
        'INSERT INTO sheet_sync_sources (name, sheet_url, sheet_id, department, created_by) VALUES (?, ?, ?, ?, ?)',
        [name, url, sheetId, dept, req.user?.name || null]
      );
      const [[row]] = await pool.query('SELECT * FROM sheet_sync_sources WHERE id = ?', [r.insertId]);
      res.json({ source: publicSource(row), tabs });
    } catch (e) {
      console.error('link sheet:', e.message);
      res.status(e.status || 500).json({ error: e.status ? e.message : 'Could not link the sheet' });
    }
  });

  app.delete('/api/sheet-sync/sources/:id', requireManager, async (req, res) => {
    try {
      await ensureTables;
      await pool.query('DELETE FROM sheet_sync_items WHERE source_id = ?', [req.params.id]);
      await pool.query('DELETE FROM sheet_sync_sources WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (e) {
      console.error('unlink sheet:', e.message);
      res.status(500).json({ error: 'Could not unlink the sheet' });
    }
  });

  // ── Sync: read the sheet and add what is new ──────────────────────────
  // dryRun=true reports what would happen without writing anything.
  app.post('/api/sheet-sync/sources/:id/run', async (req, res) => {
    const sourceId = Number(req.params.id);
    const dryRun = req.body?.dryRun === true || req.query.dryRun === 'true';
    if (!req.user) return res.status(401).json({ error: 'Please sign in again.' });
    if (running.has(sourceId)) return res.status(409).json({ error: 'This sheet is already syncing. Wait a moment and refresh.' });
    running.add(sourceId);
    let conn = null;
    try {
      await ensureTables;
      const [[source]] = await pool.query('SELECT * FROM sheet_sync_sources WHERE id = ?', [sourceId]);
      if (!source) return res.status(404).json({ error: 'That sheet is no longer linked.' });
      const actor = req.user.name || 'Sheet sync';
      const wb = await download(source.sheet_id);

      const [projects] = await pool.query('SELECT id, name, title FROM projects');
      const projectByName = new Map();
      projects.forEach(p => [p.name, p.title].filter(Boolean).forEach(n => { if (!projectByName.has(norm(n))) projectByName.set(norm(n), p); }));
      const [sprints] = await pool.query(
        "SELECT id, name, status, project_id, department FROM sprints WHERE status <> 'Completed' ORDER BY FIELD(status, 'Active', 'Planned'), id DESC"
      );
      const sprintForProject = (pid) => sprints.find(s => Number(s.project_id) === Number(pid)) || null;

      const [linkedRows] = await pool.query('SELECT cell_key, issue_key, title FROM sheet_sync_items WHERE source_id = ?', [sourceId]);
      const linked = new Map(linkedRows.map(r => [r.cell_key, r]));

      const summary = { created: 0, updated: 0, alreadyInSystem: 0, unchanged: 0, deletedInSystem: 0, noDate: 0, tabs: [], skippedTabs: [] };
      const plan = []; // { kind: 'create'|'link'|'update', ... }

      for (const sheet of wb.worksheets) {
        if (NON_CALENDAR_TAB.test(sheet.name)) continue;
        const cal = readCalendarTab(sheet);
        if (!cal) continue;
        if (cal.cells.length === 0) { summary.skippedTabs.push({ tab: sheet.name, reason: 'No tasks filled in' }); continue; }
        const project = projectByName.get(norm(sheet.name))
          || projects.find(p => { const n = norm(p.name || p.title); return n && n.length >= 4 && (n.includes(norm(sheet.name)) || norm(sheet.name).includes(n)); });
        if (!project) {
          summary.skippedTabs.push({ tab: sheet.name, reason: `No project named "${sheet.name}". Create the project (or rename the tab to match it) and sync again.` });
          continue;
        }
        const sprint = sprintForProject(project.id);
        const projectName = project.name || project.title;

        const [existing] = await pool.query(
          'SELECT issue_key, title, description, status, DATE_FORMAT(due_date, "%Y-%m-%d") AS due, DATE_FORMAT(start_date, "%Y-%m-%d") AS start FROM it_kanban_issues WHERE project_id = ?',
          [project.id]
        );
        const byKey = new Map(existing.map(e => [e.issue_key, e]));
        const keyByTitleDate = new Map();
        existing.forEach(e => [e.due, e.start].filter(Boolean).forEach(d => keyByTitleDate.set(`${String(e.title).toLowerCase().trim()}|${d}`, e.issue_key)));

        const seenKeys = new Map();
        const tab = { tab: sheet.name, project: projectName, sprint: sprint ? sprint.name : null, created: 0, updated: 0, existing: 0 };
        for (const cell of cal.cells) {
          if (!cell.date) { summary.noDate += 1; continue; }
          // Tab + date + service names a cell even if rows are inserted above it; a second
          // cell for the same day and service (a repeated date row) gets "#2".
          const baseKey = `${norm(sheet.name)}|${cell.date}|${norm(cell.service)}`;
          const nth = (seenKeys.get(baseKey) || 0) + 1;
          seenKeys.set(baseKey, nth);
          const cellKey = nth === 1 ? baseKey : `${baseKey}#${nth}`;
          const title = `${sheet.name.trim()} - ${cell.title}`.slice(0, 480);
          const link = linked.get(cellKey);
          if (link) {
            const issue = byKey.get(link.issue_key);
            if (!issue) { summary.deletedInSystem += 1; continue; }
            const changed = issue.title !== title || (cell.description && cell.description !== (issue.description || ''));
            if (changed && NOT_STARTED.includes(String(issue.status || '').trim().toUpperCase())) {
              plan.push({ kind: 'update', cellKey, issueKey: issue.issue_key, title, description: cell.description, oldTitle: issue.title });
              summary.updated += 1; tab.updated += 1;
            } else {
              summary.unchanged += 1; tab.existing += 1;
            }
            continue;
          }
          const match = keyByTitleDate.get(`${title.toLowerCase()}|${cell.date}`);
          if (match) {
            plan.push({ kind: 'link', cellKey, issueKey: match, title });
            summary.alreadyInSystem += 1; tab.existing += 1;
            continue;
          }
          plan.push({
            kind: 'create', cellKey, title, description: cell.description, date: cell.date, service: cell.service,
            projectId: project.id, sprint, department: sprint?.department || source.department
          });
          keyByTitleDate.set(`${title.toLowerCase()}|${cell.date}`, '(new)');
          summary.created += 1; tab.created += 1;
        }
        summary.tabs.push(tab);
      }

      const preview = plan.filter(p => p.kind !== 'link').slice(0, 300).map(p => ({
        kind: p.kind, title: p.title, date: p.date || null, service: p.service || null,
        sprint: p.sprint ? p.sprint.name : (p.kind === 'create' ? null : undefined), from: p.oldTitle
      }));
      if (dryRun) return res.json({ dryRun: true, ...summary, preview });

      conn = await pool.getConnection();
      await conn.beginTransaction();
      const nextKeyByPrefix = new Map();
      const created = [];
      for (const p of plan) {
        if (p.kind === 'link') {
          await conn.query('INSERT IGNORE INTO sheet_sync_items (source_id, cell_key, issue_key, title) VALUES (?, ?, ?, ?)', [sourceId, p.cellKey, p.issueKey, p.title]);
        } else if (p.kind === 'update') {
          await conn.query('UPDATE it_kanban_issues SET title = ?, description = COALESCE(NULLIF(?, \'\'), description) WHERE issue_key = ?', [p.title, p.description || '', p.issueKey]);
          await conn.query('UPDATE sheet_sync_items SET title = ? WHERE source_id = ? AND cell_key = ?', [p.title, sourceId, p.cellKey]);
          await conn.query('INSERT INTO it_kanban_history (issue_key, field, old_value, new_value, changed_by) VALUES (?, ?, ?, ?, ?)',
            [p.issueKey, 'title', p.oldTitle, p.title, `${actor} (Google Sheet sync)`]).catch(() => {});
        } else {
          const prefix = await resolvePrefix(conn, { projectId: p.projectId, department: p.department });
          let key;
          if (nextKeyByPrefix.has(prefix)) {
            const n = nextKeyByPrefix.get(prefix) + 1;
            nextKeyByPrefix.set(prefix, n);
            key = `${prefix}-${n}`;
          } else {
            key = await nextIssueKey(conn, prefix);
            nextKeyByPrefix.set(prefix, parseInt(key.slice(prefix.length + 1), 10));
          }
          await conn.query(
            `INSERT INTO it_kanban_issues
               (issue_key, title, type, priority, status, assignee, reporter, team, team_id,
                project_id, description, department, due_date, start_date, sprint, sprint_id, labels,
                subtasks, linked_issues, comments, progress, original_estimate, remaining_estimate,
                time_spent, components, environment, vulnerability)
             VALUES (?, ?, 'Task', 'Medium', 'TO DO', 'Unassigned', ?, 'None', NULL,
                ?, ?, ?, ?, ?, ?, ?, ?,
                '[]', '[]', '[]', 0, '0h', '0h', '0h', ?, '', '')`,
            [key, p.title, actor, p.projectId, p.description || '', p.department, p.date, p.date,
              p.sprint ? p.sprint.name : null, p.sprint ? p.sprint.id : null,
              JSON.stringify(['content-calendar', p.service]), p.service]
          );
          await conn.query('INSERT INTO sheet_sync_items (source_id, cell_key, issue_key, title) VALUES (?, ?, ?, ?)', [sourceId, p.cellKey, key, p.title]);
          await conn.query('INSERT INTO it_kanban_history (issue_key, field, old_value, new_value, changed_by) VALUES (?, ?, ?, ?, ?)',
            [key, 'created', '', 'From Google Sheet', `${actor} (Google Sheet sync)`]).catch(() => {});
          created.push(key);
        }
      }
      const result = { ...summary, at: new Date().toISOString(), by: actor };
      await conn.query('UPDATE sheet_sync_sources SET last_synced_at = NOW(), last_synced_by = ?, last_result = ? WHERE id = ?',
        [actor, JSON.stringify(result), sourceId]);
      await conn.commit();
      res.json({ ...result, createdKeys: created.slice(0, 50) });
    } catch (e) {
      if (conn) { try { await conn.rollback(); } catch (_) { /* nothing to undo */ } }
      console.error('sheet sync:', e.message);
      res.status(e.status || 500).json({ error: e.status ? e.message : 'The sync failed; nothing was changed. Try again.' });
    } finally {
      if (conn) conn.release();
      running.delete(sourceId);
    }
  });
};

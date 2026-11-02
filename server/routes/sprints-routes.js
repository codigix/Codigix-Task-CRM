/**
 * Scrum sprints for the Kanban boards, following Jira's model:
 *
 *  - Work items sit either in the Backlog (sprint_id NULL) or inside a sprint.
 *  - Sprints are created and filled from the Backlog view.
 *  - Starting a sprint makes it Active; only the active sprint's items show on the Board.
 *  - Completing a sprint keeps finished work done and moves the unfinished items either
 *    back to the Backlog or forward into another sprint.
 *
 * Sprints are scoped by department, matching how the boards themselves are scoped.
 */
// Sprint planning (create, edit, start, complete, delete, move or rank work) is for managers;
// everyone can still read sprints and the backlog.
const { requireManager } = require('../middleware/session');
const { purgeScreenshots } = require('../services/screenshotCleanup');

module.exports = function setupSprintsRoutes(app, pool) {
  const db = { query: (sql, params) => pool.query(sql, params) };

  const responseError = (res, statusCode, message, error) => {
    console.error(`Error: ${message}`, error?.message || error);
    return res.status(statusCode).json({ error: message, details: error?.message || error });
  };

  // Statuses that count as finished. Anything else rolls over on sprint completion.
  const DONE_STATUSES = ['DONE', 'COMPLETED', 'CLOSED'];
  const isDone = (status) => DONE_STATUSES.includes(String(status || '').toUpperCase().trim());
  // Unfinished work carried out of a completed sprint lands in this board column.
  const PENDING_STATUS = 'LAST MONTH PENDING';

  // ── Schema ────────────────────────────────────────────────────────────
  (async () => {
    try {
      // The sprints table predates this feature and required a project_id. Sprints here are
      // department-scoped, so make project_id optional and add the columns we need.
      await pool.query(`
        CREATE TABLE IF NOT EXISTS sprints (
          id INT AUTO_INCREMENT PRIMARY KEY,
          project_id INT,
          name VARCHAR(255) NOT NULL,
          goal TEXT,
          start_date DATE,
          end_date DATE,
          status ENUM('Planned', 'Active', 'Completed', 'Cancelled') DEFAULT 'Planned',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);

      const [cols] = await pool.query('DESCRIBE sprints');
      const names = cols.map(c => c.Field);

      if (!names.includes('department')) {
        await pool.query("ALTER TABLE sprints ADD COLUMN department VARCHAR(50) DEFAULT 'IT'");
        console.log("Added 'department' column to 'sprints'.");
      }
      if (!names.includes('completed_at')) {
        await pool.query('ALTER TABLE sprints ADD COLUMN completed_at DATETIME DEFAULT NULL');
      }
      if (!names.includes('sort_order')) {
        await pool.query('ALTER TABLE sprints ADD COLUMN sort_order INT DEFAULT 0');
      }

      // project_id was NOT NULL with a foreign key; sprints are department-scoped now.
      const projectCol = cols.find(c => c.Field === 'project_id');
      if (projectCol && String(projectCol.Null).toUpperCase() === 'NO') {
        try {
          const [fks] = await pool.query(`
            SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sprints'
              AND COLUMN_NAME = 'project_id' AND REFERENCED_TABLE_NAME IS NOT NULL
          `);
          for (const fk of fks) {
            await pool.query(`ALTER TABLE sprints DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``);
          }
          await pool.query('ALTER TABLE sprints MODIFY COLUMN project_id INT NULL');
          console.log("Made 'sprints.project_id' optional.");
        } catch (e) {
          console.warn('Could not relax sprints.project_id:', e.message);
        }
      }

      // Link work items to a sprint. NULL means "in the backlog".
      const [issueCols] = await pool.query('DESCRIBE it_kanban_issues');
      const issueFields = issueCols.map(c => c.Field);
      if (!issueFields.includes('sprint_id')) {
        await pool.query('ALTER TABLE it_kanban_issues ADD COLUMN sprint_id INT DEFAULT NULL');
        await pool.query('ALTER TABLE it_kanban_issues ADD INDEX idx_sprint_id (sprint_id)');
        console.log("Added 'sprint_id' column to 'it_kanban_issues'.");
      }

      // Manual priority order, the equivalent of Jira's Rank. Every list that shows work
      // items sorts by this, so dragging in the Backlog reorders the List and Board too.
      if (!issueFields.includes('rank_order')) {
        await pool.query('ALTER TABLE it_kanban_issues ADD COLUMN rank_order INT DEFAULT NULL');
        await pool.query('ALTER TABLE it_kanban_issues ADD INDEX idx_rank_order (rank_order)');
        // Seed from id so existing work starts in creation order rather than unranked.
        // Only the relative order matters — the first drag renumbers everything to 1..n.
        await pool.query('UPDATE it_kanban_issues SET rank_order = id');
        console.log("Added 'rank_order' column to 'it_kanban_issues' and seeded it.");
      }
    } catch (e) {
      console.error('Error migrating sprint schema:', e.message);
    }
  })();

  const deptFilter = (department) => String(department || 'IT').replace(/\s*department\s*$/i, '').trim();

  /**
   * A sprint can belong to a project. When work lands in such a sprint it takes on that
   * project, so the sprint is the thing that decides which project its work belongs to.
   *
   * Sprints with no project leave the items' own project untouched, so this is opt-in.
   * `runner` is either the pool or a transaction connection, since drags run in one.
   */
  const inheritSprintProject = async (runner, sprintId, issueKeys) => {
    if (!sprintId || !Array.isArray(issueKeys) || issueKeys.length === 0) return 0;

    const [[sprint]] = await runner.query('SELECT project_id FROM sprints WHERE id = ?', [sprintId]);
    if (!sprint || sprint.project_id == null) return 0;

    const [result] = await runner.query(
      `UPDATE it_kanban_issues SET project_id = ?
       WHERE issue_key IN (${issueKeys.map(() => '?').join(',')})`,
      [sprint.project_id, ...issueKeys]
    );
    return result.affectedRows;
  };

  /**
   * The mirror of the above: work sitting in the Backlog belongs to no sprint, so it belongs
   * to no project either. Without this, an item dropped back to the Backlog would keep the
   * project it picked up from whichever sprint it used to be in.
   */
  const clearProjectForBacklog = async (runner, issueKeys) => {
    if (!Array.isArray(issueKeys) || issueKeys.length === 0) return 0;
    const [result] = await runner.query(
      `UPDATE it_kanban_issues SET project_id = NULL
       WHERE issue_key IN (${issueKeys.map(() => '?').join(',')})`,
      issueKeys
    );
    return result.affectedRows;
  };

  // ── List sprints for a board, with their work items ───────────────────
  app.get('/api/sprints', async (req, res) => {
    try {
      const rawDept = req.query.department;
      const includeCompleted = req.query.includeCompleted === 'true';
      const role = (req.query.role || req.headers['x-user-role'] || '').toLowerCase();
      const isManager = role.includes('manager') || role.includes('admin') || role.includes('lead') || role.includes('head') || role.includes('director');

      let sql = `
        SELECT DISTINCT s.*, 
               COALESCE(p.name, p.title) AS project_name, 
               p.title AS project_title,
               c.company_name AS client_name
        FROM sprints s
        LEFT JOIN projects p ON s.project_id = p.id
        LEFT JOIN companies c ON p.company_id = c.id
        WHERE 1=1
      `;
      const params = [];

      if (!includeCompleted) {
        sql += " AND s.status <> 'Completed'";
      }

      if (rawDept && rawDept.toUpperCase() !== 'ALL' && !isManager) {
        const dept = deptFilter(rawDept);
        sql += " AND (s.department = ? OR s.department IS NULL)";
        params.push(dept);
      }

      sql += " ORDER BY FIELD(s.status,'Active','Planned','Completed'), s.sort_order ASC, s.id ASC";

      const [sprints] = await db.query(sql, params);

      // lite=true: just the sprints and their counts, no ticket lists. The board, the
      // details panel and the create drawers only need ids/names/status; sending every
      // ticket inside every sprint made each of those calls several MB.
      if (req.query.lite === 'true') {
        const ids = sprints.map(s => s.id);
        const counts = new Map(ids.map(id => [id, { todo: 0, inProgress: 0, done: 0 }]));
        if (ids.length) {
          const [rows] = await db.query(
            `SELECT sprint_id, UPPER(TRIM(COALESCE(status, ''))) AS st, COUNT(*) AS n
               FROM it_kanban_issues WHERE sprint_id IN (?) GROUP BY sprint_id, st`,
            [ids]
          );
          rows.forEach(r => {
            const c = counts.get(r.sprint_id);
            if (!c) return;
            if (isDone(r.st)) c.done += Number(r.n);
            else if (r.st === 'IN PROGRESS') c.inProgress += Number(r.n);
            else c.todo += Number(r.n);
          });
        }
        sprints.forEach(s => { s.counts = counts.get(s.id); });
        const active = sprints.filter(s => s.status === 'Active');
        return res.json({ sprints, backlog: [], activeSprints: active, activeSprint: active[0] || null });
      }

      // Attach each sprint's items plus a To Do / In Progress / Done breakdown.
      for (const s of sprints) {
        // Only include issues relevant to this department (including cross-department assignments).
        let itemsQuery = `
          SELECT i.*,
                 u_assignee.department AS assignee_department,
                 u_reporter.department AS reporter_department
          FROM it_kanban_issues i
          LEFT JOIN users u_assignee ON (
            u_assignee.id = (
              SELECT id FROM users u
              WHERE u.username COLLATE utf8mb4_unicode_ci = TRIM(i.assignee) COLLATE utf8mb4_unicode_ci
                 OR CONCAT(TRIM(COALESCE(u.first_name, '')), ' ', TRIM(COALESCE(u.last_name, ''))) COLLATE utf8mb4_unicode_ci = TRIM(i.assignee) COLLATE utf8mb4_unicode_ci
                 OR u.first_name COLLATE utf8mb4_unicode_ci = TRIM(i.assignee) COLLATE utf8mb4_unicode_ci
              LIMIT 1
            )
          )
          LEFT JOIN users u_reporter ON (
            u_reporter.id = (
              SELECT id FROM users u
              WHERE u.username COLLATE utf8mb4_unicode_ci = TRIM(i.reporter) COLLATE utf8mb4_unicode_ci
                 OR CONCAT(TRIM(COALESCE(u.first_name, '')), ' ', TRIM(COALESCE(u.last_name, ''))) COLLATE utf8mb4_unicode_ci = TRIM(i.reporter) COLLATE utf8mb4_unicode_ci
                 OR u.first_name COLLATE utf8mb4_unicode_ci = TRIM(i.reporter) COLLATE utf8mb4_unicode_ci
              LIMIT 1
            )
          )
          WHERE i.sprint_id = ?
          ORDER BY i.rank_order IS NOT NULL, i.rank_order ASC, i.id DESC
        `;
        const [items] = await db.query(itemsQuery, [s.id]);
        // A completed sprint is last period's record of finished work: Done items only. Anything
        // reopened since shows in the Backlog instead (see below).
        s.issues = s.status === 'Completed' ? items.filter(i => isDone(i.status)) : items;
        s.counts = s.issues.reduce((acc, i) => {
          const st = String(i.status || '').toUpperCase();
          if (isDone(st)) acc.done++;
          else if (st === 'IN PROGRESS') acc.inProgress++;
          else acc.todo++;
          return acc;
        }, { todo: 0, inProgress: 0, done: 0 });
      }

      // Anything not in a sprint is the backlog.
      // Scoped to the current department with cross-department collaboration.
      const [backlog] = await db.query(`
        SELECT i.*,
               u_assignee.department AS assignee_department,
               u_reporter.department AS reporter_department
        FROM it_kanban_issues i
        LEFT JOIN users u_assignee ON (
          u_assignee.id = (
            SELECT id FROM users u
            WHERE u.username COLLATE utf8mb4_unicode_ci = TRIM(i.assignee) COLLATE utf8mb4_unicode_ci
               OR CONCAT(TRIM(COALESCE(u.first_name, '')), ' ', TRIM(COALESCE(u.last_name, ''))) COLLATE utf8mb4_unicode_ci = TRIM(i.assignee) COLLATE utf8mb4_unicode_ci
               OR u.first_name COLLATE utf8mb4_unicode_ci = TRIM(i.assignee) COLLATE utf8mb4_unicode_ci
            LIMIT 1
          )
        )
        LEFT JOIN users u_reporter ON (
          u_reporter.id = (
            SELECT id FROM users u
            WHERE u.username COLLATE utf8mb4_unicode_ci = TRIM(i.reporter) COLLATE utf8mb4_unicode_ci
               OR CONCAT(TRIM(COALESCE(u.first_name, '')), ' ', TRIM(COALESCE(u.last_name, ''))) COLLATE utf8mb4_unicode_ci = TRIM(i.reporter) COLLATE utf8mb4_unicode_ci
               OR u.first_name COLLATE utf8mb4_unicode_ci = TRIM(i.reporter) COLLATE utf8mb4_unicode_ci
            LIMIT 1
          )
        )
        WHERE (i.sprint_id IS NULL OR i.sprint_id IN (SELECT id FROM sprints WHERE status = 'Completed'))
          AND UPPER(TRIM(COALESCE(i.status, ''))) NOT IN ('DONE', 'COMPLETED', 'CLOSED')
        ORDER BY i.rank_order IS NOT NULL, i.rank_order ASC, i.id DESC
      `);

      // A board can run several sprints at once, so the board filters on the whole set.
      // `activeSprint` stays for callers that only care about the first one.
      const activeSprints = sprints.filter(s => s.status === 'Active');
      res.json({ sprints, backlog, activeSprints, activeSprint: activeSprints[0] || null });
    } catch (error) {
      responseError(res, 500, 'Failed to fetch sprints', error);
    }
  });

  app.post('/api/sprints', requireManager, async (req, res) => {
    try {
      const { name, goal, department, project_id, start_date, end_date } = req.body;
      const dept = deptFilter(department);

      // Default to "<DEPT> Sprint N" using the next number for this board.
      let sprintName = (name || '').trim();
      if (!sprintName) {
        const [[row]] = await db.query('SELECT COUNT(*) AS n FROM sprints WHERE department = ?', [dept]);
        sprintName = `${dept} Sprint ${Number(row.n) + 1}`;
      }

      const [result] = await db.query(
        `INSERT INTO sprints (name, goal, department, project_id, start_date, end_date, status, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, 'Planned', ?)`,
        [sprintName, goal || null, dept, project_id || null, start_date || null, end_date || null, Date.now() % 100000]
      );

      const [[sprint]] = await db.query('SELECT * FROM sprints WHERE id = ?', [result.insertId]);
      res.status(201).json(sprint);
    } catch (error) {
      responseError(res, 500, 'Failed to create sprint', error);
    }
  });

  // Move work items between the backlog and sprints (used by the Backlog view).
  // Must be registered before PUT /api/sprints/:id, otherwise Express matches
  // "move-issues" as an :id and this endpoint is never reached.
  app.put('/api/sprints/move-issues', requireManager, async (req, res) => {
    try {
      const { issueKeys, sprintId } = req.body;
      if (!Array.isArray(issueKeys) || issueKeys.length === 0) {
        return res.status(400).json({ error: 'issueKeys is required' });
      }
      if (sprintId) {
        const [[dest]] = await db.query("SELECT id, status FROM sprints WHERE id = ?", [sprintId]);
        if (!dest) return res.status(400).json({ error: 'Sprint not found' });
        if (dest.status === 'Completed') return res.status(400).json({ error: 'Cannot move work into a completed sprint' });
      }
      const [result] = await db.query(
        `UPDATE it_kanban_issues SET sprint_id = ? WHERE issue_key IN (${issueKeys.map(() => '?').join(',')})`,
        [sprintId || null, ...issueKeys]
      );

      // Into a sprint: take on its project. Back to the Backlog: drop the project.
      const reprojected = sprintId
        ? await inheritSprintProject(db, sprintId, issueKeys)
        : await clearProjectForBacklog(db, issueKeys);

      res.json({ success: true, moved: result.affectedRows, reprojected });
    } catch (error) {
      responseError(res, 500, 'Failed to move work items', error);
    }
  });

  // Persist a drag in the Backlog. One drag can both reorder work and move it between a
  // sprint and the backlog, so both are written together.
  //
  // The client sends the board's whole visible order (sprint sections top to bottom, then
  // the backlog), and ranks are rewritten to match. Renumbering everything keeps ranks
  // globally comparable, which is what lets the List view sort by the same field.
  // Registered before PUT /:id so "rank" is not matched as an :id.
  app.put('/api/sprints/rank', requireManager, async (req, res) => {
    const conn = await pool.getConnection();
    try {
      const { order } = req.body; // [{ issue_key, sprint_id }] in final visual order
      if (!Array.isArray(order) || order.length === 0) {
        return res.status(400).json({ error: 'order is required' });
      }

      // Reject unknown keys up front rather than silently ranking nothing.
      const keys = order.map(o => o.issue_key);
      const [known] = await conn.query(
        `SELECT issue_key FROM it_kanban_issues WHERE issue_key IN (${keys.map(() => '?').join(',')})`,
        keys
      );
      const knownSet = new Set(known.map(r => r.issue_key));
      const missing = keys.filter(k => !knownSet.has(k));
      if (missing.length) {
        return res.status(400).json({ error: `Unknown work items: ${missing.join(', ')}` });
      }

      await conn.beginTransaction();

      // Group by destination so each sprint's project is applied in one statement.
      const bySprint = new Map();
      const toBacklog = [];
      for (let i = 0; i < order.length; i++) {
        const { issue_key, sprint_id } = order[i];
        const destId = sprint_id == null ? null : Number(sprint_id);
        await conn.query(
          'UPDATE it_kanban_issues SET rank_order = ?, sprint_id = ? WHERE issue_key = ?',
          [i + 1, destId, issue_key]
        );
        if (destId == null) {
          toBacklog.push(issue_key);
        } else {
          if (!bySprint.has(destId)) bySprint.set(destId, []);
          bySprint.get(destId).push(issue_key);
        }
      }

      // Dragging into a sprint moves the work onto that sprint's project; dragging back to
      // the Backlog drops it, since backlog work belongs to no sprint and so no project.
      for (const [destId, keys] of bySprint) {
        await inheritSprintProject(conn, destId, keys);
      }
      await clearProjectForBacklog(conn, toBacklog);

      await conn.commit();

      res.json({ success: true, ranked: order.length });
    } catch (error) {
      try { await conn.rollback(); } catch (e) { /* already rolled back */ }
      responseError(res, 500, 'Failed to save the new order', error);
    } finally {
      conn.release();
    }
  });

  // Reorder a sprint within its board: up / down / top / bottom.
  // Registered before PUT /:id for the same reason as move-issues.
  app.put('/api/sprints/:id/reorder', requireManager, async (req, res) => {
    try {
      const { id } = req.params;
      const { direction } = req.body; // 'up' | 'down' | 'top' | 'bottom'

      const [[sprint]] = await db.query('SELECT id, department FROM sprints WHERE id = ?', [id]);
      if (!sprint) return res.status(404).json({ error: 'Sprint not found' });

      // Work on the board's current visual order, then renumber it cleanly.
      const [list] = await db.query(
        "SELECT id FROM sprints WHERE department = ? AND status <> 'Completed' ORDER BY sort_order ASC, id ASC",
        [sprint.department]
      );
      const order = list.map(s => s.id);
      const from = order.indexOf(Number(id));
      if (from === -1) return res.status(400).json({ error: 'Sprint is not in the active list' });

      let to = from;
      if (direction === 'up') to = Math.max(0, from - 1);
      else if (direction === 'down') to = Math.min(order.length - 1, from + 1);
      else if (direction === 'top') to = 0;
      else if (direction === 'bottom') to = order.length - 1;
      else return res.status(400).json({ error: 'direction must be up, down, top or bottom' });

      if (to !== from) {
        order.splice(to, 0, order.splice(from, 1)[0]);
        for (let i = 0; i < order.length; i++) {
          await db.query('UPDATE sprints SET sort_order = ? WHERE id = ?', [i, order[i]]);
        }
      }
      res.json({ success: true, order });
    } catch (error) {
      responseError(res, 500, 'Failed to reorder sprint', error);
    }
  });

  app.put('/api/sprints/:id', requireManager, async (req, res) => {
    try {
      const allowed = ['name', 'goal', 'start_date', 'end_date', 'status', 'project_id'];
      const sets = [];
      const values = [];
      for (const [k, v] of Object.entries(req.body)) {
        if (allowed.includes(k)) { sets.push(`${k} = ?`); values.push(v === '' ? null : v); }
      }
      if (sets.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
      values.push(req.params.id);

      const [result] = await db.query(`UPDATE sprints SET ${sets.join(', ')} WHERE id = ?`, values);
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Sprint not found' });

      const [[sprint]] = await db.query('SELECT * FROM sprints WHERE id = ?', [req.params.id]);
      res.json(sprint);
    } catch (error) {
      responseError(res, 500, 'Failed to update sprint', error);
    }
  });

  // ── Start a sprint ────────────────────────────────────────────────────
  // Jira supports parallel sprints on a board, so several can run at the same time and the
  // board shows the work from all of them.
  app.post('/api/sprints/:id/start', requireManager, async (req, res) => {
    try {
      const { id } = req.params;
      const { start_date, end_date, goal } = req.body;

      const [[sprint]] = await db.query('SELECT * FROM sprints WHERE id = ?', [id]);
      if (!sprint) return res.status(404).json({ error: 'Sprint not found' });
      if (sprint.status === 'Active') return res.status(400).json({ error: 'Sprint is already active' });
      if (sprint.status === 'Completed') return res.status(400).json({ error: 'Sprint is already completed' });

      const [[count]] = await db.query('SELECT COUNT(*) AS n FROM it_kanban_issues WHERE sprint_id = ?', [id]);
      if (Number(count.n) === 0) {
        return res.status(400).json({ error: 'Add at least one work item before starting this sprint.' });
      }

      await db.query(
        `UPDATE sprints SET status = 'Active',
           start_date = COALESCE(?, start_date, CURDATE()),
           end_date = COALESCE(?, end_date, DATE_ADD(CURDATE(), INTERVAL 14 DAY)),
           goal = COALESCE(?, goal)
         WHERE id = ?`,
        [start_date || null, end_date || null, goal || null, id]
      );

      const [[updated]] = await db.query('SELECT * FROM sprints WHERE id = ?', [id]);
      res.json({ success: true, sprint: updated, itemCount: Number(count.n) });
    } catch (error) {
      responseError(res, 500, 'Failed to start sprint', error);
    }
  });

  // ── Complete a sprint ─────────────────────────────────────────────────
  // Finished work is completed/archived; unfinished work either stays in this sprint for renewal
  // (the default) or goes to the backlog, a chosen sprint, or a brand new one.
  class SprintError extends Error {}

  /**
   * Puts carried-over tickets in the LAST MONTH PENDING column (timers logged, testing ended).
   * Only TO DO and ON HOLD (under discussion) tickets go there; IN REVIEW etc. keep their status.
   * Only last period's work goes there: a ticket due (or starting) on or after the next sprint's
   * start belongs to the new period and keeps its status. Undated leftovers count as pending.
   */
  async function carryToPending(keys, actor, sprintName, targetSprintId) {
    if (!keys.length) return 0;
    const [[t]] = await db.query("SELECT DATE_FORMAT(start_date, '%Y-%m-%d') AS start_day FROM sprints WHERE id = ?", [targetSprintId])
      .catch(() => [[null]]);
    const now = new Date();
    const cutoff = t?.start_day || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const [rows] = await db.query(
      `SELECT issue_key FROM it_kanban_issues WHERE issue_key IN (${keys.map(() => '?').join(',')})
         AND (COALESCE(due_date, start_date) IS NULL OR COALESCE(due_date, start_date) < ?)
         AND UPPER(TRIM(status)) IN ('TO DO', 'ON HOLD')`,
      [...keys, cutoff]
    );
    const pending = rows.map(r => r.issue_key);
    if (!pending.length) return 0;
    const mover = app.locals.itKanban?.moveIssuesBySystem;
    if (mover) return mover(pending, PENDING_STATUS, actor, `Auto-logged: sprint "${sprintName}" ended`);
    const [r] = await db.query(`UPDATE it_kanban_issues SET status = ? WHERE issue_key IN (${pending.map(() => '?').join(',')})`, [PENDING_STATUS, ...pending]);
    return r.affectedRows;
  }

  /**
   * Completes one sprint and moves its unfinished work as `moveTo` says. Work that moves on to
   * another sprint (new or existing) is carried over: it lands in the LAST MONTH PENDING column.
   */
  async function completeSprint(sprint, moveTo, actor = 'System') {
    const [items] = await db.query('SELECT id, issue_key, status FROM it_kanban_issues WHERE sprint_id = ?', [sprint.id]);
    const completed = items.filter(i => isDone(i.status));
    const unfinished = items.filter(i => !isDone(i.status));

    let target = null;
    if (moveTo === 'stay' || !moveTo) {
      // Keep unfinished work in this sprint so it can be renewed.
      // Detach completed items so they don't linger in the active card when renewed.
      if (completed.length > 0) {
        await db.query(
          `UPDATE it_kanban_issues SET sprint_id = NULL WHERE id IN (${completed.map(() => '?').join(',')})`,
          completed.map(i => i.id)
        );
      }
    } else if (moveTo === 'new') {
      const [[row]] = await db.query('SELECT COUNT(*) AS n FROM sprints WHERE department = ?', [sprint.department]);
      const [created] = await db.query(
        `INSERT INTO sprints (name, department, status, sort_order) VALUES (?, ?, 'Planned', ?)`,
        [`${sprint.department} Sprint ${Number(row.n) + 1}`, sprint.department, Date.now() % 100000]
      );
      const [[fresh]] = await db.query('SELECT id, name FROM sprints WHERE id = ?', [created.insertId]);
      target = fresh;

      if (unfinished.length > 0) {
        await db.query(
          `UPDATE it_kanban_issues SET sprint_id = ? WHERE id IN (${unfinished.map(() => '?').join(',')})`,
          [target.id, ...unfinished.map(i => i.id)]
        );
        const keys = unfinished.map(i => i.issue_key);
        await inheritSprintProject(db, target.id, keys);
        await carryToPending(keys, actor, sprint.name, target.id);
      }
    } else if (moveTo === 'backlog') {
      if (unfinished.length > 0) {
        await db.query(
          `UPDATE it_kanban_issues SET sprint_id = NULL WHERE id IN (${unfinished.map(() => '?').join(',')})`,
          unfinished.map(i => i.id)
        );
        const keys = unfinished.map(i => i.issue_key);
        await clearProjectForBacklog(db, keys);
      }
    } else {
      const [[dest]] = await db.query('SELECT id, name, status FROM sprints WHERE id = ?', [moveTo]);
      if (!dest) throw new SprintError('Destination sprint not found');
      if (dest.status === 'Completed') throw new SprintError('Cannot move work into a completed sprint');
      target = dest;

      if (unfinished.length > 0) {
        await db.query(
          `UPDATE it_kanban_issues SET sprint_id = ? WHERE id IN (${unfinished.map(() => '?').join(',')})`,
          [target.id, ...unfinished.map(i => i.id)]
        );
        const keys = unfinished.map(i => i.issue_key);
        await inheritSprintProject(db, target.id, keys);
        await carryToPending(keys, actor, sprint.name, target.id);
      }
    }

    await db.query(
      "UPDATE sprints SET status = 'Completed', completed_at = NOW(), end_date = COALESCE(end_date, CURDATE()) WHERE id = ?",
      [sprint.id]
    );
    // The finished work's screenshots are deleted for good once its sprint is completed.
    let screenshotsDeleted = 0;
    try {
      const out = await purgeScreenshots(db, completed.map(i => i.issue_key), { actor });
      screenshotsDeleted = out.deleted.length;
    } catch (err) {
      console.error(`Screenshot clean-up failed for sprint "${sprint.name}":`, err.message);
    }
    return { completedCount: completed.length, movedCount: unfinished.length, target, screenshotsDeleted };
  }

  app.post('/api/sprints/:id/complete', requireManager, async (req, res) => {
    try {
      const { id } = req.params;
      const { moveTo = 'stay' } = req.body; // 'stay' (default, keeps open work for renewal) | 'backlog' | 'new' | sprint_id

      const [[sprint]] = await db.query('SELECT * FROM sprints WHERE id = ?', [id]);
      if (!sprint) return res.status(404).json({ error: 'Sprint not found' });
      if (sprint.status === 'Completed') return res.status(400).json({ error: 'Sprint is already completed' });

      const actor = req.headers['x-user-name'] || req.user?.name || 'Manager';
      const { completedCount, movedCount, target, screenshotsDeleted } = await completeSprint(sprint, moveTo, actor);
      res.json({
        success: true,
        completedCount,
        movedCount,
        screenshotsDeleted,
        movedTo: (moveTo === 'stay' || !moveTo) ? sprint.name : (target ? target.name : 'Backlog')
      });
    } catch (error) {
      if (error instanceof SprintError) return res.status(400).json({ error: error.message });
      responseError(res, 500, 'Failed to complete sprint', error);
    }
  });

  // ── Complete every running sprint at once (month end) ──────────────────
  // Sprints here are one per project, so each keeps its own line: every given active sprint of
  // the department is completed (its Done work stays recorded in it) and, with "new", its open
  // work moves to a new sprint of the same name and project. With start_date / end_date those
  // new sprints start straight away; a project with nothing left open gets no new sprint.
  app.post('/api/sprints/complete-all', requireManager, async (req, res) => {
    try {
      const { moveTo = 'new', department } = req.body;
      const ids = (Array.isArray(req.body.ids) ? req.body.ids : []).map(Number).filter(Boolean);
      if (!ids.length) return res.status(400).json({ error: 'Choose the sprints to complete.' });
      const day = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '').slice(0, 10)) ? String(v).slice(0, 10) : null);
      const startDate = day(req.body.start_date);
      const endDate = day(req.body.end_date);
      if (moveTo === 'new' && startDate && endDate && endDate < startDate) {
        return res.status(400).json({ error: 'The end date is before the start date.' });
      }

      const [rows] = await db.query(
        `SELECT * FROM sprints WHERE id IN (${ids.map(() => '?').join(',')}) AND status = 'Active' ORDER BY id`, ids
      );
      // Never reach into another department's sprints.
      const sprints = department
        ? rows.filter(sp => String(sp.department || '').toLowerCase() === String(department).toLowerCase())
        : rows;
      if (!sprints.length) return res.status(400).json({ error: 'None of these sprints is running.' });
      if (!['stay', 'backlog', 'new'].includes(moveTo) && sprints.some(sp => String(sp.id) === String(moveTo))) {
        return res.status(400).json({ error: 'The open work cannot go into a sprint that is being completed.' });
      }

      const actor = req.headers['x-user-name'] || req.user?.name || 'Manager';
      let completedCount = 0;
      let movedCount = 0;
      let screenshotsDeleted = 0;
      const created = [];
      for (const sprint of sprints) {
        let dest = moveTo;
        if (moveTo === 'new') {
          const [[open]] = await db.query(
            `SELECT COUNT(*) AS n FROM it_kanban_issues WHERE sprint_id = ? AND UPPER(TRIM(COALESCE(status, ''))) NOT IN (?)`,
            [sprint.id, DONE_STATUSES]
          );
          if (Number(open.n) > 0) {
            const [made] = await db.query(
              `INSERT INTO sprints (name, department, project_id, goal, status, start_date, end_date, sort_order)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [sprint.name, sprint.department, sprint.project_id ?? null, sprint.goal ?? null,
                startDate ? 'Active' : 'Planned', startDate, endDate, sprint.sort_order ?? 0]
            );
            dest = made.insertId;
            created.push(sprint.name);
          } else {
            dest = 'backlog'; // nothing open: the sprint just closes
          }
        }
        const out = await completeSprint(sprint, dest, actor);
        completedCount += out.completedCount;
        movedCount += out.movedCount;
        screenshotsDeleted += out.screenshotsDeleted || 0;
      }

      res.json({
        success: true, sprints: sprints.map(sp => sp.name), completedCount, movedCount, screenshotsDeleted,
        created, started: Boolean(moveTo === 'new' && startDate && created.length),
        movedTo: moveTo === 'backlog' ? 'Backlog' : null
      });
    } catch (error) {
      if (error instanceof SprintError) return res.status(400).json({ error: error.message });
      responseError(res, 500, 'Failed to complete the sprints', error);
    }
  });

  // ── Automatic roll-over when a sprint's end date has passed ───────────
  // Each running sprint whose end date is over is completed; if it still has open work, a new
  // sprint of the same name and project starts for the next period and the open work is
  // carried into it (LAST MONTH PENDING column). A whole calendar month rolls to the next
  // month; any other sprint keeps its length. Runs shortly after start-up, then hourly.
  const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const parseDay = (v) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v || '')); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

  /** The period after [start, end], moved forward until it reaches today. */
  const nextPeriod = (start, end, today) => {
    const s = parseDay(start);
    const e = parseDay(end);
    const wholeMonth = !s || (s.getDate() === 1 && addDays(e, 1).getDate() === 1 && s.getMonth() === e.getMonth());
    let from = addDays(e, 1);
    if (wholeMonth) {
      if (from < new Date(today.getFullYear(), today.getMonth(), 1)) from = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: ymd(from), end: ymd(new Date(from.getFullYear(), from.getMonth() + 1, 0)) };
    }
    const length = Math.max(1, Math.round((e - s) / 86400000) + 1);
    let to = addDays(from, length - 1);
    while (to < today) { from = addDays(to, 1); to = addDays(from, length - 1); }
    return { start: ymd(from), end: ymd(to) };
  };

  let rollingOver = false;
  /** dryRun: only say what would happen. department: limit to one department. */
  async function rollOverEndedSprints({ now = new Date(), dryRun = false, department = null } = {}) {
    if (rollingOver && !dryRun) return [];
    if (!dryRun) rollingOver = true;
    const done = [];
    try {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const [ended] = await db.query(
        `SELECT *, DATE_FORMAT(start_date, '%Y-%m-%d') AS start_day, DATE_FORMAT(end_date, '%Y-%m-%d') AS end_day
           FROM sprints WHERE status = 'Active' AND end_date IS NOT NULL AND end_date < ? ORDER BY id`,
        [ymd(today)]
      );
      const scope = department
        ? ended.filter(sp => String(sp.department || '').toLowerCase() === String(department).toLowerCase())
        : ended;
      for (const sprint of scope) {
        try {
          const [[open]] = await db.query(
            `SELECT COUNT(*) AS n FROM it_kanban_issues WHERE sprint_id = ? AND UPPER(TRIM(COALESCE(status, ''))) NOT IN (?)`,
            [sprint.id, DONE_STATUSES]
          );
          let dest = 'backlog'; // nothing open: the sprint just closes
          const next = Number(open.n) > 0 ? nextPeriod(sprint.start_day, sprint.end_day, today) : null;
          if (dryRun) {
            done.push({ id: sprint.id, name: sprint.name, department: sprint.department, ended: sprint.end_day, carried: Number(open.n), next });
            continue;
          }
          if (next) {
            const [made] = await db.query(
              `INSERT INTO sprints (name, department, project_id, goal, status, start_date, end_date, sort_order)
               VALUES (?, ?, ?, ?, 'Active', ?, ?, ?)`,
              [sprint.name, sprint.department, sprint.project_id ?? null, sprint.goal ?? null, next.start, next.end, sprint.sort_order ?? 0]
            );
            dest = made.insertId;
          }
          const out = await completeSprint(sprint, dest, 'System (sprint ended)');
          done.push({ id: sprint.id, name: sprint.name, department: sprint.department, ended: sprint.end_day, carried: out.movedCount, next });
          console.log(`Sprint "${sprint.name}" (${sprint.department}) ended ${sprint.end_day}: completed, ${out.movedCount} open item(s) carried${next ? ` into ${next.start} – ${next.end}` : ''}.`);
        } catch (err) {
          console.error(`Sprint roll-over failed for "${sprint.name}":`, err.message);
        }
      }
    } finally {
      if (!dryRun) rollingOver = false;
    }
    return done;
  }

  // Managers can see what a roll-over would do, and run it now for their department.
  app.get('/api/sprints/roll-over/preview', requireManager, async (req, res) => {
    try {
      res.json({ auto: process.env.SPRINT_AUTO_ROLLOVER === 'true', sprints: await rollOverEndedSprints({ dryRun: true, department: req.query.department || null }) });
    } catch (error) {
      responseError(res, 500, 'Failed to preview the sprint roll-over', error);
    }
  });
  app.post('/api/sprints/roll-over', requireManager, async (req, res) => {
    try {
      const done = await rollOverEndedSprints({ department: req.body?.department || null });
      res.json({ success: true, sprints: done });
    } catch (error) {
      responseError(res, 500, 'Failed to roll over the sprints', error);
    }
  });
  app.locals.sprints = { ...(app.locals.sprints || {}), rollOverEndedSprints };
  // Switched on with SPRINT_AUTO_ROLLOVER=true in server/.env (off by default, so it never runs by surprise).
  if (process.env.SPRINT_AUTO_ROLLOVER === 'true') {
    const run = () => rollOverEndedSprints().catch(err => console.error('Sprint roll-over failed:', err.message));
    const first = setTimeout(run, 90 * 1000);
    const hourly = setInterval(run, 60 * 60 * 1000);
    if (first.unref) first.unref();
    if (hourly.unref) hourly.unref();
  }

  // ── Screenshots of sprints completed earlier ──────────────────────────
  // Sprints completed before the automatic clean-up existed still hold their screenshots.
  // A manager can preview and delete them for one month's completed sprints (by end date).
  const doneKeysOfCompleted = async (month) => {
    const valid = /^\d{4}-\d{2}$/.test(String(month || ''));
    const [sps] = await db.query(
      `SELECT id FROM sprints WHERE status = 'Completed'${valid ? " AND DATE_FORMAT(COALESCE(end_date, completed_at), '%Y-%m') = ?" : ''}`,
      valid ? [month] : []
    );
    if (!sps.length) return { sprintCount: 0, keys: [] };
    const ids = sps.map(x => x.id);
    const [rows] = await db.query(
      `SELECT issue_key FROM it_kanban_issues WHERE sprint_id IN (${ids.map(() => '?').join(',')}) AND UPPER(TRIM(COALESCE(status, ''))) IN (?)`,
      [...ids, DONE_STATUSES]
    );
    return { sprintCount: ids.length, keys: rows.map(r => r.issue_key) };
  };
  const cleanupSummary = (sprintCount, keys, out) => ({
    sprints: sprintCount, tickets: keys.length,
    screenshots: out.deleted.length, notFound: out.notFound.length, failed: out.failed.length, keptShared: out.kept.length
  });
  app.get('/api/sprints/screenshots/preview', requireManager, async (req, res) => {
    try {
      const { sprintCount, keys } = await doneKeysOfCompleted(req.query.month);
      res.json(cleanupSummary(sprintCount, keys, await purgeScreenshots(db, keys, { dryRun: true })));
    } catch (error) {
      responseError(res, 500, 'Failed to preview the screenshots', error);
    }
  });
  app.post('/api/sprints/screenshots/cleanup', requireManager, async (req, res) => {
    try {
      const { sprintCount, keys } = await doneKeysOfCompleted(req.body?.month);
      const actor = req.headers['x-user-name'] || req.user?.name || 'Manager';
      res.json({ success: true, ...cleanupSummary(sprintCount, keys, await purgeScreenshots(db, keys, { actor })) });
    } catch (error) {
      responseError(res, 500, 'Failed to delete the screenshots', error);
    }
  });

  // ── Renew a completed sprint with new dates ─────────────────────────────
  app.post('/api/sprints/:id/renew', requireManager, async (req, res) => {
    try {
      const { id } = req.params;
      const { start_date, end_date, name, goal } = req.body;

      const [[sprint]] = await db.query('SELECT * FROM sprints WHERE id = ?', [id]);
      if (!sprint) return res.status(404).json({ error: 'Sprint not found' });

      // Clean up any previously completed tasks from this sprint so only unfinished tasks run
      await db.query(
        "UPDATE it_kanban_issues SET sprint_id = NULL WHERE sprint_id = ? AND UPPER(TRIM(COALESCE(status, ''))) IN ('DONE', 'COMPLETED', 'CLOSED')",
        [id]
      );

      // Clean date values
      const newStartDate = start_date ? String(start_date).slice(0, 10) : new Date().toISOString().slice(0, 10);
      const newEndDate = end_date ? String(end_date).slice(0, 10) : null;

      await db.query(
        `UPDATE sprints 
         SET status = 'Active', 
             start_date = ?, 
             end_date = ?, 
             completed_at = NULL,
             name = COALESCE(?, name),
             goal = COALESCE(?, goal)
         WHERE id = ?`,
        [newStartDate, newEndDate, name || null, goal !== undefined ? goal : null, id]
      );

      const [[updated]] = await db.query('SELECT * FROM sprints WHERE id = ?', [id]);
      const [remainingItems] = await db.query('SELECT id, issue_key, status FROM it_kanban_issues WHERE sprint_id = ?', [id]);

      res.json({
        success: true,
        sprint: updated,
        itemCount: remainingItems.length
      });
    } catch (error) {
      responseError(res, 500, 'Failed to renew sprint', error);
    }
  });

  app.delete('/api/sprints/:id', requireManager, async (req, res) => {
    try {
      const { id } = req.params;
      const [[sprint]] = await db.query('SELECT status FROM sprints WHERE id = ?', [id]);
      if (!sprint) return res.status(404).json({ error: 'Sprint not found' });

      // A sprint can be deleted whatever its state, including while it is running — Jira
      // allows this. Deleting is never destructive to the work itself: every item returns
      // to the backlog, so nothing is lost, only the sprint container.
      const [[{ n }]] = await db.query(
        'SELECT COUNT(*) AS n FROM it_kanban_issues WHERE sprint_id = ?', [id]
      );
      // Straight to the Backlog, which means no sprint and therefore no project.
      await db.query('UPDATE it_kanban_issues SET sprint_id = NULL, project_id = NULL WHERE sprint_id = ?', [id]);
      await db.query('DELETE FROM sprints WHERE id = ?', [id]);

      res.json({ success: true, movedToBacklog: Number(n) });
    } catch (error) {
      responseError(res, 500, 'Failed to delete sprint', error);
    }
  });

};

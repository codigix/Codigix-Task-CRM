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
module.exports = function setupSprintsRoutes(app, pool) {
  const db = { query: (sql, params) => pool.query(sql, params) };

  const responseError = (res, statusCode, message, error) => {
    console.error(`Error: ${message}`, error?.message || error);
    return res.status(statusCode).json({ error: message, details: error?.message || error });
  };

  // Statuses that count as finished. Anything else rolls over on sprint completion.
  const DONE_STATUSES = ['DONE', 'COMPLETED', 'CLOSED'];
  const isDone = (status) => DONE_STATUSES.includes(String(status || '').toUpperCase().trim());

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
      const department = deptFilter(req.query.department);
      const includeCompleted = req.query.includeCompleted === 'true';

      // Removed department-based validation so everyone can view tasks of everyone
      let sql = 'SELECT * FROM sprints WHERE 1=1';
      const params = [];
      if (!includeCompleted) sql += " AND status <> 'Completed'";
      sql += " ORDER BY FIELD(status,'Active','Planned','Completed'), sort_order ASC, id ASC";

      const [sprints] = await db.query(sql, params);

      // Attach each sprint's items plus a To Do / In Progress / Done breakdown.
      for (const s of sprints) {
        // Rank order, exactly as the user dragged it. Unranked rows fall to the end.
        const [items] = await db.query(
          'SELECT * FROM it_kanban_issues WHERE sprint_id = ? ORDER BY rank_order IS NULL, rank_order ASC, id ASC',
          [s.id]
        );
        s.issues = items;
        s.counts = items.reduce((acc, i) => {
          const st = String(i.status || '').toUpperCase();
          if (isDone(st)) acc.done++;
          else if (st === 'IN PROGRESS') acc.inProgress++;
          else acc.todo++;
          return acc;
        }, { todo: 0, inProgress: 0, done: 0 });
      }

      // Anything not in a sprint is the backlog.
      // Removed department-based validation so everyone can view tasks of everyone
      const [backlog] = await db.query(
        'SELECT * FROM it_kanban_issues WHERE sprint_id IS NULL ORDER BY rank_order IS NULL, rank_order ASC, id ASC'
      );

      // A board can run several sprints at once, so the board filters on the whole set.
      // `activeSprint` stays for callers that only care about the first one.
      const activeSprints = sprints.filter(s => s.status === 'Active');
      res.json({ sprints, backlog, activeSprints, activeSprint: activeSprints[0] || null });
    } catch (error) {
      responseError(res, 500, 'Failed to fetch sprints', error);
    }
  });

  app.post('/api/sprints', async (req, res) => {
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
  app.put('/api/sprints/move-issues', async (req, res) => {
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
  app.put('/api/sprints/rank', async (req, res) => {
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
  app.put('/api/sprints/:id/reorder', async (req, res) => {
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

  app.put('/api/sprints/:id', async (req, res) => {
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
  app.post('/api/sprints/:id/start', async (req, res) => {
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
  // Finished work stays put; unfinished work goes to the backlog, a chosen sprint, or a
  // brand new one — the three destinations Jira's Complete Sprint dialog offers.
  app.post('/api/sprints/:id/complete', async (req, res) => {
    try {
      const { id } = req.params;
      const { moveTo } = req.body; // 'backlog' (default) | 'new' | a sprint id

      const [[sprint]] = await db.query('SELECT * FROM sprints WHERE id = ?', [id]);
      if (!sprint) return res.status(404).json({ error: 'Sprint not found' });
      if (sprint.status === 'Completed') return res.status(400).json({ error: 'Sprint is already completed' });

      const [items] = await db.query('SELECT id, issue_key, status FROM it_kanban_issues WHERE sprint_id = ?', [id]);
      const completed = items.filter(i => isDone(i.status));
      const unfinished = items.filter(i => !isDone(i.status));

      let target = null;
      if (moveTo === 'new') {
        // Jira spins up the next sprint to receive the leftover work.
        const [[row]] = await db.query('SELECT COUNT(*) AS n FROM sprints WHERE department = ?', [sprint.department]);
        const [created] = await db.query(
          `INSERT INTO sprints (name, department, status, sort_order) VALUES (?, ?, 'Planned', ?)`,
          [`${sprint.department} Sprint ${Number(row.n) + 1}`, sprint.department, Date.now() % 100000]
        );
        const [[fresh]] = await db.query('SELECT id, name FROM sprints WHERE id = ?', [created.insertId]);
        target = fresh;
      } else if (moveTo && moveTo !== 'backlog') {
        const [[dest]] = await db.query('SELECT id, name, status FROM sprints WHERE id = ?', [moveTo]);
        if (!dest) return res.status(400).json({ error: 'Destination sprint not found' });
        if (dest.status === 'Completed') return res.status(400).json({ error: 'Cannot move work into a completed sprint' });
        target = dest;
      }

      if (unfinished.length > 0) {
        await db.query(
          `UPDATE it_kanban_issues SET sprint_id = ? WHERE id IN (${unfinished.map(() => '?').join(',')})`,
          [target ? target.id : null, ...unfinished.map(i => i.id)]
        );

        // Rolled into another sprint: adopt its project. Rolled to the Backlog: lose it.
        const keys = unfinished.map(i => i.issue_key);
        if (target) await inheritSprintProject(db, target.id, keys);
        else await clearProjectForBacklog(db, keys);
      }

      await db.query(
        "UPDATE sprints SET status = 'Completed', completed_at = NOW(), end_date = COALESCE(end_date, CURDATE()) WHERE id = ?",
        [id]
      );

      res.json({
        success: true,
        completedCount: completed.length,
        movedCount: unfinished.length,
        movedTo: target ? target.name : 'Backlog'
      });
    } catch (error) {
      responseError(res, 500, 'Failed to complete sprint', error);
    }
  });

  app.delete('/api/sprints/:id', async (req, res) => {
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

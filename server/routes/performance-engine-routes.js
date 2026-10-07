const express = require('express');

module.exports = function setupPerformanceEngineRoutes(app, pool) {
  const router = express.Router();

  // Helper function to easily run queries
  const db = {
    query: (sql, params) => pool.query(sql, params)
  };

  // Auto-migrate tables for Performance Engine
  (async function autoMigratePerformanceEngine() {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS task_history (
          id INT AUTO_INCREMENT PRIMARY KEY,
          task_id VARCHAR(50) NOT NULL,
          changed_by_user_id VARCHAR(50),
          action_type VARCHAR(100),
          field_name VARCHAR(100),
          old_value TEXT,
          new_value TEXT,
          reason TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS task_contributions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          task_id VARCHAR(50) NOT NULL,
          subtask_id VARCHAR(50),
          user_id VARCHAR(50) NOT NULL,
          role VARCHAR(50),
          effort_points DECIMAL(10,2) DEFAULT 0,
          contribution_percentage DECIMAL(5,2),
          contribution_source VARCHAR(100),
          approval_status VARCHAR(20) DEFAULT 'Pending',
          approved_by VARCHAR(50),
          approved_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS task_subtasks (
          id INT AUTO_INCREMENT PRIMARY KEY,
          task_id VARCHAR(50) NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          point_value DECIMAL(10,2) DEFAULT 0,
          status VARCHAR(50) DEFAULT 'To Do',
          assigned_to_user_id VARCHAR(50),
          created_by_user_id VARCHAR(50),
          completed_by_user_id VARCHAR(50),
          completed_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS task_time_logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          task_id VARCHAR(50) NOT NULL,
          user_id VARCHAR(50) NOT NULL,
          hours DECIMAL(10,2) NOT NULL,
          description TEXT,
          status VARCHAR(20) DEFAULT 'Approved',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('Performance Engine tables verified/migrated successfully.');
    } catch (e) {
      console.error('Failed to auto-migrate Performance Engine tables:', e.message);
    }
  })();

  /**
   * 1. MIDDLEWARE: Audit History Interceptor
   */
  async function logTaskHistory(taskId, userId, actionType, fieldName = null, oldValue = null, newValue = null, reason = null) {
    try {
      await db.query(
        `INSERT INTO task_history (task_id, changed_by_user_id, action_type, field_name, old_value, new_value, reason) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [taskId, userId, actionType, fieldName, String(oldValue), String(newValue), reason]
      );
    } catch (e) {
      console.error('Failed to write to task_history:', e.message);
    }
  }

  /**
   * 2. SUBTASKS API
   */
  
  router.post('/tasks/:taskId/subtasks', async (req, res) => {
    const { taskId } = req.params;
    const { title, description, point_value, assigned_to_user_id } = req.body;
    const userId = req.headers['x-user-id'] || null;

    try {
      const [parentTasks] = await db.query('SELECT effort_points FROM general_tasks WHERE id = ?', [taskId]);
      if (!parentTasks.length) return res.status(404).json({ success: false, message: 'Parent task not found' });
      
      const parentEffortPoints = parentTasks[0].effort_points || 0;
      
      const [existingSubtasks] = await db.query('SELECT SUM(point_value) as total_allocated FROM task_subtasks WHERE task_id = ?', [taskId]);
      const currentAllocated = existingSubtasks[0].total_allocated || 0;

      if ((currentAllocated + Number(point_value)) > parentEffortPoints) {
        return res.status(400).json({ 
          success: false, 
          message: `Validation Error: Allocated points (${currentAllocated + Number(point_value)}) exceed parent Effort Points (${parentEffortPoints}).`
        });
      }

      const [result] = await db.query(
        `INSERT INTO task_subtasks (task_id, title, description, point_value, assigned_to_user_id, created_by_user_id) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [taskId, title, description, point_value || 0, assigned_to_user_id || null, userId]
      );

      await logTaskHistory(taskId, userId, 'Subtask Creation', 'title', null, title, 'Added new subtask');

      res.json({ success: true, message: 'Subtask created successfully', id: result.insertId });
    } catch (error) {
      console.error('Subtask creation error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  router.get('/tasks/:taskId/subtasks', async (req, res) => {
    try {
      const [subtasks] = await db.query('SELECT * FROM task_subtasks WHERE task_id = ? ORDER BY created_at ASC', [req.params.taskId]);
      res.json({ success: true, subtasks });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  router.put('/subtasks/:subtaskId/complete', async (req, res) => {
    const { subtaskId } = req.params;
    const userId = req.headers['x-user-id'] || null;

    try {
      const [subtasks] = await db.query('SELECT * FROM task_subtasks WHERE id = ?', [subtaskId]);
      if (!subtasks.length) return res.status(404).json({ success: false, message: 'Subtask not found' });
      
      const subtask = subtasks[0];
      
      await db.query(
        `UPDATE task_subtasks SET status = 'Completed', completed_by_user_id = ?, completed_at = NOW() WHERE id = ?`,
        [userId, subtaskId]
      );

      await logTaskHistory(subtask.task_id, userId, 'Subtask Completion', 'status', subtask.status, 'Completed', `User marked subtask ${subtaskId} as complete`);

      res.json({ success: true, message: 'Subtask completed' });
    } catch (error) {
      console.error('Subtask update error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  /**
   * 3. TIME LOGS API
   */
  
  router.post('/tasks/:taskId/time-logs', async (req, res) => {
    const { taskId } = req.params;
    const { subtask_id, hours, description, work_type } = req.body;
    const userId = req.headers['x-user-id'];

    if (!userId) return res.status(401).json({ success: false, message: 'User ID required in headers' });
    if (!hours || hours <= 0) return res.status(400).json({ success: false, message: 'Hours must be greater than 0' });

    try {
      const [result] = await db.query(
        `INSERT INTO task_time_logs (task_id, subtask_id, user_id, hours, description, work_type) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [taskId, subtask_id || null, userId, hours, description, work_type]
      );

      await logTaskHistory(taskId, userId, 'Time Entry', 'hours', null, hours, `Logged ${hours} hours: ${description}`);

      res.json({ success: true, message: 'Time logged successfully', id: result.insertId });
    } catch (error) {
      console.error('Time logging error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  router.put('/time-logs/:logId/review', async (req, res) => {
    const { logId } = req.params;
    const { status, reason } = req.body; 
    const managerId = req.headers['x-user-id'] || null;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    try {
      const [logs] = await db.query('SELECT * FROM task_time_logs WHERE id = ?', [logId]);
      if (!logs.length) return res.status(404).json({ success: false, message: 'Time log not found' });

      await db.query(
        `UPDATE task_time_logs SET status = ?, approved_by = ?, approved_at = NOW() WHERE id = ?`,
        [status, managerId, logId]
      );

      await logTaskHistory(logs[0].task_id, managerId, 'Time Log Approval', 'status', logs[0].status, status, reason || `Time log marked as ${status}`);

      res.json({ success: true, message: `Time log ${status.toLowerCase()}` });
    } catch (error) {
      console.error('Time log review error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  /**
   * 4. CONTRIBUTION ENGINE
   */

  // Board tickets (it_kanban_issues) and general tasks share numeric ids (1..10 exist in
  // both), so a numeric id alone cannot say which one is meant. Board tickets are addressed
  // by issue key (e.g. MK-101) or with ?source=it_kanban, and their ledger rows use the
  // issue key as task_id so they can never be mistaken for a general task's.
  const resolveContributionTask = async (taskId, source) => {
    const isBoardTicket = source === 'it_kanban' || !/^\d+$/.test(String(taskId));
    if (isBoardTicket) {
      const [rows] = /^\d+$/.test(String(taskId))
        ? await db.query('SELECT * FROM it_kanban_issues WHERE id = ? LIMIT 1', [taskId])
        : await db.query('SELECT * FROM it_kanban_issues WHERE issue_key = ? LIMIT 1', [taskId]);
      if (!rows.length) return null;
      return { kind: 'it_kanban', task: rows[0], ledgerId: rows[0].issue_key };
    }
    const [gTasks] = await db.query('SELECT * FROM general_tasks WHERE id = ?', [taskId]);
    if (gTasks.length) return { kind: 'general_tasks', task: gTasks[0], ledgerId: String(gTasks[0].id) };
    return null;
  };

  // Board tickets store people by display name; the ledger needs user ids.
  const loadUserDirectory = async () => {
    const [users] = await db.query('SELECT id, first_name, last_name, username FROM users');
    const byName = new Map();
    const byId = new Map();
    users.forEach(u => {
      const full = `${u.first_name || ''} ${u.last_name || ''}`.trim();
      const display = full || u.username || `User #${u.id}`;
      byId.set(String(u.id), display);
      [full, u.username].filter(Boolean).forEach(n => byName.set(n.toLowerCase(), u.id));
    });
    return {
      idFor: (name) => byName.get(String(name || '').trim().toLowerCase()) || null,
      nameFor: (id) => byId.get(String(id)) || String(id)
    };
  };

  const isUnassigned = (name) => !name || ['unassigned', 'none'].includes(String(name).trim().toLowerCase());

  const isManagerUser = async (userId) => {
    if (!userId) return false;
    const [rows] = await db.query(
      'SELECT r.name AS role_name FROM users u LEFT JOIN roles r ON r.id = u.role_id WHERE u.id = ?',
      [userId]
    );
    const role = String(rows[0]?.role_name || '').toLowerCase();
    return role.includes('manager') || role.includes('admin');
  };

  router.post('/tasks/:taskId/contribution/recalculate', async (req, res) => {
    const { taskId } = req.params;

    try {
      const resolved = await resolveContributionTask(taskId, req.query.source);
      if (!resolved) return res.status(404).json({ success: false, error: 'Task not found' });
      const { kind, task, ledgerId } = resolved;

      const contributionMethod = task.contribution_method || 'WORK_BREAKDOWN';
      const effortPoints = kind === 'it_kanban'
        ? (parseInt(task.effort_points, 10) || parseInt(task.story_points, 10) || 0)
        : (task.effort_points || 0);
      const directory = await loadUserDirectory();

      let proposedContributions = [];
      const notes = [];

      if (kind === 'general_tasks') {
        if (contributionMethod === 'WORK_BREAKDOWN') {
          const [subtasks] = await db.query('SELECT * FROM task_subtasks WHERE task_id = ? AND status = "Completed"', [taskId]);
          if (subtasks.length === 0 && task.assigned_to_user_id) {
            proposedContributions.push({
              user_id: task.assigned_to_user_id,
              subtask_id: null,
              effort_points: effortPoints,
              contribution_source: 'Parent Task Completion (No Subtasks)',
              role: 'Owner'
            });
          } else {
            subtasks.forEach(st => {
              if (st.completed_by_user_id) {
                proposedContributions.push({
                  user_id: st.completed_by_user_id,
                  subtask_id: st.id,
                  effort_points: st.point_value,
                  contribution_source: 'Subtask Completion',
                  role: 'Executor'
                });
              }
            });
          }
        } else if (contributionMethod === 'TIME_BASED' && effortPoints > 0) {
          const [logs] = await db.query('SELECT user_id, SUM(hours) as total_hours FROM task_time_logs WHERE task_id = ? AND status = "Approved" GROUP BY user_id', [taskId]);
          const totalTaskHours = logs.reduce((sum, log) => sum + Number(log.total_hours), 0);
          if (totalTaskHours > 0) {
            logs.forEach(log => {
              const percentage = Number(log.total_hours) / totalTaskHours;
              proposedContributions.push({
                user_id: log.user_id,
                effort_points: Math.round(effortPoints * percentage),
                contribution_percentage: (percentage * 100).toFixed(2),
                contribution_source: 'Time Log Fallback',
                role: 'Contributor'
              });
            });
          }
        }
      } else {
        // Board ticket: subtasks are JSON on the issue, people are stored by name.
        let subtasks = [];
        try { subtasks = typeof task.subtasks === 'string' ? JSON.parse(task.subtasks) : (task.subtasks || []); } catch (e) { subtasks = []; }
        if (!Array.isArray(subtasks)) subtasks = [];

        const pushPerson = (name, entry) => {
          const userId = directory.idFor(name);
          if (!userId) {
            notes.push(`"${name}" is not a user in the system, so they were left out.`);
            return;
          }
          proposedContributions.push({ user_id: userId, ...entry });
        };

        if (contributionMethod === 'WORK_BREAKDOWN') {
          if (subtasks.length === 0) {
            if (isUnassigned(task.assignee)) notes.push('The ticket has no assignee to credit.');
            else pushPerson(task.assignee, {
              subtask_id: null,
              effort_points: effortPoints,
              contribution_source: 'Parent Task Completion (No Subtasks)',
              role: 'Owner'
            });
          } else {
            // Points are split across completed subtasks; the last one absorbs the
            // rounding remainder so the total always equals the ticket's points.
            const done = subtasks.filter(st => st.completed && !isUnassigned(st.assignee));
            const skipped = subtasks.filter(st => st.completed && isUnassigned(st.assignee)).length;
            if (skipped) notes.push(`${skipped} completed subtask(s) have no assignee and earn no points.`);
            if (done.length === 0) notes.push('No completed subtask has an assignee yet.');
            const base = done.length ? Math.floor(effortPoints / done.length) : 0;
            done.forEach((st, idx) => {
              const pts = idx === done.length - 1 ? effortPoints - base * (done.length - 1) : base;
              pushPerson(st.assignee, {
                subtask_id: st.id != null ? String(st.id) : null,
                effort_points: pts,
                contribution_source: `Subtask Completion: ${st.title || st.id}`,
                role: 'Executor'
              });
            });
          }
        } else if (contributionMethod === 'TIME_BASED') {
          const [logs] = await db.query(
            'SELECT author, SUM(seconds) AS total_seconds FROM it_kanban_worklogs WHERE issue_key = ? GROUP BY author',
            [task.issue_key]
          );
          const total = logs.reduce((sum, l) => sum + Number(l.total_seconds || 0), 0);
          if (total === 0) notes.push('No time has been logged on this ticket yet.');
          logs.forEach(l => {
            const share = Number(l.total_seconds || 0) / (total || 1);
            pushPerson(l.author, {
              subtask_id: null,
              effort_points: Math.round(effortPoints * share),
              contribution_percentage: (share * 100).toFixed(2),
              contribution_source: 'Time Log',
              role: 'Contributor'
            });
          });
        } else if (contributionMethod === 'MANAGER_ALLOCATED') {
          // A starting point for the manager to edit, not a calculation.
          if (isUnassigned(task.assignee)) notes.push('Add people and points manually: the ticket has no assignee.');
          else pushPerson(task.assignee, {
            subtask_id: null,
            effort_points: effortPoints,
            contribution_source: 'Manager Allocation',
            role: 'Owner'
          });
        }
      }

      // Names for display; the ledger itself stores ids.
      proposedContributions = proposedContributions.map(p => ({ ...p, user_name: directory.nameFor(p.user_id) }));

      res.json({
        success: true,
        taskKey: ledgerId,
        effortPoints,
        contributionMethod,
        reviewStatus: task.contribution_review_status || 'Pending',
        proposedContributions,
        notes
      });
    } catch (error) {
      console.error('Recalculation error:', error);
      res.status(500).json({ success: false, error: 'Server error while calculating contributions' });
    }
  });

  router.post('/tasks/:taskId/contribution/approve', async (req, res) => {
    const { taskId } = req.params;
    const { contributions } = req.body || {};
    const managerId = req.headers['x-user-id'];

    if (!(await isManagerUser(managerId).catch(() => false))) {
      return res.status(403).json({ success: false, error: 'Only managers can approve performance points.' });
    }
    if (!Array.isArray(contributions) || contributions.length === 0) {
      return res.status(400).json({ success: false, error: 'There are no contributions to approve.' });
    }
    const invalid = contributions.find(c => !c.user_id || !(Number(c.effort_points) >= 0));
    if (invalid) {
      return res.status(400).json({ success: false, error: 'Every contribution needs a person and a points value of 0 or more.' });
    }

    let connection;
    try {
      const resolved = await resolveContributionTask(taskId, req.query.source);
      if (!resolved) return res.status(404).json({ success: false, error: 'Task not found' });
      const { kind, task, ledgerId } = resolved;

      if (kind === 'it_kanban' && !['DONE', 'COMPLETED', 'CLOSED'].includes(String(task.status || '').toUpperCase().trim())) {
        return res.status(400).json({ success: false, error: 'The ticket must be Done before its points can be approved.' });
      }

      connection = await pool.getConnection();
      await connection.query('BEGIN');

      // Re-approving replaces the earlier distribution rather than adding to it.
      await connection.query('DELETE FROM task_contributions WHERE task_id = ?', [ledgerId]);

      for (const comp of contributions) {
        await connection.query(
          `INSERT INTO task_contributions (task_id, subtask_id, user_id, role, effort_points, contribution_percentage, contribution_source, approval_status, approved_by, approved_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'Approved', ?, NOW())`,
          [ledgerId, comp.subtask_id || null, String(comp.user_id), comp.role || 'Contributor', Number(comp.effort_points), comp.contribution_percentage || null, comp.contribution_source || 'Manual Override', managerId]
        );
      }

      if (kind === 'general_tasks') {
        await connection.query("UPDATE general_tasks SET contribution_review_status = 'Approved', status = 'Completed' WHERE id = ?", [task.id]);
      } else {
        await connection.query("UPDATE it_kanban_issues SET contribution_review_status = 'Approved' WHERE id = ?", [task.id]);
      }

      await connection.query(
        `INSERT INTO task_history (task_id, changed_by_user_id, action_type, field_name, old_value, new_value, reason) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [ledgerId, managerId, 'Manager Approval', 'contribution_review_status', task.contribution_review_status || 'Pending', 'Approved', 'Manager reviewed and finalized all performance points']
      );

      await connection.query('COMMIT');
      res.json({ success: true, message: 'Contributions approved.' });
    } catch (error) {
      if (connection) await connection.query('ROLLBACK');
      console.error('Contribution approval error:', error);
      res.status(500).json({ success: false, error: 'Server error while approving contributions' });
    } finally {
      if (connection) connection.release();
    }
  });

  /**
   * 5. HISTORY ROUTE
   */
  router.get('/tasks/:taskId/history', async (req, res) => {
    try {
      const [history] = await db.query(`
        SELECT h.*, CONCAT(u.first_name, ' ', u.last_name) as author_name 
        FROM task_history h 
        LEFT JOIN users u ON h.changed_by_user_id = u.id 
        WHERE h.task_id = ? 
        ORDER BY h.created_at DESC
      `, [req.params.taskId]);
      res.json({ success: true, history });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  app.use('/api/performance-engine', router);
};

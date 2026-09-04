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

  router.post('/tasks/:taskId/contribution/recalculate', async (req, res) => {
    const { taskId } = req.params;
    
    try {
      let task = null;
      let effortPoints = 0;
      let contributionMethod = 'WORK_BREAKDOWN';
      let taskType = 'general_tasks';

      const [gTasks] = await db.query('SELECT * FROM general_tasks WHERE id = ?', [taskId]);
      if (gTasks.length) {
        task = gTasks[0];
        effortPoints = task.effort_points || 0;
        contributionMethod = task.contribution_method || 'WORK_BREAKDOWN';
      } else {
        const [iTasks] = await db.query('SELECT * FROM it_kanban_issues WHERE id = ?', [taskId]);
        if (iTasks.length) {
          task = iTasks[0];
          effortPoints = parseInt(task.effort_points, 10) || parseInt(task.story_points, 10) || 0;
          contributionMethod = task.contribution_method || 'WORK_BREAKDOWN';
          taskType = 'it_kanban_issues';
        } else {
          return res.status(404).json({ success: false, message: 'Task not found' });
        }
      }
      
      let proposedContributions = [];

      if (contributionMethod === 'WORK_BREAKDOWN') {
        if (taskType === 'general_tasks') {
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
        } else {
          // IT Kanban subtasks are stored as JSON on the issue
          let subtasks = [];
          try { subtasks = typeof task.subtasks === 'string' ? JSON.parse(task.subtasks) : (task.subtasks || []); } catch(e){}
          
          if (subtasks.length === 0 && task.assignee && task.assignee !== 'Unassigned') {
            proposedContributions.push({
              user_id: task.assignee, 
              subtask_id: null,
              effort_points: effortPoints,
              contribution_source: 'Parent Task Completion (No Subtasks)',
              role: 'Owner'
            });
          } else {
            subtasks.forEach(st => {
              if (st.completed && st.assignee && st.assignee !== 'Unassigned') {
                // We'll use the assignee string as the user identifier for display purposes
                proposedContributions.push({
                  user_id: st.assignee, 
                  subtask_id: st.id || null,
                  effort_points: effortPoints > 0 ? Math.round(effortPoints / Math.max(1, subtasks.filter(s => s.completed).length)) : 0,
                  contribution_source: 'Subtask Completion',
                  role: 'Executor'
                });
              }
            });
          }
        }
      } 
      else if (contributionMethod === 'TIME_BASED' && effortPoints > 0) {
        const [logs] = await db.query('SELECT user_id, SUM(hours) as total_hours FROM task_time_logs WHERE task_id = ? AND status = "Approved" GROUP BY user_id', [taskId]);
        
        const totalTaskHours = logs.reduce((sum, log) => sum + Number(log.total_hours), 0);
        
        if (totalTaskHours > 0) {
          logs.forEach(log => {
            const percentage = (Number(log.total_hours) / totalTaskHours);
            const points = Math.round(effortPoints * percentage);
            proposedContributions.push({
              user_id: log.user_id,
              effort_points: points,
              contribution_percentage: (percentage * 100).toFixed(2),
              contribution_source: 'Time Log Fallback',
              role: 'Contributor'
            });
          });
        }
      }

      res.json({ success: true, proposedContributions });
    } catch (error) {
      console.error('Recalculation error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  router.post('/tasks/:taskId/contribution/approve', async (req, res) => {
    const { taskId } = req.params;
    const { contributions } = req.body;
    const managerId = req.headers['x-user-id'];

    let connection;
    try {
      connection = await pool.getConnection();
      await connection.query('BEGIN');

      const [gTasks] = await connection.query('SELECT id FROM general_tasks WHERE id = ?', [taskId]);
      const isGeneralTask = gTasks.length > 0;

      await connection.query('DELETE FROM task_contributions WHERE task_id = ?', [taskId]);

      for (const comp of contributions) {
        await connection.query(
          `INSERT INTO task_contributions (task_id, subtask_id, user_id, role, effort_points, contribution_percentage, contribution_source, approval_status, approved_by, approved_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'Approved', ?, NOW())`,
          [taskId, comp.subtask_id || null, comp.user_id, comp.role || 'Contributor', comp.effort_points, comp.contribution_percentage || null, comp.contribution_source || 'Manual Override', managerId]
        );
      }

      if (isGeneralTask) {
        await connection.query("UPDATE general_tasks SET contribution_review_status = 'Approved', status = 'Completed' WHERE id = ?", [taskId]);
      } else {
        // Also support IT Kanban status updates or marker
        await connection.query("UPDATE it_kanban_issues SET status = 'Done' WHERE id = ?", [taskId]);
      }

      await connection.query(
        `INSERT INTO task_history (task_id, changed_by_user_id, action_type, field_name, old_value, new_value, reason) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [taskId, managerId, 'Manager Approval', 'contribution_review_status', 'Pending', 'Approved', 'Manager reviewed and finalized all performance points']
      );

      await connection.query('COMMIT');
      res.json({ success: true, message: 'Contributions finalized and task closed.' });
    } catch (error) {
      if (connection) await connection.query('ROLLBACK');
      console.error('Contribution approval error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
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

module.exports = function setupMarketingITWorkflowRoutes(app, pool) {

  // --- IT WORKFLOWS ---

  // Sprints
  app.get('/api/it/sprints', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      const { project_id } = req.query;
      let query = 'SELECT * FROM sprints';
      let params = [];
      if (project_id) {
        query += ' WHERE project_id = ?';
        params.push(project_id);
      }
      const [sprints] = await connection.query(query, params);
      connection.release();
      res.json(sprints);
    } catch (error) {
      if (connection) connection.release();
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/it/sprints', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      const { project_id, name, goal, start_date, end_date } = req.body;
      const [result] = await connection.query(
        'INSERT INTO sprints (project_id, name, goal, start_date, end_date) VALUES (?, ?, ?, ?, ?)',
        [project_id, name, goal, start_date, end_date]
      );
      connection.release();
      res.json({ success: true, id: result.insertId });
    } catch (error) {
      if (connection) connection.release();
      res.status(500).json({ error: error.message });
    }
  });

  // Bugs
  app.get('/api/it/bugs', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      const { project_id, sprint_id } = req.query;
      let query = 'SELECT b.*, u1.first_name as reporter, u2.first_name as assignee FROM bugs b LEFT JOIN users u1 ON b.reported_by = u1.id LEFT JOIN users u2 ON b.assigned_to = u2.id';
      let params = [];
      if (project_id) {
        query += ' WHERE b.project_id = ?';
        params.push(project_id);
      }
      const [bugs] = await connection.query(query, params);
      connection.release();
      res.json(bugs);
    } catch (error) {
      if (connection) connection.release();
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/it/bugs', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      const { project_id, sprint_id, title, description, severity, priority, reported_by } = req.body;
      const [result] = await connection.query(
        'INSERT INTO bugs (project_id, sprint_id, title, description, severity, priority, reported_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [project_id, sprint_id, title, description, severity, priority, reported_by]
      );
      connection.release();
      res.json({ success: true, id: result.insertId });
    } catch (error) {
      if (connection) connection.release();
      res.status(500).json({ error: error.message });
    }
  });

  // Deployments
  app.post('/api/it/deployments', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      const { project_id, environment, version, notes, deployed_by } = req.body;
      const [result] = await connection.query(
        'INSERT INTO deployments (project_id, environment, version, notes, deployed_by, status) VALUES (?, ?, ?, ?, ?, "Pending")',
        [project_id, environment, version, notes, deployed_by]
      );
      connection.release();
      res.json({ success: true, id: result.insertId });
    } catch (error) {
      if (connection) connection.release();
      res.status(500).json({ error: error.message });
    }
  });

  // Teams
  app.get('/api/teams', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      const { department_id } = req.query;
      let query = "SELECT t.*, d.name as department_name, u.first_name as manager_first_name, u.last_name as manager_last_name, CONCAT(u.first_name, ' ', IFNULL(u.last_name, '')) as manager_name FROM teams t LEFT JOIN departments d ON t.department_id = d.id LEFT JOIN users u ON t.manager_id = u.id";
      let params = [];
      if (department_id) {
        query += ' WHERE t.department_id = ?';
        params.push(department_id);
      }
      const [teams] = await connection.query(query, params);
      connection.release();
      res.json(teams);
    } catch (error) {
      if (connection) connection.release();
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/teams', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      const { name, description, department_id, manager_id, manager_role } = req.body;
      const [result] = await connection.query(
        'INSERT INTO teams (name, description, department_id, manager_id, manager_role) VALUES (?, ?, ?, ?, ?)',
        [name || null, description, department_id, manager_id, manager_role]
      );

      // If name was null, update it to a default value with ID
      if (!name) {
        await connection.query(
          'UPDATE teams SET name = ? WHERE id = ?',
          [`Team #${result.insertId}`, result.insertId]
        );
      }

      connection.release();
      res.json({ success: true, id: result.insertId });
    } catch (error) {
      if (connection) connection.release();
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/teams/:id/members', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      const [members] = await connection.query(
        'SELECT tm.*, u.first_name, u.last_name, u.email, u.avatar, COALESCE(tm.role, u.job_title, \'Team Member\') AS role FROM team_members tm JOIN users u ON tm.user_id = u.id WHERE tm.team_id = ?',
        [req.params.id]
      );
      connection.release();
      res.json(members);
    } catch (error) {
      if (connection) connection.release();
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/teams/:id/members', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      const { user_id, role } = req.body;
      // Using a more robust syntax for DUPLICATE KEY UPDATE
      await connection.query(
        'INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role = ?',
        [req.params.id, user_id, role, role]
      );
      connection.release();
      res.json({ success: true });
    } catch (error) {
      if (connection) connection.release();
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/teams/:id', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      const { name, description, department_id, manager_id, manager_role } = req.body;
      await connection.query(
        'UPDATE teams SET name = ?, description = ?, department_id = ?, manager_id = ?, manager_role = ? WHERE id = ?',
        [name || null, description || null, department_id || null, manager_id || null, manager_role || null, req.params.id]
      );
      connection.release();
      res.json({ success: true });
    } catch (error) {
      if (connection) connection.release();
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/teams/:id', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.query('DELETE FROM teams WHERE id = ?', [req.params.id]);
      connection.release();
      res.json({ success: true });
    } catch (error) {
      if (connection) connection.release();
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/teams/:id/members/:userId', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.query(
        'DELETE FROM team_members WHERE team_id = ? AND user_id = ?',
        [req.params.id, req.params.userId]
      );
      connection.release();
      res.json({ success: true });
    } catch (error) {
      if (connection) connection.release();
      res.status(500).json({ error: error.message });
    }
  });

  // IT Manager: Team Tasks and Performance
  app.get('/api/it/manager/team-tasks', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      const [tasks] = await connection.query(`
        SELECT t.*, tm.team_id, te.name as team_name, u.first_name as user_name 
        FROM general_tasks t
        JOIN users u ON JSON_CONTAINS(t.assigned_to, CAST(u.id AS JSON))
        JOIN team_members tm ON u.id = tm.user_id
        JOIN teams te ON tm.team_id = te.id
        WHERE te.department_id = (SELECT id FROM departments WHERE name = 'IT Department' LIMIT 1)
      `);
      connection.release();
      res.json(tasks);
    } catch (error) {
      if (connection) connection.release();
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/it/manager/performance', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      // Simple performance metric: completed tasks vs total tasks per user in IT teams
      const [performance] = await connection.query(`
        SELECT u.id, u.first_name, u.last_name, te.name as team_name,
               COUNT(t.id) as total_tasks,
               SUM(CASE WHEN t.status = 'Completed' THEN 1 ELSE 0 END) as completed_tasks
        FROM users u
        JOIN team_members tm ON u.id = tm.user_id
        JOIN teams te ON tm.team_id = te.id
        LEFT JOIN general_tasks t ON JSON_CONTAINS(t.assigned_to, CAST(u.id AS JSON))
        WHERE te.department_id = (SELECT id FROM departments WHERE name = 'IT Department' LIMIT 1)
        GROUP BY u.id, te.id
      `);
      connection.release();
      res.json(performance);
    } catch (error) {
      if (connection) connection.release();
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/it/manager/deadlines', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      const [deadlines] = await connection.query(`
        SELECT p.id, p.name, p.due_date, p.status, te.name as assigned_team 
        FROM projects p
        LEFT JOIN teams te ON p.team_id = te.id
        WHERE p.workflow_type = 'IT' OR p.department_id = (SELECT id FROM departments WHERE name = 'IT Department' LIMIT 1)
        ORDER BY p.due_date ASC
      `);
      connection.release();
      res.json(deadlines);
    } catch (error) {
      if (connection) connection.release();
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/it/manager/projects-summary', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      const [projects] = await connection.query(`
        SELECT 
          p.id, 
          p.name, 
          p.due_date as project_deadline, 
          p.status as project_status,
          te.name as assigned_team,
          COUNT(t.id) as total_tasks,
          SUM(CASE WHEN t.status = 'Completed' THEN 1 ELSE 0 END) as completed_tasks,
          SUM(CASE WHEN t.status != 'Completed' THEN 1 ELSE 0 END) as remaining_tasks,
          MAX(t.due_date) as tentative_completion_date,
          (SELECT MAX(updated_at) FROM followups f WHERE f.project_id = p.id AND f.recurrence_frequency = 'Weekly' AND f.status = 'Completed') as last_weekly_report,
          (SELECT MAX(updated_at) FROM followups f WHERE f.project_id = p.id AND f.recurrence_frequency = 'Monthly' AND f.status = 'Completed') as last_monthly_report,
          (SELECT subject FROM followups f WHERE f.project_id = p.id ORDER BY f.scheduled_date DESC LIMIT 1) as last_update
        FROM projects p
        LEFT JOIN teams te ON p.team_id = te.id
        LEFT JOIN general_tasks t ON p.id = t.project_id
        WHERE p.workflow_type = 'IT' OR p.department_id = (SELECT id FROM departments WHERE name = 'IT Department' LIMIT 1)
        GROUP BY p.id
        ORDER BY p.due_date ASC
      `);
      connection.release();
      res.json(projects);
    } catch (error) {
      if (connection) connection.release();
      res.status(500).json({ error: error.message });
    }
  });

  // Bulk assign team to project
  app.post('/api/projects/:id/assign-team', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      const projectId = req.params.id;
      const { team_id } = req.body;

      // 0. Get project details for follow-up creation
      const [projectRows] = await connection.query('SELECT name, company_id, contact_id, deal_id FROM projects WHERE id = ?', [projectId]);
      const project = projectRows[0];

      // 1. Update project team_id
      await connection.query(
        'UPDATE projects SET team_id = ? WHERE id = ?',
        [team_id, projectId]
      );

      // 2. Get team manager
      const [teams] = await connection.query('SELECT manager_id, manager_role FROM teams WHERE id = ?', [team_id]);
      let managerId = null;
      if (teams.length > 0) {
        const team = teams[0];
        managerId = team.manager_id;
        if (team.manager_id) {
          await connection.query(
            'INSERT INTO project_team (project_id, user_id, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role = ?',
            [projectId, team.manager_id, team.manager_role || 'Manager', team.manager_role || 'Manager']
          );
        }
      }

      // 3. Get team members
      const [members] = await connection.query('SELECT user_id, role FROM team_members WHERE team_id = ?', [team_id]);
      for (const member of members) {
        await connection.query(
          'INSERT INTO project_team (project_id, user_id, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role = ?',
          [projectId, member.user_id, member.role || 'Team Member', member.role || 'Team Member']
        );
      }

      // 4. Create Weekly and Monthly Report Follow-ups
      if (project) {
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);

        const nextMonth = new Date(today);
        nextMonth.setMonth(today.getMonth() + 1);

        // Weekly Report Follow-up
        await connection.query(`
          INSERT INTO followups (
            related_type, related_id, type, subject, description, 
            scheduled_date, scheduled_time, priority, 
            is_recurring, recurrence_frequency, 
            assigned_to, project_id, contact_id, deal_id, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          'Customer', project.contact_id || project.company_id, 'Report',
          `Weekly Progress Report: ${project.name}`,
          `Standard weekly progress report for ${project.name}`,
          nextWeek.toISOString().split('T')[0], '10:00:00', 'Medium',
          1, 'Weekly',
          managerId, projectId, project.contact_id, project.deal_id, 'Scheduled'
        ]);

        // Monthly Report Follow-up
        await connection.query(`
          INSERT INTO followups (
            related_type, related_id, type, subject, description, 
            scheduled_date, scheduled_time, priority, 
            is_recurring, recurrence_frequency, 
            assigned_to, project_id, contact_id, deal_id, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          'Customer', project.contact_id || project.company_id, 'Report',
          `Monthly Performance Review: ${project.name}`,
          `Comprehensive monthly performance and health review for ${project.name}`,
          nextMonth.toISOString().split('T')[0], '11:00:00', 'High',
          1, 'Monthly',
          managerId, projectId, project.contact_id, project.deal_id, 'Scheduled'
        ]);
      }

      await connection.commit();
      connection.release();
      res.json({ success: true, message: 'Team assigned to project successfully' });
    } catch (error) {
      if (connection) {
        await connection.rollback();
        connection.release();
      }
      res.status(500).json({ error: error.message });
    }
  });

  // --- MARKETING WORKFLOWS ---

  // Creative Requests
  app.get('/api/marketing/creative-requests', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      const [requests] = await connection.query('SELECT r.*, u1.first_name as requester, u2.first_name as designer FROM creative_requests r LEFT JOIN users u1 ON r.requested_by = u1.id LEFT JOIN users u2 ON r.assigned_to = u2.id');
      connection.release();
      res.json(requests);
    } catch (error) {
      if (connection) connection.release();
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/marketing/creative-requests', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      const { project_id, title, description, request_type, priority, requested_by, due_date } = req.body;
      const [result] = await connection.query(
        'INSERT INTO creative_requests (project_id, title, description, request_type, priority, requested_by, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [project_id, title, description, request_type, priority, requested_by, due_date]
      );
      connection.release();
      res.json({ success: true, id: result.insertId });
    } catch (error) {
      if (connection) connection.release();
      res.status(500).json({ error: error.message });
    }
  });

  // Content Calendar
  app.get('/api/marketing/content-calendar', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      const [calendar] = await connection.query('SELECT * FROM content_calendar ORDER BY scheduled_date ASC');
      connection.release();
      res.json(calendar);
    } catch (error) {
      if (connection) connection.release();
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/marketing/content-calendar', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      const { project_id, title, content_type, scheduled_date, platform, assigned_to } = req.body;
      const [result] = await connection.query(
        'INSERT INTO content_calendar (project_id, title, content_type, scheduled_date, platform, assigned_to) VALUES (?, ?, ?, ?, ?, ?)',
        [project_id, title, content_type, scheduled_date, platform, assigned_to]
      );
      connection.release();
      res.json({ success: true, id: result.insertId });
    } catch (error) {
      if (connection) connection.release();
      res.status(500).json({ error: error.message });
    }
  });

  // SEO Management
  app.get('/api/marketing/seo', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      const projectId = req.query.project_id || req.query.projectId;
      let query = 'SELECT * FROM seo_management';
      const params = [];
      if (projectId) {
        query += ' WHERE project_id = ?';
        params.push(projectId);
      }
      const [seo] = await connection.query(query, params);
      connection.release();
      res.json({ success: true, data: seo });
    } catch (error) {
      if (connection) connection.release();
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/marketing/seo', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      const { project_id, keyword, target_url, target_ranking } = req.body;
      const [result] = await connection.query(
        'INSERT INTO seo_management (project_id, keyword, target_url, target_ranking) VALUES (?, ?, ?, ?)',
        [project_id, keyword, target_url, target_ranking]
      );
      connection.release();
      res.json({ success: true, id: result.insertId });
    } catch (error) {
      if (connection) connection.release();
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GMB Management11
  app.get('/api/marketing/gmb', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      const projectId = req.query.project_id || req.query.projectId;
      let query = 'SELECT * FROM gmb_management';
      const params = [];
      if (projectId) {
        query += ' WHERE project_id = ?'; 1
      }
      const [gmb] = await connection.query(query, params);
      connection.release();
      res.json({ success: true, data: gmb });
    } catch (error) {
      if (connection) connection.release();
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/marketing/gmb', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      const { project_id, location_name, map_url, average_rating, total_reviews, status } = req.body;
      const [result] = await connection.query(
        'INSERT INTO gmb_management (project_id, location_name, map_url, average_rating, total_reviews, status) VALUES (?, ?, ?, ?, ?, ?)',
        [project_id, location_name, map_url, average_rating, total_reviews, status]
      );
      connection.release();
      res.json({ success: true, id: result.insertId });
    } catch (error) {
      if (connection) connection.release();
      res.status(500).json({ success: false, error: error.message });
    }
  });
};

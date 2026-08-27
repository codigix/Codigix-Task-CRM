const nodemailer = require('nodemailer');
const { resolveDealForLead, generateProjectTasks } = require('../middleware/helpers');

module.exports = function setupTasksProjectsRoutes(app, pool) {

  // Use pool.query directly for better connection management
  // This automatically acquires and releases connections from the pool
  const db = {
    query: (sql, params) => pool.query(sql, params)
  };

  // In-app "assigned to you" notification for project tasks. assigned_to is a user id here.
  // Fire-and-forget so a notification failure can't fail the save.
  // Resolve who acted, so notifications name a person instead of "Someone".
  const resolveActorName = async (req) => {
    const headerName = req.headers['x-user-name'];
    if (headerName && String(headerName).trim()) return String(headerName).trim();
    const headerId = req.headers['x-user-id'];
    if (headerId) {
      try {
        const [rows] = await db.query(
          "SELECT TRIM(CONCAT(COALESCE(first_name,''), ' ', COALESCE(last_name,''))) AS name, username FROM users WHERE id = ?",
          [headerId]
        );
        if (rows.length > 0) return rows[0].name || rows[0].username;
      } catch (e) {
        console.error('Could not resolve actor from x-user-id:', e.message);
      }
    }
    return 'Someone';
  };

  const notifyTaskAssignment = async ({ req, assignedTo, taskId, title, projectId }) => {
    const createNotification = req.app.locals.createNotification;
    if (typeof createNotification !== 'function' || !assignedTo) return;
    const actor = await resolveActorName(req);

    createNotification({
      userId: assignedTo,
      type: 'assignment',
      title: `TASK-${taskId} assigned to you`,
      message: `${actor} assigned the task "${title || 'Untitled'}" to you`,
      actorName: actor,
      entityType: 'task',
      entityKey: `TASK-${taskId}`,
      link: projectId ? `/projects/details/${projectId}` : null,
      excludeUserId: req.headers['x-user-id']
    }).catch(err => console.error('Failed to send task assignment notification:', err.message));
  };

  const getAssigneeDetails = async (userId) => {
    if (!userId) return null;
    try {
      const [users] = await db.query(
        "SELECT email, CONCAT(first_name, ' ', last_name) as name FROM users WHERE id = ?",
        [userId]
      );
      if (users.length > 0) return users[0];
    } catch (e) {
      console.error('Failed to get assignee details:', e);
    }
    return null;
  };

  const sendAssignmentEmail = async (assigneeEmail, assigneeName, ticketKey, ticketTitle, ticketType, ticketDescription, ticketStatus, ticketPriority, projectId = null) => {
    const SMTP_HOST = process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp.gmail.com';
    const SMTP_PORT = process.env.EMAIL_PORT || process.env.SMTP_PORT || '587';
    const SMTP_USER = process.env.EMAIL_USER || process.env.SMTP_USER;
    const SMTP_PASS = process.env.EMAIL_PASS || process.env.SMTP_PASS;

    if (!SMTP_USER || !SMTP_PASS) {
      console.warn('⚠️ SMTP credentials missing. Cannot send assignment notification email.');
      return false;
    }

    try {
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: parseInt(SMTP_PORT),
        secure: SMTP_PORT == 465,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS
        }
      });

      const clientBaseUrl = process.env.CLIENT_URL || process.env.CORS_ORIGIN || 'http://localhost:3001';
      const link = projectId
        ? `${clientBaseUrl}/it/employee/it/details/${projectId}?taskId=${ticketKey}`
        : `${clientBaseUrl}/it/employee/it/tasks?ticketKey=${ticketKey}`;

      const mailOptions = {
        from: `"CRM Notifications" <${SMTP_USER}>`,
        to: assigneeEmail,
        subject: `[CRM Notification] New Task Assigned: ${ticketTitle} (${ticketKey})`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <div style="background-color: #3b82f6; padding: 15px; text-align: center; border-radius: 6px 6px 0 0;">
              <h2 style="color: white; margin: 0; font-size: 18px;">New Task Assigned</h2>
            </div>
            <div style="padding: 20px; color: #333333; line-height: 1.6;">
              <p>Hello <strong>${assigneeName}</strong>,</p>
              <p>You have been assigned a new task/issue in the IT Operations Dashboard:</p>
              
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; width: 30%;">Task Key</td>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;">${ticketKey}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Title</td>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;">${ticketTitle}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Type</td>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;">${ticketType || 'Task'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Priority</td>
                  <td style="padding: 8px; border-bottom: 1px solid #eee; color: ${ticketPriority === 'High' ? '#ef4444' : '#f97316'}; font-weight: bold;">${ticketPriority || 'Medium'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Status</td>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;"><span style="background-color: #eff6ff; color: #1e3a8a; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; border: 1px solid #bfdbfe;">${ticketStatus || 'TO DO'}</span></td>
                </tr>
              </table>

              <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; border-left: 4px solid #3b82f6; margin-bottom: 25px;">
                <h4 style="margin: 0 0 8px 0; font-size: 12px; color: #4b5563; text-transform: ;">Description</h4>
                <p style="margin: 0; font-size: 13px; color: #1f2937;">${ticketDescription || 'No description provided.'}</p>
              </div>

              <div style="text-align: center;">
                <a href="${link}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 14px; display: inline-block;">View Task in Portal</a>
              </div>
            </div>
            <div style="background-color: #f3f4f6; padding: 10px; text-align: center; font-size: 11px; color: #6b7280; border-radius: 0 0 6px 6px;">
              This is an automated notification. Please do not reply to this email.
            </div>
          </div>
        `
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`✉️ Assignment notification email sent successfully to ${assigneeEmail}:`, info.messageId);
      return true;
    } catch (error) {
      console.error('❌ Failed to send assignment notification email:', error.message);
      return false;
    }
  };

  const responseError = (res, statusCode, message, error) => {
    console.error(`Error: ${message}`, error?.message || error);
    return res.status(statusCode).json({ error: message, details: error?.message || error });
  };

  app.post('/api/projects/:projectId/tasks', async (req, res) => {
    try {
      const { projectId } = req.params;
      const { title, description, status, priority, assigned_to, due_date, created_by } = req.body;

      const [result] = await db.query(`
        INSERT INTO project_tasks (title, description, project_id, status, priority, assigned_to, due_date, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [title, description || null, projectId, status || 'Open', priority || 'Medium', assigned_to || null, due_date || null, created_by || null]);

      // Send assignment email notification asynchronously
      if (assigned_to) {
        getAssigneeDetails(assigned_to).then(user => {
          if (user && user.email) {
            sendAssignmentEmail(
              user.email,
              user.name,
              `TASK-${result.insertId}`,
              title,
              'Task',
              description,
              status || 'Open',
              priority || 'Medium',
              projectId
            );
          }
        }).catch(err => console.error('Failed to trigger email notify on task creation:', err));

        notifyTaskAssignment({ req, assignedTo: assigned_to, taskId: result.insertId, title, projectId });
      }

      res.status(201).json({
        message: 'Task created successfully',
        id: result.insertId
      });
    } catch (error) {
      responseError(res, 500, 'Failed to create task', error);
    }
  });

  app.get('/api/projects/:projectId/tasks', async (req, res) => {
    try {
      const { projectId } = req.params;
      const [tasks] = await db.query(`
        SELECT t.*,
               u1.first_name,
               u1.last_name,
               u1.avatar,
               u1.first_name as assigned_to_name,
               u2.first_name as created_by_name
        FROM project_tasks t
        LEFT JOIN users u1 ON t.assigned_to = u1.id
        LEFT JOIN users u2 ON t.created_by = u2.id
        WHERE t.project_id = ?
        ORDER BY t.created_at DESC
      `, [projectId]);

      // Service checklist tasks (auto-generated on project setup) live in general_tasks,
      // so include them here or they stay invisible on the project page.
      const [serviceTasks] = await db.query(`
        SELECT g.id, g.title, g.description, g.status, g.priority, g.due_date,
               g.workflow_type, g.created_at, g.updated_at, g.project_id,
               u.first_name, u.last_name, u.avatar
        FROM general_tasks g
        LEFT JOIN users u ON u.id = g.created_by
        WHERE g.project_id = ?
        ORDER BY g.created_at ASC
      `, [projectId]);

      res.json([
        ...tasks.map(t => ({ ...t, task_source: 'project_task' })),
        ...serviceTasks.map(t => ({ ...t, task_source: 'general_task' }))
      ]);
    } catch (error) {
      responseError(res, 500, 'Failed to fetch tasks', error);
    }
  });

  app.get('/api/tasks', async (req, res) => {
    try {
      const { department, user_id, role } = req.query;
      let sql = `
        SELECT t.*, 
               u1.first_name as assigned_to_name, 
               u1.avatar as assigned_to_avatar
        FROM project_tasks t
        LEFT JOIN users u1 ON t.assigned_to = u1.id
        LEFT JOIN projects p ON t.project_id = p.id
        LEFT JOIN departments d ON p.department_id = d.id
        WHERE 1=1
      `;
      const params = [];

      // Removed role-based validation to allow everyone to view tasks of everyone
      
      sql += ` ORDER BY t.created_at DESC`;

      const [tasks] = await db.query(sql, params);

      // Format tasks to match the UI expectations (LIST_DATA / INITIAL_KANBAN_DATA)
      const formattedTasks = tasks.map((t, index) => {
        const key = t.task_key || `TASK-${t.id}`;
        return {
          id: t.id.toString(),
          key: key,
          title: t.title,
          description: t.description || '',
          type: t.priority === 'High' ? 'Bug' : 'Task', // Map priority to type for now, or add type column later
          status: t.status ? t.status.toUpperCase() : 'TO DO',
          assignee: t.assigned_to_name || 'Unassigned',
          assignee_avatar: t.assigned_to_avatar,
          priority: t.priority || 'Medium',
          labels: t.priority === 'High' ? ['Frontend', 'Bug'] : ['Task'], // Placeholder labels
          sprint: 'Sprint 1',
          due: t.due_date ? new Date(t.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'No Due Date',
          points: 3,
        };
      });

      res.json(formattedTasks);
    } catch (error) {
      responseError(res, 500, 'Failed to fetch tasks', error);
    }
  });

  app.put('/api/project-tasks/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { title, description, status, priority, assigned_to, due_date, completed_date, task_source } = req.body;

      // Service checklist tasks live in general_tasks; ids are not shared between the two
      // tables, so route by source to avoid updating an unrelated project_task with the same id.
      if (task_source === 'general_task') {
        await db.query(`
          UPDATE general_tasks
          SET title = ?, description = ?, status = ?, priority = ?, due_date = ?, updated_at = NOW()
          WHERE id = ?
        `, [
          title || null,
          description || null,
          status || 'To Do',
          priority || 'Medium',
          due_date || null,
          id
        ]);
        return res.json({ message: 'Task updated successfully' });
      }

      // Check if assignee is updated
      if (assigned_to) {
        try {
          const [currentTasks] = await db.query(
            "SELECT project_id, title, description, priority, status, assigned_to FROM project_tasks WHERE id = ?",
            [id]
          );
          if (currentTasks.length > 0) {
            const currentTask = currentTasks[0];
            if (Number(assigned_to) !== Number(currentTask.assigned_to)) {
              getAssigneeDetails(assigned_to).then(user => {
                if (user && user.email) {
                  sendAssignmentEmail(
                    user.email,
                    user.name,
                    `TASK-${id}`,
                    title || currentTask.title,
                    'Task',
                    description || currentTask.description,
                    status || currentTask.status,
                    priority || currentTask.priority,
                    currentTask.project_id
                  );
                }
              }).catch(err => console.error('Failed to trigger email notify on project task update:', err));

              notifyTaskAssignment({
                req,
                assignedTo: assigned_to,
                taskId: id,
                title: title || currentTask.title,
                projectId: currentTask.project_id
              });
            }
          }
        } catch (dbErr) {
          console.error('Failed to query current project task state for assignee check:', dbErr);
        }
      }

      await db.query(`
        UPDATE project_tasks 
        SET title = ?, description = ?, status = ?, priority = ?, assigned_to = ?, due_date = ?, completed_date = ?, updated_at = NOW()
        WHERE id = ?
      `, [
        title || null,
        description || null,
        status || 'Open',
        priority || 'Medium',
        assigned_to || null,
        due_date || null,
        completed_date || null,
        id
      ]);

      res.json({ message: 'Task updated successfully' });
    } catch (error) {
      responseError(res, 500, 'Failed to update task', error);
    }
  });

  app.delete('/api/project-tasks/:id', async (req, res) => {
    try {
      const { id } = req.params;
      if (req.query.task_source === 'general_task') {
        await db.query('DELETE FROM general_tasks WHERE id = ?', [id]);
      } else {
        await db.query('DELETE FROM project_tasks WHERE id = ?', [id]);
      }
      res.json({ message: 'Task deleted successfully' });
    } catch (error) {
      responseError(res, 500, 'Failed to delete task', error);
    }
  });

  app.post('/api/contacts/:contactId/tasks', async (req, res) => {
    try {
      const { contactId } = req.params;
      const { title, description, status, priority, assigned_to, due_date, created_by } = req.body;

      const [result] = await db.query(`
        INSERT INTO contact_tasks (title, description, contact_id, status, priority, assigned_to, due_date, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [title, description || null, contactId, status || 'Open', priority || 'Medium', assigned_to || null, due_date || null, created_by || null]);

      res.status(201).json({
        message: 'Contact task created successfully',
        id: result.insertId
      });
    } catch (error) {
      responseError(res, 500, 'Failed to create contact task', error);
    }
  });

  app.get('/api/contacts/:contactId/tasks', async (req, res) => {
    try {
      const { contactId } = req.params;
      const [tasks] = await db.query(`
        SELECT t.*,
               u1.first_name as assigned_to_name,
               u2.first_name as created_by_name
        FROM contact_tasks t
        LEFT JOIN users u1 ON t.assigned_to = u1.id
        LEFT JOIN users u2 ON t.created_by = u2.id
        WHERE t.contact_id = ?
        ORDER BY t.due_date ASC
      `, [contactId]);

      res.json(tasks);
    } catch (error) {
      responseError(res, 500, 'Failed to fetch contact tasks', error);
    }
  });

  app.post('/api/projects/:projectId/team', async (req, res) => {
    try {
      const { projectId } = req.params;
      const { user_id, role, allocation_percentage } = req.body;

      const [result] = await db.query(`
        INSERT INTO project_team (project_id, user_id, role, allocation_percentage)
        VALUES (?, ?, ?, ?)
      `, [projectId, user_id, role || null, allocation_percentage || 100]);

      res.status(201).json({
        message: 'Team member added successfully',
        id: result.insertId
      });
    } catch (error) {
      responseError(res, 500, 'Failed to add team member', error);
    }
  });

  app.get('/api/projects/:projectId/team', async (req, res) => {
    try {
      const { projectId } = req.params;
      const [team] = await db.query(`
        SELECT pt.*, 
          u.first_name, u.last_name, u.email, u.avatar,
          COALESCE(tm.role, u.job_title, t.manager_role, pt.role, 'Team Member') AS role,
          COALESCE(d.name, pd.name, u.department) AS department
        FROM project_team pt
        JOIN users u ON pt.user_id = u.id
        LEFT JOIN projects p ON p.id = pt.project_id
        LEFT JOIN team_members tm ON tm.user_id = pt.user_id AND tm.team_id = p.team_id
        LEFT JOIN teams t ON t.id = p.team_id AND t.manager_id = pt.user_id
        LEFT JOIN departments d ON d.id = u.department_id
        LEFT JOIN departments pd ON pd.id = p.department_id
        WHERE pt.project_id = ?
        ORDER BY pt.joined_at DESC
      `, [projectId]);

      res.json(team);
    } catch (error) {
      responseError(res, 500, 'Failed to fetch project team', error);
    }
  });

  app.delete('/api/projects/:projectId/team/:userId', async (req, res) => {
    try {
      const { projectId, userId } = req.params;
      await db.query('DELETE FROM project_team WHERE project_id = ? AND user_id = ?', [projectId, userId]);
      res.json({ message: 'Team member removed successfully' });
    } catch (error) {
      responseError(res, 500, 'Failed to remove team member', error);
    }
  });

  app.post('/api/projects/:projectId/timesheets', async (req, res) => {
    try {
      const { projectId } = req.params;
      const { user_id, work_date, hours_worked, description, created_by } = req.body;

      const [result] = await db.query(`
        INSERT INTO project_timesheets (project_id, user_id, work_date, hours_worked, description, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [projectId, user_id, work_date, hours_worked, description || null, created_by || null]);

      res.status(201).json({
        message: 'Timesheet entry created successfully',
        id: result.insertId
      });
    } catch (error) {
      responseError(res, 500, 'Failed to create timesheet entry', error);
    }
  });

  app.get('/api/projects/:projectId/timesheets', async (req, res) => {
    try {
      const { projectId } = req.params;
      const { user_id, start_date, end_date } = req.query;

      let query = `
        SELECT pt.*, u.first_name, u.last_name, u.email
        FROM project_timesheets pt
        JOIN users u ON pt.user_id = u.id
        WHERE pt.project_id = ?
      `;
      const params = [projectId];

      if (user_id) {
        query += ' AND pt.user_id = ?';
        params.push(user_id);
      }
      if (start_date) {
        query += ' AND pt.work_date >= ?';
        params.push(start_date);
      }
      if (end_date) {
        query += ' AND pt.work_date <= ?';
        params.push(end_date);
      }

      query += ' ORDER BY pt.work_date DESC';

      const [timesheets] = await db.query(query, params);
      res.json(timesheets);
    } catch (error) {
      responseError(res, 500, 'Failed to fetch timesheets', error);
    }
  });

  app.get('/api/tasks', async (req, res) => {
    try {
      const { skip = 0, limit = 50, status, search } = req.query;

      let query = `
        SELECT 
          gt.*, 
          u.first_name as assigned_by_name,
          CASE 
            WHEN gt.project_id IS NOT NULL THEN p_id.name
            WHEN gt.linked_type = 'Project' THEN p.name
            WHEN gt.linked_type = 'Deal' THEN d.deal_name
            WHEN gt.linked_type = 'Lead' THEN l.project_name
            ELSE NULL
          END as project_name,
          CASE 
            WHEN gt.project_id IS NOT NULL THEN c_pid.company_name
            WHEN gt.linked_type = 'Project' THEN c_p.company_name
            WHEN gt.linked_type = 'Deal' THEN c_d.company_name
            WHEN gt.linked_type = 'Lead' THEN l.lead_name
            ELSE NULL
          END as client_name
        FROM general_tasks gt 
        LEFT JOIN users u ON gt.created_by = u.id 
        LEFT JOIN projects p_id ON gt.project_id = p_id.id
        LEFT JOIN projects p ON gt.linked_type = 'Project' AND gt.linked_id = p.id
        LEFT JOIN deals d ON gt.linked_type = 'Deal' AND gt.linked_id = d.id
        LEFT JOIN leads l ON gt.linked_type = 'Lead' AND gt.linked_id = l.id
        LEFT JOIN companies c_pid ON p_id.company_id = c_pid.id
        LEFT JOIN companies c_p ON p.company_id = c_p.id
        LEFT JOIN companies c_d ON d.company_id = c_d.id
        WHERE 1=1
      `;
      const params = [];

      if (status) {
        query += ' AND gt.status = ?';
        params.push(status);
      }

      if (search) {
        query += ' AND (gt.title LIKE ? OR gt.description LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm);
      }

      query += ' ORDER BY gt.due_date ASC, gt.due_time ASC, gt.created_at DESC LIMIT ?, ?';
      params.push(parseInt(skip), parseInt(limit));

      const [tasks] = await db.query(query, params);
      res.json(tasks);
    } catch (error) {
      responseError(res, 500, 'Failed to fetch tasks', error);
    }
  });

  app.post('/api/tasks', async (req, res) => {
    try {
      const {
        title, description, status, priority, assigned_to, due_date, due_time,
        tags, linked_type, linked_id, created_by, task_type, next_followup_date,
        internal_notes, reminder_date, category, sub_type, project_id,
        workflow_type, department_id
      } = req.body;

      if (!title) {
        return res.status(400).json({ error: 'Task title required' });
      }

      const [result] = await db.query(`
        INSERT INTO general_tasks (
          title, description, status, priority, assigned_to, due_date, due_time, 
          tags, linked_type, linked_id, created_by, task_type, next_followup_date,
          internal_notes, reminder_date, category, sub_type, project_id,
          workflow_type, department_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        title,
        description || null,
        status || 'Open',
        priority || 'Medium',
        assigned_to ? JSON.stringify(assigned_to) : null,
        due_date || null,
        due_time || null,
        tags ? JSON.stringify(tags) : null,
        linked_type || 'General',
        linked_id || null,
        created_by || null,
        task_type || 'General',
        next_followup_date || null,
        internal_notes || null,
        reminder_date || null,
        category || null,
        sub_type || null,
        project_id || null,
        workflow_type || null,
        department_id || null
      ]);

      const taskId = result.insertId;

      // Create activity log
      if (linked_type && linked_id) {
        let lead_id = linked_type === 'Lead' ? linked_id : null;
        let deal_id = linked_type === 'Deal' ? linked_id : null;

        await db.query(`
          INSERT INTO activities (title, description, activity_type, lead_id, deal_id, task_id, status)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          `Task Created: ${title}`,
          description || `New task created and linked to ${linked_type}`,
          'Task',
          lead_id,
          deal_id,
          taskId,
          'Completed'
        ]);
      }

      // Handle "Converted to Deal" status for new tasks
      if (status === 'Converted to Deal' && linked_type === 'Lead' && linked_id) {
        try {
          const leadId = linked_id;
          const [leads] = await db.query('SELECT * FROM leads WHERE id = ?', [leadId]);

          if (leads.length > 0) {
            const leadData = leads[0];

            if (leadData.lead_status !== 'Qualified') {
              let finalCompanyId = leadData.company_id;

              if (!finalCompanyId) {
                const [companies] = await db.query('SELECT id FROM companies LIMIT 1');
                if (companies.length > 0) {
                  finalCompanyId = companies[0].id;
                } else {
                  const [companyResult] = await db.query(
                    'INSERT INTO companies (company_name, status) VALUES (?, ?)',
                    [`${leadData.lead_name || 'Unknown'} Company`, 'Active']
                  );
                  finalCompanyId = companyResult.insertId;
                }
              }

              let stageId = 'New';
              try {
                const [defaultPipeline] = await db.query(
                  "SELECT id FROM pipelines WHERE status = 'Active' ORDER BY id LIMIT 1"
                );
                if (defaultPipeline.length > 0) {
                  const [defaultStage] = await db.query(
                    "SELECT id FROM pipeline_stages WHERE pipeline_id = ? ORDER BY sequence ASC LIMIT 1",
                    [defaultPipeline[0].id]
                  );
                  if (defaultStage.length > 0) stageId = defaultStage[0].id;
                }
              } catch (e) { /* ignore pipeline table errors */ }

              const resolved = await resolveDealForLead(db, leadData);
              await db.query(
                `INSERT INTO deals (
                  deal_name, description, deal_value, currency, status,
                  company_id, service_category_id, services, pipeline, deal_stage, probability,
                  department_id, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                [
                  resolved.dealName || 'New Deal from Task',
                  leadData.notes || 'Converted from new task with converted status',
                  leadData.value || 0,
                  leadData.currency || 'USD',
                  'Open',
                  finalCompanyId,
                  resolved.serviceCategoryId,
                  resolved.serviceNames.length > 0 ? JSON.stringify(resolved.serviceNames) : null,
                  'Converted Lead',
                  stageId,
                  10,
                  resolved.departmentId
                ]
              );

              await db.query(
                "UPDATE leads SET lead_status = 'Qualified', updated_at = NOW() WHERE id = ?",
                [leadId]
              );
              console.log(`✓ New task triggered lead ${leadId} conversion to a deal`);
            }
          }
        } catch (convError) {
          console.error('Failed to auto-convert lead to deal from new task:', convError);
        }
      }

      const [task] = await db.query('SELECT * FROM general_tasks WHERE id = ?', [taskId]);
      res.status(201).json(task[0]);
    } catch (error) {
      responseError(res, 500, 'Failed to create task', error);
    }
  });

  app.get('/api/tasks/:taskId', async (req, res) => {
    try {
      const { taskId } = req.params;
      const [tasks] = await db.query('SELECT * FROM general_tasks WHERE id = ?', [taskId]);

      if (tasks.length === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }

      res.json(tasks[0]);
    } catch (error) {
      responseError(res, 500, 'Failed to fetch task', error);
    }
  });

  app.put('/api/tasks/:taskId', async (req, res) => {
    try {
      const { taskId } = req.params;
      const { title, description, status, priority, assigned_to, due_date, due_time, tags, linked_type, linked_id, created_by, task_type, next_followup_date } = req.body;

      await db.query(`
        UPDATE general_tasks 
        SET title = ?, description = ?, status = ?, priority = ?, assigned_to = ?, due_date = ?, due_time = ?, tags = ?, linked_type = ?, linked_id = ?, task_type = ?, next_followup_date = ?, updated_at = NOW()
        WHERE id = ?
      `, [
        title || null,
        description || null,
        status || null,
        priority || null,
        assigned_to ? JSON.stringify(assigned_to) : null,
        due_date || null,
        due_time || null,
        tags ? JSON.stringify(tags) : null,
        linked_type || null,
        linked_id || null,
        task_type || null,
        next_followup_date || null,
        taskId
      ]);

      // Create activity log for status change
      if (status) {
        let lead_id = linked_type === 'Lead' ? linked_id : null;
        let deal_id = linked_type === 'Deal' ? linked_id : null;

        await db.query(`
          INSERT INTO activities (title, description, activity_type, lead_id, deal_id, task_id, status)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          `Task Updated: ${title}`,
          `Task status updated to ${status}`,
          'Task',
          lead_id,
          deal_id,
          taskId,
          'Completed'
        ]);
      }

      // Handle "Converted to Deal" status
      if (status === 'Converted to Deal' && linked_type === 'Lead' && linked_id) {
        try {
          const leadId = linked_id;
          const [leads] = await db.query('SELECT * FROM leads WHERE id = ?', [leadId]);

          if (leads.length > 0) {
            const leadData = leads[0];

            // Check if already converted to avoid duplicates
            if (leadData.lead_status !== 'Qualified') {
              let finalCompanyId = leadData.company_id;

              if (!finalCompanyId) {
                const [companies] = await db.query('SELECT id FROM companies LIMIT 1');
                if (companies.length > 0) {
                  finalCompanyId = companies[0].id;
                } else {
                  const [companyResult] = await db.query(
                    'INSERT INTO companies (company_name, status) VALUES (?, ?)',
                    [`${leadData.lead_name || 'Unknown'} Company`, 'Active']
                  );
                  finalCompanyId = companyResult.insertId;
                }
              }

              let stageId = 'New';
              try {
                const [defaultPipeline] = await db.query(
                  "SELECT id FROM pipelines WHERE status = 'Active' ORDER BY id LIMIT 1"
                );
                if (defaultPipeline.length > 0) {
                  const [defaultStage] = await db.query(
                    "SELECT id FROM pipeline_stages WHERE pipeline_id = ? ORDER BY sequence ASC LIMIT 1",
                    [defaultPipeline[0].id]
                  );
                  if (defaultStage.length > 0) stageId = defaultStage[0].id;
                }
              } catch (e) { /* ignore pipeline table errors */ }

              const resolved = await resolveDealForLead(db, leadData);
              const [dealResult] = await db.query(
                `INSERT INTO deals (
                  deal_name, description, deal_value, currency, status,
                  company_id, service_category_id, services, pipeline, deal_stage, probability,
                  department_id, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                [
                  resolved.dealName || 'New Deal from Task',
                  leadData.notes || 'Converted from task status change',
                  leadData.value || 0,
                  leadData.currency || 'USD',
                  'Open',
                  finalCompanyId,
                  resolved.serviceCategoryId,
                  resolved.serviceNames.length > 0 ? JSON.stringify(resolved.serviceNames) : null,
                  'Converted Lead',
                  stageId,
                  10,
                  resolved.departmentId
                ]
              );

              await db.query(
                "UPDATE leads SET lead_status = 'Qualified', updated_at = NOW() WHERE id = ?",
                [leadId]
              );

              console.log(`✓ Task status change triggered lead ${leadId} conversion to deal ${dealResult.insertId}`);
            }
          }
        } catch (convError) {
          console.error('Failed to auto-convert lead to deal from task status change:', convError);
        }
      }

      const [task] = await db.query('SELECT * FROM general_tasks WHERE id = ?', [taskId]);
      res.json(task[0]);
    } catch (error) {
      responseError(res, 500, 'Failed to update task', error);
    }
  });

  app.delete('/api/tasks/:taskId', async (req, res) => {
    try {
      const { taskId } = req.params;

      // Perform a cascading delete for related records
      await db.query('DELETE FROM activities WHERE task_id = ?', [taskId]);
      await db.query('DELETE FROM entity_notes WHERE task_id = ?', [taskId]);
      await db.query('DELETE FROM files WHERE task_id = ?', [taskId]);

      // Finally delete the task itself
      const [result] = await db.query('DELETE FROM general_tasks WHERE id = ?', [taskId]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }

      res.json({ message: 'Task and all related records deleted successfully' });
    } catch (error) {
      responseError(res, 500, 'Failed to delete task and related records', error);
    }
  });

  app.post('/api/deals/:dealId/convert-to-project', async (req, res) => {
    try {
      const { dealId } = req.params;
      const { name, budget, start_date, end_date, workflow_type, department_id } = req.body;

      const [deal] = await db.query('SELECT * FROM deals WHERE id = ?', [dealId]);
      if (deal.length === 0) return res.status(404).json({ error: 'Deal not found' });

      const userId = req.headers['x-user-id'] || deal[0].assignee_id || null;

      let finalDeptId = department_id;
      let finalWorkflowType = workflow_type || 'Standard';

      if (!finalDeptId && finalWorkflowType) {
        let deptName = '';
        if (finalWorkflowType === 'IT') deptName = 'IT Department';
        else if (finalWorkflowType === 'Marketing') deptName = 'Marketing Department';

        if (deptName) {
          const [dept] = await db.query('SELECT id FROM departments WHERE name = ?', [deptName]);
          if (dept.length > 0) {
            finalDeptId = dept[0].id;
          }
        }
      }

      if (!finalDeptId && deal[0].service_category_id) {
        const [cat] = await db.query('SELECT name, suggested_department_id FROM service_categories WHERE id = ?', [deal[0].service_category_id]);
        if (cat.length > 0) {
          finalDeptId = cat[0].suggested_department_id;

          // Also check department name to possibly set workflow_type
          if (finalDeptId) {
            const [dept] = await db.query('SELECT name FROM departments WHERE id = ?', [finalDeptId]);
            if (dept.length > 0) {
              if (dept[0].name.includes('IT')) finalWorkflowType = 'IT';
              if (dept[0].name.includes('Marketing')) finalWorkflowType = 'Marketing';
            }
          }
        }
      }

      // One client gets one project per department: when they bought several services, each
      // service deal folds into that same project (adding its own task checklist) instead of
      // spawning a duplicate project for the same client.
      let projectId = null;
      let reusedExisting = false;
      if (deal[0].company_id && finalDeptId) {
        const [existing] = await db.query(
          'SELECT id FROM projects WHERE company_id = ? AND department_id = ? ORDER BY id ASC LIMIT 1',
          [deal[0].company_id, finalDeptId]
        );
        if (existing.length > 0) {
          projectId = existing[0].id;
          reusedExisting = true;
        }
      }

      if (!reusedExisting) {
        const [projectResult] = await db.query(`
          INSERT INTO projects (name, deal_id, company_id, budget, status, start_date, end_date, workflow_type, department_id, created_by, created_at)
          VALUES (?, ?, ?, ?, 'Planning', ?, ?, ?, ?, ?, NOW())
        `, [name || deal[0].deal_name, dealId, deal[0].company_id, budget || deal[0].deal_value, start_date || null, end_date || null, finalWorkflowType, finalDeptId || null, userId]);

        projectId = projectResult.insertId;

        // Create department-specific project entry if needed
        if (finalWorkflowType === 'Marketing') {
          await db.query('INSERT INTO marketing_projects (project_id, status) VALUES (?, "Planning")', [projectId]);
        } else if (finalWorkflowType === 'IT') {
          await db.query('INSERT INTO it_projects (project_id, status) VALUES (?, "Backlog")', [projectId]);
        }
      } else {
        // Folding an extra service into an existing project - grow its budget by the new deal.
        await db.query(
          'UPDATE projects SET budget = COALESCE(budget, 0) + ?, updated_at = NOW() WHERE id = ?',
          [budget || deal[0].deal_value || 0, projectId]
        );
      }

      // Auto-generate the starter task checklist for every service on this deal
      // (a client can buy SEO + PPC + Social Media on one deal - each gets its own checklist).
      let serviceTypes = [];
      if (deal[0].services) {
        try {
          const parsed = typeof deal[0].services === 'string' ? JSON.parse(deal[0].services) : deal[0].services;
          if (Array.isArray(parsed)) serviceTypes = parsed.filter(Boolean);
        } catch (e) { /* fall back to the primary service category below */ }
      }
      if (serviceTypes.length === 0 && deal[0].service_category_id) {
        const [cat] = await db.query('SELECT name FROM service_categories WHERE id = ?', [deal[0].service_category_id]);
        if (cat.length > 0) serviceTypes = [cat[0].name];
      }
      await generateProjectTasks(db, projectId, { serviceTypes, departmentId: finalDeptId });

      await db.query('UPDATE deals SET status = "Project Created" WHERE id = ?', [dealId]);

      res.status(201).json({ success: true, projectId, mergedIntoExistingProject: reusedExisting });
    } catch (error) {
      responseError(res, 500, 'Failed to convert deal to project', error);
    }
  });

  // ─── PROJECT MILESTONES ───────────────────────────────────────────────
  // Auto-create table if not exists
  (async () => {
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS project_milestones (
          id INT AUTO_INCREMENT PRIMARY KEY,
          project_id INT NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          owner_id INT DEFAULT NULL,
          start_date DATE DEFAULT NULL,
          due_date DATE DEFAULT NULL,
          status ENUM('Not Started','In Progress','Completed','On Hold') DEFAULT 'Not Started',
          progress INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        )
      `);
    } catch (e) {
      console.error('Failed to create project_milestones table:', e.message);
    }
  })();

  // GET all milestones for a project
  app.get('/api/projects/:projectId/milestones', async (req, res) => {
    try {
      const { projectId } = req.params;
      const [rows] = await db.query(`
        SELECT pm.*,
          u.first_name AS owner_first_name,
          u.last_name AS owner_last_name,
          u.avatar AS owner_avatar,
          CONCAT(u.first_name, ' ', IFNULL(u.last_name, '')) AS owner_name
        FROM project_milestones pm
        LEFT JOIN users u ON u.id = pm.owner_id
        WHERE pm.project_id = ?
        ORDER BY pm.start_date ASC, pm.created_at ASC
      `, [projectId]);
      res.json(rows);
    } catch (error) {
      responseError(res, 500, 'Failed to fetch milestones', error);
    }
  });

  // POST create milestone
  app.post('/api/projects/:projectId/milestones', async (req, res) => {
    try {
      const { projectId } = req.params;
      const { title, description, owner_id, start_date, due_date, status, progress } = req.body;
      if (!title) return res.status(400).json({ error: 'Title is required' });
      const [result] = await db.query(
        'INSERT INTO project_milestones (project_id, title, description, owner_id, start_date, due_date, status, progress) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [projectId, title, description || null, owner_id || null, start_date || null, due_date || null, status || 'Not Started', progress || 0]
      );
      const [rows] = await db.query(`
        SELECT pm.*, u.first_name AS owner_first_name, u.last_name AS owner_last_name, u.avatar AS owner_avatar,
          CONCAT(u.first_name, ' ', IFNULL(u.last_name, '')) AS owner_name
        FROM project_milestones pm
        LEFT JOIN users u ON u.id = pm.owner_id
        WHERE pm.id = ?
      `, [result.insertId]);
      res.status(201).json(rows[0]);
    } catch (error) {
      responseError(res, 500, 'Failed to create milestone', error);
    }
  });

  // PUT update milestone
  app.put('/api/projects/:projectId/milestones/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { title, description, owner_id, start_date, due_date, status, progress } = req.body;
      await db.query(
        'UPDATE project_milestones SET title=?, description=?, owner_id=?, start_date=?, due_date=?, status=?, progress=? WHERE id=?',
        [title, description || null, owner_id || null, start_date || null, due_date || null, status || 'Not Started', progress || 0, id]
      );
      const [rows] = await db.query(`
        SELECT pm.*, u.first_name AS owner_first_name, u.last_name AS owner_last_name, u.avatar AS owner_avatar,
          CONCAT(u.first_name, ' ', IFNULL(u.last_name, '')) AS owner_name
        FROM project_milestones pm
        LEFT JOIN users u ON u.id = pm.owner_id
        WHERE pm.id = ?
      `, [id]);
      res.json(rows[0]);
    } catch (error) {
      responseError(res, 500, 'Failed to update milestone', error);
    }
  });

  // DELETE milestone
  app.delete('/api/projects/:projectId/milestones/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await db.query('DELETE FROM project_milestones WHERE id = ?', [id]);
      res.json({ success: true });
    } catch (error) {
      responseError(res, 500, 'Failed to delete milestone', error);
    }
  });

  // --- Project Discussions ---
  app.get('/api/projects/:projectId/discussions', async (req, res) => {
    try {
      const { projectId } = req.params;
      const [rows] = await db.query(
        `SELECT d.*, u.first_name, u.last_name, u.avatar 
         FROM project_discussions d 
         JOIN users u ON d.user_id = u.id 
         WHERE d.project_id = ? 
         ORDER BY d.created_at ASC`,
        [projectId]
      );
      res.json(rows);
    } catch (err) {
      console.error('Error fetching discussions:', err);
      res.status(500).json({ error: 'Failed to fetch discussions' });
    }
  });

  app.post('/api/projects/:projectId/discussions', async (req, res) => {
    try {
      const { projectId } = req.params;
      const { message, user_id } = req.body;
      
      const [result] = await db.query(
        'INSERT INTO project_discussions (project_id, user_id, message) VALUES (?, ?, ?)',
        [projectId, user_id || 1, message] // Default user_id to 1 if missing for now
      );
      
      const [newMsg] = await db.query(
        `SELECT d.*, u.first_name, u.last_name, u.avatar 
         FROM project_discussions d 
         JOIN users u ON d.user_id = u.id 
         WHERE d.id = ?`,
        [result.insertId]
      );
      
      // Log activity
      await db.query(
        'INSERT INTO project_activities (project_id, user_id, action, details) VALUES (?, ?, ?, ?)',
        [projectId, user_id || 1, 'Posted a message', message.substring(0, 50)]
      );

      res.status(201).json(newMsg[0]);
    } catch (err) {
      console.error('Error posting discussion:', err);
      res.status(500).json({ error: 'Failed to post discussion' });
    }
  });

  // --- Project Activity ---
  app.get('/api/projects/:projectId/activity', async (req, res) => {
    try {
      const { projectId } = req.params;
      const [rows] = await db.query(
        `SELECT a.*, u.first_name, u.last_name, u.avatar 
         FROM project_activities a 
         LEFT JOIN users u ON a.user_id = u.id 
         WHERE a.project_id = ? 
         ORDER BY a.created_at DESC`,
        [projectId]
      );
      res.json(rows);
    } catch (err) {
      console.error('Error fetching activity:', err);
      res.status(500).json({ error: 'Failed to fetch activity' });
    }
  });

};

module.exports = function setupActivitiesNotesRoutes(app, pool) {

  async function getConnection() {
    return pool.getConnection();
  }

  const responseError = (res, statusCode, message, error) => {
    console.error(`Error: ${message}`, error?.message || error);
    return res.status(statusCode).json({ error: message, details: error?.message || error });
  };

  app.post('/api/activities', async (req, res) => {
    let connection;
    try {
      let {
        activity_type, title, description, status, priority,
        contact_id, deal_id, project_id, company_id, lead_id, task_id,
        assigned_to, created_by, scheduled_date, duration_minutes, meeting_link, notes
      } = req.body;

      // Handle virtual deal ID from frontend (ID > 1000000 are leads)
      if (deal_id && parseInt(deal_id) > 1000000) {
        lead_id = parseInt(deal_id) - 1000000;
        deal_id = null;
      }

      connection = await getConnection();
      const [result] = await connection.query(`
        INSERT INTO activities (
          activity_type, title, description, status, priority,
          contact_id, deal_id, project_id, company_id, lead_id, task_id,
          assigned_to, created_by, scheduled_date, duration_minutes, meeting_link, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        activity_type || 'Note',
        title,
        description,
        status || 'Pending',
        priority || 'Medium',
        contact_id || null,
        deal_id || null,
        project_id || null,
        company_id || null,
        lead_id || null,
        task_id || null,
        assigned_to || null,
        created_by || null,
        scheduled_date || null,
        duration_minutes || null,
        meeting_link || null,
        notes || null
      ]);

      // Automation: Update Lead status to 'Contacted' if a call or meeting is logged
      if (lead_id && (activity_type === 'Call' || activity_type === 'Meeting' || activity_type === 'Message' || activity_type === 'Email')) {
        try {
          await connection.query(
            "UPDATE leads SET lead_status = 'Contacted', updated_at = NOW() WHERE id = ?",
            [lead_id]
          );
          console.log(`Lead ${lead_id} status updated to Contacted due to activity: ${activity_type}`);
        } catch (leadErr) {
          console.error('Failed to update lead status from activity:', leadErr.message);
        }
      }

      res.status(201).json({
        message: 'Activity created successfully',
        id: result.insertId
      });
    } catch (error) {
      responseError(res, 500, 'Failed to create activity', error);
    } finally {
      if (connection) connection.release();
    }
  });

  app.get('/api/activities', async (req, res) => {
    let connection;
    try {
      const { contact_id, deal_id, project_id, company_id, lead_id, task_id, type } = req.query;
      connection = await getConnection();

      let query = `
        SELECT a.*, 
               c.first_name as contact_name, 
               d.deal_name, 
               p.name as project_name,
               co.company_name,
               l.lead_name,
               t.title as task_name,
               u1.first_name as assigned_to_name,
               u2.first_name as created_by_name
        FROM activities a
        LEFT JOIN contacts c ON a.contact_id = c.id
        LEFT JOIN deals d ON a.deal_id = d.id
        LEFT JOIN projects p ON a.project_id = p.id
        LEFT JOIN companies co ON a.company_id = co.id
        LEFT JOIN leads l ON a.lead_id = l.id
        LEFT JOIN general_tasks t ON a.task_id = t.id
        LEFT JOIN users u1 ON a.assigned_to = u1.id
        LEFT JOIN users u2 ON a.created_by = u2.id
        WHERE 1=1
      `;
      const params = [];

      if (contact_id) {
        query += ' AND a.contact_id = ?';
        params.push(contact_id);
      }
      if (deal_id) {
        if (parseInt(deal_id) > 1000000) {
          query += ' AND (a.lead_id = ? OR a.deal_id = ?)';
          params.push(parseInt(deal_id) - 1000000, deal_id);
        } else {
          query += ' AND a.deal_id = ?';
          params.push(deal_id);
        }
      }
      if (project_id) {
        query += ' AND a.project_id = ?';
        params.push(project_id);
      }
      if (company_id) {
        query += ' AND a.company_id = ?';
        params.push(company_id);
      }
      if (lead_id) {
        query += ' AND a.lead_id = ?';
        params.push(lead_id);
      }
      if (task_id) {
        query += ' AND a.task_id = ?';
        params.push(task_id);
      }
      if (type) {
        query += ' AND a.activity_type = ?';
        params.push(type);
      }

      query += ' ORDER BY a.created_at DESC LIMIT 100';

      const [activities] = await connection.query(query, params);
      res.json(activities);
    } catch (error) {
      responseError(res, 500, 'Failed to fetch activities', error);
    } finally {
      if (connection) connection.release();
    }
  });

  app.put('/api/activities/:id', async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      const { status, description, completed_date, notes } = req.body;

      connection = await getConnection();
      await connection.query(`
        UPDATE activities 
        SET status = ?, description = ?, completed_date = ?, notes = ?, updated_at = NOW()
        WHERE id = ?
      `, [status || null, description || null, completed_date || null, notes || null, id]);

      // Automation: Update Lead status to 'Contacted' if status is Completed
      if (status === 'Completed') {
        try {
          const [activity] = await connection.query("SELECT lead_id, activity_type FROM activities WHERE id = ?", [id]);
          if (activity.length > 0 && activity[0].lead_id && (activity[0].activity_type === 'Call' || activity[0].activity_type === 'Meeting' || activity[0].activity_type === 'Message' || activity[0].activity_type === 'Email')) {
            await connection.query(
              "UPDATE leads SET lead_status = 'Contacted', updated_at = NOW() WHERE id = ?",
              [activity[0].lead_id]
            );
            console.log(`Lead ${activity[0].lead_id} status updated to Contacted due to activity completion`);
          }
        } catch (leadErr) {
          console.error('Failed to update lead status from activity completion:', leadErr.message);
        }
      }

      res.json({ message: 'Activity updated successfully' });
    } catch (error) {
      responseError(res, 500, 'Failed to update activity', error);
    } finally {
      if (connection) connection.release();
    }
  });

  app.delete('/api/activities/:id', async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      connection = await getConnection();
      await connection.query('DELETE FROM activities WHERE id = ?', [id]);
      res.json({ message: 'Activity deleted successfully' });
    } catch (error) {
      responseError(res, 500, 'Failed to delete activity', error);
    } finally {
      if (connection) connection.release();
    }
  });

  app.post('/api/notes', async (req, res) => {
    let connection;
    try {
      const { title, description, contact_id, company_id, deal_id, project_id, lead_id, task_id, priority, is_important, created_by } = req.body;

      if (!title || !description) {
        return res.status(400).json({ error: 'Title and description are required' });
      }

      connection = await getConnection();
      const [result] = await connection.query(`
        INSERT INTO entity_notes (title, description, contact_id, company_id, deal_id, project_id, lead_id, task_id, priority, is_important, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [title, description, contact_id || null, company_id || null, deal_id || null, project_id || null, lead_id || null, task_id || null, priority || 'Medium', is_important || false, created_by || null]);

      res.status(201).json({
        message: 'Note created successfully',
        id: result.insertId
      });
    } catch (error) {
      responseError(res, 500, 'Failed to create note', error);
    } finally {
      if (connection) connection.release();
    }
  });

  app.get('/api/notes', async (req, res) => {
    let connection;
    try {
      const { contact_id, deal_id, project_id, company_id, lead_id, task_id } = req.query;
      connection = await getConnection();

      // Combined query to fetch from both entity_notes and followups (remarks)
      let query = `
        (SELECT n.id, 
               n.title COLLATE utf8mb4_unicode_ci as title, 
               n.description COLLATE utf8mb4_unicode_ci as description, 
               n.contact_id, n.company_id, n.deal_id, n.project_id, n.lead_id, n.task_id, 
               n.priority COLLATE utf8mb4_unicode_ci as priority, 
               n.is_important, n.created_by, n.created_at, n.updated_at,
               c.first_name COLLATE utf8mb4_unicode_ci as contact_name, 
               d.deal_name COLLATE utf8mb4_unicode_ci as deal_name, 
               p.name COLLATE utf8mb4_unicode_ci as project_name, 
               co.company_name COLLATE utf8mb4_unicode_ci as company_name, 
               l.lead_name COLLATE utf8mb4_unicode_ci as lead_name, 
               t.title COLLATE utf8mb4_unicode_ci as task_name,
               u.first_name COLLATE utf8mb4_unicode_ci as created_by_name, 
               CAST('entity_note' AS CHAR) COLLATE utf8mb4_unicode_ci as source
        FROM entity_notes n
        LEFT JOIN contacts c ON n.contact_id = c.id
        LEFT JOIN deals d ON n.deal_id = d.id
        LEFT JOIN projects p ON n.project_id = p.id
        LEFT JOIN companies co ON n.company_id = co.id
        LEFT JOIN leads l ON n.lead_id = l.id
        LEFT JOIN general_tasks t ON n.task_id = t.id
        LEFT JOIN users u ON n.created_by = u.id
        WHERE 1=1
      `;
      const params = [];

      if (contact_id) {
        query += ' AND n.contact_id = ?';
        params.push(contact_id);
      }
      if (deal_id) {
        query += ' AND n.deal_id = ?';
        params.push(deal_id);
      }
      if (project_id) {
        query += ' AND n.project_id = ?';
        params.push(project_id);
      }
      if (company_id) {
        query += ' AND n.company_id = ?';
        params.push(company_id);
      }
      if (lead_id) {
        query += ' AND n.lead_id = ?';
        params.push(lead_id);
      }
      if (task_id) {
        query += ' AND n.task_id = ?';
        params.push(task_id);
      }
      query += ')';

      // Add UNION with followups that have remarks
      query += `
        UNION ALL
        (SELECT f.id, 
               CONCAT(f.type, ' Remarks') COLLATE utf8mb4_unicode_ci as title, 
               f.remarks COLLATE utf8mb4_unicode_ci as description, 
               f.contact_id, NULL as company_id, f.deal_id, NULL as project_id, f.lead_id, NULL as task_id,
               f.priority COLLATE utf8mb4_unicode_ci as priority, 
               0 as is_important, f.assigned_to as created_by, f.created_at, f.updated_at,
               NULL as contact_name, NULL as deal_name, NULL as project_name, NULL as company_name, NULL as lead_name, NULL as task_name,
               f.assigned_to_name COLLATE utf8mb4_unicode_ci as created_by_name, 
               CAST('followup' AS CHAR) COLLATE utf8mb4_unicode_ci as source
        FROM followups f
        WHERE f.remarks IS NOT NULL AND f.remarks != ''
      `;
      
      const followupParams = [];
      if (contact_id) {
        query += " AND (f.contact_id = ? OR (f.related_id = ? AND f.related_type = 'Customer'))";
        followupParams.push(contact_id, contact_id);
      }
      if (deal_id) {
        query += " AND (f.deal_id = ? OR (f.related_id = ? AND f.related_type = 'Deal'))";
        followupParams.push(deal_id, deal_id);
      }
      if (lead_id) {
        query += " AND (f.lead_id = ? OR (f.related_id = ? AND f.related_type = 'Lead'))";
        followupParams.push(lead_id, lead_id);
      }
      
      query += ') ORDER BY is_important DESC, created_at DESC LIMIT 100';

      const [notes] = await connection.query(query, [...params, ...followupParams]);
      res.json(notes);
    } catch (error) {
      responseError(res, 500, 'Failed to fetch notes', error);
    } finally {
      if (connection) connection.release();
    }
  });

  app.delete('/api/notes/:id', async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      connection = await getConnection();
      await connection.query('DELETE FROM entity_notes WHERE id = ?', [id]);
      res.json({ message: 'Note deleted successfully' });
    } catch (error) {
      responseError(res, 500, 'Failed to delete note', error);
    } finally {
      if (connection) connection.release();
    }
  });

  app.get('/api/activities/unified-feed', async (req, res) => {
    let connection;
    try {
      const { type = null, limit = 500, lead_id, contact_id, company_id, deal_id, project_id, task_id } = req.query;
      connection = await getConnection();

      const allActivities = [];

      // Helper to build where clause with linked task support
      const buildUnifiedWhere = (tablePrefix, filters) => {
        const { lead_id, contact_id, company_id, deal_id, project_id, task_id } = filters;
        let conditions = ['1=1'];
        let params = [];

        if (task_id) {
          conditions.push(`${tablePrefix}.task_id = ?`);
          params.push(task_id);
        } else {
          // If filtering by an entity, we want items linked directly OR via a task linked to that entity
          let entityCol = null;
          let entityType = null;
          let entityId = null;

          if (lead_id) { entityCol = 'lead_id'; entityType = 'Lead'; entityId = lead_id; }
          else if (deal_id) { entityCol = 'deal_id'; entityType = 'Deal'; entityId = deal_id; }
          else if (project_id) { entityCol = 'project_id'; entityType = 'Project'; entityId = project_id; }
          else if (company_id) { entityCol = 'company_id'; entityType = 'Company'; entityId = company_id; }
          else if (contact_id) { entityCol = 'contact_id'; entityType = 'Contact'; entityId = contact_id; }

          if (entityCol) {
            conditions.push(`(${tablePrefix}.${entityCol} = ? OR ${tablePrefix}.task_id IN (SELECT id FROM general_tasks WHERE linked_type = ? AND linked_id = ?))`);
            params.push(entityId, entityType, entityId);
          }
        }
        
        return { 
          clause: conditions.length > 1 ? `WHERE ${conditions.join(' AND ')}` : 'WHERE 1=1',
          params 
        };
      };

      console.log('Starting block');
try {
const { clause, params } = buildUnifiedWhere('a', { lead_id, contact_id, company_id, deal_id, project_id, task_id });
        const activitiesQuery = `
          SELECT 'Activity' as activity_source, a.id, a.activity_type as type, a.title,
                 a.description, a.status, a.priority, a.created_at, a.scheduled_date, a.scheduled_time, a.meeting_link,
                 COALESCE(c.first_name, '') as contact_name, COALESCE(co.company_name, '') as company_name,
                 COALESCE(d.deal_name, '') as deal_name, COALESCE(p.name, '') as project_name,
                 COALESCE(l.lead_name, '') as lead_name,
                 COALESCE(u1.first_name, '') as assigned_to_name, COALESCE(u2.first_name, '') as created_by_name,
                 a.contact_id, a.company_id, a.deal_id, a.project_id, a.lead_id, a.task_id
          FROM activities a
          LEFT JOIN contacts c ON a.contact_id = c.id
          LEFT JOIN companies co ON a.company_id = co.id
          LEFT JOIN deals d ON a.deal_id = d.id
          LEFT JOIN projects p ON a.project_id = p.id
          LEFT JOIN leads l ON a.lead_id = l.id
          LEFT JOIN users u1 ON a.assigned_to = u1.id
          LEFT JOIN users u2 ON a.created_by = u2.id
          ${clause}
          ORDER BY a.created_at DESC LIMIT ${parseInt(limit)}
        `;

        const [activities] = await connection.query(activitiesQuery, params);
        allActivities.push(...activities.map(a => ({
          ...a,
          icon: a.type === 'Meeting' ? 'Calendar' : (a.type === 'Task' ? 'CheckSquare' : 'Activity'),
          color: a.type === 'Meeting' ? 'blue' : (a.type === 'Task' ? 'red' : 'green')
        })));
      } catch (e) {
        console.warn('⚠️ Activities query failed:', e.message);
      }

      // Add Notes to the feed
      console.log('Starting block');
try {
const { clause, params } = buildUnifiedWhere('n', { lead_id, contact_id, company_id, deal_id, project_id, task_id });
        const notesQuery = `
          SELECT 'Note' as activity_source, n.id, 'Note' as type, n.title,
                 n.description, 'Completed' as status, n.priority, n.created_at, n.created_at as scheduled_date,
                 COALESCE(c.first_name, '') as contact_name, COALESCE(co.company_name, '') as company_name,
                 COALESCE(d.deal_name, '') as deal_name, COALESCE(p.name, '') as project_name,
                 COALESCE(l.lead_name, '') as lead_name,
                 '' as assigned_to_name, COALESCE(u.first_name, '') as created_by_name,
                 n.contact_id, n.company_id, n.deal_id, n.project_id, n.lead_id, n.task_id
          FROM entity_notes n
          LEFT JOIN contacts c ON n.contact_id = c.id
          LEFT JOIN companies co ON n.company_id = co.id
          LEFT JOIN deals d ON n.deal_id = d.id
          LEFT JOIN projects p ON n.project_id = p.id
          LEFT JOIN leads l ON n.lead_id = l.id
          LEFT JOIN users u ON n.created_by = u.id
          ${clause}
          ORDER BY n.created_at DESC LIMIT ${parseInt(limit)}
        `;

        const [notes] = await connection.query(notesQuery, params);
        allActivities.push(...notes.map(n => ({
          ...n,
          icon: 'MessageSquare',
          color: 'amber'
        })));
      } catch (e) {
        console.warn('⚠️ Notes query failed:', e.message);
      }

      // Add Followups to the feed
      console.log('Starting block');
try {
const { clause, params } = buildUnifiedWhere('f', { lead_id, contact_id, company_id, deal_id, project_id, task_id });
        const followupsQuery = `
          SELECT 'Followup' as activity_source, f.id, f.type, f.subject as title,
                 COALESCE(f.remarks, f.description) as description, f.status, f.priority, f.created_at, f.scheduled_date, f.scheduled_time, f.meeting_link,
                 COALESCE(c.first_name, '') as contact_name, '' as company_name,
                 COALESCE(d.deal_name, '') as deal_name, '' as project_name,
                 COALESCE(l.lead_name, '') as lead_name,
                 COALESCE(f.assigned_to_name, '') as assigned_to_name, COALESCE(f.assigned_to_name, '') as created_by_name,
                 f.contact_id, NULL as company_id, f.deal_id, NULL as project_id, f.lead_id, f.task_id
          FROM followups f
          LEFT JOIN contacts c ON f.contact_id = c.id
          LEFT JOIN deals d ON f.deal_id = d.id
          LEFT JOIN leads l ON f.lead_id = l.id
          ${clause}
          ORDER BY f.created_at DESC LIMIT ${parseInt(limit)}
        `;

        const [followups] = await connection.query(followupsQuery, params);
        allActivities.push(...followups.map(f => ({
          ...f,
          icon: f.type === 'Call' ? 'Phone' : (f.type === 'Email' ? 'Mail' : 'RotateCcw'),
          color: f.status === 'Completed' ? 'green' : 'blue'
        })));
      } catch (e) {
        console.warn('⚠️ Followups query failed:', e.message);
      }

      try {
        // For Contacts, only filter by ID if contact_id is provided, or other filters if relevant
        // But usually when filtering feed for a specific lead, we don't want to see "Contact Created" unless it's THAT contact?
        // Actually, most of these table creation events should probably only show up if no specific filter is active, 
        // OR if the filter matches the ID of the created entity.
        
        let shouldInclude = true;
        let queryParams = [];
        let queryStr = `
          SELECT 'Contact' as activity_source, id, 'Contact Created' as type,
                 CONCAT(first_name, ' ', last_name) as title, email as description,
                 'Active' as status, 'Medium' as priority, created_at, created_at as scheduled_date,
                 CONCAT(first_name, ' ', last_name) as contact_name, '' as company_name, 
                 '' as deal_name, '' as project_name, '' as assigned_to_name, '' as created_by_name,
                 id as contact_id, null as company_id, null as deal_id, null as project_id, null as lead_id
          FROM contacts
        `;

        if (contact_id) {
          queryStr += ' WHERE id = ?';
          queryParams.push(contact_id);
        } else if (lead_id || company_id || deal_id || project_id) {
          // If filtering by something else, a "Contact Created" event might not be relevant unless linked
          // For simplicity, we skip these entity creation events if filtering by a DIFFERENT entity type
          shouldInclude = false;
        }

        if (shouldInclude) {
          queryStr += ` ORDER BY created_at DESC LIMIT ${parseInt(limit)}`;
          const [contacts] = await connection.query(queryStr, queryParams);
          allActivities.push(...contacts.map(c => ({
            ...c,
            icon: 'User',
            color: 'purple'
          })));
        }
      } catch (e) {
        console.warn('⚠️ Contacts query failed:', e.message);
      }

      try {
        let shouldInclude = true;
        let queryParams = [];
        let queryStr = `
          SELECT 'Company' as activity_source, id, 'Company Created' as type, company_name as title,
                 industry as description, status as status, 'Medium' as priority, 
                 created_at, created_at as scheduled_date, '' as contact_name, company_name,
                 '' as deal_name, '' as project_name, '' as assigned_to_name, '' as created_by_name,
                 null as contact_id, id as company_id, null as deal_id, null as project_id, null as lead_id
          FROM companies
        `;

        if (company_id) {
          queryStr += ' WHERE id = ?';
          queryParams.push(company_id);
        } else if (lead_id || contact_id || deal_id || project_id) {
          shouldInclude = false;
        }

        if (shouldInclude) {
          queryStr += ` ORDER BY created_at DESC LIMIT ${parseInt(limit)}`;
          const [companies] = await connection.query(queryStr, queryParams);
          allActivities.push(...companies.map(c => ({
            ...c,
            icon: 'Building2',
            color: 'orange'
          })));
        }
      } catch (e) {
        console.warn('⚠️ Companies query failed:', e.message);
      }

      try {
        let queryParams = [];
        let queryStr = `
          SELECT 'Deal' as activity_source, id, 'Deal Created' as type, deal_name as title,
                 COALESCE(description, deal_stage) as description, status, 'Medium' as priority, created_at,
                 created_at as scheduled_date, '' as contact_name, '' as company_name,
                 deal_name, '' as project_name, '' as assigned_to_name, '' as created_by_name,
                 null as contact_id, null as company_id, id as deal_id, null as project_id, null as lead_id
          FROM deals
        `;

        let conditions = [];
        if (deal_id) {
          conditions.push('id = ?');
          queryParams.push(deal_id);
        } else if (company_id) {
          // deals might have company_id
          // conditions.push('company_id = ?');
          // queryParams.push(company_id);
        } else if (lead_id || contact_id || project_id) {
          // skip
        }

        if (deal_id || (!lead_id && !contact_id && !company_id && !project_id)) {
          if (conditions.length > 0) queryStr += ' WHERE ' + conditions.join(' AND ');
          queryStr += ` ORDER BY created_at DESC LIMIT ${parseInt(limit)}`;
          const [deals] = await connection.query(queryStr, queryParams);
          allActivities.push(...deals.map(d => ({
            ...d,
            icon: 'TrendingUp',
            color: 'red'
          })));
        }
      } catch (e) {
        console.warn('⚠️ Deals query failed:', e.message);
      }

      try {
        let queryParams = [];
        let queryStr = `
          SELECT 'Task' as activity_source, id, 'Task Created' as type, title as title,
                 description, status, priority, created_at, created_at as scheduled_date,
                 '' as contact_name, '' as company_name, '' as deal_name, '' as project_name,
                 '' as assigned_to_name, '' as created_by_name,
                 null as contact_id, null as company_id, linked_id as deal_id, 
                 linked_id as project_id, linked_id as lead_id, id as task_id,
                 linked_type
          FROM general_tasks
        `;

        let conditions = [];
        if (task_id) {
          conditions.push('id = ?');
          queryParams.push(task_id);
        } else if (lead_id) {
          conditions.push('linked_type = "Lead" AND linked_id = ?');
          queryParams.push(lead_id);
        } else if (deal_id) {
          conditions.push('linked_type = "Deal" AND linked_id = ?');
          queryParams.push(deal_id);
        } else if (project_id) {
          conditions.push('linked_type = "Project" AND linked_id = ?');
          queryParams.push(project_id);
        }

        if (task_id || lead_id || deal_id || project_id || (!contact_id && !company_id)) {
          if (conditions.length > 0) queryStr += ' WHERE ' + conditions.join(' AND ');
          queryStr += ` ORDER BY created_at DESC LIMIT ${parseInt(limit)}`;
          const [tasks] = await connection.query(queryStr, queryParams);
          allActivities.push(...tasks.map(t => ({
            ...t,
            icon: 'CheckCircle',
            color: 'blue'
          })));
        }
      } catch (e) {
        console.warn('⚠️ Tasks query failed:', e.message);
      }

      try {
        let queryParams = [];
        let queryStr = `
          SELECT 'Lead' as activity_source, id, 'Lead Created' as type, 
                 lead_name as title, email as description,
                 lead_status as status, 'Medium' as priority, created_at, created_at as scheduled_date,
                 '' as contact_name, company as company_name, '' as deal_name, '' as project_name,
                 '' as assigned_to_name, '' as created_by_name,
                 null as contact_id, null as company_id, null as deal_id, null as project_id, id as lead_id,
                 null as task_id
          FROM leads
        `;

        if (lead_id) {
          queryStr += ' WHERE id = ?';
          queryParams.push(lead_id);
        }

        if (lead_id || (!contact_id && !company_id && !deal_id && !project_id)) {
          queryStr += ` ORDER BY created_at DESC LIMIT ${parseInt(limit)}`;
          const [leads] = await connection.query(queryStr, queryParams);
          allActivities.push(...leads.map(l => ({
            ...l,
            icon: 'Star',
            color: 'indigo'
          })));
        }
      } catch (e) {
        console.warn('⚠️ Leads query failed:', e.message);
      }

      try {
        let queryParams = [];
        let queryStr = `
          SELECT 'Proposal' as activity_source, id, 'Proposal Sent' as type, title as title,
                 description, status, 'High' as priority,
                 created_at, created_at as scheduled_date, '' as contact_name, '' as company_name,
                 '' as deal_name, '' as project_name, '' as assigned_to_name, '' as created_by_name,
                 null as contact_id, null as company_id, null as deal_id, null as project_id, null as lead_id
          FROM proposals
        `;

        if (deal_id) {
          // queryStr += ' WHERE deal_id = ?';
          // queryParams.push(deal_id);
        }

        if (!lead_id && !contact_id && !company_id && !deal_id && !project_id) {
          queryStr += ` ORDER BY created_at DESC LIMIT ${parseInt(limit)}`;
          const [proposals] = await connection.query(queryStr, queryParams);
          allActivities.push(...proposals.map(p => ({
            ...p,
            icon: 'FileText',
            color: 'cyan'
          })));
        }
      } catch (e) {
        console.warn('⚠️ Proposals table query failed:', e.message);
      }

      try {
        let queryStr = `
          SELECT 'Invoice' as activity_source, id, 'Invoice Created' as type, invoice_number as title,
                 COALESCE(description, notes) as description, status, 'High' as priority,
                 created_at, created_at as scheduled_date, '' as contact_name, '' as company_name,
                 '' as deal_name, '' as project_name, '' as assigned_to_name, '' as created_by_name,
                 null as contact_id, null as company_id, null as deal_id, null as project_id, null as lead_id
          FROM invoices
        `;

        if (!lead_id && !contact_id && !company_id && !deal_id && !project_id) {
          queryStr += ` ORDER BY created_at DESC LIMIT ${parseInt(limit)}`;
          const [invoices] = await connection.query(queryStr);
          allActivities.push(...invoices.map(i => ({
            ...i,
            icon: 'Receipt',
            color: 'green'
          })));
        }
      } catch (e) {
        console.warn('⚠️ Invoices table query failed:', e.message);
      }

      console.log('Starting block');
try {
const { clause, params } = buildUnifiedWhere('f', { lead_id, contact_id, company_id, deal_id, project_id, task_id });
        const followupsQuery = `
          SELECT 'Activity' as activity_source, f.id, f.type, f.subject as title,
                 f.description, f.status, f.priority, f.created_at, f.scheduled_date, f.scheduled_time, f.meeting_link,
                 '' as contact_name, '' as company_name,
                 '' as deal_name, '' as project_name,
                 COALESCE(f.assigned_to_name, '') as assigned_to_name, '' as created_by_name,
                 f.contact_id, null as company_id, f.deal_id, null as project_id, f.lead_id, f.task_id
          FROM followups f
          ${clause}
          ORDER BY f.created_at DESC LIMIT ${parseInt(limit)}
        `;

        const [followups] = await connection.query(followupsQuery, params);
        allActivities.push(...followups.map(f => ({
          ...f,
          icon: f.type === 'Call' ? 'Phone' : (f.type.includes('Meeting') ? 'Calendar' : 'Activity'),
          color: f.type === 'Call' ? 'teal' : (f.type.includes('Meeting') ? 'blue' : 'green')
        })));
      } catch (e) {
        console.warn('⚠️ Follow-ups query failed:', e.message);
      }

      allActivities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      if (type && type !== 'null') {
        const filtered = allActivities.filter(a => a.type === type || a.activity_source === type);
        res.json(filtered.slice(0, parseInt(limit)));
      } else {
        res.json(allActivities.slice(0, parseInt(limit)));
      }
    } catch (error) {
      responseError(res, 500, 'Failed to fetch unified activity feed', error);
    } finally {
      if (connection) connection.release();
    }
  });

};

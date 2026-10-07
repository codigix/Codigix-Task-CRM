const { resolveDealForLead } = require('../middleware/helpers');

module.exports = function setupLeadsDealsRolesRoutes(app, pool) {
  // Use pool.query directly for better connection management
  const db = {
    query: (sql, params) => pool.query(sql, params)
  };

  app.get('/api/leads', async (req, res) => {
    try {
      const { status, source, owner_id, skip = 0, limit = 50, user_id, role, department } = req.query;
      
      let query = `SELECT 
        l.*,
        u.first_name AS owner_first_name,
        u.last_name AS owner_last_name
      FROM leads l
      LEFT JOIN users u ON u.id = l.owner_id
      LEFT JOIN service_categories sc ON l.service_category_id = sc.id
      LEFT JOIN departments d ON sc.suggested_department_id = d.id
      WHERE 1=1`;
      const params = [];

      // Filter by role/department
      if (role && role !== 'Admin' && role !== 'Super Admin') {
         if (role.includes('Manager')) {
             if (department) {
                 query += ` AND (d.name = ? OR d.name IS NULL) `;
                 params.push(department);
             }
         } else {
             query += ` AND l.owner_id = ? `;
             params.push(user_id);
         }
      }
      
      if (status) {
        query += ' AND l.lead_status = ?';
        params.push(status);
      }
      if (source) {
        query += ' AND l.lead_source = ?';
        params.push(source);
      }
      if (owner_id) {
        query += ' AND l.owner_id = ?';
        params.push(owner_id);
      }
      
      query += ' ORDER BY l.created_at DESC LIMIT ?, ?';
      params.push(parseInt(skip), parseInt(limit));
      
      const [leads] = await db.query(query, params);
      
      return res.json(leads);
    } catch (err) {
      console.error('Error fetching leads:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/leads', async (req, res) => {
    try {
      const { 
        lead_name, 
        project_name,
        referral_name,
        referral_contact,
        name,
        email, 
        phone, 
        company, 
        company_name,
        lead_source, 
        source, 
        lead_status,
        status, 
        notes, 
        description,
        value,
        company_id,
        currency,
        rating,
        lead_type,
        industry,
        business_type,
        marketing_services,
        it_services,
        visibility,
        tags,
        owner_id,
        people_assigned,
        service_category_id,
        created_by 
      } = req.body;
      
      const finalLeadName = lead_name || name;
      if (!finalLeadName) {
        return res.status(400).json({ error: 'Lead name required' });
      }
      
      const [result] = await db.query(
        `INSERT INTO leads (lead_name, project_name, referral_name, referral_contact, email, phone, company, company_id, lead_source, lead_status, notes, value, currency, rating, lead_type, industry, business_type, marketing_services, it_services, visibility, tags, owner_id, people_assigned, service_category_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          finalLeadName,
          project_name || null,
          referral_name || null,
          referral_contact || null,
          email || null,
          phone || null,
          company || company_name || null,
          company_id || null,
          lead_source || source || 'Website',
          lead_status || status || 'New',
          notes || description || null,
          value || null,
          currency || 'USD',
          rating || 5,
          lead_type || null,
          industry || null,
          business_type || null,
          marketing_services ? JSON.stringify(marketing_services) : null,
          it_services || null,
          visibility || 'Public',
          tags ? JSON.stringify(tags) : null,
          owner_id || null,
          people_assigned ? JSON.stringify(people_assigned) : null,
          service_category_id || null
        ]
      );
      
      const [lead] = await db.query('SELECT * FROM leads WHERE id = ?', [result.insertId]);
      
      return res.status(201).json(lead[0]);
    } catch (err) {
      console.error('Error creating lead:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/leads/:id', async (req, res) => {
    try {
      const [leads] = await db.query(`
        SELECT l.*, u.first_name AS owner_first_name, u.last_name AS owner_last_name 
        FROM leads l 
        LEFT JOIN users u ON l.owner_id = u.id 
        WHERE l.id = ?
      `, [req.params.id]);
      
      if (!leads.length) return res.status(404).json({ error: 'Lead not found' });
      return res.json(leads[0]);
    } catch (err) {
      console.error('Error fetching lead:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/leads/:id', async (req, res) => {
    try {
      const { 
        lead_name, 
        project_name,
        referral_name,
        referral_contact,
        name,
        email, 
        phone, 
        company, 
        company_name,
        lead_source, 
        source, 
        lead_status,
        status, 
        notes, 
        description,
        value,
        company_id,
        currency,
        rating,
        lead_type,
        industry,
        business_type,
        marketing_services,
        it_services,
        visibility,
        tags,
        owner_id,
        people_assigned,
        service_category_id
      } = req.body;
      
      const updateFields = [];
      const params = [];
      
      if (lead_name !== undefined || name !== undefined) { 
        updateFields.push('lead_name = ?'); 
        params.push(lead_name || name); 
      }
      if (project_name !== undefined) { updateFields.push('project_name = ?'); params.push(project_name); }
      if (referral_name !== undefined) { updateFields.push('referral_name = ?'); params.push(referral_name); }
      if (referral_contact !== undefined) { updateFields.push('referral_contact = ?'); params.push(referral_contact); }
      if (email !== undefined) { updateFields.push('email = ?'); params.push(email); }
      if (phone !== undefined) { updateFields.push('phone = ?'); params.push(phone); }
      if (company !== undefined || company_name !== undefined) { 
        updateFields.push('company = ?'); 
        params.push(company || company_name); 
      }
      if (lead_source !== undefined || source !== undefined) { 
        updateFields.push('lead_source = ?'); 
        params.push(lead_source || source); 
      }
      if (lead_status !== undefined || status !== undefined) { 
        updateFields.push('lead_status = ?'); 
        params.push(lead_status || status); 
      }
      if (notes !== undefined || description !== undefined) { 
        updateFields.push('notes = ?'); 
        params.push(notes || description); 
      }
      if (value !== undefined) { updateFields.push('value = ?'); params.push(value); }
      if (company_id !== undefined) { updateFields.push('company_id = ?'); params.push(company_id); }
      if (currency !== undefined) { updateFields.push('currency = ?'); params.push(currency); }
      if (rating !== undefined) { updateFields.push('rating = ?'); params.push(rating); }
      if (lead_type !== undefined) { updateFields.push('lead_type = ?'); params.push(lead_type); }
      if (industry !== undefined) { updateFields.push('industry = ?'); params.push(industry); }
      if (business_type !== undefined) { updateFields.push('business_type = ?'); params.push(business_type); }
      if (marketing_services !== undefined) { 
        updateFields.push('marketing_services = ?'); 
        params.push(marketing_services ? JSON.stringify(marketing_services) : null); 
      }
      if (it_services !== undefined) { updateFields.push('it_services = ?'); params.push(it_services); }
      if (visibility !== undefined) { updateFields.push('visibility = ?'); params.push(visibility); }
      if (tags !== undefined) { 
        updateFields.push('tags = ?'); 
        params.push(tags ? JSON.stringify(tags) : null); 
      }
      if (owner_id !== undefined) { updateFields.push('owner_id = ?'); params.push(owner_id); }
      if (people_assigned !== undefined) { 
        updateFields.push('people_assigned = ?'); 
        params.push(people_assigned ? JSON.stringify(people_assigned) : null); 
      }
      if (service_category_id !== undefined) { updateFields.push('service_category_id = ?'); params.push(service_category_id); }
      
      if (!updateFields.length) return res.status(400).json({ error: 'No fields to update' });
      
      updateFields.push('updated_at = NOW()');
      params.push(req.params.id);
      
      await db.query(`UPDATE leads SET ${updateFields.join(', ')} WHERE id = ?`, params);
      const [lead] = await db.query('SELECT * FROM leads WHERE id = ?', [req.params.id]);
      
      return res.json(lead[0]);
    } catch (err) {
      console.error('Error updating lead:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/leads/:id', async (req, res) => {
    try {
      const [result] = await db.query('DELETE FROM leads WHERE id = ?', [req.params.id]);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Lead not found' });
      }
      
      return res.json({ success: true, message: 'Lead deleted successfully' });
    } catch (err) {
      console.error('Error deleting lead:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  /**
   * Converts a lead into a deal. Used by Lead Details ("Qualified"), the Deals pipeline
   * (dragging a lead into a stage) and Follow-ups ("Quotation Accepted & Converted to Deal").
   *
   * - Converting twice returns the existing deal instead of creating a duplicate.
   * - Name and value default to the lead's own; a value of 0 is allowed.
   * - The deal's company is the one chosen, else the lead's company (matched by name or
   *   created from it). It is never borrowed from an unrelated client.
   */
  const convertLeadToDeal = async (req, res) => {
    const leadId = req.params.id;
    const body = req.body || {};
    let conn;
    try {
      conn = await pool.getConnection();
      await conn.beginTransaction();

      const [[lead]] = await conn.query('SELECT * FROM leads WHERE id = ? FOR UPDATE', [leadId]);
      if (!lead) {
        await conn.rollback();
        return res.status(404).json({ success: false, error: 'Lead not found' });
      }

      if (lead.converted_deal_id) {
        const [[existing]] = await conn.query('SELECT * FROM deals WHERE id = ?', [lead.converted_deal_id]);
        if (existing) {
          await conn.rollback();
          return res.status(200).json({
            success: true,
            alreadyConverted: true,
            message: `Lead "${lead.lead_name}" was already converted`,
            deal: existing,
            leadId
          });
        }
      }

      const dealName = String(body.deal_name || lead.project_name || lead.lead_name || '').trim();
      if (!dealName) {
        await conn.rollback();
        return res.status(400).json({ success: false, error: 'Deal name is required' });
      }
      const rawValue = body.deal_value !== undefined && body.deal_value !== '' ? body.deal_value : lead.value;
      const dealValue = Number(rawValue) || 0;
      if (dealValue < 0) {
        await conn.rollback();
        return res.status(400).json({ success: false, error: 'Deal value cannot be negative' });
      }

      // Company: explicit choice → lead's linked company → lead's company name (reuse an
      // existing company of that name, else create it) → none.
      let companyId = body.company_id || lead.company_id || lead.converted_company_id || null;
      if (!companyId && lead.company && String(lead.company).trim()) {
        const name = String(lead.company).trim();
        const [[match]] = await conn.query('SELECT id FROM companies WHERE company_name = ? LIMIT 1', [name]);
        if (match) {
          companyId = match.id;
        } else {
          const [ins] = await conn.query(
            'INSERT INTO companies (company_name, email, phone, industry, status, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
            [name, lead.email || null, lead.phone || null, lead.industry || null, 'Active', lead.lead_source || 'Lead conversion']
          );
          companyId = ins.insertId;
        }
      }

      // First stage of the pipeline unless the caller dropped it on a specific stage.
      const [[firstStage]] = await conn.query(
        "SELECT id, name, probability FROM pipeline_stages WHERE COALESCE(status, 'Active') = 'Active' ORDER BY position ASC, id ASC LIMIT 1"
      );
      const stageName = body.deal_stage || firstStage?.name || 'New';

      // One client = one deal. Every service the client bought rides along on that deal.
      const resolved = await resolveDealForLead(conn, { ...lead, lead_name: dealName });

      const [dealResult] = await conn.query(
        `INSERT INTO deals (
          deal_name, description, deal_value, currency, status,
          company_id, service_category_id, services, pipeline, deal_stage, pipeline_stage_id,
          probability, department_id, source, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'Open', ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          dealName,
          body.description || lead.notes || null,
          dealValue,
          body.currency || lead.currency || 'INR',
          companyId,
          resolved.serviceCategoryId,
          resolved.serviceNames.length > 0 ? JSON.stringify(resolved.serviceNames) : null,
          body.pipeline || stageName,
          stageName,
          body.deal_stage ? null : (firstStage?.id || null),
          firstStage?.probability ?? 10,
          resolved.departmentId,
          lead.lead_source || null
        ]
      );
      const dealId = dealResult.insertId;

      await conn.query(
        `UPDATE leads SET lead_status = 'Qualified', converted_deal_id = ?,
                converted_company_id = COALESCE(converted_company_id, ?), updated_at = NOW()
          WHERE id = ?`,
        [dealId, companyId, leadId]
      );

      await conn.commit();
      const [[newDeal]] = await conn.query('SELECT * FROM deals WHERE id = ?', [dealId]);
      return res.status(201).json({
        success: true,
        message: `Lead "${lead.lead_name}" successfully converted to deal`,
        deal: newDeal,
        leadId
      });
    } catch (err) {
      if (conn) await conn.rollback().catch(() => { });
      console.error('Error converting lead to deal:', err);
      return res.status(500).json({ success: false, error: 'Failed to convert lead to deal' });
    } finally {
      if (conn) conn.release();
    }
  };

  app.post('/api/leads/:id/convert-to-deal', convertLeadToDeal);
  // Older name. It used to only mark the lead converted without creating a deal; it now
  // performs the same full conversion.
  app.post('/api/leads/:id/convert', convertLeadToDeal);

  app.get('/api/deals/:dealId/contacts', async (req, res) => {
    try {
      const [contacts] = await db.query(
        `SELECT dc.*, c.* FROM deal_contacts dc
         JOIN contacts c ON dc.contact_id = c.id
         WHERE dc.deal_id = ? ORDER BY dc.is_primary DESC`,
        [req.params.dealId]
      );
      
      return res.json({ success: true, data: contacts });
    } catch (err) {
      console.error('Error fetching deal contacts:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/deals/:dealId/contacts', async (req, res) => {
    try {
      const { contact_id, role, is_primary } = req.body;
      
      if (!contact_id) {
        return res.status(400).json({ success: false, error: 'Contact ID required' });
      }
      
      await db.query(
        `INSERT INTO deal_contacts (deal_id, contact_id, role, is_primary)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE role = ?, is_primary = ?`,
        [req.params.dealId, contact_id, role || null, is_primary ? 1 : 0, role || null, is_primary ? 1 : 0]
      );
      
      const [dealContact] = await db.query(
        `SELECT dc.*, c.* FROM deal_contacts dc
         JOIN contacts c ON dc.contact_id = c.id
         WHERE dc.deal_id = ? AND dc.contact_id = ?`,
        [req.params.dealId, contact_id]
      );
      
      return res.status(201).json({ success: true, data: dealContact[0] });
    } catch (err) {
      console.error('Error adding contact to deal:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/deals/:dealId/contacts/:contactId', async (req, res) => {
    try {
      await db.query(
        'DELETE FROM deal_contacts WHERE deal_id = ? AND contact_id = ?',
        [req.params.dealId, req.params.contactId]
      );
      
      return res.json({ success: true, message: 'Contact removed from deal' });
    } catch (err) {
      console.error('Error removing contact from deal:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/roles', async (req, res) => {
    try {
      const { name, description } = req.body;
      
      if (!name) {
        return res.status(400).json({ success: false, error: 'Role name required' });
      }
      
      const [result] = await db.query(
        'INSERT INTO roles (name, description) VALUES (?, ?)',
        [name, description || null]
      );
      
      const [role] = await db.query('SELECT * FROM roles WHERE id = ?', [result.insertId]);
      
      return res.status(201).json({ success: true, data: role[0] });
    } catch (err) {
      console.error('Error creating role:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/roles/:roleId/permissions', async (req, res) => {
    try {
      const [permissions] = await db.query(
        'SELECT * FROM role_permissions WHERE role_id = ? ORDER BY module_name, permission_name',
        [req.params.roleId]
      );
      
      return res.json({ success: true, data: permissions });
    } catch (err) {
      console.error('Error fetching role permissions:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/roles/:roleId/permissions', async (req, res) => {
    try {
      const { permission_name, module_name, can_create, can_read, can_update, can_delete, description } = req.body;
      
      if (!permission_name) {
        return res.status(400).json({ success: false, error: 'Permission name required' });
      }
      
      const [result] = await db.query(
        `INSERT INTO role_permissions (role_id, permission_name, module_name, can_create, can_read, can_update, can_delete, description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.params.roleId, permission_name, module_name || null, can_create || false, can_read || false, can_update || false, can_delete || false, description || null]
      );
      
      const [permission] = await db.query('SELECT * FROM role_permissions WHERE id = ?', [result.insertId]);
      
      return res.status(201).json({ success: true, data: permission[0] });
    } catch (err) {
      console.error('Error adding role permission:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put('/api/roles/:roleId/permissions/:permissionId', async (req, res) => {
    try {
      const { can_create, can_read, can_update, can_delete } = req.body;
      
      await db.query(
        `UPDATE role_permissions SET can_create = ?, can_read = ?, can_update = ?, can_delete = ? WHERE id = ? AND role_id = ?`,
        [can_create || false, can_read || false, can_update || false, can_delete || false, req.params.permissionId, req.params.roleId]
      );
      
      const [permission] = await db.query('SELECT * FROM role_permissions WHERE id = ?', [req.params.permissionId]);
      
      return res.json({ success: true, data: permission[0] });
    } catch (err) {
      console.error('Error updating permission:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  const resolveUserId = async (idOrUuid) => {
    if (!idOrUuid) return null;
    const [u] = await db.query('SELECT id FROM users WHERE id = ? OR uuid = ?', [idOrUuid, idOrUuid]);
    return u.length > 0 ? u[0].id : null;
  };

  app.post('/api/users/:userId/roles', async (req, res) => {
    try {
      const { role_id, assigned_by } = req.body;
      const targetUserId = await resolveUserId(req.params.userId);
      
      if (!targetUserId) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      if (!role_id) {
        return res.status(400).json({ success: false, error: 'Role ID required' });
      }
      
      await db.query(
        `INSERT INTO user_roles (user_id, role_id, assigned_by)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE assigned_by = ?, assigned_at = NOW()`,
        [targetUserId, role_id, assigned_by || null, assigned_by || null]
      );
      
      const [userRole] = await db.query(
        `SELECT ur.*, r.name as role_name FROM user_roles ur
         JOIN roles r ON ur.role_id = r.id
         WHERE ur.user_id = ? AND ur.role_id = ?`,
        [targetUserId, role_id]
      );
      
      return res.status(201).json({ success: true, data: userRole[0] });
    } catch (err) {
      console.error('Error assigning role to user:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/users/:userId/roles', async (req, res) => {
    try {
      const targetUserId = await resolveUserId(req.params.userId);
      if (!targetUserId) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      const [roles] = await db.query(
        `SELECT ur.*, r.* FROM user_roles ur
         JOIN roles r ON ur.role_id = r.id
         WHERE ur.user_id = ?`,
        [targetUserId]
      );
      
      return res.json({ success: true, data: roles });
    } catch (err) {
      console.error('Error fetching user roles:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/users/:userId/permissions', async (req, res) => {
    try {
      const targetUserId = await resolveUserId(req.params.userId);
      if (!targetUserId) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      const [permissions] = await db.query(
        `SELECT DISTINCT rp.* FROM user_roles ur
         JOIN role_permissions rp ON ur.role_id = rp.role_id
         WHERE ur.user_id = ?`,
        [targetUserId]
      );
      
      return res.json({ success: true, data: permissions });
    } catch (err) {
      console.error('Error fetching user permissions:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/users/:userId/roles/:roleId', async (req, res) => {
    try {
      const targetUserId = await resolveUserId(req.params.userId);
      if (!targetUserId) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      await db.query(
        'DELETE FROM user_roles WHERE user_id = ? AND role_id = ?',
        [targetUserId, req.params.roleId]
      );
      
      return res.json({ success: true, message: 'Role removed from user' });
    } catch (err) {
      console.error('Error removing role from user:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/activities/mentions', async (req, res) => {
    try {
      const { activity_id, mentioned_user_ids } = req.body;
      
      if (!activity_id || !mentioned_user_ids || !Array.isArray(mentioned_user_ids)) {
        return res.status(400).json({ success: false, error: 'Activity ID and user IDs array required' });
      }
      
      const mentions = [];
      for (const userId of mentioned_user_ids) {
        await db.query(
          'INSERT INTO activity_mentions (activity_id, mentioned_user_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE mentioned_user_id = ?',
          [activity_id, userId, userId]
        );
        mentions.push({ activity_id, mentioned_user_id: userId });
      }
      
      return res.status(201).json({ success: true, data: mentions });
    } catch (err) {
      console.error('Error adding activity mentions:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/activities/:activityId/mentions', async (req, res) => {
    try {
      const [mentions] = await db.query(
        `SELECT am.*, u.* FROM activity_mentions am
         JOIN users u ON am.mentioned_user_id = u.id
         WHERE am.activity_id = ?`,
        [req.params.activityId]
      );
      
      return res.json({ success: true, data: mentions });
    } catch (err) {
      console.error('Error fetching activity mentions:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

};

const { generateProjectTasks } = require('../middleware/helpers');

module.exports = function setupEntitiesRoutes(app, pool) {
  // Use pool.query directly for better connection management
  const db = {
    query: (sql, params) => pool.query(sql, params)
  };

  const responseError = (res, statusCode, message, error) => {
    console.error(`Error: ${message}`, error?.message || error);
    return res.status(statusCode).json({ error: message, details: error?.message || error });
  };

  app.get('/api/contacts', async (req, res) => {
    try {
      const { skip = 0, limit = 50, search, assignedTo } = req.query;

      // 1. Get all contacts
      let contactsQuery = `SELECT 
        ct.id,
        ct.first_name,
        ct.last_name,
        ct.email,
        ct.phone,
        ct.company_id,
        ct.position,
        ct.status,
        ct.owner_id,
        ct.created_at,
        ct.updated_at,
        c.company_name,
        c.city AS location,
        c.address,
        u.first_name AS owner_first_name,
        u.last_name AS owner_last_name
      FROM contacts ct
      LEFT JOIN companies c ON ct.company_id = c.id
      LEFT JOIN users u ON ct.owner_id = u.id
      WHERE 1=1`;
      const contactsParams = [];

      if (assignedTo) {
        contactsQuery += ' AND (ct.owner_id = ? OR c.created_by = ?)';
        contactsParams.push(assignedTo, assignedTo);
      }

      if (search) {
        contactsQuery += ' AND (ct.first_name LIKE ? OR ct.last_name LIKE ? OR ct.email LIKE ? OR c.company_name LIKE ?)';
        const searchTerm = `%${search}%`;
        contactsParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      // Group by contact ID
      contactsQuery += ' GROUP BY ct.id ORDER BY ct.created_at DESC';
      
      const [contacts] = await db.query(contactsQuery, contactsParams);

      // 2. Get all active companies
      let companiesQuery = `SELECT DISTINCT
        c.id AS company_id,
        c.company_name,
        c.email,
        c.phone,
        c.address,
        c.city AS location,
        c.status,
        c.created_at
      FROM companies c
      WHERE c.status = 'Active'`;
      const companiesParams = [];

      if (search) {
        companiesQuery += ' AND (c.company_name LIKE ? OR c.email LIKE ?)';
        const searchTerm = `%${search}%`;
        companiesParams.push(searchTerm, searchTerm);
      }

      const [activeCompanies] = await db.query(companiesQuery, companiesParams);

      // 3. Merge them: Ensure every active company is represented
      // If a company has contacts, they are already in the 'contacts' list
      // We want to add entries for companies that DON'T have contacts in the list
      
      const contactCompanyIds = new Set(contacts.map(ct => ct.company_id).filter(id => id !== null));
      
      const companyEntries = activeCompanies
        .filter(comp => !contactCompanyIds.has(comp.company_id))
        .map(comp => ({
          id: `comp-${comp.company_id}`, // Virtual ID to avoid collisions
          first_name: comp.company_name,
          last_name: '(Company)',
          email: comp.email,
          phone: comp.phone,
          company_id: comp.company_id,
          company_name: comp.company_name,
          position: 'Organization',
          status: comp.status,
          location: comp.location,
          address: comp.address,
          created_at: comp.created_at,
          is_company_entry: true
        }));

      const allResults = [...contacts, ...companyEntries];
      
      // Sort and paginate
      allResults.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      const paginatedResults = allResults.slice(parseInt(skip), parseInt(skip) + parseInt(limit));

      return res.json(paginatedResults);
    } catch (err) {
      responseError(res, 500, 'Failed to fetch contacts', err);
    }
  });

  app.post('/api/contacts', async (req, res) => {
    try {
      const {
        first_name,
        last_name,
        email,
        phone,
        company_id,
        position,
        department,
        address,
        city,
        state,
        country,
        source,
        status,
        notes,
        avatar,
        owner_id
      } = req.body;

      if (!first_name) {
        return res.status(400).json({ error: 'First name required' });
      }

      // Connection handled by db.query
      const [result] = await db.query(
        `INSERT INTO contacts (
          first_name, last_name, email, phone, company_id,
          position, department, address, city, state, country, source,
          status, notes, avatar, owner_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          first_name,
          last_name || null,
          email || null,
          phone || null,
          company_id || null,
          position || null,
          department || null,
          address || null,
          city || null,
          state || null,
          country || null,
          source || null,
          status || 'Active',
          notes || null,
          avatar || null,
          owner_id || null
        ]
      );

      const [contact] = await db.query('SELECT * FROM contacts WHERE id = ?', [result.insertId]);

      return res.status(201).json(contact[0]);
    } catch (err) {
      responseError(res, 500, 'Failed to create contact', err);
    }
  });

  app.put('/api/contacts/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const {
        first_name,
        last_name,
        email,
        phone,
        company_id,
        position,
        department,
        address,
        city,
        state,
        country,
        source,
        status,
        notes,
        avatar,
        owner_id
      } = req.body;

      // Connection handled by db.query
      await db.query(
        `UPDATE contacts SET
          first_name = ?, last_name = ?, email = ?, phone = ?,
          company_id = ?, position = ?, department = ?, address = ?, city = ?,
          state = ?, country = ?, source = ?, status = ?, notes = ?, avatar = ?,
          owner_id = ?, updated_at = NOW()
         WHERE id = ?`,
        [
          first_name || null,
          last_name || null,
          email || null,
          phone || null,
          company_id || null,
          position || null,
          department || null,
          address || null,
          city || null,
          state || null,
          country || null,
          source || null,
          status || 'Active',
          notes || null,
          avatar || null,
          owner_id || null,
          id
        ]
      );

      const [contact] = await db.query('SELECT * FROM contacts WHERE id = ?', [id]);

      return res.json(contact[0]);
    } catch (err) {
      responseError(res, 500, 'Failed to update contact', err);
    }
  });

  app.get('/api/companies', async (req, res) => {
    try {
      const { skip = 0, limit = 50, search } = req.query;
      // Connection handled by db.query

      let query = `SELECT 
        c.id,
        c.company_name,
        c.email,
        c.phone,
        c.website,
        c.industry,
        c.status,
        c.created_at,
        COUNT(ct.id) AS contact_count
      FROM companies c
      LEFT JOIN contacts ct ON ct.company_id = c.id
      WHERE 1=1`;
      const params = [];

      if (search) {
        query += ' AND (c.company_name LIKE ? OR c.industry LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm);
      }

      query += ' GROUP BY c.id, c.company_name, c.email, c.phone, c.website, c.industry, c.status, c.created_at ORDER BY c.created_at DESC LIMIT ?, ?';
      params.push(parseInt(skip), parseInt(limit));

      const [companies] = await db.query(query, params);

      return res.json(companies);
    } catch (err) {
      responseError(res, 500, 'Failed to fetch companies', err);
    }
  });

  app.get('/api/companies/:id', async (req, res) => {
    try {
      const { id } = req.params;
      // Connection handled by db.query

      const [companies] = await db.query('SELECT * FROM companies WHERE id = ?', [id]);

      if (companies.length === 0) {
        return res.status(404).json({ error: 'Company not found' });
      }

      return res.json(companies[0]);
    } catch (err) {
      responseError(res, 500, 'Failed to fetch company', err);
    }
  });

  app.post('/api/companies', async (req, res) => {
    try {
      const { 
        company_name, email, phone, website, industry, address, city, state, country, 
        status, description, created_by 
      } = req.body;

      if (!company_name) {
        return res.status(400).json({ error: 'Company name required' });
      }

      // Connection handled by db.query
      const [result] = await db.query(
        `INSERT INTO companies (company_name, email, phone, website, industry, address, city, state, country, status, description, created_by) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [company_name, email || null, phone || null, website || null, industry || null, address || null, city || null, state || null, country || null, status || 'Active', description || null, created_by || null]
      );

      const [company] = await db.query('SELECT * FROM companies WHERE id = ?', [result.insertId]);

      return res.status(201).json(company[0]);
    } catch (err) {
      responseError(res, 500, 'Failed to create company', err);
    }
  });

  app.put('/api/companies/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { 
        company_name, email, phone, website, industry, address, city, state, country, 
        status, description 
      } = req.body;

      if (!company_name) {
        return res.status(400).json({ error: 'Company name required' });
      }

      // Connection handled by db.query
      await db.query(
        `UPDATE companies SET company_name = ?, email = ?, phone = ?, website = ?, industry = ?, address = ?, city = ?, state = ?, country = ?, status = ?, description = ? WHERE id = ?`,
        [company_name, email || null, phone || null, website || null, industry || null, address || null, city || null, state || null, country || null, status || 'Active', description || null, id]
      );

      const [company] = await db.query('SELECT * FROM companies WHERE id = ?', [id]);

      return res.json(company[0]);
    } catch (err) {
      responseError(res, 500, 'Failed to update company', err);
    }
  });

  app.delete('/api/companies/:id', async (req, res) => {
    try {
      const { id } = req.params;
      // Connection handled by db.query

      await db.query('DELETE FROM companies WHERE id = ?', [id]);

      return res.json({ success: true, message: 'Company deleted successfully' });
    } catch (err) {
      responseError(res, 500, 'Failed to delete company', err);
    }
  });

  app.get('/api/users', async (req, res) => {
    try {
      const { skip = 0, limit = 50, search, department, excludeSystem } = req.query;
      // Connection handled by db.query

      let query = 'SELECT u.*, r.name as role_name FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE 1=1';
      const params = [];

      // Scope to a department so pickers (e.g. issue assignee) don't offer staff
      // from other departments. Accepts "Marketing" or "Marketing Department".
      // Removed department-based validation to allow everyone to assign tasks to everyone.
      /* if (department) {
        const dept = String(department).replace(/\s*department\s*$/i, '').trim();
        query += ' AND u.department LIKE ?';
        params.push(`%${dept}%`);
      } */

      // Placeholder logins seeded per department (admin@, marketing@, it@ ...) are not
      // real people and shouldn't appear in assignee lists.
      if (excludeSystem === 'true') {
        query += " AND u.username NOT IN ('admin','leads','deals','sales','marketing','it','accounting')";
      }

      if (search) {
        query += ' AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      query += ' ORDER BY u.created_at DESC LIMIT ?, ?';
      params.push(parseInt(skip), parseInt(limit));

      const [users] = await db.query(query, params);

      const usersWithoutPassword = users.map(u => {
        const { password, ...user } = u;
        return user;
      });

      return res.json(usersWithoutPassword);
    } catch (err) {
      responseError(res, 500, 'Failed to fetch users', err);
    }
  });

  app.delete('/api/users/:id', async (req, res) => {
    try {
      const { id } = req.params;
      // Connection handled by db.query

      // Check if user exists
      const [user] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
      if (user.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      await db.query('DELETE FROM users WHERE id = ?', [id]);

      return res.json({ success: true, message: 'User deleted successfully' });
    } catch (err) {
      responseError(res, 500, 'Failed to delete user', err);
    }
  });

  app.put('/api/users/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { 
        first_name, last_name, username, email, phone1, phone1_country, 
        phone2, phone2_country, location, avatar, role_id, department, email_opt_out, 
        status, password 
      } = req.body;

      // Fetch existing user to merge fields and avoid null constraint errors
      const [existingUsers] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
      if (!existingUsers || existingUsers.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      const existing = existingUsers[0];

      const updateFields = [
        'first_name = ?', 'last_name = ?', 'username = ?', 'email = ?', 
        'phone1 = ?', 'phone1_country = ?', 'phone2 = ?', 'phone2_country = ?', 
        'location = ?', 'avatar = ?', 'role_id = ?', 'department = ?', 
        'email_opt_out = ?', 'status = ?', 'updated_at = NOW()'
      ];
      
      const params = [
        first_name || existing.first_name, 
        last_name !== undefined ? last_name : existing.last_name, 
        username || existing.username, 
        email || existing.email, 
        phone1 !== undefined ? phone1 : existing.phone1, 
        phone1_country || existing.phone1_country || 'US', 
        phone2 !== undefined ? phone2 : existing.phone2, 
        phone2_country || existing.phone2_country || 'US', 
        location !== undefined ? location : existing.location, 
        avatar !== undefined ? avatar : existing.avatar, 
        role_id || existing.role_id, 
        department !== undefined ? department : existing.department,
        email_opt_out !== undefined ? (email_opt_out ? 1 : 0) : existing.email_opt_out, 
        status || existing.status
      ];

      if (password) {
        updateFields.push('password = ?');
        params.push(password);
      }

      params.push(id);

      await db.query(
        `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
        params
      );

      const [updatedUser] = await db.query(
        'SELECT u.*, r.name as role_name FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = ?', 
        [id]
      );
      
      
      if (updatedUser.length === 0) {
        return res.status(404).json({ error: 'User not found after update' });
      }

      const { password: _, ...userWithoutPassword } = updatedUser[0];
      return res.json(userWithoutPassword);
    } catch (err) {
      responseError(res, 500, 'Failed to update user', err);
    }
  });

  app.post('/api/users', async (req, res) => {
    try {
      const { 
        first_name, last_name, username, email, password, phone1, 
        phone1_country, phone2, phone2_country, location, avatar, 
        role_id, role_name, role, department, email_opt_out, status 
      } = req.body;

      if (!email || !password || !username) {
        return res.status(400).json({ error: 'Email, password and username are required' });
      }

      // Check if user exists
      const [existingUser] = await db.query(
        'SELECT id FROM users WHERE email = ? OR username = ?',
        [email, username]
      );

      if (existingUser.length > 0) {
        return res.status(409).json({ error: 'User already exists' });
      }

      let finalRoleId = role_id || 5;
      const targetRoleName = role_name || role;
      if (targetRoleName) {
        const [r] = await db.query('SELECT id FROM roles WHERE name = ? LIMIT 1', [targetRoleName]);
        if (r.length > 0) {
          finalRoleId = r[0].id;
        } else {
          const [ins] = await db.query('INSERT INTO roles (name, description) VALUES (?, ?)', [targetRoleName, `Role for ${targetRoleName}`]);
          finalRoleId = ins.insertId;
        }
      }

      const [result] = await db.query(
        `INSERT INTO users (
          first_name, last_name, username, email, password, phone1, 
          phone1_country, phone2, phone2_country, location, avatar, 
          role_id, department, email_opt_out, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          first_name, last_name || null, username, email, password, 
          phone1 || null, phone1_country || 'US', 
          phone2 || null, phone2_country || 'US', 
          location || null, avatar || null, finalRoleId, department || null,
          email_opt_out ? 1 : 0, status || 'Active'
        ]
      );

      const [newUser] = await db.query(
        'SELECT u.*, r.name as role_name FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = ?',
        [result.insertId]
      );


      const { password: _, ...userWithoutPassword } = newUser[0];
      return res.status(201).json(userWithoutPassword);
    } catch (err) {
      responseError(res, 500, 'Failed to create user', err);
    }
  });

  app.get('/api/deals', async (req, res) => {
    try {
      const { skip = 0, limit = 50, search, status, assignee_id } = req.query;
      // Connection handled by db.query

      let query = `
        SELECT 
          d.id, d.deal_name, d.description, d.deal_value, d.currency, d.status, d.company_id, d.contact_id, 
          d.assignee_id, d.service_category_id, d.pipeline, d.deal_stage, d.probability, d.expected_close_date, 
          d.created_at, d.updated_at, c.company_name, ct.email AS contact_email, ct.phone AS contact_phone, 
          ct.first_name AS contact_first_name, ct.last_name AS contact_last_name, u.first_name AS assignee_first_name, 
          u.last_name AS assignee_last_name, sc.name AS service_name, l.id AS lead_id, l.project_name, 
          l.business_type, l.marketing_services, l.it_services, l.it_services_other, l.referral_name, 'Deal' as record_type
        FROM deals d 
        LEFT JOIN companies c ON d.company_id = c.id 
        LEFT JOIN contacts ct ON d.contact_id = ct.id 
        LEFT JOIN users u ON d.assignee_id = u.id 
        LEFT JOIN service_categories sc ON d.service_category_id = sc.id
        LEFT JOIN leads l ON l.converted_deal_id = d.id
        WHERE 1=1
        ${search ? ' AND d.deal_name LIKE ?' : ''}
        ${status ? ' AND d.status = ?' : ''}
        ${assignee_id ? ' AND d.assignee_id = ?' : ''}
        
        UNION ALL
        
        SELECT 
          l.id + 1000000 as id, l.lead_name as deal_name, l.notes as description, l.value as deal_value, 
          l.currency, l.lead_status as status, l.company_id, null as contact_id, l.owner_id as assignee_id, 
          l.service_category_id, l.lead_status as pipeline, l.lead_status as deal_stage, 10 as probability, 
          null as expected_close_date, l.created_at, l.updated_at, COALESCE(c.company_name, l.company) as company_name, 
          l.email AS contact_email, l.phone AS contact_phone, null AS contact_first_name, null AS contact_last_name, 
          u.first_name AS assignee_first_name, u.last_name AS assignee_last_name, sc.name AS service_name, 
          l.id AS lead_id, l.project_name, l.business_type, l.marketing_services, l.it_services, 
          l.it_services_other, l.referral_name, 'Converted Lead' as record_type
        FROM leads l
        LEFT JOIN companies c ON l.company_id = c.id
        LEFT JOIN users u ON l.owner_id = u.id
        LEFT JOIN service_categories sc ON l.service_category_id = sc.id
        WHERE l.lead_status IN ('Qualified', 'Contacted', 'Converted Lead', 'Quotation', 'Revised Quotation', 'Finalized Deal', 'Converted to Deal', 'Won')
        AND l.converted_deal_id IS NULL
        AND NOT EXISTS (SELECT 1 FROM deals d2 WHERE d2.deal_name = l.lead_name AND (d2.company_id = l.company_id OR (d2.company_id IS NULL AND l.company_id IS NULL)))
        AND NOT EXISTS (SELECT 1 FROM deals d3 WHERE d3.company_id = l.company_id AND l.company_id IS NOT NULL)
        ${search ? ' AND l.lead_name LIKE ?' : ''}
        ${assignee_id ? ' AND l.owner_id = ?' : ''}
        
        ORDER BY created_at DESC LIMIT ?, ?`;
      
      const params = [];
      if (search) params.push(`%${search}%`);
      if (status) params.push(status);
      if (assignee_id) params.push(assignee_id);
      
      if (search) params.push(`%${search}%`);
      if (assignee_id) params.push(assignee_id);
      
      params.push(parseInt(skip), parseInt(limit));

      const [deals] = await db.query(query, params);

      return res.json(deals);
    } catch (err) {
      responseError(res, 500, 'Failed to fetch deals', err);
    }
  });

  app.get('/api/deals/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const dealId = parseInt(id);
      
      let query;
      let params = [dealId];

      if (dealId > 1000000) {
        // Virtual deal from lead
        const leadId = dealId - 1000000;
        query = `
          SELECT 
            l.id + 1000000 as id,
            l.lead_name as deal_name,
            l.notes as description,
            l.value as deal_value,
            l.currency,
            l.lead_status as status,
            l.company_id,
            null as contact_id,
            l.owner_id as assignee_id,
            l.service_category_id,
            l.lead_status as pipeline,
            l.lead_status as deal_stage,
            10 as probability,
            null as expected_close_date,
            l.created_at,
            l.updated_at,
            COALESCE(c.company_name, l.company) as company_name,
            l.email AS contact_email,
            l.phone AS contact_phone,
            null AS contact_first_name,
            null AS contact_last_name,
            u.first_name AS assignee_first_name,
            u.last_name AS assignee_last_name,
            sc.name AS service_name,
            l.id AS lead_id,
            l.project_name,
            l.business_type,
            l.marketing_services,
            l.it_services,
            l.referral_name,
            'Converted Lead' as record_type
          FROM leads l
          LEFT JOIN companies c ON l.company_id = c.id
          LEFT JOIN users u ON l.owner_id = u.id
          LEFT JOIN service_categories sc ON l.service_category_id = sc.id
          WHERE l.id = ? AND l.converted_deal_id IS NULL`;
        params = [leadId];
      } else {
        // Real deal
        query = `
          SELECT 
            d.id,
            d.deal_name,
            d.description,
            d.deal_value,
            d.currency,
            d.status,
            d.company_id,
            d.contact_id,
            d.assignee_id,
            d.service_category_id,
            d.pipeline,
            d.deal_stage,
            d.probability,
            d.expected_close_date,
            d.created_at,
            d.updated_at,
            c.company_name,
            ct.email AS contact_email,
            ct.phone AS contact_phone,
            ct.first_name AS contact_first_name,
            ct.last_name AS contact_last_name,
            u.first_name AS assignee_first_name,
            u.last_name AS assignee_last_name,
            sc.name AS service_name,
            l.id AS lead_id,
            l.project_name,
            l.business_type,
            l.marketing_services,
            l.it_services,
            l.it_services_other,
            l.referral_name,
            'Deal' as record_type
          FROM deals d 
          LEFT JOIN companies c ON d.company_id = c.id 
          LEFT JOIN contacts ct ON d.contact_id = ct.id 
          LEFT JOIN users u ON d.assignee_id = u.id 
          LEFT JOIN service_categories sc ON d.service_category_id = sc.id
          LEFT JOIN leads l ON l.converted_deal_id = d.id
          WHERE d.id = ?`;
      }

      const [deals] = await db.query(query, params);

      if (deals.length === 0) {
        return res.status(404).json({ error: 'Deal not found' });
      }

      return res.json(deals[0]);
    } catch (err) {
      responseError(res, 500, 'Failed to fetch deal details', err);
    }
  });

  app.post('/api/deals', async (req, res) => {
    try {
      const {
        deal_name,
        description,
        deal_value,
        currency,
        status,
        company_id,
        contact_id,
        assignee_id,
        service_category_id,
        pipeline,
        deal_stage,
        probability,
        expected_close_date,
        due_date,
        follow_up_date,
        source,
        priority,
        period,
        period_value,
        tags
      } = req.body;

      if (!deal_name) {
        return res.status(400).json({ error: 'Deal name required' });
      }

      // Connection handled by db.query
      
      const createCompanyId = company_id ? parseInt(company_id, 10) : null;
      const createContactId = contact_id ? parseInt(contact_id, 10) : null;
      const createAssigneeId = assignee_id ? parseInt(assignee_id, 10) : null;
      const createServiceCategoryId = service_category_id ? parseInt(service_category_id, 10) : null;
      
      if (createCompanyId && !isNaN(createCompanyId)) {
        const [companyCheck] = await db.query(
          'SELECT id FROM companies WHERE id = ?',
          [createCompanyId]
        );
        if (companyCheck.length === 0) {
              return res.status(400).json({
            error: 'Invalid company ID',
            details: `Company with ID ${createCompanyId} does not exist`
          });
        }
      }
      
      let finalProbability = probability;
      
      if (!finalProbability && pipeline) {
        const [stage] = await db.query(
          'SELECT probability FROM pipeline_stages WHERE name = ? AND status = ?',
          [pipeline, 'Active']
        );
        if (stage.length > 0) {
          finalProbability = stage[0].probability;
        } else {
          finalProbability = 10;
        }
      }
      
      if (!finalProbability) {
        finalProbability = 10;
      }

      const [result] = await db.query(
        `INSERT INTO deals (
          deal_name, description, deal_value, currency, status, company_id,
          contact_id, assignee_id, service_category_id, pipeline, deal_stage, probability,
          expected_close_date, due_date, follow_up_date, source, priority,
          period, period_value, tags
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          deal_name,
          description || null,
          deal_value || 0,
          currency || 'USD',
          status || 'Open',
          createCompanyId,
          createContactId,
          createAssigneeId,
          createServiceCategoryId,
          pipeline || null,
          deal_stage || null,
          finalProbability,
          expected_close_date || null,
          due_date || null,
          follow_up_date || null,
          source || null,
          priority || 'Medium',
          period || null,
          period_value || null,
          tags ? (Array.isArray(tags) ? tags.join(',') : tags) : null
        ]
      );

      // If deal was created from a lead, update lead status
      if (req.body.lead_id) {
        await db.query(
          "UPDATE leads SET lead_status = 'Converted to Deal', converted_deal_id = ?, updated_at = NOW() WHERE id = ?",
          [result.insertId, req.body.lead_id]
        );
      }

      const [deal] = await db.query('SELECT * FROM deals WHERE id = ?', [result.insertId]);

      return res.status(201).json(deal[0]);
    } catch (err) {
      responseError(res, 500, 'Failed to create deal', err);
    }
  });

  app.put('/api/deals/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const body = req.body;
      const dealId = parseInt(id);

      console.log('-------------------------------------------');
      console.log(`🚀 [PUT] /api/deals/${id} hit`);
      console.log('📦 Body received:', JSON.stringify(body));
      console.log('🆔 Parsed dealId:', dealId);

      if (dealId > 1000000) {
        console.log('🏗️ Handling VIRTUAL DEAL update (Lead-based)');
        const leadId = dealId - 1000000;
        console.log('🆔 Target Lead ID:', leadId);

        let isWon = false;
        if (body.pipeline === 'Won' || body.status === 'Won' || body.deal_stage === 'Won') {
          isWon = true;
        }

        if (isWon) {
          console.log('🏆 Virtual Deal marked as Won, converting to actual client & deal');
          const [leads] = await db.query('SELECT * FROM leads WHERE id = ?', [leadId]);
          if (leads.length === 0) return res.status(404).json({ error: 'Lead not found' });
          const lead = leads[0];

          // 1. Get or Create Company
          let companyId = lead.company_id || body.company_id;
          if (!companyId) {
            const [companyRes] = await db.query(
              'INSERT INTO companies (company_name, email, phone, industry, status, owner, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [lead.company || lead.lead_name || 'Unknown Company', lead.email, lead.phone, lead.industry, 'Active', lead.owner_id, lead.owner_id]
            );
            companyId = companyRes.insertId;
          }

          // 2. Get or Create Contact
          const [existingContacts] = await db.query('SELECT id FROM contacts WHERE company_id = ? LIMIT 1', [companyId]);
          let contactId = existingContacts.length > 0 ? existingContacts[0].id : null;
          if (!contactId) {
             const [contactRes] = await db.query(
               'INSERT INTO contacts (first_name, last_name, email, phone, company_id, owner_id) VALUES (?, ?, ?, ?, ?, ?)',
               [lead.referral_name || lead.lead_name || 'Contact', '', lead.email, lead.phone, companyId, lead.owner_id]
             );
             contactId = contactRes.insertId;
          }

          // 3. Create Real Deal
          const [dealRes] = await db.query(
            `INSERT INTO deals (
              deal_name, description, deal_value, currency, status,
              company_id, contact_id, assignee_id, service_category_id, pipeline, deal_stage,
              probability, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
              body.deal_name || lead.project_name || lead.lead_name || 'Converted Deal',
              body.description || lead.notes,
              body.deal_value || lead.value || 0,
              body.currency || lead.currency || 'USD',
              'Won',
              companyId,
              contactId,
              body.assignee_id || lead.owner_id,
              body.service_category_id || lead.service_category_id,
              'Won',
              'Won',
              100
            ]
          );
          const newDealId = dealRes.insertId;

          // 4. Update Lead
          await db.query(
            `UPDATE leads SET lead_status = 'Converted to Deal', converted_company_id = ?, converted_contact_id = ?, converted_deal_id = ?, updated_at = NOW() WHERE id = ?`,
            [companyId, contactId, newDealId, leadId]
          );

          // 5. Fetch updated real deal and return it
          const [updatedDeal] = await db.query(`
            SELECT d.*, c.company_name, ct.email AS contact_email, ct.phone AS contact_phone, 
                   ct.first_name AS contact_first_name, ct.last_name AS contact_last_name
            FROM deals d
            LEFT JOIN companies c ON d.company_id = c.id
            LEFT JOIN contacts ct ON d.contact_id = ct.id
            WHERE d.id = ?`, [newDealId]);
          
          return res.json(updatedDeal[0]);
        }

        const updateFields = [];
        const params = [];
        
        // Map deal fields to lead fields
        const mappings = {
          'deal_name': 'lead_name',
          'description': 'notes',
          'deal_value': 'value',
          'currency': 'currency',
          'status': 'lead_status',
          'pipeline': 'lead_status',
          'deal_stage': 'lead_status',
          'company_id': 'company_id',
          'assignee_id': 'owner_id',
          'service_category_id': 'service_category_id',
          'tags': 'tags'
        };

        console.log('🔍 Starting mapping loop...');
        for (const [dealField, leadField] of Object.entries(mappings)) {
          if (body[dealField] !== undefined) {
            let value = body[dealField];
            console.log(`✅ MATCH: ${dealField} -> ${leadField} = ${value}`);
            if (dealField === 'tags') {
              value = value ? (Array.isArray(value) ? value.join(',') : value) : null;
            }
            updateFields.push(`${leadField} = ?`);
            params.push(value);
          } else {
            // Log missing fields for debugging
            // console.log(`❌ NO MATCH for ${dealField}`);
          }
        }

        if (updateFields.length === 0) {
          console.error('❌ ERROR: No fields matched mappings. Body keys:', Object.keys(body));
          console.log('-------------------------------------------');
          return res.status(400).json({ error: 'No fields to update', receivedKeys: Object.keys(body) });
        }

        updateFields.push('updated_at = NOW()');
        params.push(leadId);

        console.log('📝 Executing SQL:', `UPDATE leads SET ${updateFields.join(', ')} WHERE id = ?`);
        console.log('🔢 Params:', params);

        await db.query(`UPDATE leads SET ${updateFields.join(', ')} WHERE id = ?`, params);
        console.log('✅ Lead updated successfully');
        
        // Fetch updated virtual deal
        const [updatedLead] = await db.query(`
          SELECT 
            l.id + 1000000 as id,
            l.lead_name as deal_name,
            l.notes as description,
            l.value as deal_value,
            l.currency,
            l.lead_status as status,
            l.company_id,
            l.owner_id as assignee_id,
            l.service_category_id,
            l.lead_status as pipeline,
            l.lead_status as deal_stage,
            10 as probability,
            null as expected_close_date,
            l.created_at,
            l.updated_at,
            COALESCE(c.company_name, l.company) as company_name,
            l.email AS contact_email,
            l.phone AS contact_phone,
            null AS contact_first_name,
            null AS contact_last_name,
            u.first_name AS assignee_first_name,
            u.last_name AS assignee_last_name,
            sc.name AS service_name,
            l.business_type,
            l.marketing_services,
            l.it_services,
            'Converted Lead' as record_type
          FROM leads l
          LEFT JOIN companies c ON l.company_id = c.id
          LEFT JOIN users u ON l.owner_id = u.id
          LEFT JOIN service_categories sc ON l.service_category_id = sc.id
          WHERE l.id = ?`, [leadId]);

        console.log('🔄 Returning updated virtual deal');
        console.log('-------------------------------------------');
        return res.json(updatedLead[0]);
      }
      
      console.log('🏢 Handling NORMAL DEAL update');
      const updateFields = [];
      const params = [];
      
      // Map body keys to column names
      // We list all potential columns that can be updated
      const updatableColumns = [
        'deal_name', 'description', 'deal_value', 'currency', 'status',
        'company_id', 'contact_id', 'assignee_id', 'service_category_id', 'pipeline',
        'deal_stage', 'probability', 'expected_close_date',
        'due_date', 'follow_up_date', 'source', 'priority',
        'period', 'period_value', 'tags'
      ];

      for (const col of updatableColumns) {
        if (body[col] !== undefined) {
          let value = body[col];
          
          // Special handling for some fields
          if (['company_id', 'contact_id', 'assignee_id', 'service_category_id'].includes(col)) {
            value = value ? parseInt(value, 10) : null;
            if (col === 'company_id' && value && !isNaN(value)) {
              const [companyCheck] = await db.query('SELECT id FROM companies WHERE id = ?', [value]);
              if (companyCheck.length === 0) {
                return res.status(400).json({
                  error: 'Invalid company ID',
                  details: `Company with ID ${value} does not exist`
                });
              }
            }
          } else if (col === 'tags') {
            value = value ? (Array.isArray(value) ? value.join(',') : value) : null;
          } else if (col === 'deal_value') {
            value = parseFloat(value) || 0;
          }

          updateFields.push(`${col} = ?`);
          params.push(value);
        }
      }
      
      // If pipeline is updated but probability isn't, handle probability automatically
      if (body.pipeline !== undefined && body.probability === undefined) {
        const [stage] = await db.query(
          'SELECT probability FROM pipeline_stages WHERE name = ? AND status = ?',
          [body.pipeline, 'Active']
        );
        if (stage.length > 0) {
          updateFields.push('probability = ?');
          params.push(stage[0].probability);
        }
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      updateFields.push('updated_at = NOW()');
      params.push(id);

      let autoConversion = false;
      if (body.pipeline === 'Won') {
        autoConversion = true;
      }

      await db.query(
        `UPDATE deals SET ${updateFields.join(', ')} WHERE id = ?`,
        params
      );

      const [updatedDeal] = await db.query('SELECT * FROM deals WHERE id = ?', [id]);
      const deal = updatedDeal[0];

      if (autoConversion) {
        let {
          deal_name,
          description,
          deal_value,
          currency,
          company_id,
          contact_id,
          assignee_id,
          service_category_id,
          expected_close_date,
          due_date
        } = deal;

        // Ensure contact exists for the company so they appear in /api/contacts
        if (company_id && !contact_id) {
          const [existingContacts] = await db.query('SELECT id FROM contacts WHERE company_id = ? LIMIT 1', [company_id]);
          if (existingContacts.length === 0) {
            const [comp] = await db.query('SELECT company_name, email, phone FROM companies WHERE id = ?', [company_id]);
            if (comp.length > 0) {
              const [newContact] = await db.query(
                'INSERT INTO contacts (first_name, last_name, email, phone, company_id, owner_id) VALUES (?, ?, ?, ?, ?, ?)',
                [comp[0].company_name || 'Client', '', comp[0].email, comp[0].phone, company_id, assignee_id]
              );
              contact_id = newContact.insertId;
              await db.query('UPDATE deals SET contact_id = ? WHERE id = ?', [contact_id, id]);
            }
          } else {
            contact_id = existingContacts[0].id;
            await db.query('UPDATE deals SET contact_id = ? WHERE id = ?', [contact_id, id]);
          }
        }

        const [existingProposal] = await db.query(
          'SELECT id, proposal_number FROM proposals WHERE deal_id = ? LIMIT 1',
          [id]
        );
        
        let proposalId = null;
        let proposalNumber = null;
        
        if (existingProposal.length === 0) {
          proposalNumber = `PROP-${Date.now()}`;
          const proposalDate = new Date().toISOString().split('T')[0];
          const validityDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          
          const [proposalResult] = await db.query(
            `INSERT INTO proposals (
              proposal_number, title, description, client_id, contact_id, deal_id,
              created_by, status, proposal_date, validity_date, total_amount, currency
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              proposalNumber,
              deal_name || 'Proposal',
              description || null,
              company_id || null,
              contact_id || null,
              id,
              assignee_id || null,
              'Draft',
              proposalDate,
              validityDate,
              deal_value || 0,
              currency || 'USD'
            ]
          );
          proposalId = proposalResult.insertId;
          console.log(`✓ Auto-created proposal ${proposalNumber} (ID: ${proposalId}) for deal ${id}`);
        } else {
          proposalId = existingProposal[0].id;
          proposalNumber = existingProposal[0].proposal_number;
          console.log(`⚠️ Proposal ${proposalNumber} already exists for deal ${id}, skipping creation`);
        }
        
        const [existingProject] = await db.query(
          'SELECT id, name FROM projects WHERE deal_id = ? LIMIT 1',
          [id]
        );
        
        let projectId = null;
        
        if (existingProject.length === 0) {
          // Get department info if service category is set
          let deptId = null;
          let serviceName = null;
          let finalWorkflowType = 'Standard';
          
          if (service_category_id) {
            const [cat] = await db.query('SELECT name, suggested_department_id FROM service_categories WHERE id = ?', [service_category_id]);
            if (cat.length > 0) {
              deptId = cat[0].suggested_department_id;
              serviceName = cat[0].name;
              
              if (deptId) {
                const [dept] = await db.query('SELECT name FROM departments WHERE id = ?', [deptId]);
                if (dept.length > 0) {
                  if (dept[0].name.includes('IT')) finalWorkflowType = 'IT';
                  if (dept[0].name.includes('Marketing')) finalWorkflowType = 'Marketing';
                }
              }
            }
          }

          const reqUserId = req.headers['x-user-id'];
          const finalCreatedBy = assignee_id || reqUserId || null;

          const [projectResult] = await db.query(
            `INSERT INTO projects (
              name, title, description, deal_id, company_id, contact_id,
              budget, currency, status, created_by, department_id, workflow_type,
              start_date, due_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
            [
              deal_name || 'Project',
              deal_name || 'New Project',
              description || null,
              id,
              company_id || null,
              contact_id || null,
              deal_value || 0,
              currency || 'USD',
              'Planning',
              finalCreatedBy,
              deptId,
              finalWorkflowType,
              due_date || expected_close_date || null
            ]
          );
          projectId = projectResult.insertId;
          console.log(`✓ Auto-created project (ID: ${projectId}) for deal ${id}`);

          // Auto-generate tasks for the new project
          if (serviceName || deptId) {
            let tasks = [];
            let deptName = '';
            
            if (deptId) {
              const [dept] = await db.query('SELECT name FROM departments WHERE id = ?', [deptId]);
              if (dept.length > 0) deptName = dept[0].name;
            }

            if (serviceName === 'SEO') {
              tasks = ['Keyword Research', 'On-page Optimization', 'Technical Audit', 'Backlink Strategy', 'Monthly Reporting'];
            } else if (serviceName === 'Social Media') {
              tasks = ['Content Planning', 'Graphics Request', 'Video Request', 'Scheduling', 'Publishing', 'Analytics Tracking'];
            } else if (serviceName === 'WordPress') {
              tasks = ['Requirement Analysis', 'Design', 'Development', 'Testing', 'Deployment'];
            } else if (deptName === 'IT Services Department') {
              tasks = ['Requirement Analysis', 'Development', 'Code Commit', 'Internal Review', 'Testing', 'Deployment'];
            }

            for (const taskTitle of tasks) {
              await db.query(`
                INSERT INTO general_tasks (title, project_id, status, priority, linked_type, linked_id, department_id, workflow_type)
                VALUES (?, ?, ?, ?, 'Project', ?, ?, ?)
              `, [taskTitle, projectId, 'To Do', 'Medium', projectId, deptId || null, serviceName || deptName]);
            }
            console.log(`✓ Auto-generated ${tasks.length} tasks for project ${projectId}`);
          }
        } else {
          projectId = existingProject[0].id;
          console.log(`⚠️ Project "${existingProject[0].name}" already exists for deal ${id}, skipping creation`);
        }
      }
      
      return res.json(deal);
    } catch (err) {
      console.error('❌ Deal update error:', err.message);
      if (err.message && err.message.includes('foreign key constraint')) {
        return responseError(res, 400, 'Failed to update deal - Invalid company or contact', err);
      }
      responseError(res, 500, 'Failed to update deal', err);
    }
  });

  app.delete('/api/deals/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const dealId = parseInt(id);

      if (dealId > 1000000) {
        const leadId = dealId - 1000000;
        const [result] = await db.query('DELETE FROM leads WHERE id = ?', [leadId]);
        if (result.affectedRows === 0) {
          return res.status(404).json({ error: 'Virtual deal (lead) not found' });
        }
        return res.json({ success: true, message: 'Virtual deal (lead) deleted successfully' });
      }

      const [result] = await db.query('DELETE FROM deals WHERE id = ?', [id]);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Deal not found' });
      }
      
      return res.json({ success: true, message: 'Deal deleted successfully' });
    } catch (err) {
      responseError(res, 500, 'Failed to delete deal', err);
    }
  });

  app.get('/api/departments', async (req, res) => {
    try {
      const [departments] = await db.query('SELECT * FROM departments ORDER BY name ASC');
      return res.json(departments);
    } catch (err) {
      responseError(res, 500, 'Failed to fetch departments', err);
    }
  });

  app.get('/api/service-categories', async (req, res) => {
    try {
      const [categories] = await db.query('SELECT * FROM service_categories ORDER BY parent_category, name');
      return res.json(categories);
    } catch (err) {
      responseError(res, 500, 'Failed to fetch service categories', err);
    }
  });

  app.get('/api/projects', async (req, res) => {
    try {
      const { skip = 0, limit = 50, search, status, userId: queryUserId, assignedOnly, department } = req.query;
      const headerUserId = req.headers['x-user-id'];
      const userRole = req.headers['x-user-role'];
      
      const userId = queryUserId || headerUserId;
      
      let query = `
        SELECT 
          p.*, 
          COALESCE(c.company_name, dc.company_name) AS company_name,
          u.first_name AS manager_first_name,
          u.last_name AS manager_last_name,
          u.avatar AS manager_avatar,
          t.name AS team_name,
          (SELECT COUNT(*) FROM general_tasks WHERE project_id = p.id) AS total_tasks,
          (SELECT COUNT(*) FROM general_tasks WHERE project_id = p.id AND status = 'Completed') AS completed_tasks,
          (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', tm.user_id, 'first_name', tu.first_name, 'last_name', tu.last_name, 'avatar', tu.avatar)) 
           FROM project_team tm 
           JOIN users tu ON tm.user_id = tu.id 
           WHERE tm.project_id = p.id) AS team_members
        FROM projects p 
        LEFT JOIN companies c ON p.company_id = c.id 
        LEFT JOIN deals d ON p.deal_id = d.id
        LEFT JOIN companies dc ON d.company_id = dc.id
        LEFT JOIN users u ON p.manager_id = u.id
        LEFT JOIN teams t ON p.team_id = t.id
        WHERE 1=1
      `;
      const params = [];

      if (department) {
        query += ' AND p.department_id = (SELECT id FROM departments WHERE name LIKE ? LIMIT 1)';
        params.push(`%${department}%`);
      }

      // Filter by user if they are not Admin or Manager, or if assignedOnly is explicitly requested
      const isManager = userRole && (userRole.toLowerCase().includes('admin') || userRole.toLowerCase().includes('manager'));
      
      let userDept = null;
      if (userId) {
        const [u] = await db.query('SELECT department FROM users WHERE id = ?', [userId]);
        if (u.length > 0) userDept = u[0].department;
      }

      if (userId) {
        if (assignedOnly === 'true') {
          query += ' AND (p.created_by = ? OR p.team_id IN (SELECT team_id FROM team_members WHERE user_id = ?) OR p.id IN (SELECT project_id FROM project_team WHERE user_id = ?))';
          params.push(userId, userId, userId);
        } else if (!isManager) {
          query += ' AND (p.created_by = ? OR p.team_id IN (SELECT team_id FROM team_members WHERE user_id = ?) OR p.id IN (SELECT project_id FROM project_team WHERE user_id = ?) OR p.department_id = (SELECT id FROM departments WHERE name = ? LIMIT 1))';
          params.push(userId, userId, userId, userDept);
        }
      }

      if (search) {
        query += ' AND (p.name LIKE ? OR p.title LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm);
      }

      if (status) {
        query += ' AND p.status = ?';
        params.push(status);
      }

      query += ' ORDER BY p.created_at DESC LIMIT ?, ?';
      params.push(parseInt(skip), parseInt(limit));

      const [projects] = await db.query(query, params);
      return res.json(projects);
    } catch (err) {
      responseError(res, 500, 'Failed to fetch projects', err);
    }
  });

  app.get('/api/confirmed-it-projects', async (req, res) => {
    try {
      // Fetch deals that are 'Won' and linked to the requested department (defaults to IT for backward compatibility)
      const deptQuery = (req.query.department || 'IT').toLowerCase();
      const deptNamePattern = deptQuery.includes('market') ? '%Marketing%' : '%IT%';
      const query = `
        SELECT
          d.id, d.deal_name as name, d.company_id, c.company_name
        FROM deals d
        JOIN companies c ON d.company_id = c.id
        JOIN service_categories sc ON d.service_category_id = sc.id
        JOIN departments dept ON sc.suggested_department_id = dept.id
        WHERE d.deal_stage = 'Won'
        AND dept.name LIKE ?
        ORDER BY d.updated_at DESC
      `;

      const [deals] = await db.query(query, [deptNamePattern]);
      return res.json(deals);
    } catch (err) {
      responseError(res, 500, 'Failed to fetch confirmed projects', err);
    }
  });

  app.get('/api/confirmed-it-clients', async (req, res) => {
    try {
      // Fetch companies that have at least one 'Won' deal OR 'Won' lead in the requested department (defaults to IT)
      // Also fetch associated project_id if it exists
      const deptQuery = (req.query.department || 'IT').toLowerCase();
      const deptNamePattern = deptQuery.includes('market') ? '%Marketing%' : '%IT%';
      const query = `
        SELECT DISTINCT
          c.id, c.company_name, c.email, c.phone,
          (SELECT p.id FROM projects p WHERE p.company_id = c.id LIMIT 1) as project_id
        FROM companies c
        LEFT JOIN deals d ON d.company_id = c.id
        LEFT JOIN leads l ON l.company_id = c.id
        LEFT JOIN service_categories sc_d ON d.service_category_id = sc_d.id
        LEFT JOIN service_categories sc_l ON l.service_category_id = sc_l.id
        LEFT JOIN departments dept_d ON sc_d.suggested_department_id = dept_d.id
        LEFT JOIN departments dept_l ON sc_l.suggested_department_id = dept_l.id
        WHERE c.status = 'Active'
        AND (
          (d.deal_stage = 'Won' AND dept_d.name LIKE ?)
          OR
          (l.lead_status = 'Won' AND dept_l.name LIKE ?)
        )
        ORDER BY c.company_name ASC
      `;

      const [clients] = await db.query(query, [deptNamePattern, deptNamePattern]);
      return res.json(clients);
    } catch (err) {
      responseError(res, 500, 'Failed to fetch confirmed clients', err);
    }
  });

  app.post('/api/projects', async (req, res) => {
    try {
      const { title, name, description, status, company_id, priority, budget, due_date, start_date, parent_project_id, department_id, department, deal_id, created_by, service_type, progress, spent, manager_id, team_id, project_type } = req.body;

      if (!title && !name) {
        return res.status(400).json({ error: 'Project name/title required' });
      }

      // Resolve the department (and service, for task generation) before saving the project,
      // preferring the originating deal's own department/service over a guessed category name.
      let resolvedDepartmentId = department_id || null;
      let resolvedServiceType = service_type || null;
      
      if (!resolvedDepartmentId && department) {
        const [deptRows] = await db.query('SELECT id FROM departments WHERE name LIKE ? LIMIT 1', [`%${department}%`]);
        if (deptRows.length > 0) resolvedDepartmentId = deptRows[0].id;
      }

      if (deal_id) {
        const [dealRows] = await db.query('SELECT department_id, service_category_id FROM deals WHERE id = ?', [deal_id]);
        if (dealRows.length > 0) {
          if (!resolvedDepartmentId) resolvedDepartmentId = dealRows[0].department_id;
          if (!resolvedServiceType && dealRows[0].service_category_id) {
            const [cat] = await db.query('SELECT name FROM service_categories WHERE id = ?', [dealRows[0].service_category_id]);
            if (cat.length > 0) resolvedServiceType = cat[0].name;
          }
        }
      }
      if (!resolvedDepartmentId && resolvedServiceType) {
        const [cat] = await db.query('SELECT suggested_department_id FROM service_categories WHERE name = ?', [resolvedServiceType]);
        if (cat.length > 0) resolvedDepartmentId = cat[0].suggested_department_id;
      }

      let workflowType = 'Standard';
      if (department === 'IT' || project_type === 'IT' || resolvedServiceType === 'IT') {
        workflowType = 'IT';
      } else if (department === 'Marketing' || project_type === 'Marketing' || resolvedServiceType === 'Marketing') {
        workflowType = 'Marketing';
      }

      // Connection handled by db.query
      const [result] = await db.query(
        `INSERT INTO projects (title, name, description, status, company_id, priority, budget, due_date, start_date, parent_project_id, department_id, deal_id, created_by, progress, spent, manager_id, team_id, workflow_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          title || name || null,
          name || title || null,
          description || null,
          status || 'Planning',
          company_id || null,
          priority || 'Medium',
          budget || 0,
          due_date || null,
          start_date || null,
          parent_project_id || null,
          resolvedDepartmentId || null,
          deal_id || null,
          created_by || null,
          progress || 0,
          spent || 0,
          manager_id || null,
          team_id !== undefined ? team_id : null,
          workflowType
        ]
      );

      const projectId = result.insertId;
      const code = `PRJ-${new Date().getFullYear()}-${String(projectId).padStart(4, '0')}`;
      await db.query('UPDATE projects SET project_id_code = ? WHERE id = ?', [code, projectId]);

      // Automated Task Generation based on service_type or department
      if (resolvedServiceType || resolvedDepartmentId) {
        await generateProjectTasks(db, projectId, { serviceType: resolvedServiceType, departmentId: resolvedDepartmentId });
      }

      const [project] = await db.query('SELECT * FROM projects WHERE id = ?', [projectId]);
      return res.status(201).json(project[0]);
    } catch (err) {
      responseError(res, 500, 'Failed to create project', err);
    }
  });

  app.get('/api/projects/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const query = `
        SELECT 
          p.*, 
          COALESCE(c.company_name, dc.company_name) AS company_name,
          u.first_name AS manager_first_name,
          u.last_name AS manager_last_name,
          u.avatar AS manager_avatar,
          t.name AS team_name,
          (SELECT COUNT(*) FROM general_tasks WHERE project_id = p.id) AS total_tasks,
          (SELECT COUNT(*) FROM general_tasks WHERE project_id = p.id AND status = 'Completed') AS completed_tasks,
          (SELECT COUNT(*) FROM general_tasks WHERE project_id = p.id AND status = 'To Do') AS todo_tasks,
          (SELECT COUNT(*) FROM general_tasks WHERE project_id = p.id AND status = 'In Progress') AS in_progress_tasks,
          (SELECT COUNT(*) FROM general_tasks WHERE project_id = p.id AND status = 'Review') AS review_tasks,
          (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', tm.user_id, 'first_name', tu.first_name, 'last_name', tu.last_name, 'avatar', tu.avatar)) 
           FROM project_team tm
           JOIN users tu ON tm.user_id = tu.id
           WHERE tm.project_id = p.id) AS team_members,
          dept.name AS department_name,
          sc.name AS service_name,
          d.deal_name AS deal_name
        FROM projects p
        LEFT JOIN companies c ON p.company_id = c.id
        LEFT JOIN deals d ON p.deal_id = d.id
        LEFT JOIN companies dc ON d.company_id = dc.id
        LEFT JOIN users u ON p.manager_id = u.id
        LEFT JOIN teams t ON p.team_id = t.id
        LEFT JOIN departments dept ON p.department_id = dept.id
        LEFT JOIN service_categories sc ON d.service_category_id = sc.id
        WHERE p.id = ?
      `;
      const [projects] = await db.query(query, [id]);
      if (projects.length === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // A client can buy several services on one deal (SEO + PPC + Social Media...).
      // Surface that whole list so the project shows the client's full engagement.
      const project = projects[0];
      project.client_services = [];
      if (project.deal_id) {
        const [dealRows] = await db.query('SELECT services FROM deals WHERE id = ?', [project.deal_id]);
        if (dealRows.length > 0 && dealRows[0].services) {
          try {
            const parsed = typeof dealRows[0].services === 'string'
              ? JSON.parse(dealRows[0].services)
              : dealRows[0].services;
            if (Array.isArray(parsed)) project.client_services = parsed.filter(Boolean);
          } catch (e) { /* leave empty, service_name below still applies */ }
        }
      }
      if (project.client_services.length === 0 && project.service_name) {
        project.client_services = [project.service_name];
      }

      return res.json(project);
    } catch (err) {
      responseError(res, 500, 'Failed to fetch project details', err);
    }
  });

  app.put('/api/projects/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { title, name, description, status, company_id, company_name, company, priority, budget, due_date, start_date, progress, spent, manager_id, team_id } = req.body;

      let finalCompanyId = company_id || null;
      if (!finalCompanyId && (company_name || company)) {
        const cName = company_name || company;
        const [comp] = await db.query('SELECT id FROM companies WHERE company_name = ? LIMIT 1', [cName]);
        if (comp.length > 0) finalCompanyId = comp[0].id;
      }
      if (!finalCompanyId) {
        const [proj] = await db.query('SELECT deal_id, company_id FROM projects WHERE id = ?', [id]);
        if (proj.length > 0) {
          if (proj[0].company_id) {
            finalCompanyId = proj[0].company_id;
          } else if (proj[0].deal_id) {
            const [d] = await db.query('SELECT company_id FROM deals WHERE id = ?', [proj[0].deal_id]);
            if (d.length > 0 && d[0].company_id) finalCompanyId = d[0].company_id;
          }
        }
      }

      // Connection handled by db.query
      await db.query(
        `UPDATE projects SET 
          title = ?, name = ?, description = ?, status = ?, company_id = ?, 
          priority = ?, budget = ?, due_date = ?, start_date = ?, 
          progress = ?, spent = ?, manager_id = ?, team_id = ?, updated_at = NOW() 
         WHERE id = ?`,
        [
          title || name || null, 
          name || title || null, 
          description || null, 
          status || 'Planning', 
          finalCompanyId,
          priority || 'Medium',
          budget || 0,
          due_date || null,
          start_date || null,
          progress || 0,
          spent || 0,
          manager_id || null,
          team_id !== undefined ? team_id : null,
          id
        ]
      );

      const [project] = await db.query('SELECT * FROM projects WHERE id = ?', [id]);
      return res.json(project[0]);
    } catch (err) {
      responseError(res, 500, 'Failed to update project', err);
    }
  });

  app.delete('/api/projects/:id', async (req, res) => {
    try {
      const { id } = req.params;
      // Connection handled by db.query
      await db.query('DELETE FROM projects WHERE id = ?', [id]);
      return res.json({ success: true, message: 'Project deleted successfully' });
    } catch (err) {
      responseError(res, 500, 'Failed to delete project', err);
    }
  });

  /*
  app.get('/api/projects/:projectId/tasks', async (req, res) => {
    try {
      const { projectId } = req.params;
      const query = `
        SELECT t.*, u.first_name, u.last_name, u.avatar
        FROM general_tasks t
        LEFT JOIN users u ON t.assigned_to = u.id
        WHERE t.project_id = ?
        ORDER BY t.created_at DESC
      `;
      const [tasks] = await db.query(query, [projectId]);
      return res.json(tasks);
    } catch (err) {
      responseError(res, 500, 'Failed to fetch project tasks', err);
    }
  });
  */

};

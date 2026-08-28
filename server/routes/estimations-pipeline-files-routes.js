module.exports = function setupEstimationsPipelineFilesRoutes(app, pool) {

  async function getConnection() {
    try {
      const connection = await pool.getConnection();
      if (!connection) throw new Error('Pool returned undefined connection');
      return connection;
    } catch (err) {
      console.error('Database connection pool error:', err.message);
      throw err;
    }
  }

  const responseError = (res, statusCode, message, error) => {
    console.error(`Error: ${message}`, error?.message || error);
    return res.status(statusCode).json({ error: message, details: error?.message || error });
  };

  app.post('/api/estimations/:estimationId/items', async (req, res) => {
    let connection;
    try {
      const { estimationId } = req.params;
      const { item_name, description, quantity, rate, discount_percent, tax_percent } = req.body;

      connection = await getConnection();
      const discount_amount = (quantity * rate * (discount_percent || 0)) / 100;
      const subtotal = quantity * rate - discount_amount;
      const tax_amount = (subtotal * (tax_percent || 0)) / 100;
      const total = subtotal + tax_amount;

      const [result] = await connection.query(`
        INSERT INTO estimation_line_items 
        (estimation_id, item_name, description, quantity, rate, discount_percent, discount_amount, tax_percent, tax_amount, subtotal, total)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [estimationId, item_name, description || null, quantity, rate, discount_percent || 0, discount_amount, tax_percent || 0, tax_amount, subtotal, total]);

      res.status(201).json({
        message: 'Estimation item added successfully',
        id: result.insertId
      });
    } catch (error) {
      responseError(res, 500, 'Failed to add estimation item', error);
    } finally {
      if (connection) connection.release();
    }
  });

  app.get('/api/estimations/:estimationId/items', async (req, res) => {
    let connection;
    try {
      const { estimationId } = req.params;
      connection = await getConnection();

      const [items] = await connection.query(`
        SELECT * FROM estimation_line_items 
        WHERE estimation_id = ?
        ORDER BY created_at ASC
      `, [estimationId]);

      res.json(items);
    } catch (error) {
      responseError(res, 500, 'Failed to fetch estimation items', error);
    } finally {
      if (connection) connection.release();
    }
  });

  app.delete('/api/estimation-items/:id', async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      connection = await getConnection();
      await connection.query('DELETE FROM estimation_line_items WHERE id = ?', [id]);
      res.json({ message: 'Estimation item deleted successfully' });
    } catch (error) {
      responseError(res, 500, 'Failed to delete estimation item', error);
    } finally {
      if (connection) connection.release();
    }
  });

  // Convert Estimation to Proposal
  app.post('/api/estimations/:id/convert-to-proposal', async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      connection = await getConnection();

      const [estimations] = await connection.query('SELECT * FROM estimations WHERE id = ?', [id]);
      if (!estimations.length) {
        return res.status(404).json({ error: 'Estimation not found' });
      }
      const est = estimations[0];

      const proposalNumber = `PROP-${Date.now().toString().slice(-6)}`;
      const title = req.body.title || `Proposal for ${est.estimation_number}`;

      const [propResult] = await connection.query(`
        INSERT INTO proposals (proposal_number, title, client_id, contact_id, deal_id, total_amount, currency, proposal_date, validity_date, status, description, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 30 DAY), 'Draft', ?, ?)
      `, [
        proposalNumber,
        title,
        est.client_id || null,
        est.contact_id || null,
        est.deal_id || null,
        est.amount || est.total || 0,
        est.currency || 'INR',
        est.description || `Converted from Estimation ${est.estimation_number}`,
        est.estimate_by || 1
      ]);

      // Update estimation status to Accepted if it was Draft or Sent
      if (est.status !== 'Accepted') {
        await connection.query("UPDATE estimations SET status = 'Accepted', updated_at = NOW() WHERE id = ?", [id]);
      }

      // Log activity
      try {
        await connection.query(`
          INSERT INTO activities (activity_type, title, description, company_id, deal_id, created_by)
          VALUES ('Note', ?, ?, ?, ?, ?)
        `, [
          `Converted Estimation ${est.estimation_number} to Proposal`,
          `Proposal ${proposalNumber} created from Estimation #${est.estimation_number}`,
          est.client_id || null,
          est.deal_id || null,
          est.estimate_by || 1
        ]);
      } catch (actErr) {
        console.warn('Activity log failed (non-critical):', actErr.message);
      }

      res.status(201).json({
        message: 'Successfully converted estimation to proposal',
        proposalId: propResult.insertId,
        proposalNumber: proposalNumber
      });
    } catch (error) {
      responseError(res, 500, 'Failed to convert estimation to proposal', error);
    } finally {
      if (connection) connection.release();
    }
  });

  // Duplicate Estimation
  app.post('/api/estimations/:id/duplicate', async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      connection = await getConnection();

      const [estimations] = await connection.query('SELECT * FROM estimations WHERE id = ?', [id]);
      if (!estimations.length) {
        return res.status(404).json({ error: 'Estimation not found' });
      }
      const est = estimations[0];

      const newEstNumber = `EST-${Date.now().toString().slice(-6)}`;

      const [estResult] = await connection.query(`
        INSERT INTO estimations 
        (estimation_number, client_id, lead_id, deal_id, contact_id, project_id, version, amount, currency, estimate_date, expiry_date, status, description, bill_to, ship_to, tags, estimate_by, discount_percentage, discount_amount, tax_percentage, tax_amount, subtotal, total)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 30 DAY), 'Draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        newEstNumber, est.client_id || null, est.lead_id || null, est.deal_id || null, est.contact_id || null, est.project_id || null,
        est.amount || 0, est.currency || 'INR', est.description ? `(Copy) ${est.description}` : 'Copy of estimation',
        est.bill_to || null, est.ship_to || null, est.tags ? JSON.stringify(est.tags) : null, est.estimate_by || 1,
        est.discount_percentage || 0, est.discount_amount || 0, est.tax_percentage || 0, est.tax_amount || 0,
        est.subtotal || 0, est.total || est.amount || 0
      ]);

      const newEstId = estResult.insertId;

      // Copy line items
      const [items] = await connection.query('SELECT * FROM estimation_line_items WHERE estimation_id = ?', [id]);
      for (const item of items) {
        await connection.query(`
          INSERT INTO estimation_line_items 
          (estimation_id, item_name, description, quantity, rate, discount_percent, discount_amount, tax_percent, tax_amount, subtotal, total)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [newEstId, item.item_name, item.description, item.quantity, item.rate, item.discount_percent, item.discount_amount, item.tax_percent, item.tax_amount, item.subtotal, item.total]);
      }

      const [newEst] = await connection.query('SELECT * FROM estimations WHERE id = ?', [newEstId]);
      res.status(201).json({
        message: 'Estimation duplicated successfully',
        estimation: newEst[0]
      });
    } catch (error) {
      responseError(res, 500, 'Failed to duplicate estimation', error);
    } finally {
      if (connection) connection.release();
    }
  });

  // Revise Estimation (Create new version)
  app.post('/api/estimations/:id/revise', async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      connection = await getConnection();

      const [estimations] = await connection.query('SELECT * FROM estimations WHERE id = ?', [id]);
      if (!estimations.length) {
        return res.status(404).json({ error: 'Estimation not found' });
      }
      const est = estimations[0];

      // Mark current estimation as Revised
      await connection.query("UPDATE estimations SET status = 'Revised', updated_at = NOW() WHERE id = ?", [id]);

      const nextVersion = (est.version || 1) + 1;
      const rootParentId = est.parent_id || est.id;

      const [estResult] = await connection.query(`
        INSERT INTO estimations 
        (estimation_number, client_id, lead_id, deal_id, contact_id, project_id, parent_id, version, amount, currency, estimate_date, expiry_date, status, description, bill_to, ship_to, tags, estimate_by, discount_percentage, discount_amount, tax_percentage, tax_amount, subtotal, total)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 30 DAY), 'Draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        est.estimation_number, est.client_id || null, est.lead_id || null, est.deal_id || null, est.contact_id || null, est.project_id || null,
        rootParentId, nextVersion, est.amount || 0, est.currency || 'INR',
        req.body.description || est.description || `Revision v${nextVersion} of ${est.estimation_number}`,
        est.bill_to || null, est.ship_to || null, est.tags ? JSON.stringify(est.tags) : null, est.estimate_by || 1,
        est.discount_percentage || 0, est.discount_amount || 0, est.tax_percentage || 0, est.tax_amount || 0,
        est.subtotal || 0, est.total || est.amount || 0
      ]);

      const newEstId = estResult.insertId;

      // Copy items to new revision
      const [items] = await connection.query('SELECT * FROM estimation_line_items WHERE estimation_id = ?', [id]);
      for (const item of items) {
        await connection.query(`
          INSERT INTO estimation_line_items 
          (estimation_id, item_name, description, quantity, rate, discount_percent, discount_amount, tax_percent, tax_amount, subtotal, total)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [newEstId, item.item_name, item.description, item.quantity, item.rate, item.discount_percent, item.discount_amount, item.tax_percent, item.tax_amount, item.subtotal, item.total]);
      }

      const [newRev] = await connection.query('SELECT * FROM estimations WHERE id = ?', [newEstId]);
      res.status(201).json({
        message: `Revision v${nextVersion} created successfully`,
        estimation: newRev[0]
      });
    } catch (error) {
      responseError(res, 500, 'Failed to revise estimation', error);
    } finally {
      if (connection) connection.release();
    }
  });

  // Get Revision History for an Estimation
  app.get('/api/estimations/:id/revisions', async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      connection = await getConnection();

      const [currentEst] = await connection.query('SELECT * FROM estimations WHERE id = ?', [id]);
      if (!currentEst.length) {
        return res.status(404).json({ error: 'Estimation not found' });
      }

      const rootId = currentEst[0].parent_id || currentEst[0].id;
      const number = currentEst[0].estimation_number;

      const [revisions] = await connection.query(`
        SELECT e.*, c.company_name as client_name, u.first_name as creator_first_name, u.last_name as creator_last_name
        FROM estimations e
        LEFT JOIN companies c ON e.client_id = c.id
        LEFT JOIN users u ON e.estimate_by = u.id
        WHERE e.id = ? OR e.parent_id = ? OR e.estimation_number = ?
        ORDER BY e.version ASC, e.created_at ASC
      `, [rootId, rootId, number]);

      res.json(revisions);
    } catch (error) {
      responseError(res, 500, 'Failed to fetch revision history', error);
    } finally {
      if (connection) connection.release();
    }
  });

  // Get Activity Timeline for Estimation
  app.get('/api/estimations/:id/activities', async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      connection = await getConnection();

      const [est] = await connection.query('SELECT * FROM estimations WHERE id = ?', [id]);
      if (!est.length) {
        return res.status(404).json({ error: 'Estimation not found' });
      }

      const estimation = est[0];
      const activities = [
        {
          id: `act-created-${id}`,
          title: `Estimation Created (${estimation.estimation_number} v${estimation.version || 1})`,
          type: 'Created',
          created_at: estimation.created_at,
          user_name: 'Sales Estimator'
        }
      ];

      if (estimation.updated_at && estimation.updated_at !== estimation.created_at) {
        activities.push({
          id: `act-updated-${id}`,
          title: `Status set to ${estimation.status}`,
          type: 'StatusChange',
          created_at: estimation.updated_at,
          user_name: 'Sales Manager'
        });
      }

      res.json(activities);
    } catch (error) {
      responseError(res, 500, 'Failed to fetch activities', error);
    } finally {
      if (connection) connection.release();
    }
  });

  app.get('/api/pipeline-stages', async (req, res) => {
    let connection;
    try {
      connection = await getConnection();
      const [stages] = await connection.query(`
        SELECT * FROM pipeline_stages 
        ORDER BY position ASC
      `);
      res.json(stages);
    } catch (error) {
      responseError(res, 500, 'Failed to fetch pipeline stages', error);
    } finally {
      if (connection) connection.release();
    }
  });

  app.post('/api/pipeline-stages', async (req, res) => {
    let connection;
    try {
      const { name, pipeline_id, position, description, probability } = req.body;
      connection = await getConnection();

      const [result] = await connection.query(`
        INSERT INTO pipeline_stages (name, probability, pipeline_id, position, description)
        VALUES (?, ?, ?, ?, ?)
      `, [name, probability || 10, pipeline_id || null, position || 0, description || null]);

      res.status(201).json({
        message: 'Pipeline stage created successfully',
        id: result.insertId
      });
    } catch (error) {
      responseError(res, 500, 'Failed to create pipeline stage', error);
    } finally {
      if (connection) connection.release();
    }
  });

  app.post('/api/entity-files', async (req, res) => {
    let connection;
    try {
      const { file_id, company_id, deal_id, contact_id, project_id, uploaded_by } = req.body;

      connection = await getConnection();
      const [result] = await connection.query(`
        INSERT INTO entity_files (file_id, company_id, deal_id, contact_id, project_id, uploaded_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [file_id, company_id || null, deal_id || null, contact_id || null, project_id || null, uploaded_by || null]);

      res.status(201).json({
        message: 'File association created successfully',
        id: result.insertId
      });
    } catch (error) {
      responseError(res, 500, 'Failed to associate file', error);
    } finally {
      if (connection) connection.release();
    }
  });

  app.get('/api/entity-files', async (req, res) => {
    let connection;
    try {
      const { company_id, deal_id, contact_id, project_id } = req.query;
      connection = await getConnection();

      let query = `
        SELECT ef.*, f.name, f.file_type, f.size_bytes, u.first_name as uploaded_by_name
        FROM entity_files ef
        JOIN files f ON ef.file_id = f.id
        LEFT JOIN users u ON ef.uploaded_by = u.id
        WHERE 1=1
      `;
      const params = [];

      if (company_id) {
        query += ' AND ef.company_id = ?';
        params.push(company_id);
      }
      if (deal_id) {
        query += ' AND ef.deal_id = ?';
        params.push(deal_id);
      }
      if (contact_id) {
        query += ' AND ef.contact_id = ?';
        params.push(contact_id);
      }
      if (project_id) {
        query += ' AND ef.project_id = ?';
        params.push(project_id);
      }

      query += ' ORDER BY ef.created_at DESC';

      const [files] = await connection.query(query, params);
      res.json(files);
    } catch (error) {
      responseError(res, 500, 'Failed to fetch entity files', error);
    } finally {
      if (connection) connection.release();
    }
  });

  app.delete('/api/entity-files/:id', async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      connection = await getConnection();
      await connection.query('DELETE FROM entity_files WHERE id = ?', [id]);
      res.json({ message: 'File association deleted successfully' });
    } catch (error) {
      responseError(res, 500, 'Failed to delete file association', error);
    } finally {
      if (connection) connection.release();
    }
  });

  app.get('/api/pipeline', async (req, res) => {
    let connection;
    try {
      connection = await getConnection();
      const [pipelines] = await connection.query(`
        SELECT * FROM pipeline 
        ORDER BY position ASC, created_at DESC
      `);
      res.json(pipelines);
    } catch (error) {
      responseError(res, 500, 'Failed to fetch pipelines', error);
    } finally {
      if (connection) connection.release();
    }
  });

  app.post('/api/pipeline', async (req, res) => {
    let connection;
    try {
      const { name, description, position, status } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: 'Pipeline name required' });
      }

      connection = await getConnection();
      const [result] = await connection.query(`
        INSERT INTO pipeline (name, description, position, status)
        VALUES (?, ?, ?, ?)
      `, [name, description || null, position || 0, status || 'Active']);

      const [pipeline] = await connection.query('SELECT * FROM pipeline WHERE id = ?', [result.insertId]);
      res.status(201).json(pipeline[0]);
    } catch (error) {
      responseError(res, 500, 'Failed to create pipeline', error);
    } finally {
      if (connection) connection.release();
    }
  });

  app.get('/api/pipeline/:id', async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      connection = await getConnection();
      const [pipelines] = await connection.query('SELECT * FROM pipeline WHERE id = ?', [id]);
      
      if (!pipelines.length) {
        return res.status(404).json({ error: 'Pipeline not found' });
      }

      res.json(pipelines[0]);
    } catch (error) {
      responseError(res, 500, 'Failed to fetch pipeline', error);
    } finally {
      if (connection) connection.release();
    }
  });

  app.put('/api/pipeline/:id', async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      const { name, description, position, status } = req.body;
      
      connection = await getConnection();
      await connection.query(`
        UPDATE pipeline 
        SET name = ?, description = ?, position = ?, status = ?, updated_at = NOW()
        WHERE id = ?
      `, [name || null, description || null, position || null, status || null, id]);

      const [pipeline] = await connection.query('SELECT * FROM pipeline WHERE id = ?', [id]);
      res.json(pipeline[0]);
    } catch (error) {
      responseError(res, 500, 'Failed to update pipeline', error);
    } finally {
      if (connection) connection.release();
    }
  });

  app.delete('/api/pipeline/:id', async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      connection = await getConnection();
      await connection.query('DELETE FROM pipeline WHERE id = ?', [id]);
      res.json({ message: 'Pipeline deleted successfully' });
    } catch (error) {
      responseError(res, 500, 'Failed to delete pipeline', error);
    } finally {
      if (connection) connection.release();
    }
  });

};

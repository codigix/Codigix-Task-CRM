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

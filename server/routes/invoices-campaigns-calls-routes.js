const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { generateEstimationNumber } = require('../middleware/helpers');
const nodemailer = require('nodemailer');

module.exports = function(app, pool) {
  
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

  app.get('/api/invoices', async (req, res) => {
    let connection;
    try {
      const { skip = 0, limit = 50, status, search } = req.query;
      connection = await getConnection();

      let query = `SELECT 
        i.*,
        c.company_name,
        c.company_name AS client_name,
        c.email AS company_email,
        c.phone AS company_phone,
        d.due_date as deal_due_date,
        d.expected_close_date as deal_expected_close_date
      FROM invoices i 
      LEFT JOIN companies c ON i.client_id = c.id 
      LEFT JOIN deals d ON i.deal_id = d.id
      WHERE 1=1`;
      const params = [];

      if (status) {
        query += ' AND i.status = ?';
        params.push(status);
      }

      if (search) {
        query += ' AND (i.invoice_number LIKE ? OR c.company_name LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm);
      }

      query += ' ORDER BY i.created_at DESC LIMIT ?, ?';
      params.push(parseInt(skip), parseInt(limit));

      const [invoices] = await connection.query(query, params);
      connection.release();

      console.log('📊 Raw invoices from DB:', JSON.stringify(invoices.slice(0, 2), null, 2));

      const processedInvoices = invoices.map(inv => {
        const processed = {
          ...inv,
          amount: inv.amount !== null && inv.amount !== undefined ? parseFloat(inv.amount) : 0,
          total: inv.total !== null && inv.total !== undefined ? parseFloat(inv.total) : (inv.amount !== null && inv.amount !== undefined ? parseFloat(inv.amount) : 0),
          amount_paid: inv.amount_paid !== null && inv.amount_paid !== undefined ? parseFloat(inv.amount_paid) : 0,
          open_till: inv.open_till || inv.deal_due_date || inv.deal_expected_close_date || null,
          invoice_date: inv.invoice_date || new Date().toISOString().split('T')[0]
        };
        return processed;
      });

      console.log('✅ Processed invoices (sample):', JSON.stringify(processedInvoices.slice(0, 2), null, 2));

      return res.json(processedInvoices);
    } catch (err) {
      responseError(res, 500, 'Failed to fetch invoices', err);
    } finally {
      if (connection) connection.release();
    }
  });

  app.post('/api/invoices', async (req, res) => {
    let connection;
    try {
      const { invoice_number, client_id, bill_to, ship_to, project_id, amount, currency, invoice_date, open_till, payment_method, status, description, subtotal, discount_percentage, tax_percentage, notes } = req.body;

      if (!invoice_number || !client_id) {
        return res.status(400).json({ error: 'Invoice number and client ID required' });
      }

      connection = await getConnection();
      const [result] = await connection.query(
        `INSERT INTO invoices (invoice_number, client_id, bill_to, ship_to, project_id, amount, currency, invoice_date, open_till, payment_method, status, description, subtotal, discount_percentage, tax_percentage, notes, total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [invoice_number, client_id, bill_to || null, ship_to || null, project_id || null, amount || 0, currency || 'USD', invoice_date || null, open_till || null, payment_method || null, status || 'Draft', description || null, subtotal || 0, discount_percentage || 0, tax_percentage || 0, notes || null, amount || 0]
      );

      const [invoice] = await connection.query(
        `SELECT i.*, c.company_name AS client_name, c.email AS company_email, c.phone AS company_phone 
         FROM invoices i 
         LEFT JOIN companies c ON i.client_id = c.id 
         WHERE i.id = ?`,
        [result.insertId]
      );
      connection.release();

      return res.status(201).json(invoice[0]);
    } catch (err) {
      responseError(res, 500, 'Failed to create invoice', err);
    } finally {
      if (connection) connection.release();
    }
  });

  app.get('/api/invoices/metrics/summary', async (req, res) => {
    let connection;
    try {
      connection = await getConnection();

      const [metrics] = await connection.query(
        'SELECT COUNT(*) as total_invoices, SUM(amount) as total_amount, AVG(amount) as avg_amount FROM invoices'
      );

      const [byStatus] = await connection.query(
        'SELECT status, COUNT(*) as count, SUM(amount) as total FROM invoices GROUP BY status'
      );

      connection.release();

      return res.json({
        summary: metrics[0],
        byStatus: byStatus
      });
    } catch (err) {
      responseError(res, 500, 'Failed to fetch invoice metrics', err);
    } finally {
      if (connection) connection.release();
    }
  });

  app.get('/api/invoices/status/breakdown', async (req, res) => {
    let connection;
    try {
      connection = await getConnection();

      const [breakdown] = await connection.query(
        'SELECT status, COUNT(*) as count, SUM(amount) as total FROM invoices GROUP BY status'
      );

      connection.release();

      return res.json(breakdown);
    } catch (err) {
      responseError(res, 500, 'Failed to fetch invoice breakdown', err);
    } finally {
      if (connection) connection.release();
    }
  });

  app.delete('/api/invoices/:id', async (req, res) => {
    let connection;
    try {
      const { id } = req.params;

      connection = await getConnection();
      
      await connection.query('DELETE FROM invoice_items WHERE invoice_id = ?', [id]);
      await connection.query('DELETE FROM invoices WHERE id = ?', [id]);

      connection.release();

      return res.json({ message: 'Invoice deleted successfully' });
    } catch (err) {
      responseError(res, 500, 'Failed to delete invoice', err);
    } finally {
      if (connection) connection.release();
    }
  });

  app.post('/api/invoices/:id/refund', async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      const { refund_amount, refund_date, reason } = req.body;

      if (!refund_amount) {
        return res.status(400).json({ error: 'Refund amount required' });
      }

      connection = await getConnection();
      
      const [invoice] = await connection.query('SELECT * FROM invoices WHERE id = ?', [id]);
      if (!invoice.length) {
        connection.release();
        return res.status(404).json({ error: 'Invoice not found' });
      }

      await connection.query(
        'UPDATE invoices SET status = ?, amount_paid = ?, payment_date = ? WHERE id = ?',
        ['Refunded', refund_amount * -1, refund_date || new Date(), id]
      );

      const [updatedInvoice] = await connection.query(
        'SELECT i.*, c.company_name as client_name FROM invoices i LEFT JOIN companies c ON i.client_id = c.id WHERE i.id = ?',
        [id]
      );

      connection.release();

      return res.json(updatedInvoice[0] || {});
    } catch (err) {
      responseError(res, 500, 'Failed to process refund', err);
    } finally {
      if (connection) connection.release();
    }
  });

  app.post('/api/invoices/:invoiceId/link-to-deal/:dealId', async (req, res) => {
    let connection;
    try {
      const { invoiceId, dealId } = req.params;

      connection = await getConnection();
      await connection.query(
        'UPDATE invoices SET project_id = ? WHERE id = ?',
        [dealId, invoiceId]
      );

      const [invoice] = await connection.query(
        'SELECT i.*, c.company_name as client_name FROM invoices i LEFT JOIN companies c ON i.client_id = c.id WHERE i.id = ?',
        [invoiceId]
      );

      connection.release();

      return res.json(invoice[0] || {});
    } catch (err) {
      responseError(res, 500, 'Failed to link invoice to deal', err);
    } finally {
      if (connection) connection.release();
    }
  });

  app.post('/api/invoices/:invoiceId/link-to-client/:clientId', async (req, res) => {
    let connection;
    try {
      const { invoiceId, clientId } = req.params;

      connection = await getConnection();
      await connection.query(
        'UPDATE invoices SET client_id = ? WHERE id = ?',
        [clientId, invoiceId]
      );

      const [invoice] = await connection.query(
        'SELECT i.*, c.company_name as client_name FROM invoices i LEFT JOIN companies c ON i.client_id = c.id WHERE i.id = ?',
        [invoiceId]
      );

      connection.release();

      return res.json(invoice[0] || {});
    } catch (err) {
      responseError(res, 500, 'Failed to link invoice to client', err);
    } finally {
      if (connection) connection.release();
    }
  });

  app.get('/api/companies/:companyId/invoices', async (req, res) => {
    let connection;
    try {
      const { companyId } = req.params;
      const { skip = 0, limit = 50, status } = req.query;

      connection = await getConnection();

      let query = 'SELECT i.*, c.company_name as client_name FROM invoices i LEFT JOIN companies c ON i.client_id = c.id WHERE i.client_id = ?';
      const params = [companyId];

      if (status) {
        query += ' AND i.status = ?';
        params.push(status);
      }

      query += ' ORDER BY i.created_at DESC LIMIT ?, ?';
      params.push(parseInt(skip), parseInt(limit));

      const [invoices] = await connection.query(query, params);
      connection.release();

      return res.json(invoices);
    } catch (err) {
      responseError(res, 500, 'Failed to fetch company invoices', err);
    } finally {
      if (connection) connection.release();
    }
  });

  app.get('/api/deals/:dealId/invoices', async (req, res) => {
    let connection;
    try {
      const { dealId } = req.params;
      const { skip = 0, limit = 50, status } = req.query;

      connection = await getConnection();

      let query = 'SELECT i.*, c.company_name as client_name FROM invoices i LEFT JOIN companies c ON i.client_id = c.id WHERE i.project_id = ?';
      const params = [dealId];

      if (status) {
        query += ' AND i.status = ?';
        params.push(status);
      }

      query += ' ORDER BY i.created_at DESC LIMIT ?, ?';
      params.push(parseInt(skip), parseInt(limit));

      const [invoices] = await connection.query(query, params);
      connection.release();

      return res.json(invoices);
    } catch (err) {
      responseError(res, 500, 'Failed to fetch deal invoices', err);
    } finally {
      if (connection) connection.release();
    }
  });

  app.get('/api/invoices/:id/items', async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      connection = await getConnection();

      const [items] = await connection.query(
        'SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id ASC',
        [id]
      );
      connection.release();

      return res.json(items || []);
    } catch (err) {
      responseError(res, 500, 'Failed to fetch invoice items', err);
    } finally {
      if (connection) connection.release();
    }
  });

  app.post('/api/invoices/:id/items', async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      const { item_name, description, quantity, rate, price, discount, discount_percentage, tax, tax_percentage } = req.body;

      if (!item_name && !description) {
        return res.status(400).json({ error: 'Item name or description required' });
      }

      const itemPrice = rate || price || 0;
      const itemQuantity = quantity || 1;
      const itemAmount = itemPrice * itemQuantity;

      connection = await getConnection();
      const [result] = await connection.query(
        'INSERT INTO invoice_items (invoice_id, item_name, description, quantity, price, discount_percentage, tax_percentage, amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, item_name || null, description || null, itemQuantity, itemPrice, discount_percentage || 0, tax_percentage || 0, itemAmount]
      );

      const [item] = await connection.query('SELECT * FROM invoice_items WHERE id = ?', [result.insertId]);
      connection.release();

      return res.status(201).json(item[0]);
    } catch (err) {
      responseError(res, 500, 'Failed to create invoice item', err);
    } finally {
      if (connection) connection.release();
    }
  });

  app.put('/api/invoices/:invoiceId/items/:itemId', async (req, res) => {
    let connection;
    try {
      const { invoiceId, itemId } = req.params;
      const { item_name, description, quantity, rate, price, discount_percentage, tax_percentage } = req.body;

      const itemPrice = rate || price || 0;
      const itemQuantity = quantity || 1;
      const itemAmount = itemPrice * itemQuantity;

      connection = await getConnection();
      await connection.query(
        'UPDATE invoice_items SET item_name = ?, description = ?, quantity = ?, price = ?, discount_percentage = ?, tax_percentage = ?, amount = ? WHERE id = ? AND invoice_id = ?',
        [item_name || null, description || null, itemQuantity, itemPrice, discount_percentage || 0, tax_percentage || 0, itemAmount, itemId, invoiceId]
      );

      const [item] = await connection.query('SELECT * FROM invoice_items WHERE id = ?', [itemId]);
      connection.release();

      return res.json(item[0] || {});
    } catch (err) {
      responseError(res, 500, 'Failed to update invoice item', err);
    } finally {
      if (connection) connection.release();
    }
  });

  app.delete('/api/invoices/:invoiceId/items/:itemId', async (req, res) => {
    let connection;
    try {
      const { invoiceId, itemId } = req.params;

      connection = await getConnection();
      await connection.query('DELETE FROM invoice_items WHERE id = ? AND invoice_id = ?', [itemId, invoiceId]);
      connection.release();

      return res.json({ message: 'Invoice item deleted successfully' });
    } catch (err) {
      responseError(res, 500, 'Failed to delete invoice item', err);
    } finally {
      if (connection) connection.release();
    }
  });

  app.get('/api/invoices/:id', async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      connection = await getConnection();

      const [invoices] = await connection.query(
        `SELECT i.*, c.company_name, c.company_name as client_name, c.email as company_email, c.phone as company_phone,
                d.due_date as deal_due_date, d.expected_close_date as deal_expected_close_date
         FROM invoices i 
         LEFT JOIN companies c ON i.client_id = c.id 
         LEFT JOIN deals d ON i.deal_id = d.id
         WHERE i.id = ?`,
        [id]
      );
      connection.release();

      if (invoices.length === 0) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      const invoice = invoices[0];
      const processedInvoice = {
        ...invoice,
        amount: invoice.amount !== null && invoice.amount !== undefined ? parseFloat(invoice.amount) : 0,
        total: invoice.total !== null && invoice.total !== undefined ? parseFloat(invoice.total) : (invoice.amount !== null && invoice.amount !== undefined ? parseFloat(invoice.amount) : 0),
        amount_paid: invoice.amount_paid !== null && invoice.amount_paid !== undefined ? parseFloat(invoice.amount_paid) : 0,
        open_till: invoice.open_till || invoice.deal_due_date || invoice.deal_expected_close_date || null,
        invoice_date: invoice.invoice_date || new Date().toISOString().split('T')[0]
      };

      return res.json(processedInvoice);
    } catch (err) {
      responseError(res, 500, 'Failed to fetch invoice', err);
    } finally {
      if (connection) connection.release();
    }
  });

  app.put('/api/invoices/:id', async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      const { bill_to, ship_to, amount, status, payment_method, notes, amount_paid, payment_date, total, open_till, deal_id } = req.body;
      
      connection = await getConnection();
      await connection.query(
        'UPDATE invoices SET bill_to = ?, ship_to = ?, amount = ?, status = ?, payment_method = ?, notes = ?, amount_paid = ?, payment_date = ?, total = ?, open_till = ?, deal_id = ?, updated_at = NOW() WHERE id = ?',
        [bill_to || null, ship_to || null, amount || null, status || null, payment_method || null, notes || null, amount_paid || null, payment_date || null, total || amount || null, open_till || null, deal_id || null, id]
      );

      const [invoice] = await connection.query(
        `SELECT i.*, c.company_name as client_name, c.email as company_email, c.phone as company_phone,
                d.due_date as deal_due_date, d.expected_close_date as deal_expected_close_date
         FROM invoices i 
         LEFT JOIN companies c ON i.client_id = c.id 
         LEFT JOIN deals d ON i.deal_id = d.id
         WHERE i.id = ?`,
        [id]
      );
      connection.release();

      if (invoice.length === 0) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      const inv = invoice[0];
      const processedInvoice = {
        ...inv,
        amount: inv.amount !== null && inv.amount !== undefined ? parseFloat(inv.amount) : 0,
        total: inv.total !== null && inv.total !== undefined ? parseFloat(inv.total) : (inv.amount !== null && inv.amount !== undefined ? parseFloat(inv.amount) : 0),
        amount_paid: inv.amount_paid !== null && inv.amount_paid !== undefined ? parseFloat(inv.amount_paid) : 0,
        open_till: inv.open_till || inv.deal_due_date || inv.deal_expected_close_date || null,
        invoice_date: inv.invoice_date || new Date().toISOString().split('T')[0]
      };

      return res.json(processedInvoice);
    } catch (err) {
      responseError(res, 500, 'Failed to update invoice', err);
    } finally {
      if (connection) connection.release();
    }
  });

  app.get('/api/campaigns', async (req, res) => {
    let connection;
    try {
      const { skip = 0, limit = 50, status, search } = req.query;
      connection = await getConnection();

      let query = 'SELECT c.*, u.first_name as created_by_name FROM campaigns c LEFT JOIN users u ON c.created_by = u.id WHERE 1=1';
      const params = [];

      if (status) {
        query += ' AND c.status = ?';
        params.push(status);
      }

      if (search) {
        query += ' AND c.name LIKE ?';
        const searchTerm = `%${search}%`;
        params.push(searchTerm);
      }

      query += ' ORDER BY c.created_at DESC LIMIT ?, ?';
      params.push(parseInt(skip), parseInt(limit));

      const [campaigns] = await connection.query(query, params);
      connection.release();

      return res.json(campaigns);
    } catch (err) {
      responseError(res, 500, 'Failed to fetch campaigns', err);
    } finally {
      if (connection) connection.release();
    }
  });

  app.post('/api/campaigns', async (req, res) => {
    let connection;
    try {
      const { name, description, status, start_date, end_date, budget, currency, created_by } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Campaign name required' });
      }

      connection = await getConnection();
      const [result] = await connection.query(
        `INSERT INTO campaigns (name, description, status, start_date, end_date, budget, currency, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, description || null, status || 'Draft', start_date || null, end_date || null, budget || null, currency || 'USD', created_by || null]
      );

      const [campaign] = await connection.query(
        'SELECT c.*, u.first_name as created_by_name FROM campaigns c LEFT JOIN users u ON c.created_by = u.id WHERE c.id = ?',
        [result.insertId]
      );
      connection.release();

      return res.status(201).json(campaign[0]);
    } catch (err) {
      responseError(res, 500, 'Failed to create campaign', err);
    } finally {
      if (connection) connection.release();
    }
  });

  app.get('/api/campaigns/:id', async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      connection = await getConnection();

      const [campaigns] = await connection.query(
        'SELECT c.*, u.first_name as created_by_name FROM campaigns c LEFT JOIN users u ON c.created_by = u.id WHERE c.id = ?',
        [id]
      );
      connection.release();

      if (campaigns.length === 0) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      return res.json(campaigns[0]);
    } catch (err) {
      responseError(res, 500, 'Failed to fetch campaign', err);
    } finally {
      if (connection) connection.release();
    }
  });

  app.put('/api/campaigns/:id', async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      const { name, description, status, start_date, end_date, budget } = req.body;
      
      connection = await getConnection();
      await connection.query(
        'UPDATE campaigns SET name = ?, description = ?, status = ?, start_date = ?, end_date = ?, budget = ? WHERE id = ?',
        [name || null, description || null, status || null, start_date || null, end_date || null, budget || null, id]
      );

      const [campaign] = await connection.query(
        'SELECT c.*, u.first_name as created_by_name FROM campaigns c LEFT JOIN users u ON c.created_by = u.id WHERE c.id = ?',
        [id]
      );
      connection.release();

      return res.json(campaign[0]);
    } catch (err) {
      responseError(res, 500, 'Failed to update campaign', err);
    } finally {
      if (connection) connection.release();
    }
  });

  app.get('/api/call-history', async (req, res) => {
    let connection;
    try {
      const { skip = 0, limit = 100, call_type, call_direction, search } = req.query;
      connection = await getConnection();

      let query = 'SELECT * FROM call_history WHERE 1=1';
      const params = [];

      if (call_type) {
        query += ' AND call_type = ?';
        params.push(call_type);
      }

      if (call_direction) {
        query += ' AND call_direction = ?';
        params.push(call_direction);
      }

      if (search) {
        query += ' AND (caller_name LIKE ? OR phone_number LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm);
      }

      query += ' ORDER BY created_at DESC LIMIT ?, ?';
      params.push(parseInt(skip), parseInt(limit));

      const [calls] = await connection.query(query, params);
      connection.release();

      return res.json(calls);
    } catch (err) {
      responseError(res, 500, 'Failed to fetch call history', err);
    } finally {
      if (connection) connection.release();
    }
  });

  app.post('/api/call-history', async (req, res) => {
    let connection;
    try {
      const { caller_name, caller_email, phone_number, call_type, call_direction, duration, started_at, ended_at, meeting_link, notes, created_by } = req.body;

      if (!caller_name || !phone_number) {
        return res.status(400).json({ error: 'Caller name and phone number required' });
      }

      connection = await getConnection();
      const [result] = await connection.query(
        `INSERT INTO call_history (caller_name, caller_email, phone_number, call_type, call_direction, duration, started_at, ended_at, meeting_link, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [caller_name, caller_email || null, phone_number, call_type || 'Audio Call', call_direction || 'Outgoing', duration || 0, started_at || null, ended_at || null, meeting_link || null, notes || null, created_by || null]
      );

      const [call] = await connection.query('SELECT * FROM call_history WHERE id = ?', [result.insertId]);
      connection.release();

      return res.status(201).json(call[0]);
    } catch (err) {
      responseError(res, 500, 'Failed to create call history', err);
    } finally {
      if (connection) connection.release();
    }
  });

  app.get('/api/call-history/:id', async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      connection = await getConnection();

      const [calls] = await connection.query('SELECT * FROM call_history WHERE id = ?', [id]);
      connection.release();

      if (calls.length === 0) {
        return res.status(404).json({ error: 'Call history not found' });
      }

      return res.json(calls[0]);
    } catch (err) {
      responseError(res, 500, 'Failed to fetch call history', err);
    } finally {
      if (connection) connection.release();
    }
  });

  app.get('/api/contracts', async (req, res) => {
    let connection;
    try {
      const { skip = 0, limit = 50, status, search } = req.query;
      connection = await getConnection();

      let query = `SELECT c.*, co.company_name as client_name, d.deal_name, u.first_name as created_by_name 
                   FROM contracts c 
                   LEFT JOIN companies co ON c.client_id = co.id 
                   LEFT JOIN deals d ON c.deal_id = d.id 
                   LEFT JOIN users u ON c.created_by = u.id 
                   WHERE 1=1`;
      const params = [];

      if (status) {
        query += ' AND c.status = ?';
        params.push(status);
      }

      if (search) {
        query += ' AND (c.subject LIKE ? OR co.company_name LIKE ? OR d.deal_name LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      query += ' ORDER BY c.created_at DESC LIMIT ?, ?';
      params.push(parseInt(skip), parseInt(limit));

      const [contracts] = await connection.query(query, params);
      connection.release();

      return res.json(contracts);
    } catch (err) {
      responseError(res, 500, 'Failed to fetch contracts', err);
    } finally {
      if (connection) connection.release();
    }
  });

  app.post('/api/contracts', async (req, res) => {
    let connection;
    try {
      const { subject, start_date, end_date, client_id, deal_id, contract_type, contract_value, description, status, created_by, files } = req.body;

      if (!subject || !client_id || !contract_type) {
        return res.status(400).json({ error: 'Subject, client ID, and contract type required' });
      }

      const filesJson = files ? (typeof files === 'string' ? files : JSON.stringify(files)) : null;

      connection = await getConnection();
      const [result] = await connection.query(
        `INSERT INTO contracts (subject, start_date, end_date, client_id, deal_id, contract_type, contract_value, description, status, created_by, files)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [subject, start_date || null, end_date || null, client_id, deal_id || null, contract_type, contract_value || 0, description || null, status || 'Draft', created_by || null, filesJson]
      );

      const [contract] = await connection.query(
        `SELECT c.*, co.company_name as client_name, d.deal_name, u.first_name as created_by_name 
         FROM contracts c 
         LEFT JOIN companies co ON c.client_id = co.id 
         LEFT JOIN deals d ON c.deal_id = d.id 
         LEFT JOIN users u ON c.created_by = u.id 
         WHERE c.id = ?`,
        [result.insertId]
      );
      connection.release();

      return res.status(201).json(contract[0]);
    } catch (err) {
      responseError(res, 500, 'Failed to create contract', err);
    } finally {
      if (connection) connection.release();
    }
  });

  app.get('/api/contracts/:id', async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      connection = await getConnection();

      const [contracts] = await connection.query(
        `SELECT c.*, co.company_name as client_name, d.deal_name, u.first_name as created_by_name 
         FROM contracts c 
         LEFT JOIN companies co ON c.client_id = co.id 
         LEFT JOIN deals d ON c.deal_id = d.id 
         LEFT JOIN users u ON c.created_by = u.id 
         WHERE c.id = ?`,
        [id]
      );
      connection.release();

      if (contracts.length === 0) {
        return res.status(404).json({ error: 'Contract not found' });
      }

      return res.json(contracts[0]);
    } catch (err) {
      responseError(res, 500, 'Failed to fetch contract', err);
    } finally {
      if (connection) connection.release();
    }
  });

  app.put('/api/contracts/:id', async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      const { subject, start_date, end_date, contract_type, contract_value, description, status, deal_id, files } = req.body;
      const filesJson = files ? (typeof files === 'string' ? files : JSON.stringify(files)) : null;
      
      connection = await getConnection();
      await connection.query(
        'UPDATE contracts SET subject = ?, start_date = ?, end_date = ?, contract_type = ?, contract_value = ?, description = ?, status = ?, deal_id = COALESCE(?, deal_id), files = COALESCE(?, files) WHERE id = ?',
        [subject || null, start_date || null, end_date || null, contract_type || null, contract_value || null, description || null, status || null, deal_id || null, filesJson, id]
      );

      const [contract] = await connection.query(
        `SELECT c.*, co.company_name as client_name, d.deal_name, u.first_name as created_by_name 
         FROM contracts c 
         LEFT JOIN companies co ON c.client_id = co.id 
         LEFT JOIN deals d ON c.deal_id = d.id 
         LEFT JOIN users u ON c.created_by = u.id 
         WHERE c.id = ?`,
        [id]
      );
      connection.release();

      return res.json(contract[0]);
    } catch (err) {
      responseError(res, 500, 'Failed to update contract', err);
    } finally {
      if (connection) connection.release();
    }
  });

  app.delete('/api/contracts/:id', async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      connection = await getConnection();
      await connection.query('DELETE FROM contracts WHERE id = ?', [id]);
      connection.release();
      return res.json({ message: 'Contract deleted successfully' });
    } catch (err) {
      responseError(res, 500, 'Failed to delete contract', err);
    } finally {
      if (connection) connection.release();
    }
  });

  app.post('/api/contracts/:id/convert-to-estimation', async (req, res) => {
    let connection;
    try {
      const { id } = req.params;

      connection = await getConnection();
      
      const [contract] = await connection.query('SELECT * FROM contracts WHERE id = ?', [id]);
      if (!contract.length) {
        return res.status(404).json({ error: 'Contract not found' });
      }

      const contractData = contract[0];
      const estimationNumber = `EST-${Date.now()}`;
      const estimateDate = new Date().toISOString().split('T')[0];
      const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const amount = contractData.contract_value || 0;

      const [result] = await connection.query(
        `INSERT INTO estimations (estimation_number, client_id, amount, currency, estimate_date, expiry_date, status)
         VALUES (?, ?, ?, 'USD', ?, ?, 'Draft')`,
        [estimationNumber, contractData.client_id, amount, estimateDate, expiryDate]
      );

      connection.release();
      return res.status(201).json({ message: 'Contract converted to estimation successfully', id: result.insertId });
    } catch (err) {
      responseError(res, 500, 'Failed to convert contract to estimation', err);
    } finally {
      if (connection) connection.release();
    }
  });

  app.get('/api/estimations', async (req, res) => {
    let connection;
    try {
      const { skip = 0, limit = 50, status, search, deal_id, lead_id, client_id, user_id, role, department } = req.query;
      const headerUserId = req.headers['x-user-id'];
      const headerUserRole = req.headers['x-user-role'];
      let currentUserId = user_id || headerUserId;
      let currentUserRole = role || headerUserRole;

      if (currentUserId && !currentUserRole) {
        try {
          const [uRows] = await pool.query(
            'SELECT r.name as role_name FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = ?',
            [currentUserId]
          );
          if (uRows.length > 0) {
            currentUserRole = uRows[0].role_name;
          }
        } catch (e) {}
      }

      const isSuperAdmin = currentUserRole && (currentUserRole === 'Super Admin' || currentUserRole === 'Admin');
      const isManager = currentUserRole && currentUserRole.toLowerCase().includes('manager');

      connection = await getConnection();

      let query = `
        SELECT e.*, c.company_name as client_name, l.lead_name, l.owner_id as lead_owner_id,
               d.assignee_id as deal_assignee_id,
               u.first_name as creator_first_name, u.last_name as creator_last_name,
               p.name as project_name
        FROM estimations e 
        LEFT JOIN companies c ON e.client_id = c.id 
        LEFT JOIN leads l ON e.lead_id = l.id
        LEFT JOIN deals d ON e.deal_id = d.id
        LEFT JOIN users u ON e.estimate_by = u.id
        LEFT JOIN projects p ON e.project_id = p.id
        WHERE 1=1
      `;
      const params = [];

      // Role-based visibility: non-admin & non-manager users can ONLY see estimations created by them, or related to leads/deals assigned to them
      if (!isSuperAdmin && !isManager && currentUserId) {
        query += ' AND (e.estimate_by = ? OR l.owner_id = ? OR d.assignee_id = ?)';
        params.push(currentUserId, currentUserId, currentUserId);
      }
      const entityConditions = [];
      if (deal_id) {
        entityConditions.push('e.deal_id = ?');
        params.push(deal_id);
      }
      if (lead_id) {
        entityConditions.push('e.lead_id = ?');
        params.push(lead_id);
      }
      if (client_id) {
        entityConditions.push('e.client_id = ?');
        params.push(client_id);
      }

      if (entityConditions.length > 0) {
        query += ` AND (${entityConditions.join(' OR ')})`;
      }

      if (status) {
        query += ' AND e.status = ?';
        params.push(status);
      }

      if (search) {
        query += ' AND (e.estimation_number LIKE ? OR c.company_name LIKE ? OR l.lead_name LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      query += ' ORDER BY e.created_at DESC LIMIT ?, ?';
      params.push(parseInt(skip), parseInt(limit));

      const [estimations] = await connection.query(query, params);
      connection.release();

      return res.json(estimations);
    } catch (err) {
      responseError(res, 500, 'Failed to fetch estimations', err);
    } finally {
      if (connection) connection.release();
    }
  });

  app.post('/api/estimations', async (req, res) => {
    let connection;
    try {
      const { 
        estimation_number, client_id, lead_id, deal_id, contact_id, project_id, 
        parent_id, version, amount, currency, estimate_date, expiry_date, 
        status, description, bill_to, ship_to, tags, estimate_by, 
        discount_percentage, discount_amount,
        tax_percentage, tax_amount, subtotal, total
      } = req.body;

      connection = await getConnection();
      let finalEstimationNumber = estimation_number;
      const prefix = (estimation_number && estimation_number.startsWith('Q-')) ? 'Q' : 'EST';

      // If estimation_number is not provided, or it looks like the default starting number,
      // generate a fresh unique one to avoid "Duplicate entry" errors.
      if (!finalEstimationNumber || finalEstimationNumber.endsWith('-001')) {
        finalEstimationNumber = await generateEstimationNumber(pool, prefix);
      } else {
        // Check if finalEstimationNumber already exists in DB
        const [existing] = await connection.query('SELECT id FROM estimations WHERE estimation_number = ?', [finalEstimationNumber]);
        if (existing.length > 0) {
          const baseNum = finalEstimationNumber.split('-v')[0];
          const [allVers] = await connection.query('SELECT estimation_number FROM estimations WHERE estimation_number LIKE ?', [`${baseNum}%`]);
          let maxVer = 1;
          allVers.forEach(v => {
            const m = (v.estimation_number || '').match(/-v(\d+)$/);
            if (m) {
              const num = parseInt(m[1], 10);
              if (num >= maxVer) maxVer = num;
            }
          });
          finalEstimationNumber = `${baseNum}-v${maxVer + 1}`;
        }
      }

      if (!client_id && !lead_id) {
        return res.status(400).json({ error: 'Client ID or Lead ID required' });
      }
      const [result] = await connection.query(
        `INSERT INTO estimations (
          estimation_number, client_id, lead_id, deal_id, contact_id, project_id, 
          parent_id, version, amount, currency, estimate_date, expiry_date, 
          status, description, bill_to, ship_to, tags, estimate_by,
          discount_percentage, discount_amount,
          tax_percentage, tax_amount, subtotal, total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          finalEstimationNumber, client_id || null, lead_id || null, deal_id || null, contact_id || null, 
          project_id || null, parent_id || null, version || 1, amount || total || 0, currency || 'USD', 
          estimate_date || null, expiry_date || null, status || 'Draft', description || null,
          bill_to || null, ship_to || null, 
          tags ? (typeof tags === 'string' ? tags : JSON.stringify(tags)) : null,
          estimate_by || null, discount_percentage || 0, discount_amount || 0,
          tax_percentage || 0, tax_amount || 0, subtotal || 0, total || amount || 0
        ]
      );

      const estimationId = result.insertId;

      // Save line items (multiple services) if provided
      const rawItems = req.body.items || req.body.line_items;
      if (Array.isArray(rawItems) && rawItems.length > 0) {
        for (const item of rawItems) {
          const itemName = item.item_name || item.productName || item.product_name || item.name;
          if (itemName) {
            const qty = parseFloat(item.quantity) || 1;
            const rateVal = parseFloat(item.rate || item.price) || 0;
            const discPct = parseFloat(item.discount_percent || item.discount) || 0;
            const discAmt = (qty * rateVal * discPct) / 100;
            const itemSubtotal = qty * rateVal - discAmt;
            const taxPct = parseFloat(item.tax_percent || item.taxPercentage) || 0;
            const taxAmt = (itemSubtotal * taxPct) / 100;
            const itemTotal = itemSubtotal + taxAmt;

            await connection.query(`
              INSERT INTO estimation_line_items 
              (estimation_id, item_name, description, quantity, rate, discount_percent, discount_amount, tax_percent, tax_amount, subtotal, total)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              estimationId, 
              itemName, 
              item.description || null, 
              qty, 
              rateVal, 
              discPct, 
              discAmt, 
              taxPct, 
              taxAmt, 
              itemSubtotal, 
              itemTotal
            ]);
          }
        }
      }

      const [estimations] = await connection.query(`
        SELECT e.*, c.company_name as client_name, l.lead_name, d.deal_name, u.first_name, u.last_name, u.email as user_email, l.email as lead_email, l.phone as lead_phone
        FROM estimations e 
        LEFT JOIN companies c ON e.client_id = c.id 
        LEFT JOIN leads l ON e.lead_id = l.id
        LEFT JOIN deals d ON e.deal_id = d.id
        LEFT JOIN users u ON e.estimate_by = u.id
        WHERE e.id = ?`, [estimationId]
      );
      
      const est = estimations[0];

      if (status === 'Sent' || status === 'Accepted') {
        const finalAmount = amount || total || 0;
        
        if (status === 'Sent') {
          const targetStatus = (version > 1) ? 'Revised Quotation' : 'Quotation';
          if (deal_id) {
            await connection.query(
              'UPDATE deals SET pipeline = ?, deal_stage = ?, deal_value = ?, updated_at = NOW() WHERE id = ?',
              [targetStatus, targetStatus, finalAmount, deal_id]
            );
          }
          if (lead_id) {
            await connection.query(
              'UPDATE leads SET lead_status = ?, value = ?, updated_at = NOW() WHERE id = ?',
              [targetStatus, finalAmount, lead_id]
            );
          }
        } else if (status === 'Accepted') {
          if (deal_id) {
            await connection.query("UPDATE deals SET pipeline = 'Won', deal_stage = 'Won', status = 'Won', updated_at = NOW() WHERE id = ?", [deal_id]);
          }
          if (lead_id) {
            await connection.query("UPDATE leads SET lead_status = 'Won', updated_at = NOW() WHERE id = ?", [lead_id]);
          }
          if (client_id) {
            await connection.query("UPDATE companies SET status = 'Active', updated_at = NOW() WHERE id = ?", [client_id]);
          }
        }
      }

      if (status) {
        const createFollowup = async (isCompleted, type, subject, outcome, daysOffset = 0) => {
          const related_type = deal_id ? 'Deal' : (lead_id ? 'Lead' : 'Customer');
          const related_id = deal_id || lead_id || client_id;
          if (!related_id) return;
          
          const targetDate = new Date();
          targetDate.setDate(targetDate.getDate() + daysOffset);
          const dateStr = targetDate.toISOString().split('T')[0];
          
          await connection.query(`
            INSERT INTO followups 
            (related_type, related_id, type, subject, status, outcome, scheduled_date, scheduled_time, priority, assigned_to, assigned_to_name, assigned_to_email, client_email, client_phone, lead_id, deal_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, '10:00:00', 'Medium', ?, ?, ?, ?, ?, ?, ?)
          `, [
            related_type, related_id, type, subject, 
            isCompleted ? 'Completed' : 'Scheduled', 
            outcome || null, dateStr,
            estimate_by, 
            (est?.first_name ? `${est.first_name} ${est.last_name || ''}` : null),
            est?.user_email || null,
            est?.lead_email || null,
            est?.lead_phone || null,
            lead_id, deal_id
          ]);
        };

        if (status === 'Sent') {
          await createFollowup(true, 'Email', `Quotation Sent (Ver: ${version || 1}, Amount: ₹${amount || total || 0})`, 'Sent');
          await createFollowup(false, 'Call', `Follow-up on Sent Quotation (${finalEstimationNumber || 'No.'})`, null, 2);
        } else if (status === 'Revised') {
          await createFollowup(true, 'Task', `Quotation Revision Sent (Ver: ${version || 2}, Amount: ₹${amount || total || 0})`, 'Revised');
          await createFollowup(false, 'Call', `Follow-up on Revised Quotation (${finalEstimationNumber || 'No.'})`, null, 2);
        } else if (status === 'Accepted') {
          await createFollowup(true, 'Meeting', 'Quotation Accepted', 'Accepted');
        } else if (status === 'Declined') {
          await createFollowup(true, 'Meeting', 'Quotation Declined', 'Declined');
        }
      }

      connection.release();

      return res.status(201).json(est);
    } catch (err) {
      responseError(res, 500, 'Failed to create estimation', err);
    } finally {
      if (connection) connection.release();
    }
  });

  app.get('/api/estimations/:id', async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      connection = await getConnection();

      const [estimations] = await connection.query(
        `SELECT e.*, c.company_name as client_name, l.lead_name 
         FROM estimations e 
         LEFT JOIN companies c ON e.client_id = c.id 
         LEFT JOIN leads l ON e.lead_id = l.id
         WHERE e.id = ?`,
        [id]
      );

      if (estimations.length === 0) {
        return res.status(404).json({ error: 'Estimation not found' });
      }

      const est = estimations[0];
      const [items] = await connection.query('SELECT * FROM estimation_line_items WHERE estimation_id = ? ORDER BY id ASC', [id]);
      est.items = items || [];

      return res.json(est);
    } catch (err) {
      responseError(res, 500, 'Failed to fetch estimation', err);
    } finally {
      if (connection) connection.release();
    }
  });

  app.put('/api/estimations/:id', async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      const updates = req.body;
      
      connection = await getConnection();
      
      const fields = [];
      const values = [];
      
      // Map frontend field names to DB field names if necessary
      const fieldMap = {
        amount: 'amount',
        status: 'status',
        description: 'description',
        expiry_date: 'expiry_date',
        estimate_date: 'estimate_date',
        client_id: 'client_id',
        lead_id: 'lead_id',
        deal_id: 'deal_id',
        project_id: 'project_id',
        parent_id: 'parent_id',
        version: 'version',
        bill_to: 'bill_to',
        ship_to: 'ship_to',
        currency: 'currency',
        tags: 'tags',
        estimate_by: 'estimate_by'
      };

      for (const [key, value] of Object.entries(updates)) {
        if (fieldMap[key]) {
          fields.push(`${fieldMap[key]} = ?`);
          values.push(key === 'tags' && typeof value !== 'string' ? JSON.stringify(value) : value);
        }
      }

      if (fields.length === 0) {
        return res.status(400).json({ error: 'No valid fields provided for update' });
      }

      const [oldEstRows] = await connection.query('SELECT status FROM estimations WHERE id = ?', [id]);
      const oldStatus = oldEstRows.length > 0 ? oldEstRows[0].status : null;

      values.push(id);
      
      await connection.query(
        `UPDATE estimations SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`,
        values
      );

      // Update line items (multiple services) if provided
      const rawItems = updates.items || updates.line_items;
      if (Array.isArray(rawItems)) {
        await connection.query('DELETE FROM estimation_line_items WHERE estimation_id = ?', [id]);
        for (const item of rawItems) {
          const itemName = item.item_name || item.productName || item.product_name || item.name;
          if (itemName) {
            const qty = parseFloat(item.quantity) || 1;
            const rateVal = parseFloat(item.rate || item.price) || 0;
            const discPct = parseFloat(item.discount_percent || item.discount) || 0;
            const discAmt = (qty * rateVal * discPct) / 100;
            const itemSubtotal = qty * rateVal - discAmt;
            const taxPct = parseFloat(item.tax_percent || item.taxPercentage) || 0;
            const taxAmt = (itemSubtotal * taxPct) / 100;
            const itemTotal = itemSubtotal + taxAmt;

            await connection.query(`
              INSERT INTO estimation_line_items 
              (estimation_id, item_name, description, quantity, rate, discount_percent, discount_amount, tax_percent, tax_amount, subtotal, total)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              id, 
              itemName, 
              item.description || null, 
              qty, 
              rateVal, 
              discPct, 
              discAmt, 
              taxPct, 
              taxAmt, 
              itemSubtotal, 
              itemTotal
            ]);
          }
        }
      }

      if (updates.status && updates.status !== oldStatus) {
        const [estimations] = await connection.query(`
          SELECT e.*, c.company_name as client_name, l.lead_name, d.deal_name, u.first_name, u.last_name, u.email as user_email, l.email as lead_email, l.phone as lead_phone
          FROM estimations e 
          LEFT JOIN companies c ON e.client_id = c.id 
          LEFT JOIN leads l ON e.lead_id = l.id
          LEFT JOIN deals d ON e.deal_id = d.id
          LEFT JOIN users u ON e.estimate_by = u.id
          WHERE e.id = ?`, [id]
        );
        
        if (estimations.length > 0) {
          const est = estimations[0];
          
          // Legacy deal/lead status updates
          if (updates.status === 'Sent') {
            const targetStatus = (est.version > 1) ? 'Revised Quotation' : 'Quotation';
            if (est.deal_id) {
              await connection.query(
                'UPDATE deals SET pipeline = ?, deal_stage = ?, deal_value = ?, updated_at = NOW() WHERE id = ?',
                [targetStatus, targetStatus, est.amount, est.deal_id]
              );
            }
            if (est.lead_id) {
              await connection.query(
                'UPDATE leads SET lead_status = ?, value = ?, updated_at = NOW() WHERE id = ?',
                [targetStatus, est.amount, est.lead_id]
              );
            }
          } else if (updates.status === 'Accepted') {
            if (est.deal_id) {
              await connection.query(
                "UPDATE deals SET pipeline = 'Won', deal_stage = 'Won', status = 'Won', updated_at = NOW() WHERE id = ?", [est.deal_id]
              );
            }
            if (est.lead_id) {
              await connection.query(
                "UPDATE leads SET lead_status = 'Won', updated_at = NOW() WHERE id = ?", [est.lead_id]
              );
            }
            if (est.client_id) {
              await connection.query(
                "UPDATE companies SET status = 'Active', updated_at = NOW() WHERE id = ?", [est.client_id]
              );
            }
          }

          // Follow-up Automations
          const createFollowup = async (isCompleted, type, subject, outcome, daysOffset = 0) => {
            const related_type = est.deal_id ? 'Deal' : (est.lead_id ? 'Lead' : 'Customer');
            const related_id = est.deal_id || est.lead_id || est.client_id;
            if (!related_id) return;
            
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + daysOffset);
            const dateStr = targetDate.toISOString().split('T')[0];
            
            await connection.query(`
              INSERT INTO followups 
              (related_type, related_id, type, subject, status, outcome, scheduled_date, scheduled_time, priority, assigned_to, assigned_to_name, assigned_to_email, client_email, client_phone, lead_id, deal_id)
              VALUES (?, ?, ?, ?, ?, ?, ?, '10:00:00', 'Medium', ?, ?, ?, ?, ?, ?, ?)
            `, [
              related_type, related_id, type, subject, 
              isCompleted ? 'Completed' : 'Scheduled', 
              outcome || null, dateStr,
              est.estimate_by, 
              (est.first_name ? `${est.first_name} ${est.last_name || ''}` : null),
              est.user_email || null,
              est.lead_email || null,
              est.lead_phone || null,
              est.lead_id, est.deal_id
            ]);
          };

          if (updates.status === 'Sent') {
            await createFollowup(true, 'Email', `Quotation Sent (Ver: ${est.version || 1}, Amount: ₹${est.amount || est.total || 0})`, 'Sent');
            await createFollowup(false, 'Call', `Follow-up on Sent Quotation (${est.estimation_number || 'No.'})`, null, 2);
          } else if (updates.status === 'Revised') {
            await createFollowup(true, 'Task', `Quotation Revision Sent (Ver: ${est.version || 2}, Amount: ₹${est.amount || est.total || 0})`, 'Revised');
            await createFollowup(false, 'Call', `Follow-up on Revised Quotation (${est.estimation_number || 'No.'})`, null, 2);
          } else if (updates.status === 'Accepted') {
            await createFollowup(true, 'Meeting', 'Quotation Accepted', 'Accepted');
          } else if (updates.status === 'Declined') {
            await createFollowup(true, 'Meeting', 'Quotation Declined', 'Declined');
          }
        }
      }

      const [estimation] = await connection.query(
        `SELECT e.*, c.company_name as client_name, l.lead_name 
         FROM estimations e 
         LEFT JOIN companies c ON e.client_id = c.id 
         LEFT JOIN leads l ON e.lead_id = l.id
         WHERE e.id = ?`,
        [id]
      );
      connection.release();

      return res.json(estimation[0] || { id, ...updates });
    } catch (err) {
      responseError(res, 500, 'Failed to update estimation', err);
    } finally {
      if (connection) connection.release();
    }
  });

  app.post('/api/estimations/:id/finalize', async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      connection = await getConnection();
      
      const [estimations] = await connection.query('SELECT * FROM estimations WHERE id = ?', [id]);
      if (estimations.length === 0) {
        return res.status(404).json({ error: 'Estimation not found' });
      }
      
      const est = estimations[0];
      
      // Update linked Lead to Qualified/Converted if necessary
      if (est.lead_id) {
        await connection.query("UPDATE leads SET lead_status = 'Qualified' WHERE id = ?", [est.lead_id]);
      }
      
      // Update linked Deal stage if exists
      if (est.project_id) {
        // Find deal linked to project
        const [projects] = await connection.query('SELECT deal_id FROM projects WHERE id = ?', [est.project_id]);
        if (projects.length > 0 && projects[0].deal_id) {
          await connection.query("UPDATE deals SET deal_stage = 'Won', updated_at = NOW() WHERE id = ?", [projects[0].deal_id]);
        }
      }

      await connection.query("UPDATE estimations SET status = 'Finalized' WHERE id = ?", [id]);
      
      connection.release();
      return res.json({ success: true, message: 'Estimation finalized and records updated' });
    } catch (err) {
      responseError(res, 500, 'Failed to finalize estimation', err);
    } finally {
      if (connection) connection.release();
    }
  });

  app.post('/api/estimations/:id/send-email', async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      const { email: recipientEmail, pdfBase64 } = req.body;
      
      connection = await getConnection();

      // 1. Fetch Estimation Details
      const [estimations] = await connection.query(`
        SELECT e.*, 
               c.company_name as client_name, c.email as client_email,
               l.lead_name, l.email as lead_email,
               u.first_name as creator_name, u.email as creator_email
        FROM estimations e
        LEFT JOIN companies c ON e.client_id = c.id
        LEFT JOIN leads l ON e.lead_id = l.id
        LEFT JOIN users u ON e.estimate_by = u.id
        WHERE e.id = ?
      `, [id]);

      if (estimations.length === 0) {
        return res.status(404).json({ error: 'Quotation not found' });
      }

      const est = estimations[0];
      console.log('📄 Found Estimation:', {
        id: est.id,
        number: est.estimation_number,
        client_email: est.client_email,
        lead_email: est.lead_email
      });
      
      const targetEmail = recipientEmail || est.client_email || est.lead_email;
      console.log('🎯 Final Target Email:', targetEmail);

      if (!targetEmail) {
        return res.status(400).json({ error: 'Recipient email not found. Please provide an email address.' });
      }

      // 2. Fetch Line Items
      const [items] = await connection.query(`
        SELECT * FROM estimation_line_items WHERE estimation_id = ? ORDER BY id ASC
      `, [id]);

      // 3. Configure Nodemailer with optimized Gmail settings
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER || process.env.SMTP_USER,
          pass: (process.env.EMAIL_PASS || process.env.SMTP_PASS)?.trim() // Ensure no accidental spaces
        }
      });

      // 4. Build Email Content
      const currencySymbol = est.currency === 'USD' ? '$' : (est.currency === 'INR' ? '₹' : est.currency);
      const itemsHtml = items.map(item => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.item_name}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${currencySymbol}${parseFloat(item.rate).toLocaleString()}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${currencySymbol}${parseFloat(item.total).toLocaleString()}</td>
        </tr>
      `).join('');

      const emailHtml = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <!-- Header Bar -->
          <div style="background-color: #1F2D5A; padding: 24px 30px; text-align: left; color: #ffffff;">
            <div style="font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">Codigix Infotech</div>
            <div style="font-size: 12px; color: #93c5fd; margin-top: 4px;">Official Quotation</div>
          </div>

          <div style="padding: 30px; color: #334155; line-height: 1.6; font-size: 14px;">
            <p style="margin-top: 0; font-size: 15px; font-weight: 600; color: #0f172a;">
              Dear ${est.client_name || est.lead_name || 'Valued Client'},
            </p>

            <p style="color: #334155; margin-bottom: 20px;">
              Thank you for choosing <strong>Codigix Infotech</strong>. We are pleased to submit our official quotation <strong>#${est.estimation_number}</strong> for your review.
            </p>

            <!-- Highlight Box -->
            <div style="background-color: #f8fafc; border-left: 4px solid #1F2D5A; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">Quotation No:</span>
                <span style="font-size: 13px; font-weight: 700; color: #0f172a;">${est.estimation_number}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">Date:</span>
                <span style="font-size: 13px; font-weight: 600; color: #334155;">${new Date(est.estimate_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
              <div style="display: flex; justify-content: space-between; border-top: 1px dashed #cbd5e1; padding-top: 8px; margin-top: 8px;">
                <span style="font-size: 13px; font-weight: 700; color: #0f172a;">Total Quoted Amount:</span>
                <span style="font-size: 16px; font-weight: 800; color: #1F2D5A;">${currencySymbol} ${parseFloat(est.total || est.amount).toLocaleString('en-IN')}/-</span>
              </div>
            </div>

            <!-- Items Summary -->
            <p style="font-weight: 600; color: #0f172a; margin-bottom: 10px;">Services & Line Items Breakdown:</p>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px;">
              <thead>
                <tr style="background-color: #1F2D5A; color: #ffffff;">
                  <th style="padding: 10px 12px; text-align: left;">Item / Service</th>
                  <th style="padding: 10px 12px; text-align: center; width: 60px;">Qty</th>
                  <th style="padding: 10px 12px; text-align: right; width: 120px;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <!-- Attachment Callout -->
            <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px;">
              <div style="font-weight: 700; color: #1e40af; font-size: 13px; margin-bottom: 2px;">📎 Official PDF Attachment Included</div>
              <div style="font-size: 12px; color: #3b82f6;">Your complete branded PDF quotation file (<strong>Quotation-${est.estimation_number}.pdf</strong>) has been attached to this email for downloading and printing.</div>
            </div>

            <p style="color: #475569;">
              If you have any questions or require any adjustments, please feel free to reply directly to this email.
            </p>

            <p style="color: #475569; margin-top: 24px;">
              Warm regards,<br>
              <strong style="color: #0f172a;">${est.creator_name || 'Codigix Infotech Sales Team'}</strong><br>
              <span style="font-size: 12px; color: #64748b;">Codigix Infotech | +91 7066556768</span>
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f1f5f9; padding: 16px 30px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
            Office 309, Bramha Sky Uzuri, Pimpri Chowk, Pimpri - 18 | Codigixinfotech@gmail.com
          </div>
        </div>
      `;

      // Build Attachments array
      const attachments = [];
      if (pdfBase64) {
        const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '');
        attachments.push({
          filename: `Quotation-${est.estimation_number || id}.pdf`,
          content: Buffer.from(cleanBase64, 'base64'),
          contentType: 'application/pdf'
        });
      } else {
        try {
          const PDFDocument = require('pdfkit');
          const pdfBuf = await new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 40, size: 'A4' });
            const buffers = [];
            doc.on('data', b => buffers.push(b));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', err => reject(err));

            const currencySymbol = est.currency === 'USD' ? '$' : (est.currency === 'INR' ? '₹' : est.currency);

            doc.rect(0, 0, 595, 12).fill('#1F2D5A');

            doc.fillColor('#1F2D5A').fontSize(22).font('Helvetica-Bold').text('CODIGIX INFOTECH', 40, 35);
            doc.fillColor('#64748B').fontSize(9).font('Helvetica').text('Office 309, Bramha Sky Uzuri, Pimpri Chowk, Pimpri - 18', 40, 62);
            doc.text('Phone: +91 7066556768 | Email: Codigixinfotech@gmail.com', 40, 75);

            doc.fillColor('#1F2D5A').fontSize(20).font('Helvetica-Bold').text('QUOTATION', 400, 35, { align: 'right' });
            doc.fillColor('#334155').fontSize(10).font('Helvetica-Bold').text(`No: ${est.estimation_number || est.id}`, 400, 62, { align: 'right' });
            doc.fillColor('#64748B').fontSize(9).font('Helvetica').text(`Date: ${new Date(est.estimate_date || Date.now()).toLocaleDateString('en-GB')}`, 400, 75, { align: 'right' });

            doc.moveTo(40, 95).lineTo(555, 95).strokeColor('#E2E8F0').lineWidth(1).stroke();

            doc.fillColor('#64748B').fontSize(9).font('Helvetica-Bold').text('QUOTATION TO:', 40, 110);
            doc.fillColor('#0F172A').fontSize(12).font('Helvetica-Bold').text(est.client_name || est.lead_name || 'Valued Client', 40, 123);
            if (targetEmail) {
              doc.fillColor('#475569').fontSize(9).font('Helvetica').text(targetEmail, 40, 138);
            }

            let y = 165;
            doc.rect(40, y, 515, 24).fill('#1F2D5A');
            doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold');
            doc.text('ITEM / SERVICE DESCRIPTION', 50, y + 7);
            doc.text('QTY', 360, y + 7, { width: 40, align: 'center' });
            doc.text('RATE', 410, y + 7, { width: 60, align: 'right' });
            doc.text('SUBTOTAL', 480, y + 7, { width: 65, align: 'right' });

            y += 24;
            doc.font('Helvetica').fontSize(9);

            const safeItems = Array.isArray(items) && items.length > 0 ? items : [{ item_name: 'Software Services', quantity: 1, rate: est.amount || est.total || 0, total: est.amount || est.total || 0 }];

            safeItems.forEach((item, idx) => {
              const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
              doc.rect(40, y, 515, 24).fill(bg);
              const r = parseFloat(item.rate || 0);
              const q = parseInt(item.quantity || 1, 10);
              const tot = parseFloat(item.total || (r * q));

              doc.fillColor('#0F172A').text(item.item_name || 'Service', 50, y + 7, { width: 300 });
              doc.fillColor('#475569').text(String(q), 360, y + 7, { width: 40, align: 'center' });
              doc.text(`${currencySymbol}${r.toLocaleString()}`, 410, y + 7, { width: 60, align: 'right' });
              doc.fillColor('#0F172A').font('Helvetica-Bold').text(`${currencySymbol}${tot.toLocaleString()}/-`, 480, y + 7, { width: 65, align: 'right' });
              doc.font('Helvetica');
              y += 24;
            });

            doc.moveTo(40, y).lineTo(555, y).strokeColor('#E2E8F0').stroke();

            y += 15;
            const sub = parseFloat(est.subtotal || est.total || est.amount || 0);
            const disc = parseFloat(est.discount_amount || 0);
            const taxA = parseFloat(est.tax_amount || 0);
            const totA = parseFloat(est.total || est.amount || 0);

            doc.fontSize(9).font('Helvetica-Bold').fillColor('#475569');
            doc.text('Subtotal:', 380, y, { width: 80, align: 'right' });
            doc.fillColor('#0F172A').text(`${currencySymbol}${sub.toLocaleString()}/-`, 470, y, { width: 75, align: 'right' });

            if (disc > 0) {
              y += 16;
              doc.fillColor('#475569').text('Discount:', 380, y, { width: 80, align: 'right' });
              doc.fillColor('#DC2626').text(`-${currencySymbol}${disc.toLocaleString()}/-`, 470, y, { width: 75, align: 'right' });
            }

            if (taxA > 0) {
              y += 16;
              doc.fillColor('#475569').text(`Tax (${est.tax_percentage || 0}%):`, 380, y, { width: 80, align: 'right' });
              doc.fillColor('#0F172A').text(`${currencySymbol}${taxA.toLocaleString()}/-`, 470, y, { width: 75, align: 'right' });
            }

            y += 20;
            doc.rect(370, y - 4, 185, 26).fill('#1F2D5A');
            doc.fillColor('#FFFFFF').fontSize(11).font('Helvetica-Bold');
            doc.text('Total Amount:', 380, y + 3);
            doc.text(`${currencySymbol}${totA.toLocaleString()}/-`, 470, y + 3, { width: 75, align: 'right' });

            y += 55;
            doc.fillColor('#64748B').fontSize(8).font('Helvetica-Bold').text('PAYMENT BANK DETAILS:', 40, y);
            doc.fillColor('#334155').fontSize(8).font('Helvetica').text('Account Name: Codigix Infotech | A/C No: 07230200002504 | IFSC: BARB0CHINCH | Bank: Bank of Baroda Pimpri', 40, y + 12);

            doc.fillColor('#0F172A').fontSize(10).font('Helvetica-Bold').text('Nitin Kamble', 450, y + 10, { align: 'right' });
            doc.fillColor('#64748B').fontSize(8).font('Helvetica').text('CEO, Codigix Infotech', 450, y + 23, { align: 'right' });

            doc.end();
          });

          attachments.push({
            filename: `Quotation-${est.estimation_number || id}.pdf`,
            content: pdfBuf,
            contentType: 'application/pdf'
          });
        } catch (pdfGenErr) {
          console.error('Error generating fallback PDF with pdfkit:', pdfGenErr);
        }
      }

      // 5. Send Email
      console.log(`📧 Attempting to send email to: ${targetEmail}`);
      const info = await transporter.sendMail({
        from: `"Codigix Quotations" <${process.env.EMAIL_FROM || process.env.EMAIL_USER || process.env.SMTP_USER}>`,
        to: targetEmail,
        subject: `Quotation ${est.estimation_number} - ${est.client_name || est.lead_name || ''}`,
        html: emailHtml,
        attachments: attachments
      });
      console.log('✅ Email sent successfully:', info.messageId);
      console.log('📩 Response:', info.response);
      console.log('👥 Accepted:', info.accepted);
      console.log('👥 Rejected:', info.rejected);

      // 6. Log Activity
      try {
        await connection.query(`
          INSERT INTO activities (
            activity_type, title, description, status, priority, 
            deal_id, lead_id, company_id, contact_id, 
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
          'Email', 
          `Email Sent: ${est.estimation_number}`,
          `Quotation ${est.estimation_number} was sent to ${targetEmail}. (MsgID: ${info.messageId})`,
          'Completed',
          'Medium',
          est.deal_id || null,
          est.lead_id || null,
          est.client_id || null,
          est.contact_id || null
        ]);
      } catch (activityErr) {
        console.error('Failed to log email activity:', activityErr);
      }

      return res.json({ 
        success: true, 
        message: `Quotation sent to ${targetEmail}`,
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected
      });
    } catch (err) {
      console.error('Email sending error:', err);
      responseError(res, 500, 'Failed to send email', err);
    } finally {
      if (connection) connection.release();
    }
  });

  app.post('/api/estimations/:id/send', async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      connection = await getConnection();
      
      // Start transaction
      await connection.beginTransaction();

      await connection.query('UPDATE estimations SET status = ? WHERE id = ?', ['Sent', id]);
      const [estimations] = await connection.query('SELECT * FROM estimations WHERE id = ?', [id]);
      
      if (estimations.length > 0) {
        const est = estimations[0];
        const targetStatus = (est.version > 1) ? 'Revised Quotation' : 'Quotation';
        
        // Update linked deal if exists
        if (est.deal_id) {
          await connection.query(
            'UPDATE deals SET pipeline = ?, deal_stage = ?, deal_value = ?, updated_at = NOW() WHERE id = ?',
            [targetStatus, targetStatus, est.amount, est.deal_id]
          );
        }
        
        // Update linked lead if exists
        if (est.lead_id) {
          await connection.query(
            'UPDATE leads SET lead_status = ?, value = ?, updated_at = NOW() WHERE id = ?',
            [targetStatus, est.amount, est.lead_id]
          );
        }

        // Log activity for sending quotation
        await connection.query(`
          INSERT INTO activities (
            activity_type, title, description, status, priority, 
            deal_id, lead_id, company_id, contact_id, 
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
          'Email', 
          `${targetStatus} Sent: ${est.estimation_number}`,
          `Quotation ${est.estimation_number} (v${est.version}) for ${est.currency} ${est.amount} has been sent to the client.`,
          'Completed',
          'Medium',
          est.deal_id || null,
          est.lead_id || null,
          est.client_id || null,
          est.contact_id || null
        ]);
      }

      await connection.commit();
      connection.release();
      return res.json({ message: 'Estimation sent successfully', data: estimations[0] });
    } catch (err) {
      if (connection) {
        await connection.rollback();
        connection.release();
      }
      responseError(res, 500, 'Failed to send estimation', err);
    }
  });

  app.post('/api/estimations/:id/convert-to-invoice', async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      const { invoice_number } = req.body;

      connection = await getConnection();
      
      const [estimation] = await connection.query('SELECT * FROM estimations WHERE id = ?', [id]);
      if (!estimation.length) {
        return res.status(404).json({ error: 'Estimation not found' });
      }

      const estimationData = estimation[0];
      const [result] = await connection.query(
        `INSERT INTO invoices (invoice_number, client_id, bill_to, ship_to, project_id, contact_id, amount, currency, invoice_date, open_till, status, description, total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Draft', ?, ?)`,
        [
          invoice_number || `INV-${Date.now()}`,
          estimationData.client_id,
          estimationData.bill_to || null,
          estimationData.ship_to || null,
          estimationData.project_id || null,
          estimationData.contact_id || null,
          estimationData.amount,
          estimationData.currency,
          estimationData.estimate_date || null,
          estimationData.expiry_date || null,
          estimationData.description || null,
          estimationData.amount
        ]
      );

      const [invoice] = await connection.query(
        `SELECT i.*, c.company_name AS client_name, c.email AS company_email, c.phone AS company_phone 
         FROM invoices i 
         LEFT JOIN companies c ON i.client_id = c.id 
         WHERE i.id = ?`,
        [result.insertId]
      );

      connection.release();
      return res.status(201).json({ message: 'Estimation converted to invoice successfully', invoiceNumber: invoice[0].invoice_number, id: result.insertId });
    } catch (err) {
      responseError(res, 500, 'Failed to convert estimation to invoice', err);
    } finally {
      if (connection) connection.release();
    }
  });

  app.get('/api/proposals', async (req, res) => {
    let connection;
    try {
      const { skip = 0, limit = 50, status, search, user_id, role, department } = req.query;
      const headerUserId = req.headers['x-user-id'];
      const headerUserRole = req.headers['x-user-role'];
      let currentUserId = user_id || headerUserId;
      let currentUserRole = role || headerUserRole;

      if (currentUserId && !currentUserRole) {
        try {
          const [uRows] = await pool.query(
            'SELECT r.name as role_name FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = ?',
            [currentUserId]
          );
          if (uRows.length > 0) {
            currentUserRole = uRows[0].role_name;
          }
        } catch (e) {}
      }

      const isSuperAdmin = currentUserRole && (currentUserRole === 'Super Admin' || currentUserRole === 'Admin');
      const isManager = currentUserRole && currentUserRole.toLowerCase().includes('manager');

      connection = await getConnection();

      let query = `
        SELECT p.*,
               c.company_name as client_name,
               l.lead_name as lead_name,
               l.owner_id as lead_owner_id,
               d.assignee_id as deal_assignee_id,
               CONCAT(u.first_name, ' ', COALESCE(u.last_name, '')) as assigned_to_name
        FROM proposals p
        LEFT JOIN companies c ON p.client_id = c.id
        LEFT JOIN leads l ON p.lead_id = l.id
        LEFT JOIN deals d ON p.deal_id = d.id
        LEFT JOIN users u ON p.assigned_to = u.id
        WHERE 1=1
      `;
      const params = [];

      // Role-based visibility: non-admin & non-manager users can ONLY see proposals created by them, assigned to them, or for their leads/deals
      if (!isSuperAdmin && !isManager && currentUserId) {
        query += ' AND (p.created_by = ? OR p.assigned_to = ? OR l.owner_id = ? OR d.assignee_id = ?)';
        params.push(currentUserId, currentUserId, currentUserId, currentUserId);
      }

      if (status) {
        query += ' AND p.status = ?';
        params.push(status);
      }

      if (search) {
        query += ' AND (p.proposal_number LIKE ? OR p.title LIKE ? OR c.company_name LIKE ? OR l.lead_name LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      query += ' ORDER BY p.created_at DESC LIMIT ?, ?';
      params.push(parseInt(skip), parseInt(limit));

      const [proposals] = await connection.query(query, params);
      connection.release();

      return res.json(proposals);
    } catch (err) {
      responseError(res, 500, 'Failed to fetch proposals', err);
    } finally {
      if (connection) connection.release();
    }
  });

  app.post('/api/proposals', async (req, res) => {
    let connection;
    try {
      const {
        proposal_number,
        title,
        client_id,
        lead_id,
        contact_id,
        deal_id,
        assigned_to,
        business_type,
        service_needed,
        project_scope,
        amount,
        currency,
        proposal_date,
        validity_date,
        status,
        description,
        created_by,
        attachments
      } = req.body;

      connection = await getConnection();

      let finalProposalNumber = proposal_number;
      if (!finalProposalNumber) {
        finalProposalNumber = `PROP-${Date.now()}`;
      }

      let finalClientId = client_id;
      if (!finalClientId && lead_id) {
        const [leads] = await connection.query('SELECT company_id, company, lead_name FROM leads WHERE id = ?', [lead_id]);
        if (leads.length > 0) {
          if (leads[0].company_id) {
            finalClientId = leads[0].company_id;
          } else {
            const compName = leads[0].company || leads[0].lead_name || 'Client Company';
            const [comps] = await connection.query('SELECT id FROM companies WHERE company_name = ? LIMIT 1', [compName]);
            if (comps.length > 0) {
              finalClientId = comps[0].id;
            } else {
              const [insComp] = await connection.query('INSERT INTO companies (company_name, created_at, updated_at) VALUES (?, NOW(), NOW())', [compName]);
              finalClientId = insComp.insertId;
            }
          }
        }
      }

      if (!finalClientId) {
        const [defaultComp] = await connection.query('SELECT id FROM companies LIMIT 1');
        if (defaultComp.length > 0) {
          finalClientId = defaultComp[0].id;
        } else {
          connection.release();
          return res.status(400).json({ error: 'Client ID required' });
        }
      }

      const [result] = await connection.query(
        `INSERT INTO proposals (
          proposal_number, title, client_id, lead_id, contact_id, deal_id, assigned_to,
          business_type, service_needed, project_scope,
          total_amount, currency, proposal_date, validity_date, status, description, created_by, attachments
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          finalProposalNumber,
          title || null,
          finalClientId,
          lead_id || null,
          contact_id || null,
          deal_id || null,
          assigned_to || null,
          business_type || null,
          service_needed || null,
          project_scope || null,
          amount || 0,
          currency || 'INR',
          proposal_date || null,
          validity_date || null,
          status || 'Draft',
          description || null,
          created_by || null,
          attachments ? JSON.stringify(attachments) : null
        ]
      );

      const [proposal] = await connection.query(
        `SELECT p.*,
                c.company_name as client_name,
                l.lead_name as lead_name,
                CONCAT(u.first_name, ' ', COALESCE(u.last_name, '')) as assigned_to_name
         FROM proposals p
         LEFT JOIN companies c ON p.client_id = c.id
         LEFT JOIN leads l ON p.lead_id = l.id
         LEFT JOIN users u ON p.assigned_to = u.id
         WHERE p.id = ?`,
        [result.insertId]
      );
      connection.release();

      return res.status(201).json(proposal[0]);
    } catch (err) {
      responseError(res, 500, 'Failed to create proposal', err);
    } finally {
      if (connection) connection.release();
    }
  });

  app.get('/api/proposals/:id', async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      connection = await getConnection();

      const [proposals] = await connection.query(
        `SELECT p.*,
                c.company_name as client_name,
                l.lead_name as lead_name,
                CONCAT(u.first_name, ' ', COALESCE(u.last_name, '')) as assigned_to_name
         FROM proposals p
         LEFT JOIN companies c ON p.client_id = c.id
         LEFT JOIN leads l ON p.lead_id = l.id
         LEFT JOIN users u ON p.assigned_to = u.id
         WHERE p.id = ?`,
        [id]
      );
      connection.release();

      if (proposals.length === 0) {
        return res.status(404).json({ error: 'Proposal not found' });
      }

      return res.json(proposals[0]);
    } catch (err) {
      responseError(res, 500, 'Failed to fetch proposal', err);
    } finally {
      if (connection) connection.release();
    }
  });

  app.put('/api/proposals/:id', async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      const {
        title,
        client_id,
        lead_id,
        assigned_to,
        business_type,
        service_needed,
        project_scope,
        amount,
        currency,
        status,
        proposal_date,
        validity_date,
        description,
        attachments
      } = req.body;
      
      connection = await getConnection();
      await connection.query(
        `UPDATE proposals SET
          title = COALESCE(?, title),
          client_id = COALESCE(?, client_id),
          lead_id = COALESCE(?, lead_id),
          assigned_to = COALESCE(?, assigned_to),
          business_type = COALESCE(?, business_type),
          service_needed = COALESCE(?, service_needed),
          project_scope = COALESCE(?, project_scope),
          total_amount = COALESCE(?, total_amount),
          currency = COALESCE(?, currency),
          status = COALESCE(?, status),
          proposal_date = COALESCE(?, proposal_date),
          validity_date = COALESCE(?, validity_date),
          description = COALESCE(?, description),
          attachments = COALESCE(?, attachments)
        WHERE id = ?`,
        [
          title || null,
          client_id || null,
          lead_id || null,
          assigned_to || null,
          business_type || null,
          service_needed || null,
          project_scope || null,
          amount !== undefined ? amount : null,
          currency || null,
          status || null,
          proposal_date || null,
          validity_date || null,
          description || null,
          attachments ? JSON.stringify(attachments) : null,
          id
        ]
      );

      const [proposal] = await connection.query(
        `SELECT p.*,
                c.company_name as client_name,
                l.lead_name as lead_name,
                CONCAT(u.first_name, ' ', COALESCE(u.last_name, '')) as assigned_to_name
         FROM proposals p
         LEFT JOIN companies c ON p.client_id = c.id
         LEFT JOIN leads l ON p.lead_id = l.id
         LEFT JOIN users u ON p.assigned_to = u.id
         WHERE p.id = ?`,
        [id]
      );
      connection.release();

      return res.json(proposal[0]);
    } catch (err) {
      responseError(res, 500, 'Failed to update proposal', err);
    } finally {
      if (connection) connection.release();
    }
  });

  app.delete('/api/proposals/:id', async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      connection = await getConnection();
      await connection.query('DELETE FROM proposals WHERE id = ?', [id]);
      connection.release();
      return res.json({ message: 'Proposal deleted successfully' });
    } catch (err) {
      responseError(res, 500, 'Failed to delete proposal', err);
    } finally {
      if (connection) connection.release();
    }
  });

  app.post('/api/proposals/:id/status', async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }

      connection = await getConnection();
      await connection.query(
        'UPDATE proposals SET status = ?, updated_at = NOW() WHERE id = ?',
        [status, id]
      );

      const [proposal] = await connection.query(
        'SELECT p.*, c.company_name as client_name FROM proposals p LEFT JOIN companies c ON p.client_id = c.id WHERE p.id = ?',
        [id]
      );
      connection.release();

      return res.json({
        message: `Proposal status updated to ${status}`,
        proposal: proposal[0]
      });
    } catch (err) {
      responseError(res, 500, 'Failed to update proposal status', err);
    } finally {
      if (connection) connection.release();
    }
  });

  const handleProposalSend = async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      const { client_email, email: recipientEmail, subject: customSubject, message } = req.body;

      connection = await getConnection();
      
      const [proposal] = await connection.query(`
        SELECT p.*, 
               c.company_name as client_name, c.email as client_email,
               l.lead_name, l.email as lead_email, l.phone as lead_phone,
               u.first_name as creator_first, u.last_name as creator_last, u.email as creator_email
        FROM proposals p
        LEFT JOIN companies c ON p.client_id = c.id
        LEFT JOIN leads l ON p.lead_id = l.id
        LEFT JOIN users u ON p.assigned_to = u.id
        WHERE p.id = ?
      `, [id]);

      if (proposal.length === 0) {
        connection.release();
        return res.status(404).json({ error: 'Proposal not found' });
      }

      const prop = proposal[0];
      const targetEmail = recipientEmail || client_email || prop.client_email || prop.lead_email;

      await connection.query(
        'UPDATE proposals SET status = ?, updated_at = NOW() WHERE id = ?',
        ['Sent', id]
      );

      // Update lead status if exists
      if (prop.lead_id) {
        try {
          await connection.query(
            "UPDATE leads SET lead_status = 'Proposal', updated_at = NOW() WHERE id = ?",
            [prop.lead_id]
          );
        } catch (lErr) {
          console.warn('Could not update lead status:', lErr);
        }
      }

      // Send Email via nodemailer
      if (targetEmail) {
        try {
          const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: process.env.EMAIL_USER || process.env.SMTP_USER,
              pass: (process.env.EMAIL_PASS || process.env.SMTP_PASS)?.trim()
            }
          });

          const emailSubject = customSubject || `Proposal #${prop.proposal_number || id} - ${prop.client_name || prop.lead_name || 'Valued Client'} - Codigix Infotech`;

          let attachments = [];
          if (prop.attachments) {
            try {
              const attList = typeof prop.attachments === 'string' ? JSON.parse(prop.attachments) : prop.attachments;
              if (Array.isArray(attList)) {
                const path = require('path');
                attList.forEach(att => {
                  if (att.file_path) {
                    const fullPath = path.resolve(__dirname, '..', att.file_path.replace(/^\//, ''));
                    attachments.push({
                      filename: att.name || 'Attachment',
                      path: fullPath
                    });
                  }
                });
              }
            } catch (e) {}
          }

          const htmlContent = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
              <div style="background-color: #DC2626; padding: 24px 30px; text-align: left; color: #ffffff;">
                <div style="font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">Codigix Infotech</div>
                <div style="font-size: 12px; color: #fecaca; margin-top: 4px;">Business Proposal #${prop.proposal_number || id}</div>
              </div>
              <div style="padding: 30px; color: #334155; line-height: 1.6; font-size: 14px;">
                <p style="margin-top: 0; font-size: 15px; font-weight: 600; color: #0f172a;">
                  Dear ${prop.client_name || prop.lead_name || 'Valued Client'},
                </p>
                <p style="color: #334155; margin-bottom: 20px;">
                  ${message || `We are pleased to submit our formal proposal <strong>#${prop.proposal_number || id}</strong> (${prop.title || 'Project Proposal'}) for your review.`}
                </p>
                ${prop.service_needed ? `
                  <div style="background-color: #f8fafc; border-left: 4px solid #DC2626; padding: 14px; border-radius: 6px; margin-bottom: 20px;">
                    <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Services Included:</div>
                    <div style="font-size: 13px; font-weight: 600; color: #0f172a; margin-top: 4px;">${prop.service_needed}</div>
                  </div>
                ` : ''}
                ${prop.description ? `
                  <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 14px; border-radius: 6px; margin-bottom: 20px; font-size: 13px;">
                    <strong>Scope & Details:</strong><br/>
                    <p style="margin: 6px 0 0 0; white-space: pre-line; color: #4b5563;">${prop.description}</p>
                  </div>
                ` : ''}
                <p style="color: #475569;">
                  Please feel free to reach out to us if you have any questions or would like to schedule a discussion.
                </p>
                <p style="color: #475569; margin-top: 24px;">
                  Warm regards,<br>
                  <strong style="color: #0f172a;">${prop.creator_first ? `${prop.creator_first} ${prop.creator_last || ''}` : 'Codigix Infotech Sales Team'}</strong><br>
                  <span style="font-size: 12px; color: #64748b;">Codigix Infotech | +91 7066556768</span>
                </p>
              </div>
              <div style="background-color: #f1f5f9; padding: 16px 30px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
                Office 309, Bramha Sky Uzuri, Pimpri Chowk, Pimpri - 18 | Codigixinfotech@gmail.com
              </div>
            </div>
          `;

          await transporter.sendMail({
            from: `"Codigix Proposals" <${process.env.EMAIL_FROM || process.env.EMAIL_USER || process.env.SMTP_USER}>`,
            to: targetEmail,
            subject: emailSubject,
            html: htmlContent,
            attachments: attachments
          });
          console.log(`✅ Proposal email sent successfully to ${targetEmail}`);
        } catch (mailErr) {
          console.error('Failed to send proposal email via transporter:', mailErr);
        }
      }

      // Automatically generate follow-up records against this proposal
      const relatedType = prop.lead_id ? 'Lead' : (prop.client_id ? 'Customer' : 'Lead');
      const relatedId = prop.lead_id || prop.client_id;
      const clientName = prop.lead_name || prop.client_name || 'Client';
      const assignedName = prop.creator_first ? `${prop.creator_first} ${prop.creator_last || ''}`.trim() : null;

      if (relatedId) {
        try {
          // Scheduled next follow-up: Call in 2 days
          await connection.query(`
            INSERT INTO followups (
              related_type, related_id, type, subject, status, outcome,
              scheduled_date, scheduled_time, assigned_to, assigned_to_name,
              client_email, client_phone, created_at, updated_at
            ) VALUES (
              ?, ?, 'Call', ?, 'Scheduled', NULL,
              DATE_ADD(CURDATE(), INTERVAL 2 DAY), '10:00:00',
              ?, ?, ?, ?, NOW(), NOW()
            )
          `, [
            relatedType, relatedId, `Follow-up on Sent Proposal (${prop.proposal_number || id})`,
            prop.assigned_to || null, assignedName,
            targetEmail || null, prop.lead_phone || null
          ]);

          console.log(`✓ Automatically created scheduled follow-up for sent proposal #${prop.proposal_number}`);
        } catch (fErr) {
          console.error('Failed to auto-generate follow-ups for sent proposal:', fErr);
        }

        // 3) Log activity
        try {
          await connection.query(`
            INSERT INTO activities (
              activity_type, title, description, status, priority, 
              lead_id, company_id, created_at, updated_at
            ) VALUES (
              'Email', ?, ?, 'Completed', 'Medium', ?, ?, NOW(), NOW()
            )
          `, [
            `Proposal Sent: ${prop.proposal_number || id}`,
            `Proposal ${prop.proposal_number || id} was sent to ${targetEmail || clientName}`,
            prop.lead_id || null, prop.client_id || null
          ]);
        } catch (actErr) {
          console.error('Failed to log activity for proposal sent:', actErr);
        }
      }

      connection.release();

      return res.json({
        success: true,
        message: targetEmail ? `Proposal sent to ${targetEmail}` : 'Proposal marked as sent',
        proposal_number: prop.proposal_number
      });
    } catch (err) {
      if (connection) connection.release();
      responseError(res, 500, 'Failed to send proposal', err);
    }
  };

  app.post('/api/proposals/:id/send', handleProposalSend);
  app.post('/api/proposals/:id/send-email', handleProposalSend);

  app.post('/api/proposals/:id/convert-to-invoice', async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      const { total_amount } = req.body;

      connection = await getConnection();
      
      const [proposal] = await connection.query(
        'SELECT * FROM proposals WHERE id = ?',
        [id]
      );

      if (proposal.length === 0) {
        connection.release();
        return res.status(404).json({ error: 'Proposal not found' });
      }

      const proposalData = proposal[0];

      if (!['Sent', 'Approved', 'Accepted'].includes(proposalData.status)) {
        connection.release();
        return res.status(400).json({ 
          error: 'Invalid proposal status',
          message: `Proposal must be Sent, Approved, or Accepted to convert. Current status: ${proposalData.status}`
        });
      }

      const invoiceNumber = `INV-${Date.now()}`;
      const invoiceDate = new Date().toISOString().split('T')[0];
      const openTill = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const invoiceAmount = total_amount !== undefined ? total_amount : (proposalData.total_amount || 0);

      await connection.query(
        `INSERT INTO invoices (invoice_number, client_id, amount, currency, invoice_date, open_till, status, description, total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          invoiceNumber,
          proposalData.client_id || null,
          invoiceAmount,
          proposalData.currency || 'USD',
          invoiceDate,
          openTill,
          'Draft',
          proposalData.description || null,
          invoiceAmount
        ]
      );

      await connection.query(
        'UPDATE proposals SET status = ? WHERE id = ?',
        ['Accepted', id]
      );

      console.log(`✓ Invoice ${invoiceNumber} created from proposal ${proposalData.proposal_number}`);
      connection.release();

      return res.json({
        message: 'Invoice created successfully from proposal',
        invoiceNumber,
        proposalId: id
      });
    } catch (err) {
      responseError(res, 500, 'Failed to convert proposal to invoice', err);
    } finally {
      if (connection) connection.release();
    }
  });

  app.post('/api/proposals/:id/convert-to-contract', async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'];

      connection = await getConnection();
      
      const [proposal] = await connection.query(
        'SELECT * FROM proposals WHERE id = ?',
        [id]
      );

      if (proposal.length === 0) {
        connection.release();
        return res.status(404).json({ error: 'Proposal not found' });
      }

      const proposalData = proposal[0];

      if (!['Sent', 'Approved', 'Accepted'].includes(proposalData.status)) {
        connection.release();
        return res.status(400).json({ 
          error: 'Invalid proposal status',
          message: `Proposal must be Sent, Approved, or Accepted to convert. Current status: ${proposalData.status}`
        });
      }

      const [existingContracts] = await connection.query(
        'SELECT id FROM contracts WHERE proposal_id = ?',
        [id]
      );

      if (existingContracts.length > 0) {
        connection.release();
        return res.status(409).json({ 
          error: 'Conflict - Contract already exists for this proposal',
          message: `A contract has already been created from proposal ${proposalData.proposal_number}`
        });
      }

      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      await connection.query(
        `INSERT INTO contracts (subject, start_date, end_date, client_id, contract_type, contract_value, description, status, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          proposalData.title || 'Contract from Proposal',
          startDate,
          endDate,
          proposalData.client_id || null,
          'Proposal-Based Contract',
          proposalData.total_amount || 0,
          proposalData.description || null,
          'Draft',
          userId || null
        ]
      );

      await connection.query(
        'UPDATE proposals SET status = ? WHERE id = ?',
        ['Accepted', id]
      );

      console.log(`✓ Contract created from proposal ${proposalData.proposal_number}`);
      connection.release();

      return res.json({
        message: 'Contract created successfully from proposal',
        contractSubject: proposalData.title || 'Contract from Proposal',
        proposalId: id
      });
    } catch (err) {
      responseError(res, 500, 'Failed to convert proposal to contract', err);
    } finally {
      if (connection) connection.release();
    }
  });

  app.delete('/api/estimations/:id', async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      connection = await getConnection();
      await connection.query('DELETE FROM estimations WHERE id = ?', [id]);
      connection.release();
      return res.json({ message: 'Estimation deleted successfully' });
    } catch (err) {
      responseError(res, 500, 'Failed to delete estimation', err);
    } finally {
      if (connection) connection.release();
    }
  });

  app.get('/api/plans', async (req, res) => {
    let connection;
    try {
      const { skip = 0, limit = 10, status, search, planType, sortBy = 'created_at', order = 'DESC', page = 1 } = req.query;
      connection = await getConnection();

      let query = 'SELECT * FROM plans WHERE 1=1';
      const params = [];

      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }

      if (search) {
        query += ' AND plan_name LIKE ?';
        const searchTerm = `%${search}%`;
        params.push(searchTerm);
      }

      if (planType) {
        query += ' AND plan_type = ?';
        params.push(planType);
      }

      query += ` ORDER BY ${sortBy} ${order}`;
      
      const pageNum = parseInt(page) || 1;
      const pageSize = parseInt(limit) || 10;
      const offset = (pageNum - 1) * pageSize;
      
      query += ' LIMIT ?, ?';
      params.push(offset, pageSize);

      const [plans] = await connection.query(query, params);
      
      const countParams = [];
      let countQuery = 'SELECT COUNT(*) as total FROM plans WHERE 1=1';
      if (status) {
        countQuery += ' AND status = ?';
        countParams.push(status);
      }
      if (search) {
        countQuery += ' AND plan_name LIKE ?';
        countParams.push(`%${search}%`);
      }
      if (planType) {
        countQuery += ' AND plan_type = ?';
        countParams.push(planType);
      }
      
      const [countResult] = await connection.query(countQuery, countParams);
      
      connection.release();

      const total = countResult[0].total;
      const pages = Math.ceil(total / pageSize);

      return res.json({
        data: plans,
        pagination: {
          total,
          pages,
          page: pageNum,
          limit: pageSize
        }
      });
    } catch (err) {
      responseError(res, 500, 'Failed to fetch plans', err);
    } finally {
      if (connection) connection.release();
    }
  });

  app.post('/api/plans', async (req, res) => {
    let connection;
    try {
      const { name, type, description, price, status, features } = req.body;

      if (!name || !price) {
        return res.status(400).json({ error: 'Plan name and price required' });
      }

      connection = await getConnection();
      const [result] = await connection.query(
        `INSERT INTO plans (plan_name, plan_type, description, price, status, features, currency)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [name, type || null, description || null, price, status || 'Active', features ? JSON.stringify(features) : null, 'USD']
      );

      const [plan] = await connection.query('SELECT * FROM plans WHERE id = ?', [result.insertId]);
      connection.release();

      return res.status(201).json(plan[0]);
    } catch (err) {
      responseError(res, 500, 'Failed to create plan', err);
    } finally {
      if (connection) connection.release();
    }
  });

  app.get('/api/plans/:id', async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      connection = await getConnection();

      const [plans] = await connection.query('SELECT * FROM plans WHERE id = ?', [id]);
      connection.release();

      if (plans.length === 0) {
        return res.status(404).json({ error: 'Plan not found' });
      }

      return res.json(plans[0]);
    } catch (err) {
      responseError(res, 500, 'Failed to fetch plan', err);
    } finally {
      if (connection) connection.release();
    }
  });

  app.put('/api/plans/:id', async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      const { name, type, description, price, status, features } = req.body;
      
      connection = await getConnection();
      await connection.query(
        'UPDATE plans SET plan_name = ?, plan_type = ?, description = ?, price = ?, status = ?, features = ? WHERE id = ?',
        [name || null, type || null, description || null, price || null, status || null, features ? JSON.stringify(features) : null, id]
      );

      const [plan] = await connection.query('SELECT * FROM plans WHERE id = ?', [id]);
      connection.release();

      return res.json(plan[0]);
    } catch (err) {
      responseError(res, 500, 'Failed to update plan', err);
    } finally {
      if (connection) connection.release();
    }
  });

  app.delete('/api/plans/:id', async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      connection = await getConnection();
      await connection.query('DELETE FROM plans WHERE id = ?', [id]);
      connection.release();
      return res.json({ message: 'Plan deleted successfully' });
    } catch (err) {
      responseError(res, 500, 'Failed to delete plan', err);
    } finally {
      if (connection) connection.release();
    }
  });

};

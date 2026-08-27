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

      let query = 'SELECT c.*, co.company_name as client_name, u.first_name as created_by_name FROM contracts c LEFT JOIN companies co ON c.client_id = co.id LEFT JOIN users u ON c.created_by = u.id WHERE 1=1';
      const params = [];

      if (status) {
        query += ' AND c.status = ?';
        params.push(status);
      }

      if (search) {
        query += ' AND (c.subject LIKE ? OR co.company_name LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm);
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
      const { subject, start_date, end_date, client_id, contract_type, contract_value, description, status, created_by } = req.body;

      if (!subject || !client_id || !contract_type) {
        return res.status(400).json({ error: 'Subject, client ID, and contract type required' });
      }

      connection = await getConnection();
      const [result] = await connection.query(
        `INSERT INTO contracts (subject, start_date, end_date, client_id, contract_type, contract_value, description, status, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [subject, start_date || null, end_date || null, client_id, contract_type, contract_value || 0, description || null, status || 'Draft', created_by || null]
      );

      const [contract] = await connection.query(
        'SELECT c.*, co.company_name as client_name, u.first_name as created_by_name FROM contracts c LEFT JOIN companies co ON c.client_id = co.id LEFT JOIN users u ON c.created_by = u.id WHERE c.id = ?',
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
        'SELECT c.*, co.company_name as client_name, u.first_name as created_by_name FROM contracts c LEFT JOIN companies co ON c.client_id = co.id LEFT JOIN users u ON c.created_by = u.id WHERE c.id = ?',
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
      const { subject, start_date, end_date, contract_type, contract_value, description, status } = req.body;
      
      connection = await getConnection();
      await connection.query(
        'UPDATE contracts SET subject = ?, start_date = ?, end_date = ?, contract_type = ?, contract_value = ?, description = ?, status = ? WHERE id = ?',
        [subject || null, start_date || null, end_date || null, contract_type || null, contract_value || null, description || null, status || null, id]
      );

      const [contract] = await connection.query(
        'SELECT c.*, co.company_name as client_name, u.first_name as created_by_name FROM contracts c LEFT JOIN companies co ON c.client_id = co.id LEFT JOIN users u ON c.created_by = u.id WHERE c.id = ?',
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
      const { skip = 0, limit = 50, status, search, deal_id, lead_id, client_id } = req.query;
      connection = await getConnection();

      let query = `
        SELECT e.*, c.company_name as client_name, l.lead_name,
               u.first_name as creator_first_name, u.last_name as creator_last_name,
               p.name as project_name
        FROM estimations e 
        LEFT JOIN companies c ON e.client_id = c.id 
        LEFT JOIN leads l ON e.lead_id = l.id
        LEFT JOIN users u ON e.estimate_by = u.id
        LEFT JOIN projects p ON e.project_id = p.id
        WHERE 1=1
      `;
      const params = [];
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

      let finalEstimationNumber = estimation_number;

      // If estimation_number is not provided, or it looks like the default starting number,
      // generate a fresh unique one to avoid "Duplicate entry" errors.
      if (!finalEstimationNumber || finalEstimationNumber.endsWith('-001')) {
        finalEstimationNumber = await generateEstimationNumber(pool);
      }

      if (!client_id && !lead_id) {
        return res.status(400).json({ error: 'Client ID or Lead ID required' });
      }

      connection = await getConnection();
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

        const cancelPendingFollowups = async () => {
           const related_type = deal_id ? 'Deal' : (lead_id ? 'Lead' : 'Customer');
           const related_id = deal_id || lead_id || client_id;
           if (!related_id) return;
           await connection.query(
             "UPDATE followups SET status = 'Cancelled', outcome = 'Superseded by Quotation Action' WHERE related_type = ? AND related_id = ? AND status IN ('Scheduled', 'Pending', 'Overdue')",
             [related_type, related_id]
           );
        };

        if (status === 'Sent') {
          // await cancelPendingFollowups();
          await createFollowup(true, 'Email', `Quotation Sent (Ver: ${version || 1}, Amount: ₹${amount || total || 0})`, 'Sent');
          await createFollowup(false, 'Call', `Follow-up on Sent Quotation (${finalEstimationNumber || 'No.'})`, null, 2);
        } else if (status === 'Revised') {
          // await cancelPendingFollowups();
          await createFollowup(true, 'Task', 'Client Requested Revision / Quotation Revised', 'Revised');
          await createFollowup(false, 'Task', `Send Revised Quotation (${finalEstimationNumber || 'No.'})`, null, 0);
        } else if (status === 'Accepted') {
          // await cancelPendingFollowups();
          await createFollowup(true, 'Meeting', 'Quotation Accepted', 'Accepted');
        } else if (status === 'Declined') {
          // await cancelPendingFollowups();
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
      connection.release();

      if (estimations.length === 0) {
        return res.status(404).json({ error: 'Estimation not found' });
      }

      return res.json(estimations[0]);
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
          
          // Auto-cancel pending follow-ups for this entity (to clean up before adding new ones, or on accepted/declined)
          const cancelPendingFollowups = async () => {
             const related_type = est.deal_id ? 'Deal' : (est.lead_id ? 'Lead' : 'Customer');
             const related_id = est.deal_id || est.lead_id || est.client_id;
             if (!related_id) return;
             await connection.query(
               "UPDATE followups SET status = 'Cancelled', outcome = 'Superseded by Quotation Action' WHERE related_type = ? AND related_id = ? AND status IN ('Scheduled', 'Pending', 'Overdue')",
               [related_type, related_id]
             );
          };

          if (updates.status === 'Sent') {
            // await cancelPendingFollowups();
            await createFollowup(true, 'Email', `Quotation Sent (Ver: ${est.version || 1}, Amount: ₹${est.amount})`, 'Sent');
            await createFollowup(false, 'Call', `Follow-up on Sent Quotation (${est.estimation_number || 'No.'})`, null, 2);
          } else if (updates.status === 'Revised') {
            // await cancelPendingFollowups();
            await createFollowup(true, 'Task', 'Client Requested Revision / Quotation Revised', 'Revised');
            await createFollowup(false, 'Task', `Send Revised Quotation (${est.estimation_number || 'No.'})`, null, 0);
          } else if (updates.status === 'Accepted') {
            // await cancelPendingFollowups();
            await createFollowup(true, 'Meeting', 'Quotation Accepted', 'Accepted');
          } else if (updates.status === 'Declined') {
            // await cancelPendingFollowups();
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
      const { email: recipientEmail } = req.body;
      
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
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #f8f9fa; padding: 20px; border-bottom: 1px solid #e0e0e0;">
            <h2 style="margin: 0; color: #333;">Quotation: ${est.estimation_number}</h2>
            <p style="margin: 5px 0 0; color: #666;">Date: ${new Date(est.estimate_date).toLocaleDateString()}</p>
          </div>
          <div style="padding: 20px;">
            <p>Dear ${est.client_name || est.lead_name || 'Valued Client'},</p>
            <p>Please find below the quotation details for your request.</p>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
              <thead>
                <tr style="background-color: #f8f9fa;">
                  <th style="padding: 10px; text-align: left; border-bottom: 2px solid #dee2e6;">Item</th>
                  <th style="padding: 10px; text-align: center; border-bottom: 2px solid #dee2e6;">Qty</th>
                  <th style="padding: 10px; text-align: right; border-bottom: 2px solid #dee2e6;">Rate</th>
                  <th style="padding: 10px; text-align: right; border-bottom: 2px solid #dee2e6;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
              <tfoot>
                ${est.discount_amount > 0 ? `
                <tr>
                  <td colspan="3" style="padding: 10px; text-align: right; font-weight: bold;">Discount:</td>
                  <td style="padding: 10px; text-align: right; color: #dc3545;">-${currencySymbol}${parseFloat(est.discount_amount).toLocaleString()}</td>
                </tr>` : ''}
                ${est.tax_amount > 0 ? `
                <tr>
                  <td colspan="3" style="padding: 10px; text-align: right; font-weight: bold;">Tax:</td>
                  <td style="padding: 10px; text-align: right;">${currencySymbol}${parseFloat(est.tax_amount).toLocaleString()}</td>
                </tr>` : ''}
                <tr>
                  <td colspan="3" style="padding: 10px; text-align: right; font-size: 18px; font-weight: bold;">Total:</td>
                  <td style="padding: 10px; text-align: right; font-size: 18px; font-weight: bold; color: #28a745;">${currencySymbol}${parseFloat(est.total || est.amount).toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>

            ${est.description ? `
            <div style="margin-top: 30px;">
              <h4 style="margin-bottom: 10px; color: #333;">Description/Notes:</h4>
              <p style="color: #555; white-space: pre-wrap;">${est.description}</p>
            </div>` : ''}

            <div style="margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px; font-size: 14px; color: #888;">
              <p>Thank you for your business!</p>
              <p>Best regards,<br>${est.creator_name || 'Team'}</p>
            </div>
          </div>
        </div>
      `;

      // 5. Send Email
      console.log(`📧 Attempting to send email to: ${targetEmail}`);
      const info = await transporter.sendMail({
        from: `"Quotation System" <${process.env.EMAIL_FROM || process.env.EMAIL_USER || process.env.SMTP_USER}>`,
        to: targetEmail,
        subject: `Quotation ${est.estimation_number} - ${est.client_name || est.lead_name || ''}`,
        html: emailHtml
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
      const { skip = 0, limit = 50, status, search } = req.query;
      connection = await getConnection();

      let query = 'SELECT p.*, c.company_name as client_name FROM proposals p LEFT JOIN companies c ON p.client_id = c.id WHERE 1=1';
      const params = [];

      if (status) {
        query += ' AND p.status = ?';
        params.push(status);
      }

      if (search) {
        query += ' AND (p.proposal_number LIKE ? OR p.title LIKE ? OR c.company_name LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
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
      const { proposal_number, title, client_id, contact_id, deal_id, amount, currency, proposal_date, validity_date, status, description, created_by } = req.body;

      if (!proposal_number || !client_id) {
        return res.status(400).json({ error: 'Proposal number and client ID required' });
      }

      connection = await getConnection();
      const [result] = await connection.query(
        `INSERT INTO proposals (proposal_number, title, client_id, contact_id, deal_id, total_amount, currency, proposal_date, validity_date, status, description, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [proposal_number, title || null, client_id, contact_id || null, deal_id || null, amount || 0, currency || 'USD', proposal_date || null, validity_date || null, status || 'Draft', description || null, created_by || null]
      );

      const [proposal] = await connection.query(
        'SELECT p.*, c.company_name as client_name FROM proposals p LEFT JOIN companies c ON p.client_id = c.id WHERE p.id = ?',
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
        'SELECT p.*, c.company_name as client_name FROM proposals p LEFT JOIN companies c ON p.client_id = c.id WHERE p.id = ?',
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
      const { title, amount, status, validity_date, description } = req.body;
      
      connection = await getConnection();
      await connection.query(
        'UPDATE proposals SET title = ?, total_amount = ?, status = ?, validity_date = ?, description = ? WHERE id = ?',
        [title || null, amount || null, status || null, validity_date || null, description || null, id]
      );

      const [proposal] = await connection.query(
        'SELECT p.*, c.company_name as client_name FROM proposals p LEFT JOIN companies c ON p.client_id = c.id WHERE p.id = ?',
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

  app.post('/api/proposals/:id/send', async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      const { client_email } = req.body;

      connection = await getConnection();
      
      const [proposal] = await connection.query(
        'SELECT * FROM proposals WHERE id = ?',
        [id]
      );

      if (proposal.length === 0) {
        connection.release();
        return res.status(404).json({ error: 'Proposal not found' });
      }

      await connection.query(
        'UPDATE proposals SET status = ?, updated_at = NOW() WHERE id = ?',
        ['Sent', id]
      );

      console.log(`✓ Proposal ${proposal[0].proposal_number} marked as sent`);
      connection.release();

      return res.json({
        message: 'Proposal sent successfully',
        proposal_number: proposal[0].proposal_number
      });
    } catch (err) {
      responseError(res, 500, 'Failed to send proposal', err);
    } finally {
      if (connection) connection.release();
    }
  });

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

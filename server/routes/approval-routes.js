module.exports = function setupApprovalRoutes(app, pool) {

  // Get all approvals with filtering
  app.get('/api/approvals', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      const { status = 'pending', limit = 100, skip = 0 } = req.query;

      let query = 'SELECT a.*, u1.first_name as requested_by_name, u2.first_name as approver_name FROM approvals a LEFT JOIN users u1 ON a.requested_by = u1.id LEFT JOIN users u2 ON a.approver = u2.id';
      const params = [];

      if (status !== 'all') {
        query += ` WHERE a.status = ?`;
        params.push(status.charAt(0).toUpperCase() + status.slice(1));
      }

      query += ` ORDER BY a.created_at DESC LIMIT ? OFFSET ?`;
      params.push(parseInt(limit), parseInt(skip));

      const [approvals] = await connection.query(query, params);

      connection.release();
      return res.json(approvals);
    } catch (error) {
      if (connection) connection.release();
      console.error('Error fetching approvals:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch approvals',
        details: error.message
      });
    }
  });

  // Create new approval request
  app.post('/api/approvals', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      const {
        approval_type,
        entity_id,
        entity_name,
        description,
        requested_by,
        approver_id,
        priority = 'Medium',
        discount_percentage,
        discount_amount,
        change_scope,
        impact_assessment
      } = req.body;

      const [result] = await connection.query(`
        INSERT INTO approvals (
          approval_type, entity_id, entity_name, description,
          requested_by, approver, priority, status,
          discount_percentage, discount_amount,
          change_scope, impact_assessment, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?, ?, ?, NOW())
      `, [
        approval_type, entity_id, entity_name, description,
        requested_by, approver_id, priority,
        discount_percentage || null, discount_amount || null,
        change_scope || null, impact_assessment || null
      ]);

      connection.release();

      res.json({
        success: true,
        message: 'Approval request created',
        approval_id: result.insertId
      });
    } catch (error) {
      if (connection) connection.release();
      console.error('Error creating approval:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create approval',
        details: error.message
      });
    }
  });

  // Approve an approval request
  app.put('/api/approvals/:id/approve', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      const { id } = req.params;
      const { approvalType, itemId, comment } = req.body;

      // Update approval status
      await connection.query(`
        UPDATE approvals
        SET status = 'Approved', approval_comments = ?, approver = ?, updated_at = NOW()
        WHERE id = ?
      `, [comment || '', req.userId, id]);

      // Handle approval type specific actions
      if (approvalType === 'Quotation Discount' || approvalType === 'Deal Discount' || approvalType === 'Estimation Discount') {
        // Update deal/quotation with discount
        const [approval] = await connection.query('SELECT * FROM approvals WHERE id = ?', [id]);
        if (approval[0]) {
          if (approvalType === 'Deal Discount') {
            await connection.query(`
              UPDATE deals
              SET discount_amount = ?, discount_status = 'Approved', discount_approved_by = ?
              WHERE id = ?
            `, [approval[0].discount_amount, req.userId, itemId]);
          } else if (approvalType === 'Quotation Discount' || approvalType === 'Estimation Discount') {
            await connection.query(`
              UPDATE estimations
              SET discount_percentage = ?, discount_amount = ?
              WHERE id = ?
            `, [approval[0].discount_percentage, approval[0].discount_amount, itemId]);
          }
        }
      } else if (approvalType === 'Change Request') {
        // Update project with change
        await connection.query(`
          UPDATE projects
          SET description = CONCAT(IFNULL(description, ''), '\n\nChange Approved: ', ?)
          WHERE id = ?
        `, [comment || 'Modified via approval', itemId]);
      } else if (approvalType === 'Payment Release' || approvalType === 'Invoice Approval') {
        // Release payment or approve invoice
        await connection.query(`
          UPDATE invoices
          SET status = ?, approval_status = 'Approved', approved_by = ?
          WHERE id = ?
        `, [approvalType === 'Payment Release' ? 'Paid' : 'Unpaid', req.userId, itemId]);
      } else if (approvalType === 'Commission Approval') {
        // Approve commission
        await connection.query(`
          UPDATE commissions
          SET status = 'Approved', approved_by = ?, approved_at = NOW()
          WHERE id = ?
        `, [req.userId, itemId]);
      } else if (approvalType === 'Deployment Approval') {
        // Approve deployment
        await connection.query(`
          UPDATE deployments
          SET status = 'Success', approved_by = ?
          WHERE id = ?
        `, [req.userId, itemId]);
      } else if (approvalType === 'Creative Approval') {
        // Approve creative request
        await connection.query(`
          UPDATE creative_requests
          SET status = 'Approved'
          WHERE id = ?
        `, [itemId]);
      }

      connection.release();

      res.json({
        success: true,
        message: 'Approval granted successfully'
      });
    } catch (error) {
      if (connection) connection.release();
      console.error('Error approving request:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to approve request',
        details: error.message
      });
    }
  });

  // Reject an approval request
  app.put('/api/approvals/:id/reject', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      const { id } = req.params;
      const { approvalType, itemId, reason } = req.body;

      await connection.query(`
        UPDATE approvals
        SET status = 'Rejected', approval_comments = ?, approver = ?, updated_at = NOW()
        WHERE id = ?
      `, [reason || '', req.userId, id]);

      connection.release();

      res.json({
        success: true,
        message: 'Approval request rejected'
      });
    } catch (error) {
      if (connection) connection.release();
      console.error('Error rejecting request:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reject request',
        details: error.message
      });
    }
  });

  // Get pending approvals for current user
  app.get('/api/approvals/pending/for-user', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      const userId = req.userId;

      const [approvals] = await connection.query(`
        SELECT a.*, u1.first_name as requested_by_name
        FROM approvals a
        LEFT JOIN users u1 ON a.requested_by = u1.id
        WHERE a.approver = ? AND a.status = 'Pending'
        ORDER BY a.priority DESC, a.created_at ASC
      `, [userId]);

      connection.release();
      return res.json(approvals);
    } catch (error) {
      if (connection) connection.release();
      console.error('Error fetching pending approvals:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch pending approvals',
        details: error.message
      });
    }
  });

  // Get approval details
  app.get('/api/approvals/:id', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      const { id } = req.params;

      const [approval] = await connection.query(`
        SELECT a.*, u1.first_name as requested_by_name, u2.first_name as approver_name
        FROM approvals a
        LEFT JOIN users u1 ON a.requested_by = u1.id
        LEFT JOIN users u2 ON a.approver = u2.id
        WHERE a.id = ?
      `, [id]);

      connection.release();
      
      if (approval.length === 0) {
        return res.status(404).json({ error: 'Approval not found' });
      }

      return res.json(approval[0]);
    } catch (error) {
      if (connection) connection.release();
      console.error('Error fetching approval:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch approval',
        details: error.message
      });
    }
  });

  // Get approval statistics
  app.get('/api/approvals/stats/overview', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();

      const [stats] = await connection.query(`
        SELECT
          status,
          COUNT(*) as count,
          approval_type
        FROM approvals
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY status, approval_type
      `);

      const [avgTime] = await connection.query(`
        SELECT
          AVG(TIMESTAMPDIFF(HOUR, created_at, updated_at)) as avg_approval_hours
        FROM approvals
        WHERE status IN ('Approved', 'Rejected')
        AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      `);

      connection.release();

      res.json({
        statistics: stats,
        avg_approval_time_hours: avgTime[0].avg_approval_hours || 0
      });
    } catch (error) {
      if (connection) connection.release();
      console.error('Error fetching stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch statistics',
        details: error.message
      });
    }
  });
};

const express = require('express');
const crypto = require('crypto');
const router = express.Router();

module.exports = (pool) => {
  // GET /api/hr/registration-requests - List all registration requests with optional filters
  router.get('/', async (req, res) => {
    let connection;
    try {
      const { status, query } = req.query;
      connection = await pool.getConnection();

      // Fetch summary counts
      const [[counts]] = await connection.query(`
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending,
          SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) AS approved,
          SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) AS rejected
        FROM registration_requests
      `);

      // Build query for requests list
      let sql = `
        SELECT 
          r.id,
          r.uuid,
          r.first_name,
          r.last_name,
          r.email,
          r.phone,
          r.company,
          r.department,
          r.role_type,
          r.role_name,
          r.status,
          r.reviewed_by,
          r.review_notes,
          r.reviewed_at,
          r.created_at,
          r.updated_at,
          CONCAT(u.first_name, ' ', COALESCE(u.last_name, '')) AS reviewer_name,
          u.email AS reviewer_email
        FROM registration_requests r
        LEFT JOIN users u ON r.reviewed_by = u.id
        WHERE 1=1
      `;
      const params = [];

      if (status && status !== 'all') {
        sql += ' AND r.status = ?';
        params.push(status);
      }

      if (query && query.trim()) {
        const searchTerm = `%${query.trim()}%`;
        sql += ` AND (
          r.first_name LIKE ? OR 
          r.last_name LIKE ? OR 
          r.email LIKE ? OR 
          r.department LIKE ? OR 
          r.role_type LIKE ? OR 
          r.role_name LIKE ? OR 
          r.company LIKE ?
        )`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
      }

      sql += ' ORDER BY r.created_at DESC';

      const [requests] = await connection.query(sql, params);

      res.json({
        success: true,
        requests,
        counts: {
          total: Number(counts.total) || 0,
          pending: Number(counts.pending) || 0,
          approved: Number(counts.approved) || 0,
          rejected: Number(counts.rejected) || 0,
        },
      });
    } catch (error) {
      console.error('Error fetching registration requests:', error);
      res.status(500).json({ error: 'Failed to fetch registration requests', details: error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  // POST /api/hr/registration-requests/:id/approve - Approve request & create user
  router.post('/:id/approve', async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      const { reviewed_by, department, role_type, role_name } = req.body;

      connection = await pool.getConnection();

      // 1. Fetch the request
      const [requests] = await connection.query(
        'SELECT * FROM registration_requests WHERE id = ? OR uuid = ?',
        [id, id]
      );

      if (requests.length === 0) {
        return res.status(404).json({ error: 'Registration request not found' });
      }

      const request = requests[0];

      if (request.status === 'Approved') {
        return res.status(400).json({ error: 'This registration request has already been approved' });
      }

      // Determine final department and role assigned by HR/Admin
      const finalDepartment = department || request.department || null;
      const finalRoleType = role_type || request.role_type || null;
      const targetRoleName = role_name || request.role_name || finalRoleType || 'Employee';

      // 2. Check if an active user already exists with this email
      const [existingUsers] = await connection.query(
        'SELECT id, uuid, email FROM users WHERE email = ?',
        [request.email]
      );

      let createdUserId = null;
      let createdUserUuid = null;

      // 3. Resolve role_id
      let role_id = 13; // General Employee role fallback

      const [roles] = await connection.query('SELECT id FROM roles WHERE name = ?', [targetRoleName]);
      if (roles.length > 0) {
        role_id = roles[0].id;
      } else {
        const [insertRole] = await connection.query(
          'INSERT INTO roles (name, description) VALUES (?, ?)',
          [targetRoleName, `Role created for ${targetRoleName}`]
        );
        role_id = insertRole.insertId;
      }

      // 3b. Resolve department_id
      let department_id = null;
      if (finalDepartment) {
        const [depts] = await connection.query('SELECT id FROM departments WHERE name = ?', [finalDepartment]);
        if (depts.length > 0) {
          department_id = depts[0].id;
        }
      }

      if (existingUsers.length > 0) {
        // User record already exists, just update their role & department and approve
        createdUserId = existingUsers[0].id;
        createdUserUuid = existingUsers[0].uuid || crypto.randomUUID();
        await connection.query(
          `UPDATE users SET uuid = COALESCE(uuid, ?), department = ?, department_id = ?, job_title = ?, role_id = ?, status = 'Active' WHERE id = ?`,
          [createdUserUuid, finalDepartment, department_id, finalRoleType, role_id, createdUserId]
        );
      } else {
        // 4. Generate unique username
        let baseUsername = request.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
        if (!baseUsername) baseUsername = 'user';
        let username = baseUsername;

        const [existingUsername] = await connection.query(
          'SELECT id FROM users WHERE username = ?',
          [username]
        );

        if (existingUsername.length > 0) {
          username = `${baseUsername}_${Math.floor(1000 + Math.random() * 9000)}`;
        }

        // 5. Insert new user into users table with status 'Active' and secure UUID
        createdUserUuid = crypto.randomUUID();
        const [insertResult] = await connection.query(
          `INSERT INTO users (
            uuid, first_name, last_name, email, username, password, phone1, location, role_id, status, department, department_id, job_title
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?, ?, ?)`,
          [
            createdUserUuid,
            request.first_name,
            request.last_name || '',
            request.email,
            username,
            request.password, // Pre-hashed during registration request
            request.phone || '',
            request.company || '',
            role_id,
            finalDepartment,
            department_id,
            finalRoleType
          ]
        );

        createdUserId = insertResult.insertId;
      }

      // 6. Update registration request status to Approved and store assigned department & role
      await connection.query(
        `UPDATE registration_requests 
         SET status = 'Approved', 
             department = ?,
             role_type = ?,
             role_name = ?,
             reviewed_by = ?, 
             reviewed_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [finalDepartment, finalRoleType, targetRoleName, reviewed_by || null, request.id]
      );

      res.json({
        success: true,
        message: 'Registration request approved and user created successfully',
        userId: createdUserId,
        userUuid: createdUserUuid,
      });

    } catch (error) {
      console.error('Error approving registration request:', error);
      res.status(500).json({ error: 'Failed to approve registration request', details: error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  // POST /api/hr/registration-requests/:id/reject - Reject request without creating user
  router.post('/:id/reject', async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      const { reviewed_by, reason } = req.body;

      connection = await pool.getConnection();

      const [requests] = await connection.query(
        'SELECT * FROM registration_requests WHERE id = ? OR uuid = ?',
        [id, id]
      );

      if (requests.length === 0) {
        return res.status(404).json({ error: 'Registration request not found' });
      }

      const request = requests[0];

      if (request.status === 'Approved') {
        return res.status(400).json({ error: 'Cannot reject an already approved request' });
      }

      await connection.query(
        `UPDATE registration_requests 
         SET status = 'Rejected', reviewed_by = ?, review_notes = ?, reviewed_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [reviewed_by || null, reason || null, request.id]
      );

      res.json({
        success: true,
        message: 'Registration request rejected successfully',
      });

    } catch (error) {
      console.error('Error rejecting registration request:', error);
      res.status(500).json({ error: 'Failed to reject registration request', details: error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  return router;
};

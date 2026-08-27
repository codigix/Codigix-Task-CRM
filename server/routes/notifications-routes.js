/**
 * In-app notification system.
 *
 * One row per recipient — sending to a department or a group fans out into one row each,
 * so "read" state is per person rather than shared.
 *
 * Other routes emit notifications through `createNotification`, which is exported on
 * `app.locals.createNotification` so any route file can call it without importing this one:
 *
 *   await req.app.locals.createNotification({
 *     userId: 12,                       // or userIds: [1,2] / department: 'Marketing'
 *     type: 'assignment',
 *     title: 'MKT-104 assigned to you',
 *     message: 'abhijit assigned "Upload Q3 blog" to you',
 *     link: '/marketing/manager/abhi/kanban?issue=MKT-104',
 *     actorName: 'abhijit khedekar',
 *     entityType: 'issue',
 *     entityKey: 'MKT-104'
 *   });
 */
module.exports = function setupNotificationsRoutes(app, pool) {
  const db = { query: (sql, params) => pool.query(sql, params) };

  const responseError = (res, statusCode, message, error) => {
    console.error(`Error: ${message}`, error?.message || error);
    return res.status(statusCode).json({ error: message, details: error?.message || error });
  };

  // ── Schema ────────────────────────────────────────────────────────────
  (async () => {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS notifications (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          type VARCHAR(50) NOT NULL DEFAULT 'general',
          title VARCHAR(255) NOT NULL,
          message TEXT,
          link VARCHAR(500),
          actor_name VARCHAR(120),
          entity_type VARCHAR(50),
          entity_key VARCHAR(100),
          is_read TINYINT(1) NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          read_at DATETIME DEFAULT NULL,
          INDEX idx_user_unread (user_id, is_read),
          INDEX idx_created_at (created_at),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    } catch (e) {
      console.error('Error creating notifications table:', e.message);
    }
  })();

  // ── Recipient resolution ──────────────────────────────────────────────
  // Accepts user ids, user names/emails, a department, or a role — and returns
  // a de-duplicated list of user ids to write rows for.
  const resolveRecipients = async ({ userId, userIds, userName, department, role, excludeUserId }) => {
    const ids = new Set();

    const add = (v) => {
      const n = Number(v);
      if (Number.isInteger(n) && n > 0) ids.add(n);
    };

    if (userId) add(userId);
    if (Array.isArray(userIds)) userIds.forEach(add);

    // "sujata Choudhari" / "sujata" / an email — same matching the kanban routes use.
    if (userName && userName !== 'Unassigned') {
      const [rows] = await db.query(
        "SELECT id FROM users WHERE CONCAT(first_name, ' ', last_name) = ? OR first_name = ? OR email = ? OR username = ?",
        [userName, userName, userName, userName]
      );
      rows.forEach(r => add(r.id));
    }

    if (department) {
      const dept = String(department).replace(/\s*department\s*$/i, '').trim();
      const [rows] = await db.query('SELECT id FROM users WHERE department LIKE ?', [`%${dept}%`]);
      rows.forEach(r => add(r.id));
    }

    if (role) {
      const [rows] = await db.query(
        'SELECT u.id FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE r.name = ? OR u.job_title = ?',
        [role, role]
      );
      rows.forEach(r => add(r.id));
    }

    // Don't notify people about their own actions.
    if (excludeUserId) ids.delete(Number(excludeUserId));

    return [...ids];
  };

  /**
   * Creates notification rows. Returns the number of people notified.
   * Never throws — a failed notification must not break the action that triggered it.
   */
  const createNotification = async (options = {}) => {
    try {
      const { type, title, message, link, actorName, entityType, entityKey } = options;
      if (!title) return 0;

      const recipients = await resolveRecipients(options);
      if (recipients.length === 0) return 0;

      const values = recipients.map(uid => [
        uid, type || 'general', String(title).slice(0, 255), message || null,
        link || null, actorName || null, entityType || null, entityKey || null
      ]);

      await db.query(
        `INSERT INTO notifications (user_id, type, title, message, link, actor_name, entity_type, entity_key)
         VALUES ?`,
        [values]
      );
      return recipients.length;
    } catch (e) {
      console.error('Failed to create notification:', e.message);
      return 0;
    }
  };

  // Make it reachable from every other route file.
  app.locals.createNotification = createNotification;

  // ── Endpoints ─────────────────────────────────────────────────────────

  // List notifications for a user (defaults to the x-user-id header).
  app.get('/api/notifications', async (req, res) => {
    try {
      const userId = req.query.user_id || req.headers['x-user-id'];
      if (!userId) return res.status(400).json({ error: 'user_id is required' });

      const { unread, limit = 30, skip = 0, type } = req.query;
      let query = 'SELECT * FROM notifications WHERE user_id = ?';
      const params = [userId];

      if (unread === 'true') query += ' AND is_read = 0';
      if (type) { query += ' AND type = ?'; params.push(type); }

      query += ' ORDER BY created_at DESC LIMIT ?, ?';
      params.push(parseInt(skip), parseInt(limit));

      const [rows] = await db.query(query, params);
      const [[counts]] = await db.query(
        'SELECT COUNT(*) AS total, SUM(is_read = 0) AS unread FROM notifications WHERE user_id = ?',
        [userId]
      );

      res.json({
        notifications: rows,
        total: Number(counts.total) || 0,
        unreadCount: Number(counts.unread) || 0
      });
    } catch (error) {
      responseError(res, 500, 'Failed to fetch notifications', error);
    }
  });

  // Lightweight badge count for polling.
  app.get('/api/notifications/unread-count', async (req, res) => {
    try {
      const userId = req.query.user_id || req.headers['x-user-id'];
      if (!userId) return res.json({ unreadCount: 0 });
      const [[row]] = await db.query(
        'SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND is_read = 0',
        [userId]
      );
      res.json({ unreadCount: Number(row.unread) || 0 });
    } catch (error) {
      responseError(res, 500, 'Failed to fetch unread count', error);
    }
  });

  // Send a notification. Target with user_id / user_ids / user_name / department / role.
  app.post('/api/notifications', async (req, res) => {
    try {
      const {
        user_id, user_ids, user_name, department, role,
        type, title, message, link, actor_name, entity_type, entity_key, exclude_user_id
      } = req.body;

      if (!title) return res.status(400).json({ error: 'title is required' });

      const sent = await createNotification({
        userId: user_id,
        userIds: user_ids,
        userName: user_name,
        department,
        role,
        excludeUserId: exclude_user_id || req.headers['x-user-id'],
        type, title, message, link,
        actorName: actor_name || req.headers['x-user-name'],
        entityType: entity_type,
        entityKey: entity_key
      });

      if (sent === 0) {
        return res.status(404).json({ error: 'No matching recipients found', sent: 0 });
      }
      res.status(201).json({ success: true, sent });
    } catch (error) {
      responseError(res, 500, 'Failed to send notification', error);
    }
  });

  app.put('/api/notifications/read-all', async (req, res) => {
    try {
      const userId = req.body.user_id || req.headers['x-user-id'];
      if (!userId) return res.status(400).json({ error: 'user_id is required' });
      const [result] = await db.query(
        'UPDATE notifications SET is_read = 1, read_at = NOW() WHERE user_id = ? AND is_read = 0',
        [userId]
      );
      res.json({ success: true, updated: result.affectedRows });
    } catch (error) {
      responseError(res, 500, 'Failed to mark all as read', error);
    }
  });

  app.put('/api/notifications/:id/read', async (req, res) => {
    try {
      const [result] = await db.query(
        'UPDATE notifications SET is_read = 1, read_at = NOW() WHERE id = ?',
        [req.params.id]
      );
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Notification not found' });
      res.json({ success: true });
    } catch (error) {
      responseError(res, 500, 'Failed to mark as read', error);
    }
  });

  app.delete('/api/notifications/:id', async (req, res) => {
    try {
      const [result] = await db.query('DELETE FROM notifications WHERE id = ?', [req.params.id]);
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Notification not found' });
      res.json({ success: true });
    } catch (error) {
      responseError(res, 500, 'Failed to delete notification', error);
    }
  });

  // Clear everything already read, for the "clear" action in the UI.
  app.delete('/api/notifications', async (req, res) => {
    try {
      const userId = req.query.user_id || req.headers['x-user-id'];
      if (!userId) return res.status(400).json({ error: 'user_id is required' });
      const [result] = await db.query('DELETE FROM notifications WHERE user_id = ? AND is_read = 1', [userId]);
      res.json({ success: true, deleted: result.affectedRows });
    } catch (error) {
      responseError(res, 500, 'Failed to clear notifications', error);
    }
  });
};

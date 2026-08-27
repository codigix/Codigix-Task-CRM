module.exports = function setupReminderRoutes(app, pool) {

  // Get all reminders with filtering
  app.get('/api/reminders', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      const { status = 'pending', limit = 100, skip = 0 } = req.query;

      let query = 'SELECT * FROM reminders';
      const params = [];

      if (status !== 'all') {
        const statusValue = status.charAt(0).toUpperCase() + status.slice(1);
        query += ` WHERE status = ?`;
        params.push(statusValue);
      }

      query += ` ORDER BY reminder_datetime ASC LIMIT ? OFFSET ?`;
      params.push(parseInt(limit), parseInt(skip));

      const [reminders] = await connection.query(query, params);

      connection.release();
      return res.json(reminders);
    } catch (error) {
      if (connection) connection.release();
      console.error('Error fetching reminders:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch reminders',
        details: error.message
      });
    }
  });

  // Create new reminder
  app.post('/api/reminders', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      const {
        entity_type,
        entity_id,
        entity_name,
        reminder_type,
        reminder_datetime,
        message,
        frequency = 'once',
        created_by
      } = req.body;

      const [result] = await connection.query(`
        INSERT INTO reminders (
          entity_type, entity_id, entity_name, reminder_type,
          reminder_datetime, message, frequency, status, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', ?)
      `, [
        entity_type,
        entity_id,
        entity_name,
        reminder_type,
        reminder_datetime,
        message,
        frequency,
        created_by || null
      ]);

      connection.release();

      res.json({
        success: true,
        message: 'Reminder created successfully',
        reminder_id: result.insertId
      });
    } catch (error) {
      if (connection) connection.release();
      console.error('Error creating reminder:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create reminder',
        details: error.message
      });
    }
  });

  // Update reminder
  app.put('/api/reminders/:id', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      const { id } = req.params;
      const {
        entity_type,
        entity_id,
        entity_name,
        reminder_type,
        reminder_datetime,
        message,
        frequency,
        status
      } = req.body;

      await connection.query(`
        UPDATE reminders
        SET entity_type = ?, entity_id = ?, entity_name = ?, reminder_type = ?,
            reminder_datetime = ?, message = ?, frequency = ?, status = ?, updated_at = NOW()
        WHERE id = ?
      `, [
        entity_type,
        entity_id,
        entity_name,
        reminder_type,
        reminder_datetime,
        message,
        frequency,
        status,
        id
      ]);

      connection.release();

      res.json({
        success: true,
        message: 'Reminder updated successfully'
      });
    } catch (error) {
      if (connection) connection.release();
      console.error('Error updating reminder:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update reminder',
        details: error.message
      });
    }
  });

  // Mark reminder as completed
  app.put('/api/reminders/:id/complete', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      const { id } = req.params;

      await connection.query(`
        UPDATE reminders
        SET status = 'Completed', updated_at = NOW()
        WHERE id = ?
      `, [id]);

      connection.release();

      res.json({
        success: true,
        message: 'Reminder marked as completed'
      });
    } catch (error) {
      if (connection) connection.release();
      console.error('Error completing reminder:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to complete reminder',
        details: error.message
      });
    }
  });

  // Delete reminder
  app.delete('/api/reminders/:id', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      const { id } = req.params;

      await connection.query('DELETE FROM reminders WHERE id = ?', [id]);

      connection.release();

      res.json({
        success: true,
        message: 'Reminder deleted successfully'
      });
    } catch (error) {
      if (connection) connection.release();
      console.error('Error deleting reminder:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete reminder',
        details: error.message
      });
    }
  });

  // Get upcoming reminders
  app.get('/api/reminders/upcoming/today', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();

      const [reminders] = await connection.query(`
        SELECT * FROM reminders
        WHERE status = 'Pending'
        AND DATE(reminder_datetime) = CURDATE()
        ORDER BY reminder_datetime ASC
      `);

      connection.release();
      return res.json(reminders);
    } catch (error) {
      if (connection) connection.release();
      console.error('Error fetching upcoming reminders:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch upcoming reminders',
        details: error.message
      });
    }
  });

  // Get overdue reminders
  app.get('/api/reminders/overdue', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();

      const [reminders] = await connection.query(`
        SELECT * FROM reminders
        WHERE status = 'Pending'
        AND reminder_datetime < NOW()
        ORDER BY reminder_datetime ASC
      `);

      connection.release();
      return res.json(reminders);
    } catch (error) {
      if (connection) connection.release();
      console.error('Error fetching overdue reminders:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch overdue reminders',
        details: error.message
      });
    }
  });

  // Get reminder statistics
  app.get('/api/reminders/stats/overview', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();

      const [stats] = await connection.query(`
        SELECT
          status,
          COUNT(*) as count,
          reminder_type
        FROM reminders
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY status, reminder_type
      `);

      const [overdue] = await connection.query(`
        SELECT COUNT(*) as overdue_count
        FROM reminders
        WHERE status = 'Pending' AND reminder_datetime < NOW()
      `);

      const [upcoming] = await connection.query(`
        SELECT COUNT(*) as upcoming_count
        FROM reminders
        WHERE status = 'Pending' AND DATE(reminder_datetime) = CURDATE()
      `);

      connection.release();

      res.json({
        statistics: stats,
        overdue_count: overdue[0]?.overdue_count || 0,
        upcoming_count: upcoming[0]?.upcoming_count || 0
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

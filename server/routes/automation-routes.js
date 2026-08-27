const automationService = require('../services/automationService');

module.exports = function setupAutomationRoutes(app, pool) {
  
  app.get('/api/automation/run-checks', async (req, res) => {
    try {
      const results = await automationService.runAllChecks();
      res.json({
        success: true,
        message: 'Automation checks completed',
        results
      });
    } catch (error) {
      console.error('Error running automation checks:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to run automation checks',
        details: error.message
      });
    }
  });

  app.get('/api/automation/alerts', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      
      const [alerts] = await connection.query(`
        SELECT * FROM automation_rules 
        WHERE action_type = 'SEND_ALERT' AND is_active = 1
        ORDER BY created_at DESC
        LIMIT 100
      `);
      
      connection.release();
      res.json(alerts);
    } catch (error) {
      if (connection) connection.release();
      console.error('Error fetching alerts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch alerts',
        details: error.message
      });
    }
  });

  app.delete('/api/automation/alerts/:id', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      
      await connection.query(`
        DELETE FROM automation_rules WHERE id = ?
      `, [req.params.id]);
      
      connection.release();
      res.json({ success: true, message: 'Alert dismissed' });
    } catch (error) {
      if (connection) connection.release();
      console.error('Error dismissing alert:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to dismiss alert',
        details: error.message
      });
    }
  });

  app.post('/api/automation/enable/:ruleId', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      
      await connection.query(`
        UPDATE automation_rules SET is_active = 1 WHERE id = ?
      `, [req.params.ruleId]);
      
      connection.release();
      res.json({ success: true, message: 'Automation rule enabled' });
    } catch (error) {
      if (connection) connection.release();
      console.error('Error enabling rule:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to enable rule',
        details: error.message
      });
    }
  });

  app.post('/api/automation/disable/:ruleId', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      
      await connection.query(`
        UPDATE automation_rules SET is_active = 0 WHERE id = ?
      `, [req.params.ruleId]);
      
      connection.release();
      res.json({ success: true, message: 'Automation rule disabled' });
    } catch (error) {
      if (connection) connection.release();
      console.error('Error disabling rule:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to disable rule',
        details: error.message
      });
    }
  });

};

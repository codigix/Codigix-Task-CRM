module.exports = function setupItServicesRoutes(app, pool) {
  // Use pool.query directly for better connection management
  const db = {
    query: (sql, params) => pool.query(sql, params)
  };

  const responseError = (res, statusCode, message, error) => {
    console.error(`Error: ${message}`, error?.message || error);
    return res.status(statusCode).json({ error: message, details: error?.message || error });
  };

  app.get('/api/it-services', async (req, res) => {
    try {
      const [itServices] = await db.query('SELECT * FROM it_services ORDER BY name ASC');
      return res.json(itServices);
    } catch (err) {
      responseError(res, 500, 'Failed to fetch IT services', err);
    }
  });
};

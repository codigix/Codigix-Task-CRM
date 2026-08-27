const pool = require('../config/database');

async function updateDatabase() {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log('Connected to database for IT teams role migration');

    // Add manager_role to teams table
    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM teams LIKE "manager_role"');
      if (columns.length === 0) {
        await connection.query('ALTER TABLE teams ADD COLUMN manager_role VARCHAR(100) AFTER manager_id');
        console.log('✓ Added manager_role to teams');
      }
    } catch (err) {
      console.warn('Could not add manager_role to teams:', err.message);
    }

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    if (connection) connection.release();
    process.exit();
  }
}

updateDatabase();

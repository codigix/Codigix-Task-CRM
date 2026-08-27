const pool = require('../config/database');

async function updateDatabase() {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log('Connected to database to make team name optional');

    // Modify teams table to make name NULLable
    await connection.query(`
      ALTER TABLE teams MODIFY name VARCHAR(255) NULL;
    `);
    console.log('✓ Teams table modified: name column is now optional');

    console.log('Update completed successfully');
  } catch (error) {
    console.error('Update failed:', error);
  } finally {
    if (connection) connection.release();
    process.exit();
  }
}

updateDatabase();

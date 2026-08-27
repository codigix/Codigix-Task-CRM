const pool = require('./config/database');

async function truncateAllTables() {
  let connection;
  try {
    connection = await pool.getConnection();
    
    // Disable foreign key checks
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    console.log('Disabled foreign key checks.');
    
    // Get all tables
    const [rows] = await connection.query('SHOW TABLES');
    
    if (rows.length === 0) {
        console.log('No tables found to truncate.');
    }

    for (const row of rows) {
      const tableName = Object.values(row)[0];
      console.log(`Truncating table: ${tableName}...`);
      await connection.query(`TRUNCATE TABLE \`${tableName}\``);
    }
    
    // Re-enable foreign key checks
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('Re-enabled foreign key checks.');
    console.log('Successfully truncated all tables in the database.');
    
  } catch (error) {
    console.error('Error truncating tables:', error);
  } finally {
    if (connection) {
      connection.release();
    }
    process.exit(0);
  }
}

truncateAllTables();

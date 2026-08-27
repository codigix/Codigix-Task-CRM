const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function truncateAllTables() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'deals_db',
    port: process.env.DB_PORT || 3306,
  });

  let connection;
  try {
    connection = await pool.getConnection();
    console.log('Connected to database. Disabling foreign key checks...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    const [tables] = await connection.query('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0]);
    
    console.log(`Found ${tableNames.length} tables. Truncating...`);
    
    for (let table of tableNames) {
      console.log(`Truncating ${table}...`);
      await connection.query(`TRUNCATE TABLE \`${table}\``);
    }
    
    console.log('Re-enabling foreign key checks...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('All tables successfully truncated!');

  } catch (error) {
    console.error('Error truncating tables:', error);
    if (connection) {
       await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    }
  } finally {
    if (connection) connection.release();
    pool.end();
  }
}

truncateAllTables();

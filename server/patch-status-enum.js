const mysql = require('mysql2/promise');
require('dotenv').config();

async function patchEnum() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 3307,
      user: process.env.DB_USER || 'all_in_one_user',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'deals_db'
    });

    console.log('Connected to database.');

    await connection.query(`
      ALTER TABLE test_cases 
      MODIFY COLUMN status ENUM('Active', 'Obsolete', 'Draft', 'Approved', 'In Review', 'Ready for Test', 'Rejected') DEFAULT 'Draft';
    `);

    console.log('test_cases table altered successfully.');
    await connection.end();
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

patchEnum();

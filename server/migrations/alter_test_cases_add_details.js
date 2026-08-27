const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

async function migrate() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 3307,
      user: process.env.DB_USER || 'all_in_one_user',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'deals_db'
    });

    console.log('Connected to database.');

    // Add steps and data_sets columns
    await connection.query(`
      ALTER TABLE test_cases 
      ADD COLUMN steps JSON DEFAULT NULL,
      ADD COLUMN data_sets JSON DEFAULT NULL;
    `);
    console.log('Added steps and data_sets columns to test_cases table.');

    // Truncate dummy data
    await connection.query(`TRUNCATE TABLE test_cases;`);
    console.log('Truncated dummy data from test_cases table.');

    console.log('Migration completed successfully.');
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
       console.log('Columns already exist. Truncating table...');
       try {
         await connection.query(`TRUNCATE TABLE test_cases;`);
         console.log('Truncated dummy data from test_cases table.');
       } catch (err) {
         console.error('Migration failed during truncate:', err);
       }
    } else {
       console.error('Migration failed:', error);
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed.');
    }
  }
}

migrate();

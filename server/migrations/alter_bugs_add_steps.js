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

    console.log('Connected to MySQL database.');

    // Add steps and attachments column
    await connection.query(`
      ALTER TABLE bugs 
      ADD COLUMN steps JSON AFTER description,
      ADD COLUMN attachments JSON AFTER steps;
    `);

    console.log('Successfully added steps and attachments columns to bugs table.');

  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('Columns already exist.');
    } else {
      console.error('Migration failed:', error);
    }
  } finally {
    if (connection) {
      await connection.end();
    }
    process.exit();
  }
}

migrate();

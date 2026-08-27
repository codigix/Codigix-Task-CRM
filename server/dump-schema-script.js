const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function dumpSchema() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'deals_db',
    port: process.env.DB_PORT || 3306,
  });

  try {
    const [tables] = await pool.query('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0]);
    console.log('Tables:', tableNames);

    for (let table of tableNames) {
      if (['seo_management', 'gmb_management', 'campaign_performance', 'seo_rankings', 'analytics_data'].includes(table)) {
        const [columns] = await pool.query(`SHOW COLUMNS FROM ${table}`);
        console.log(`\nSchema for ${table}:`);
        console.log(columns.map(c => `${c.Field} (${c.Type})`).join(', '));
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    pool.end();
  }
}

dumpSchema();

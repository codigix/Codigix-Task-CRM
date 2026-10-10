const pool = require('../config/database');

async function syncDealsDbSchema() {
  const tablesToSync = ['task_contributions', 'task_history', 'task_subtasks', 'task_time_logs', 'performance_reviews'];

  try {
    console.log('Synchronizing deals_db schema with task_crm_db_prod...\n');

    // Disable foreign key checks during sync
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');

    for (const t of tablesToSync) {
      console.log(`Syncing table: ${t}...`);

      // 1. Get exact CREATE TABLE statement from task_crm_db_prod
      const [[prodDDL]] = await pool.query(`SHOW CREATE TABLE task_crm_db_prod.${t}`);
      const createTableSql = prodDDL['Create Table'];

      // 2. Drop table in deals_db if exists
      await pool.query(`DROP TABLE IF EXISTS deals_db.${t}`);

      // 3. Create table in deals_db using the exact DDL from task_crm_db_prod
      await pool.query(`USE deals_db`);
      await pool.query(createTableSql);

      console.log(`✓ Table deals_db.${t} synchronized successfully.`);
    }

    // Switch back default database
    await pool.query('USE task_crm_db_prod');
    await pool.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('\nAll tables synchronized successfully!');
  } catch (err) {
    console.error('Error synchronizing schema:', err);
  } finally {
    process.exit(0);
  }
}

syncDealsDbSchema();

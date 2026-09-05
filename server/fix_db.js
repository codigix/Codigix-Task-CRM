const pool = require('./config/database');

async function fixDb() {
  try {
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');
    await pool.query('TRUNCATE TABLE task_contributions');
    await pool.query('TRUNCATE TABLE task_history');
    await pool.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('Truncated conflicting tables');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fixDb();

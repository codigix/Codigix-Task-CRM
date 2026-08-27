const pool = require('./config/database');

async function manualWin() {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log('Manually winning deal 9 and lead 10...');
    
    await connection.query("UPDATE deals SET status = 'Won', pipeline = 'Won', deal_stage = 'Won' WHERE id = 9");
    await connection.query("UPDATE leads SET lead_status = 'Won' WHERE id = 10");
    await connection.query("UPDATE companies SET status = 'Active' WHERE id = 1");

    console.log('Update complete.');
    connection.release();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

manualWin();

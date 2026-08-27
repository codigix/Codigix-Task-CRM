const db = require('./config/database');
async function run() {
  try {
    await db.query(
      'INSERT INTO github_connections (organization_id, github_account_id, github_account_name, installation_id, app_id, status, connected_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [1, '12345', 'codigix-infotech', '156712985', process.env.GITHUB_APP_ID || '4725147', 'connected', 1]
    );
    console.log('Successfully inserted connection!');
  } catch (e) {
    console.log('Error inserting:', e.message);
  }
  process.exit();
}
run();

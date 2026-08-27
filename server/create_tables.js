const mysql = require('mysql2/promise');
async function setup() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3307,
    user: 'all_in_one_user',
    password: 'C0digix$309',
    database: 'deals_db'
  });
  
  await connection.query(`
    CREATE TABLE IF NOT EXISTS project_discussions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      project_id INT NOT NULL,
      user_id INT NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  
  await connection.query(`
    CREATE TABLE IF NOT EXISTS project_activities (
      id INT AUTO_INCREMENT PRIMARY KEY,
      project_id INT NOT NULL,
      user_id INT,
      action VARCHAR(255) NOT NULL,
      details TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);
  
  console.log('Tables created successfully.');
  process.exit(0);
}
setup().catch(console.error);

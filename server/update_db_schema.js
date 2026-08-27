const db = require('./config/database');
async function run() {
  try {
    await db.query('DROP TABLE IF EXISTS github_repositories');
    await db.query(`
      CREATE TABLE github_repositories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        connection_id INT,
        github_repo_id VARCHAR(255),
        repository_name VARCHAR(255),
        full_name VARCHAR(255),
        owner VARCHAR(255),
        description TEXT,
        html_url VARCHAR(255),
        clone_url VARCHAR(255),
        ssh_url VARCHAR(255),
        visibility VARCHAR(50),
        default_branch VARCHAR(100),
        language VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        github_created_at TIMESTAMP NULL,
        github_updated_at TIMESTAMP NULL,
        last_sync_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (connection_id) REFERENCES github_connections(id) ON DELETE CASCADE
      )
    `);
    console.log('Successfully recreated github_repositories table');
  } catch (err) {
    console.error(err);
  }
  process.exit();
}
run();

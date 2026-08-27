const pool = require('./config/database');

async function migrate() {
  let connection;
  try {
    connection = await pool.getConnection();
    
    console.log('Adding task_key to project_tasks if not exists...');
    try {
      await connection.query('ALTER TABLE project_tasks ADD COLUMN task_key VARCHAR(50) UNIQUE AFTER id');
      console.log('Added task_key column.');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('task_key column already exists.');
      } else {
        throw e;
      }
    }

    console.log('Creating github_commits table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS github_commits (
        id INT AUTO_INCREMENT PRIMARY KEY,
        task_key VARCHAR(50) NOT NULL,
        commit_hash VARCHAR(100) NOT NULL UNIQUE,
        message TEXT,
        author VARCHAR(100),
        url VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_task_key (task_key)
      )
    `);

    console.log('Creating github_prs table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS github_prs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        task_key VARCHAR(50) NOT NULL,
        pr_number INT NOT NULL,
        title VARCHAR(255),
        state VARCHAR(50),
        url VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_pr (task_key, pr_number),
        INDEX idx_task_key (task_key)
      )
    `);

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    if (connection) connection.release();
    process.exit(0);
  }
}

migrate();

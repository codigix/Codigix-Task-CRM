const pool = require('../config/database');

async function updateDatabase() {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log('Connected to database for IT teams migration');

    // Create teams table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        department_id INT,
        manager_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
        FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_name (name),
        INDEX idx_department_id (department_id)
      )
    `);
    console.log('✓ Teams table created/verified');

    // Create team_members table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS team_members (
        id INT AUTO_INCREMENT PRIMARY KEY,
        team_id INT NOT NULL,
        user_id INT NOT NULL,
        role VARCHAR(100) DEFAULT 'Member',
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_team_member (team_id, user_id),
        INDEX idx_team_id (team_id),
        INDEX idx_user_id (user_id)
      )
    `);
    console.log('✓ Team members table created/verified');

    // Add team_id to projects table
    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM projects LIKE "team_id"');
      if (columns.length === 0) {
        await connection.query('ALTER TABLE projects ADD COLUMN team_id INT AFTER company_id');
        await connection.query('ALTER TABLE projects ADD CONSTRAINT fk_projects_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL');
        await connection.query('ALTER TABLE projects ADD INDEX idx_team_id (team_id)');
        console.log('✓ Added team_id to projects');
      }
    } catch (err) {
      console.warn('Could not add team_id to projects:', err.message);
    }

    // Add team_id to it_projects table
    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM it_projects LIKE "team_id"');
      if (columns.length === 0) {
        await connection.query('ALTER TABLE it_projects ADD COLUMN team_id INT AFTER project_id');
        await connection.query('ALTER TABLE it_projects ADD CONSTRAINT fk_it_projects_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL');
        await connection.query('ALTER TABLE it_projects ADD INDEX idx_team_id (team_id)');
        console.log('✓ Added team_id to it_projects');
      }
    } catch (err) {
      console.warn('Could not add team_id to it_projects:', err.message);
    }

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    if (connection) connection.release();
    process.exit();
  }
}

updateDatabase();

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

async function runMigration(targetDb = null) {
  const dbName = targetDb || process.env.TARGET_DB || process.env.DB_NAME || 'deals_db';
  console.log(`\n========================================`);
  console.log(`Running Sprints & Kanban Migration on: ${dbName}`);
  console.log(`========================================`);

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3307', 10),
    user: process.env.DB_USER || 'all_in_one_user',
    password: process.env.DB_PASSWORD,
    database: dbName
  });

  try {
    // 1. Create or verify sprints table
    console.log('Checking sprints table...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS sprints (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NULL,
        name VARCHAR(255) NOT NULL,
        goal TEXT NULL,
        start_date DATE NULL,
        end_date DATE NULL,
        status ENUM('Planned', 'Active', 'Completed', 'Cancelled') DEFAULT 'Planned',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Verify columns on sprints table
    const [sprintCols] = await conn.query('DESCRIBE sprints');
    const sprintColNames = sprintCols.map(c => c.Field);

    if (!sprintColNames.includes('department')) {
      console.log("Adding 'department' column to 'sprints'...");
      await conn.query("ALTER TABLE sprints ADD COLUMN department VARCHAR(50) DEFAULT 'IT'");
    }
    if (!sprintColNames.includes('completed_at')) {
      console.log("Adding 'completed_at' column to 'sprints'...");
      await conn.query('ALTER TABLE sprints ADD COLUMN completed_at DATETIME DEFAULT NULL');
    }
    if (!sprintColNames.includes('sort_order')) {
      console.log("Adding 'sort_order' column to 'sprints'...");
      await conn.query('ALTER TABLE sprints ADD COLUMN sort_order INT DEFAULT 0');
    }

    // Ensure project_id allows NULL
    const projCol = sprintCols.find(c => c.Field === 'project_id');
    if (projCol && String(projCol.Null).toUpperCase() === 'NO') {
      console.log("Modifying 'project_id' to allow NULL on 'sprints'...");
      try {
        await conn.query('ALTER TABLE sprints MODIFY COLUMN project_id INT NULL DEFAULT NULL');
      } catch (fkErr) {
        console.warn('Notice on project_id column alter:', fkErr.message);
      }
    }

    // 2. Enhance it_kanban_issues table
    console.log('Checking it_kanban_issues table columns...');
    const [issueCols] = await conn.query('DESCRIBE it_kanban_issues');
    const issueColNames = issueCols.map(c => c.Field);

    if (!issueColNames.includes('sprint_id')) {
      console.log("Adding 'sprint_id' column to 'it_kanban_issues'...");
      await conn.query('ALTER TABLE it_kanban_issues ADD COLUMN sprint_id INT DEFAULT NULL');
      await conn.query('ALTER TABLE it_kanban_issues ADD INDEX idx_sprint_id (sprint_id)');
    }

    if (!issueColNames.includes('rank_order')) {
      console.log("Adding 'rank_order' column to 'it_kanban_issues'...");
      await conn.query('ALTER TABLE it_kanban_issues ADD COLUMN rank_order INT DEFAULT NULL');
      await conn.query('ALTER TABLE it_kanban_issues ADD INDEX idx_rank_order (rank_order)');
      await conn.query('UPDATE it_kanban_issues SET rank_order = id WHERE rank_order IS NULL');
    }

    // Expand column sizes to prevent data truncation
    console.log('Ensuring safe column types on it_kanban_issues...');
    await conn.query('ALTER TABLE it_kanban_issues MODIFY COLUMN title TEXT NOT NULL');
    await conn.query('ALTER TABLE it_kanban_issues MODIFY COLUMN sprint VARCHAR(255) DEFAULT NULL');
    await conn.query("ALTER TABLE it_kanban_issues MODIFY COLUMN assignee VARCHAR(255) DEFAULT 'Unassigned'");
    await conn.query("ALTER TABLE it_kanban_issues MODIFY COLUMN reporter VARCHAR(255) DEFAULT 'Unassigned'");
    await conn.query("ALTER TABLE it_kanban_issues MODIFY COLUMN type VARCHAR(100) DEFAULT 'Task'");
    await conn.query("ALTER TABLE it_kanban_issues MODIFY COLUMN priority VARCHAR(100) DEFAULT 'Medium'");
    await conn.query("ALTER TABLE it_kanban_issues MODIFY COLUMN status VARCHAR(100) DEFAULT 'TO DO'");

    // 3. Ensure it_kanban_attachments table exists with subtask_id
    console.log('Checking it_kanban_attachments table...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS it_kanban_attachments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        issue_key VARCHAR(50) NOT NULL,
        issue_id INT NULL,
        subtask_id VARCHAR(100) NULL DEFAULT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_path TEXT NOT NULL,
        file_size VARCHAR(50) DEFAULT '0 KB',
        file_type VARCHAR(100) DEFAULT 'document',
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_issue_key (issue_key),
        INDEX idx_issue_id (issue_id),
        INDEX idx_subtask_id (subtask_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log(`✓ Migration completed successfully on ${dbName}!`);
  } catch (error) {
    console.error(`❌ Migration failed on ${dbName}:`, error);
    throw error;
  } finally {
    await conn.end();
  }
}

// Allow CLI execution directly: node create_sprints_and_kanban_schema.js [dbName]
if (require.main === module) {
  const target = process.argv[2] || process.env.TARGET_DB || 'deals_db';
  runMigration(target)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = runMigration;

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require('../config/database');

async function migrate() {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log(`Connected to database: ${process.env.DB_NAME || 'deals_db'}`);

    console.log("Altering columns on 'it_kanban_issues' to prevent 'Data too long' errors...");
    await connection.query("ALTER TABLE it_kanban_issues MODIFY COLUMN sprint VARCHAR(255) DEFAULT NULL");
    await connection.query("ALTER TABLE it_kanban_issues MODIFY COLUMN assignee VARCHAR(255) DEFAULT 'Unassigned'");
    await connection.query("ALTER TABLE it_kanban_issues MODIFY COLUMN reporter VARCHAR(255) DEFAULT 'Unassigned'");
    await connection.query("ALTER TABLE it_kanban_issues MODIFY COLUMN type VARCHAR(100) DEFAULT 'Task'");
    await connection.query("ALTER TABLE it_kanban_issues MODIFY COLUMN priority VARCHAR(100) DEFAULT 'Medium'");
    await connection.query("ALTER TABLE it_kanban_issues MODIFY COLUMN status VARCHAR(100) DEFAULT 'TO DO'");

    console.log("✓ Successfully expanded sprint and related column sizes in 'it_kanban_issues'.");
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      connection.release();
    }
    process.exit(0);
  }
}

migrate();

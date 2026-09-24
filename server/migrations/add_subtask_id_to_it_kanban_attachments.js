const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require('../config/database');

async function migrate() {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log(`Connected to database: ${process.env.DB_NAME || 'deals_db'}`);

    const [cols] = await connection.query("SHOW COLUMNS FROM it_kanban_attachments LIKE 'subtask_id'");
    if (cols.length === 0) {
      console.log("Adding 'subtask_id' column to 'it_kanban_attachments'...");
      await connection.query("ALTER TABLE it_kanban_attachments ADD COLUMN subtask_id VARCHAR(100) NULL DEFAULT NULL AFTER issue_key");
      console.log("✓ 'subtask_id' column added to 'it_kanban_attachments'.");
    } else {
      console.log("✓ 'subtask_id' column already exists in 'it_kanban_attachments'.");
    }

    try {
      await connection.query("CREATE INDEX idx_it_kanban_attachments_subtask ON it_kanban_attachments(issue_key, subtask_id)");
      console.log("✓ Index idx_it_kanban_attachments_subtask created.");
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME') {
        console.log("✓ Index idx_it_kanban_attachments_subtask already exists.");
      } else {
        console.warn("Index notice:", err.message);
      }
    }

    console.log('✓ Migration succeeded: it_kanban_attachments ready for subtask isolation.');
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

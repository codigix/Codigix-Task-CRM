const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require('../config/database');

async function migrate() {
  let connection;
  try {
    connection = await pool.getConnection();
    const currentDb = process.env.DB_NAME || 'task_crm_db_prod';
    console.log(`Running migration on database: ${currentDb}...`);

    // 1. Ensure Admin role exists in roles table
    console.log("Checking 'Admin' role in 'roles' table...");
    const [roles] = await connection.query("SELECT id FROM roles WHERE id = 2 OR LOWER(name) = 'admin'");
    if (roles.length === 0) {
      await connection.query(
        "INSERT INTO roles (id, name, description) VALUES (2, 'Admin', 'Company-wide management - cannot change system settings')"
      );
      console.log("✓ 'Admin' role created (id: 2).");
    } else {
      console.log("✓ 'Admin' role already exists.");
    }

    // 2. Expand users.department_role enum to safely allow 'Admin'
    console.log("Updating 'department_role' column on 'users'...");
    try {
      await connection.query(
        "ALTER TABLE users MODIFY COLUMN department_role ENUM('Executive', 'Manager', 'Admin') DEFAULT 'Executive'"
      );
      console.log("✓ 'department_role' column updated on 'users'.");
    } catch (err) {
      console.warn("  Notice updating department_role:", err.message);
    }

    // 3. Update task_contributions column types
    console.log("Updating 'task_contributions' columns...");
    try {
      await connection.query(`
        ALTER TABLE task_contributions
        MODIFY COLUMN task_id VARCHAR(50) NOT NULL,
        MODIFY COLUMN subtask_id VARCHAR(50) DEFAULT NULL,
        MODIFY COLUMN user_id VARCHAR(50) NOT NULL,
        MODIFY COLUMN role VARCHAR(50) DEFAULT NULL,
        MODIFY COLUMN effort_points DECIMAL(10,2) DEFAULT 0.00,
        MODIFY COLUMN approval_status VARCHAR(20) DEFAULT 'Pending',
        MODIFY COLUMN approved_by VARCHAR(50) DEFAULT NULL,
        MODIFY COLUMN created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
      `);
      console.log("✓ 'task_contributions' columns updated.");
    } catch (err) {
      console.warn("  Notice updating task_contributions:", err.message);
    }

    // 4. Update task_history column types
    console.log("Updating 'task_history' columns...");
    try {
      await connection.query(`
        ALTER TABLE task_history
        MODIFY COLUMN task_id VARCHAR(50) NOT NULL,
        MODIFY COLUMN changed_by_user_id VARCHAR(50) DEFAULT NULL,
        MODIFY COLUMN action_type VARCHAR(100) DEFAULT NULL,
        MODIFY COLUMN created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
      `);
      console.log("✓ 'task_history' columns updated.");
    } catch (err) {
      console.warn("  Notice updating task_history:", err.message);
    }

    // 5. Update task_subtasks column types
    console.log("Updating 'task_subtasks' columns...");
    try {
      await connection.query(`
        ALTER TABLE task_subtasks
        MODIFY COLUMN task_id VARCHAR(50) NOT NULL,
        MODIFY COLUMN description TEXT DEFAULT NULL,
        MODIFY COLUMN point_value DECIMAL(10,2) DEFAULT 0.00,
        MODIFY COLUMN status VARCHAR(50) DEFAULT 'To Do',
        MODIFY COLUMN assigned_to_user_id VARCHAR(50) DEFAULT NULL,
        MODIFY COLUMN created_by_user_id VARCHAR(50) DEFAULT NULL,
        MODIFY COLUMN completed_by_user_id VARCHAR(50) DEFAULT NULL,
        MODIFY COLUMN created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
      `);
      console.log("✓ 'task_subtasks' columns updated.");
    } catch (err) {
      console.warn("  Notice updating task_subtasks:", err.message);
    }

    // 6. Update task_time_logs column types
    console.log("Updating 'task_time_logs' columns...");
    try {
      await connection.query(`
        ALTER TABLE task_time_logs
        MODIFY COLUMN task_id VARCHAR(50) NOT NULL,
        MODIFY COLUMN user_id VARCHAR(50) NOT NULL,
        MODIFY COLUMN description TEXT DEFAULT NULL,
        MODIFY COLUMN status VARCHAR(20) DEFAULT 'Approved',
        MODIFY COLUMN created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
      `);
      console.log("✓ 'task_time_logs' columns updated.");
    } catch (err) {
      console.warn("  Notice updating task_time_logs:", err.message);
    }

    console.log("\nMigration completed successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    if (connection) connection.release();
    process.exit(0);
  }
}

migrate();

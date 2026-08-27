const pool = require('../config/database');

async function migrate() {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log('Connected to database. Creating tester tables...');

    // 1. Create test_cases table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS test_cases (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        module VARCHAR(100),
        priority ENUM('Low', 'Medium', 'High') DEFAULT 'Medium',
        type ENUM('Functional', 'Integration', 'Performance', 'Security') DEFAULT 'Functional',
        is_automated BOOLEAN DEFAULT FALSE,
        status ENUM('Active', 'Obsolete') DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Create test_runs table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS test_runs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        test_case_id INT NOT NULL,
        environment ENUM('QA', 'Staging', 'UAT', 'Production') DEFAULT 'QA',
        status ENUM('Passed', 'Failed', 'Blocked', 'Pending') DEFAULT 'Pending',
        executed_by INT,
        executed_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (test_case_id) REFERENCES test_cases(id) ON DELETE CASCADE
      )
    `);

    // 3. Create automation_scripts table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS automation_scripts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        test_case_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        status ENUM('Passed', 'Failed', 'Broken') DEFAULT 'Passed',
        last_run TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (test_case_id) REFERENCES test_cases(id) ON DELETE CASCADE
      )
    `);

    console.log('Tables created successfully.');
    
    // Check if data already exists
    const [rows] = await connection.query('SELECT COUNT(*) as count FROM test_cases');
    if (rows[0].count === 0) {
      console.log('Inserting mock data...');
      
      // Insert mock test cases
      await connection.query(`
        INSERT INTO test_cases (project_id, title, module, priority, is_automated) VALUES
        (1, 'Verify User Login', 'Auth', 'High', TRUE),
        (1, 'Verify Password Reset', 'Auth', 'Medium', TRUE),
        (1, 'Validate Patient Registration Flow', 'Hospital ERP', 'High', FALSE),
        (1, 'Test Appointment Booking Module', 'CRM System', 'High', FALSE),
        (1, 'Cross Browser Testing - Dashboard', 'CRM System', 'Medium', FALSE),
        (1, 'API Testing - User Management', 'HRMS', 'Low', TRUE),
        (1, 'Data Export functionality', 'Reports', 'Medium', TRUE),
        (1, 'Data import validation', 'Reports', 'Low', FALSE)
      `);
      
      // Insert mock test runs
      await connection.query(`
        INSERT INTO test_runs (project_id, test_case_id, environment, status, executed_by) VALUES
        (1, 1, 'Staging', 'Passed', 1),
        (1, 2, 'QA', 'Failed', 1),
        (1, 3, 'Staging', 'Passed', 2),
        (1, 4, 'Production', 'Blocked', 3),
        (1, 5, 'QA', 'Passed', 1),
        (1, 6, 'Staging', 'Passed', 1),
        (1, 7, 'UAT', 'Passed', 1),
        (1, 8, 'QA', 'Failed', 2)
      `);

      // Insert mock automation scripts
      await connection.query(`
        INSERT INTO automation_scripts (test_case_id, name, status) VALUES
        (1, 'auth_login_spec.js', 'Passed'),
        (2, 'auth_reset_spec.js', 'Failed'),
        (6, 'api_user_spec.js', 'Passed'),
        (7, 'reports_export_spec.js', 'Passed')
      `);

      console.log('Mock data inserted successfully.');
    } else {
      console.log('Data already exists, skipping insertion.');
    }

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    if (connection) connection.release();
    process.exit(0);
  }
}

migrate();

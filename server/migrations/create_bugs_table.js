const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

async function migrate() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 3307,
      user: process.env.DB_USER || 'all_in_one_user',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'deals_db'
    });

    console.log('Connected to db. Creating bugs table...');

    await connection.query(`
      DROP TABLE IF EXISTS bugs;
    `);

    await connection.query(`
      CREATE TABLE bugs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        module VARCHAR(100),
        bug_type VARCHAR(100) DEFAULT 'Functional',
        status ENUM('Open', 'In Progress', 'Resolved', 'Closed') DEFAULT 'Open',
        priority ENUM('Low', 'Medium', 'High') DEFAULT 'Medium',
        severity ENUM('Minor', 'Major', 'Critical') DEFAULT 'Minor',
        assignee VARCHAR(100),
        reporter VARCHAR(100),
        environment VARCHAR(100) DEFAULT 'QA',
        description TEXT,
        expected_results TEXT,
        actual_results TEXT,
        steps JSON,
        attachments JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('bugs table created successfully.');

    // Check if data already exists
    const [rows] = await connection.query('SELECT COUNT(*) as count FROM bugs');
    if (rows[0].count === 0) {
      console.log('Inserting mock data...');
      await connection.query(`
        INSERT INTO bugs (project_id, title, module, status, priority, severity, assignee, reporter) VALUES
        (1, 'Login button not working on Safari', 'Authentication', 'Open', 'High', 'Critical', 'Rahul Patil', 'Rahul Patil'),
        (1, 'Validation message not showing', 'User Management', 'In Progress', 'Medium', 'Major', 'Sneha Joshi', 'Rahul Patil'),
        (1, 'Error on saving user role', 'User Management', 'Open', 'High', 'Major', 'Akshay More', 'Priya Sharma'),
        (1, 'Dashboard widget data mismatch', 'Dashboard', 'In Progress', 'Medium', 'Minor', 'Priya Sharma', 'Rahul Patil'),
        (1, 'Page crashes on large data export', 'Reports', 'Open', 'High', 'Critical', 'Rahul Patil', 'Sneha Joshi'),
        (1, 'Unable to upload document > 5MB', 'Documents', 'Resolved', 'Low', 'Minor', 'Sneha Joshi', 'Rahul Patil'),
        (1, 'Incorrect total in invoice summary', 'Billing', 'Open', 'Medium', 'Major', 'Akshay More', 'Rahul Patil'),
        (1, 'Notification email not sent', 'Notifications', 'Resolved', 'Low', 'Minor', 'Priya Sharma', 'Rahul Patil'),
        (1, 'Search not working for inactive users', 'User Management', 'Closed', 'Medium', 'Minor', 'Rahul Patil', 'Priya Sharma'),
        (1, 'UI alignment issue on mobile view', 'Mobile App', 'Resolved', 'Low', 'Minor', 'Sneha Joshi', 'Akshay More')
      `);
      console.log('Mock data inserted successfully.');
    } else {
      console.log('Data already exists, skipping insertion.');
    }

    await connection.end();
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migrate();

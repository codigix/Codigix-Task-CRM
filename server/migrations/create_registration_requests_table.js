const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require('../config/database');

async function migrate() {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log(`Connected to database: ${process.env.DB_NAME || 'deals_db'}`);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS registration_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100),
        email VARCHAR(150) NOT NULL,
        password VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        company VARCHAR(100),
        department VARCHAR(100),
        role_type VARCHAR(100),
        role_name VARCHAR(100),
        status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
        reviewed_by INT,
        review_notes TEXT,
        reviewed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_email (email),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('✓ Migration succeeded: registration_requests table is created and ready.');
  } catch (error) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('Table registration_requests already exists.');
    } else {
      console.error('Migration failed:', error);
      process.exit(1);
    }
  } finally {
    if (connection) {
      connection.release();
    }
    process.exit(0);
  }
}

migrate();

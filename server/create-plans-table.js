const pool = require('./config/database');

async function createPlansTable() {
  let connection;
  try {
    connection = await pool.getConnection();
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS plans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100),
        description LONGTEXT,
        price DECIMAL(15, 2) NOT NULL,
        subscribers_count INT DEFAULT 0,
        status ENUM('Active', 'Inactive', 'Archived') DEFAULT 'Active',
        features JSON,
        billing_cycle VARCHAR(50),
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_name (name),
        INDEX idx_status (status),
        INDEX idx_type (type),
        INDEX idx_created_at (created_at),
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `;
    
    await connection.query(createTableSQL);
    console.log('✅ Plans table created successfully');
    
    connection.release();
    process.exit(0);
  } catch (err) {
    if (err.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('✅ Plans table already exists');
      if (connection) connection.release();
      process.exit(0);
    } else {
      console.error('❌ Error creating plans table:', err.message);
      if (connection) connection.release();
      process.exit(1);
    }
  }
}

createPlansTable();

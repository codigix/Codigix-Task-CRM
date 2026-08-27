const mysql = require('mysql2/promise');
const crypto = require('crypto');
require('dotenv').config();

function hashPassword(password) {
  return crypto.pbkdf2Sync(password, 'salt', 1000, 64, 'sha512').toString('hex');
}

async function listUsers() {
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 3307,
      user: process.env.DB_USER || 'all_in_one_user',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'deals_db'
    });

    const [rows] = await pool.query('SELECT id, email, password FROM users');
    console.log('Users in database:');
    rows.forEach(user => {
      console.log(`Email: [${user.email}], Password Length: ${user.password.length}, Hashed Password: [${user.password}]`);
    });

    const testPasswords = ['password123', 'password', '123456', 'admin', 'admin123', 'allinone', 'pass123'];
    testPasswords.forEach(pw => {
      console.log(`Hash for '${pw}': ${hashPassword(pw)}`);
    });

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

listUsers();

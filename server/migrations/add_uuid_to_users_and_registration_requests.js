const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require('../config/database');

async function migrate() {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log(`Connected to database: ${process.env.DB_NAME || 'deals_db'}`);

    // 1. Add uuid to users if not exists
    const [userCols] = await connection.query("SHOW COLUMNS FROM users LIKE 'uuid'");
    if (userCols.length === 0) {
      console.log("Adding 'uuid' column to 'users' table...");
      await connection.query("ALTER TABLE users ADD COLUMN uuid VARCHAR(36) NULL AFTER id");
      console.log("✓ 'uuid' column added to 'users'.");
    } else {
      console.log("✓ 'uuid' column already exists on 'users'.");
    }

    // 2. Add uuid to registration_requests if not exists
    const [reqCols] = await connection.query("SHOW COLUMNS FROM registration_requests LIKE 'uuid'");
    if (reqCols.length === 0) {
      console.log("Adding 'uuid' column to 'registration_requests' table...");
      await connection.query("ALTER TABLE registration_requests ADD COLUMN uuid VARCHAR(36) NULL AFTER id");
      console.log("✓ 'uuid' column added to 'registration_requests'.");
    } else {
      console.log("✓ 'uuid' column already exists on 'registration_requests'.");
    }

    // 3. Backfill existing users with cryptographically secure UUID v4
    const [usersWithoutUuid] = await connection.query("SELECT id FROM users WHERE uuid IS NULL OR uuid = ''");
    if (usersWithoutUuid.length > 0) {
      console.log(`Backfilling ${usersWithoutUuid.length} users with secure UUIDs...`);
      for (const u of usersWithoutUuid) {
        await connection.query("UPDATE users SET uuid = ? WHERE id = ?", [crypto.randomUUID(), u.id]);
      }
      console.log("✓ Users UUID backfill complete.");
    } else {
      console.log("✓ All users already have UUIDs assigned.");
    }

    // 4. Backfill existing registration requests with cryptographically secure UUID v4
    const [reqsWithoutUuid] = await connection.query("SELECT id FROM registration_requests WHERE uuid IS NULL OR uuid = ''");
    if (reqsWithoutUuid.length > 0) {
      console.log(`Backfilling ${reqsWithoutUuid.length} registration requests with secure UUIDs...`);
      for (const r of reqsWithoutUuid) {
        await connection.query("UPDATE registration_requests SET uuid = ? WHERE id = ?", [crypto.randomUUID(), r.id]);
      }
      console.log("✓ Registration requests UUID backfill complete.");
    } else {
      console.log("✓ All registration requests already have UUIDs assigned.");
    }

    // 5. Add unique indexes safely
    try {
      await connection.query("CREATE UNIQUE INDEX idx_users_uuid ON users(uuid)");
      console.log("✓ Created UNIQUE index idx_users_uuid.");
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME') {
        console.log("✓ Index idx_users_uuid already exists.");
      } else {
        console.warn("Index notice:", err.message);
      }
    }

    try {
      await connection.query("CREATE UNIQUE INDEX idx_reg_requests_uuid ON registration_requests(uuid)");
      console.log("✓ Created UNIQUE index idx_reg_requests_uuid.");
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME') {
        console.log("✓ Index idx_reg_requests_uuid already exists.");
      } else {
        console.warn("Index notice:", err.message);
      }
    }

    console.log('✓ Migration succeeded: UUID columns, data backfill, and indexes verified.');
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

require('dotenv').config();
const { execSync } = require('child_process');
const mysql = require('mysql2/promise');

async function runAutoMigration() {
  console.log('🔄 Checking database state for Prisma migrations...');
  
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ Error: DATABASE_URL is not defined in environment variables.');
    process.exit(1);
  }

  // Parse MySQL connection URL
  // Format: mysql://user:password@host:port/database
  try {
    const parsed = new URL(dbUrl);
    const connection = await mysql.createConnection({
      host: parsed.hostname || '127.0.0.1',
      port: parseInt(parsed.port, 10) || 3306,
      user: decodeURIComponent(parsed.username || 'root'),
      password: decodeURIComponent(parsed.password || ''),
      database: parsed.pathname ? parsed.pathname.replace('/', '') : undefined
    });

    // 1. Check if tables already exist in the database (e.g. 'users')
    const [tables] = await connection.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'users'"
    );

    const hasExistingTables = tables && tables.length > 0;

    // 2. Check if _prisma_migrations exists and has 0_init recorded
    let hasInitRecorded = false;
    try {
      const [migrations] = await connection.query(
        "SELECT migration_name, finished_at FROM _prisma_migrations WHERE migration_name = '0_init' AND finished_at IS NOT NULL"
      );
      hasInitRecorded = migrations && migrations.length > 0;
    } catch (_) {
      // _prisma_migrations table does not exist yet
      hasInitRecorded = false;
    }

    await connection.end();

    // 3. If tables exist but 0_init is not recorded, baseline it!
    if (hasExistingTables && !hasInitRecorded) {
      console.log('📌 Existing tables detected without baseline. Resolving 0_init as applied...');
      execSync('npx prisma migrate resolve --applied 0_init', { stdio: 'inherit' });
    } else if (!hasExistingTables) {
      console.log('✨ Fresh database detected. All migrations will be applied from scratch.');
    } else {
      console.log('✅ Baseline already in place.');
    }

    // 4. Run standard migrate deploy
    console.log('🚀 Running npx prisma migrate deploy...');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    console.log('✅ Database migration completed successfully.');
  } catch (err) {
    console.error('❌ Auto-migration failed:', err.message);
    process.exit(1);
  }
}

runAutoMigration();

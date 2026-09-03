const path = require('path');
const dotenv = require('dotenv');

// Ensure .env is loaded from server root
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { execSync } = require('child_process');
const pool = require('../config/database');

async function runAutoMigration() {
  console.log('🔄 Checking database state for Prisma migrations...');

  // Ensure DATABASE_URL is available for Prisma CLI
  if (!process.env.DATABASE_URL) {
    const host = process.env.DB_HOST || '127.0.0.1';
    const port = process.env.DB_PORT || 3306;
    const user = encodeURIComponent(process.env.DB_USER || 'root');
    const pass = process.env.DB_PASSWORD ? encodeURIComponent(process.env.DB_PASSWORD) : '';
    const db = process.env.DB_NAME || 'deals_db';
    process.env.DATABASE_URL = `mysql://${user}${pass ? `:${pass}` : ''}@${host}:${port}/${db}`;
    console.log(`ℹ️ Auto-constructed DATABASE_URL for Prisma from DB environment variables (${host}:${port}/${db}).`);
  }

  try {
    // 1. Check if tables already exist in the database (e.g. 'users')
    let hasExistingTables = false;
    try {
      const [tables] = await pool.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'users'"
      );
      hasExistingTables = tables && tables.length > 0;
    } catch (dbErr) {
      console.warn('⚠️ Could not check existing tables via pool:', dbErr.message);
    }

    // 2. Check if _prisma_migrations exists and has 0_init recorded
    let hasInitRecorded = false;
    try {
      const [migrations] = await pool.query(
        "SELECT migration_name, finished_at FROM _prisma_migrations WHERE migration_name = '0_init' AND finished_at IS NOT NULL"
      );
      hasInitRecorded = migrations && migrations.length > 0;
    } catch (_) {
      hasInitRecorded = false;
    }

    // 3. If tables exist but 0_init is not recorded, baseline it!
    if (hasExistingTables && !hasInitRecorded) {
      console.log('📌 Existing tables detected without baseline. Resolving 0_init as applied...');
      try {
        execSync('npx prisma migrate resolve --applied 0_init', {
          stdio: 'inherit',
          env: { ...process.env }
        });
      } catch (resolveErr) {
        console.warn('⚠️ Baseline resolve notice:', resolveErr.message);
      }
    } else if (!hasExistingTables) {
      console.log('✨ Fresh database detected. All migrations will be applied from scratch.');
    } else {
      console.log('✅ Baseline already in place.');
    }

    // 4. Run standard migrate deploy
    console.log('🚀 Running npx prisma migrate deploy...');
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: { ...process.env }
    });
    console.log('✅ Database migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Auto-migration error details:');
    console.error(err.message || err);
    if (err.stdout) console.error('stdout:', err.stdout.toString());
    if (err.stderr) console.error('stderr:', err.stderr.toString());
    // Safe exit to ensure server starts smoothly
    process.exit(0);
  }
}

runAutoMigration();

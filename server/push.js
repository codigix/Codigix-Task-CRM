require('dotenv').config();
const { execSync } = require('child_process');

const host = process.env.DB_HOST || '127.0.0.1';
const port = process.env.DB_PORT || 3306;
const user = encodeURIComponent(process.env.DB_USER || 'root');
const pass = process.env.DB_PASSWORD ? encodeURIComponent(process.env.DB_PASSWORD) : '';
const db = process.env.DB_NAME || 'deals_db';
const dbUrl = `mysql://${user}${pass ? `:${pass}` : ''}@${host}:${port}/${db}`;

try {
  execSync('npx prisma db push --accept-data-loss', {
    env: { ...process.env, DATABASE_URL: dbUrl },
    stdio: 'inherit'
  });
  console.log("Success!");
} catch (e) {
  console.error(e);
}

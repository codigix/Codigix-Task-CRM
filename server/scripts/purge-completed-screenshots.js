#!/usr/bin/env node
/**
 * Deletes the screenshots of finished work in completed sprints, on the machine that holds the
 * uploads folder (the VPS). Same rules as completing a sprint in the app: an image file is
 * deleted from the uploads folder first, and only then is it removed from the ticket (attachment,
 * File manager, description/comment image). Images another ticket still uses, and documents
 * (PDF, Word, ...), are kept. Files that are not in this uploads folder are left alone.
 *
 * Without --yes it only previews. Run it on the server:
 *
 *   node purge-completed-screenshots.js --server-dir /var/www/Codigix-Task-CRM/server --month 2026-10
 *   node purge-completed-screenshots.js --server-dir /var/www/Codigix-Task-CRM/server --month 2026-10 --yes
 *
 * --server-dir  the CRM server folder (its .env, node_modules and uploads); default: this script's parent
 * --month       YYYY-MM, completed sprints whose end date falls in that month; default: all completed sprints
 * --yes         actually delete (cannot be undone)
 */
const path = require('path');
const fs = require('fs');

const arg = (name) => { const i = process.argv.indexOf(`--${name}`); return i === -1 ? null : process.argv[i + 1]; };
const serverDir = path.resolve(arg('server-dir') || path.join(__dirname, '..'));
const month = arg('month');
const apply = process.argv.includes('--yes');
if (month && !/^\d{4}-\d{2}$/.test(month)) { console.error('--month must look like 2026-10'); process.exit(1); }
if (!fs.existsSync(path.join(serverDir, '.env'))) { console.error(`No .env in ${serverDir}; pass --server-dir`); process.exit(1); }

const fromServer = (mod) => require(require.resolve(mod, { paths: [serverDir] }));
fromServer('dotenv').config({ path: path.join(serverDir, '.env'), quiet: true });
const mysql = fromServer('mysql2/promise');
const { purgeScreenshots } = require(fs.existsSync(path.join(__dirname, 'screenshotCleanup.js'))
  ? path.join(__dirname, 'screenshotCleanup.js')
  : path.join(__dirname, '..', 'services', 'screenshotCleanup.js'));

const uploadPath = process.env.UPLOAD_PATH || 'uploads';
const uploadDir = path.isAbsolute(uploadPath) ? path.normalize(uploadPath) : path.resolve(serverDir, uploadPath);

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST, port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME
  });
  const db = { query: (sql, params) => conn.query(sql, params) };
  try {
    const [sprints] = await conn.query(
      `SELECT id, name FROM sprints WHERE status = 'Completed'${month ? " AND DATE_FORMAT(COALESCE(end_date, completed_at), '%Y-%m') = ?" : ''}`,
      month ? [month] : []
    );
    const ids = sprints.map(s => s.id);
    const [rows] = ids.length ? await conn.query(
      `SELECT issue_key FROM it_kanban_issues WHERE sprint_id IN (?) AND UPPER(TRIM(COALESCE(status, ''))) IN ('DONE', 'COMPLETED', 'CLOSED')`,
      [ids]
    ) : [[]];
    const keys = rows.map(r => r.issue_key);

    console.log(`Database:        ${process.env.DB_NAME} on ${process.env.DB_HOST}`);
    console.log(`Uploads folder:  ${uploadDir}`);
    console.log(`Sprints:         ${ids.length} completed${month ? ` in ${month}` : ''}`);
    console.log(`Done work items: ${keys.length}`);

    const out = await purgeScreenshots(db, keys, { dryRun: !apply, uploadDir, actor: `Server clean-up${month ? ` (${month})` : ''}` });
    const files = [...new Set(out.deleted.map(d => d.name))];
    console.log(`${apply ? 'Deleted' : 'Would delete'}:    ${files.length} screenshot file(s) in the uploads folder`);
    console.log(`Not on this server: ${out.notFound.length} (left alone)`);
    console.log(`Kept, used by other tickets: ${out.kept.length}`);
    if (out.failed.length) console.log(`Could not delete: ${out.failed.length} (left alone): ${out.failed.join(', ')}`);
    if (!apply) {
      files.slice(0, 20).forEach(f => console.log(`  ${f}`));
      if (files.length > 20) console.log(`  ... and ${files.length - 20} more`);
      console.log('\nPreview only. Add --yes to delete them permanently.');
    }
  } finally {
    await conn.end();
  }
})().catch(err => { console.error(err.message); process.exit(1); });

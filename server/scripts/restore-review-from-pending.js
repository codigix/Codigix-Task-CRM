/**
 * Moves tickets that the sprint carry-over wrongly put in LAST MONTH PENDING back to the
 * status they had (IN REVIEW / IN PROGRESS / TESTING). TO DO and ON HOLD stay in pending.
 *
 *   node scripts/restore-review-from-pending.js           preview only
 *   node scripts/restore-review-from-pending.js --apply   make the change
 *
 * A ticket is restored only when its latest history entry is a move into
 * LAST MONTH PENDING from one of those statuses.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true });
const pool = require('../config/database');

const KEEP = ['TO DO', 'ON HOLD', ''];

(async () => {
  const apply = process.argv.includes('--apply');
  const [issues] = await pool.query("SELECT issue_key FROM it_kanban_issues WHERE UPPER(TRIM(status)) = 'LAST MONTH PENDING'");
  let n = 0;
  for (const { issue_key: key } of issues) {
    const [[h]] = await pool.query(
      "SELECT old_value, changed_by FROM it_kanban_history WHERE issue_key = ? AND field = 'status' ORDER BY id DESC LIMIT 1", [key]);
    if (!h) continue;
    const prev = String(h.old_value || '').trim().toUpperCase();
    if (KEEP.includes(prev) || prev === 'LAST MONTH PENDING' || prev === 'DONE') continue;
    n += 1;
    console.log(`${key}: LAST MONTH PENDING -> ${prev}`);
    if (apply) await pool.query('UPDATE it_kanban_issues SET status = ? WHERE issue_key = ?', [prev, key]);
  }
  console.log(`${n} ticket(s) ${apply ? 'restored' : 'would be restored (run with --apply)'}.`);
  await pool.end();
})().catch(e => { console.error(e.message); process.exit(1); });

/**
 * LAST MONTH PENDING tickets that an older carry-over put into the running sprint are moved
 * back to the sprint that ended (the latest completed sprint of the same project).
 *
 *   node scripts/pending-back-to-ended-sprint.js           preview only
 *   node scripts/pending-back-to-ended-sprint.js --apply   make the change
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true });
const pool = require('../config/database');

(async () => {
  const apply = process.argv.includes('--apply');
  const [issues] = await pool.query("SELECT issue_key, project_id, sprint_id FROM it_kanban_issues WHERE UPPER(TRIM(status)) = 'LAST MONTH PENDING' AND sprint_id IS NOT NULL");
  const [sprints] = await pool.query("SELECT id, name, status, project_id, department, completed_at FROM sprints");
  const byId = new Map(sprints.map(s => [Number(s.id), s]));
  let n = 0; let noPrev = 0; const tally = {};
  for (const i of issues) {
    const cur = byId.get(Number(i.sprint_id));
    if (!cur || cur.status !== 'Active') continue;
    const prev = sprints
      .filter(s => s.status === 'Completed' && Number(s.project_id) === Number(cur.project_id ?? i.project_id) && Number(s.id) !== Number(cur.id))
      .sort((a, b) => new Date(b.completed_at || 0) - new Date(a.completed_at || 0) || b.id - a.id)[0];
    if (!prev) { noPrev += 1; continue; }
    n += 1;
    tally[`${cur.name} -> ${prev.name} (#${prev.id})`] = (tally[`${cur.name} -> ${prev.name} (#${prev.id})`] || 0) + 1;
    if (apply) await pool.query('UPDATE it_kanban_issues SET sprint_id = ?, sprint = ? WHERE issue_key = ?', [prev.id, prev.name, i.issue_key]);
  }
  console.log(tally);
  console.log(`${n} ticket(s) ${apply ? 'moved back' : 'would be moved back (run with --apply)'}; ${noPrev} have no completed sprint to go back to.`);
  await pool.end();
})().catch(e => { console.error(e.message); process.exit(1); });

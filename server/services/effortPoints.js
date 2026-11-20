/**
 * Effort points are always worked out here, on the server. A ticket is worth the standard size
 * of its kind of work x a priority weight (see services/effort.js); the planned or logged time,
 * and anything typed in the browser, never change it. Meetings are time, not output: 0 points.
 */
const effort = require('./effort');

const isMeeting = (issue) => String(issue?.type || '').toLowerCase() === 'meeting';

/** { points, workType, sizeHours, weight, known } for one ticket (or a draft: type / priority / labels). */
const priceIssue = async (pool, issue, sizesCache) => {
  const report = require('./performanceReport');
  let labels = issue.labels;
  if (typeof labels === 'string') { try { labels = JSON.parse(labels); } catch (e) { labels = []; } }
  const workType = report.workTypeOf(Array.isArray(labels) ? labels : [], issue.type);
  if (isMeeting(issue)) return { points: 0, workType, sizeHours: 0, weight: 0, known: true };
  const sizes = sizesCache || await effort.loadSizes(pool, report.DEFAULT_WORK_SIZES);
  const size = effort.sizeOf(sizes, workType);
  return { points: effort.pointsFor(size, issue.priority), workType, sizeHours: size ?? effort.FALLBACK_SIZE, weight: effort.weightFor(issue.priority), known: size != null };
};

/** Price and store points for these tickets (by issue_key). Returns how many were written. */
const fillPoints = async (pool, keys, { onlyMissing = true } = {}) => {
  const list = [...new Set((keys || []).filter(Boolean))];
  if (!list.length) return 0;
  const report = require('./performanceReport');
  const sizes = await effort.loadSizes(pool, report.DEFAULT_WORK_SIZES);
  let written = 0;
  for (let i = 0; i < list.length; i += 400) {
    const chunk = list.slice(i, i + 400);
    const [rows] = await pool.query(
      `SELECT issue_key, type, priority, labels, effort_points FROM it_kanban_issues WHERE issue_key IN (${chunk.map(() => '?').join(',')})`, chunk);
    const memo = new Map();
    for (const r of rows) {
      if (onlyMissing && Number(r.effort_points) > 0) continue;
      const sig = `${r.type}|${r.priority}|${typeof r.labels === 'string' ? r.labels : JSON.stringify(r.labels)}`;
      if (!memo.has(sig)) memo.set(sig, (await priceIssue(pool, r, sizes)).points);
      const pts = memo.get(sig);
      if (Number(r.effort_points) !== pts) {
        await pool.query('UPDATE it_kanban_issues SET effort_points = ? WHERE issue_key = ?', [pts, r.issue_key]);
        written += 1;
      }
    }
  }
  return written;
};

/** Every ticket that has no points yet (meetings stay at 0). Safe to run at any time. */
const backfillMissing = async (pool) => {
  const [rows] = await pool.query("SELECT issue_key FROM it_kanban_issues WHERE COALESCE(effort_points, 0) = 0 AND LOWER(COALESCE(type, '')) <> 'meeting'");
  return fillPoints(pool, rows.map(r => r.issue_key));
};

module.exports = { priceIssue, fillPoints, backfillMissing };

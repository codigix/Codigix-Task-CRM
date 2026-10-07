/**
 * Dummy data for testing the performance report — NOT real work.
 *
 *   node scripts/perf-test-data.js           create (replaces any previous test data)
 *   node scripts/perf-test-data.js --remove  delete all of it
 *
 * Everything belongs to one fake employee, "Perf Test (DUMMY)" (perf.test@example.invalid,
 * Marketing, Graphics Designer), whose password is unusable so nobody can log in as them.
 * Tickets use keys ZZT-1xx and titles starting "[TEST]". Rows are written straight to the
 * database, so no notifications or emails are sent.
 *
 * Scenarios covered (spread over the last 6 months so monthly/quarterly views fill in):
 *   on-time, late and no-due-date completions · a reopened ticket · an open overdue ticket ·
 *   an open ticket not yet due · automatic and manual time logs · estimates (incl. an
 *   overrun) · several work types · a very fast task (record) · an on-time streak ·
 *   a completed subtask · comments and field updates · meetings (follow-up meeting,
 *   internal video call, activity meeting, call) · a manager review · approved points.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true });
const crypto = require('crypto');
const pool = require('../config/database');
const { workingSecondsBetween } = require('../services/workTime');

const EMAIL = 'perf.test@example.invalid';
const NAME = 'Perf Test (DUMMY)';
const FIRST = 'Perf Test';
const LAST = '(DUMMY)';
const KEY_PREFIX = 'ZZT-';
const TAG = 'perf-test';

const at = (monthsAgo, day, hh = 10, mm = 0) => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() - monthsAgo, day, hh, mm, 0);
};
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const hms = (d) => d.toTimeString().slice(0, 8);

async function remove(conn) {
  const [[u]] = await conn.query('SELECT id FROM users WHERE email = ?', [EMAIL]);
  const keyLike = `${KEY_PREFIX}%`;
  const counts = {};
  const del = async (label, sql, params) => { const [r] = await conn.query(sql, params); counts[label] = r.affectedRows; };
  await del('worklogs', 'DELETE FROM it_kanban_worklogs WHERE issue_key LIKE ?', [keyLike]);
  await del('history', 'DELETE FROM it_kanban_history WHERE issue_key LIKE ?', [keyLike]);
  await del('contributions', 'DELETE FROM task_contributions WHERE task_id LIKE ?', [keyLike]);
  await del('notifications', 'DELETE FROM notifications WHERE entity_key LIKE ?', [keyLike]);
  await del('tickets', 'DELETE FROM it_kanban_issues WHERE issue_key LIKE ?', [keyLike]);
  if (u) {
    await del('followups', "DELETE FROM followups WHERE assigned_to = ? AND subject LIKE '[TEST]%'", [u.id]);
    await del('activities', "DELETE FROM activities WHERE assigned_to = ? AND title LIKE '[TEST]%'", [u.id]);
    await del('calls', "DELETE FROM call_history WHERE created_by = ? AND caller_name = ?", [u.id, NAME]);
    await del('reviews', 'DELETE FROM performance_reviews WHERE employee_id = ?', [u.id]);
    await del('user notifications', 'DELETE FROM notifications WHERE user_id = ?', [u.id]);
    await del('user', 'DELETE FROM users WHERE id = ?', [u.id]);
  }
  return counts;
}

async function create(conn) {
  // ── the dummy employee ──
  const [[role]] = await conn.query("SELECT id FROM roles WHERE name = 'Graphics Designer'");
  const [[dept]] = await conn.query("SELECT id FROM departments WHERE name = 'Marketing Department'");
  const unusablePassword = `disabled$${crypto.randomBytes(32).toString('hex')}`; // matches no hash format
  const [ins] = await conn.query(
    `INSERT INTO users (uuid, first_name, last_name, username, email, password, role_id, status, department, department_id, job_title, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'Active', 'Marketing Department', ?, 'Graphics Designer (test account)', ?)`,
    [crypto.randomUUID(), FIRST, LAST, 'perf-test-dummy', EMAIL, unusablePassword, role?.id || null, dept?.id || null, at(7, 1, 9, 30)]
  );
  const uid = ins.insertId;
  const [[reviewer]] = await conn.query(
    "SELECT u.id, CONCAT(u.first_name, ' ', COALESCE(u.last_name, '')) AS name FROM users u JOIN roles r ON r.id = u.role_id WHERE r.name = 'Marketing Manager' LIMIT 1"
  );

  let n = 101;
  const tickets = [];
  const history = (key, field, from, to, when, by = NAME) => conn.query(
    'INSERT INTO it_kanban_history (issue_key, field, old_value, new_value, changed_by, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [key, field, from, to, by, when]
  );
  const worklog = (key, seconds, desc, started) => conn.query(
    'INSERT INTO it_kanban_worklogs (issue_key, author, seconds, description, started_at, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [key, NAME, Math.round(seconds), desc, started, started]
  );

  /**
   * One ticket. start/done are Dates (done = null for open work); due may be null.
   * logs: 'auto' = automatic In Progress time, number = extra manual hours, false = none.
   */
  const ticket = async ({ title, workType, start, done, due, status, estimate, points, logs = 'auto', reopen = false, subtask = false, comment = null }) => {
    const key = `${KEY_PREFIX}${n++}`;
    const created = addDays(start, -1);
    const comments = comment ? [{ author: NAME, text: comment, time: addDays(start, 0.1).toISOString() }] : [];
    const subtasks = subtask ? [
      { id: 1, title: 'Draft concepts', completed: true, assignee: NAME, status: 'Done', completed_at: addDays(start, 0.2).toISOString() },
      { id: 2, title: 'Client changes', completed: Boolean(done), assignee: NAME, status: done ? 'Done' : 'To Do' }
    ] : [];
    await conn.query(
      `INSERT INTO it_kanban_issues (issue_key, title, type, priority, status, assignee, reporter, team, department, due_date, start_date,
         labels, subtasks, linked_issues, comments, progress, original_estimate, remaining_estimate, time_spent, effort_points,
         contribution_review_status, created_at, updated_at, components, environment, vulnerability)
       VALUES (?, ?, 'Task', 'Medium', ?, ?, ?, 'None', 'Marketing', ?, ?, ?, ?, '[]', ?, 0, ?, '0h', '0h', ?, 'Pending', ?, ?, '', '', '')`,
      [key, `[TEST] ${title}`, status, NAME, reviewer?.name || 'Unassigned', due ? ymd(due) : null, ymd(start),
        JSON.stringify([workType, TAG]), JSON.stringify(subtasks), JSON.stringify(comments),
        estimate || '0h', points || 0, created, done || start]
    );
    await history(key, 'status', 'TO DO', 'IN PROGRESS', start);
    if (done) {
      const end = reopen ? addDays(done, -2) : done;
      await history(key, 'status', 'IN PROGRESS', 'DONE', end);
      if (logs === 'auto' || typeof logs === 'number') {
        await worklog(key, workingSecondsBetween(start, end), 'Auto-logged: In Progress → DONE', start);
      }
      if (reopen) {
        const back = addDays(done, -1);
        await history(key, 'status', 'DONE', 'IN PROGRESS', back, reviewer?.name || 'Manager');
        await history(key, 'status', 'IN PROGRESS', 'DONE', done);
        await worklog(key, workingSecondsBetween(back, done), 'Auto-logged: In Progress → DONE', back);
      }
      if (typeof logs === 'number') await worklog(key, logs * 3600, 'Manual: client revisions call prep', addDays(start, 0.05));
    } else if (status === 'IN PROGRESS' && logs) {
      await worklog(key, 2 * 3600, 'Manual: worked on layout', addDays(start, 0.1));
    }
    if (comment) await history(key, 'description', '', 'Updated brief', addDays(start, 0.15));
    tickets.push({ key, done, points });
    return key;
  };

  // Month-by-month: completions grow to a best month (1 month ago) — fills scorecards,
  // trends and champions. day = day of month; durations in working days.
  const plan = [
    // [monthsAgo, day, workType, workDays, dueSlackDays (+ early / - late / null none), estimate, points]
    [5, 6, 'GMB Graphics', 1, 1, '6h', 3], [5, 18, 'Content Writing', 2, -1, '8h', 5],
    [4, 4, 'GMB Graphics', 1, 0, '6h', 3], [4, 12, 'Blogs Graphics', 2, 1, '10h', 5], [4, 22, 'GMB Graphics', 1, null, '6h', 3],
    [3, 3, 'GMB Graphics', 1, 1, '6h', 3], [3, 9, 'Content Writing', 2, 0, '8h', 5], [3, 16, 'Blogs Graphics', 3, -2, '10h', 8], [3, 24, 'GMB Graphics', 1, 1, '6h', 3],
    [2, 2, 'GMB Graphics', 1, 0, '6h', 3], [2, 10, 'Content Writing', 1, 1, '8h', 5], [2, 20, 'GMB Graphics', 2, -1, '6h', 3],
    [1, 2, 'GMB Graphics', 1, 1, '6h', 3], [1, 5, 'Blogs Graphics', 2, 0, '10h', 5], [1, 9, 'GMB Graphics', 1, 1, '6h', 3],
    [1, 15, 'Content Writing', 2, 0, '8h', 5], [1, 22, 'GMB Graphics', 1, 2, '6h', 3]
  ];
  for (const [mAgo, day, workType, workDays, slack, estimate, points] of plan) {
    const start = at(mAgo, day, 10, 0);
    const done = new Date(addDays(start, workDays - 1).setHours(16, 0, 0, 0));
    const due = slack == null ? null : addDays(done, slack);
    await ticket({ title: `${workType} for client post`, workType, start, done, due, status: 'DONE', estimate, points });
  }

  // Special scenarios in the current month.
  const thisMonth = new Date().getDate();
  const d = (day) => Math.min(day, Math.max(1, thisMonth - 1));
  // Very fast task (all-time fastest record).
  await ticket({ title: 'Quick GMB story edit', workType: 'GMB Graphics', start: at(0, d(1), 10, 0), done: at(0, d(1), 11, 30), due: at(0, d(2)), status: 'DONE', estimate: '2h', points: 1 });
  // Estimate overrun + manual extra hours + subtask + comment.
  await ticket({ title: 'Blog banner set (overran estimate)', workType: 'Blogs Graphics', start: at(0, d(2), 9, 30), done: at(0, d(5), 18, 0), due: at(0, d(5)), status: 'DONE', estimate: '6h', points: 8, logs: 4, subtask: true, comment: 'Shared three banner options with the client.' });
  // Reopened after done.
  await ticket({ title: 'Content calendar post (reopened once)', workType: 'Content Writing', start: at(0, d(3), 10, 0), done: at(0, d(6), 15, 0), due: at(0, d(4)), status: 'DONE', estimate: '8h', points: 5, reopen: true });
  // Open and overdue.
  await ticket({ title: 'Festival creative (overdue)', workType: 'GMB Graphics', start: at(0, d(2), 11, 0), done: null, due: at(0, d(3)), status: 'IN PROGRESS', estimate: '6h', points: 3 });
  // Open, due in the future, no time yet.
  await ticket({ title: 'Next week reel thumbnail', workType: 'Video', start: new Date(), done: null, due: addDays(new Date(), 7), status: 'TO DO', estimate: '4h', points: 2, logs: false });

  // ── meetings ──
  const meetings = [
    [4, 8, 'Meeting', 'Monthly design review', '45m'], [3, 12, 'Google Meet', 'Client brief: GMB posts', '30m'],
    [2, 14, 'Meeting', 'Monthly design review', '60m'], [1, 7, 'Internal Video Call', 'Creative sync', '25m'],
    [1, 21, 'Zoom Meeting', 'Client feedback round', '40m'], [0, d(4), 'Internal Video Call', 'Daily stand-up', '15m']
  ];
  for (const [mAgo, day, type, subject, dur] of meetings) {
    const when = at(mAgo, day, 11, 0);
    await conn.query(
      `INSERT INTO followups (related_type, related_id, type, subject, scheduled_date, scheduled_time, assigned_to, assigned_to_name, status, meeting_duration, call_duration, created_at)
       VALUES ('Internal', NULL, ?, ?, ?, ?, ?, ?, 'Completed', ?, ?, ?)`,
      [type, `[TEST] ${subject}`, ymd(when), hms(when), uid, NAME, dur, dur, when]
    );
  }
  // A cancelled meeting must NOT count.
  await conn.query(
    `INSERT INTO followups (related_type, related_id, type, subject, scheduled_date, scheduled_time, assigned_to, assigned_to_name, status, meeting_duration, created_at)
     VALUES ('Internal', NULL, 'Meeting', '[TEST] Cancelled sync (should not count)', ?, '15:00:00', ?, ?, 'Cancelled', '30m', NOW())`,
    [ymd(at(0, d(5))), uid, NAME]
  );
  await conn.query(
    `INSERT INTO activities (activity_type, title, status, assigned_to, created_by, scheduled_date, completed_date, duration_minutes, created_at)
     VALUES ('Meeting', '[TEST] Quarterly goals meeting', 'Completed', ?, ?, ?, ?, 50, ?)`,
    [uid, uid, ymd(at(2, 25)), at(2, 25, 12, 0), at(2, 25, 12, 0)]
  );
  await conn.query(
    `INSERT INTO call_history (caller_name, call_type, call_direction, duration, started_at, created_by, created_at)
     VALUES (?, 'Audio Call', 'Outgoing', 600, ?, ?, ?)`,
    [NAME, at(1, 12, 15, 0), uid, at(1, 12, 15, 0)]
  );

  // ── manager review + approved points ──
  if (reviewer) {
    await conn.query(
      `INSERT INTO performance_reviews (employee_id, reviewer_id, score, task_completion, quality_of_work, on_time_delivery, efficiency, review_gate_points, points_distribution, feedback, created_at)
       VALUES (?, ?, 82, 90, 80, 78, 80, 0, 0, '[TEST] Strong output on GMB graphics; watch estimates on blog banners.', ?)`,
      [uid, reviewer.id, at(1, 28, 17, 0)]
    );
  }
  for (const t of tickets.filter(x => x.done).slice(-6)) {
    await conn.query(
      `INSERT INTO task_contributions (task_id, subtask_id, user_id, role, effort_points, contribution_source, approval_status, approved_by, approved_at)
       VALUES (?, NULL, ?, 'Owner', ?, 'Parent Task Completion (No Subtasks)', 'Approved', ?, ?)`,
      [t.key, String(uid), t.points, reviewer ? String(reviewer.id) : null, addDays(t.done, 1)]
    );
  }

  return { userId: uid, tickets: tickets.length, completed: tickets.filter(t => t.done).length };
}

(async () => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const removed = await remove(conn);
    if (process.argv.includes('--remove')) {
      await conn.commit();
      console.log('Removed test data:', removed);
    } else {
      const created = await create(conn);
      await conn.commit();
      console.log('Created test data:', created);
    }
  } catch (err) {
    await conn.rollback();
    console.error('Failed, nothing was changed:', err.message);
    process.exitCode = 1;
  } finally {
    conn.release();
    await pool.end().catch(() => { });
  }
})();

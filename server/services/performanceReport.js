/**
 * Employee performance report engine.
 *
 * Every number here is computed from what the system actually recorded — ticket status
 * history, work logs, timesheets, meetings, approved points and manager reviews. Nothing
 * is estimated or filled in: when there is no data, the value is null and the UI says so.
 *
 * Sources
 *   Tickets      it_kanban_issues (+ it_kanban_history for when each moved to In Progress / Done)
 *   Project work project_tasks (assigned_to, completed_date, actual_hours)
 *   General work general_tasks (current_assignee_id)
 *   Time         it_kanban_worklogs (by author name), task_time_logs, project_timesheets (by user id)
 *   Meetings     activities (type Meeting), followups (meeting types), call_history
 *   Points       task_contributions (approved through the Review Gate)
 *   Reviews      performance_reviews
 *   Activity     it_kanban_history changes and ticket comments made by the person
 */

const { parseDurationToSeconds: parseWorkDuration, workingSecondsBetween, workingDaysBetween } = require('./workTime');

const DAY = 24 * 60 * 60 * 1000;
const DONE = new Set(['DONE', 'COMPLETED', 'CLOSED', 'RESOLVED']);
const IN_PROGRESS = new Set(['IN PROGRESS', 'IN_PROGRESS', 'DEVELOPMENT', 'IN REVIEW', 'REVIEW', 'TESTING']);
const MEETING_FOLLOWUP_TYPES = ['Meeting', 'Google Meet', 'Internal Video Call', 'Zoom Meeting', 'Demo'];
// Placeholder logins seeded per department, not real people.
const SYSTEM_USERNAMES = new Set(['admin', 'leads', 'deals', 'sales', 'marketing', 'it', 'accounting']);

// Score weights. Components without data are dropped and the rest re-weighted.
// efficiency = planned time ÷ actual time on finished tasks that had a plan (capped at 100).
// The score measures work, not ticket counts:
//   output      effort delivered (each finished task is worth its size in standard hours)
//               as a share of the working hours the person had available
//   utilisation hours actually recorded vs working hours available
//   onTime      finished by the due date
//   engagement  days with recorded activity vs working days available
//   efficiency  planned ÷ actual time on tasks that had a plan
//   review      manager review score
// Parts without data are left out and the rest re-weighted.
const SCORE_WEIGHTS = { output: 35, utilisation: 20, onTime: 15, engagement: 10, efficiency: 10, review: 10 };

// Standard size of each kind of work, in hours, when a ticket has no planned time of its
// own. HR/managers edit these on the performance page (stored in work_type_sizes); these
// are only the starting values.
const DEFAULT_WORK_SIZES = {
  'GMB': 0.5, 'GMB Graphics': 1, 'Social Media Graphics': 1.5, 'sm-creative': 1.5,
  'Blogs': 1, 'Blogs Graphics': 1.5, 'Content Writing': 2.5, 'SEO': 2, 'Video': 4,
  'Task': 2, 'Story': 4, 'Bug': 3, 'Test': 1.5,
  'Campaign': 4, 'Design': 2, 'Content': 2.5, 'Search': 2, 'Social': 1,
  'Project task': 2, 'General task': 2
};
const FALLBACK_SIZE = 1;
// Harder priorities count for a little more of the same work.
const PRIORITY_WEIGHT = { low: 1, medium: 1, high: 1.25, highest: 1.5, critical: 1.5 };

const isDone = (s) => DONE.has(String(s || '').toUpperCase().trim());
const isActive = (s) => IN_PROGRESS.has(String(s || '').toUpperCase().trim());
// "On hold" / "Under discussion": paused by decision, so not counted as overdue.
const isOnHold = (s) => /HOLD|DISCUSS/.test(String(s || '').toUpperCase());
const toDate = (v) => {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d.getTime()) ? null : d;
};
const inRange = (d, from, to) => Boolean(d) && d >= from && d <= to;
const round = (n, dp = 1) => (n == null || !isFinite(n) ? null : Math.round(n * 10 ** dp) / 10 ** dp);
const pct = (num, den) => (den > 0 ? round((num / den) * 100, 0) : null);
const normName = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const quarterKey = (d) => `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
const parseJson = (v, fallback) => {
  if (v == null) return fallback;
  if (typeof v !== 'string') return v;
  try { return JSON.parse(v); } catch (e) { return fallback; }
};

// What kind of work a ticket is: its first meaningful label (e.g. "GMB Graphics",
// "Content Writing"), else its type (Task, Bug, Design, ...). Labels that only say where a
// ticket came from or which board it is on are skipped.
// Marker for tickets that must not count in performance (see buildFacts).
const EXCLUDE_LABEL = 'not-in-performance';
const NON_WORK_LABELS = new Set(['content-calendar', 'it', 'marketing', 'ai-added', EXCLUDE_LABEL]);
const workTypeOf = (labels, type) => {
  const list = Array.isArray(labels) ? labels : [];
  const label = list.map(l => String(l || '').trim()).find(l => l && !NON_WORK_LABELS.has(l.toLowerCase()));
  return label || type || 'Task';
};

// "2h 30m", "1d", "45m", "1.5h", 90 (minutes) -> hours
// Same rules as the board: "1d" is one working day from WORK_SCHEDULE (e.g. 9h).
const parseDurationHours = (v) => {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return v / 60;
  const secs = parseWorkDuration(v);
  return secs ? secs / 3600 : null;
};

/**
 * Resolves a period request into a date range.
 *   period=month&value=2026-10 | period=quarter&value=2026-Q4 | period=year&value=2026
 *   period=custom&from=2026-01-01&to=2026-03-31
 */
const resolveRange = ({ period = 'month', value, from, to } = {}) => {
  const now = new Date();
  let start; let end; let label;
  if (period === 'custom' && from && to) {
    start = new Date(`${from}T00:00:00`);
    end = new Date(`${to}T23:59:59.999`);
    label = `${from} – ${to}`;
  } else if (period === 'quarter') {
    const m = /^(\d{4})-Q([1-4])$/i.exec(value || '');
    const y = m ? Number(m[1]) : now.getFullYear();
    const q = m ? Number(m[2]) : Math.floor(now.getMonth() / 3) + 1;
    start = new Date(y, (q - 1) * 3, 1);
    end = new Date(y, q * 3, 0, 23, 59, 59, 999);
    label = `Q${q} ${y}`;
    period = 'quarter';
  } else if (period === 'year') {
    const y = /^\d{4}$/.test(value || '') ? Number(value) : now.getFullYear();
    start = new Date(y, 0, 1);
    end = new Date(y, 11, 31, 23, 59, 59, 999);
    label = String(y);
  } else {
    const m = /^(\d{4})-(\d{2})$/.exec(value || '');
    const y = m ? Number(m[1]) : now.getFullYear();
    const mo = m ? Number(m[2]) - 1 : now.getMonth();
    start = new Date(y, mo, 1);
    end = new Date(y, mo + 1, 0, 23, 59, 59, 999);
    label = start.toLocaleString('en-GB', { month: 'long', year: 'numeric' });
    period = 'month';
  }
  if (isNaN(start) || isNaN(end) || start > end) throw new Error('Invalid date range');
  return { period, from: start, to: end, label };
};

/** Loads everything once; small tables, so a single pass in memory is simplest. */
const loadDataset = async (pool) => {
  const q = async (sql, params = []) => {
    try { return (await pool.query(sql, params))[0]; } catch (e) {
      // A missing optional table must not break the whole report.
      if (e.code === 'ER_NO_SUCH_TABLE' || e.code === 'ER_BAD_FIELD_ERROR') return [];
      throw e;
    }
  };

  const [users, issues, history, worklogs, timeLogs, timesheets, projectTasks, generalTasks,
    activities, followups, calls, contributions, reviews, calendarEvents, workSizes] = await Promise.all([
    q(`SELECT u.id, u.first_name, u.last_name, u.username, u.email, u.department, u.status, u.created_at, u.avatar,
              r.name AS role_name
         FROM users u LEFT JOIN roles r ON r.id = u.role_id`),
    // estimate_approved / requested_estimate say whether a plan is trusted for scoring.
    pool.query(`SELECT id, issue_key, title, type, priority, status, assignee, due_date, start_date, created_at, updated_at, effort_points, story_points, original_estimate, subtasks, comments, project_id, department, labels, estimate_approved, requested_estimate FROM it_kanban_issues`)
      .then(r => r[0])
      .catch(e => (e.code === 'ER_BAD_FIELD_ERROR' ? q(`SELECT id, issue_key, title, type, priority, status, assignee, due_date, start_date, created_at, updated_at, effort_points, story_points, original_estimate, subtasks, comments, project_id, department, labels FROM it_kanban_issues`) : Promise.reject(e))),
    q(`SELECT issue_key, field, old_value, new_value, changed_by, created_at FROM it_kanban_history ORDER BY created_at ASC`),
    pool.query(`SELECT issue_key, author, seconds, description, started_at, created_at FROM it_kanban_worklogs
                WHERE COALESCE(approval, 'approved') = 'approved'`)
      .then(r => r[0])
      .catch(e => (e.code === 'ER_BAD_FIELD_ERROR' ? q(`SELECT issue_key, author, seconds, description, started_at, created_at FROM it_kanban_worklogs`) : Promise.reject(e))),
    q(`SELECT user_id, hours, started_at, created_at, task_id FROM task_time_logs`),
    q(`SELECT user_id, hours_worked, work_date FROM project_timesheets`),
    q(`SELECT id, task_key, title, status, assigned_to, start_date, due_date, completed_date, created_at, updated_at,
              actual_hours, effort_points, estimated_hours FROM project_tasks`),
    q(`SELECT id, title, status, current_assignee_id, due_date, created_at, updated_at, effort_points, actual_hours,
              estimated_hours FROM general_tasks WHERE current_assignee_id IS NOT NULL`),
    q(`SELECT id, title, assigned_to, created_by, scheduled_date, completed_date, duration_minutes, status
         FROM activities WHERE activity_type = 'Meeting'`),
    q(`SELECT id, subject, type, assigned_to, assigned_to_name, scheduled_date, meeting_duration, call_duration, status
         FROM followups WHERE type IN (${MEETING_FOLLOWUP_TYPES.map(() => '?').join(',')})`, MEETING_FOLLOWUP_TYPES),
    q(`SELECT id, call_type, duration, started_at, created_at, created_by, caller_name FROM call_history`),
    q(`SELECT task_id, user_id, effort_points, approved_at, approval_status FROM task_contributions WHERE approval_status = 'Approved'`),
    q(`SELECT pr.id, pr.employee_id, pr.reviewer_id, pr.score, pr.task_completion, pr.quality_of_work, pr.on_time_delivery,
              pr.efficiency, pr.feedback, pr.created_at,
              TRIM(CONCAT(COALESCE(ru.first_name,''),' ',COALESCE(ru.last_name,''))) AS reviewer_name
         FROM performance_reviews pr LEFT JOIN users ru ON ru.id = pr.reviewer_id
        ORDER BY pr.created_at DESC`),
    q(`SELECT e.id, e.title, e.category, e.start_at, e.end_at, e.attendee_ids, e.created_by, e.status, e.created_at,
              r.name AS creator_role
         FROM calendar_events e
         LEFT JOIN users u ON u.id = e.created_by LEFT JOIN roles r ON r.id = u.role_id
         WHERE e.category IN ('Meeting', 'Online meeting', 'Client call', 'Review', 'Training') AND e.status <> 'Cancelled' AND e.start_at <= NOW()`),
    q(`SELECT work_type, hours FROM work_type_sizes`)
  ]);

  return { users, issues, history, worklogs, timeLogs, timesheets, projectTasks, generalTasks, activities, followups, calls, contributions, reviews, calendarEvents, workSizes };
};

/** Turns raw rows into per-person facts with dates, attributed to user ids. */
const buildFacts = (data) => {
  const employees = data.users
    .filter(u => !SYSTEM_USERNAMES.has(String(u.username || '').toLowerCase()))
    .map(u => ({
      id: u.id,
      name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || u.email,
      email: u.email,
      username: u.username,
      role: u.role_name || 'Employee',
      department: u.department || 'Unassigned',
      status: u.status || 'Active',
      joinedAt: u.created_at,
      avatar: u.avatar || null
    }));

  // People are stored by display name on tickets and work logs; map names back to ids.
  const byName = new Map();
  data.users.forEach(u => {
    const full = normName(`${u.first_name || ''} ${u.last_name || ''}`);
    [full, normName(u.username), normName(u.email)].filter(Boolean).forEach(n => { if (!byName.has(n)) byName.set(n, u.id); });
  });
  const idForName = (name) => byName.get(normName(name)) || null;

  // Assignee changes per ticket, oldest first: who held a ticket at any moment.
  const assigneeEvents = new Map();
  data.history.filter(h => h.field === 'assignee').forEach(h => {
    if (!assigneeEvents.has(h.issue_key)) assigneeEvents.set(h.issue_key, []);
    assigneeEvents.get(h.issue_key).push({ from: h.old_value, to: h.new_value, at: toDate(h.created_at) });
  });
  const assigneeAt = (issue, when) => {
    const ev = assigneeEvents.get(issue.issue_key);
    if (!ev || !ev.length || !when) return issue.assignee;
    const before = ev.filter(e => e.at && e.at <= when);
    if (before.length) return before[before.length - 1].to;
    return ev[0].from; // before the first recorded change
  };

  // Status transitions per ticket.
  const statusEvents = new Map();
  data.history.filter(h => h.field === 'status').forEach(h => {
    if (!statusEvents.has(h.issue_key)) statusEvents.set(h.issue_key, []);
    statusEvents.get(h.issue_key).push({ to: h.new_value, from: h.old_value, at: toDate(h.created_at), by: h.changed_by });
  });

  const tasks = []; // unified task facts
  const subtaskFacts = [];

  // Tickets labelled 'not-in-performance' (e.g. old work closed in bulk) are left out of
  // every figure: not assigned work, not completed work, no time, no activity.
  const excludedKeys = new Set(data.issues
    .filter(i => (parseJson(i.labels, []) || []).map(l => String(l).toLowerCase()).includes(EXCLUDE_LABEL))
    .map(i => i.issue_key));
  if (excludedKeys.size) {
    data.issues = data.issues.filter(i => !excludedKeys.has(i.issue_key));
    data.history = data.history.filter(h => !excludedKeys.has(h.issue_key));
    data.worklogs = data.worklogs.filter(w => !excludedKeys.has(w.issue_key));
    data.contributions = data.contributions.filter(c => !excludedKeys.has(String(c.task_id)));
  }

  data.issues.forEach(i => {
    const events = statusEvents.get(i.issue_key) || [];
    const lastDone = [...events].reverse().find(e => isDone(e.to));
    const firstActive = events.find(e => isActive(e.to));
    const reopened = events.filter(e => isDone(e.from) && !isDone(e.to)).length;
    const done = isDone(i.status);
    const completedAt = done ? (lastDone?.at || toDate(i.updated_at)) : null;
    const startedAt = firstActive?.at || toDate(i.start_date) || toDate(i.created_at);
    // Finished work belongs to whoever held it when it was finished, so reassigning a Done
    // ticket afterwards doesn't move the credit.
    const userId = idForName(done && lastDone ? assigneeAt(i, lastDone.at) : i.assignee);

    tasks.push({
      source: 'Ticket',
      key: i.issue_key,
      title: i.title,
      type: i.type,
      priority: i.priority,
      status: i.status,
      userId,
      createdAt: toDate(i.created_at),
      startedAt,
      dueAt: toDate(i.due_date),
      completedAt,
      completionEstimated: done && !lastDone, // no history row: date taken from last update
      points: Number(i.effort_points) || Number(i.story_points) || 0,
      estimateHours: parseDurationHours(i.original_estimate),
      // A plan set or approved by a manager is trusted; an employee's own plan isn't.
      estimateApproved: Number(i.estimate_approved) === 1,
      requestedHours: parseDurationHours(i.requested_estimate),
      reopened,
      labels: parseJson(i.labels, []) || [],
      workType: workTypeOf(parseJson(i.labels, []), i.type)
    });

    // Subtasks (stored as JSON on the ticket) count for whoever they are assigned to.
    (parseJson(i.subtasks, []) || []).forEach(st => {
      if (!st || !st.completed) return;
      const sid = idForName(st.assignee);
      if (!sid) return;
      subtaskFacts.push({ userId: sid, parentKey: i.issue_key, title: st.title, at: toDate(st.completed_at) || completedAt || toDate(i.updated_at) });
    });
  });

  data.projectTasks.forEach(t => {
    const done = isDone(t.status);
    tasks.push({
      source: 'Project task',
      key: t.task_key || `PT-${t.id}`,
      title: t.title,
      type: 'Project task',
      priority: null,
      status: t.status,
      userId: t.assigned_to || null,
      createdAt: toDate(t.created_at),
      startedAt: toDate(t.start_date) || toDate(t.created_at),
      dueAt: toDate(t.due_date),
      completedAt: done ? (toDate(t.completed_date) || toDate(t.updated_at)) : null,
      completionEstimated: done && !t.completed_date,
      points: Number(t.effort_points) || 0,
      estimateHours: t.estimated_hours != null ? Number(t.estimated_hours) : null,
      estimateApproved: true,
      reopened: 0,
      labels: [],
      workType: 'Project task'
    });
  });

  data.generalTasks.forEach(t => {
    const done = isDone(t.status);
    tasks.push({
      source: 'General task',
      key: `GT-${t.id}`,
      title: t.title,
      type: 'General task',
      priority: null,
      status: t.status,
      userId: t.current_assignee_id,
      createdAt: toDate(t.created_at),
      startedAt: toDate(t.created_at),
      dueAt: toDate(t.due_date),
      completedAt: done ? toDate(t.updated_at) : null,
      completionEstimated: done,
      points: Number(t.effort_points) || 0,
      estimateHours: t.estimated_hours != null ? Number(t.estimated_hours) : null,
      estimateApproved: true,
      reopened: 0,
      labels: [],
      workType: 'General task'
    });
  });

  // Effort: what each task is worth in standard hours. Its own planned time wins; otherwise
  // the standard size for its kind of work; otherwise 1 hour. Then a priority weight.
  const sizeMap = new Map(Object.entries(DEFAULT_WORK_SIZES).map(([k, v]) => [k.toLowerCase(), v]));
  (data.workSizes || []).forEach(r => { if (Number(r.hours) > 0) sizeMap.set(String(r.work_type).toLowerCase(), Number(r.hours)); });
  tasks.forEach(t => {
    const std = sizeMap.get(String(t.workType || '').toLowerCase());
    // Trusted plan = a manager-approved planned time, else the standard size. Effort and
    // efficiency both use it, so padding one's own planned time gains nothing.
    const approved = t.estimateApproved && t.estimateHours > 0;
    t.planHours = approved ? t.estimateHours : (std != null ? std : null);
    t.planBasis = approved ? 'approved plan' : (std != null ? 'standard size' : null);
    const base = t.planHours != null ? t.planHours : FALLBACK_SIZE;
    t.effortBasis = approved ? 'approved' : (std != null ? 'standard' : 'default');
    // How the employee's own plan (or pending request) compares with the standard.
    const own = !t.estimateApproved && t.estimateHours > 0 ? t.estimateHours : (t.requestedHours > 0 ? t.requestedHours : null);
    t.planVsStandard = own != null && std ? own / std : null;
    t.effortHours = round(base * (PRIORITY_WEIGHT[String(t.priority || 'medium').toLowerCase()] || 1), 2);
  });

  // Time entries (hours), each attributed to a user id with a date and optionally a task key.
  const time = [];
  data.worklogs.forEach(w => {
    const uid = idForName(w.author);
    if (!uid) return;
    time.push({ userId: uid, hours: (Number(w.seconds) || 0) / 3600, at: toDate(w.started_at) || toDate(w.created_at), taskKey: w.issue_key, source: /^auto-logged/i.test(w.description || '') ? 'Automatic (In Progress)' : 'Work log', note: w.description || null });
  });
  data.timeLogs.forEach(t => {
    if (!t.user_id) return;
    time.push({ userId: Number(t.user_id), hours: Number(t.hours) || 0, at: toDate(t.started_at) || toDate(t.created_at), taskKey: t.task_id ? `GT-${t.task_id}` : null, source: 'Task time log' });
  });
  data.timesheets.forEach(t => {
    if (!t.user_id) return;
    time.push({ userId: Number(t.user_id), hours: Number(t.hours_worked) || 0, at: toDate(t.work_date), taskKey: null, source: 'Project timesheet' });
  });

  // Meetings: each person who held / was assigned the meeting.
  const meetings = [];
  data.activities.forEach(a => {
    const ids = [...new Set([a.assigned_to, a.created_by].filter(Boolean).map(Number))];
    ids.forEach(uid => meetings.push({
      userId: uid, title: a.title || 'Meeting', at: toDate(a.completed_date) || toDate(a.scheduled_date),
      minutes: Number(a.duration_minutes) || null, status: a.status, source: 'Meeting'
    }));
  });
  data.followups.forEach(f => {
    const uid = f.assigned_to || idForName(f.assigned_to_name);
    if (!uid) return;
    const minutes = parseDurationHours(f.meeting_duration || f.call_duration);
    meetings.push({
      userId: Number(uid), title: f.subject || f.type, at: toDate(f.scheduled_date),
      minutes: minutes != null ? Math.round(minutes * 60) : null, status: f.status, source: f.type
    });
  });
  data.calls.forEach(c => {
    if (!c.created_by) return;
    meetings.push({
      userId: Number(c.created_by), title: c.call_type || 'Call', at: toDate(c.started_at) || toDate(c.created_at),
      minutes: c.duration ? Math.round(Number(c.duration) / 60) : null, status: 'Completed', source: c.call_type || 'Call'
    });
  });

  // Calendar meetings that have happened: the organiser and every staff attendee.
  (data.calendarEvents || []).forEach(ev => {
    // A meeting added after it supposedly happened only counts if a manager/admin added it;
    // otherwise anyone could create "yesterday's meeting" to pad their record.
    const createdAt = toDate(ev.created_at); const startAt = toDate(ev.start_at);
    const addedLate = createdAt && startAt && createdAt - startAt > 15 * 60 * 1000;
    const byManager = /manager|admin/i.test(String(ev.creator_role || ''));
    if (addedLate && !byManager) return;
    const ids = [...new Set([ev.created_by, ...(parseJson(ev.attendee_ids, []) || [])].filter(Boolean).map(Number))];
    const start = toDate(ev.start_at); const end = toDate(ev.end_at);
    const minutes = start && end && end > start ? Math.round((end - start) / 60000) : null;
    ids.forEach(uid => meetings.push({ userId: uid, title: ev.title, at: start, minutes, status: ev.status, source: 'Calendar: ' + ev.category }));
  });

  // Reschedules: every change of a ticket's due date (from the History), credited to the
  // ticket's assignee. Not part of the score; shown so managers can see who keeps moving
  // deadlines, and whether they moved them themselves or someone else did.
  const assigneeOf = new Map(data.issues.map(i => [i.issue_key, idForName(i.assignee)]));
  const titleOf = new Map(data.issues.map(i => [i.issue_key, i.title]));
  const reschedules = [];
  // Subtask moves are recorded on the parent as "subtask_due_date:<id>" and belong to
  // the subtask's own assignee.
  const subtaskOf = new Map();
  data.issues.forEach(i => (parseJson(i.subtasks, []) || []).forEach(st => {
    if (st && st.id != null) subtaskOf.set(`${i.issue_key}|${st.id}`, st);
  }));
  data.history.filter(h => (h.field === 'due_date' || String(h.field).startsWith('subtask_due_date:'))
    && h.old_value && h.new_value && h.old_value !== h.new_value).forEach(h => {
    const isSub = h.field !== 'due_date';
    const st = isSub ? subtaskOf.get(`${h.issue_key}|${String(h.field).split(':')[1]}`) : null;
    if (isSub && !st) return;
    const uid = isSub ? idForName(st.assignee) : assigneeOf.get(h.issue_key);
    if (!uid) return;
    const from = toDate(h.old_value); const to = toDate(h.new_value);
    const shiftDays = from && to ? Math.round((to - from) / DAY) : null;
    reschedules.push({
      userId: uid, key: isSub ? `${h.issue_key} › subtask` : h.issue_key, title: isSub ? (st.title || '') : (titleOf.get(h.issue_key) || ''), at: toDate(h.created_at),
      from: h.old_value, to: h.new_value, shiftDays,
      by: h.changed_by || 'Unknown', bySelf: idForName(h.changed_by) === uid
    });
  });

  // Activity: changes made on tickets, and comments written.
  const activity = [];
  data.history.forEach(h => {
    const uid = idForName(h.changed_by);
    if (!uid) return;
    activity.push({ userId: uid, at: toDate(h.created_at), kind: 'update', field: h.field, detail: `${h.issue_key}: ${h.field} → ${String(h.new_value ?? '').slice(0, 60)}`, key: h.issue_key });
  });
  data.issues.forEach(i => {
    (parseJson(i.comments, []) || []).forEach(c => {
      const uid = idForName(c && c.author);
      if (!uid) return;
      activity.push({ userId: uid, at: toDate(c.time || c.created_at), kind: 'comment', detail: `${i.issue_key}: ${String(c.text || '').replace(/<[^>]+>/g, '').slice(0, 80)}`, key: i.issue_key });
    });
  });

  const points = data.contributions.map(c => ({
    userId: Number(c.user_id) || idForName(c.user_id), points: Number(c.effort_points) || 0, at: toDate(c.approved_at), taskKey: c.task_id
  })).filter(p => p.userId);

  const reviews = data.reviews.map(r => ({
    id: r.id, userId: Number(r.employee_id), score: r.score != null ? Number(r.score) : null, at: toDate(r.created_at),
    reviewer: r.reviewer_name || null, feedback: r.feedback || '',
    taskCompletion: r.task_completion, quality: r.quality_of_work, onTime: r.on_time_delivery, efficiency: r.efficiency
  }));

  return { employees, tasks, subtaskFacts, time, meetings, activity, points, reviews, sizeMap, reschedules };
};

/** All metrics for one person over one date range. */
const computeMetrics = (facts, userId, from, to) => {
  const uid = Number(userId);
  const now = new Date();
  const mine = facts.tasks.filter(t => Number(t.userId) === uid);

  const completed = mine.filter(t => inRange(t.completedAt, from, to));
  // Workload: tasks that existed by the end of the range and were not finished before it began.
  const assigned = mine.filter(t => t.createdAt && t.createdAt <= to && (!t.completedAt || t.completedAt >= from));
  const cutoff = to < now ? to : now;
  const openOverdue = mine.filter(t => t.dueAt && t.dueAt < cutoff && (!t.completedAt || t.completedAt > cutoff) && !(!t.completedAt && isOnHold(t.status)));
  const withDue = completed.filter(t => t.dueAt);
  const endOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  const onTime = withDue.filter(t => t.completedAt <= endOfDay(t.dueAt));
  const late = withDue.filter(t => t.completedAt > endOfDay(t.dueAt));

  const cycleDays = completed
    .filter(t => t.startedAt && t.completedAt >= t.startedAt)
    .map(t => (t.completedAt - t.startedAt) / DAY);

  const timeInRange = facts.time.filter(e => Number(e.userId) === uid && inRange(e.at, from, to));
  const hoursLogged = timeInRange.reduce((s, e) => s + e.hours, 0);

  // Hours spent per completed task = this person's logs on that task (any date).
  const myTimeByTask = new Map();
  facts.time.filter(e => Number(e.userId) === uid && e.taskKey).forEach(e => {
    myTimeByTask.set(e.taskKey, (myTimeByTask.get(e.taskKey) || 0) + e.hours);
  });
  const completedWithLogs = completed.filter(t => myTimeByTask.get(t.key) > 0);
  const hoursOnCompleted = completedWithLogs.reduce((s, t) => s + myTimeByTask.get(t.key), 0);
  const estimated = completedWithLogs.filter(t => t.planHours > 0);
  const estimateAccuracy = estimated.length
    ? estimated.reduce((s, t) => s + myTimeByTask.get(t.key) / t.planHours, 0) / estimated.length
    : null;

  // Planned vs actual on finished tasks that had both a plan and recorded time.
  // Efficiency = total planned ÷ total actual (100% = exactly on plan, above = faster).
  const plannedHours = estimated.reduce((s, t) => s + t.planHours, 0);
  const actualOnPlanned = estimated.reduce((s, t) => s + myTimeByTask.get(t.key), 0);
  const withinPlan = estimated.filter(t => myTimeByTask.get(t.key) <= t.planHours * 1.1).length;

  const meetings = facts.meetings.filter(m => Number(m.userId) === uid && inRange(m.at, from, to) && m.status !== 'Cancelled');
  const meetingMinutes = meetings.reduce((s, m) => s + (m.minutes || 0), 0);
  const activity = facts.activity.filter(a => Number(a.userId) === uid && inRange(a.at, from, to));
  const subtasks = facts.subtaskFacts.filter(s => Number(s.userId) === uid && inRange(s.at, from, to));
  const approvedPoints = facts.points.filter(p => Number(p.userId) === uid && inRange(p.at, from, to)).reduce((s, p) => s + p.points, 0);
  const reviews = facts.reviews.filter(r => r.userId === uid && inRange(r.at, from, to) && r.score != null);

  // Days on which the person did anything recorded: logged time, finished a task, updated
  // or commented on a ticket, or attended a meeting.
  const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const activeDays = new Set([
    // Only real work marks a day as active: time recorded, a task finished, a status move,
    // a meeting. Comments and small edits don't, so they can't be used to pad the count.
    ...timeInRange.map(e => e.at), ...completed.map(t => t.completedAt),
    ...activity.filter(a => a.kind === 'update' && a.field === 'status').map(a => a.at), ...meetings.map(m => m.at)
  ].filter(Boolean).map(dayKey));

  // Per kind of work: how many finished, hours spent, average hours per finished task.
  const typeMap = new Map();
  completed.forEach(t => {
    const k = t.workType || 'Task';
    if (!typeMap.has(k)) typeMap.set(k, { workType: k, completed: 0, withTime: 0, hours: 0, onTime: 0, withDue: 0, planned: 0, plannedActual: 0, withPlan: 0 });
    const row = typeMap.get(k);
    row.completed += 1;
    const h = myTimeByTask.get(t.key) || 0;
    if (h > 0) { row.withTime += 1; row.hours += h; }
    if (h > 0 && t.estimateHours > 0) { row.withPlan += 1; row.planned += t.estimateHours; row.plannedActual += h; }
    if (t.dueAt) { row.withDue += 1; if (t.completedAt <= endOfDay(t.dueAt)) row.onTime += 1; }
  });
  const byWorkType = [...typeMap.values()]
    .map(r => ({
      workType: r.workType, completed: r.completed, hours: round(r.hours), avgHours: r.withTime ? round(r.hours / r.withTime) : null,
      onTimeRate: pct(r.onTime, r.withDue),
      avgPlannedHours: r.withPlan ? round(r.planned / r.withPlan) : null,
      efficiency: r.plannedActual > 0 ? round((r.planned / r.plannedActual) * 100, 0) : null
    }))
    .sort((a, b) => b.completed - a.completed);

  const meetingTypes = new Map();
  meetings.forEach(m => meetingTypes.set(m.source, (meetingTypes.get(m.source) || 0) + 1));
  const timedMeetings = meetings.filter(m => m.minutes);

  // Capacity: working time in the range, up to now for a period still running.
  const emp = facts.employees.find(e => Number(e.id) === uid);
  const joined = emp && emp.joinedAt ? new Date(emp.joinedAt) : null;
  // From the start of the period. The account creation date is not a joining date (staff
  // were added on 3–5 Oct but had work from 1 Oct), so it is not used to shorten capacity.
  const capStart = from;
  void joined;
  const capEnd = to < now ? to : now;
  const availableHours = capEnd > capStart ? workingSecondsBetween(capStart, capEnd) / 3600 : 0;
  const workingDays = capEnd > capStart ? workingDaysBetween(capStart, capEnd) : 0;
  const effortHours = completed.reduce((s, t) => s + (t.effortHours || 0), 0);
  const effortByBasis = { approved: 0, standard: 0, default: 0 };
  // Own plans vs the standard, on tasks the person had in the period.
  const ownPlans = assigned.filter(t => t.planVsStandard != null);
  const planVsStandard = ownPlans.length ? round((ownPlans.reduce((sum, t) => sum + t.planVsStandard, 0) / ownPlans.length) * 100, 0) : null;
  completed.forEach(t => { effortByBasis[t.effortBasis || 'default'] += 1; });
  const groundActivity = activity.length + meetings.length + subtasks.length;
  const moved = (facts.reschedules || []).filter(r => Number(r.userId) === uid && inRange(r.at, from, to));
  const postponed = moved.filter(r => r.shiftDays > 0);

  return {
    effortHours: round(effortHours),
    effortPerDay: workingDays ? round(effortHours / workingDays, 2) : null,
    // Effort delivered vs time available. Over ~110% is not physically possible and means
    // sizes are set too high or work was closed in bulk without being done in this period.
    productivity: availableHours > 0 ? round((effortHours / availableHours) * 100, 0) : null,
    effortExceedsCapacity: availableHours > 0 && effortHours > availableHours * 1.1,
    avgEffortPerTask: completed.length ? round(effortHours / completed.length, 2) : null,
    effortByBasis,
    availableHours: round(availableHours),
    workingDays,
    utilisation: availableHours > 0 ? round((hoursLogged / availableHours) * 100, 0) : null,
    activeDayRate: workingDays ? Math.min(100, round((Math.min(activeDays.size, workingDays) / workingDays) * 100, 0)) : null,
    groundActivity,
    planVsStandard,
    ownPlansCount: ownPlans.length,
    reschedules: moved.length,
    rescheduledTasks: new Set(moved.map(r => r.key)).size,
    reschedulesBySelf: moved.filter(r => r.bySelf).length,
    postponedDays: postponed.reduce((sum, r) => sum + r.shiftDays, 0),
    activeDays: activeDays.size,
    byWorkType,
    meetingsByType: [...meetingTypes.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count),
    avgMeetingMinutes: timedMeetings.length ? round(meetingMinutes / timedMeetings.length, 0) : null,
    tasksAssigned: assigned.length,
    tasksCompleted: completed.length,
    completionRate: pct(completed.length, assigned.length),
    subtasksCompleted: subtasks.length,
    pointsEarned: completed.reduce((s, t) => s + t.points, 0),
    pointsApproved: approvedPoints,
    onTimeCompleted: onTime.length,
    lateCompleted: late.length,
    onTimeRate: pct(onTime.length, withDue.length),
    overdueOpen: openOverdue.length,
    reopened: completed.reduce((s, t) => s + (t.reopened || 0), 0),
    avgCycleDays: cycleDays.length ? round(cycleDays.reduce((a, b) => a + b, 0) / cycleDays.length) : null,
    fastestCycleDays: cycleDays.length ? round(Math.min(...cycleDays)) : null,
    hoursLogged: round(hoursLogged),
    avgHoursPerTask: completedWithLogs.length ? round(hoursOnCompleted / completedWithLogs.length) : null,
    tasksWithTimeLogged: completedWithLogs.length,
    loggingRate: pct(completedWithLogs.length, completed.length),
    estimateAccuracy: estimateAccuracy != null ? round(estimateAccuracy * 100, 0) : null, // % of estimate actually used
    plannedHours: estimated.length ? round(plannedHours) : null,
    actualHoursOnPlanned: estimated.length ? round(actualOnPlanned) : null,
    efficiency: actualOnPlanned > 0 ? round((plannedHours / actualOnPlanned) * 100, 0) : null,
    tasksWithPlan: estimated.length,
    tasksWithinPlan: withinPlan,
    tasksOverPlan: estimated.length - withinPlan,
    planCoverage: pct(completed.filter(t => t.planHours > 0).length, completed.length),
    meetings: meetings.length,
    meetingHours: round(meetingMinutes / 60),
    updates: activity.filter(a => a.kind === 'update').length,
    comments: activity.filter(a => a.kind === 'comment').length,
    reviewCount: reviews.length,
    reviewScore: reviews.length ? round(reviews.reduce((s, r) => s + r.score, 0) / reviews.length, 0) : null,
    completionDatesEstimated: completed.filter(t => t.completionEstimated).length
  };
};

/** 0–100 score from the components that have data; null when there is nothing to judge. */
const scoreMetrics = (m, ctx = {}) => {
  const parts = [];
  const enough = m.effortHours > 0 || m.hoursLogged > 0 || m.reviewScore != null;
  if (enough && m.productivity != null) parts.push(['output', Math.min(100, m.productivity)]);
  // Only once the team records time at all; otherwise everyone would score 0 here.
  if (enough && ctx.teamHasTime && m.utilisation != null) parts.push(['utilisation', Math.min(100, m.utilisation)]);
  if (m.onTimeRate != null) parts.push(['onTime', m.onTimeRate]);
  if (enough && m.activeDayRate != null) parts.push(['engagement', m.activeDayRate]);
  if (m.efficiency != null && m.tasksWithPlan > 0) parts.push(['efficiency', Math.min(100, m.efficiency)]);
  if (m.reviewScore != null) parts.push(['review', m.reviewScore]);

  if (!enough || parts.length === 0) return { score: null, grade: 'Not enough data', breakdown: [] };

  const totalWeight = parts.reduce((s, [k]) => s + SCORE_WEIGHTS[k], 0);
  const score = Math.round(parts.reduce((s, [k, v]) => s + v * SCORE_WEIGHTS[k], 0) / totalWeight);
  const grade = score >= 85 ? 'Excellent' : score >= 70 ? 'Good' : score >= 50 ? 'Fair' : 'Needs attention';
  return {
    score,
    grade,
    breakdown: parts.map(([k, v]) => ({ component: k, value: Math.round(v), weight: round((SCORE_WEIGHTS[k] / totalWeight) * 100, 0) }))
  };
};

// Trends and scorecards end at the selected period, but never in the future: viewing the
// current quarter or year must not list months that have not happened yet.
const trendEnd = (range) => (range.to > new Date() ? new Date() : range.to);

const monthsBack = (to, n) => {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const start = new Date(to.getFullYear(), to.getMonth() - i, 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
    out.push({ key: monthKey(start), label: start.toLocaleString('en-GB', { month: 'short', year: '2-digit' }), from: start, to: end });
  }
  return out;
};
const quartersBack = (to, n) => {
  const out = [];
  const q0 = Math.floor(to.getMonth() / 3);
  for (let i = n - 1; i >= 0; i--) {
    const start = new Date(to.getFullYear(), (q0 - i) * 3, 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 3, 0, 23, 59, 59, 999);
    out.push({ key: quarterKey(start), label: `Q${Math.floor(start.getMonth() / 3) + 1} ${start.getFullYear()}`, from: start, to: end });
  }
  return out;
};

const seriesFor = (facts, userIds, buckets) => buckets.map(b => {
  const per = userIds.map(id => computeMetrics(facts, id, b.from, b.to));
  const sum = (k) => per.reduce((s, m) => s + (m[k] || 0), 0);
  const withDue = per.reduce((s, m) => s + m.onTimeCompleted + m.lateCompleted, 0);
  const cycles = per.filter(m => m.avgCycleDays != null);
  return {
    key: b.key,
    label: b.label,
    tasksCompleted: sum('tasksCompleted'),
    hoursLogged: round(sum('hoursLogged')),
    pointsEarned: sum('pointsEarned'),
    effortHours: round(sum('effortHours')),
    meetings: sum('meetings'),
    onTimeRate: pct(sum('onTimeCompleted'), withDue),
    avgCycleDays: cycles.length ? round(cycles.reduce((s, m) => s + m.avgCycleDays * m.tasksCompleted, 0) / cycles.reduce((s, m) => s + m.tasksCompleted, 0)) : null
  };
});

/** Personal bests over all recorded history. */
const bestRecords = (facts, userId) => {
  const uid = Number(userId);
  const done = facts.tasks.filter(t => Number(t.userId) === uid && t.completedAt).sort((a, b) => a.completedAt - b.completedAt);

  const byMonth = new Map();
  done.forEach(t => { const k = monthKey(t.completedAt); byMonth.set(k, (byMonth.get(k) || 0) + 1); });
  const hoursByMonth = new Map();
  facts.time.filter(e => Number(e.userId) === uid && e.at).forEach(e => { const k = monthKey(e.at); hoursByMonth.set(k, (hoursByMonth.get(k) || 0) + e.hours); });
  const top = (map) => [...map.entries()].sort((a, b) => b[1] - a[1])[0] || null;

  const timed = done.filter(t => t.startedAt && t.completedAt >= t.startedAt)
    .map(t => ({ t, days: (t.completedAt - t.startedAt) / DAY }))
    .sort((a, b) => a.days - b.days);
  const biggest = [...done].sort((a, b) => b.points - a.points)[0];

  let streak = 0; let best = 0;
  done.filter(t => t.dueAt).forEach(t => {
    const due = new Date(t.dueAt.getFullYear(), t.dueAt.getMonth(), t.dueAt.getDate(), 23, 59, 59, 999);
    if (t.completedAt <= due) { streak += 1; best = Math.max(best, streak); } else streak = 0;
  });

  const bestMonth = top(byMonth);
  const bestHours = top(hoursByMonth);
  return {
    bestMonthTasks: bestMonth ? { month: bestMonth[0], value: bestMonth[1] } : null,
    bestMonthHours: bestHours ? { month: bestHours[0], value: round(bestHours[1]) } : null,
    fastestTask: timed[0] ? { key: timed[0].t.key, title: timed[0].t.title, days: round(timed[0].days) } : null,
    biggestTask: biggest && biggest.points > 0 ? { key: biggest.key, title: biggest.title, points: biggest.points } : null,
    longestOnTimeStreak: best || null,
    totalCompleted: done.length
  };
};

// Super Admins own the system rather than doing delivery work, so they are left out of
// rankings unless asked for (includeAdmins=true).
const filterEmployees = (facts, { department, includeInactive, includeAdmins } = {}) => facts.employees.filter(e =>
  (includeInactive || String(e.status).toLowerCase() === 'active') &&
  (String(includeAdmins) === 'true' || !/super\s*admin/i.test(e.role)) &&
  (!department || department === 'All' || normName(e.department).includes(normName(department).replace(/ department$/, '')))
);

/** Metrics + score for each person over one range (score's output part is relative to the busiest). */
const scoreRows = (facts, people, from, to) => {
  const rows = people.map(e => ({ ...e, metrics: computeMetrics(facts, e.id, from, to) }));
  // Pace to score against: the team's top-quartile effort per working day, so one outlier
  // doesn't push everyone else down.
  const paces = rows.map(r => r.metrics.effortPerDay).filter(v => v > 0).sort((a, b) => a - b);
  const targetEffortPerDay = paces.length ? paces[Math.min(paces.length - 1, Math.floor(paces.length * 0.75))] : 0;
  // Hours recorded only counts once the team really tracks time (at least 25% of its available
  // hours recorded in the period). Otherwise one person starting to track would drag
  // everyone else's score down for a period in which nobody tracked time.
  const teamLogged = rows.reduce((sum, r) => sum + (r.metrics.hoursLogged || 0), 0);
  const teamAvailable = rows.reduce((sum, r) => sum + (r.metrics.effortHours > 0 || r.metrics.hoursLogged > 0 ? (r.metrics.availableHours || 0) : 0), 0);
  const teamHasTime = teamAvailable > 0 && teamLogged / teamAvailable >= 0.25;
  rows.forEach(r => Object.assign(r, scoreMetrics(r.metrics, { targetEffortPerDay, teamHasTime })));
  // Rank by score, then effort delivered; people with no score are unranked.
  const ranked = rows.filter(r => r.score != null)
    .sort((a, b) => b.score - a.score || b.metrics.effortHours - a.metrics.effortHours);
  ranked.forEach((r, i) => { r.rank = i + 1; });
  rows.forEach(r => { if (r.rank == null) r.rank = null; r.rankedOutOf = ranked.length; });
  return rows;
};

/**
 * Team average hours and days per finished task for each kind of work, over all recorded
 * history (one month is too few tasks to be a fair benchmark).
 */
const workTypeBenchmarks = (facts, userIds) => {
  const ids = new Set(userIds.map(Number));
  const timeByUserTask = new Map();
  facts.time.forEach(e => {
    if (!e.taskKey) return;
    const k = `${e.userId}|${e.taskKey}`;
    timeByUserTask.set(k, (timeByUserTask.get(k) || 0) + e.hours);
  });
  const map = new Map();
  facts.tasks.filter(t => t.completedAt && ids.has(Number(t.userId))).forEach(t => {
    const k = t.workType || 'Task';
    if (!map.has(k)) map.set(k, { workType: k, completed: 0, hours: 0, withTime: 0, days: 0, withDays: 0, people: new Set() });
    const row = map.get(k);
    row.completed += 1;
    row.people.add(t.userId);
    const h = timeByUserTask.get(`${t.userId}|${t.key}`) || 0;
    if (h > 0) { row.hours += h; row.withTime += 1; }
    if (t.startedAt && t.completedAt >= t.startedAt) { row.days += (t.completedAt - t.startedAt) / DAY; row.withDays += 1; }
  });
  return [...map.values()].map(r => ({
    workType: r.workType,
    completed: r.completed,
    people: r.people.size,
    avgHours: r.withTime ? round(r.hours / r.withTime) : null,
    avgDays: r.withDays ? round(r.days / r.withDays) : null,
    tasksWithTime: r.withTime,
    standardHours: facts.sizeMap ? (facts.sizeMap.get(String(r.workType).toLowerCase()) ?? null) : null
  })).sort((a, b) => b.completed - a.completed);
};

const pickTop = (rows, key, { minCompleted = 0, lowest = false } = {}) => {
  const c = rows.filter(r => r.metrics[key] != null && r.metrics[key] > 0 && r.metrics.tasksCompleted >= minCompleted)
    .sort((a, b) => lowest ? a.metrics[key] - b.metrics[key] : b.metrics[key] - a.metrics[key])[0];
  return c ? { id: c.id, name: c.name, value: c.metrics[key] } : null;
};

/** Winners for each month / quarter: best score, most tasks, most hours, best on-time. */
const championsFor = (facts, people, buckets) => buckets.map(b => {
  const rows = scoreRows(facts, people, b.from, b.to);
  const top = rows.filter(r => r.rank === 1)[0];
  return {
    key: b.key,
    label: b.label,
    topPerformer: top ? { id: top.id, name: top.name, score: top.score, grade: top.grade } : null,
    mostEffort: pickTop(rows, 'effortHours'),
    mostCompleted: pickTop(rows, 'tasksCompleted'),
    mostHours: pickTop(rows, 'hoursLogged'),
    bestOnTime: pickTop(rows, 'onTimeRate', { minCompleted: 3 }),
    mostMeetings: pickTop(rows, 'meetings'),
    tasksCompleted: rows.reduce((s, r) => s + r.metrics.tasksCompleted, 0),
    hoursLogged: round(rows.reduce((s, r) => s + (r.metrics.hoursLogged || 0), 0))
  };
}).reverse(); // newest first

/** All-time team records ("hall of fame"). */
const teamRecords = (facts, people) => {
  const ids = new Set(people.map(p => Number(p.id)));
  const nameOf = new Map(people.map(p => [Number(p.id), p.name]));
  const best = (map) => [...map.entries()].sort((a, b) => b[1] - a[1])[0] || null;

  const doneByPersonMonth = new Map();
  const doneByMonth = new Map();
  facts.tasks.filter(t => t.completedAt && ids.has(Number(t.userId))).forEach(t => {
    const mk = monthKey(t.completedAt);
    doneByPersonMonth.set(`${t.userId}|${mk}`, (doneByPersonMonth.get(`${t.userId}|${mk}`) || 0) + 1);
    doneByMonth.set(mk, (doneByMonth.get(mk) || 0) + 1);
  });
  const hoursByPersonMonth = new Map();
  facts.time.filter(e => e.at && ids.has(Number(e.userId))).forEach(e => {
    const k = `${e.userId}|${monthKey(e.at)}`;
    hoursByPersonMonth.set(k, (hoursByPersonMonth.get(k) || 0) + e.hours);
  });

  const personMonth = (entry, unit) => {
    if (!entry) return null;
    const [uid, mk] = entry[0].split('|');
    return { id: Number(uid), name: nameOf.get(Number(uid)), month: mk, value: unit === 'h' ? round(entry[1]) : entry[1] };
  };

  // Longest on-time streak and fastest task, across everyone.
  let streakRecord = null; let fastest = null;
  people.forEach(p => {
    const b = bestRecords(facts, p.id);
    if (b.longestOnTimeStreak && (!streakRecord || b.longestOnTimeStreak > streakRecord.value)) {
      streakRecord = { id: p.id, name: p.name, value: b.longestOnTimeStreak };
    }
    if (b.fastestTask && (!fastest || b.fastestTask.days < fastest.days)) {
      fastest = { id: p.id, name: p.name, ...b.fastestTask };
    }
  });

  const teamBestMonth = best(doneByMonth);
  return {
    mostTasksInAMonth: personMonth(best(doneByPersonMonth)),
    mostHoursInAMonth: personMonth(best(hoursByPersonMonth), 'h'),
    longestOnTimeStreak: streakRecord,
    fastestTask: fastest,
    teamBestMonth: teamBestMonth ? { month: teamBestMonth[0], value: teamBestMonth[1] } : null
  };
};

/** How complete the underlying records are, so readers know how far to trust the numbers. */
const dataQualityFor = (facts, people, from, to, rows) => {
  const ids = new Set(people.map(p => Number(p.id)));
  const inPeriod = facts.tasks.filter(t => t.createdAt && t.createdAt <= to && (!t.completedAt || t.completedAt >= from));
  const ownedTickets = inPeriod.filter(t => t.source === 'Ticket');
  const completed = rows.reduce((s, r) => s + r.metrics.tasksCompleted, 0);
  const withTime = rows.reduce((s, r) => s + r.metrics.tasksWithTimeLogged, 0);
  const completedTasks = facts.tasks.filter(t => ids.has(Number(t.userId)) && inRange(t.completedAt, from, to));
  return {
    unassignedTickets: ownedTickets.filter(t => !t.userId).length,
    ticketsInPeriod: ownedTickets.length,
    completedWithTimeLogged: pct(withTime, completed),
    completedWithDueDate: pct(completedTasks.filter(t => t.dueAt).length, completedTasks.length),
    completionDatesEstimated: completedTasks.filter(t => t.completionEstimated).length,
    peopleWithNoActivity: rows.filter(r => r.metrics.activeDays === 0).map(r => ({ id: r.id, name: r.name }))
  };
};

/** Factual, number-backed observations about one person. */
const insightsFor = (m, { rank, rankedOutOf, benchmarks = [], pace = 0 } = {}) => {
  const strengths = []; const attention = [];
  const ctxPace = pace;
  if (rank && rankedOutOf > 1 && rank <= Math.max(1, Math.ceil(rankedOutOf / 3))) {
    strengths.push(`Ranked #${rank} of ${rankedOutOf} in the team this period.`);
  }
  if (m.onTimeRate != null && m.onTimeCompleted + m.lateCompleted >= 3) {
    if (m.onTimeRate >= 90) strengths.push(`${m.onTimeRate}% of tasks finished on or before the due date.`);
    else if (m.onTimeRate < 60) attention.push(`Only ${m.onTimeRate}% of tasks were finished by their due date (${m.lateCompleted} late).`);
  }
  if (m.effortHours > 0) {
    const line = `Delivered ${m.effortHours} effort hours across ${m.tasksCompleted} task${m.tasksCompleted === 1 ? '' : 's'} (about ${m.avgEffortPerTask} h each)${m.effortPerDay != null ? `, ${m.effortPerDay} h per working day` : ''}.`;
    if (ctxPace && m.effortPerDay >= ctxPace) strengths.push(line);
    else if (ctxPace && m.effortPerDay < ctxPace * 0.5) attention.push(line + ' That is under half the team\'s pace.');
    else strengths.push(line);
  } else if (m.workingDays >= 3 && m.tasksAssigned > 0) {
    attention.push(`No task finished in ${m.workingDays} working days (${m.tasksAssigned} assigned).`);
  }
  if (m.utilisation != null && m.hoursLogged > 0) {
    if (m.utilisation >= 75) strengths.push(`Recorded ${m.hoursLogged} h of ${m.availableHours} h available (${m.utilisation}%).`);
    else if (m.utilisation < 40) attention.push(`Recorded only ${m.hoursLogged} h of ${m.availableHours} h available (${m.utilisation}%).`);
  }
  if (m.effortExceedsCapacity) {
    attention.push(`Credited with ${m.effortHours} effort hours but only ${m.availableHours} working hours were available. Check the standard sizes, or whether these tasks were closed in bulk.`);
  }
  if (m.activeDayRate != null && m.workingDays >= 5) {
    const days = Math.min(m.activeDays, m.workingDays);
    if (m.activeDayRate < 50) attention.push(`Activity recorded on ${days} of ${m.workingDays} working days.`);
    else if (m.activeDayRate >= 90) strengths.push(`Active on ${days} of ${m.workingDays} working days.`);
  }
  (m.byWorkType || []).forEach(w => {
    const b = benchmarks.find(x => x.workType === w.workType);
    if (!b || b.avgHours == null || w.avgHours == null || b.tasksWithTime < 3) return;
    const diff = (w.avgHours - b.avgHours) / b.avgHours;
    if (diff <= -0.2) strengths.push(`${w.workType}: ${w.avgHours} h per task vs team average ${b.avgHours} h.`);
    else if (diff >= 0.5) attention.push(`${w.workType}: ${w.avgHours} h per task vs team average ${b.avgHours} h.`);
  });
  if (m.planVsStandard != null && m.ownPlansCount >= 3 && m.planVsStandard >= 150) {
    attention.push(`Own planned times average ${m.planVsStandard}% of the standard for the same work (${m.ownPlansCount} tasks). Scores use the standard or manager-approved plans, so this doesn't raise the score, but it's worth discussing.`);
  }
  if (m.reschedules >= 3) {
    attention.push(`Due dates moved ${m.reschedules} time${m.reschedules > 1 ? 's' : ''} on ${m.rescheduledTasks} task${m.rescheduledTasks > 1 ? 's' : ''}${m.postponedDays > 0 ? ` (pushed back ${m.postponedDays} days in total)` : ''}; ${m.reschedulesBySelf} by the person themselves.`);
  }
  if (m.overdueOpen > 0) attention.push(`${m.overdueOpen} open task${m.overdueOpen > 1 ? 's are' : ' is'} past the due date.`);
  if (m.reopened > 0) attention.push(`${m.reopened} task${m.reopened > 1 ? 's were' : ' was'} reopened after being marked done.`);
  if (m.tasksCompleted >= 3 && m.loggingRate != null && m.loggingRate < 50) {
    attention.push(`Time was recorded on only ${m.loggingRate}% of finished tasks, so hours are understated.`);
  }
  if (m.tasksWithPlan >= 3 && m.efficiency != null) {
    if (m.efficiency >= 95) strengths.push(`Efficiency ${m.efficiency}%: planned ${m.plannedHours} h, took ${m.actualHoursOnPlanned} h (${m.tasksWithinPlan} of ${m.tasksWithPlan} tasks within plan).`);
    else if (m.efficiency < 75) attention.push(`Efficiency ${m.efficiency}%: planned ${m.plannedHours} h but took ${m.actualHoursOnPlanned} h (${m.tasksOverPlan} of ${m.tasksWithPlan} tasks over plan).`);
  } else if (m.estimateAccuracy != null && m.estimateAccuracy > 150) {
    attention.push(`Tasks took ${m.estimateAccuracy}% of their planned time on average.`);
  }
  if (m.tasksCompleted >= 3 && m.planCoverage != null && m.planCoverage < 50) {
    attention.push(`Only ${m.planCoverage}% of finished tasks had a planned time, so efficiency can't be judged well.`);
  }
  return { strengths, attention };
};

/** Team report: every employee's metrics for the range, plus team totals, leaders and trends. */
const buildTeamReport = async (pool, query = {}) => {
  const range = resolveRange(query);
  const facts = buildFacts(await loadDataset(pool));
  const people = filterEmployees(facts, query);
  const rows = scoreRows(facts, people, range.from, range.to);

  const sum = (k) => rows.reduce((s, r) => s + (r.metrics[k] || 0), 0);
  const withDue = rows.reduce((s, r) => s + r.metrics.onTimeCompleted + r.metrics.lateCompleted, 0);
  const cycleRows = rows.filter(r => r.metrics.avgCycleDays != null);
  const scored = rows.filter(r => r.score != null);
  const ids = people.map(p => p.id);
  const timedRows = rows.filter(r => r.metrics.avgHoursPerTask != null);
  const benchmarks = workTypeBenchmarks(facts, ids);

  const paces = rows.map(r => r.metrics.effortPerDay).filter(v => v > 0).sort((a, b) => a - b);
  const pace = paces.length ? paces[Math.min(paces.length - 1, Math.floor(paces.length * 0.75))] : 0;
  rows.forEach(r => { r.insights = insightsFor(r.metrics, { rank: r.rank, rankedOutOf: r.rankedOutOf, benchmarks, pace }); });

  return {
    range: { period: range.period, label: range.label, from: range.from, to: range.to },
    scoreWeights: SCORE_WEIGHTS,
    team: {
      employees: rows.length,
      activeContributors: rows.filter(r => r.metrics.activeDays > 0).length,
      tasksCompleted: sum('tasksCompleted'),
      tasksAssigned: sum('tasksAssigned'),
      effortHours: round(sum('effortHours')),
      reschedules: sum('reschedules'),
      availableHours: round(sum('availableHours')),
      utilisation: sum('availableHours') > 0 ? round((sum('hoursLogged') / sum('availableHours')) * 100, 0) : null,
      targetEffortPerDay: pace || null,
      hoursLogged: round(sum('hoursLogged')),
      avgHoursPerTask: timedRows.length
        ? round(timedRows.reduce((s, r) => s + r.metrics.avgHoursPerTask * r.metrics.tasksWithTimeLogged, 0) / timedRows.reduce((s, r) => s + r.metrics.tasksWithTimeLogged, 0))
        : null,
      pointsEarned: sum('pointsEarned'),
      meetings: sum('meetings'),
      meetingHours: round(sum('meetingHours')),
      overdueOpen: sum('overdueOpen'),
      onTimeRate: pct(sum('onTimeCompleted'), withDue),
      avgCycleDays: cycleRows.length ? round(cycleRows.reduce((s, r) => s + r.metrics.avgCycleDays * r.metrics.tasksCompleted, 0) / cycleRows.reduce((s, r) => s + r.metrics.tasksCompleted, 0)) : null,
      avgScore: scored.length ? Math.round(scored.reduce((s, r) => s + r.score, 0) / scored.length) : null,
      plannedHours: round(sum('plannedHours')),
      actualHoursOnPlanned: round(sum('actualHoursOnPlanned')),
      efficiency: sum('actualHoursOnPlanned') > 0 ? round((sum('plannedHours') / sum('actualHoursOnPlanned')) * 100, 0) : null,
      tasksWithinPlan: sum('tasksWithinPlan'),
      tasksOverPlan: sum('tasksOverPlan'),
      gradeCounts: ['Excellent', 'Good', 'Fair', 'Needs attention', 'Not enough data'].map(g => ({ grade: g, count: rows.filter(r => r.grade === g).length }))
    },
    leaders: {
      mostEffort: pickTop(rows, 'effortHours'),
      bestUtilisation: pickTop(rows, 'utilisation'),
      mostActiveDays: pickTop(rows, 'activeDays'),
      mostCompleted: pickTop(rows, 'tasksCompleted'),
      mostHours: pickTop(rows, 'hoursLogged'),
      mostPoints: pickTop(rows, 'pointsEarned'),
      bestOnTime: pickTop(rows, 'onTimeRate', { minCompleted: 3 }),
      fastestCycle: pickTop(rows, 'avgCycleDays', { minCompleted: 3, lowest: true }),
      bestEfficiency: (() => { const c = rows.filter(r => r.metrics.tasksWithPlan >= 3 && r.metrics.efficiency != null).sort((a, b) => b.metrics.efficiency - a.metrics.efficiency)[0]; return c ? { id: c.id, name: c.name, value: c.metrics.efficiency } : null; })(),
      mostMeetings: pickTop(rows, 'meetings')
    },
    monthly: seriesFor(facts, ids, monthsBack(trendEnd(range), 12)),
    quarterly: seriesFor(facts, ids, quartersBack(trendEnd(range), 4)),
    champions: {
      monthly: championsFor(facts, people, monthsBack(trendEnd(range), 12)),
      quarterly: championsFor(facts, people, quartersBack(trendEnd(range), 4))
    },
    records: teamRecords(facts, people),
    workTypes: benchmarks,
    dataQuality: dataQualityFor(facts, people, range.from, range.to, rows),
    departments: [...new Set(facts.employees.map(e => e.department))].sort(),
    employees: rows.sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999) || b.metrics.tasksCompleted - a.metrics.tasksCompleted)
  };
};

/** One employee in full detail for the range. */
const buildEmployeeReport = async (pool, userId, query = {}) => {
  const range = resolveRange(query);
  const facts = buildFacts(await loadDataset(pool));
  const employee = facts.employees.find(e => Number(e.id) === Number(userId));
  if (!employee) return null;

  // Scored and ranked against teammates in the same department over the same range.
  const peers = facts.employees.filter(e => e.department === employee.department &&
    String(e.status).toLowerCase() === 'active' && (!/super\s*admin/i.test(e.role) || e.id === employee.id));
  const peerRows = scoreRows(facts, peers, range.from, range.to);
  const me = peerRows.find(r => Number(r.id) === Number(employee.id));
  const metrics = me.metrics;
  const benchmarks = workTypeBenchmarks(facts, peers.map(p => p.id));

  // Department averages for the "you vs team" comparison.
  const avgOf = (k) => {
    const vals = peerRows.map(r => r.metrics[k]).filter(v => v != null);
    return vals.length ? round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  };
  const teamAverage = {
    tasksCompleted: avgOf('tasksCompleted'),
    onTimeRate: avgOf('onTimeRate'),
    avgCycleDays: avgOf('avgCycleDays'),
    hoursLogged: avgOf('hoursLogged'),
    avgHoursPerTask: avgOf('avgHoursPerTask'),
    meetings: avgOf('meetings'),
    activeDays: avgOf('activeDays'),
    effortHours: avgOf('effortHours'),
    effortPerDay: avgOf('effortPerDay'),
    utilisation: avgOf('utilisation'),
    activeDayRate: avgOf('activeDayRate'),
    efficiency: avgOf('efficiency'),
    score: avgOf('score') // not in metrics; filled below
  };
  const scores = peerRows.map(r => r.score).filter(v => v != null);
  teamAverage.score = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  // Month-by-month scorecard (12 months) with this person's score and rank each month.
  const scorecard = monthsBack(trendEnd(range), 12).map(b => {
    const rows = scoreRows(facts, peers, b.from, b.to);
    const r = rows.find(x => Number(x.id) === Number(employee.id));
    return {
      key: b.key, label: b.label,
      tasksCompleted: r.metrics.tasksCompleted, hoursLogged: r.metrics.hoursLogged || 0,
      effortHours: r.metrics.effortHours, utilisation: r.metrics.utilisation,
      avgHoursPerTask: r.metrics.avgHoursPerTask, onTimeRate: r.metrics.onTimeRate,
      avgCycleDays: r.metrics.avgCycleDays, meetings: r.metrics.meetings, activeDays: r.metrics.activeDays,
      pointsEarned: r.metrics.pointsEarned, efficiency: r.metrics.efficiency, plannedHours: r.metrics.plannedHours, actualHoursOnPlanned: r.metrics.actualHoursOnPlanned,
      efficiency: r.metrics.efficiency,
      score: r.score, grade: r.grade, rank: r.rank, rankedOutOf: r.rankedOutOf
    };
  }).reverse();
  const quarterCard = quartersBack(trendEnd(range), 4).map(b => {
    const rows = scoreRows(facts, peers, b.from, b.to);
    const r = rows.find(x => Number(x.id) === Number(employee.id));
    return {
      key: b.key, label: b.label,
      tasksCompleted: r.metrics.tasksCompleted, hoursLogged: r.metrics.hoursLogged || 0,
      effortHours: r.metrics.effortHours, utilisation: r.metrics.utilisation,
      avgHoursPerTask: r.metrics.avgHoursPerTask, pointsEarned: r.metrics.pointsEarned,
      onTimeRate: r.metrics.onTimeRate, avgCycleDays: r.metrics.avgCycleDays, meetings: r.metrics.meetings,
      score: r.score, grade: r.grade, rank: r.rank, rankedOutOf: r.rankedOutOf
    };
  }).reverse();

  const uid = Number(employee.id);
  const fmt = (t) => ({
    key: t.key, title: t.title, source: t.source, type: t.type, workType: t.workType, priority: t.priority, status: t.status, points: t.points,
    createdAt: t.createdAt, startedAt: t.startedAt, dueAt: t.dueAt, completedAt: t.completedAt,
    completionEstimated: t.completionEstimated,
    cycleDays: t.completedAt && t.startedAt && t.completedAt >= t.startedAt ? round((t.completedAt - t.startedAt) / DAY) : null,
    onTime: t.completedAt && t.dueAt ? t.completedAt <= new Date(t.dueAt.getFullYear(), t.dueAt.getMonth(), t.dueAt.getDate(), 23, 59, 59, 999) : null,
    hoursLogged: round(facts.time.filter(e => Number(e.userId) === uid && e.taskKey === t.key).reduce((s, e) => s + e.hours, 0)) || 0,
    estimateHours: t.estimateHours,
    estimateApproved: Boolean(t.estimateApproved),
    planHours: t.planHours,
    planBasis: t.planBasis,
    planVsStandard: t.planVsStandard != null ? round(t.planVsStandard * 100, 0) : null,
    effortHours: t.effortHours,
    effortBasis: t.effortBasis,
    ...(() => {
      const actual = facts.time.filter(e => Number(e.userId) === uid && e.taskKey === t.key).reduce((s, e) => s + e.hours, 0);
      if (!t.planHours || !actual) return { varianceHours: null, efficiency: null, planVerdict: t.planHours ? 'No time recorded' : 'No plan' };
      return {
        varianceHours: round(actual - t.planHours),
        efficiency: round((t.planHours / actual) * 100, 0),
        planVerdict: actual <= t.planHours * 1.1 ? (actual < t.planHours * 0.9 ? 'Under plan' : 'On plan') : 'Over plan'
      };
    })()
  });
  const mineTasks = facts.tasks.filter(t => Number(t.userId) === uid);
  const now = new Date();

  return {
    range: { period: range.period, label: range.label, from: range.from, to: range.to },
    scoreWeights: SCORE_WEIGHTS,
    employee,
    metrics,
    score: me.score,
    grade: me.grade,
    breakdown: me.breakdown,
    rank: me.rank,
    rankedOutOf: me.rankedOutOf,
    teamAverage,
    insights: insightsFor(metrics, {
      rank: me.rank, rankedOutOf: me.rankedOutOf, benchmarks,
      pace: (() => { const p = peerRows.map(r => r.metrics.effortPerDay).filter(v => v > 0).sort((a, b) => a - b); return p.length ? p[Math.min(p.length - 1, Math.floor(p.length * 0.75))] : 0; })()
    }),
    workTypes: metrics.byWorkType.map(w => {
      const b = benchmarks.find(x => x.workType === w.workType);
      return { ...w, teamAvgHours: b ? b.avgHours : null, teamAvgDays: b ? b.avgDays : null };
    }),
    scorecard,
    quarterCard,
    monthly: seriesFor(facts, [uid], monthsBack(trendEnd(range), 12)),
    quarterly: seriesFor(facts, [uid], quartersBack(trendEnd(range), 4)),
    bests: bestRecords(facts, uid),
    tasks: {
      completed: mineTasks.filter(t => inRange(t.completedAt, range.from, range.to)).sort((a, b) => b.completedAt - a.completedAt).map(fmt),
      open: mineTasks.filter(t => !t.completedAt).sort((a, b) => (a.dueAt || Infinity) - (b.dueAt || Infinity)).map(fmt)
        .map(t => ({ ...t, onHold: isOnHold(t.status), overdue: Boolean(t.dueAt && new Date(t.dueAt) < now && !isOnHold(t.status)) }))
    },
    timeLog: facts.time.filter(e => Number(e.userId) === uid && inRange(e.at, range.from, range.to))
      .sort((a, b) => b.at - a.at).map(e => ({ at: e.at, hours: round(e.hours, 2), taskKey: e.taskKey, source: e.source, note: e.note || null })),
    meetings: facts.meetings.filter(m => Number(m.userId) === uid && inRange(m.at, range.from, range.to))
      .sort((a, b) => b.at - a.at),
    rescheduleLog: (facts.reschedules || []).filter(r => Number(r.userId) === uid && inRange(r.at, range.from, range.to))
      .sort((a, b) => b.at - a.at),
    activity: facts.activity.filter(a => Number(a.userId) === uid && inRange(a.at, range.from, range.to))
      .sort((a, b) => b.at - a.at).slice(0, 200),
    reviews: facts.reviews.filter(r => r.userId === uid)
  };
};

module.exports = { buildTeamReport, buildEmployeeReport, resolveRange, parseDurationHours, SCORE_WEIGHTS, DEFAULT_WORK_SIZES };

/**
 * End-of-day report: for one day, what each person had due, what got done, what is left,
 * what is on hold and what is carried over from earlier days, plus hours logged.
 *
 * Past days are rebuilt from the status history, so the report for last Tuesday shows where
 * things stood at the end of last Tuesday, not where they are now.
 *
 *   Due today   work scheduled for the day (due date, or start date when there is no due date)
 *   Done        of that, finished by the end of the day
 *   Remaining   of that, not finished and not on hold
 *   On hold     work due by the day that sits in an On hold / Under discussion column
 *   Overdue     work due before the day, still open at its end (hold not included)
 *   Extra done  other work finished that day (early or late)
 *   Upcoming    open work scheduled in the 7 days after the day
 *
 * Review: moving work to In Review is the assignee saying "finished"; the reporting manager
 * then checks it and moves it to Done. So for the assignee In Review counts as completed
 * (shown as "In review", never as remaining or overdue), and for the reporter it is
 * "To review" - their own pending work. Moving review -> Done counts as "Approved" for the
 * person who did it.
 */

const DONE = new Set(['DONE', 'COMPLETED', 'CLOSED', 'RESOLVED']);
const isDone = (s) => DONE.has(String(s || '').toUpperCase().trim());
const isReview = (s) => ['IN REVIEW', 'REVIEW'].includes(String(s || '').toUpperCase().trim());
const isHold = (s) => /HOLD|DISCUSS/.test(String(s || '').toUpperCase());
const isPerson = (n) => n && !['unassigned', 'none', 'automatic', 'null', ''].includes(String(n).trim().toLowerCase());
const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
const deptOf = (d) => String(d || '').replace(/\s*department\s*$/i, '').trim();
const HIDDEN_LABELS = new Set(['content-calendar', 'not-in-performance', 'it', 'marketing']);
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (day, n) => { const d = new Date(`${day}T12:00:00`); d.setDate(d.getDate() + n); return ymd(d); };

module.exports = function setupDailyReportRoutes(app, pool) {
  app.get('/api/it-kanban/reports/daily', async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Please sign in again.' });
      const day = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.date || '')) ? req.query.date : ymd(new Date());
      const dept = deptOf(req.query.department);
      const isManager = Boolean(req.user.isManager || req.user.isAdmin);
      const me = norm(req.user.name);

      const [issues] = await pool.query(
        `SELECT i.issue_key, i.title, i.status, i.assignee, i.reporter, i.labels, i.type, i.department,
                DATE_FORMAT(i.due_date, '%Y-%m-%d') AS due, DATE_FORMAT(i.start_date, '%Y-%m-%d') AS start,
                i.created_at, i.updated_at, COALESCE(p.name, p.title) AS project
           FROM it_kanban_issues i LEFT JOIN projects p ON p.id = i.project_id`
      );
      const scoped = issues.filter(i => (!dept || dept.toUpperCase() === 'ALL' || deptOf(i.department).toLowerCase() === dept.toLowerCase())
        && (isManager || norm(i.assignee) === me || norm(i.reporter) === me));
      const keys = new Set(scoped.map(i => i.issue_key));

      const [events] = await pool.query(
        "SELECT issue_key, old_value, new_value, changed_by, created_at FROM it_kanban_history WHERE field = 'status' ORDER BY created_at ASC, id ASC"
      );
      const eventsByKey = new Map();
      events.forEach(e => {
        if (!keys.has(e.issue_key)) return;
        if (!eventsByKey.has(e.issue_key)) eventsByKey.set(e.issue_key, []);
        eventsByKey.get(e.issue_key).push({ ...e, at: new Date(e.created_at) });
      });

      // Where an item stood at a moment: the last change before it, else the state the first
      // later change moved it from, else its status now.
      const statusAt = (i, end) => {
        const ev = eventsByKey.get(i.issue_key) || [];
        let last = null;
        for (const e of ev) { if (e.at <= end) last = e; else break; }
        if (last) return last.new_value;
        const next = ev.find(e => e.at > end);
        return next ? next.old_value : i.status;
      };
      // When it was finished, for work that is finished by `end`.
      const finishedAt = (i, end) => {
        const ev = (eventsByKey.get(i.issue_key) || []).filter(e => e.at <= end && isDone(e.new_value));
        if (ev.length) return ev[ev.length - 1].at;
        return isDone(i.status) && i.updated_at && new Date(i.updated_at) <= end ? new Date(i.updated_at) : null;
      };
      const workType = (i) => {
        let l = i.labels; if (typeof l === 'string') { try { l = JSON.parse(l); } catch (e) { l = []; } }
        return (Array.isArray(l) ? l : []).find(x => !HIDDEN_LABELS.has(String(x).toLowerCase())) || i.type || '';
      };

      const EMPTY = () => ({ due: 0, completed: 0, done: 0, review: 0, remaining: 0, hold: 0, overdue: 0, extraDone: 0, upcoming: 0, toReview: 0, approved: 0, hours: 0, tasks: [] });
      const summarise = (d, withTasks) => {
        const end = new Date(`${d}T23:59:59.999`);
        const weekAhead = addDays(d, 7);
        const start = new Date(`${d}T00:00:00`);
        const people = new Map();
        // One row per person, matched case-insensitively (assignee and reporter names are
        // typed in different places).
        const row = (name) => {
          const raw = isPerson(name) ? String(name).trim() : 'Unassigned';
          const key = norm(raw);
          if (!people.has(key)) people.set(key, { person: raw, ...EMPTY() });
          return people.get(key);
        };
        const push = (r, i, extra) => {
          if (withTasks) r.tasks.push({ key: i.issue_key, title: i.title, project: i.project || '', workType: workType(i), ...extra });
        };
        for (const i of scoped) {
          // Work entered after the day (e.g. a calendar imported later) still counts for the
          // day it is scheduled on; it is flagged so the list can say so.
          const addedLater = Boolean(i.created_at && new Date(i.created_at) > end);
          const scheduled = i.due || i.start;
          const st = statusAt(i, end);
          const done = isDone(st);
          const review = isReview(st);
          const fin = done ? finishedAt(i, end) : null;
          const finishedToday = fin && fin >= start;
          const mine = isManager || norm(i.assignee) === me;

          // The assignee's side.
          let bucket = null;
          if (scheduled === d) bucket = done ? 'done' : review ? 'review' : isHold(st) ? 'hold' : 'remaining';
          else if (review) bucket = 'review';
          else if (scheduled && scheduled < d && !done) bucket = isHold(st) ? 'hold' : 'overdue';
          else if (finishedToday) bucket = 'extraDone';
          else if (scheduled && scheduled > d && scheduled <= weekAhead && !done) bucket = 'upcoming';
          if (bucket && mine) {
            const r = row(i.assignee);
            if (scheduled === d) { r.due += 1; if (done || review) r.completed += 1; }
            r[bucket] += 1;
            push(r, i, { scheduled, status: st, bucket, addedLater, finishedAt: fin ? fin.toISOString() : null, reporter: i.reporter || '' });
          }

          // The reporting manager's side: work waiting for their check, and work they approved.
          if (isPerson(i.reporter) && (isManager || norm(i.reporter) === me)) {
            if (review) {
              const r = row(i.reporter);
              r.toReview += 1;
              push(r, i, { scheduled, status: st, bucket: 'toReview', assignee: i.assignee || 'Unassigned' });
            }
            const approvedEv = (eventsByKey.get(i.issue_key) || []).filter(e => e.at >= start && e.at <= end && isDone(e.new_value) && isReview(e.old_value));
            if (approvedEv.length) {
              const by = approvedEv[approvedEv.length - 1].changed_by || i.reporter;
              if (isManager || norm(by) === me) {
                const r = row(by);
                r.approved += 1;
                push(r, i, { scheduled, status: st, bucket: 'approved', assignee: i.assignee || 'Unassigned' });
              }
            }
          }
        }
        return people;
      };

      const people = summarise(day, true);

      // Hours logged on the day, by the person who logged them.
      const [logs] = await pool.query(
        `SELECT w.author, w.issue_key, SUM(w.seconds) AS secs FROM it_kanban_worklogs w
          WHERE DATE(COALESCE(w.started_at, w.created_at)) = ? AND COALESCE(w.approval, 'approved') <> 'rejected'
          GROUP BY w.author, w.issue_key`,
        [day]
      ).catch(() => [[]]);
      const deptKeys = new Set(issues.filter(i => !dept || dept.toUpperCase() === 'ALL' || deptOf(i.department).toLowerCase() === dept.toLowerCase()).map(i => i.issue_key));
      logs.forEach(l => {
        if (!deptKeys.has(l.issue_key) || !isPerson(l.author)) return;
        if (!isManager && norm(l.author) !== me) return;
        const key = norm(l.author);
        if (!people.has(key)) people.set(key, { person: l.author.trim(), ...EMPTY() });
        people.get(key).hours += Number(l.secs || 0) / 3600;
      });

      const ORDER = { toReview: 0, remaining: 1, overdue: 2, hold: 3, review: 4, upcoming: 5, done: 6, approved: 7, extraDone: 8 };
      const rows = [...people.values()].map(r => ({
        ...r,
        hours: Math.round(r.hours * 100) / 100,
        tasks: r.tasks.sort((a, b) => ORDER[a.bucket] - ORDER[b.bucket] || String(a.scheduled).localeCompare(String(b.scheduled)))
      })).sort((a, b) => {
        if (a.person === 'Unassigned') return 1;
        if (b.person === 'Unassigned') return -1;
        return (b.due + b.overdue + b.toReview) - (a.due + a.overdue + a.toReview) || a.person.localeCompare(b.person);
      });

      const totals = rows.reduce((t, r) => {
        Object.keys(t).forEach(k => { t[k] += r[k] || 0; });
        return t;
      }, (({ tasks, ...counts }) => counts)(EMPTY()));
      // Open work nobody has picked up yet (due today, overdue, on hold or coming up).
      const un = rows.find(r => r.person === 'Unassigned');
      totals.unassigned = un ? un.remaining + un.overdue + un.hold + un.upcoming : 0;
      totals.hours = Math.round(totals.hours * 100) / 100;

      // The week leading up to the day, for a quick trend.
      const trend = [];
      for (let k = 6; k >= 0; k -= 1) {
        const d = addDays(day, -k);
        const t = { date: d, due: 0, done: 0, completed: 0, extraDone: 0 };
        summarise(d, false).forEach(r => { t.due += r.due; t.done += r.done; t.completed += r.completed; t.extraDone += r.extraDone; });
        trend.push(t);
      }

      res.json({ date: day, isManager, isToday: day === ymd(new Date()), totals, rows, trend });
    } catch (e) {
      console.error('daily report:', e.message);
      res.status(500).json({ error: 'Could not build the daily report' });
    }
  });
};

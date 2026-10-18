/**
 * Daily report: for one day, each person's own tickets (as assignee) and where they stood
 * when the day ended, plus the hours they worked that day, meetings included.
 *
 * Past days are rebuilt from the status history, so the report for last Tuesday shows where
 * things stood at the end of last Tuesday, not where they are now.
 *
 *   To do             scheduled for the day and not started yet
 *   Pending           started but not finished, or scheduled earlier and still open (carried over)
 *   Hold              Under discussion / postponed (the board's ON HOLD column, blocked)
 *   In review         the person finished it and it waits for the reporting manager's check
 *                     (these two: scheduled for the day, moved there that day, or worked on that day)
 *   Done              scheduled for the day and done, or finished on the day
 *   Meetings          meetings that day the person hosted or attended
 *   Hours             time logged that day + clocks still running today + meeting time
 *
 * A ticket is "scheduled" on its due date, or its start date when there is no due date.
 * Meeting work items (type Meeting) are counted under Meetings, not as tickets.
 */

const { workingSecondsBetween } = require('../services/workTime');

const DONE = new Set(['DONE', 'COMPLETED', 'CLOSED', 'RESOLVED']);
const up = (s) => String(s || '').toUpperCase().trim();
const isDone = (s) => DONE.has(up(s));
const isReview = (s) => ['IN REVIEW', 'REVIEW'].includes(up(s));
const isHold = (s) => /HOLD|DISCUSS|POSTPONE|BLOCK/.test(up(s));
const isNotStarted = (s) => !s || /^(TO ?DO|BACKLOG|OPEN|NEW|SELECTED)/.test(up(s));
const isPerson = (n) => n && !['unassigned', 'none', 'automatic', 'null', ''].includes(String(n).trim().toLowerCase());
const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
const deptOf = (d) => String(d || '').replace(/\s*department\s*$/i, '').trim();
const HIDDEN_LABELS = new Set(['content-calendar', 'not-in-performance', 'it', 'marketing', 'meeting']);
const MAX_MANUAL_SESSION = 12 * 3600;
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (day, n) => { const d = new Date(`${day}T12:00:00`); d.setDate(d.getDate() + n); return ymd(d); };
const hrs = (secs) => Math.round((secs / 3600) * 100) / 100;

const BUCKETS = ['todo', 'pending', 'hold', 'review', 'done'];
const ORDER = { pending: 0, todo: 1, hold: 2, review: 3, done: 4 };

module.exports = function setupDailyReportRoutes(app, pool) {
  app.get('/api/it-kanban/reports/daily', async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Please sign in again.' });
      const day = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.date || '')) ? req.query.date : ymd(new Date());
      const dept = deptOf(req.query.department);
      const allDepts = !dept || dept.toUpperCase() === 'ALL';
      const inDept = (d) => allDepts || deptOf(d).toLowerCase() === dept.toLowerCase();
      const isManager = Boolean(req.user.isManager || req.user.isAdmin);
      const me = norm(req.user.name);
      const visible = (name) => isManager || norm(name) === me;
      const now = new Date();
      const isToday = day === ymd(now);

      const [issues] = await pool.query(
        `SELECT i.issue_key, i.title, i.status, i.assignee, i.reporter, i.labels, i.type, i.department,
                DATE_FORMAT(i.due_date, '%Y-%m-%d') AS due, DATE_FORMAT(i.start_date, '%Y-%m-%d') AS start,
                i.created_at, i.updated_at, i.is_timer_running, i.timer_start_time, i.timer_owner, i.timer_source,
                COALESCE(p.name, p.title) AS project
           FROM it_kanban_issues i LEFT JOIN projects p ON p.id = i.project_id`
      );
      const issueByKey = new Map(issues.map(i => [i.issue_key, i]));
      const isMeetingItem = (i) => up(i.type) === 'MEETING';
      const deptIssues = issues.filter(i => inDept(i.department));
      const deptKeys = new Set(deptIssues.map(i => i.issue_key));
      // Tickets only: meeting work items are reported under Meetings.
      const scoped = deptIssues.filter(i => !isMeetingItem(i) && (isManager || norm(i.assignee) === me));
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
      const movedInto = (i, start, end, test) => (eventsByKey.get(i.issue_key) || []).some(e => e.at >= start && e.at <= end && test(e.new_value));
      const workType = (i) => {
        let l = i.labels; if (typeof l === 'string') { try { l = JSON.parse(l); } catch (e) { l = []; } }
        return (Array.isArray(l) ? l : []).find(x => !HIDDEN_LABELS.has(String(x).toLowerCase())) || i.type || '';
      };

      // Which bucket a ticket is in for the day, or null when it has nothing to do with the day.
      const bucketOf = (i, d, worked = false) => {
        const start = new Date(`${d}T00:00:00`);
        const end = new Date(`${d}T23:59:59.999`);
        const scheduled = i.due || i.start;
        const st = statusAt(i, end);
        const onOrBefore = Boolean(scheduled && scheduled <= d);
        if (isDone(st)) {
          const fin = finishedAt(i, end);
          const finishedToday = Boolean(fin && fin >= start);
          // Finished on an earlier day: not part of this day unless it was scheduled for it.
          return (scheduled === d || finishedToday) ? { bucket: 'done', st, scheduled, fin } : null;
        }
        // Review / hold: that day's tickets only - scheduled for it, moved
        // there on it, or worked on it - not everything still sitting in those columns.
        const ofDay = (test) => scheduled === d || worked || movedInto(i, start, end, test);
        if (isReview(st)) return ofDay(isReview) ? { bucket: 'review', st, scheduled } : null;
        if (isHold(st)) return ofDay(isHold) ? { bucket: 'hold', st, scheduled } : null;
        if (!onOrBefore && !worked) return null;
        if (scheduled === d && isNotStarted(st)) return { bucket: 'todo', st, scheduled };
        return { bucket: 'pending', st, scheduled };
      };

      // ── Time on the day ────────────────────────────────────────────────────────
      // Logged sessions (by start day), per person and ticket. Rejected logs don't count.
      const [logs] = await pool.query(
        `SELECT w.author, w.issue_key, SUM(w.seconds) AS secs FROM it_kanban_worklogs w
          WHERE DATE(COALESCE(w.started_at, w.created_at)) = ? AND COALESCE(w.approval, 'approved') <> 'rejected'
          GROUP BY w.author, w.issue_key`,
        [day]
      ).catch(() => [[]]);
      const secsBy = new Map(); // person -> Map(issue_key -> secs)
      const addSecs = (person, key, secs) => {
        if (!isPerson(person) || !deptKeys.has(key) || !visible(person) || !(secs > 0)) return;
        const p = norm(person);
        if (!secsBy.has(p)) secsBy.set(p, { name: String(person).trim(), byKey: new Map() });
        const m = secsBy.get(p).byKey;
        m.set(key, (m.get(key) || 0) + secs);
      };
      logs.forEach(l => addSecs(l.author, l.issue_key, Number(l.secs || 0)));

      // Clocks still running count for today, from the start of today.
      if (isToday) {
        const dayStart = new Date(`${day}T00:00:00`);
        const running = (from, source) => {
          const a = new Date(from);
          if (isNaN(a)) return 0;
          const s = a < dayStart ? dayStart : a;
          return source === 'manual' ? Math.min(Math.max(0, Math.round((now - s) / 1000)), MAX_MANUAL_SESSION) : workingSecondsBetween(s, now);
        };
        issues.filter(i => i.is_timer_running && i.timer_start_time)
          .forEach(i => addSecs(i.timer_owner || i.assignee, i.issue_key, running(i.timer_start_time, i.timer_source)));
        const [subTimers] = await pool.query('SELECT issue_key, owner, started_at, source FROM it_kanban_subtask_timers').catch(() => [[]]);
        subTimers.forEach(t => addSecs(t.owner, t.issue_key, running(t.started_at, t.source)));
      }

      // Meetings that day the person hosted or attended (cancelled ones left out). Meeting time
      // counts once the meeting is over, unless the person was marked as not attending.
      const [meetingRows] = await pool.query(
        `SELECT m.id, m.title, m.scheduled_at, m.duration_min, m.status, m.department, m.issue_key, m.host_id, m.host_name,
                a.user_id, a.name AS attendee_name, a.attended
           FROM meetings m LEFT JOIN meeting_attendees a ON a.meeting_id = m.id
          WHERE DATE(m.scheduled_at) = ? AND COALESCE(m.status, '') <> 'Cancelled'
          ORDER BY m.scheduled_at`,
        [day]
      ).catch(() => [[]]);
      const meetings = new Map(); // id -> { ..., people: Map(normName -> {name, attended}) }
      meetingRows.forEach(r => {
        const issueDept = r.issue_key && issueByKey.get(r.issue_key) ? issueByKey.get(r.issue_key).department : null;
        const mDept = issueDept || r.department;
        if (!allDepts && !(mDept && inDept(mDept))) return;
        if (!meetings.has(r.id)) {
          const startAt = new Date(r.scheduled_at);
          const people = new Map();
          if (isPerson(r.host_name)) people.set(norm(r.host_name), { name: String(r.host_name).trim(), attended: null, host: true });
          meetings.set(r.id, {
            id: r.id, title: r.title, issueKey: r.issue_key || null, status: r.status,
            startAt, durationMin: Math.max(0, Number(r.duration_min) || 0),
            over: r.status === 'Completed' || new Date(startAt.getTime() + (Number(r.duration_min) || 0) * 60000) <= now,
            people
          });
        }
        if (r.user_id != null && isPerson(r.attendee_name)) {
          const m = meetings.get(r.id);
          const k = norm(r.attendee_name);
          const prev = m.people.get(k);
          m.people.set(k, { name: String(r.attendee_name).trim(), attended: r.attended == null ? null : Number(r.attended), host: Boolean(prev && prev.host) });
        }
      });

      // ── Rows ───────────────────────────────────────────────────────────────────
      const EMPTY = () => ({ planned: 0, completed: 0, todo: 0, pending: 0, hold: 0, review: 0, done: 0, meetings: 0, meetingHours: 0, taskHours: 0, hours: 0, tasks: [], meetingList: [] });
      const people = new Map();
      const row = (name) => {
        const key = norm(name);
        if (!people.has(key)) people.set(key, { person: String(name).trim(), ...EMPTY() });
        return people.get(key);
      };

      let unassigned = 0;
      const worked = (person, key) => Boolean(secsBy.get(norm(person))?.byKey.get(key));
      for (const i of scoped) {
        const b = bucketOf(i, day, isPerson(i.assignee) && worked(i.assignee, i.issue_key));
        if (!b) continue;
        if (!isPerson(i.assignee)) { if (b.bucket !== 'done' && b.scheduled === day) unassigned += 1; continue; }
        const r = row(i.assignee);
        r[b.bucket] += 1;
        if (b.scheduled === day) { r.planned += 1; if (b.bucket === 'done' || b.bucket === 'review') r.completed += 1; }
        r.tasks.push({
          key: i.issue_key, title: i.title, project: i.project || '', workType: workType(i), status: b.st, bucket: b.bucket,
          scheduled: b.scheduled || null,
          carried: Boolean(b.scheduled && b.scheduled < day && b.bucket !== 'done'),
          finishedAt: b.fin ? b.fin.toISOString() : null,
          reporter: i.reporter || '',
          seconds: 0
        });
      }

      // Meetings: count and time per person. A person's own log on the meeting's work item
      // is the same time, so the larger of the two counts, once.
      const usedLog = new Set(); // `${person}|${key}` logs already counted as meeting time
      meetings.forEach(m => {
        m.people.forEach((p, k) => {
          if (!visible(p.name)) return;
          const r = row(p.name);
          const attendedOk = p.attended !== 0;
          const logged = m.issueKey ? (secsBy.get(k)?.byKey.get(m.issueKey) || 0) : 0;
          if (logged) usedLog.add(`${k}|${m.issueKey}`);
          const secs = Math.max(m.over && attendedOk ? m.durationMin * 60 : 0, logged);
          r.meetings += 1;
          r.meetingHours += secs;
          r.meetingList.push({
            id: m.id, title: m.title, issueKey: m.issueKey, at: m.startAt.toISOString(), durationMin: m.durationMin,
            host: p.host, attended: p.attended, over: m.over, status: m.status, seconds: secs
          });
        });
      });

      // Ticket time: everything logged or running, apart from what was counted as meeting time.
      secsBy.forEach((v, k) => {
        v.byKey.forEach((secs, key) => {
          if (usedLog.has(`${k}|${key}`)) return;
          const issue = issueByKey.get(key);
          const r = row(v.name);
          if (issue && isMeetingItem(issue)) { r.meetingHours += secs; return; }
          r.taskHours += secs;
          const t = r.tasks.find(x => x.key === key);
          if (t) t.seconds += secs;
        });
      });

      const rows = [...people.values()].map(r => ({
        ...r,
        hours: hrs(r.taskHours + r.meetingHours),
        taskHours: hrs(r.taskHours),
        meetingHours: hrs(r.meetingHours),
        tasks: r.tasks.map(t => ({ ...t, hours: hrs(t.seconds) }))
          .sort((a, b) => ORDER[a.bucket] - ORDER[b.bucket] || String(a.scheduled).localeCompare(String(b.scheduled))),
        meetingList: r.meetingList.map(m => ({ ...m, hours: hrs(m.seconds) })).sort((a, b) => a.at.localeCompare(b.at))
      }))
        .filter(r => r.tasks.length || r.meetings || r.hours)
        .sort((a, b) => (b.tasks.length + b.meetings) - (a.tasks.length + a.meetings) || a.person.localeCompare(b.person));

      const totals = rows.reduce((t, r) => {
        Object.keys(t).forEach(k => { t[k] += r[k] || 0; });
        return t;
      }, { planned: 0, completed: 0, todo: 0, pending: 0, hold: 0, review: 0, done: 0, meetings: 0, meetingHours: 0, taskHours: 0, hours: 0 });
      totals.meetings = meetings.size; // each meeting once, not once per person
      ['hours', 'taskHours', 'meetingHours'].forEach(k => { totals[k] = Math.round(totals[k] * 100) / 100; });
      totals.unassigned = unassigned;

      // The week leading up to the day: tickets planned for each day and how many got finished.
      const trend = [];
      for (let k = 6; k >= 0; k -= 1) {
        const d = addDays(day, -k);
        const t = { date: d, planned: 0, completed: 0, done: 0 };
        scoped.forEach(i => {
          if (!isPerson(i.assignee)) return;
          const b = bucketOf(i, d);
          if (!b) return;
          if (b.scheduled === d) { t.planned += 1; if (b.bucket === 'done' || b.bucket === 'review') t.completed += 1; }
          if (b.bucket === 'done') t.done += 1;
        });
        trend.push(t);
      }

      res.json({ date: day, isManager, isToday, buckets: BUCKETS, totals, rows, trend });
    } catch (e) {
      console.error('daily report:', e.message);
      res.status(500).json({ error: 'Could not build the daily report' });
    }
  });
};

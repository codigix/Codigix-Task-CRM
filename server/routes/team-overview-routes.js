const { weeklyWorkingHours, parseDurationToSeconds } = require('../services/workTime');

/**
 * Team overview: everyone's current workload from real ticket and time data, plus teams.
 *
 * Per person
 *   open        not Done (to do, in progress, on hold, in review)
 *   inProgress / review / hold   by status
 *   overdue     open, due before today, not on hold or in review
 *   dueWeek     open and due in the next 7 days
 *   toReview    tickets in review where they are the reporter (waiting for their check)
 *   doneWeek    finished in the last 7 days
 *   hoursWeek   time logged in the last 7 days
 *   loadHours   planned hours of open work that is overdue or due in the next 7 days
 *               (work in review is the reviewer's, so it is left out); a task without a plan
 *               counts at its work type's standard size
 *   loadPct     loadHours as a share of a working week
 *   working     the ticket their timer is running on, if any
 */

const DONE = ['DONE', 'COMPLETED', 'CLOSED', 'RESOLVED'];
const up = (s) => String(s || '').toUpperCase().trim();
const isDone = (s) => DONE.includes(up(s));
const isReview = (s) => ['IN REVIEW', 'REVIEW'].includes(up(s));
const isHold = (s) => /HOLD|DISCUSS/.test(up(s));
const isProgress = (s) => ['IN PROGRESS', 'IN-PROGRESS', 'IN_PROGRESS'].includes(up(s));
const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
const deptOf = (d) => String(d || '').replace(/\s*department\s*$/i, '').trim();
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const NON_WORK = new Set(['content-calendar', 'not-in-performance', 'it', 'marketing', 'ai-added']);
const DEFAULT_SIZE = 1;

module.exports = function setupTeamOverviewRoutes(app, pool) {
  const q = async (sql, params = []) => (await pool.query(sql, params))[0];

  // Take a project off its team (assigning still goes through /projects/:id/assign-team,
  // which also brings the team onto the project and sets up its report follow-ups).
  app.post('/api/team-overview/projects/:id/clear-team', async (req, res) => {
    try {
      if (!(req.user?.isManager || req.user?.isAdmin)) return res.status(403).json({ error: 'Only managers can change teams.' });
      await pool.query('UPDATE projects SET team_id = NULL WHERE id = ?', [req.params.id]);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: 'Could not update the project' });
    }
  });

  app.get('/api/team-overview', async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Please sign in again.' });
      const now = new Date();
      const today = ymd(now);
      const in7 = ymd(new Date(now.getTime() + 7 * 86400000));
      const weekAgo = new Date(now.getTime() - 7 * 86400000);
      const capacity = weeklyWorkingHours() || 45;

      const [users, issues, logs, doneEvents, teams, members, projects, sizes] = await Promise.all([
        q(`SELECT u.id, u.first_name, u.last_name, u.username, u.email, u.avatar, u.department, u.job_title, u.department_role,
             r.name AS role_name, u.last_seen
           FROM users u LEFT JOIN roles r ON r.id = u.role_id WHERE COALESCE(u.status, 'Active') = 'Active'`),
        q(`SELECT i.issue_key, i.title, i.status, i.assignee, i.reporter, i.priority, i.type, i.labels, i.original_estimate,
             DATE_FORMAT(i.due_date, '%Y-%m-%d') AS due, i.is_timer_running, i.timer_owner, i.timer_start_time, i.department,
             i.project_id, COALESCE(p.name, p.title) AS project
           FROM it_kanban_issues i LEFT JOIN projects p ON p.id = i.project_id`),
        q(`SELECT author, SUM(seconds) AS secs FROM it_kanban_worklogs
           WHERE COALESCE(started_at, created_at) >= ? AND COALESCE(approval, 'approved') <> 'rejected' GROUP BY author`, [weekAgo]).catch(() => []),
        q(`SELECT h.issue_key, MAX(h.created_at) AS at FROM it_kanban_history h
           WHERE h.field = 'status' AND UPPER(h.new_value) IN ('DONE', 'COMPLETED', 'CLOSED') AND h.created_at >= ? GROUP BY h.issue_key`, [weekAgo]).catch(() => []),
        q(`SELECT t.id, t.name, t.description, t.department_id, d.name AS department, t.manager_id, t.manager_role, t.created_at
           FROM teams t LEFT JOIN departments d ON d.id = t.department_id ORDER BY t.name`).catch(() => []),
        q('SELECT team_id, user_id, role, joined_at FROM team_members').catch(() => []),
        q('SELECT id, COALESCE(name, title) AS name, team_id, status FROM projects').catch(() => []),
        q('SELECT work_type, hours FROM work_type_sizes').catch(() => [])
      ]);

      const sizeOf = new Map(sizes.map(s => [norm(s.work_type), Number(s.hours) || 0]));
      const workType = (i) => {
        let l = i.labels; if (typeof l === 'string') { try { l = JSON.parse(l); } catch (e) { l = []; } }
        return (Array.isArray(l) ? l : []).find(x => !NON_WORK.has(String(x).toLowerCase())) || i.type || '';
      };
      const planHours = (i) => {
        const secs = parseDurationToSeconds(i.original_estimate);
        if (secs) return secs / 3600;
        return sizeOf.get(norm(workType(i))) || DEFAULT_SIZE;
      };
      const doneRecently = new Map(doneEvents.map(e => [e.issue_key, new Date(e.at)]));

      const name = (u) => `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || u.email;
      const byName = new Map();
      const people = users.map(u => {
        const p = {
          id: u.id, name: name(u), email: u.email, avatar: u.avatar || null, department: deptOf(u.department) || 'Other',
          title: u.job_title || '', role: u.role_name || '', isManager: /manager|admin/i.test(u.role_name || '') || norm(u.department_role) === 'manager',
          lastSeen: u.last_seen || null,
          open: 0, inProgress: 0, review: 0, hold: 0, overdue: 0, dueWeek: 0, toReview: 0, doneWeek: 0, hoursWeek: 0, loadHours: 0,
          working: null, teams: [], tasks: []
        };
        [p.name, u.username, u.email].filter(Boolean).forEach(k => byName.set(norm(k), p));
        return p;
      });
      const find = (n) => byName.get(norm(n)) || null;

      let unassignedOpen = 0; let unassignedOverdue = 0;
      issues.forEach(i => {
        const done = isDone(i.status);
        const a = find(i.assignee);
        if (!done && !a) { unassignedOpen += 1; if (i.due && i.due < today && !isHold(i.status)) unassignedOverdue += 1; }
        if (a) {
          if (done) {
            if (doneRecently.has(i.issue_key)) a.doneWeek += 1;
          } else {
            a.open += 1;
            if (isProgress(i.status)) a.inProgress += 1;
            if (isReview(i.status)) a.review += 1;
            if (isHold(i.status)) a.hold += 1;
            const late = i.due && i.due < today && !isHold(i.status) && !isReview(i.status);
            if (late) a.overdue += 1;
            const soon = i.due && i.due >= today && i.due <= in7;
            if (soon) a.dueWeek += 1;
            if ((late || soon) && !isReview(i.status) && !isHold(i.status)) a.loadHours += planHours(i);
            a.tasks.push({
              key: i.issue_key, title: i.title, status: i.status, due: i.due, project: i.project || '', priority: i.priority,
              overdue: Boolean(late), hours: Math.round(planHours(i) * 100) / 100
            });
          }
        }
        if (isReview(i.status)) { const r = find(i.reporter); if (r) r.toReview += 1; }
        if (i.is_timer_running && i.timer_owner) {
          const w = find(i.timer_owner);
          if (w) w.working = { key: i.issue_key, title: i.title, since: i.timer_start_time };
        }
      });
      logs.forEach(l => { const p = find(l.author); if (p) p.hoursWeek += Number(l.secs || 0) / 3600; });

      const level = (pct, open) => (pct > 100 ? 'overloaded' : pct >= 80 ? 'busy' : pct >= 40 ? 'balanced' : open > 0 || pct > 0 ? 'light' : 'idle');
      people.forEach(p => {
        p.loadHours = Math.round(p.loadHours * 10) / 10;
        p.hoursWeek = Math.round(p.hoursWeek * 10) / 10;
        p.loadPct = Math.round((p.loadHours / capacity) * 100);
        p.level = level(p.loadPct, p.open);
        p.tasks.sort((a, b) => (b.overdue - a.overdue) || String(a.due || '9999').localeCompare(String(b.due || '9999')));
      });

      const personById = new Map(people.map(p => [Number(p.id), p]));
      const teamList = teams.map(t => {
        const mem = members.filter(m => Number(m.team_id) === Number(t.id))
          .map(m => ({ userId: m.user_id, role: m.role || '', joinedAt: m.joined_at, person: personById.get(Number(m.user_id)) }))
          .filter(m => m.person);
        const manager = personById.get(Number(t.manager_id)) || null;
        const everyone = [...new Map([...(manager ? [[manager.id, manager]] : []), ...mem.map(m => [m.person.id, m.person])]).values()];
        everyone.forEach(p => { if (!p.teams.some(x => x.id === t.id)) p.teams.push({ id: t.id, name: t.name }); });
        const sum = (k) => everyone.reduce((s, p) => s + (p[k] || 0), 0);
        const cap = everyone.length * capacity;
        return {
          id: t.id, name: t.name, description: t.description || '', departmentId: t.department_id, department: deptOf(t.department) || '',
          manager: manager ? { id: manager.id, name: manager.name, avatar: manager.avatar } : null, managerRole: t.manager_role || '',
          members: mem.map(m => ({ userId: m.userId, name: m.person.name, avatar: m.person.avatar, role: m.role || m.person.title, level: m.person.level, loadPct: m.person.loadPct })),
          projects: projects.filter(p => Number(p.team_id) === Number(t.id)).map(p => ({ id: p.id, name: p.name, status: p.status })),
          stats: { people: everyone.length, open: sum('open'), overdue: sum('overdue'), review: sum('review'), doneWeek: sum('doneWeek'),
            hoursWeek: Math.round(sum('hoursWeek') * 10) / 10, loadPct: cap ? Math.round((sum('loadHours') / cap) * 100) : 0 }
        };
      });

      const departments = [...new Set(people.map(p => p.department))].sort();
      res.json({
        capacity, today, people: people.sort((a, b) => b.loadPct - a.loadPct || b.open - a.open || a.name.localeCompare(b.name)),
        teams: teamList, departments,
        departmentList: (await q('SELECT id, name FROM departments ORDER BY name').catch(() => [])).map(d => ({ id: d.id, name: deptOf(d.name) })),
        projects: projects.map(p => ({ id: p.id, name: p.name, teamId: p.team_id })).filter(p => p.name).sort((a, b) => a.name.localeCompare(b.name)),
        unassigned: { open: unassignedOpen, overdue: unassignedOverdue },
        canManage: Boolean(req.user.isManager || req.user.isAdmin)
      });
    } catch (e) {
      console.error('team overview:', e.message);
      res.status(500).json({ error: 'Could not load the team overview' });
    }
  });
};

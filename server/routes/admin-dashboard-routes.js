/**
 * Admin overview: one call that gathers the organisation-wide figures for the Admin
 * dashboard — people, work, time, projects, sales, finance and anything waiting on someone.
 *
 * Every block is computed independently and a failing block returns null instead of
 * breaking the page (some modules, e.g. sales, may have no tables or no data yet).
 */
const { requireAdmin } = require('../middleware/session');

const DONE = ['DONE', 'COMPLETED', 'CLOSED'];
const REVIEW = ['IN REVIEW', 'REVIEW', 'TESTING', 'QA'];
const IN_PROGRESS = ['IN PROGRESS', 'IN-PROGRESS', 'IN_PROGRESS'];
const bucketOf = (status) => {
  const s = String(status || '').trim().toUpperCase();
  if (DONE.includes(s)) return 'done';
  if (REVIEW.includes(s)) return 'review';
  if (IN_PROGRESS.includes(s)) return 'inProgress';
  return 'todo';
};
// Paused work ("On hold" / "Under discussion") is not counted as overdue.
const isHold = (status) => /HOLD|DISCUSS/.test(String(status || '').toUpperCase());
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const normDept = (d) => String(d || '').replace(/\s*department\s*$/i, '').trim() || 'Unassigned';
const round1 = (n) => Math.round((Number(n) || 0) * 10) / 10;

module.exports = function setupAdminDashboardRoutes(app, pool) {
  const q = async (sql, params = []) => (await pool.query(sql, params))[0];
  const safe = async (fn) => { try { return await fn(); } catch (e) { console.error('Admin overview block failed:', e.message); return null; } };

  app.get('/api/admin/overview', requireAdmin, async (req, res) => {
    try {
      const now = new Date();
      const today = ymd(now);
      const days30 = new Date(now); days30.setDate(days30.getDate() - 29); days30.setHours(0, 0, 0, 0);
      const days7 = new Date(now); days7.setDate(days7.getDate() - 6); days7.setHours(0, 0, 0, 0);
      const next7 = new Date(now); next7.setDate(next7.getDate() + 7);

      // ── People ──
      const people = await safe(async () => {
        const users = await q(`SELECT u.id, u.first_name, u.last_name, u.username, u.department, u.status, u.created_at, r.name AS role
                                 FROM users u LEFT JOIN roles r ON r.id = u.role_id
                                WHERE u.username NOT IN ('admin','leads','deals','sales','marketing','it','accounting')`);
        const active = users.filter(u => String(u.status || 'Active') === 'Active');
        const byDept = {};
        active.forEach(u => { const d = normDept(u.department); byDept[d] = (byDept[d] || 0) + 1; });
        const [pending] = await q("SELECT COUNT(*) AS n FROM registration_requests WHERE status = 'Pending'").catch(() => [{ n: 0 }]);
        return {
          active: active.length,
          inactive: users.length - active.length,
          newThisMonth: active.filter(u => u.created_at && new Date(u.created_at) >= new Date(now.getFullYear(), now.getMonth(), 1)).length,
          byDepartment: Object.entries(byDept).map(([department, count]) => ({ department, count })).sort((a, b) => b.count - a.count),
          pendingRegistrations: Number(pending?.n || 0),
          _users: active
        };
      });

      // ── Work (board tickets) ──
      const work = await safe(async () => {
        const issues = await q('SELECT issue_key, title, status, assignee, department, due_date, created_at, updated_at, project_id, sprint_id FROM it_kanban_issues');
        const doneHist = await q(`SELECT issue_key, MAX(created_at) AS at FROM it_kanban_history
                                   WHERE field = 'status' AND UPPER(TRIM(new_value)) IN (?) GROUP BY issue_key`, [DONE]);
        const doneAt = new Map(doneHist.map(r => [r.issue_key, new Date(r.at)]));
        const totals = { todo: 0, inProgress: 0, review: 0, done: 0 };
        const deptMap = {};
        let overdue = 0; let dueToday = 0; let unassignedOpen = 0; let dueNext7 = 0;
        const completedByDay = {};
        const createdByDay = {};
        for (let d = new Date(days30); d <= now; d.setDate(d.getDate() + 1)) { completedByDay[ymd(d)] = 0; createdByDay[ymd(d)] = 0; }
        issues.forEach(i => {
          const b = bucketOf(i.status);
          totals[b] += 1;
          const dept = normDept(i.department);
          if (!deptMap[dept]) deptMap[dept] = { department: dept, todo: 0, inProgress: 0, review: 0, done: 0, overdue: 0 };
          deptMap[dept][b] += 1;
          const due = i.due_date ? ymd(new Date(i.due_date)) : null;
          if (b !== 'done') {
            if (due && due < today && !isHold(i.status)) { overdue += 1; deptMap[dept].overdue += 1; }
            if (due === today) dueToday += 1;
            if (due && due > today && new Date(i.due_date) <= next7) dueNext7 += 1;
            if (!i.assignee || ['unassigned', 'none', ''].includes(String(i.assignee).trim().toLowerCase())) unassignedOpen += 1;
          } else {
            const at = doneAt.get(i.issue_key) || (i.updated_at ? new Date(i.updated_at) : null);
            if (at && at >= days30) completedByDay[ymd(at)] = (completedByDay[ymd(at)] || 0) + 1;
          }
          if (i.created_at && new Date(i.created_at) >= days30) {
            const k = ymd(new Date(i.created_at)); createdByDay[k] = (createdByDay[k] || 0) + 1;
          }
        });
        const completed30 = Object.values(completedByDay).reduce((a, b) => a + b, 0);
        const completed7 = Object.entries(completedByDay).filter(([k]) => k >= ymd(days7)).reduce((a, [, v]) => a + v, 0);
        return {
          total: issues.length,
          open: totals.todo + totals.inProgress + totals.review,
          totals,
          overdue, dueToday, dueNext7, unassignedOpen,
          completed30, completed7,
          completedByDay: Object.entries(completedByDay).map(([date, count]) => ({ date, count, created: createdByDay[date] || 0 })),
          byDepartment: Object.values(deptMap).sort((a, b) => (b.todo + b.inProgress + b.review + b.done) - (a.todo + a.inProgress + a.review + a.done)),
          _issues: issues, _doneAt: doneAt
        };
      });

      // ── Time ──
      const time = await safe(async () => {
        const rows = await q(`SELECT author, seconds, COALESCE(started_at, created_at) AS at, COALESCE(approval, 'approved') AS approval
                                FROM it_kanban_worklogs WHERE COALESCE(started_at, created_at) >= ?`, [days30])
          .catch(() => q('SELECT author, seconds, COALESCE(started_at, created_at) AS at, \'approved\' AS approval FROM it_kanban_worklogs WHERE COALESCE(started_at, created_at) >= ?', [days30]));
        const approved = rows.filter(r => r.approval === 'approved');
        const sumH = (list) => round1(list.reduce((s, r) => s + Number(r.seconds || 0), 0) / 3600);
        const [running] = await q('SELECT COUNT(*) AS n FROM it_kanban_issues WHERE is_timer_running = 1').catch(() => [{ n: 0 }]);
        return {
          hours30: sumH(approved),
          hours7: sumH(approved.filter(r => new Date(r.at) >= days7)),
          hoursToday: sumH(approved.filter(r => ymd(new Date(r.at)) === today)),
          trackers30: new Set(approved.map(r => r.author)).size,
          runningTimers: Number(running?.n || 0),
          pendingApprovals: rows.filter(r => r.approval === 'pending').length,
          _rows: approved
        };
      });

      // ── Approvals & attention ──
      const attention = await safe(async () => {
        const [plans] = await q('SELECT COUNT(*) AS n FROM it_kanban_issues WHERE requested_estimate IS NOT NULL').catch(() => [{ n: 0 }]);
        const lateSprints = await q("SELECT id, name, department, end_date FROM sprints WHERE status = 'Active' AND end_date IS NOT NULL AND end_date < CURDATE() ORDER BY end_date").catch(() => []);
        const [activeSprints] = await q("SELECT COUNT(*) AS n FROM sprints WHERE status = 'Active'").catch(() => [{ n: 0 }]);
        return {
          planRequests: Number(plans?.n || 0),
          activeSprints: Number(activeSprints?.n || 0),
          lateSprints: lateSprints.map(s => ({ id: s.id, name: s.name, department: normDept(s.department), endDate: s.end_date }))
        };
      });

      // ── Projects ──
      const projects = await safe(async () => {
        const rows = await q('SELECT id, name, title, status, due_date, end_date, progress, department_id FROM projects');
        const byStatus = {};
        rows.forEach(p => { const s = p.status || 'Unknown'; byStatus[s] = (byStatus[s] || 0) + 1; });
        const issues = work?._issues || [];
        const perProject = new Map();
        issues.forEach(i => {
          if (i.project_id == null) return;
          if (!perProject.has(i.project_id)) perProject.set(i.project_id, { total: 0, done: 0, overdue: 0 });
          const r = perProject.get(i.project_id);
          r.total += 1;
          const b = bucketOf(i.status);
          if (b === 'done') r.done += 1;
          else if (i.due_date && !isHold(i.status) && ymd(new Date(i.due_date)) < today) r.overdue += 1;
        });
        const active = rows.filter(p => !['Completed', 'Cancelled', 'Closed'].includes(p.status));
        const list = active.map(p => {
          const t = perProject.get(p.id) || { total: 0, done: 0, overdue: 0 };
          const due = p.due_date || p.end_date;
          return {
            id: p.id, name: p.name || p.title, status: p.status, dueDate: due,
            tasks: t.total, done: t.done, overdue: t.overdue,
            progress: t.total ? Math.round((t.done / t.total) * 100) : (Number(p.progress) || 0),
            late: Boolean(due && ymd(new Date(due)) < today)
          };
        }).sort((a, b) => b.tasks - a.tasks || String(a.name).localeCompare(String(b.name)));
        return {
          total: rows.length,
          active: active.length,
          byStatus: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
          late: list.filter(p => p.late).length,
          list: list.slice(0, 8)
        };
      });

      // ── Sales ──
      const sales = await safe(async () => {
        const leads = await q('SELECT lead_status, value, created_at FROM leads');
        const deals = await q('SELECT deal_name, deal_value, deal_stage, status, created_at FROM deals');
        const open = deals.filter(d => !['Won', 'Lost', 'Closed Won', 'Closed Lost'].includes(String(d.status || '')));
        const won = deals.filter(d => /won/i.test(String(d.status || '')) || /won/i.test(String(d.deal_stage || '')));
        const stages = {};
        open.forEach(d => {
          const s = d.deal_stage || 'New';
          if (!stages[s]) stages[s] = { stage: s, count: 0, value: 0 };
          stages[s].count += 1; stages[s].value += Number(d.deal_value || 0);
        });
        return {
          leads: leads.length,
          newLeads30: leads.filter(l => l.created_at && new Date(l.created_at) >= days30).length,
          converted: leads.filter(l => /convert|qualified/i.test(String(l.lead_status || ''))).length,
          openDeals: open.length,
          pipelineValue: round1(open.reduce((s, d) => s + Number(d.deal_value || 0), 0)),
          wonDeals: won.length,
          wonValue: round1(won.reduce((s, d) => s + Number(d.deal_value || 0), 0)),
          byStage: Object.values(stages).sort((a, b) => b.value - a.value)
        };
      });

      // ── Finance ──
      const finance = await safe(async () => {
        const inv = await q('SELECT amount, amount_paid, status, open_till, created_at FROM invoices');
        const billed = inv.reduce((s, i) => s + Number(i.amount || 0), 0);
        const paid = inv.reduce((s, i) => s + Number(i.amount_paid || 0), 0);
        return {
          invoices: inv.length,
          billed: round1(billed),
          collected: round1(paid),
          outstanding: round1(billed - paid),
          overdueInvoices: inv.filter(i => !/paid/i.test(String(i.status || '')) && i.open_till && ymd(new Date(i.open_till)) < today).length,
          billed30: round1(inv.filter(i => i.created_at && new Date(i.created_at) >= days30).reduce((s, i) => s + Number(i.amount || 0), 0))
        };
      });

      // ── Team workload (per person) ──
      const team = await safe(async () => {
        const users = people?._users || [];
        const issues = work?._issues || [];
        const doneAt = work?._doneAt || new Map();
        const timeRows = time?._rows || [];
        const nameOf = (u) => `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username;
        return users.filter(u => !/admin/i.test(u.role || '')).map(u => {
          const name = nameOf(u).toLowerCase();
          const mine = issues.filter(i => String(i.assignee || '').trim().toLowerCase() === name);
          const open = mine.filter(i => bucketOf(i.status) !== 'done');
          const done30 = mine.filter(i => bucketOf(i.status) === 'done' && (doneAt.get(i.issue_key) || new Date(i.updated_at)) >= days30);
          return {
            id: u.id, name: nameOf(u), role: u.role || '—', department: normDept(u.department),
            open: open.length,
            inProgress: open.filter(i => bucketOf(i.status) === 'inProgress').length,
            overdue: open.filter(i => i.due_date && !isHold(i.status) && ymd(new Date(i.due_date)) < today).length,
            done30: done30.length,
            hours30: round1(timeRows.filter(r => String(r.author || '').trim().toLowerCase() === name).reduce((s, r) => s + Number(r.seconds || 0), 0) / 3600)
          };
        }).sort((a, b) => b.open - a.open || b.done30 - a.done30);
      });

      // ── Recent activity & coming up ──
      const activity = await safe(async () => {
        const rows = await q(`SELECT h.issue_key, h.field, h.old_value, h.new_value, h.changed_by, h.created_at, i.title
                                FROM it_kanban_history h LEFT JOIN it_kanban_issues i ON i.issue_key = h.issue_key
                               WHERE h.field IN ('status', 'assignee', 'due_date', 'priority')
                               ORDER BY h.created_at DESC LIMIT 12`);
        return rows.map(r => ({
          key: r.issue_key, title: r.title, field: r.field, from: r.old_value, to: r.new_value, by: r.changed_by, at: r.created_at
        }));
      });
      const upcoming = await safe(async () => {
        const events = await q(`SELECT id, title, category, start_at, end_at, department FROM calendar_events
                                 WHERE status <> 'Cancelled' AND start_at >= NOW() AND start_at < ? ORDER BY start_at LIMIT 8`, [next7]).catch(() => []);
        const issues = work?._issues || [];
        const dueByDay = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date(now); d.setDate(d.getDate() + i);
          const k = ymd(d);
          dueByDay.push({ date: k, count: issues.filter(t => bucketOf(t.status) !== 'done' && t.due_date && ymd(new Date(t.due_date)) === k).length });
        }
        return { events: events.map(e => ({ id: e.id, title: e.title, category: e.category, start: e.start_at, end: e.end_at, department: e.department })), dueByDay };
      });

      const strip = (o) => { if (!o) return o; const c = { ...o }; Object.keys(c).filter(k => k.startsWith('_')).forEach(k => delete c[k]); return c; };
      res.json({
        generatedAt: now,
        people: strip(people), work: strip(work), time: strip(time), attention, projects, sales, finance,
        team, activity, upcoming
      });
    } catch (err) {
      console.error('Admin overview failed:', err);
      res.status(500).json({ error: 'Failed to build the admin overview' });
    }
  });
  /**
   * Drill-down rows behind every figure on the Admin overview, so the dashboard can show
   * them in place.  GET /api/admin/overview/details?type=<type>&...
   *   tasks       filter=open|overdue|unassigned|dueToday|completed30|completedOn|dueOn|all
   *               [&date=YYYY-MM-DD][&department=][&person=][&projectId=][&status=todo|inProgress|review|done]
   *   people      [&department=]
   *   hours       (last 7 days, by person + entries)
   *   projects    [&late=1]
   *   sprints     filter=active|late
   *   approvals   (time entries waiting)   planRequests   registrations
   *   leads | deals | invoices
   */
  app.get('/api/admin/overview/details', requireAdmin, async (req, res) => {
    try {
      const type = String(req.query.type || '');
      const LIMIT = 500;
      const now = new Date();
      const today = ymd(now);
      const days30 = new Date(now); days30.setDate(days30.getDate() - 29); days30.setHours(0, 0, 0, 0);
      const days7 = new Date(now); days7.setDate(days7.getDate() - 6); days7.setHours(0, 0, 0, 0);
      const send = (rows, columns, extra = {}) => res.json({ total: rows.length, rows: rows.slice(0, LIMIT), truncated: rows.length > LIMIT, columns, ...extra });

      if (type === 'tasks') {
        const issues = await q(`SELECT i.issue_key, i.title, i.status, i.assignee, i.department, i.due_date, i.updated_at, i.priority,
                                       i.labels, i.project_id, p.name AS project_name
                                  FROM it_kanban_issues i LEFT JOIN projects p ON p.id = i.project_id`);
        const doneHist = await q(`SELECT issue_key, MAX(created_at) AS at FROM it_kanban_history
                                   WHERE field = 'status' AND UPPER(TRIM(new_value)) IN (?) GROUP BY issue_key`, [DONE]);
        const doneAt = new Map(doneHist.map(r => [r.issue_key, new Date(r.at)]));
        const { filter = 'open', date, department, person, projectId, status } = req.query;
        const isUnassigned = (a) => !a || ['unassigned', 'none', ''].includes(String(a).trim().toLowerCase());
        let rows = issues.map(i => {
          const b = bucketOf(i.status);
          const due = i.due_date ? ymd(new Date(i.due_date)) : null;
          const finished = b === 'done' ? (doneAt.get(i.issue_key) || (i.updated_at ? new Date(i.updated_at) : null)) : null;
          let l = i.labels; if (typeof l === 'string') { try { l = JSON.parse(l); } catch (e) { l = []; } }
          const label = (Array.isArray(l) ? l : []).find(x => !['content-calendar', 'not-in-performance'].includes(String(x).toLowerCase())) || '';
          return {
            key: i.issue_key, title: i.title, status: i.status, bucket: b, assignee: isUnassigned(i.assignee) ? 'Unassigned' : i.assignee,
            department: normDept(i.department), project: i.project_name || '', label, priority: i.priority,
            due, finished: finished ? ymd(finished) : null, overdue: b !== 'done' && !isHold(i.status) && due && due < today
          };
        });
        if (filter === 'open') rows = rows.filter(r => r.bucket !== 'done');
        if (filter === 'overdue') rows = rows.filter(r => r.overdue);
        if (filter === 'unassigned') rows = rows.filter(r => r.bucket !== 'done' && r.assignee === 'Unassigned');
        if (filter === 'dueToday') rows = rows.filter(r => r.bucket !== 'done' && r.due === today);
        if (filter === 'completed30') rows = rows.filter(r => r.finished && r.finished >= ymd(days30));
        if (filter === 'completedOn') rows = rows.filter(r => r.finished === date);
        if (filter === 'dueOn') rows = rows.filter(r => r.bucket !== 'done' && r.due === date);
        if (department) rows = rows.filter(r => r.department.toLowerCase() === normDept(department).toLowerCase());
        if (person) rows = rows.filter(r => r.assignee.toLowerCase() === String(person).trim().toLowerCase());
        if (projectId) rows = rows.filter(r => issues.find(i => i.issue_key === r.key)?.project_id === Number(projectId));
        if (status) rows = rows.filter(r => r.bucket === status);
        rows.sort((a, b) => (a.overdue === b.overdue ? 0 : a.overdue ? -1 : 1) || String(a.due || '9999').localeCompare(String(b.due || '9999')));
        const byStatus = { todo: 0, inProgress: 0, review: 0, done: 0 };
        rows.forEach(r => { byStatus[r.bucket] += 1; });
        return send(rows, ['key', 'title', 'label', 'assignee', 'project', 'status', 'due', 'finished'], { byStatus });
      }

      if (type === 'people') {
        const users = await q(`SELECT u.id, u.first_name, u.last_name, u.username, u.email, u.department, u.status, u.created_at, r.name AS role
                                 FROM users u LEFT JOIN roles r ON r.id = u.role_id
                                WHERE u.username NOT IN ('admin','leads','deals','sales','marketing','it','accounting')`);
        const issues = await q('SELECT assignee, status, due_date FROM it_kanban_issues');
        let rows = users.map(u => {
          const name = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username;
          const mine = issues.filter(i => String(i.assignee || '').trim().toLowerCase() === name.toLowerCase());
          const open = mine.filter(i => bucketOf(i.status) !== 'done');
          return {
            name, email: u.email, role: u.role || '—', department: normDept(u.department), status: u.status || 'Active',
            joined: u.created_at ? ymd(new Date(u.created_at)) : null,
            open: open.length, overdue: open.filter(i => i.due_date && !isHold(i.status) && ymd(new Date(i.due_date)) < today).length
          };
        });
        if (req.query.department) rows = rows.filter(r => r.department.toLowerCase() === normDept(req.query.department).toLowerCase());
        if (req.query.status) rows = rows.filter(r => r.status === req.query.status);
        rows.sort((a, b) => a.department.localeCompare(b.department) || a.name.localeCompare(b.name));
        return send(rows, ['name', 'role', 'department', 'status', 'open', 'overdue', 'joined']);
      }

      if (type === 'hours') {
        const since = req.query.days === '30' ? days30 : days7;
        const rows = await q(`SELECT w.issue_key, w.author, w.seconds, w.description, COALESCE(w.started_at, w.created_at) AS at, i.title
                                FROM it_kanban_worklogs w LEFT JOIN it_kanban_issues i ON i.issue_key = w.issue_key
                               WHERE COALESCE(w.started_at, w.created_at) >= ? AND COALESCE(w.approval, 'approved') = 'approved'
                               ORDER BY at DESC`, [since])
          .catch(() => q(`SELECT w.issue_key, w.author, w.seconds, w.description, COALESCE(w.started_at, w.created_at) AS at, i.title
                            FROM it_kanban_worklogs w LEFT JOIN it_kanban_issues i ON i.issue_key = w.issue_key
                           WHERE COALESCE(w.started_at, w.created_at) >= ? ORDER BY at DESC`, [since]));
        const byPerson = {};
        rows.forEach(r => { byPerson[r.author] = (byPerson[r.author] || 0) + Number(r.seconds || 0) / 3600; });
        const people = Object.entries(byPerson).map(([name, hours]) => ({ name, hours: round1(hours) })).sort((a, b) => b.hours - a.hours);
        return send(rows.map(r => ({
          when: r.at, person: r.author, key: r.issue_key, title: r.title || '', hours: round1(Number(r.seconds || 0) / 3600),
          note: String(r.description || '').replace(/^(Auto-logged|Timer(?: \(In Progress\))?):?\s*/i, '')
        })), ['when', 'person', 'key', 'title', 'hours', 'note'], { people });
      }

      if (type === 'projects') {
        const rows = await q('SELECT id, name, title, status, due_date, end_date FROM projects');
        const issues = await q('SELECT project_id, status, due_date FROM it_kanban_issues WHERE project_id IS NOT NULL');
        let list = rows.map(p => {
          const mine = issues.filter(i => i.project_id === p.id);
          const done = mine.filter(i => bucketOf(i.status) === 'done').length;
          const due = p.due_date || p.end_date;
          return {
            id: p.id, name: p.name || p.title, status: p.status || '—', tasks: mine.length, done,
            progress: mine.length ? Math.round((done / mine.length) * 100) : 0,
            overdue: mine.filter(i => bucketOf(i.status) !== 'done' && i.due_date && !isHold(i.status) && ymd(new Date(i.due_date)) < today).length,
            due: due ? ymd(new Date(due)) : null, late: Boolean(due && ymd(new Date(due)) < today && !/complete/i.test(p.status || ''))
          };
        });
        if (req.query.late === '1') list = list.filter(p => p.late);
        if (req.query.status) list = list.filter(p => p.status === req.query.status);
        list.sort((a, b) => b.tasks - a.tasks);
        return send(list, ['name', 'status', 'tasks', 'done', 'progress', 'overdue', 'due']);
      }

      if (type === 'sprints') {
        const rows = await q(`SELECT s.id, s.name, s.status, s.department, s.start_date, s.end_date,
                                     (SELECT COUNT(*) FROM it_kanban_issues i WHERE i.sprint_id = s.id) AS tasks,
                                     (SELECT COUNT(*) FROM it_kanban_issues i WHERE i.sprint_id = s.id AND UPPER(TRIM(i.status)) IN (?)) AS done
                                FROM sprints s WHERE s.status = 'Active' ORDER BY s.end_date`, [DONE]);
        let list = rows.map(s => ({
          name: s.name, department: normDept(s.department), start: s.start_date ? ymd(new Date(s.start_date)) : null,
          end: s.end_date ? ymd(new Date(s.end_date)) : null, tasks: Number(s.tasks), done: Number(s.done),
          late: Boolean(s.end_date && ymd(new Date(s.end_date)) < today)
        }));
        if (req.query.filter === 'late') list = list.filter(s => s.late);
        return send(list, ['name', 'department', 'start', 'end', 'tasks', 'done']);
      }

      if (type === 'approvals') {
        const rows = await q(`SELECT w.issue_key, w.author, w.seconds, w.description, w.started_at, w.created_at, i.title
                                FROM it_kanban_worklogs w LEFT JOIN it_kanban_issues i ON i.issue_key = w.issue_key
                               WHERE w.approval = 'pending' ORDER BY w.created_at DESC`).catch(() => []);
        return send(rows.map(r => ({ person: r.author, key: r.issue_key, title: r.title || '', hours: round1(Number(r.seconds || 0) / 3600), workDate: r.started_at ? ymd(new Date(r.started_at)) : null, logged: r.created_at, note: r.description || '' })),
          ['person', 'key', 'title', 'hours', 'workDate', 'note']);
      }

      if (type === 'planRequests') {
        const rows = await q(`SELECT issue_key, title, original_estimate, requested_estimate, estimate_requested_by, assignee
                                FROM it_kanban_issues WHERE requested_estimate IS NOT NULL`).catch(() => []);
        return send(rows.map(r => ({ key: r.issue_key, title: r.title, requestedBy: r.estimate_requested_by || '—', current: r.original_estimate || '—', requested: r.requested_estimate })),
          ['key', 'title', 'requestedBy', 'current', 'requested']);
      }

      if (type === 'registrations') {
        const rows = await q("SELECT first_name, last_name, email, department, role_name, status, created_at FROM registration_requests WHERE status = 'Pending' ORDER BY created_at DESC");
        return send(rows.map(r => ({ name: `${r.first_name || ''} ${r.last_name || ''}`.trim(), email: r.email, department: r.department || '—', role: r.role_name || '—', requested: r.created_at ? ymd(new Date(r.created_at)) : null })),
          ['name', 'email', 'department', 'role', 'requested']);
      }

      if (type === 'leads') {
        const rows = await q('SELECT lead_name, company, lead_status, lead_source, value, created_at FROM leads ORDER BY created_at DESC');
        return send(rows.map(r => ({ name: r.lead_name, company: r.company || '—', status: r.lead_status || '—', source: r.lead_source || '—', value: Number(r.value || 0), created: r.created_at ? ymd(new Date(r.created_at)) : null })),
          ['name', 'company', 'status', 'source', 'value', 'created']);
      }
      if (type === 'deals') {
        const rows = await q('SELECT deal_name, deal_stage, status, deal_value, expected_close_date, created_at FROM deals ORDER BY created_at DESC');
        let list = rows.map(r => ({ name: r.deal_name, stage: r.deal_stage || '—', status: r.status || '—', value: Number(r.deal_value || 0), expectedClose: r.expected_close_date ? ymd(new Date(r.expected_close_date)) : null }));
        if (req.query.stage) list = list.filter(d => d.stage === req.query.stage);
        if (req.query.filter === 'won') list = list.filter(d => /won/i.test(d.status) || /won/i.test(d.stage));
        if (req.query.filter === 'open') list = list.filter(d => !/won|lost/i.test(d.status));
        return send(list, ['name', 'stage', 'status', 'value', 'expectedClose']);
      }
      if (type === 'invoices') {
        const rows = await q('SELECT invoice_number, bill_to, amount, amount_paid, status, open_till, created_at FROM invoices ORDER BY created_at DESC');
        let list = rows.map(r => ({ number: r.invoice_number, client: r.bill_to || '—', amount: Number(r.amount || 0), paid: Number(r.amount_paid || 0), outstanding: Number(r.amount || 0) - Number(r.amount_paid || 0), status: r.status || '—', dueBy: r.open_till ? ymd(new Date(r.open_till)) : null }));
        if (req.query.filter === 'outstanding') list = list.filter(i => i.outstanding > 0);
        if (req.query.filter === 'overdue') list = list.filter(i => i.outstanding > 0 && i.dueBy && i.dueBy < today);
        return send(list, ['number', 'client', 'amount', 'paid', 'outstanding', 'status', 'dueBy']);
      }

      res.status(400).json({ error: 'Unknown detail type' });
    } catch (err) {
      console.error('Admin overview details failed:', err);
      res.status(500).json({ error: 'Failed to load the details' });
    }
  });
};

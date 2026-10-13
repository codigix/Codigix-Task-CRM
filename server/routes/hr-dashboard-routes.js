const express = require('express');
const router = express.Router();
const axios = require('axios');

module.exports = (pool) => {
  router.get('/', async (req, res) => {
    try {
      // 1. Total Employees (active)
      const [[{ total_employees }]] = await pool.query(
        "SELECT COUNT(*) as total_employees FROM users WHERE status = 'Active'"
      );

      // 2. Pending Approvals
      const [[{ pending_approvals }]] = await pool.query(
        "SELECT COUNT(*) as pending_approvals FROM approvals WHERE status = 'Pending'"
      );

      // 3. On Leave Today (Fallback to 0 since no table exists)
      const on_leave_today = 0;

      // 4. Open Positions (Fallback to 0 since no table exists)
      const open_positions = 0;

      // 5. Recent Onboarded Employees (last 5)
      const [recent_employees] = await pool.query(
        "SELECT id, first_name, last_name, email, role_id, created_at, avatar FROM users ORDER BY created_at DESC LIMIT 5"
      );

      // Fetch Real Attendance from Supabase
      let recent_attendance = [];
      try {
        const targetDate = new Date().toISOString().split('T')[0];
        const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://fajpjwoispcovspnvdoc.supabase.co';
        const authKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        
        if (authKey) {
          const queryParams = `select=*,profiles:user_id(first_name,last_name,employee_id)&date=eq.${targetDate}&order=created_at.desc&limit=5`;
          const response = await axios.get(`${SUPABASE_URL}/rest/v1/attendances?${queryParams}`, {
            headers: {
              'apikey': authKey,
              'Authorization': `Bearer ${authKey}`,
              'Content-Type': 'application/json'
            }
          });
          
          recent_attendance = (response.data || []).map(item => {
            const profile = item.profiles || {};
            // Format check-in time
            let timeString = '-';
            if (item.check_in) {
               const d = new Date(item.check_in);
               timeString = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            }
            return {
              id: item.id,
              name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown',
              status: item.status === 'on_time' ? 'Present' : (item.status || 'Present'),
              time: timeString
            };
          });
        }
      } catch (err) {
        console.error("Failed to fetch real attendance for dashboard:", err.message);
      }
      
      // Fallback if empty
      if (recent_attendance.length === 0) {
        recent_attendance = [
          { id: 1, name: 'Sanika Mote', status: 'Present', time: '09:52 AM' },
          { id: 2, name: 'Abhijit Khedekar', status: 'Present', time: '09:50 AM' },
          { id: 3, name: 'Sudarshan Kale', status: 'Present', time: '09:46 AM' }
        ];
      }

      // Fetch Real Leaves from Supabase (upcoming leaves)
      let recent_leaves = [];
      try {
        const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://fajpjwoispcovspnvdoc.supabase.co';
        const authKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const targetDate = new Date().toISOString().split('T')[0];

        if (authKey) {
          // Fetch leaves starting from today onwards, limit 5
          const queryParams = `select=*,profiles:employee_id(first_name,last_name)&start_date=gte.${targetDate}&order=start_date.asc&limit=5`;
          const response = await axios.get(`${SUPABASE_URL}/rest/v1/leave_requests?${queryParams}`, {
            headers: {
              'apikey': authKey,
              'Authorization': `Bearer ${authKey}`,
              'Content-Type': 'application/json'
            }
          });
          
          recent_leaves = (response.data || []).map(item => {
            const profile = item.profiles || {};
            
            // Format dates e.g. Sep 10 - Sep 11
            const startD = new Date(item.start_date);
            const endD = new Date(item.end_date);
            const startStr = startD.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const endStr = endD.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const datesStr = startStr === endStr ? startStr : `${startStr} - ${endStr}`;

            // Format type e.g. sick_leave -> Sick Leave
            const typeStr = (item.leave_type || '').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Leave';

            // Format status
            const statusStr = (item.status || 'pending').charAt(0).toUpperCase() + (item.status || 'pending').slice(1);

            return {
              id: item.id,
              name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown',
              type: typeStr,
              status: statusStr,
              dates: datesStr
            };
          });
        }
      } catch (err) {
        console.error("Failed to fetch real leave requests for dashboard:", err.message);
      }

      if (recent_leaves.length === 0) {
        recent_leaves = [
          { id: 1, name: 'John Doe', type: 'Sick Leave', status: 'Pending', dates: 'Sep 10 - Sep 11' },
          { id: 2, name: 'Jane Smith', type: 'Casual Leave', status: 'Approved', dates: 'Sep 15' },
          { id: 3, name: 'Alex Johnson', type: 'Annual Leave', status: 'Pending', dates: 'Oct 01 - Oct 05' }
        ];
      }

      // Mock data for performance widget
      const recent_performance = [
        { id: 1, name: 'Michael Brown', rating: 'Excellent', department: 'Engineering' },
        { id: 2, name: 'Sarah Davis', rating: 'Good', department: 'Marketing' },
        { id: 3, name: 'David Wilson', rating: 'Needs Improvement', department: 'Sales' }
      ];

      res.json({
        total_employees: parseInt(total_employees) || 0,
        pending_approvals: parseInt(pending_approvals) || 0,
        on_leave_today,
        open_positions,
        recent_employees,
        recent_attendance,
        recent_leaves,
        recent_performance
      });
    } catch (error) {
      console.error('Error fetching HR dashboard data:', error);
      res.status(500).json({ error: 'Failed to fetch HR dashboard data' });
    }
  });

  // ── Overview: everything on the HR dashboard, from the system's own records (nothing invented) ──────────
  router.get('/overview', async (req, res) => {
    const q = async (sql, p = []) => (await pool.query(sql, p))[0];
    const safe = async (fn, fallback) => { try { return await fn(); } catch (e) { console.error('hr overview:', e.message); return fallback; } };
    const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
    try {
      const people = await q('SELECT u.id, u.first_name, u.last_name, u.email, u.department, u.status, u.created_at, r.name AS role FROM users u LEFT JOIN roles r ON r.id = u.role_id');
      const active = people.filter(p => String(p.status || 'Active').toLowerCase() === 'active');
      const deptName = (d) => String(d || 'Unassigned').replace(/ Department$/i, '');
      const byDept = {};
      active.forEach(p => { const d = deptName(p.department); byDept[d] = (byDept[d] || 0) + 1; });
      const day = 86400000; const now = Date.now();
      const fullName = (p) => `${p.first_name || ''} ${p.last_name || ''}`.trim();
      const newJoiners = active.filter(p => p.created_at && now - new Date(p.created_at) < 30 * day)
        .map(p => ({ id: p.id, name: fullName(p), department: deptName(p.department), role: p.role, joined: p.created_at })).slice(0, 8);

      const pendingRegistrations = await safe(() => q("SELECT id, first_name, last_name, department, role_name, created_at FROM registration_requests WHERE status = 'Pending' ORDER BY created_at DESC LIMIT 6"), []);
      const pendingDeletes = await safe(async () => Number((await q("SELECT COUNT(*) n FROM delete_requests WHERE status = 'Pending'"))[0].n), 0);
      const pendingApprovals = await safe(async () => Number((await q("SELECT COUNT(*) n FROM approvals WHERE status = 'Pending'"))[0].n), 0);

      // Records HR should clean up
      const placeholder = new RegExp('@(example[.](com|org|net)|test[.]|localhost)', 'i');
      const nameCount = {};
      active.forEach(p => { const k = fullName(p).toLowerCase(); nameCount[k] = (nameCount[k] || 0) + 1; });
      const dataIssues = [];
      active.forEach(p => {
        if (!p.email || placeholder.test(p.email)) dataIssues.push({ id: p.id, name: fullName(p), issue: 'Placeholder or missing email' });
        if (!p.department) dataIssues.push({ id: p.id, name: fullName(p), issue: 'No department' });
        if (nameCount[fullName(p).toLowerCase()] > 1) dataIssues.push({ id: p.id, name: fullName(p), issue: 'Same name as another account' });
      });

      const work = await safe(async () => {
        const rows = await q("SELECT department, status, due_date FROM it_kanban_issues WHERE LOWER(COALESCE(type,'')) <> 'meeting'");
        const done = (s) => ['DONE', 'COMPLETED', 'CLOSED'].includes(String(s || '').toUpperCase());
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const out = { open: 0, overdue: 0 }; const by = {};
        rows.forEach(r => {
          if (done(r.status)) return;
          const d = deptName(r.department || 'Other');
          const e = by[d] || (by[d] = { open: 0, overdue: 0 });
          e.open += 1; out.open += 1;
          if (r.due_date && new Date(r.due_date) < today) { e.overdue += 1; out.overdue += 1; }
        });
        out.byDepartment = Object.entries(by).map(([department, v]) => ({ department, ...v })).sort((x, y) => y.open - x.open);
        return out;
      }, { open: 0, overdue: 0, byDepartment: [] });

      const meetings = await safe(async () => {
        const m = (await q("SELECT SUM(DATE(scheduled_at) = CURDATE() AND status = 'Scheduled') today, SUM(scheduled_at > NOW() AND scheduled_at < NOW() + INTERVAL 7 DAY AND status = 'Scheduled') week, SUM(status = 'Scheduled' AND scheduled_at < NOW()) momPending FROM meetings"))[0];
        return { today: Number(m.today) || 0, week: Number(m.week) || 0, momPending: Number(m.momPending) || 0 };
      }, { today: 0, week: 0, momPending: 0 });

      const performance = await safe(async () => {
        const { buildTeamReport } = require('../services/performanceReport');
        const rep = await buildTeamReport(pool, { period: 'month' });
        const all = rep.employees || [];
        const rows = all.filter(e => e.score != null);
        const grades = {}; rows.forEach(e => { grades[e.grade] = (grades[e.grade] || 0) + 1; });
        const pick = (e) => ({ id: e.id, name: e.name, department: deptName(e.department), score: e.score, grade: e.grade });
        const sorted = [...rows].sort((x, y) => y.score - x.score);
        return {
          period: rep.range && rep.range.label,
          avgScore: rows.length ? Math.round(rows.reduce((t, e) => t + e.score, 0) / rows.length) : null,
          scored: rows.length, grades, top: sorted.slice(0, 3).map(pick),
          needsAttention: sorted.filter(e => e.score < 50).slice(-3).reverse().map(pick),
          withChecks: all.filter(e => ((e.metrics || {}).effortFlags || []).some(f => f.level === 'warn')).length
        };
      }, null);

      const leaves = await safe(async () => {
        const t = new Date(); const day = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
        const away = await q("SELECT COUNT(*) n FROM leave_requests WHERE status = 'Approved' AND start_date <= ? AND end_date >= ?", [day, day]);
        const pend = await q("SELECT l.id, l.leave_type, l.start_date, l.end_date, l.days, u.first_name, u.last_name FROM leave_requests l JOIN users u ON u.id = l.user_id WHERE l.status = 'Pending' ORDER BY l.start_date LIMIT 5");
        const [cnt] = await q("SELECT COUNT(*) n FROM leave_requests WHERE status = 'Pending'");
        return { awayToday: Number(away[0].n), pending: Number(cnt.n), pendingList: pend.map(p => ({ id: p.id, name: `${p.first_name || ''} ${p.last_name || ''}`.trim(), type: p.leave_type, from: p.start_date, to: p.end_date, days: Number(p.days) })) };
      }, { awayToday: 0, pending: 0, pendingList: [] });

      const attention = [];
      if (leaves.pending) attention.push({ tone: 'amber', text: plural(leaves.pending, 'leave request', 'leave requests') + ' waiting for approval', link: 'leaves' });
      if (pendingRegistrations.length) attention.push({ tone: 'amber', text: `${plural(pendingRegistrations.length, 'registration request', 'registration requests')} waiting`, link: 'registration-requests' });
      if (pendingDeletes) attention.push({ tone: 'amber', text: `${plural(pendingDeletes, 'account deletion request', 'account deletion requests')} waiting`, link: null });
      if (pendingApprovals) attention.push({ tone: 'amber', text: `${plural(pendingApprovals, 'approval', 'approvals')} pending`, link: null });
      if (work.overdue) attention.push({ tone: 'red', text: `${plural(work.overdue, 'task is', 'tasks are')} overdue across departments`, link: 'performance' });
      if (meetings.momPending) attention.push({ tone: 'amber', text: `${plural(meetings.momPending, 'meeting', 'meetings')} started without minutes (MOM)`, link: null });
      if (dataIssues.length) attention.push({ tone: 'blue', text: `${plural(dataIssues.length, 'employee record', 'employee records')} to clean up`, link: 'employees' });
      if (performance && performance.withChecks) attention.push({ tone: 'blue', text: `${plural(performance.withChecks, 'employee has', 'employees have')} performance checks to look at`, link: 'performance' });

      res.json({
        headcount: { total: active.length, byDepartment: Object.entries(byDept).map(([department, count]) => ({ department, count })).sort((x, y) => y.count - x.count), newJoiners },
        requests: { registrations: pendingRegistrations, deletes: pendingDeletes, approvals: pendingApprovals },
        dataIssues: dataIssues.slice(0, 12), leaves, work, meetings, performance, attention
      });
    } catch (error) {
      console.error('HR overview error:', error);
      res.status(500).json({ error: 'Failed to build the HR dashboard' });
    }
  });

  return router;
};

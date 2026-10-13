/**
 * HR employee directory (HR and admins only).
 *   GET  /api/hr/employees            everyone, with role, department, status, who is on leave today, open work, data problems
 *   GET  /api/hr/employees/meta       roles and departments for the edit form
 *   PUT  /api/hr/employees/:id        change department, role, job title, department role, phone, location, status
 * Email, username and password are not editable here, and the password never leaves the server.
 */
const express = require('express');

const HR_RE = new RegExp('\\bhr\\b|human resource', 'i');
const DEPT_ROLES = ['Executive', 'Manager', 'Admin'];
const isHr = (u) => Boolean(u && (u.isAdmin || HR_RE.test(String(u.role || '')) || HR_RE.test(String(u.department || '')) || HR_RE.test(String(u.job_title || ''))));

module.exports = (pool) => {
  const router = express.Router();
  const q = (sql, p = []) => pool.query(sql, p).then(([r]) => r);
  router.use((req, res, next) => (isHr(req.user) ? next() : res.status(403).json({ error: 'Only HR and admins can manage employees.' })));

  const day = (d) => { const x = d ? new Date(d) : new Date(); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
  const dept = (d) => String(d || '').replace(/ Department$/i, '') || 'Unassigned';
  const placeholder = new RegExp('@(example[.](com|org|net)|test[.]|localhost)', 'i');

  router.get('/', async (req, res) => {
    try {
      const users = await q(`SELECT u.id, u.first_name, u.last_name, u.username, u.email, u.phone1, u.location, u.status, u.department, u.department_role, u.job_title,
          u.role_id, r.name AS role, u.created_at, u.last_seen, IF(CHAR_LENGTH(u.avatar) < 500, u.avatar, NULL) AS avatar
        FROM users u LEFT JOIN roles r ON r.id = u.role_id ORDER BY u.first_name, u.last_name`);
      const t = day();
      const onLeave = new Map();
      try {
        (await q("SELECT user_id, leave_type, end_date FROM leave_requests WHERE status = 'Approved' AND start_date <= ? AND end_date >= ?", [t, t])).forEach(l => onLeave.set(Number(l.user_id), { type: l.leave_type, until: day(l.end_date) }));
      } catch (e) { /* leave table not created yet */ }
      const work = new Map();
      try {
        const issues = await q("SELECT assignee, status, due_date FROM it_kanban_issues WHERE LOWER(COALESCE(type, '')) <> 'meeting'");
        const names = new Map(users.map(u => [`${u.first_name || ''} ${u.last_name || ''}`.trim().toLowerCase(), u.id]));
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        issues.forEach(i => {
          if (['DONE', 'COMPLETED', 'CLOSED'].includes(String(i.status || '').toUpperCase())) return;
          const id = names.get(String(i.assignee || '').trim().toLowerCase());
          if (!id) return;
          const w = work.get(id) || { open: 0, overdue: 0 }; w.open += 1;
          if (i.due_date && new Date(i.due_date) < todayStart) w.overdue += 1;
          work.set(id, w);
        });
      } catch (e) { /* tasks unavailable */ }
      const nameCount = {};
      users.forEach(u => { const k = `${u.first_name || ''} ${u.last_name || ''}`.trim().toLowerCase(); nameCount[k] = (nameCount[k] || 0) + 1; });

      res.json({
        employees: users.map(u => {
          const name = `${u.first_name || ''} ${u.last_name || ''}`.trim();
          const issues = [];
          if (!u.email || placeholder.test(u.email)) issues.push('Placeholder or missing email');
          if (!u.department) issues.push('No department');
          if (nameCount[name.toLowerCase()] > 1) issues.push('Same name as another account');
          return { id: u.id, name, first_name: u.first_name, last_name: u.last_name, username: u.username, email: u.email, phone: u.phone1, location: u.location, status: u.status || 'Active',
            department: dept(u.department), rawDepartment: u.department, department_role: u.department_role, job_title: u.job_title, role_id: u.role_id, role: u.role || '',
            joined: u.created_at, lastSeen: u.last_seen, avatar: u.avatar, onLeave: onLeave.get(Number(u.id)) || null, work: work.get(Number(u.id)) || { open: 0, overdue: 0 }, issues };
        })
      });
    } catch (e) { console.error('hr employees:', e.message); res.status(500).json({ error: 'Could not load employees' }); }
  });

  router.get('/meta', async (req, res) => {
    try {
      const roles = await q('SELECT id, name FROM roles ORDER BY name');
      const used = (await q('SELECT DISTINCT department FROM users WHERE department IS NOT NULL AND department <> ""')).map(r => r.department);
      const defaults = ['Sales Department', 'Marketing Department', 'IT Department', 'HR Department', 'Management', 'Administration'];
      res.json({ roles, departments: [...new Set([...defaults, ...used])], departmentRoles: DEPT_ROLES });
    } catch (e) { res.status(500).json({ error: 'Could not load the lists' }); }
  });

  router.put('/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const [u] = await q('SELECT id, status FROM users WHERE id = ?', [id]);
      if (!u) return res.status(404).json({ error: 'Employee not found.' });
      const b = req.body || {};
      const sets = []; const vals = [];
      const put = (col, v) => { sets.push(`${col} = ?`); vals.push(v); };
      const text = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
      if (b.department !== undefined) put('department', text(b.department, 100) || null);
      if (b.job_title !== undefined) put('job_title', text(b.job_title, 100) || null);
      if (b.phone !== undefined) put('phone1', text(b.phone, 20) || null);
      if (b.location !== undefined) put('location', text(b.location, 100) || null);
      if (b.department_role !== undefined) {
        if (!DEPT_ROLES.includes(b.department_role)) return res.status(400).json({ error: 'Department role must be Executive, Manager or Admin.' });
        put('department_role', b.department_role);
      }
      if (b.role_id !== undefined) {
        const [r] = await q('SELECT id, name FROM roles WHERE id = ?', [Number(b.role_id)]);
        if (!r) return res.status(400).json({ error: 'That role does not exist.' });
        if (/super admin/i.test(r.name) && !(req.user && req.user.isAdmin)) return res.status(403).json({ error: 'Only an admin can give the Super Admin role.' });
        put('role_id', r.id);
      }
      if (b.status !== undefined) {
        if (!['Active', 'Inactive'].includes(b.status)) return res.status(400).json({ error: 'Status must be Active or Inactive.' });
        if (b.status === 'Inactive' && id === Number(req.user.id)) return res.status(400).json({ error: 'You cannot deactivate your own account.' });
        put('status', b.status);
      }
      if (!sets.length) return res.json({ ok: true });
      await pool.query(`UPDATE users SET ${sets.join(', ')}, updated_at = NOW() WHERE id = ?`, [...vals, id]);
      res.json({ ok: true });
    } catch (e) { console.error('hr employee update:', e.message); res.status(500).json({ error: 'Could not save the changes' }); }
  });

  return router;
};

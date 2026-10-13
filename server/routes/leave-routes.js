/**
 * Leaves: employees apply, HR (and admins) approve or reject, everyone sees their own balance.
 *
 *   GET  /api/leaves?scope=mine|all&status=&year=   list (scope=all: HR / admin only)
 *   GET  /api/leaves/summary                        my balances + (HR) who is away today, pending, upcoming
 *   POST /api/leaves                                apply  (HR may pass user_id to record leave for someone: approved at once)
 *   POST /api/leaves/:id/decision                   { decision: 'approve' | 'reject', note }   HR / admin only, never your own
 *   POST /api/leaves/:id/cancel                     the owner (while pending, or before it starts); HR any
 */
const { workingDaysBetween } = require('../services/workTime');

// Days per calendar year. Unpaid leave has no limit.
const TYPES = { Casual: 12, Sick: 12, Earned: 15, Unpaid: null };
const HR_RE = new RegExp('\\bhr\\b|human resource', 'i');

module.exports = (app, pool) => {
  const q = (sql, p = []) => pool.query(sql, p).then(([r]) => r);
  const ready = pool.query(`CREATE TABLE IF NOT EXISTS leave_requests (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    leave_type VARCHAR(20) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days DECIMAL(4,1) NOT NULL,
    half_day TINYINT(1) NOT NULL DEFAULT 0,
    reason VARCHAR(500) DEFAULT NULL,
    status VARCHAR(12) NOT NULL DEFAULT 'Pending',
    decided_by INT DEFAULT NULL,
    decided_by_name VARCHAR(120) DEFAULT NULL,
    decision_note VARCHAR(500) DEFAULT NULL,
    decided_at DATETIME DEFAULT NULL,
    created_by INT DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_leave_user (user_id),
    KEY idx_leave_dates (start_date, end_date),
    KEY idx_leave_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`).catch(e => console.error('leave table:', e.message));

  const isHr = (u) => Boolean(u && (u.isAdmin || HR_RE.test(String(u.role || '')) || HR_RE.test(String(u.department || '')) || HR_RE.test(String(u.job_title || ''))));
  const ymd = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
  const isDay = (v) => /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(String(v || '')) && !isNaN(new Date(`${v}T12:00:00`));
  const str = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
  const name = (u) => `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || u.email;

  class Bad extends Error { constructor(s, m) { super(m); this.status = s; } }
  const route = (method, path, fn) => app[method](`/api/leaves${path}`, async (req, res) => {
    try {
      if (!req.user || !req.user.id) return res.status(401).json({ error: 'Please log in' });
      await ready; await fn(req, res);
    } catch (e) {
      if (e instanceof Bad) return res.status(e.status).json({ error: e.message });
      console.error('leaves:', e.message); res.status(500).json({ error: 'Something went wrong with leaves' });
    }
  });

  const daysOf = (start, end, half) => {
    if (half) return 0.5;
    return workingDaysBetween(new Date(`${start}T00:00:00`), new Date(new Date(`${end}T00:00:00`).getTime() + 86400000));
  };
  const usedDays = async (userId, type, year, excludeId = 0) => {
    const [r] = await q("SELECT COALESCE(SUM(days), 0) d FROM leave_requests WHERE user_id = ? AND leave_type = ? AND YEAR(start_date) = ? AND status IN ('Pending', 'Approved') AND id <> ?", [userId, type, year, excludeId]);
    return Number(r.d);
  };
  const balancesFor = async (userId, year) => {
    const out = [];
    for (const [type, allowance] of Object.entries(TYPES)) {
      const used = await usedDays(userId, type, year);
      out.push({ type, allowance, used, left: allowance == null ? null : Math.max(0, allowance - used) });
    }
    return out;
  };
  const notify = async (req, opts) => { const f = req.app.locals.createNotification; if (typeof f === 'function') await f(opts).catch(() => { }); };
  const rowOut = (r) => ({ ...r, start_date: ymd(r.start_date), end_date: ymd(r.end_date) });

  route('get', '', async (req, res) => {
    const hr = isHr(req.user);
    const all = req.query.scope === 'all';
    if (all && !hr) throw new Bad(403, 'Only HR and admins can see everyone\'s leaves.');
    const year = Number(req.query.year) || new Date().getFullYear();
    const where = ['YEAR(l.start_date) = ?']; const params = [year];
    if (!all) { where.push('l.user_id = ?'); params.push(req.user.id); }
    if (req.query.status) { where.push('l.status = ?'); params.push(String(req.query.status)); }
    const rows = await q(`SELECT l.*, u.first_name, u.last_name, u.department, u.avatar FROM leave_requests l JOIN users u ON u.id = l.user_id
      WHERE ${where.join(' AND ')} ORDER BY FIELD(l.status, 'Pending', 'Approved', 'Rejected', 'Cancelled'), l.start_date DESC, l.id DESC LIMIT 500`, params);
    res.json({ leaves: rows.map(r => ({ ...rowOut(r), employee: `${r.first_name || ''} ${r.last_name || ''}`.trim(), department: String(r.department || '').replace(/ Department$/i, '') })), isHr: hr, year });
  });

  route('get', '/summary', async (req, res) => {
    const hr = isHr(req.user);
    const year = new Date().getFullYear();
    const out = { me: req.user.id, year, types: Object.keys(TYPES), balances: await balancesFor(req.user.id, year), isHr: hr };
    if (hr) {
      const t = ymd(new Date());
      const away = await q(`SELECT l.id, l.leave_type, l.start_date, l.end_date, l.days, u.first_name, u.last_name, u.department FROM leave_requests l JOIN users u ON u.id = l.user_id
        WHERE l.status = 'Approved' AND l.start_date <= ? AND l.end_date >= ? ORDER BY u.first_name`, [t, t]);
      const upcoming = await q(`SELECT l.id, l.leave_type, l.start_date, l.end_date, l.days, u.first_name, u.last_name, u.department FROM leave_requests l JOIN users u ON u.id = l.user_id
        WHERE l.status = 'Approved' AND l.start_date > ? AND l.start_date <= DATE_ADD(?, INTERVAL 14 DAY) ORDER BY l.start_date LIMIT 10`, [t, t]);
      const [p] = await q("SELECT COUNT(*) n FROM leave_requests WHERE status = 'Pending'");
      const shape = (r) => ({ ...rowOut(r), employee: `${r.first_name || ''} ${r.last_name || ''}`.trim(), department: String(r.department || '').replace(/ Department$/i, '') });
      Object.assign(out, { awayToday: away.map(shape), upcoming: upcoming.map(shape), pending: Number(p.n) });
    }
    res.json(out);
  });

  route('post', '', async (req, res) => {
    const b = req.body || {};
    const hr = isHr(req.user);
    const forOther = hr && Number(b.user_id) && Number(b.user_id) !== Number(req.user.id);
    const userId = forOther ? Number(b.user_id) : Number(req.user.id);
    const type = Object.keys(TYPES).find(t => t.toLowerCase() === String(b.leave_type || '').toLowerCase());
    if (!type) throw new Bad(400, 'Choose a leave type.');
    if (!isDay(b.start_date)) throw new Bad(400, 'Choose the first day of leave.');
    const half = Boolean(b.half_day);
    const end = half ? b.start_date : (isDay(b.end_date) ? b.end_date : b.start_date);
    if (end < b.start_date) throw new Bad(400, 'The last day cannot be before the first day.');
    const days = daysOf(b.start_date, end, half);
    if (days <= 0) throw new Bad(400, 'Those dates are non-working days, so there is nothing to apply for.');
    const reason = str(b.reason, 500);
    if (!forOther && !reason) throw new Bad(400, 'Please give a short reason.');
    const [target] = await q('SELECT id, first_name, last_name, username, email FROM users WHERE id = ?', [userId]);
    if (!target) throw new Bad(404, 'Employee not found.');

    const [clash] = await q("SELECT id FROM leave_requests WHERE user_id = ? AND status IN ('Pending', 'Approved') AND start_date <= ? AND end_date >= ? LIMIT 1", [userId, end, b.start_date]);
    if (clash) throw new Bad(409, 'There is already a leave request that covers some of these dates.');
    const allowance = TYPES[type];
    if (allowance != null) {
      const year = Number(b.start_date.slice(0, 4));
      const used = await usedDays(userId, type, year);
      if (used + days > allowance) throw new Bad(400, `Only ${Math.max(0, allowance - used)} ${type.toLowerCase()} leave day(s) are left for ${year}. Choose Unpaid for the rest.`);
    }

    const status = forOther ? 'Approved' : 'Pending';
    const [ins] = await pool.query(`INSERT INTO leave_requests (user_id, leave_type, start_date, end_date, days, half_day, reason, status, decided_by, decided_by_name, decided_at, created_by)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`, [userId, type, b.start_date, end, days, half ? 1 : 0, reason || null, status, forOther ? req.user.id : null, forOther ? req.user.name : null, forOther ? new Date() : null, req.user.id]);
    const span = b.start_date === end ? b.start_date : `${b.start_date} to ${end}`;
    if (forOther) {
      await notify(req, { userId, type: 'leave', title: `Leave recorded: ${type}`, message: `${req.user.name} recorded ${days} day(s) of ${type.toLowerCase()} leave for you (${span}).`, link: '/leaves', actorName: req.user.name, entityType: 'leave', entityKey: String(ins.insertId) });
    } else {
      await notify(req, { targetAudience: 'hr_and_admin', excludeUserId: req.user.id, type: 'leave', title: `Leave request: ${name(target)}`, message: `${name(target)} asked for ${days} day(s) of ${type.toLowerCase()} leave (${span}).${reason ? ` "${reason}"` : ''}`, link: '/leaves', actorName: name(target), entityType: 'leave', entityKey: String(ins.insertId) });
    }
    res.json({ id: ins.insertId, status, days });
  });

  route('post', '/:id/decision', async (req, res) => {
    if (!isHr(req.user)) throw new Bad(403, 'Only HR and admins can approve or reject leave.');
    const decision = req.body && req.body.decision === 'approve' ? 'Approved' : req.body && req.body.decision === 'reject' ? 'Rejected' : null;
    if (!decision) throw new Bad(400, 'Decision must be approve or reject.');
    const [l] = await q('SELECT * FROM leave_requests WHERE id = ?', [req.params.id]);
    if (!l) throw new Bad(404, 'Leave request not found.');
    if (Number(l.user_id) === Number(req.user.id)) throw new Bad(403, 'You cannot decide your own leave. Ask another HR member or an admin.');
    if (l.status !== 'Pending') throw new Bad(409, `This request is already ${l.status.toLowerCase()}.`);
    const note = str(req.body.note, 500);
    if (decision === 'Rejected' && !note) throw new Bad(400, 'Please say why it is rejected.');
    await pool.query('UPDATE leave_requests SET status = ?, decided_by = ?, decided_by_name = ?, decision_note = ?, decided_at = NOW() WHERE id = ?', [decision, req.user.id, req.user.name, note || null, l.id]);
    const span = ymd(l.start_date) === ymd(l.end_date) ? ymd(l.start_date) : `${ymd(l.start_date)} to ${ymd(l.end_date)}`;
    await notify(req, { userId: l.user_id, type: 'leave', title: `Leave ${decision.toLowerCase()}`, message: `${req.user.name} ${decision.toLowerCase()} your ${l.leave_type.toLowerCase()} leave (${span}).${note ? ` Note: ${note}` : ''}`, link: '/leaves', actorName: req.user.name, entityType: 'leave', entityKey: String(l.id) });
    res.json({ ok: true, status: decision });
  });

  route('post', '/:id/cancel', async (req, res) => {
    const [l] = await q('SELECT * FROM leave_requests WHERE id = ?', [req.params.id]);
    if (!l) throw new Bad(404, 'Leave request not found.');
    const hr = isHr(req.user);
    if (Number(l.user_id) !== Number(req.user.id) && !hr) throw new Bad(403, 'You can only cancel your own leave.');
    if (!['Pending', 'Approved'].includes(l.status)) throw new Bad(409, `A ${l.status.toLowerCase()} request cannot be cancelled.`);
    if (!hr && l.status === 'Approved' && ymd(l.start_date) <= ymd(new Date())) throw new Bad(409, 'Leave that has already started can only be cancelled by HR.');
    await pool.query("UPDATE leave_requests SET status = 'Cancelled', decided_by = ?, decided_by_name = ?, decided_at = NOW() WHERE id = ?", [req.user.id, req.user.name, l.id]);
    if (Number(l.user_id) !== Number(req.user.id)) await notify(req, { userId: l.user_id, type: 'leave', title: 'Leave cancelled', message: `${req.user.name} cancelled your leave (${ymd(l.start_date)}).`, link: '/leaves', actorName: req.user.name, entityType: 'leave', entityKey: String(l.id) });
    res.json({ ok: true });
  });
};

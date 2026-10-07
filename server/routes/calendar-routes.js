/**
 * Team calendar.
 *
 * Events live in calendar_events. The calendar view also shows, read-only, the work that
 * already has dates elsewhere: board ticket due dates and sprint start/end dates.
 *
 * Who sees what: everyone in the event's department, the organiser, and invited
 * attendees. Admins see everything. Only the organiser, managers and admins can change or
 * delete an event.
 *
 * Meetings (category Meeting / Online meeting / Client call / Review / Training) that have
 * taken place count in the performance report for the organiser and every attendee.
 */
const crypto = require('crypto');

const CATEGORIES = ['Meeting', 'Online meeting', 'Client call', 'Review', 'Training', 'Deadline', 'Reminder', 'Holiday', 'Other'];
const STATUSES = ['Scheduled', 'Completed', 'Cancelled'];

module.exports = function setupCalendarRoutes(app, pool) {
  const db = { query: (sql, params) => pool.query(sql, params) };

  (async () => {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS calendar_events (
          id INT AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          category VARCHAR(40) NOT NULL DEFAULT 'Meeting',
          department VARCHAR(60) NULL,
          start_at DATETIME NOT NULL,
          end_at DATETIME NOT NULL,
          all_day TINYINT(1) NOT NULL DEFAULT 0,
          mode VARCHAR(10) NOT NULL DEFAULT 'offline',
          meeting_link VARCHAR(500) NULL,
          location VARCHAR(255) NULL,
          description TEXT NULL,
          attendee_ids JSON NULL,
          guest_emails JSON NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'Scheduled',
          created_by INT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_cal_start (start_at),
          INDEX idx_cal_dept (department)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    } catch (e) {
      console.error('Error creating calendar_events table:', e.message);
    }
  })();

  const normDept = (d) => String(d || '').replace(/\s*department\s*$/i, '').trim();
  const parseJson = (v, fb) => { if (v == null) return fb; if (typeof v !== 'string') return v; try { return JSON.parse(v); } catch (e) { return fb; } };
  const toDate = (v) => { const d = v ? new Date(v) : null; return d && !isNaN(d) ? d : null; };

  const currentUser = async (req) => {
    const [[u]] = await db.query(
      `SELECT u.id, u.first_name, u.last_name, u.username, u.email, u.department, r.name AS role_name
         FROM users u LEFT JOIN roles r ON r.id = u.role_id WHERE u.id = ?`,
      [req.user?.id]
    );
    if (!u) return null;
    const role = String(u.role_name || '').toLowerCase();
    return {
      id: u.id,
      name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username,
      email: u.email,
      department: normDept(u.department),
      isAdmin: role.includes('admin'),
      isManager: role.includes('manager') || role.includes('admin')
    };
  };

  const canSee = (me, ev) => me.isAdmin
    || Number(ev.created_by) === Number(me.id)
    || (ev.attendee_ids || []).map(Number).includes(Number(me.id))
    || (ev.department && normDept(ev.department).toLowerCase() === me.department.toLowerCase());
  const canEdit = (me, ev) => me.isAdmin || me.isManager || Number(ev.created_by) === Number(me.id);

  const shape = (row) => ({
    id: row.id,
    source: 'event',
    title: row.title,
    category: row.category,
    department: row.department,
    start: row.start_at,
    end: row.end_at,
    allDay: Boolean(row.all_day),
    mode: row.mode,
    meetingLink: row.meeting_link,
    location: row.location,
    description: row.description,
    attendeeIds: parseJson(row.attendee_ids, []) || [],
    guestEmails: parseJson(row.guest_emails, []) || [],
    status: row.status,
    createdBy: row.created_by,
    createdByName: row.creator_name || null
  });

  const validate = (body, { partial = false } = {}) => {
    const out = {};
    if (!partial || body.title !== undefined) {
      const title = String(body.title || '').trim();
      if (!title) return { error: 'Title is required' };
      out.title = title.slice(0, 255);
    }
    if (!partial || body.category !== undefined) {
      out.category = CATEGORIES.includes(body.category) ? body.category : 'Other';
    }
    if (!partial || body.start !== undefined || body.end !== undefined) {
      const start = toDate(body.start); const end = toDate(body.end);
      if (!start || !end) return { error: 'Start and end are required' };
      if (end <= start) return { error: 'The event must end after it starts' };
      if (end - start > 31 * 86400000) return { error: 'An event cannot be longer than 31 days' };
      out.start_at = start; out.end_at = end;
    }
    if (body.allDay !== undefined) out.all_day = body.allDay ? 1 : 0;
    if (body.mode !== undefined) out.mode = body.mode === 'online' ? 'online' : 'offline';
    if (body.meetingLink !== undefined) {
      const link = String(body.meetingLink || '').trim();
      if (link && !/^https?:\/\/\S+$/i.test(link)) return { error: 'The meeting link must start with http:// or https://' };
      out.meeting_link = link || null;
    }
    if (body.location !== undefined) out.location = String(body.location || '').trim().slice(0, 255) || null;
    if (body.description !== undefined) out.description = String(body.description || '').slice(0, 5000) || null;
    if (body.attendeeIds !== undefined) {
      out.attendee_ids = JSON.stringify([...new Set((body.attendeeIds || []).map(Number).filter(n => Number.isInteger(n) && n > 0))]);
    }
    if (body.guestEmails !== undefined) {
      const emails = [...new Set((body.guestEmails || []).map(e => String(e).trim().toLowerCase()))];
      if (emails.some(e => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))) return { error: 'One of the guest emails is not valid' };
      out.guest_emails = JSON.stringify(emails);
    }
    if (body.status !== undefined) {
      if (!STATUSES.includes(body.status)) return { error: 'Unknown status' };
      out.status = body.status;
    }
    if (body.department !== undefined) out.department = normDept(body.department) || null;
    return { data: out };
  };

  const notifyInvited = async (req, me, ev, userIds, verb) => {
    const notify = req.app.locals.createNotification;
    if (typeof notify !== 'function' || !userIds.length) return;
    const when = new Date(ev.start_at).toLocaleString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    await notify({
      userIds,
      type: 'calendar',
      title: `${me.name} ${verb}: ${ev.title}`,
      message: `${ev.category} on ${when}${ev.location ? ` · ${ev.location}` : ''}`,
      actorName: me.name,
      entityType: 'calendar_event',
      entityKey: String(ev.id),
      excludeUserId: me.id
    });
  };

  // ── Read ──────────────────────────────────────────────────────────────
  // GET /api/calendar/events?from=2026-10-01&to=2026-11-01[&include=tickets,sprints]
  app.get('/api/calendar/events', async (req, res) => {
    try {
      const me = await currentUser(req);
      if (!me) return res.status(401).json({ error: 'Please log in' });
      const from = toDate(req.query.from) || new Date(Date.now() - 45 * 86400000);
      const to = toDate(req.query.to) || new Date(Date.now() + 45 * 86400000);
      if (to - from > 400 * 86400000) return res.status(400).json({ error: 'Range too large' });
      const include = String(req.query.include || 'tickets,sprints').split(',');

      const [rows] = await db.query(
        `SELECT e.*, TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) AS creator_name
           FROM calendar_events e LEFT JOIN users u ON u.id = e.created_by
          WHERE e.start_at < ? AND e.end_at > ?
          ORDER BY e.start_at`,
        [to, from]
      );
      const events = rows.map(shape).filter(ev => canSee(me, { ...ev, created_by: ev.createdBy, attendee_ids: ev.attendeeIds }));
      events.forEach(ev => { ev.canEdit = canEdit(me, { created_by: ev.createdBy }); });

      const items = [];
      if (include.includes('tickets')) {
        // Your own tickets; managers also get their department's (shown as a separate layer).
        // Only running sprints are shown below: planned ones would flood the month.
        const [tickets] = await db.query(
          `SELECT issue_key, title, status, assignee, department, due_date FROM it_kanban_issues
            WHERE due_date IS NOT NULL AND due_date >= ? AND due_date < ?`,
          [from, to]
        );
        const myName = me.name.toLowerCase();
        tickets.forEach(t => {
          const mine = String(t.assignee || '').trim().toLowerCase() === myName;
          const myDept = normDept(t.department).toLowerCase() === me.department.toLowerCase();
          if (!(mine || (me.isManager && myDept) || me.isAdmin)) return;
          const done = ['DONE', 'COMPLETED', 'CLOSED'].includes(String(t.status || '').toUpperCase());
          items.push({
            id: `ticket-${t.issue_key}`, source: 'ticket', title: `${t.issue_key} · ${t.title}`,
            ticketKey: t.issue_key, start: t.due_date, end: t.due_date, allDay: true,
            status: t.status, assignee: t.assignee, done, mine
          });
        });
      }
      if (include.includes('sprints')) {
        const [sprints] = await db.query(
          `SELECT id, name, status, department, start_date, end_date FROM sprints
            WHERE status = 'Active' AND start_date IS NOT NULL AND end_date IS NOT NULL AND start_date < ? AND end_date >= ?`,
          [to, from]
        );
        sprints.filter(s => me.isAdmin || !s.department || normDept(s.department).toLowerCase() === me.department.toLowerCase())
          .forEach(s => {
            items.push({ id: `sprint-${s.id}-start`, source: 'sprint', title: `Sprint starts: ${s.name}`, start: s.start_date, end: s.start_date, allDay: true, status: s.status });
            items.push({ id: `sprint-${s.id}-end`, source: 'sprint', title: `Sprint ends: ${s.name}`, start: s.end_date, end: s.end_date, allDay: true, status: s.status });
          });
      }

      res.json({ events, items, categories: CATEGORIES, me: { id: me.id, isManager: me.isManager, department: me.department } });
    } catch (err) {
      console.error('Calendar fetch failed:', err);
      res.status(500).json({ error: 'Failed to load the calendar' });
    }
  });

  // ── Create ────────────────────────────────────────────────────────────
  app.post('/api/calendar/events', async (req, res) => {
    try {
      const me = await currentUser(req);
      if (!me) return res.status(401).json({ error: 'Please log in' });
      const { data, error } = validate(req.body || {});
      if (error) return res.status(400).json({ error });
      data.department = data.department || me.department || null;
      data.created_by = me.id;
      data.mode = data.mode || 'offline';
      const cols = Object.keys(data);
      const [r] = await db.query(
        `INSERT INTO calendar_events (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
        cols.map(c => data[c])
      );
      const [[row]] = await db.query('SELECT * FROM calendar_events WHERE id = ?', [r.insertId]);
      notifyInvited(req, me, row, parseJson(row.attendee_ids, []), 'invited you').catch(() => { });
      res.status(201).json({ ...shape(row), canEdit: true });
    } catch (err) {
      console.error('Calendar create failed:', err);
      res.status(500).json({ error: 'Failed to save the event' });
    }
  });

  // ── Update ────────────────────────────────────────────────────────────
  app.put('/api/calendar/events/:id', async (req, res) => {
    try {
      const me = await currentUser(req);
      if (!me) return res.status(401).json({ error: 'Please log in' });
      const [[existing]] = await db.query('SELECT * FROM calendar_events WHERE id = ?', [req.params.id]);
      if (!existing) return res.status(404).json({ error: 'Event not found' });
      if (!canEdit(me, existing)) return res.status(403).json({ error: 'Only the organiser or a manager can change this event' });
      // Moving one end must still validate against the other.
      const body = { ...req.body };
      if (body.start !== undefined || body.end !== undefined) {
        body.start = body.start ?? existing.start_at;
        body.end = body.end ?? existing.end_at;
      }
      const { data, error } = validate(body, { partial: true });
      if (error) return res.status(400).json({ error });
      const cols = Object.keys(data);
      if (cols.length) {
        await db.query(`UPDATE calendar_events SET ${cols.map(c => `${c} = ?`).join(', ')} WHERE id = ?`, [...cols.map(c => data[c]), existing.id]);
      }
      const [[row]] = await db.query('SELECT * FROM calendar_events WHERE id = ?', [existing.id]);
      // Tell only newly added attendees.
      const before = new Set((parseJson(existing.attendee_ids, []) || []).map(Number));
      const added = (parseJson(row.attendee_ids, []) || []).map(Number).filter(id => !before.has(id));
      notifyInvited(req, me, row, added, 'invited you').catch(() => { });
      if (data.status === 'Cancelled' && existing.status !== 'Cancelled') {
        notifyInvited(req, me, row, (parseJson(row.attendee_ids, []) || []).map(Number), 'cancelled').catch(() => { });
      }
      res.json({ ...shape(row), canEdit: true });
    } catch (err) {
      console.error('Calendar update failed:', err);
      res.status(500).json({ error: 'Failed to update the event' });
    }
  });

  // ── Delete ────────────────────────────────────────────────────────────
  app.delete('/api/calendar/events/:id', async (req, res) => {
    try {
      const me = await currentUser(req);
      if (!me) return res.status(401).json({ error: 'Please log in' });
      const [[existing]] = await db.query('SELECT * FROM calendar_events WHERE id = ?', [req.params.id]);
      if (!existing) return res.status(404).json({ error: 'Event not found' });
      if (!canEdit(me, existing)) return res.status(403).json({ error: 'Only the organiser or a manager can delete this event' });
      await db.query('DELETE FROM calendar_events WHERE id = ?', [existing.id]);
      await db.query("DELETE FROM notifications WHERE entity_type = 'calendar_event' AND entity_key = ?", [String(existing.id)]).catch(() => { });
      res.json({ success: true });
    } catch (err) {
      console.error('Calendar delete failed:', err);
      res.status(500).json({ error: 'Failed to delete the event' });
    }
  });

  // A real, joinable meeting room. Jitsi creates the room when the first person opens the
  // link, so no account or API key is needed. Google Meet / Zoom links can't be invented —
  // their codes must come from those services — so people paste those in themselves.
  app.post('/api/create-meeting', (req, res) => {
    const room = `codigix-${crypto.randomBytes(6).toString('hex')}`;
    res.json({ meetingLink: `https://meet.jit.si/${room}`, provider: 'jitsi' });
  });
};

/**
 * Meetings: schedule any meeting (online / offline / call), auto-create a Task,
 * and require MOM (Minutes of Meeting) to complete the task.
 *
 * Flow:
 *   POST /api/meetings          → creates meeting + auto-creates general_task (linked_type='Meeting')
 *   GET  /api/meetings          → list mine or all (managers)
 *   GET  /api/meetings/:id      → single meeting with attendees + task
 *   PUT  /api/meetings/:id      → update details (before it happens)
 *   POST /api/meetings/:id/mom  → save MOM → marks meeting Completed + task Completed
 *   POST /api/meetings/:id/cancel
 *   DELETE /api/meetings/:id    → host only, before it happens
 */

module.exports = (app, pool) => {
  const q = (sql, p = []) => pool.query(sql, p).then(([r]) => r);

  // ── runtime schema ─────────────────────────────────────────────────────────
  const schema = (async () => {
    await q(`CREATE TABLE IF NOT EXISTS meetings (
      id            INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      title         VARCHAR(255) NOT NULL,
      kind          VARCHAR(20) NOT NULL DEFAULT 'offline',
      scheduled_at  DATETIME NOT NULL,
      duration_min  INT NOT NULL DEFAULT 60,
      location      VARCHAR(500) DEFAULT NULL,
      meet_link     VARCHAR(500) DEFAULT NULL,
      agenda        TEXT DEFAULT NULL,
      status        VARCHAR(20) NOT NULL DEFAULT 'Scheduled',
      department    VARCHAR(80) DEFAULT NULL,
      host_id       INT NOT NULL,
      host_name     VARCHAR(120) DEFAULT NULL,
      task_id       INT DEFAULT NULL,
      mom           TEXT DEFAULT NULL,
      mom_decisions TEXT DEFAULT NULL,
      mom_submitted_at DATETIME DEFAULT NULL,
      created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    await q(`CREATE TABLE IF NOT EXISTS meeting_attendees (
      meeting_id INT NOT NULL,
      user_id    INT NOT NULL,
      name       VARCHAR(120) DEFAULT NULL,
      email      VARCHAR(180) DEFAULT NULL,
      responded  VARCHAR(20) NOT NULL DEFAULT 'pending',
      attended   TINYINT(1) DEFAULT NULL,
      PRIMARY KEY (meeting_id, user_id),
      KEY idx_ma_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    // link general_tasks back to a meeting
    const cols = await q(`SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'general_tasks' AND COLUMN_NAME = 'meeting_id'`);
    if (!cols.length) await q(`ALTER TABLE general_tasks ADD COLUMN meeting_id INT DEFAULT NULL`);
  })();

  const needUser = (req, res) => {
    if (!req.user?.id) { res.status(401).json({ error: 'Please log in' }); return null; }
    return req.user;
  };
  const fail = (res, e) => { console.error(e); res.status(500).json({ error: e.message || 'Server error' }); };
  const str = (v, max = 255) => String(v || '').trim().slice(0, max);
  const isMgr = (req) => req.user?.isManager || req.user?.isAdmin || req.user?.role === 'admin';

  // create a general_task for this meeting; returns task id
  const createMeetingTask = async (meeting, hostId, hostName, attendeeIds) => {
    const dt = new Date(meeting.scheduled_at);
    const dateStr = dt.toISOString().slice(0, 10);
    const timeStr = dt.toTimeString().slice(0, 5);
    const kindLabel = meeting.kind === 'online' ? 'Online meeting' : meeting.kind === 'call' ? 'Call' : 'Meeting';
    const desc = [
      `${kindLabel}: ${meeting.title}`,
      meeting.location ? `Location: ${meeting.location}` : null,
      meeting.meet_link ? `Link: ${meeting.meet_link}` : null,
      meeting.agenda ? `\nAgenda:\n${meeting.agenda}` : null,
      '\n⚠️ Add MOM (Minutes of Meeting) to complete this task.'
    ].filter(Boolean).join('\n');

    const assigned = [hostId, ...attendeeIds].filter((v, i, a) => a.indexOf(v) === i);

    const [ins] = await pool.query(`
      INSERT INTO general_tasks
        (title, description, status, priority, assigned_to, due_date, due_time,
         linked_type, created_by, task_type, meeting_id, created_at, updated_at)
      VALUES (?, ?, 'To Do', 'High', ?, ?, ?, 'Meeting', ?, 'Meeting', ?, NOW(), NOW())
    `, [
      `Meeting: ${meeting.title}`,
      desc,
      JSON.stringify(assigned),
      dateStr,
      timeStr + ':00',
      hostId,
      0  // placeholder — updated after meetings row inserted
    ]);
    return ins.insertId;
  };

  // ── POST /api/meetings ──────────────────────────────────────────────────────
  app.post('/api/meetings', async (req, res) => {
    await schema;
    const user = needUser(req, res); if (!user) return;
    try {
      const title = str(req.body?.title);
      if (!title) return res.status(400).json({ error: 'Title is required.' });
      const kind = ['online', 'offline', 'call'].includes(req.body?.kind) ? req.body.kind : 'offline';
      const scheduled_at = req.body?.scheduled_at;
      if (!scheduled_at || isNaN(Date.parse(scheduled_at))) return res.status(400).json({ error: 'Scheduled date/time is required.' });
      const duration_min = Math.max(5, parseInt(req.body?.duration_min, 10) || 60);
      const location  = kind !== 'online' ? str(req.body?.location, 500) : null;
      const meet_link = kind === 'online'  ? str(req.body?.meet_link, 500) : null;
      const agenda    = str(req.body?.agenda, 5000);
      const dept      = str(req.body?.department, 80);
      // attendees: array of { id, name, email } or just ids
      const rawAtt = Array.isArray(req.body?.attendees) ? req.body.attendees : [];
      const attendees = rawAtt.map(a => typeof a === 'object' ? a : { id: Number(a) }).filter(a => a.id);

      const [ins] = await pool.query(`
        INSERT INTO meetings (title, kind, scheduled_at, duration_min, location, meet_link, agenda, department, host_id, host_name, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [title, kind, scheduled_at, duration_min, location, meet_link, agenda || null, dept || null, user.id, user.name || null]);
      const meetingId = ins.insertId;

      // attendees (always include host)
      const allAtt = [{ id: Number(user.id), name: user.name || null, email: user.email || null }, ...attendees.filter(a => Number(a.id) !== Number(user.id))];
      if (allAtt.length) {
        await pool.query(`INSERT IGNORE INTO meeting_attendees (meeting_id, user_id, name, email, responded) VALUES ${allAtt.map(() => '(?,?,?,?,?)').join(',')}`,
          allAtt.flatMap(a => [meetingId, a.id, a.name || null, a.email || null, Number(a.id) === Number(user.id) ? 'accepted' : 'pending']));
      }

      // auto-create general_task
      const attIds = attendees.map(a => Number(a.id));
      const taskId = await createMeetingTask({ title, kind, scheduled_at, location, meet_link, agenda }, user.id, user.name, attIds);
      await pool.query('UPDATE general_tasks SET meeting_id = ? WHERE id = ?', [meetingId, taskId]);
      await pool.query('UPDATE meetings SET task_id = ? WHERE id = ?', [taskId, meetingId]);

      res.json({ id: meetingId, taskId });
    } catch (e) { fail(res, e); }
  });

  // ── GET /api/meetings ───────────────────────────────────────────────────────
  app.get('/api/meetings', async (req, res) => {
    await schema;
    const user = needUser(req, res); if (!user) return;
    try {
      const scope = req.query.scope === 'all' && isMgr(req) ? 'all' : 'mine';
      const status = str(req.query.status, 30);
      const from = req.query.from || null;
      const to   = req.query.to   || null;
      let sql = `SELECT m.*, GROUP_CONCAT(DISTINCT ma.user_id ORDER BY ma.user_id SEPARATOR ',') att_ids
        FROM meetings m
        LEFT JOIN meeting_attendees ma ON ma.meeting_id = m.id`;
      const params = [];
      const wheres = [];
      if (scope === 'mine') {
        wheres.push('(m.host_id = ? OR ma.user_id = ?)');
        params.push(user.id, user.id);
      }
      if (status) { wheres.push('m.status = ?'); params.push(status); }
      if (from)   { wheres.push('DATE(m.scheduled_at) >= ?'); params.push(from); }
      if (to)     { wheres.push('DATE(m.scheduled_at) <= ?'); params.push(to); }
      if (wheres.length) sql += ' WHERE ' + wheres.join(' AND ');
      sql += ' GROUP BY m.id ORDER BY m.scheduled_at DESC LIMIT 200';
      const rows = await q(sql, params);
      res.json({ meetings: rows.map(r => ({ ...r, attendeeIds: r.att_ids ? r.att_ids.split(',').map(Number) : [] })) });
    } catch (e) { fail(res, e); }
  });

  // ── GET /api/meetings/:id ───────────────────────────────────────────────────
  app.get('/api/meetings/:id', async (req, res) => {
    await schema;
    const user = needUser(req, res); if (!user) return;
    try {
      const [m] = await q('SELECT * FROM meetings WHERE id = ?', [req.params.id]);
      if (!m) return res.status(404).json({ error: 'Meeting not found.' });
      const attendees = await q(`SELECT ma.*, u.first_name, u.last_name, u.email, u.profile_image FROM meeting_attendees ma LEFT JOIN users u ON u.id = ma.user_id WHERE ma.meeting_id = ?`, [m.id]);
      const task = m.task_id ? (await q('SELECT id, title, status, description FROM general_tasks WHERE id = ?', [m.task_id]))[0] || null : null;
      const actionItems = await q('SELECT id, title, status, assigned_to, due_date FROM general_tasks WHERE meeting_id = ? AND task_type = ?', [m.id, 'MeetingAction']);
      res.json({ meeting: m, attendees: attendees.map(a => ({ ...a, name: a.name || [a.first_name, a.last_name].filter(Boolean).join(' '), email: a.email })), task, actionItems });
    } catch (e) { fail(res, e); }
  });

  // ── PUT /api/meetings/:id ───────────────────────────────────────────────────
  app.put('/api/meetings/:id', async (req, res) => {
    await schema;
    const user = needUser(req, res); if (!user) return;
    try {
      const [m] = await q('SELECT * FROM meetings WHERE id = ?', [req.params.id]);
      if (!m) return res.status(404).json({ error: 'Meeting not found.' });
      if (Number(m.host_id) !== Number(user.id) && !isMgr(req)) return res.status(403).json({ error: 'Only the host can edit this meeting.' });
      if (m.status === 'Completed') return res.status(400).json({ error: 'Completed meetings cannot be edited.' });

      const title  = str(req.body?.title) || m.title;
      const kind   = ['online', 'offline', 'call'].includes(req.body?.kind) ? req.body.kind : m.kind;
      const scheduled_at = req.body?.scheduled_at && !isNaN(Date.parse(req.body.scheduled_at)) ? req.body.scheduled_at : m.scheduled_at;
      const duration_min = req.body?.duration_min ? Math.max(5, parseInt(req.body.duration_min, 10)) : m.duration_min;
      const location  = req.body?.location  !== undefined ? str(req.body.location, 500)  : m.location;
      const meet_link = req.body?.meet_link !== undefined ? str(req.body.meet_link, 500) : m.meet_link;
      const agenda    = req.body?.agenda    !== undefined ? str(req.body.agenda, 5000)   : m.agenda;

      await q(`UPDATE meetings SET title=?, kind=?, scheduled_at=?, duration_min=?, location=?, meet_link=?, agenda=?, updated_at=NOW() WHERE id=?`,
        [title, kind, scheduled_at, duration_min, location || null, meet_link || null, agenda || null, m.id]);

      // sync task title/description
      if (m.task_id) {
        const dt = new Date(scheduled_at);
        await q(`UPDATE general_tasks SET title=?, due_date=?, due_time=?, updated_at=NOW() WHERE id=?`,
          [`Meeting: ${title}`, dt.toISOString().slice(0, 10), dt.toTimeString().slice(0, 5) + ':00', m.task_id]);
      }

      // update attendees if provided
      if (Array.isArray(req.body?.attendees)) {
        await q('DELETE FROM meeting_attendees WHERE meeting_id = ? AND user_id != ?', [m.id, m.host_id]);
        const rawAtt = req.body.attendees.map(a => typeof a === 'object' ? a : { id: Number(a) }).filter(a => a.id && Number(a.id) !== Number(m.host_id));
        if (rawAtt.length) {
          await pool.query(`INSERT IGNORE INTO meeting_attendees (meeting_id, user_id, name, email, responded) VALUES ${rawAtt.map(() => '(?,?,?,?,?)').join(',')}`,
            rawAtt.flatMap(a => [m.id, a.id, a.name || null, a.email || null, 'pending']));
        }
      }
      res.json({ ok: true });
    } catch (e) { fail(res, e); }
  });

  // ── POST /api/meetings/:id/mom ──────────────────────────────────────────────
  // Save MOM → completes the linked task. Required to mark meeting done.
  app.post('/api/meetings/:id/mom', async (req, res) => {
    await schema;
    const user = needUser(req, res); if (!user) return;
    try {
      const [m] = await q('SELECT * FROM meetings WHERE id = ?', [req.params.id]);
      if (!m) return res.status(404).json({ error: 'Meeting not found.' });
      if (Number(m.host_id) !== Number(user.id) && !isMgr(req)) return res.status(403).json({ error: 'Only the meeting host can submit MOM.' });
      if (m.status === 'Cancelled') return res.status(400).json({ error: 'Cannot add MOM to a cancelled meeting.' });

      const mom = str(req.body?.mom, 10000);
      if (!mom) return res.status(400).json({ error: 'MOM (discussion summary) is required.' });
      const decisions = str(req.body?.decisions, 5000);
      // action items: [{ title, assignedTo (userId), dueDate }]
      const rawActions = Array.isArray(req.body?.actionItems) ? req.body.actionItems : [];
      const actions = rawActions.filter(a => str(a.title));

      // save MOM + mark meeting Completed
      await q(`UPDATE meetings SET mom=?, mom_decisions=?, status='Completed', mom_submitted_at=NOW(), updated_at=NOW() WHERE id=?`,
        [mom, decisions || null, m.id]);

      // mark the linked task Completed
      if (m.task_id) {
        const momNote = [`MOM submitted.\n\nDiscussion:\n${mom}`, decisions ? `\nDecisions:\n${decisions}` : ''].join('');
        await q(`UPDATE general_tasks SET status='Completed', internal_notes=?, updated_at=NOW() WHERE id=?`, [momNote, m.task_id]);
      }

      // create action item tasks
      const actionIds = [];
      for (const a of actions) {
        const title = str(a.title);
        const assignedTo = a.assignedTo ? [Number(a.assignedTo)] : [Number(m.host_id)];
        const due = a.dueDate && !isNaN(Date.parse(a.dueDate)) ? a.dueDate.slice(0, 10) : null;
        const [ins] = await pool.query(`
          INSERT INTO general_tasks (title, description, status, priority, assigned_to, due_date, linked_type, created_by, task_type, meeting_id, created_at, updated_at)
          VALUES (?, ?, 'To Do', 'Medium', ?, ?, 'Meeting', ?, 'MeetingAction', ?, NOW(), NOW())
        `, [title, `Action item from meeting: ${m.title}`, JSON.stringify(assignedTo), due, user.id, m.id]);
        actionIds.push(ins.insertId);
      }

      // mark attendance for attendees who attended
      if (Array.isArray(req.body?.attended)) {
        const attended = req.body.attended.map(Number);
        if (attended.length) {
          await q(`UPDATE meeting_attendees SET attended = CASE WHEN user_id IN (${attended.map(() => '?').join(',')}) THEN 1 ELSE 0 END WHERE meeting_id = ?`,
            [...attended, m.id]);
        }
      }

      res.json({ ok: true, actionIds });
    } catch (e) { fail(res, e); }
  });

  // ── POST /api/meetings/:id/cancel ──────────────────────────────────────────
  app.post('/api/meetings/:id/cancel', async (req, res) => {
    await schema;
    const user = needUser(req, res); if (!user) return;
    try {
      const [m] = await q('SELECT * FROM meetings WHERE id = ?', [req.params.id]);
      if (!m) return res.status(404).json({ error: 'Meeting not found.' });
      if (Number(m.host_id) !== Number(user.id) && !isMgr(req)) return res.status(403).json({ error: 'Only the host can cancel.' });
      if (m.status === 'Completed') return res.status(400).json({ error: 'Meeting already completed.' });
      await q(`UPDATE meetings SET status='Cancelled', updated_at=NOW() WHERE id=?`, [m.id]);
      if (m.task_id) await q(`UPDATE general_tasks SET status='Cancelled', updated_at=NOW() WHERE id=?`, [m.task_id]);
      res.json({ ok: true });
    } catch (e) { fail(res, e); }
  });

  // ── DELETE /api/meetings/:id ────────────────────────────────────────────────
  app.delete('/api/meetings/:id', async (req, res) => {
    await schema;
    const user = needUser(req, res); if (!user) return;
    try {
      const [m] = await q('SELECT * FROM meetings WHERE id = ?', [req.params.id]);
      if (!m) return res.status(404).json({ error: 'Meeting not found.' });
      if (Number(m.host_id) !== Number(user.id) && !isMgr(req)) return res.status(403).json({ error: 'Only the host can delete.' });
      if (m.status === 'Completed') return res.status(400).json({ error: 'Cannot delete a completed meeting.' });
      await q('DELETE FROM meeting_attendees WHERE meeting_id = ?', [m.id]);
      await q('DELETE FROM meetings WHERE id = ?', [m.id]);
      if (m.task_id) await q(`UPDATE general_tasks SET meeting_id=NULL, status='Cancelled', updated_at=NOW() WHERE id=?`, [m.task_id]);
      res.json({ ok: true });
    } catch (e) { fail(res, e); }
  });

  // ── GET /api/meetings/users  (for the attendee picker) ─────────────────────
  app.get('/api/meetings/users', async (req, res) => {
    await schema;
    const user = needUser(req, res); if (!user) return;
    try {
      const users = await q(`SELECT id, CONCAT(first_name,' ',last_name) name, email, department, designation FROM users WHERE status='active' OR status='Active' ORDER BY first_name`);
      res.json({ users });
    } catch (e) { fail(res, e); }
  });
};

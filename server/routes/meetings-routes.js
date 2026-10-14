/**
 * Meetings — one complete flow, from scheduling to Minutes of Meeting.
 *
 *   Schedule  → meeting row + attendees
 *             → Google Calendar event (real Meet link when the account allows it)
 *             → calendar_events row (org calendar)
 *             → task-management work item (it_kanban_issues, type "Meeting"), placed in the
 *               chosen project/sprint, with one "Attend" sub-task per employee
 *             → to-do mirror (general_tasks) so it also shows in each person's To-do page
 *   Edit / Reschedule / Add-remove attendees → every one of the above is updated together
 *   Cancel / Delete → everything above is removed or closed, attendees are notified
 *   MOM       → the ONLY way to complete the work item; action items become real tasks
 *
 * Routes:
 *   GET    /api/meetings                   list (scope mine|all, status, when, project_id)
 *   GET    /api/meetings/:id               detail (attendees, task, action items, activity log)
 *   POST   /api/meetings                   schedule
 *   PUT    /api/meetings/:id               edit details / attendees / project / sprint
 *   POST   /api/meetings/:id/reschedule    new date/time with a reason
 *   POST   /api/meetings/:id/respond       attendee RSVP (accepted | declined | tentative)
 *   POST   /api/meetings/:id/meet-link     (re)generate the Google Meet link
 *   POST   /api/meetings/:id/mom           submit / update Minutes of Meeting
 *   POST   /api/meetings/:id/cancel        cancel with a reason
 *   DELETE /api/meetings/:id               delete
 *   GET    /api/meetings/projects | sprints/:projectId | project-team/:projectId | users
 */

const crypto = require('crypto');
const { google } = require('googleapis');
const { resolvePrefix, nextIssueKey } = require('../utils/issueKeys');
const push = require('../services/push');

module.exports = (app, pool) => {
  // ── tiny helpers ───────────────────────────────────────────────────────────
  const q = (sql, p = []) => pool.query(sql, p).then(([r]) => r);
  const str = (v, max = 255) => String(v == null ? '' : v).trim().slice(0, max);
  const TZ = process.env.MEETING_TZ || 'Asia/Kolkata';

  class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
  const fail = (res, e) => {
    if (e instanceof HttpError) return res.status(e.status).json({ error: e.message });
    console.error('[meetings]', e.message || e);
    res.status(500).json({ error: e.message || 'Server error' });
  };
  const needUser = (req) => { if (!req.user?.id) throw new HttpError(401, 'Please log in'); return req.user; };
  const isMgr = (req) => !!(req.user?.isManager || req.user?.isAdmin);
  const route = (fn) => async (req, res) => { try { await schema; await fn(req, res, needUser(req)); } catch (e) { fail(res, e); } };

  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const hms = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
  const toSql = (v) => { const d = new Date(v); return `${ymd(d)} ${hms(d)}`; };
  const validDate = (v) => v && !isNaN(Date.parse(v));
  const normDept = (d) => String(d || '').replace(/\s*department\s*$/i, '').trim();
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const parseJson = (v, fallback) => {
    if (v == null) return fallback;
    if (typeof v !== 'string') return v;
    try { return JSON.parse(v); } catch { return fallback; }
  };
  const fmtWhen = (v) => {
    const d = new Date(v);
    return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const cleanEmails = (list) => [...new Set((Array.isArray(list) ? list : []).map((e) => String(e).trim().toLowerCase()).filter((e) => EMAIL_RE.test(e)))];

  // ── runtime schema (idempotent) ────────────────────────────────────────────
  const schema = (async () => {
    await q(`CREATE TABLE IF NOT EXISTS meetings (
      id               INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      title            VARCHAR(255) NOT NULL,
      kind             VARCHAR(20) NOT NULL DEFAULT 'offline',
      scheduled_at     DATETIME NOT NULL,
      duration_min     INT NOT NULL DEFAULT 60,
      location         VARCHAR(500) DEFAULT NULL,
      meet_link        VARCHAR(500) DEFAULT NULL,
      google_event_id  VARCHAR(200) DEFAULT NULL,
      google_owner     VARCHAR(40) DEFAULT NULL,
      meet_provider    VARCHAR(20) DEFAULT NULL,
      agenda           TEXT DEFAULT NULL,
      status           VARCHAR(20) NOT NULL DEFAULT 'Scheduled',
      department       VARCHAR(80) DEFAULT NULL,
      project_id       INT DEFAULT NULL,
      sprint_id        INT DEFAULT NULL,
      host_id          INT NOT NULL,
      host_name        VARCHAR(120) DEFAULT NULL,
      task_id          INT DEFAULT NULL,
      sprint_task_id   INT DEFAULT NULL,
      cal_event_id     INT DEFAULT NULL,
      issue_key        VARCHAR(50) DEFAULT NULL,
      guest_emails     JSON DEFAULT NULL,
      action_keys      JSON DEFAULT NULL,
      reschedule_count INT NOT NULL DEFAULT 0,
      cancel_reason    VARCHAR(500) DEFAULT NULL,
      mom              TEXT DEFAULT NULL,
      mom_decisions    TEXT DEFAULT NULL,
      mom_submitted_at DATETIME DEFAULT NULL,
      created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_m_project (project_id),
      KEY idx_m_sprint (sprint_id),
      KEY idx_m_host (host_id),
      KEY idx_m_issue (issue_key)
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

    await q(`CREATE TABLE IF NOT EXISTS meeting_log (
      id         INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      meeting_id INT NOT NULL,
      user_id    INT DEFAULT NULL,
      user_name  VARCHAR(120) DEFAULT NULL,
      action     VARCHAR(40) NOT NULL,
      detail     VARCHAR(600) DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_ml_meeting (meeting_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    await q(`CREATE TABLE IF NOT EXISTS google_oauth (
      user_id       INT NOT NULL PRIMARY KEY,
      email         VARCHAR(190) DEFAULT NULL,
      refresh_token TEXT NOT NULL,
      is_org        TINYINT(1) NOT NULL DEFAULT 0,
      connected_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    const hasCol = async (table, col) => {
      const rows = await q('SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?', [table, col]);
      return rows.length > 0;
    };
    const addCol = async (table, col, def) => { if (!(await hasCol(table, col))) await q(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`); };
    await addCol('general_tasks', 'meeting_id', 'INT DEFAULT NULL');
    for (const [col, def] of [
      ['project_id', 'INT DEFAULT NULL'], ['sprint_id', 'INT DEFAULT NULL'], ['google_event_id', 'VARCHAR(200) DEFAULT NULL'],
      ['sprint_task_id', 'INT DEFAULT NULL'], ['cal_event_id', 'INT DEFAULT NULL'], ['issue_key', 'VARCHAR(50) DEFAULT NULL'],
      ['guest_emails', 'JSON DEFAULT NULL'], ['action_keys', 'JSON DEFAULT NULL'],
      ['reschedule_count', 'INT NOT NULL DEFAULT 0'], ['cancel_reason', 'VARCHAR(500) DEFAULT NULL'],
      ['meet_provider', 'VARCHAR(20) DEFAULT NULL'], ['google_owner', 'VARCHAR(40) DEFAULT NULL']
    ]) await addCol('meetings', col, def);
  })();
  schema.catch((e) => console.error('[meetings] schema setup failed:', e.message));

  // ── data access ────────────────────────────────────────────────────────────
  const getMeeting = async (id) => {
    const [m] = await q('SELECT * FROM meetings WHERE id = ?', [id]);
    if (!m) throw new HttpError(404, 'Meeting not found.');
    return m;
  };
  const usersByIds = async (ids) => {
    const list = [...new Set(ids.map(Number).filter(Boolean))];
    if (!list.length) return [];
    return q(`SELECT id, TRIM(CONCAT(COALESCE(first_name,''),' ',COALESCE(last_name,''))) AS name, email, department
              FROM users WHERE id IN (${list.map(() => '?').join(',')})`, list);
  };
  const attendeesOf = (meetingId) => q('SELECT * FROM meeting_attendees WHERE meeting_id = ?', [meetingId]);
  const isAttendee = async (meetingId, userId) => (await q('SELECT 1 FROM meeting_attendees WHERE meeting_id = ? AND user_id = ?', [meetingId, userId])).length > 0;

  const logAction = async (meetingId, user, action, detail) => {
    try { await q('INSERT INTO meeting_log (meeting_id, user_id, user_name, action, detail) VALUES (?,?,?,?,?)', [meetingId, user?.id || null, user?.name || null, action, detail ? str(detail, 600) : null]); }
    catch (e) { console.warn('[meetings] log failed:', e.message); }
  };

  const notify = async (userIds, { title, message, meetingId, actor }) => {
    const ids = [...new Set(userIds.map(Number))].filter(Boolean);
    if (!ids.length) return;
    try {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, link, actor_name, entity_type, entity_key) VALUES ${ids.map(() => '(?,?,?,?,?,?,?,?)').join(',')}`,
        ids.flatMap((id) => [id, 'meeting', str(title, 255), message || null, `/meetings?open=${meetingId}`, actor || null, 'meeting', String(meetingId)])
      );
    } catch (e) { console.warn('[meetings] notify failed:', e.message); }
    // Also to their phones / desktops (only people who turned notifications on have a device registered).
    push.sendToUsers(ids, { title, body: message, url: `/meetings?open=${meetingId}`, kind: 'meeting', tag: `meeting-${meetingId}` }).catch(() => { });
  };

  // ── Google Calendar / Meet ─────────────────────────────────────────────────
  // A Google Meet link can only be created on behalf of a real Google user; a plain service account's own
  // calendar cannot hold Meet conferences. So Google is used when one of these is available (best first):
  //   1. the host (or the organisation) connected a Google account via "Connect Google" (OAuth)
  //   2. the service account impersonates a Workspace user (GOOGLE_IMPERSONATE_EMAIL + domain-wide delegation)
  // Otherwise no Google call is made and the meeting gets a working Jitsi Meet link instead.
  const vaultKey = () => crypto.createHash('sha256').update(process.env.VAULT_KEY || `${process.env.JWT_SECRET || 'codigix'}:meetings-google`).digest();
  const seal = (plain) => {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', vaultKey(), iv);
    const ct = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
    return `v1:${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${ct.toString('base64')}`;
  };
  const unseal = (stored) => {
    const [v, iv, tag, ct] = String(stored || '').split(':');
    if (v !== 'v1') throw new Error('Unknown secret format');
    const d = crypto.createDecipheriv('aes-256-gcm', vaultKey(), Buffer.from(iv, 'base64'));
    d.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([d.update(Buffer.from(ct, 'base64')), d.final()]).toString('utf8');
  };

  const oauthCfg = () => ({ id: process.env.GOOGLE_OAUTH_CLIENT_ID || '', secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '' });
  const oauthConfigured = () => { const c = oauthCfg(); return !!(c.id && c.secret); };
  const makeOAuth = (redirect) => new google.auth.OAuth2(oauthCfg().id, oauthCfg().secret, redirect);
  const saCreds = () => {
    const email = process.env.GOOGLE_CLIENT_EMAIL; const key = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
    return email && key ? { email, key } : null;
  };
  const redirectUriFor = (req) => process.env.GOOGLE_OAUTH_REDIRECT_URI
    || `${(process.env.API_PUBLIC_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '')}/api/meetings/google/callback`;
  const OAUTH_SCOPES = ['https://www.googleapis.com/auth/calendar.events', 'https://www.googleapis.com/auth/meetings.space.created', 'openid', 'email'];

  /** Which Google identity should create this host's events? Returns an owner key or null. */
  const pickOwner = async (hostId) => {
    if (oauthConfigured()) {
      const [own] = await q('SELECT user_id FROM google_oauth WHERE user_id = ?', [hostId]);
      if (own) return `u:${own.user_id}`;
      const [org] = await q('SELECT user_id FROM google_oauth WHERE is_org = 1 ORDER BY connected_at DESC LIMIT 1');
      if (org) return `u:${org.user_id}`;
    }
    if (process.env.GOOGLE_IMPERSONATE_EMAIL && saCreds()) return 'dwd';
    return null;
  };

  const clientByOwner = async (owner) => {
    if (!owner) return null;
    try {
      if (owner === 'dwd') {
        const c = saCreds(); if (!c) return null;
        const auth = new google.auth.JWT(c.email, null, c.key, ['https://www.googleapis.com/auth/calendar'], process.env.GOOGLE_IMPERSONATE_EMAIL);
        return { calendar: google.calendar({ version: 'v3', auth }), calendarId: 'primary', owner };
      }
      const uid = Number(String(owner).split(':')[1]);
      const [row] = await q('SELECT refresh_token FROM google_oauth WHERE user_id = ?', [uid]);
      if (!row || !oauthConfigured()) return null;
      const auth = makeOAuth(); auth.setCredentials({ refresh_token: unseal(row.refresh_token) });
      return { calendar: google.calendar({ version: 'v3', auth }), calendarId: 'primary', owner };
    } catch (e) { console.warn('[meetings] could not build Google client:', e.message); return null; }
  };

  const dropToken = async (owner) => {
    const uid = Number(String(owner || '').split(':')[1]);
    if (uid) await q('DELETE FROM google_oauth WHERE user_id = ?', [uid]).catch(() => { });
  };

  const meetUri = (data) => data?.hangoutLink || (data?.conferenceData?.entryPoints || []).find((e) => e.entryPointType === 'video')?.uri || null;
  const shortErr = (e) => str(e?.errors?.[0]?.message || e?.response?.data?.error_description || e?.response?.data?.error?.message || e?.message || 'unknown error', 200);
  const jitsiLink = (title) => {
    const slug = String(title || 'meeting').normalize('NFKD').replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24).toLowerCase() || 'meeting';
    return `https://meet.jit.si/Codigix-${slug}-${crypto.randomBytes(6).toString('hex')}`;
  };

  /**
   * Create or update the Google Calendar event as `owner`. Tries the full request first, then drops attendees,
   * then the Meet request, so the meeting is always saved. Returns { eventId, meetLink, warning, owner }.
   */
  const syncGoogle = async (m, emails, { wantMeet, owner, fallbackLink, host }) => {
    const g = await clientByOwner(owner);
    if (!g) return { eventId: null, meetLink: null, warning: null, owner: null };

    const start = new Date(m.scheduled_at);
    const end = new Date(start.getTime() + (m.duration_min || 60) * 60000);
    // Placeholder domains (example.com, *.test, ...) can never receive mail, so don't ask Google to invite them.
    const undeliverable = (e) => /@(example\.(com|org|net)|localhost|[^@]+\.(test|invalid|local|example))$/i.test(String(e));
    const invitees = [...new Set([...emails, ...parseJson(m.guest_emails, [])].map((e) => String(e).trim().toLowerCase()))].filter((e) => e && !undeliverable(e));
    const attempts = wantMeet
      ? [{ attendees: true, meet: true }, { attendees: false, meet: true }, { attendees: false, meet: false }]
      : [{ attendees: true, meet: false }, { attendees: false, meet: false }];
    let firstError = null;
    let existingId = m.google_owner === owner && m.google_event_id ? m.google_event_id : null;
    if (m.google_event_id && m.google_owner && m.google_owner !== owner) await deleteGoogle(m.google_event_id, m.google_owner);

    for (let i = 0; i < attempts.length; i++) {
      const a = attempts[i];
      const joinLine = !a.meet && fallbackLink ? `Join: ${fallbackLink}` : '';
      // Google always sends the invitation as the connected account, so the real host is named in the title,
      // at the top of the description and in the guest list.
      const hostName = host?.name || m.host_name || '';
      const hostEmail = String(host?.email || '').trim().toLowerCase();
      const hostLine = hostName ? `<b>Hosted by ${esc(hostName)}</b>${hostEmail ? ` (${esc(hostEmail)})` : ''}` : '';
      const resource = {
        summary: hostName ? `${m.title} — hosted by ${hostName}` : m.title,
        description: [hostLine, esc(m.agenda || '').split('\n').join('<br>'), esc(joinLine), !a.attendees && invitees.length ? `Invitees: ${esc(invitees.join(', '))}` : ''].filter(Boolean).join('<br><br>'),
        location: m.kind === 'offline' ? (m.location || '') : (!a.meet && fallbackLink ? fallbackLink : ''),
        start: { dateTime: start.toISOString(), timeZone: TZ },
        end: { dateTime: end.toISOString(), timeZone: TZ },
        reminders: { useDefault: false, overrides: [{ method: 'email', minutes: 60 }, { method: 'popup', minutes: 10 }] }
      };
      if (a.attendees) {
        const names = host?.names || new Map();
        resource.attendees = invitees.map((email) => {
          const att = { email };
          const nm = names.get(email);
          if (email === hostEmail) { att.displayName = `${hostName || nm || email} (Host)`; att.responseStatus = 'accepted'; }
          else if (nm) att.displayName = nm;
          return att;
        });
      }
      if (a.meet) resource.conferenceData = { createRequest: { requestId: `mtg-${m.id}-${Date.now()}`, conferenceSolutionKey: { type: 'hangoutsMeet' } } };
      const params = { calendarId: g.calendarId, resource, conferenceDataVersion: a.meet ? 1 : 0, sendUpdates: a.attendees ? 'all' : 'none' };
      try {
        let resp;
        if (existingId) {
          try { resp = await g.calendar.events.patch({ ...params, eventId: existingId }); }
          catch (pe) { if (pe?.code === 404 || pe?.code === 410) { existingId = null; resp = await g.calendar.events.insert(params); } else throw pe; }
        } else resp = await g.calendar.events.insert(params);
        const link = meetUri(resp.data);
        let warning = null;
        if (i > 0 && firstError) warning = a.attendees ? null : `Saved to Google Calendar, but Google did not email the invitations (${firstError}).`;
        return { eventId: resp.data.id, meetLink: link, warning, owner };
      } catch (e) {
        if (!firstError) firstError = shortErr(e);
        console.warn(`[meetings] Google Calendar attempt ${i + 1} failed:`, shortErr(e));
        const raw = `${e?.message} ${e?.response?.data?.error} ${e?.errors?.[0]?.reason || ''}`;
        if (/invalid_grant/i.test(raw)) {
          await dropToken(owner);
          return { retry: true, eventId: null, meetLink: null, warning: 'A Google connection had expired or was revoked and was removed. Reconnect Google from the Meetings page.', owner: null };
        }
        if (/insufficient (authentication )?scopes|insufficientPermissions|ACCESS_TOKEN_SCOPE_INSUFFICIENT/i.test(raw)) {
          await dropToken(owner);
          return { retry: true, eventId: null, meetLink: null, warning: 'A Google connection did not have the Calendar permission and was removed. Reconnect and tick the Google Calendar checkbox.', owner: null };
        }
      }
    }
    return { eventId: null, meetLink: null, warning: `Google Calendar sync failed (${firstError}).`, owner: null };
  };

  /**
   * "Ask to join" requests from outside guests go to the Meet organizer, i.e. the connected Google account.
   * Make the real host a co-host of the space so the requests reach them. Best effort: never fails the meeting.
   */
  const makeHostCohost = async (owner, meetLink, hostEmail) => {
    if (!owner || owner === 'dwd' || !meetLink || !hostEmail) return;
    const code = (String(meetLink).match(/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})/i) || [])[1];
    if (!code) return;
    try {
      const uid = Number(String(owner).split(':')[1]);
      const [row] = await q('SELECT refresh_token, email FROM google_oauth WHERE user_id = ?', [uid]);
      if (!row || String(row.email || '').toLowerCase() === hostEmail) return; // host already owns the event
      const auth = makeOAuth(); auth.setCredentials({ refresh_token: unseal(row.refresh_token) });
      const meet = google.meet({ version: 'v2', auth });
      const space = await meet.spaces.get({ name: `spaces/${code}` });
      await meet.spaces.members.create({ parent: space.data.name, requestBody: { email: hostEmail, role: 'COHOST' } });
    } catch (e) { console.warn('[meetings] could not make host a Meet co-host (join requests go to the organiser):', shortErr(e)); }
  };

  const deleteGoogle = async (eventId, owner) => {
    if (!eventId || !owner) return;
    const g = await clientByOwner(owner); if (!g) return;
    try { await g.calendar.events.delete({ calendarId: g.calendarId, eventId, sendUpdates: 'all' }); }
    catch (e) { if (e?.code !== 404 && e?.code !== 410) console.warn('[meetings] Google delete failed:', shortErr(e)); }
  };

  // ── org calendar (calendar_events) ─────────────────────────────────────────
  const upsertCalendarEvent = async (m, attendeeIds, guests) => {
    try {
      const start = new Date(m.scheduled_at);
      const end = new Date(start.getTime() + (m.duration_min || 60) * 60000);
      const mode = m.kind === 'online' ? 'online' : 'offline';
      const vals = [str(m.title), toSql(start), toSql(end), mode, m.meet_link || null, m.location ? str(m.location, 255) : null, m.agenda || null, JSON.stringify(attendeeIds), guests.length ? JSON.stringify(guests) : null];
      if (m.cal_event_id) {
        await q('UPDATE calendar_events SET title=?, start_at=?, end_at=?, mode=?, meeting_link=?, location=?, description=?, attendee_ids=?, guest_emails=?, status=?, updated_at=NOW() WHERE id=?', [...vals, 'Scheduled', m.cal_event_id]);
        return m.cal_event_id;
      }
      const [ins] = await pool.query(
        'INSERT INTO calendar_events (title, category, department, start_at, end_at, mode, meeting_link, location, description, attendee_ids, guest_emails, status, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
        [vals[0], 'Meeting', m.department || null, vals[1], vals[2], vals[3], vals[4], vals[5], vals[6], vals[7], vals[8], 'Scheduled', m.host_id]
      );
      return ins.insertId;
    } catch (e) { console.warn('[meetings] calendar_events sync failed:', e.message); return m.cal_event_id || null; }
  };

  // ── to-do mirror (general_tasks) ───────────────────────────────────────────
  // general_tasks.linked_type is an enum (General/Deal/Project/Lead); meeting rows are identified by task_type + meeting_id.
  const linkOf = (projectId) => (projectId ? ['Project', projectId] : ['General', null]);
  const taskText = (m) => [
    `Meeting: ${m.title}`,
    `When: ${fmtWhen(m.scheduled_at)} (${m.duration_min} min)`,
    m.kind === 'offline' && m.location ? `Location: ${m.location}` : null,
    m.kind === 'online' && m.meet_link ? `Meet link: ${m.meet_link}` : null,
    m.agenda ? `\nAgenda:\n${m.agenda}` : null,
    '\nSubmit the Minutes of Meeting (MOM) from the Meetings page to complete this task.'
  ].filter(Boolean).join('\n');

  const ensureTodo = async (m, assignedIds) => {
    const d = new Date(m.scheduled_at);
    const [lt, lid] = linkOf(m.project_id);
    if (m.task_id) {
      await q('UPDATE general_tasks SET title=?, description=?, due_date=?, due_time=?, assigned_to=?, linked_type=?, linked_id=?, updated_at=NOW() WHERE id=?',
        [`Meeting: ${m.title}`, taskText(m), ymd(d), hms(d), JSON.stringify(assignedIds), lt, lid, m.task_id]);
      return m.task_id;
    }
    const [ins] = await pool.query(
      `INSERT INTO general_tasks (title, description, status, priority, assigned_to, due_date, due_time, linked_type, linked_id, created_by, task_type, meeting_id)
       VALUES (?,?,'To Do','High',?,?,?,?,?,?,'Meeting',?)`,
      [`Meeting: ${m.title}`, taskText(m), JSON.stringify(assignedIds), ymd(d), hms(d), lt, lid, m.host_id, m.id]
    );
    return ins.insertId;
  };

  // ── work item in task management (it_kanban_issues) ────────────────────────
  const attendSubtask = (m, a, dateStr, done = false, absent = false) => ({
    id: `mtg-${m.id}-${a.user_id}`,
    title: `Attend: ${m.title}${absent ? ' (did not attend)' : ''}`,
    assignee: a.name || `User ${a.user_id}`,
    status: done ? 'DONE' : 'TO DO',
    completed: done,
    priority: 'Medium',
    due_date: dateStr,
    start_date: dateStr
  });

  const issueDescription = (m, attendees, guests, mom) => {
    const names = attendees.map((a) => esc(a.name || `User ${a.user_id}`)).join(', ');
    const parts = [
      `<p><strong>Meeting</strong> &mdash; ${esc(fmtWhen(m.scheduled_at))} (${m.duration_min} min, ${esc(m.kind)})</p>`,
      m.kind === 'offline' && m.location ? `<p><strong>Location:</strong> ${esc(m.location)}</p>` : '',
      m.kind === 'online' && m.meet_link ? `<p><strong>Meet link:</strong> <a href="${esc(m.meet_link)}">${esc(m.meet_link)}</a></p>` : '',
      m.agenda ? `<p><strong>Agenda:</strong><br/>${esc(m.agenda).replace(/\n/g, '<br/>')}</p>` : '',
      names ? `<p><strong>Attendees:</strong> ${names}${guests.length ? `; guests: ${esc(guests.join(', '))}` : ''}</p>` : '',
      mom
        ? `<hr/><p><strong>Minutes of Meeting</strong></p><p>${esc(mom.mom).replace(/\n/g, '<br/>')}</p>${mom.decisions ? `<p><strong>Decisions:</strong><br/>${esc(mom.decisions).replace(/\n/g, '<br/>')}</p>` : ''}`
        : '<p><em>This work item can only be completed by submitting the Minutes of Meeting (MOM) from the Meetings page.</em></p>'
    ];
    return parts.filter(Boolean).join('');
  };

  const sprintInfo = async (sprintId) => {
    if (!sprintId) return null;
    const [s] = await q('SELECT id, name, project_id, department FROM sprints WHERE id = ?', [sprintId]);
    return s || null;
  };

  const ensureIssue = async (m, attendees, guests, hostName) => {
    const d = new Date(m.scheduled_at);
    const dateStr = ymd(d);
    const sprint = await sprintInfo(m.sprint_id);
    const projectId = m.project_id || sprint?.project_id || null;
    const dept = normDept(sprint?.department || m.department) || 'IT';
    const estimate = `${Math.max(1, m.duration_min || 60)}m`;
    const wanted = attendees.filter((a) => Number(a.user_id) !== Number(m.host_id)).map((a) => attendSubtask(m, a, dateStr));
    const labels = JSON.stringify(['Meeting']);

    if (m.issue_key) {
      const [row] = await q('SELECT issue_key, subtasks, labels FROM it_kanban_issues WHERE issue_key = ?', [m.issue_key]);
      if (row) {
        const keptLabels = (Array.isArray(parseJson(row.labels, [])) ? parseJson(row.labels, []) : []).filter((l) => l && !/^meeting(:[0-9]+|-action)?$/i.test(String(l)));
        const issueLabels = JSON.stringify(['Meeting', ...keptLabels]);
        const existing = parseJson(row.subtasks, []);
        const byId = new Map((Array.isArray(existing) ? existing : []).map((s) => [String(s.id), s]));
        const merged = wanted.map((w) => ({ ...w, ...(byId.get(String(w.id)) || {}), title: w.title, assignee: w.assignee, due_date: dateStr, start_date: dateStr }));
        await q(`UPDATE it_kanban_issues SET title=?, description=?, due_date=?, start_date=?, project_id=?, sprint_id=?, sprint=?, department=?,
                 original_estimate=?, remaining_estimate=?, subtasks=?, labels=?, updated_at=NOW() WHERE issue_key=?`,
          [`Meeting: ${m.title}`, issueDescription(m, attendees, guests), dateStr, dateStr, projectId, m.sprint_id || null, sprint?.name || null, dept,
            estimate, estimate, JSON.stringify(merged), issueLabels, m.issue_key]);
        return m.issue_key;
      }
    }

    const prefix = await resolvePrefix(pool, { projectId, department: dept });
    for (let tries = 0; tries < 4; tries++) {
      const key = await nextIssueKey(pool, prefix);
      try {
        await pool.query(
          `INSERT INTO it_kanban_issues (issue_key, title, type, priority, status, assignee, reporter, team, project_id, description, department,
             due_date, start_date, sprint, sprint_id, labels, subtasks, linked_issues, comments, progress,
             original_estimate, remaining_estimate, time_spent, components, environment, vulnerability)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?,'0h','','','')`,
          [key, `Meeting: ${m.title}`, 'Meeting', 'High', 'TO DO', hostName, hostName, 'None', projectId, issueDescription(m, attendees, guests), dept,
            dateStr, dateStr, sprint?.name || null, m.sprint_id || null, labels, JSON.stringify(wanted), '[]', '[]', estimate, estimate]
        );
        return key;
      } catch (e) { if (e.code !== 'ER_DUP_ENTRY' || tries === 3) throw e; }
    }
    return null;
  };

  const removeIssue = async (key) => {
    if (!key) return;
    await q('DELETE FROM it_kanban_issues WHERE issue_key = ?', [key]).catch(() => { });
    await q('DELETE FROM it_kanban_history WHERE issue_key = ?', [key]).catch(() => { });
    await q('DELETE FROM it_kanban_worklogs WHERE issue_key = ?', [key]).catch(() => { });
  };

  // ── keep every linked record in step with the meeting row ──────────────────
  /** Idempotent: creates whatever is missing, updates the rest. Returns { meetLink, warning }. */
  const syncAll = async (meetingId, { manualMeetLink } = {}) => {
    let m = await getMeeting(meetingId);
    const attendees = await attendeesOf(m.id);
    const guests = parseJson(m.guest_emails, []);
    const host = (await usersByIds([m.host_id]))[0] || { name: m.host_name };
    const emails = attendees.map((a) => a.email).filter(Boolean);
    let warning = null;

    // Google Calendar + Meet link (Google when a Google identity is available, Jitsi otherwise)
    let meetLink = manualMeetLink !== undefined ? (manualMeetLink || null) : m.meet_link;
    let provider = manualMeetLink ? 'manual' : m.meet_provider;
    let googleEventId = m.google_event_id;
    let googleOwner = m.google_owner;
    const wantMeet = m.kind === 'online' && !meetLink;
    const fallbackLink = wantMeet ? jitsiLink(m.title) : (m.kind === 'online' && provider === 'jitsi' ? meetLink : null);
    if (m.kind === 'call') {
      if (googleEventId) { await deleteGoogle(googleEventId, googleOwner); googleEventId = null; googleOwner = null; }
    } else {
      let owner = await pickOwner(m.host_id);
      let g = null; let dropNote = null;
      for (let i = 0; owner && i < 3; i++) {
        const hostEmail = String(host.email || '').trim().toLowerCase();
        const names = new Map(attendees.filter((x) => x.email && x.name).map((x) => [String(x.email).trim().toLowerCase(), x.name]));
        g = await syncGoogle({ ...m, meet_link: meetLink }, [...emails, hostEmail].filter(Boolean), { wantMeet, owner, fallbackLink, host: { name: host.name || m.host_name, email: hostEmail, names } });
        if (!g.retry) break;
        dropNote = g.warning; g = null; owner = await pickOwner(m.host_id);
      }
      if (g) {
        if (g.owner) { googleEventId = g.eventId; googleOwner = g.owner; }
        if (wantMeet && g.meetLink) { meetLink = g.meetLink; provider = 'google'; await makeHostCohost(g.owner, g.meetLink, String(host.email || '').trim().toLowerCase()); }
        warning = g.warning || dropNote;
        if (wantMeet && !g.meetLink) warning = `${g.warning || 'Google did not return a Meet link.'} A Jitsi Meet link was used instead.`;
      } else if (wantMeet) {
        warning = dropNote
          ? `${dropNote} A Jitsi Meet link was used instead.`
          : 'Google is not connected, so a Jitsi Meet link was created. Use "Connect Google" on the Meetings page to get real Google Meet links and calendar invites.';
      }
    }
    if (wantMeet && !meetLink) { meetLink = fallbackLink; provider = 'jitsi'; }
    if (m.kind !== 'online') { if (m.kind === 'offline') meetLink = null; provider = m.kind === 'offline' ? null : provider; }
    await q('UPDATE meetings SET meet_link=?, meet_provider=?, google_event_id=?, google_owner=? WHERE id=?', [meetLink, provider || null, googleEventId, googleOwner, m.id]);
    m = { ...m, meet_link: meetLink, meet_provider: provider, google_event_id: googleEventId, google_owner: googleOwner };

    const calId = await upsertCalendarEvent(m, attendees.map((a) => Number(a.user_id)), guests);
    const taskId = await ensureTodo(m, [...new Set([Number(m.host_id), ...attendees.map((a) => Number(a.user_id))])]);
    if (taskId !== m.task_id) await q('UPDATE general_tasks SET meeting_id=? WHERE id=?', [m.id, taskId]);
    let issueKey = m.issue_key;
    try { issueKey = await ensureIssue(m, attendees, guests, host.name || m.host_name || 'Unassigned'); }
    catch (e) { console.error('[meetings] work item sync failed:', e.message); warning = warning || `The meeting was saved but its task could not be created (${e.message}).`; }
    await q('UPDATE meetings SET cal_event_id=?, task_id=?, issue_key=? WHERE id=?', [calId, taskId, issueKey, m.id]);
    return { meetLink, warning, issueKey };
  };

  const closeWorkItems = async (m, attendees, attendedIds, momPayload) => {
    if (m.task_id) {
      const note = `MOM submitted.\n\nDiscussion:\n${momPayload.mom}${momPayload.decisions ? `\n\nDecisions:\n${momPayload.decisions}` : ''}`;
      await q("UPDATE general_tasks SET status='Completed', internal_notes=?, updated_at=NOW() WHERE id=?", [note, m.task_id]);
    }
    if (m.sprint_task_id) await q("UPDATE general_tasks SET status='Completed', updated_at=NOW() WHERE id=?", [m.sprint_task_id]).catch(() => { });
    if (m.cal_event_id) await q("UPDATE calendar_events SET status='Completed', updated_at=NOW() WHERE id=?", [m.cal_event_id]).catch(() => { });
    if (m.issue_key) {
      const [row] = await q('SELECT subtasks FROM it_kanban_issues WHERE issue_key = ?', [m.issue_key]);
      if (row) {
        const dateStr = ymd(new Date(m.scheduled_at));
        const subs = (Array.isArray(parseJson(row.subtasks, [])) ? parseJson(row.subtasks, []) : []).map((s) => {
          const uid = Number(String(s.id).split('-')[2]);
          const present = attendedIds.has(uid);
          const a = attendees.find((x) => Number(x.user_id) === uid);
          return a ? attendSubtask(m, a, dateStr, true, !present) : { ...s, completed: true, status: 'DONE' };
        });
        const guests = parseJson(m.guest_emails, []);
        await q("UPDATE it_kanban_issues SET status='DONE', progress=100, subtasks=?, description=?, updated_at=NOW() WHERE issue_key=?",
          [JSON.stringify(subs), issueDescription(m, attendees, guests, momPayload), m.issue_key]);
      }
    }
  };

  const shape = (m) => ({ ...m, guest_emails: parseJson(m.guest_emails, []), action_keys: parseJson(m.action_keys, []) });
  const canManage = (req, m) => Number(m.host_id) === Number(req.user.id) || isMgr(req);

  // ── lookups for the form ───────────────────────────────────────────────────
  app.get('/api/meetings/projects', route(async (req, res, user) => {
    const open = "(p.status IS NULL OR p.status NOT IN ('Completed','Cancelled','Archived'))";
    const rows = isMgr(req)
      ? await q(`SELECT p.id, p.name, p.status FROM projects p WHERE ${open} ORDER BY p.name LIMIT 300`)
      : await q(`SELECT DISTINCT p.id, p.name, p.status FROM projects p JOIN project_team pt ON pt.project_id = p.id AND pt.user_id = ? WHERE ${open} ORDER BY p.name LIMIT 300`, [user.id]);
    res.json({ projects: rows });
  }));

  app.get('/api/meetings/sprints/:projectId', route(async (req, res) => {
    const rows = await q("SELECT id, name, status, start_date, end_date, department FROM sprints WHERE project_id = ? AND status IN ('Planned','Active') ORDER BY start_date DESC LIMIT 50", [req.params.projectId]);
    res.json({ sprints: rows });
  }));

  app.get('/api/meetings/users', route(async (req, res) => {
    const rows = await q(`SELECT id, TRIM(CONCAT(COALESCE(first_name,''),' ',COALESCE(last_name,''))) AS name, email, department, job_title AS designation
                          FROM users WHERE status = 'Active' AND email IS NOT NULL AND email <> '' ORDER BY first_name, last_name`);
    res.json({ users: rows });
  }));

  app.get('/api/meetings/project-team/:projectId', route(async (req, res) => {
    const rows = await q(`SELECT u.id, TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) AS name, u.email, u.department, u.job_title AS designation, pt.role AS team_role
                          FROM project_team pt JOIN users u ON u.id = pt.user_id WHERE pt.project_id = ? AND u.status = 'Active' ORDER BY u.first_name`, [req.params.projectId]);
    res.json({ members: rows });
  }));

  // ── connect Google (OAuth) ─────────────────────────────────────────────────
  const stateSecret = () => process.env.JWT_SECRET || 'codigix-meetings-state';
  const signState = (payload) => {
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return `${body}.${crypto.createHmac('sha256', stateSecret()).update(body).digest('base64url')}`;
  };
  const readState = (state) => {
    const [body, sig] = String(state || '').split('.');
    if (!body || !sig) return null;
    const good = crypto.createHmac('sha256', stateSecret()).update(body).digest('base64url');
    if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null;
    try { const p = JSON.parse(Buffer.from(body, 'base64url').toString()); return p.exp > Date.now() ? p : null; } catch { return null; }
  };
  const returnOrigin = (candidate) => {
    const allowed = [process.env.CLIENT_URL, process.env.CORS_ORIGIN].filter(Boolean).map((x) => x.replace(/\/+$/, ''));
    if (candidate && (allowed.includes(candidate) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(candidate))) return candidate;
    return allowed[0] || 'http://localhost:3001';
  };

  app.get('/api/meetings/google/status', route(async (req, res, user) => {
    const [own] = await q('SELECT email, is_org FROM google_oauth WHERE user_id = ?', [user.id]);
    const [org] = await q('SELECT email FROM google_oauth WHERE is_org = 1 ORDER BY connected_at DESC LIMIT 1');
    const owner = await pickOwner(user.id);
    res.json({
      configured: oauthConfigured(), redirectUri: redirectUriFor(req),
      connected: !!own, shared: !!own?.is_org, email: own?.email || null, orgEmail: org?.email || null,
      delegation: owner === 'dwd', active: !!owner, canConnectOrg: isMgr(req)
    });
  }));

  app.get('/api/meetings/google/connect', route(async (req, res, user) => {
    if (!oauthConfigured()) throw new HttpError(400, 'Google sign-in is not set up on the server yet. An administrator must add GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET to the server .env (setup steps are on the Meetings page).');
    const org = req.query.org === '1';
    if (org && !isMgr(req)) throw new HttpError(403, 'Only a manager or admin can connect the organisation account.');
    const state = signState({ u: user.id, org, ret: returnOrigin(req.headers.origin), exp: Date.now() + 10 * 60 * 1000 });
    const url = makeOAuth(redirectUriFor(req)).generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: OAUTH_SCOPES, state, login_hint: user.email || undefined });
    res.json({ url });
  }));

  app.get('/api/meetings/google/callback', async (req, res) => {
    const st = readState(req.query.state);
    const ret = returnOrigin(st?.ret);
    const back = (qs) => res.redirect(`${ret}/meetings?${qs}`);
    const bad = (msg) => back(`google=error&msg=${encodeURIComponent(msg)}`);
    try {
      await schema;
      if (!st || !req.user || Number(st.u) !== Number(req.user.id)) return bad('The Google sign-in expired or did not match your login. Please try again.');
      if (req.query.error) return bad(`Google sign-in was cancelled (${str(req.query.error, 60)}).`);
      const { tokens } = await makeOAuth(redirectUriFor(req)).getToken(String(req.query.code || ''));
      if (!tokens.refresh_token) return bad('Google did not return offline access. Remove this app under your Google Account → Security → Third-party access, then connect again.');
      if (!String(tokens.scope || '').includes('/auth/calendar')) {
        return bad('Google was connected without the Calendar permission. Connect again and make sure the Google Calendar checkbox ("View and edit events on all your calendars") is ticked on the Google screen.');
      }
      let email = null;
      try { email = JSON.parse(Buffer.from(String(tokens.id_token).split('.')[1], 'base64url').toString()).email || null; } catch { /* email is only for display */ }
      await q(`INSERT INTO google_oauth (user_id, email, refresh_token, is_org) VALUES (?,?,?,?)
               ON DUPLICATE KEY UPDATE email = VALUES(email), refresh_token = VALUES(refresh_token), is_org = VALUES(is_org), connected_at = NOW()`,
        [req.user.id, email, seal(tokens.refresh_token), st.org ? 1 : 0]);
      return back('google=connected');
    } catch (e) {
      console.error('[meetings] Google callback failed:', shortErr(e));
      return bad(`Could not finish connecting Google (${shortErr(e)}).`);
    }
  });

  // A manager can make their own connection the one used for everyone's meetings (or take that back).
  app.post('/api/meetings/google/share', route(async (req, res, user) => {
    if (!isMgr(req)) throw new HttpError(403, 'Only a manager or admin can share the Google connection with everyone.');
    const share = req.body?.share !== false;
    const [r] = await pool.query('UPDATE google_oauth SET is_org = ? WHERE user_id = ?', [share ? 1 : 0, user.id]);
    if (!r.affectedRows) throw new HttpError(400, 'Connect Google first.');
    if (share) await q('UPDATE google_oauth SET is_org = 0 WHERE user_id <> ?', [user.id]);
    res.json({ ok: true, shared: share });
  }));

  app.post('/api/meetings/google/disconnect', route(async (req, res, user) => {
    const [row] = await q('SELECT refresh_token FROM google_oauth WHERE user_id = ?', [user.id]);
    if (row && oauthConfigured()) {
      try { await makeOAuth().revokeToken(unseal(row.refresh_token)); } catch { /* already revoked or unreachable: still disconnect locally */ }
    }
    await q('DELETE FROM google_oauth WHERE user_id = ?', [user.id]);
    res.json({ ok: true });
  }));

  // ── list ───────────────────────────────────────────────────────────────────
  app.get('/api/meetings', route(async (req, res, user) => {
    const scope = req.query.scope === 'all' && isMgr(req) ? 'all' : 'mine';
    const where = []; const params = [user.id];
    if (scope === 'mine') { where.push('(m.host_id = ? OR EXISTS (SELECT 1 FROM meeting_attendees a WHERE a.meeting_id = m.id AND a.user_id = ?))'); params.push(user.id, user.id); }
    const status = str(req.query.status, 30);
    if (status) { where.push('m.status = ?'); params.push(status); }
    const when = str(req.query.when, 20);
    if (when === 'upcoming') where.push("m.status = 'Scheduled' AND m.scheduled_at >= NOW()");
    if (when === 'today') where.push('DATE(m.scheduled_at) = CURDATE()');
    if (when === 'past') where.push('m.scheduled_at < NOW()');
    if (when === 'needs_mom') where.push("m.status = 'Scheduled' AND m.scheduled_at < NOW()");
    if (req.query.project_id) { where.push('m.project_id = ?'); params.push(Number(req.query.project_id)); }
    if (validDate(req.query.from)) { where.push('DATE(m.scheduled_at) >= ?'); params.push(req.query.from); }
    if (validDate(req.query.to)) { where.push('DATE(m.scheduled_at) <= ?'); params.push(req.query.to); }
    const rows = await q(`SELECT m.*, p.name AS project_name, s.name AS sprint_name,
        (SELECT COUNT(*) FROM meeting_attendees x WHERE x.meeting_id = m.id) AS attendee_count,
        (SELECT x.responded FROM meeting_attendees x WHERE x.meeting_id = m.id AND x.user_id = ?) AS my_rsvp
      FROM meetings m LEFT JOIN projects p ON p.id = m.project_id LEFT JOIN sprints s ON s.id = m.sprint_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY m.scheduled_at DESC LIMIT 300`, params);
    res.json({ meetings: rows.map(shape), me: user.id });
  }));

  const joinPayload = async (req, user, m) => (!canManage(req, m) && !(await isAttendee(m.id, user.id)))
    ? { allowed: false }
    : { allowed: true, id: m.id, title: m.title, kind: m.kind, status: m.status, scheduled_at: m.scheduled_at, meet_link: m.meet_link || null, provider: m.meet_provider || null, location: m.location || null };

  app.get('/api/meetings/by-issue/:key', route(async (req, res, user) => {
    const [m] = await q('SELECT * FROM meetings WHERE issue_key = ?', [req.params.key]);
    if (!m) return res.json({ found: false });
    res.json({ found: true, ...(await joinPayload(req, user, m)) });
  }));

  // ── join details (used by the task panel's Join / Share link buttons) ──────
  app.get('/api/meetings/:id/join', route(async (req, res, user) => {
    const m = await getMeeting(req.params.id);
    if (!canManage(req, m) && !(await isAttendee(m.id, user.id))) return res.json({ allowed: false });
    res.json({
      allowed: true, id: m.id, title: m.title, kind: m.kind, status: m.status, scheduled_at: m.scheduled_at,
      meet_link: m.meet_link || null, provider: m.meet_provider || null, location: m.location || null
    });
  }));

  // ── detail ─────────────────────────────────────────────────────────────────
  app.get('/api/meetings/:id', route(async (req, res, user) => {
    const m = await getMeeting(req.params.id);
    if (!canManage(req, m) && !(await isAttendee(m.id, user.id))) throw new HttpError(403, 'You can only open meetings you host or are invited to.');
    const [meta] = await q('SELECT p.name AS project_name, s.name AS sprint_name FROM (SELECT 1) d LEFT JOIN projects p ON p.id = ? LEFT JOIN sprints s ON s.id = ?', [m.project_id, m.sprint_id]);
    const rows = await q(`SELECT ma.*, TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) AS uname, u.email AS uemail
                          FROM meeting_attendees ma LEFT JOIN users u ON u.id = ma.user_id WHERE ma.meeting_id = ?`, [m.id]);
    const attendees = rows.map((a) => ({ ...a, name: a.name || a.uname || `User ${a.user_id}`, email: a.email || a.uemail }));
    const task = m.task_id ? (await q('SELECT id, title, status FROM general_tasks WHERE id = ?', [m.task_id]))[0] || null : null;
    const issue = m.issue_key ? (await q('SELECT issue_key, title, status, sprint_id, department FROM it_kanban_issues WHERE issue_key = ?', [m.issue_key]))[0] || null : null;
    const keys = parseJson(m.action_keys, []);
    const actionItems = keys.length
      ? await q(`SELECT issue_key, title, status, assignee, due_date FROM it_kanban_issues WHERE issue_key IN (${keys.map(() => '?').join(',')})`, keys)
      : [];
    const legacy = await q("SELECT id, title, status, due_date FROM general_tasks WHERE meeting_id = ? AND task_type = 'MeetingAction'", [m.id]);
    const log = await q('SELECT user_name, action, detail, created_at FROM meeting_log WHERE meeting_id = ? ORDER BY id DESC LIMIT 100', [m.id]);
    res.json({
      meeting: { ...shape(m), project_name: meta?.project_name || null, sprint_name: meta?.sprint_name || null },
      attendees, task, issue, actionItems: [...actionItems, ...legacy], log,
      canManage: canManage(req, m),
      myRsvp: attendees.find((a) => Number(a.user_id) === Number(user.id))?.responded || null
    });
  }));

  // ── schedule ───────────────────────────────────────────────────────────────
  app.post('/api/meetings', route(async (req, res, user) => {
    const b = req.body || {};
    const title = str(b.title);
    if (!title) throw new HttpError(400, 'Title is required.');
    if (!validDate(b.scheduled_at)) throw new HttpError(400, 'Date and time are required.');
    const kind = ['online', 'offline', 'call'].includes(b.kind) ? b.kind : 'offline';
    const duration = Math.min(720, Math.max(5, parseInt(b.duration_min, 10) || 60));
    let projectId = parseInt(b.project_id, 10) || null;
    const sprintId = parseInt(b.sprint_id, 10) || null;
    const sprint = await sprintInfo(sprintId);
    if (sprintId && !sprint) throw new HttpError(400, 'That sprint no longer exists.');
    if (sprint && !projectId) projectId = sprint.project_id || null;

    const attIds = [...new Set((Array.isArray(b.attendees) ? b.attendees : []).map((a) => Number(typeof a === 'object' ? a.id : a)).filter((id) => id && id !== Number(user.id)))];
    const attendees = await usersByIds(attIds);
    const guests = cleanEmails(b.guestEmails);
    const dept = normDept(sprint?.department || b.department || user.department) || null;
    const manualLink = kind === 'online' ? str(b.meet_link, 500) : '';

    const [ins] = await pool.query(
      `INSERT INTO meetings (title, kind, scheduled_at, duration_min, location, meet_link, agenda, department, project_id, sprint_id, host_id, host_name, guest_emails)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [title, kind, toSql(b.scheduled_at), duration, kind === 'online' ? null : (str(b.location, 500) || null), manualLink || null, str(b.agenda, 5000) || null, dept, projectId, sprintId, user.id, user.name || null, guests.length ? JSON.stringify(guests) : null]
    );
    const meetingId = ins.insertId;
    const everyone = [{ id: user.id, name: user.name, email: user.email, responded: 'accepted' }, ...attendees.map((a) => ({ ...a, responded: 'pending' }))];
    await pool.query(`INSERT IGNORE INTO meeting_attendees (meeting_id, user_id, name, email, responded) VALUES ${everyone.map(() => '(?,?,?,?,?)').join(',')}`,
      everyone.flatMap((a) => [meetingId, a.id, a.name || null, a.email || null, a.responded]));

    const result = await syncAll(meetingId, { manualMeetLink: manualLink || undefined });
    await logAction(meetingId, user, 'scheduled', `${fmtWhen(b.scheduled_at)}${guests.length ? `, ${guests.length} guest(s)` : ''}`);
    await notify(attendees.map((a) => a.id), { title: `Meeting invite: ${title}`, message: `${user.name} scheduled "${title}" for ${fmtWhen(b.scheduled_at)}.`, meetingId, actor: user.name });
    res.json({ id: meetingId, meetLink: result.meetLink, issueKey: result.issueKey, warning: result.warning || null });
  }));

  // ── edit ───────────────────────────────────────────────────────────────────
  app.put('/api/meetings/:id', route(async (req, res, user) => {
    const m = await getMeeting(req.params.id);
    if (!canManage(req, m)) throw new HttpError(403, 'Only the host can edit this meeting.');
    if (m.status !== 'Scheduled') throw new HttpError(400, `A ${m.status.toLowerCase()} meeting cannot be edited.`);
    const b = req.body || {};

    const title = str(b.title) || m.title;
    const kind = ['online', 'offline', 'call'].includes(b.kind) ? b.kind : m.kind;
    const when = validDate(b.scheduled_at) ? toSql(b.scheduled_at) : null;
    const duration = b.duration_min ? Math.min(720, Math.max(5, parseInt(b.duration_min, 10) || m.duration_min)) : m.duration_min;
    let projectId = b.project_id !== undefined ? (parseInt(b.project_id, 10) || null) : m.project_id;
    const sprintId = b.sprint_id !== undefined ? (parseInt(b.sprint_id, 10) || null) : m.sprint_id;
    const sprint = await sprintInfo(sprintId);
    if (sprintId && !sprint) throw new HttpError(400, 'That sprint no longer exists.');
    if (sprint && !projectId) projectId = sprint.project_id || null;
    const guests = Array.isArray(b.guestEmails) ? cleanEmails(b.guestEmails) : parseJson(m.guest_emails, []);
    const manualLink = kind === 'online' && b.meet_link !== undefined ? str(b.meet_link, 500) : undefined;
    const timeChanged = when && toSql(m.scheduled_at) !== when;

    await q(`UPDATE meetings SET title=?, kind=?, scheduled_at=?, duration_min=?, location=?, agenda=?, project_id=?, sprint_id=?, guest_emails=?,
             reschedule_count = reschedule_count + ?, updated_at=NOW() WHERE id=?`,
      [title, kind, when || toSql(m.scheduled_at), duration,
        kind === 'online' ? null : (b.location !== undefined ? (str(b.location, 500) || null) : m.location),
        b.agenda !== undefined ? (str(b.agenda, 5000) || null) : m.agenda, projectId, sprintId,
        guests.length ? JSON.stringify(guests) : null, timeChanged ? 1 : 0, m.id]);

    // Attendee changes
    let added = [], removed = [];
    if (Array.isArray(b.attendees)) {
      const wantIds = new Set(b.attendees.map((a) => Number(typeof a === 'object' ? a.id : a)).filter((id) => id && id !== Number(m.host_id)));
      const current = await attendeesOf(m.id);
      const currentIds = new Set(current.map((a) => Number(a.user_id)));
      removed = current.filter((a) => Number(a.user_id) !== Number(m.host_id) && !wantIds.has(Number(a.user_id)));
      const addIds = [...wantIds].filter((id) => !currentIds.has(id));
      added = await usersByIds(addIds);
      if (removed.length) await q(`DELETE FROM meeting_attendees WHERE meeting_id = ? AND user_id IN (${removed.map(() => '?').join(',')})`, [m.id, ...removed.map((a) => a.user_id)]);
      if (added.length) await pool.query(`INSERT IGNORE INTO meeting_attendees (meeting_id, user_id, name, email, responded) VALUES ${added.map(() => '(?,?,?,?,?)').join(',')}`, added.flatMap((a) => [m.id, a.id, a.name, a.email, 'pending']));
    }

    const result = await syncAll(m.id, { manualMeetLink: manualLink });
    if (timeChanged) await logAction(m.id, user, 'rescheduled', `${fmtWhen(m.scheduled_at)} → ${fmtWhen(when)} (edit)`);
    await logAction(m.id, user, 'edited', [added.length ? `added ${added.map((a) => a.name).join(', ')}` : '', removed.length ? `removed ${removed.map((a) => a.name).join(', ')}` : ''].filter(Boolean).join('; ') || 'details updated');
    if (added.length) await notify(added.map((a) => a.id), { title: `Meeting invite: ${title}`, message: `${user.name} added you to "${title}" on ${fmtWhen(when || m.scheduled_at)}.`, meetingId: m.id, actor: user.name });
    if (removed.length) await notify(removed.map((a) => a.user_id), { title: `Removed from meeting: ${title}`, message: `${user.name} removed you from "${title}".`, meetingId: m.id, actor: user.name });
    const others = (await attendeesOf(m.id)).map((a) => a.user_id).filter((id) => Number(id) !== Number(user.id) && !added.some((a) => Number(a.id) === Number(id)));
    if (timeChanged || b.title) await notify(others, { title: `Meeting updated: ${title}`, message: `${user.name} updated "${title}"${timeChanged ? ` — now ${fmtWhen(when)}` : ''}.`, meetingId: m.id, actor: user.name });
    res.json({ ok: true, meetLink: result.meetLink, warning: result.warning || null });
  }));

  // ── reschedule ─────────────────────────────────────────────────────────────
  app.post('/api/meetings/:id/reschedule', route(async (req, res, user) => {
    const m = await getMeeting(req.params.id);
    if (!canManage(req, m)) throw new HttpError(403, 'Only the host can reschedule this meeting.');
    if (m.status !== 'Scheduled') throw new HttpError(400, `A ${m.status.toLowerCase()} meeting cannot be rescheduled.`);
    const b = req.body || {};
    if (!validDate(b.scheduled_at)) throw new HttpError(400, 'Choose the new date and time.');
    const duration = b.duration_min ? Math.min(720, Math.max(5, parseInt(b.duration_min, 10) || m.duration_min)) : m.duration_min;
    const reason = str(b.reason, 400);
    if (!reason) throw new HttpError(400, 'Please give a short reason for rescheduling.');
    const when = toSql(b.scheduled_at);
    await q('UPDATE meetings SET scheduled_at=?, duration_min=?, reschedule_count = reschedule_count + 1, updated_at=NOW() WHERE id=?', [when, duration, m.id]);
    // everyone must confirm again for the new time
    await q("UPDATE meeting_attendees SET responded='pending' WHERE meeting_id=? AND user_id<>?", [m.id, m.host_id]);
    const result = await syncAll(m.id);
    await logAction(m.id, user, 'rescheduled', `${fmtWhen(m.scheduled_at)} → ${fmtWhen(when)}. Reason: ${reason}`);
    const others = (await attendeesOf(m.id)).map((a) => a.user_id).filter((id) => Number(id) !== Number(user.id));
    await notify(others, { title: `Meeting rescheduled: ${m.title}`, message: `${user.name} moved "${m.title}" to ${fmtWhen(when)}. Reason: ${reason}`, meetingId: m.id, actor: user.name });
    res.json({ ok: true, warning: result.warning || null });
  }));

  // ── RSVP ───────────────────────────────────────────────────────────────────
  app.post('/api/meetings/:id/respond', route(async (req, res, user) => {
    const m = await getMeeting(req.params.id);
    const response = ['accepted', 'declined', 'tentative'].includes(req.body?.response) ? req.body.response : null;
    if (!response) throw new HttpError(400, 'Response must be accepted, declined or tentative.');
    if (m.status !== 'Scheduled') throw new HttpError(400, 'This meeting is no longer open for responses.');
    const [r] = await pool.query('UPDATE meeting_attendees SET responded=? WHERE meeting_id=? AND user_id=?', [response, m.id, user.id]);
    if (!r.affectedRows) throw new HttpError(403, 'You are not on the attendee list.');
    await logAction(m.id, user, `rsvp_${response}`, null);
    if (Number(m.host_id) !== Number(user.id)) await notify([m.host_id], { title: `${user.name} ${response} your meeting`, message: `${user.name} ${response} "${m.title}".`, meetingId: m.id, actor: user.name });
    res.json({ ok: true, response });
  }));

  // ── (re)generate Meet link ─────────────────────────────────────────────────
  app.post('/api/meetings/:id/meet-link', route(async (req, res, user) => {
    const m = await getMeeting(req.params.id);
    if (!canManage(req, m)) throw new HttpError(403, 'Only the host can change the meeting link.');
    if (m.status !== 'Scheduled') throw new HttpError(400, 'Only scheduled meetings can have a link.');
    const manual = str(req.body?.meet_link, 500);
    if (manual && !/^https?:\/\/\S+$/i.test(manual)) throw new HttpError(400, 'Enter a valid link starting with http:// or https://');
    if (m.kind !== 'online') await q("UPDATE meetings SET kind='online', location=NULL WHERE id=?", [m.id]);
    if (manual) await q('UPDATE meetings SET meet_link=? WHERE id=?', [manual, m.id]);
    else await q('UPDATE meetings SET meet_link=NULL WHERE id=?', [m.id]);
    const result = await syncAll(m.id, manual ? { manualMeetLink: manual } : undefined);
    await logAction(m.id, user, 'meet_link', manual ? 'link set manually' : (result.meetLink ? 'Google Meet link generated' : 'generation failed'));
    res.json({ ok: !!result.meetLink, meetLink: result.meetLink, warning: result.warning || null });
  }));

  // ── MOM ────────────────────────────────────────────────────────────────────
  app.post('/api/meetings/:id/mom', route(async (req, res, user) => {
    const m = await getMeeting(req.params.id);
    if (!canManage(req, m)) throw new HttpError(403, 'Only the meeting host can submit MOM.');
    if (m.status === 'Cancelled') throw new HttpError(400, 'A cancelled meeting cannot have MOM.');
    if (new Date(m.scheduled_at) > new Date()) throw new HttpError(400, 'This meeting has not started yet. Reschedule it, or add MOM after it begins.');
    const mom = str(req.body?.mom, 10000);
    if (!mom) throw new HttpError(400, 'MOM (discussion summary) is required.');
    const decisions = str(req.body?.decisions, 5000);
    const wasCompleted = m.status === 'Completed';

    await q("UPDATE meetings SET mom=?, mom_decisions=?, status='Completed', mom_submitted_at=COALESCE(mom_submitted_at, NOW()), updated_at=NOW() WHERE id=?", [mom, decisions || null, m.id]);
    const fresh = await getMeeting(m.id);
    const attendees = await attendeesOf(m.id);

    const attendedIds = new Set((Array.isArray(req.body?.attended) ? req.body.attended : attendees.map((a) => a.user_id)).map(Number));
    attendedIds.add(Number(m.host_id));
    await q('UPDATE meeting_attendees SET attended = (user_id IN (' + [...attendedIds].map(() => '?').join(',') + ')) WHERE meeting_id = ?', [...attendedIds, m.id]);

    // action items → real tasks in task management
    const items = (Array.isArray(req.body?.actionItems) ? req.body.actionItems : []).filter((a) => str(a?.title));
    const newKeys = [];
    if (items.length) {
      const assignees = await usersByIds(items.map((a) => a.assignedTo).filter(Boolean));
      const dept = normDept(m.department) || 'IT';
      const sprint = await sprintInfo(m.sprint_id);
      const prefix = await resolvePrefix(pool, { projectId: m.project_id, department: dept });
      for (const a of items) {
        const who = assignees.find((u) => Number(u.id) === Number(a.assignedTo));
        const assigneeName = who?.name || fresh.host_name || 'Unassigned';
        const due = validDate(a.dueDate) ? ymd(new Date(a.dueDate)) : null;
        for (let tries = 0; tries < 4; tries++) {
          const key = await nextIssueKey(pool, prefix);
          try {
            await pool.query(
              `INSERT INTO it_kanban_issues (issue_key, title, type, priority, status, assignee, reporter, team, project_id, description, department, due_date, labels, subtasks, linked_issues, comments, progress, original_estimate, remaining_estimate, time_spent, components, environment, vulnerability)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,'0h','0h','0h','','','')`,
              [key, str(a.title, 250), 'Task', 'Medium', 'TO DO', assigneeName, fresh.host_name || assigneeName, 'None', m.project_id || sprint?.project_id || null,
                `<p>Action item from meeting <strong>${esc(m.title)}</strong> (${esc(fmtWhen(m.scheduled_at))}).</p>`, dept, due,
                JSON.stringify(['Meeting']), '[]', '[]', '[]']
            );
            newKeys.push(key);
            if (who && Number(who.id) !== Number(user.id)) await notify([who.id], { title: `Action item: ${str(a.title, 120)}`, message: `${user.name} assigned you "${str(a.title, 120)}" from meeting "${m.title}" (${key}).`, meetingId: m.id, actor: user.name });
            break;
          } catch (e) { if (e.code !== 'ER_DUP_ENTRY' || tries === 3) throw e; }
        }
      }
      const allKeys = [...parseJson(m.action_keys, []), ...newKeys];
      await q('UPDATE meetings SET action_keys=? WHERE id=?', [JSON.stringify(allKeys), m.id]);
    }

    await closeWorkItems(fresh, attendees, attendedIds, { mom, decisions });
    await logAction(m.id, user, wasCompleted ? 'mom_updated' : 'mom_submitted', newKeys.length ? `${newKeys.length} action item(s): ${newKeys.join(', ')}` : null);
    if (!wasCompleted) await notify(attendees.map((a) => a.user_id).filter((id) => Number(id) !== Number(user.id)), { title: `MOM shared: ${m.title}`, message: `${user.name} submitted the minutes for "${m.title}".`, meetingId: m.id, actor: user.name });
    res.json({ ok: true, actionKeys: newKeys });
  }));

  // ── cancel ─────────────────────────────────────────────────────────────────
  const teardown = async (m) => {
    await deleteGoogle(m.google_event_id, m.google_owner);
    if (m.cal_event_id) await q("UPDATE calendar_events SET status='Cancelled', updated_at=NOW() WHERE id=?", [m.cal_event_id]).catch(() => { });
    if (m.task_id) await q("UPDATE general_tasks SET status='Cancelled', updated_at=NOW() WHERE id=?", [m.task_id]).catch(() => { });
    if (m.sprint_task_id) await q("UPDATE general_tasks SET status='Cancelled', updated_at=NOW() WHERE id=?", [m.sprint_task_id]).catch(() => { });
    await removeIssue(m.issue_key);
  };

  app.post('/api/meetings/:id/cancel', route(async (req, res, user) => {
    const m = await getMeeting(req.params.id);
    if (!canManage(req, m)) throw new HttpError(403, 'Only the host can cancel this meeting.');
    if (m.status === 'Completed') throw new HttpError(400, 'This meeting is already completed.');
    if (m.status === 'Cancelled') throw new HttpError(400, 'This meeting is already cancelled.');
    const reason = str(req.body?.reason, 400);
    if (!reason) throw new HttpError(400, 'Please give a short reason for cancelling.');
    await teardown(m);
    await q("UPDATE meetings SET status='Cancelled', cancel_reason=?, issue_key=NULL, google_event_id=NULL, updated_at=NOW() WHERE id=?", [reason, m.id]);
    await logAction(m.id, user, 'cancelled', reason);
    const others = (await attendeesOf(m.id)).map((a) => a.user_id).filter((id) => Number(id) !== Number(user.id));
    await notify(others, { title: `Meeting cancelled: ${m.title}`, message: `${user.name} cancelled "${m.title}". Reason: ${reason}`, meetingId: m.id, actor: user.name });
    res.json({ ok: true });
  }));

  // ── delete ─────────────────────────────────────────────────────────────────
  app.delete('/api/meetings/:id', route(async (req, res, user) => {
    const m = await getMeeting(req.params.id);
    if (!canManage(req, m)) throw new HttpError(403, 'Only the host can delete this meeting.');
    if (m.status === 'Completed' && !isMgr(req)) throw new HttpError(403, 'Only a manager can delete a meeting that has MOM.');
    const attendees = await attendeesOf(m.id);
    if (m.status === 'Scheduled') {
      await notify(attendees.map((a) => a.user_id).filter((id) => Number(id) !== Number(user.id)), { title: `Meeting cancelled: ${m.title}`, message: `${user.name} removed "${m.title}".`, meetingId: m.id, actor: user.name });
    }
    await deleteGoogle(m.google_event_id, m.google_owner);
    if (m.cal_event_id) await q('DELETE FROM calendar_events WHERE id=?', [m.cal_event_id]).catch(() => { });
    await q("DELETE FROM general_tasks WHERE meeting_id = ? AND task_type = 'Meeting'", [m.id]).catch(() => { });
    await removeIssue(m.issue_key);
    await q('DELETE FROM meeting_attendees WHERE meeting_id = ?', [m.id]);
    await q('DELETE FROM meeting_log WHERE meeting_id = ?', [m.id]);
    await q('DELETE FROM meetings WHERE id = ?', [m.id]);
    res.json({ ok: true });
  }));
};

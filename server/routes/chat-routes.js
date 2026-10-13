/**
 * Internal chat: direct messages, private groups and team channels.
 *
 * Identity always comes from the login session (req.user), never from the browser, and every
 * read or write checks that the person is a member of the conversation.
 *
 * Live updates use Server-Sent Events (GET /api/chat/stream): new messages, edits, reactions,
 * read receipts, typing and presence are pushed to the people concerned, so nothing polls.
 *
 * Tables
 *   chat_rooms     one row per conversation: dm (two people), group (private), channel (team-wide)
 *   chat_members   who is in it, their role, last message read, muted / starred
 *   chat_messages  text, attachments, reply, mentions, reactions, edits, deletes, pins
 * The old chat (conversations / messages) is copied in once, on first start.
 */

const push = require('../services/push');

const MAX_BODY = 8000;
const slugify = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
// Notification text: plain words, no formatting marks, 140 characters at most.
const plainText = (t) => String(t || '').replace(/```[\s\S]*?```/g, '[code]').replace(/\*\*([^*]+)\*\*/g, '$1')
  .replace(/`([^`]+)`/g, '$1').replace(/\s+/g, ' ').trim();
const previewOf = (body, attachments) => {
  const text = plainText(body);
  if (text) return text.length > 140 ? `${text.slice(0, 140)}…` : text;
  const att = attachments || [];
  if (att.length === 1) return att[0].isImage ? '📷 Photo' : `📎 ${att[0].name}`;
  if (att.length > 1) return `📎 ${att.length} files`;
  return 'New message';
};
const PAGE = 50;

const parseJson = (v, fallback) => {
  if (v == null) return fallback;
  if (typeof v !== 'string') return v;
  try { return JSON.parse(v); } catch (e) { return fallback; }
};
const cleanAttachments = (list) => (Array.isArray(list) ? list : [])
  .filter(a => a && /^(\/api\/uploads\/|\/uploads\/|https?:\/\/)/i.test(String(a.url || '')))
  .map(a => ({ name: String(a.name || 'file').slice(0, 200), url: String(a.url).slice(0, 500), size: Number(a.size) || null, mime: String(a.mime || '').slice(0, 100), isImage: Boolean(a.isImage) }))
  .slice(0, 10);

module.exports = function setupChatRoutes(app, pool) {
  const q = async (sql, params = []) => (await pool.query(sql, params))[0];

  // ── Live connections ─────────────────────────────────────────────────
  const streams = new Map(); // userId -> Set(res)
  const lastActive = new Map(); // userId -> Date
  const isOnline = (uid) => (streams.get(Number(uid))?.size || 0) > 0;
  const send = (userIds, event, data) => {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    new Set(userIds.map(Number)).forEach(uid => {
      (streams.get(uid) || []).forEach(res => { try { res.write(payload); } catch (e) { /* closed */ } });
    });
  };
  const everyoneOnline = () => [...streams.keys()];
  const memberIds = async (roomId) => (await q('SELECT user_id FROM chat_members WHERE room_id = ?', [roomId])).map(r => Number(r.user_id));

  // ── Tables + one-time copy of the old chat ───────────────────────────
  const ready = (async () => {
    await pool.query(`CREATE TABLE IF NOT EXISTS chat_rooms (
      id INT AUTO_INCREMENT PRIMARY KEY,
      kind VARCHAR(10) NOT NULL DEFAULT 'group',
      name VARCHAR(120) NULL,
      description VARCHAR(500) NULL,
      project_id INT NULL,
      dm_key VARCHAR(40) NULL,
      created_by INT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_message_at DATETIME NULL,
      archived TINYINT(1) NOT NULL DEFAULT 0,
      UNIQUE KEY uniq_dm (dm_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await pool.query(`CREATE TABLE IF NOT EXISTS chat_members (
      room_id INT NOT NULL,
      user_id INT NOT NULL,
      role VARCHAR(10) NOT NULL DEFAULT 'member',
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_read_id INT NOT NULL DEFAULT 0,
      muted TINYINT(1) NOT NULL DEFAULT 0,
      starred TINYINT(1) NOT NULL DEFAULT 0,
      PRIMARY KEY (room_id, user_id),
      KEY idx_chat_member_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await pool.query(`CREATE TABLE IF NOT EXISTS chat_messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      room_id INT NOT NULL,
      sender_id INT NULL,
      kind VARCHAR(10) NOT NULL DEFAULT 'text',
      body TEXT NULL,
      attachments JSON NULL,
      reply_to_id INT NULL,
      mentions JSON NULL,
      reactions JSON NULL,
      edited_at DATETIME NULL,
      deleted_at DATETIME NULL,
      pinned_at DATETIME NULL,
      pinned_by INT NULL,
      legacy_id INT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      KEY idx_chat_room_msg (room_id, id),
      UNIQUE KEY uniq_chat_legacy (legacy_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    // A team-wide #general channel to start from.
    const [general] = await q("SELECT id FROM chat_rooms WHERE kind = 'channel' AND name = 'general' LIMIT 1");
    if (!general) {
      await pool.query("INSERT INTO chat_rooms (kind, name, description) VALUES ('channel', 'general', 'Announcements and conversation for the whole team')");
    }

    // Copy the old one-to-one chat across once (legacy_id keeps it from happening twice).
    try {
      const old = await q(`SELECT m.id, m.sender_id, m.receiver_id, m.message_text, m.file_name, m.file_size, m.file_type, m.file_path,
          m.is_deleted, m.is_edited, m.created_at FROM messages m
        LEFT JOIN chat_messages cm ON cm.legacy_id = m.id
        WHERE cm.id IS NULL AND m.receiver_id IS NOT NULL AND m.sender_id IS NOT NULL ORDER BY m.id`);
      for (const m of old) {
        const room = await dmRoom(Number(m.sender_id), Number(m.receiver_id));
        const att = m.file_path ? [{ name: m.file_name || 'file', url: m.file_path, size: Number(m.file_size) || null, mime: m.file_type || '', isImage: /^image\//.test(m.file_type || '') }] : [];
        await pool.query(`INSERT IGNORE INTO chat_messages (room_id, sender_id, body, attachments, created_at, edited_at, deleted_at, legacy_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [room, m.sender_id, m.is_deleted ? '' : (m.message_text || ''), JSON.stringify(att), m.created_at,
          m.is_edited ? m.created_at : null, m.is_deleted ? m.created_at : null, m.id]);
        await pool.query('UPDATE chat_rooms SET last_message_at = GREATEST(COALESCE(last_message_at, ?), ?) WHERE id = ?', [m.created_at, m.created_at, room]);
      }
      if (old.length) console.log(`Chat: copied ${old.length} message(s) from the old chat.`);
    } catch (e) {
      if (e.code !== 'ER_NO_SUCH_TABLE') console.error('Chat legacy copy:', e.message);
    }
  })().catch(e => console.error('chat tables:', e.message));

  // The one DM room between two people, created on first use.
  async function dmRoom(a, b) {
    const key = [a, b].sort((x, y) => x - y).join(':');
    const [found] = await q('SELECT id FROM chat_rooms WHERE dm_key = ?', [key]);
    if (found) return found.id;
    const [r] = await pool.query("INSERT IGNORE INTO chat_rooms (kind, dm_key) VALUES ('dm', ?)", [key]);
    const id = r.insertId || (await q('SELECT id FROM chat_rooms WHERE dm_key = ?', [key]))[0].id;
    await pool.query('INSERT IGNORE INTO chat_members (room_id, user_id, role) VALUES (?, ?, ?), (?, ?, ?)', [id, a, 'member', id, b, 'member']);
    return id;
  }

  const userName = (u) => `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || u.email || 'User';
  const people = async () => {
    const rows = await q("SELECT id, first_name, last_name, username, email, avatar, department, job_title FROM users WHERE COALESCE(status, 'Active') = 'Active' ORDER BY first_name, last_name");
    return rows.map(u => ({ id: u.id, name: userName(u), email: u.email, avatar: u.avatar || null, department: u.department || '', title: u.job_title || '', online: isOnline(u.id), lastActive: lastActive.get(Number(u.id)) || null }));
  };

  // Web Push to people's phones / desktops, each opening their own chat page.
  push.init(pool);
  const chatUrlFor = async (ids, roomId) => {
    const rows = await q(`SELECT u.id, u.username, u.first_name, u.department, r.name AS role FROM users u LEFT JOIN roles r ON r.id = u.role_id WHERE u.id IN (?)`, [ids.concat(0)]);
    const map = new Map();
    rows.forEach(u => {
      const d = String(u.department || '').toLowerCase();
      const seg = d.includes('marketing') ? 'marketing' : d.includes('sales') ? 'sales' : d.includes('hr') ? 'hr' : 'it';
      map.set(Number(u.id), `/${seg}/${slugify(u.role || 'employee')}/${slugify(u.username || u.first_name || 'me')}/chat?room=${roomId}`);
    });
    return map;
  };
  const pushTo = async (ids, roomId, payload) => {
    const list = [...new Set(ids.map(Number).filter(Boolean))];
    if (!list.length) return;
    const urls = await chatUrlFor(list, roomId);
    await Promise.all(list.map(id => push.sendToUsers([id], { ...payload, roomId, url: urls.get(id) || '/' })));
  };
  const senderIcon = async (uid) => {
    const [u] = await q('SELECT avatar FROM users WHERE id = ?', [uid]);
    return u?.avatar && /^https?:\/\//.test(u.avatar) ? u.avatar : (u?.avatar ? u.avatar : null);
  };

  const auth = (req, res) => {
    if (!req.user?.id) { res.status(401).json({ error: 'Please sign in again.' }); return null; }
    return Number(req.user.id);
  };
  const membership = async (roomId, uid) => (await q('SELECT m.*, r.kind, r.name, r.created_by FROM chat_members m JOIN chat_rooms r ON r.id = m.room_id WHERE m.room_id = ? AND m.user_id = ?', [roomId, uid]))[0] || null;
  const isRoomAdmin = (mem, req) => mem && (mem.role === 'owner' || mem.role === 'admin' || req.user?.isAdmin);

  const shapeMessage = (m, nameById) => ({
    id: m.id, roomId: m.room_id, senderId: m.sender_id, sender: nameById.get(Number(m.sender_id)) || (m.kind === 'system' ? '' : 'Former member'),
    kind: m.kind, body: m.deleted_at ? '' : (m.body || ''), attachments: m.deleted_at ? [] : parseJson(m.attachments, []),
    replyTo: m.reply_to_id ? { id: m.reply_to_id, sender: nameById.get(Number(m.reply_sender)) || '', body: m.reply_deleted ? 'Message deleted' : String(m.reply_body || '').slice(0, 200), hasAttachment: Boolean(m.reply_att && m.reply_att !== '[]') } : null,
    mentions: parseJson(m.mentions, []), reactions: parseJson(m.reactions, {}),
    editedAt: m.edited_at, deletedAt: m.deleted_at, pinnedAt: m.pinned_at, pinnedBy: m.pinned_by ? nameById.get(Number(m.pinned_by)) || '' : null, createdAt: m.created_at
  });
  const nameMap = async () => new Map((await q('SELECT id, first_name, last_name, username, email FROM users')).map(u => [Number(u.id), userName(u)]));
  const MSG_SELECT = `SELECT m.*, r.body AS reply_body, r.sender_id AS reply_sender, r.deleted_at AS reply_deleted, r.attachments AS reply_att
    FROM chat_messages m LEFT JOIN chat_messages r ON r.id = m.reply_to_id`;

  // Rooms list for a person, with the other person for DMs, last message and unread count.
  const roomsFor = async (uid) => {
    const rows = await q(`SELECT r.*, m.role, m.last_read_id, m.muted, m.starred,
        (SELECT COUNT(*) FROM chat_messages x WHERE x.room_id = r.id AND x.id > m.last_read_id AND COALESCE(x.sender_id, 0) <> ? AND x.deleted_at IS NULL) AS unread,
        (SELECT COUNT(*) FROM chat_members y WHERE y.room_id = r.id) AS member_count
      FROM chat_rooms r JOIN chat_members m ON m.room_id = r.id AND m.user_id = ? WHERE r.archived = 0`, [uid, uid]);
    if (!rows.length) return [];
    const ids = rows.map(r => r.id);
    const last = await q(`SELECT m.room_id, m.id, m.sender_id, m.body, m.attachments, m.deleted_at, m.kind, m.created_at FROM chat_messages m
      JOIN (SELECT room_id, MAX(id) AS mid FROM chat_messages WHERE room_id IN (?) GROUP BY room_id) t ON t.mid = m.id`, [ids]);
    const lastBy = new Map(last.map(l => [l.room_id, l]));
    const dmOthers = await q(`SELECT cm.room_id, u.id, u.first_name, u.last_name, u.username, u.email, u.avatar, u.department, u.job_title
      FROM chat_members cm JOIN users u ON u.id = cm.user_id WHERE cm.room_id IN (?) AND cm.user_id <> ?`, [rows.filter(r => r.kind === 'dm').map(r => r.id).concat(0), uid]);
    const otherBy = new Map(dmOthers.map(o => [o.room_id, o]));
    // For "Seen" on DMs: how far the other person has read.
    const otherRead = await q('SELECT room_id, last_read_id FROM chat_members WHERE room_id IN (?) AND user_id <> ?', [rows.filter(r => r.kind === 'dm').map(r => r.id).concat(0), uid]);
    const otherReadBy = new Map(otherRead.map(o => [o.room_id, o.last_read_id]));
    const names = await nameMap();
    return rows.map(r => {
      const l = lastBy.get(r.id);
      const other = otherBy.get(r.id);
      return {
        id: r.id, kind: r.kind, name: r.kind === 'dm' ? (other ? userName(other) : 'Former member') : r.name, description: r.description || '',
        projectId: r.project_id, role: r.role, muted: Boolean(r.muted), starred: Boolean(r.starred), unread: Number(r.unread) || 0,
        memberCount: Number(r.member_count) || 0, lastReadId: r.last_read_id, otherReadId: otherReadBy.get(r.id) || 0,
        other: other ? { id: other.id, name: userName(other), email: other.email, avatar: other.avatar, department: other.department || '', title: other.job_title || '', online: isOnline(other.id) } : null,
        last: l ? { id: l.id, sender: Number(l.sender_id) === uid ? 'You' : names.get(Number(l.sender_id)) || '', text: l.deleted_at ? 'Message deleted' : (l.body || (parseJson(l.attachments, []).length ? '📎 Attachment' : '')), at: l.created_at, kind: l.kind } : null,
        lastAt: r.last_message_at || r.created_at
      };
    }).sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt));
  };

  const systemMessage = async (roomId, text) => {
    const [r] = await pool.query("INSERT INTO chat_messages (room_id, kind, body) VALUES (?, 'system', ?)", [roomId, text]);
    await pool.query('UPDATE chat_rooms SET last_message_at = NOW() WHERE id = ?', [roomId]);
    const [m] = await q(`${MSG_SELECT} WHERE m.id = ?`, [r.insertId]);
    send(await memberIds(roomId), 'message', shapeMessage(m, await nameMap()));
  };

  // ── Live stream ──────────────────────────────────────────────────────
  app.get('/api/chat/stream', async (req, res) => {
    const uid = auth(req, res); if (!uid) return;
    await ready;
    // Long-lived stream: never time it out, send small writes at once, and tell proxies not to buffer or compress it.
    req.socket.setTimeout(0); req.socket.setNoDelay(true); req.socket.setKeepAlive(true);
    res.writeHead(200, {
      'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no', 'Content-Encoding': 'identity'
    });
    // A 2 KB comment pushes past proxies that hold back the first bytes; 'retry' sets how soon the browser reconnects.
    res.write(`retry: 3000\n: ${' '.repeat(2048)}\n\n`);
    res.write(`event: hello\ndata: ${JSON.stringify({ userId: uid })}\n\n`);
    const detachLive = require('../services/live').attach(res, uid);
    const wasOnline = isOnline(uid);
    if (!streams.has(uid)) streams.set(uid, new Set());
    streams.get(uid).add(res);
    lastActive.set(uid, new Date());
    if (!wasOnline) send(everyoneOnline(), 'presence', { userId: uid, online: true });
    const ping = setInterval(() => { try { res.write(': ping\n\n'); } catch (e) { /* closed */ } }, 25000);
    req.on('close', () => {
      clearInterval(ping);
      detachLive();
      streams.get(uid)?.delete(res);
      lastActive.set(uid, new Date());
      if (!isOnline(uid)) send(everyoneOnline(), 'presence', { userId: uid, online: false, lastActive: new Date() });
    });
  });

  // ── Start-up data: me, my conversations, the directory ──────────────
  app.get('/api/chat/bootstrap', async (req, res) => {
    try {
      const uid = auth(req, res); if (!uid) return;
      await ready;
      // Everyone is in #general.
      const [general] = await q("SELECT id FROM chat_rooms WHERE kind = 'channel' AND name = 'general' LIMIT 1");
      if (general) await pool.query('INSERT IGNORE INTO chat_members (room_id, user_id) VALUES (?, ?)', [general.id, uid]);
      res.json({ me: { id: uid, name: req.user.name, isAdmin: Boolean(req.user.isAdmin), isManager: Boolean(req.user.isManager) }, rooms: await roomsFor(uid), people: await people() });
    } catch (e) {
      console.error('chat bootstrap:', e.message);
      res.status(500).json({ error: 'Could not load chat' });
    }
  });

  app.get('/api/chat/rooms', async (req, res) => {
    try { const uid = auth(req, res); if (!uid) return; await ready; res.json({ rooms: await roomsFor(uid) }); } catch (e) { res.status(500).json({ error: 'Could not load conversations' }); }
  });

  // Public channels anyone can join.
  app.get('/api/chat/channels', async (req, res) => {
    try {
      const uid = auth(req, res); if (!uid) return;
      await ready;
      const rows = await q(`SELECT r.id, r.name, r.description, (SELECT COUNT(*) FROM chat_members m WHERE m.room_id = r.id) AS members,
          EXISTS(SELECT 1 FROM chat_members m WHERE m.room_id = r.id AND m.user_id = ?) AS joined
        FROM chat_rooms r WHERE r.kind = 'channel' AND r.archived = 0 ORDER BY r.name`, [uid]);
      res.json({ channels: rows.map(r => ({ ...r, joined: Boolean(r.joined), members: Number(r.members) })) });
    } catch (e) { res.status(500).json({ error: 'Could not load channels' }); }
  });

  // ── Open or create conversations ────────────────────────────────────
  app.post('/api/chat/dm', async (req, res) => {
    try {
      const uid = auth(req, res); if (!uid) return;
      await ready;
      const other = Number(req.body?.userId);
      if (!other || other === uid) return res.status(400).json({ error: 'Pick someone to message.' });
      const [u] = await q("SELECT id FROM users WHERE id = ? AND COALESCE(status, 'Active') = 'Active'", [other]);
      if (!u) return res.status(404).json({ error: 'That person is not available.' });
      const id = await dmRoom(uid, other);
      res.json({ roomId: id, rooms: await roomsFor(uid) });
    } catch (e) {
      console.error('chat dm:', e.message);
      res.status(500).json({ error: 'Could not open the conversation' });
    }
  });

  app.post('/api/chat/rooms', async (req, res) => {
    try {
      const uid = auth(req, res); if (!uid) return;
      await ready;
      const kind = req.body?.kind === 'channel' ? 'channel' : 'group';
      let name = String(req.body?.name || '').trim().slice(0, 80);
      if (kind === 'channel') name = name.toLowerCase().replace(/^#/, '').replace(/[^a-z0-9\-_ ]/g, '').trim().replace(/\s+/g, '-');
      if (!name) return res.status(400).json({ error: 'Give it a name.' });
      if (kind === 'channel') {
        const [dup] = await q("SELECT id FROM chat_rooms WHERE kind = 'channel' AND name = ?", [name]);
        if (dup) return res.status(409).json({ error: `#${name} already exists.` });
      }
      const ids = [...new Set((Array.isArray(req.body?.memberIds) ? req.body.memberIds : []).map(Number).filter(n => n && n !== uid))];
      if (kind === 'group' && ids.length === 0) return res.status(400).json({ error: 'Add at least one person.' });
      const [r] = await pool.query('INSERT INTO chat_rooms (kind, name, description, project_id, created_by, last_message_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [kind, name, String(req.body?.description || '').slice(0, 500) || null, Number(req.body?.projectId) || null, uid]);
      const values = [[r.insertId, uid, 'owner'], ...ids.map(id => [r.insertId, id, 'member'])];
      await pool.query('INSERT IGNORE INTO chat_members (room_id, user_id, role) VALUES ?', [values]);
      await systemMessage(r.insertId, `${req.user.name} created ${kind === 'channel' ? `#${name}` : `the group "${name}"`}`);
      send(ids, 'rooms', {});
      send(ids, 'added', { roomId: r.insertId, kind, name, by: req.user.name });
      pushTo(ids, r.insertId, { title: `${req.user.name} added you to ${kind === 'channel' ? `#${name}` : name}`, body: 'Open the conversation to catch up.', tag: `chat-added-${r.insertId}`, kind: 'added' }).catch(() => {});
      res.status(201).json({ roomId: r.insertId, rooms: await roomsFor(uid) });
    } catch (e) {
      console.error('chat create room:', e.message);
      res.status(500).json({ error: 'Could not create it' });
    }
  });

  app.put('/api/chat/rooms/:id', async (req, res) => {
    try {
      const uid = auth(req, res); if (!uid) return;
      const mem = await membership(req.params.id, uid);
      if (!mem || mem.kind === 'dm') return res.status(404).json({ error: 'Not found' });
      if (!isRoomAdmin(mem, req)) return res.status(403).json({ error: 'Only the owner or an admin of this conversation can change it.' });
      const sets = []; const vals = [];
      if (req.body.name !== undefined) {
        let name = String(req.body.name || '').trim().slice(0, 80);
        if (mem.kind === 'channel') name = name.toLowerCase().replace(/^#/, '').replace(/[^a-z0-9\-_ ]/g, '').trim().replace(/\s+/g, '-');
        if (!name) return res.status(400).json({ error: 'Give it a name.' });
        sets.push('name = ?'); vals.push(name);
      }
      if (req.body.description !== undefined) { sets.push('description = ?'); vals.push(String(req.body.description || '').slice(0, 500) || null); }
      if (!sets.length) return res.json({ ok: true });
      await pool.query(`UPDATE chat_rooms SET ${sets.join(', ')} WHERE id = ?`, [...vals, mem.room_id]);
      await systemMessage(mem.room_id, `${req.user.name} updated the ${req.body.name !== undefined ? 'name' : 'description'}`);
      send(await memberIds(mem.room_id), 'rooms', {});
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: 'Could not save' }); }
  });

  app.get('/api/chat/rooms/:id/members', async (req, res) => {
    try {
      const uid = auth(req, res); if (!uid) return;
      const mem = await membership(req.params.id, uid);
      if (!mem) return res.status(404).json({ error: 'Not found' });
      const rows = await q(`SELECT u.id, u.first_name, u.last_name, u.username, u.email, u.avatar, u.department, u.job_title, m.role
        FROM chat_members m JOIN users u ON u.id = m.user_id WHERE m.room_id = ? ORDER BY FIELD(m.role, 'owner', 'admin', 'member'), u.first_name`, [mem.room_id]);
      res.json({ members: rows.map(u => ({ id: u.id, name: userName(u), email: u.email, avatar: u.avatar, department: u.department || '', title: u.job_title || '', role: u.role, online: isOnline(u.id) })) });
    } catch (e) { res.status(500).json({ error: 'Could not load members' }); }
  });

  // Add people (admins; anyone may join a public channel themselves).
  app.post('/api/chat/rooms/:id/members', async (req, res) => {
    try {
      const uid = auth(req, res); if (!uid) return;
      await ready;
      const roomId = Number(req.params.id);
      const [room] = await q('SELECT * FROM chat_rooms WHERE id = ?', [roomId]);
      if (!room || room.kind === 'dm') return res.status(404).json({ error: 'Not found' });
      const mem = await membership(roomId, uid);
      const ids = [...new Set((Array.isArray(req.body?.userIds) ? req.body.userIds : [uid]).map(Number).filter(Boolean))];
      const selfJoin = ids.length === 1 && ids[0] === uid && room.kind === 'channel';
      if (!selfJoin && !isRoomAdmin(mem, req) && !(mem && room.kind === 'channel')) return res.status(403).json({ error: 'Only the owner or an admin can add people.' });
      const existing = new Set(await memberIds(roomId));
      const fresh = ids.filter(id => !existing.has(id));
      if (!fresh.length) return res.json({ ok: true, rooms: await roomsFor(uid) });
      await pool.query('INSERT IGNORE INTO chat_members (room_id, user_id) VALUES ?', [fresh.map(id => [roomId, id])]);
      const names = await nameMap();
      await systemMessage(roomId, selfJoin ? `${req.user.name} joined` : `${req.user.name} added ${fresh.map(id => names.get(id) || 'someone').join(', ')}`);
      send(fresh, 'rooms', {});
      if (!selfJoin) {
        send(fresh, 'added', { roomId, kind: room.kind, name: room.name, by: req.user.name });
        pushTo(fresh, roomId, { title: `${req.user.name} added you to ${room.kind === 'channel' ? `#${room.name}` : room.name}`, body: 'Open the conversation to catch up.', tag: `chat-added-${roomId}`, kind: 'added' }).catch(() => {});
      }
      res.json({ ok: true, rooms: await roomsFor(uid) });
    } catch (e) {
      console.error('chat add members:', e.message);
      res.status(500).json({ error: 'Could not add them' });
    }
  });

  // Remove someone (admins) or leave (yourself).
  app.delete('/api/chat/rooms/:id/members/:userId', async (req, res) => {
    try {
      const uid = auth(req, res); if (!uid) return;
      const roomId = Number(req.params.id); const target = Number(req.params.userId);
      const mem = await membership(roomId, uid);
      if (!mem || mem.kind === 'dm') return res.status(404).json({ error: 'Not found' });
      if (target !== uid && !isRoomAdmin(mem, req)) return res.status(403).json({ error: 'Only the owner or an admin can remove people.' });
      const [t] = await q('SELECT role FROM chat_members WHERE room_id = ? AND user_id = ?', [roomId, target]);
      if (!t) return res.json({ ok: true });
      if (t.role === 'owner' && target !== uid) return res.status(403).json({ error: 'The owner cannot be removed.' });
      const before = await memberIds(roomId);
      await pool.query('DELETE FROM chat_members WHERE room_id = ? AND user_id = ?', [roomId, target]);
      // If the owner leaves, the longest-standing member takes over.
      if (t.role === 'owner') {
        const [next] = await q('SELECT user_id FROM chat_members WHERE room_id = ? ORDER BY joined_at LIMIT 1', [roomId]);
        if (next) await pool.query("UPDATE chat_members SET role = 'owner' WHERE room_id = ? AND user_id = ?", [roomId, next.user_id]);
      }
      const names = await nameMap();
      await systemMessage(roomId, target === uid ? `${req.user.name} left` : `${req.user.name} removed ${names.get(target) || 'someone'}`);
      send(before, 'rooms', {});
      res.json({ ok: true, rooms: await roomsFor(uid) });
    } catch (e) { res.status(500).json({ error: 'Could not remove them' }); }
  });

  app.post('/api/chat/rooms/:id/role', async (req, res) => {
    try {
      const uid = auth(req, res); if (!uid) return;
      const mem = await membership(req.params.id, uid);
      if (!mem || !isRoomAdmin(mem, req)) return res.status(403).json({ error: 'Only the owner or an admin can do this.' });
      const role = req.body?.role === 'admin' ? 'admin' : 'member';
      await pool.query("UPDATE chat_members SET role = ? WHERE room_id = ? AND user_id = ? AND role <> 'owner'", [role, mem.room_id, Number(req.body?.userId)]);
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: 'Could not change the role' }); }
  });

  // Mute / star a conversation (per person).
  app.post('/api/chat/rooms/:id/prefs', async (req, res) => {
    try {
      const uid = auth(req, res); if (!uid) return;
      const mem = await membership(req.params.id, uid);
      if (!mem) return res.status(404).json({ error: 'Not found' });
      const sets = []; const vals = [];
      if (req.body.muted !== undefined) { sets.push('muted = ?'); vals.push(req.body.muted ? 1 : 0); }
      if (req.body.starred !== undefined) { sets.push('starred = ?'); vals.push(req.body.starred ? 1 : 0); }
      if (sets.length) await pool.query(`UPDATE chat_members SET ${sets.join(', ')} WHERE room_id = ? AND user_id = ?`, [...vals, mem.room_id, uid]);
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: 'Could not save' }); }
  });

  // ── Messages ─────────────────────────────────────────────────────────
  app.get('/api/chat/rooms/:id/messages', async (req, res) => {
    try {
      const uid = auth(req, res); if (!uid) return;
      await ready;
      const mem = await membership(req.params.id, uid);
      if (!mem) return res.status(404).json({ error: 'Not found' });
      const before = Number(req.query.before) || null;
      const around = Number(req.query.around) || null;
      let rows;
      if (around) {
        rows = await q(`${MSG_SELECT} WHERE m.room_id = ? AND m.id >= ? ORDER BY m.id ASC LIMIT ?`, [mem.room_id, around - 0, PAGE]);
        const older = await q(`${MSG_SELECT} WHERE m.room_id = ? AND m.id < ? ORDER BY m.id DESC LIMIT 20`, [mem.room_id, around]);
        rows = [...older.reverse(), ...rows];
      } else {
        rows = (await q(`${MSG_SELECT} WHERE m.room_id = ? ${before ? 'AND m.id < ?' : ''} ORDER BY m.id DESC LIMIT ?`, before ? [mem.room_id, before, PAGE] : [mem.room_id, PAGE])).reverse();
      }
      const names = await nameMap();
      const pinned = await q(`${MSG_SELECT} WHERE m.room_id = ? AND m.pinned_at IS NOT NULL AND m.deleted_at IS NULL ORDER BY m.pinned_at DESC LIMIT 20`, [mem.room_id]);
      res.json({ messages: rows.map(m => shapeMessage(m, names)), hasMore: rows.length >= (around ? 1 : PAGE) && !around, pinned: pinned.map(m => shapeMessage(m, names)) });
    } catch (e) {
      console.error('chat messages:', e.message);
      res.status(500).json({ error: 'Could not load messages' });
    }
  });

  app.post('/api/chat/rooms/:id/messages', async (req, res) => {
    try {
      const uid = auth(req, res); if (!uid) return;
      await ready;
      const mem = await membership(req.params.id, uid);
      if (!mem) return res.status(404).json({ error: 'Not found' });
      const body = String(req.body?.body || '').slice(0, MAX_BODY);
      const attachments = cleanAttachments(req.body?.attachments);
      if (!body.trim() && !attachments.length) return res.status(400).json({ error: 'Type a message or attach a file.' });
      let replyTo = Number(req.body?.replyToId) || null;
      if (replyTo) { const [rr] = await q('SELECT id FROM chat_messages WHERE id = ? AND room_id = ?', [replyTo, mem.room_id]); if (!rr) replyTo = null; }
      const members = await memberIds(mem.room_id);
      // Mentions arrive as user ids; keep only people in the conversation. @everyone / @here for channels and groups.
      let mentions = [...new Set((Array.isArray(req.body?.mentions) ? req.body.mentions : []).map(Number).filter(id => members.includes(id) && id !== uid))];
      const everyone = mem.kind !== 'dm' && /(^|\s)@(everyone|here)\b/i.test(body);
      const [r] = await pool.query('INSERT INTO chat_messages (room_id, sender_id, body, attachments, reply_to_id, mentions) VALUES (?, ?, ?, ?, ?, ?)',
        [mem.room_id, uid, body, JSON.stringify(attachments), replyTo, JSON.stringify(mentions)]);
      await pool.query('UPDATE chat_rooms SET last_message_at = NOW() WHERE id = ?', [mem.room_id]);
      await pool.query('UPDATE chat_members SET last_read_id = ? WHERE room_id = ? AND user_id = ?', [r.insertId, mem.room_id, uid]);
      lastActive.set(uid, new Date());
      const [m] = await q(`${MSG_SELECT} WHERE m.id = ?`, [r.insertId]);
      const msg = shapeMessage(m, await nameMap());
      send(members, 'message', msg);

      // Phone / desktop notifications for everyone else in the conversation.
      (async () => {
        const mutedSet = new Set((await q('SELECT user_id FROM chat_members WHERE room_id = ? AND muted = 1', [mem.room_id])).map(x => Number(x.user_id)));
        const where = mem.kind === 'channel' ? `#${mem.name}` : mem.name;
        const others = members.filter(id => id !== uid);
        const preview = `${replyTo ? '↪ ' : ''}${previewOf(body, attachments)}`;
        const icon = await senderIcon(uid);
        const mentionedSet = new Set(everyone ? others : mentions);
        const mentioned = others.filter(id => mentionedSet.has(id));
        const regular = others.filter(id => !mentionedSet.has(id) && !mutedSet.has(id));
        if (mentioned.length) {
          await pushTo(mentioned, mem.room_id, { title: `${req.user.name} mentioned you${mem.kind === 'dm' ? '' : ` in ${where}`}`, body: preview, tag: `chat-room-${mem.room_id}`, icon, kind: 'mention' });
        }
        if (regular.length) {
          await pushTo(regular, mem.room_id, { title: mem.kind === 'dm' ? req.user.name : `${req.user.name} · ${where}`, body: preview, tag: `chat-room-${mem.room_id}`, icon, kind: 'message' });
        }
      })().catch(e => console.error('chat push:', e.message));

      // Bell notifications: mentions always; direct messages when the person is not in the chat right now.
      const notifyIds = new Set(mentions);
      if (everyone) members.filter(id => id !== uid).forEach(id => notifyIds.add(id));
      if (mem.kind === 'dm') members.filter(id => id !== uid && !isOnline(id)).forEach(id => notifyIds.add(id));
      if (notifyIds.size) {
        const muted = new Set((await q('SELECT user_id FROM chat_members WHERE room_id = ? AND muted = 1', [mem.room_id])).map(x => Number(x.user_id)));
        const where = mem.kind === 'dm' ? 'sent you a message' : `${mentions.length || everyone ? 'mentioned you in' : 'wrote in'} ${mem.kind === 'channel' ? `#${mem.name}` : mem.name}`;
        const preview = body.trim() ? body.trim().slice(0, 140) : '📎 Attachment';
        const rows = [...notifyIds].filter(id => !muted.has(id) || mentions.includes(id)).map(id => [id, 'chat', `${req.user.name} ${where}`, preview, null, req.user.name, 'chat', String(mem.room_id)]);
        if (rows.length) {
          await pool.query('INSERT INTO notifications (user_id, type, title, message, link, actor_name, entity_type, entity_key) VALUES ?', [rows]).catch(e => console.error('chat notify:', e.message));
          send(rows.map(x => x[0]), 'notify', {});
        }
      }
      res.status(201).json({ message: msg });
    } catch (e) {
      console.error('chat send:', e.message);
      res.status(500).json({ error: 'Could not send the message' });
    }
  });

  const ownMessage = async (id, uid) => {
    const [m] = await q('SELECT m.*, r.kind AS room_kind FROM chat_messages m JOIN chat_rooms r ON r.id = m.room_id WHERE m.id = ?', [id]);
    if (!m) return { m: null };
    const mem = await membership(m.room_id, uid);
    return { m, mem };
  };
  const broadcastMessage = async (id) => {
    const [m] = await q(`${MSG_SELECT} WHERE m.id = ?`, [id]);
    const msg = shapeMessage(m, await nameMap());
    send(await memberIds(m.room_id), 'message:update', msg);
    return msg;
  };

  app.put('/api/chat/messages/:id', async (req, res) => {
    try {
      const uid = auth(req, res); if (!uid) return;
      const { m, mem } = await ownMessage(req.params.id, uid);
      if (!m || !mem) return res.status(404).json({ error: 'Not found' });
      if (Number(m.sender_id) !== uid) return res.status(403).json({ error: 'You can only edit your own messages.' });
      if (m.deleted_at) return res.status(400).json({ error: 'This message was deleted.' });
      const body = String(req.body?.body || '').slice(0, MAX_BODY);
      if (!body.trim() && !parseJson(m.attachments, []).length) return res.status(400).json({ error: 'A message cannot be empty.' });
      await pool.query('UPDATE chat_messages SET body = ?, edited_at = NOW() WHERE id = ?', [body, m.id]);
      res.json({ message: await broadcastMessage(m.id) });
    } catch (e) { res.status(500).json({ error: 'Could not edit the message' }); }
  });

  app.delete('/api/chat/messages/:id', async (req, res) => {
    try {
      const uid = auth(req, res); if (!uid) return;
      const { m, mem } = await ownMessage(req.params.id, uid);
      if (!m || !mem) return res.status(404).json({ error: 'Not found' });
      if (Number(m.sender_id) !== uid && !isRoomAdmin(mem, req)) return res.status(403).json({ error: 'You can only delete your own messages.' });
      await pool.query('UPDATE chat_messages SET deleted_at = NOW(), pinned_at = NULL WHERE id = ?', [m.id]);
      res.json({ message: await broadcastMessage(m.id) });
    } catch (e) { res.status(500).json({ error: 'Could not delete the message' }); }
  });

  // Reactions: one of each emoji per person; the same emoji again takes it back.
  app.post('/api/chat/messages/:id/react', async (req, res) => {
    try {
      const uid = auth(req, res); if (!uid) return;
      const { m, mem } = await ownMessage(req.params.id, uid);
      if (!m || !mem || m.deleted_at) return res.status(404).json({ error: 'Not found' });
      const emoji = String(req.body?.emoji || '').slice(0, 16);
      if (!emoji) return res.status(400).json({ error: 'Pick an emoji.' });
      const reactions = parseJson(m.reactions, {});
      const list = new Set((reactions[emoji] || []).map(Number));
      const adding = !list.has(uid);
      if (list.has(uid)) list.delete(uid); else list.add(uid);
      if (list.size) reactions[emoji] = [...list]; else delete reactions[emoji];
      await pool.query('UPDATE chat_messages SET reactions = ? WHERE id = ?', [JSON.stringify(reactions), m.id]);
      const updated = await broadcastMessage(m.id);
      if (adding && Number(m.sender_id) !== uid) {
        const [roomRow] = await q('SELECT r.kind, r.name, m2.muted FROM chat_rooms r LEFT JOIN chat_members m2 ON m2.room_id = r.id AND m2.user_id = ? WHERE r.id = ?', [m.sender_id, m.room_id]);
        if (roomRow && !roomRow.muted) {
          const what = m.body ? `“${plainText(m.body).slice(0, 100)}”` : 'your attachment';
          pushTo([Number(m.sender_id)], m.room_id, { title: `${req.user.name} reacted ${emoji}`, body: `to ${what}${roomRow.kind === 'dm' ? '' : ` in ${roomRow.kind === 'channel' ? '#' : ''}${roomRow.name}`}`, tag: `chat-reaction-${m.id}`, icon: await senderIcon(uid), kind: 'reaction' }).catch(() => {});
        }
        send([Number(m.sender_id)], 'reaction', {
          roomId: m.room_id, messageId: m.id, emoji, byId: uid, by: req.user.name,
          preview: String(m.body || '').slice(0, 140), hasAttachment: parseJson(m.attachments, []).length > 0
        });
      }
      res.json({ message: updated });
    } catch (e) { res.status(500).json({ error: 'Could not react' }); }
  });

  app.post('/api/chat/messages/:id/pin', async (req, res) => {
    try {
      const uid = auth(req, res); if (!uid) return;
      const { m, mem } = await ownMessage(req.params.id, uid);
      if (!m || !mem || m.deleted_at) return res.status(404).json({ error: 'Not found' });
      const pin = !m.pinned_at;
      await pool.query('UPDATE chat_messages SET pinned_at = ?, pinned_by = ? WHERE id = ?', [pin ? new Date() : null, pin ? uid : null, m.id]);
      const msg = await broadcastMessage(m.id);
      if (pin) await systemMessage(m.room_id, `${req.user.name} pinned a message`);
      res.json({ message: msg });
    } catch (e) { res.status(500).json({ error: 'Could not pin the message' }); }
  });

  // Read receipts.
  app.post('/api/chat/rooms/:id/read', async (req, res) => {
    try {
      const uid = auth(req, res); if (!uid) return;
      const mem = await membership(req.params.id, uid);
      if (!mem) return res.status(404).json({ error: 'Not found' });
      const upTo = Number(req.body?.messageId) || (await q('SELECT COALESCE(MAX(id), 0) AS mx FROM chat_messages WHERE room_id = ?', [mem.room_id]))[0].mx;
      if (upTo > mem.last_read_id) {
        await pool.query('UPDATE chat_members SET last_read_id = ? WHERE room_id = ? AND user_id = ?', [upTo, mem.room_id, uid]);
        send(await memberIds(mem.room_id), 'read', { roomId: mem.room_id, userId: uid, messageId: upTo });
      }
      lastActive.set(uid, new Date());
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: 'Could not update' }); }
  });

  app.post('/api/chat/rooms/:id/typing', async (req, res) => {
    try {
      const uid = auth(req, res); if (!uid) return;
      const mem = await membership(req.params.id, uid);
      if (!mem) return res.status(404).json({ error: 'Not found' });
      send((await memberIds(mem.room_id)).filter(id => id !== uid), 'typing', { roomId: mem.room_id, userId: uid, name: req.user.name });
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ ok: false }); }
  });

  // ── Search and shared files ──────────────────────────────────────────
  app.get('/api/chat/search', async (req, res) => {
    try {
      const uid = auth(req, res); if (!uid) return;
      const term = String(req.query.q || '').trim();
      if (term.length < 2) return res.json({ results: [] });
      const roomFilter = Number(req.query.roomId) || null;
      const rows = await q(`${MSG_SELECT} JOIN chat_members cm ON cm.room_id = m.room_id AND cm.user_id = ?
        WHERE m.deleted_at IS NULL AND m.kind = 'text' AND (m.body LIKE ? OR JSON_SEARCH(m.attachments, 'one', ?, NULL, '$[*].name') IS NOT NULL)
        ${roomFilter ? 'AND m.room_id = ?' : ''} ORDER BY m.id DESC LIMIT 60`,
      roomFilter ? [uid, `%${term}%`, `%${term}%`, roomFilter] : [uid, `%${term}%`, `%${term}%`]);
      const names = await nameMap();
      res.json({ results: rows.map(m => shapeMessage(m, names)) });
    } catch (e) {
      console.error('chat search:', e.message);
      res.status(500).json({ error: 'Search failed' });
    }
  });

  app.get('/api/chat/rooms/:id/files', async (req, res) => {
    try {
      const uid = auth(req, res); if (!uid) return;
      const mem = await membership(req.params.id, uid);
      if (!mem) return res.status(404).json({ error: 'Not found' });
      const rows = await q("SELECT id, sender_id, attachments, created_at FROM chat_messages WHERE room_id = ? AND deleted_at IS NULL AND attachments IS NOT NULL AND attachments <> '[]' ORDER BY id DESC LIMIT 300", [mem.room_id]);
      const names = await nameMap();
      const files = [];
      rows.forEach(r => parseJson(r.attachments, []).forEach(a => files.push({ ...a, messageId: r.id, sender: names.get(Number(r.sender_id)) || '', at: r.created_at })));
      res.json({ files });
    } catch (e) { res.status(500).json({ error: 'Could not load files' }); }
  });

  // Total unread for the sidebar badge.
  app.get('/api/chat/unread', async (req, res) => {
    try {
      const uid = auth(req, res); if (!uid) return;
      await ready;
      const [r] = await q(`SELECT COUNT(*) AS n FROM chat_messages x JOIN chat_members m ON m.room_id = x.room_id AND m.user_id = ?
        WHERE x.id > m.last_read_id AND COALESCE(x.sender_id, 0) <> ? AND x.deleted_at IS NULL AND m.muted = 0`, [uid, uid]);
      res.json({ unread: Number(r.n) || 0 });
    } catch (e) { res.json({ unread: 0 }); }
  });
};

const crypto = require('crypto');

/**
 * Knowledge base ("Notes & Wiki"): notes, links, logins/passwords and documents, each
 * optionally tied to a project. Project files already uploaded elsewhere (project files and
 * ticket attachments) are listed alongside, read-only.
 *
 * Passwords are encrypted at rest (AES-256-GCM) and never included in lists or item reads.
 * They are returned only by POST /reveal, and every reveal is written to kb_access_log.
 * The key comes from VAULT_KEY (set it in .env); without it a key derived from JWT_SECRET is
 * used, which means rotating JWT_SECRET would make stored passwords unreadable.
 *
 * Visibility: team (everyone signed in), managers (managers, admins and the author) or
 * private (only the author).
 */

const TYPES = ['note', 'link', 'credential', 'document'];
const VISIBILITY = ['team', 'managers', 'private'];

const vaultKey = () => crypto.createHash('sha256')
  .update(process.env.VAULT_KEY || `${process.env.JWT_SECRET || 'codigix'}:kb-vault`)
  .digest();

const encrypt = (plain) => {
  if (plain == null || plain === '') return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', vaultKey(), iv);
  const ct = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  return `v1:${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${ct.toString('base64')}`;
};

const decrypt = (stored) => {
  if (!stored) return '';
  const [v, iv, tag, ct] = String(stored).split(':');
  if (v !== 'v1') throw new Error('Unknown secret format');
  const decipher = crypto.createDecipheriv('aes-256-gcm', vaultKey(), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(ct, 'base64')), decipher.final()]).toString('utf8');
};

const parseJson = (v, fallback) => {
  if (v == null) return fallback;
  if (typeof v !== 'string') return v;
  try { return JSON.parse(v); } catch (e) { return fallback; }
};
const cleanTags = (tags) => [...new Set((Array.isArray(tags) ? tags : String(tags || '').split(','))
  .map(t => String(t || '').trim().replace(/^#/, '')).filter(Boolean).map(t => t.slice(0, 40)))].slice(0, 20);
const cleanFiles = (files) => (Array.isArray(files) ? files : [])
  .filter(f => f && /^(\/api\/uploads\/|\/uploads\/|https?:\/\/)/i.test(String(f.url || '')))
  .map(f => ({ name: String(f.name || 'file').slice(0, 200), url: String(f.url).slice(0, 500), size: Number(f.size) || null, mime: String(f.mime || '').slice(0, 100), isImage: Boolean(f.isImage) }))
  .slice(0, 30);
const cleanUrl = (u) => {
  const s = String(u || '').trim();
  if (!s) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(s) ? s : `https://${s}`;
  return /^https?:\/\/\S+$/i.test(withScheme) ? withScheme.slice(0, 1000) : null;
};

module.exports = function setupKnowledgeRoutes(app, pool) {
  const q = async (sql, params = []) => (await pool.query(sql, params))[0];

  const ready = (async () => {
    await pool.query(`CREATE TABLE IF NOT EXISTS kb_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      type VARCHAR(20) NOT NULL DEFAULT 'note',
      title VARCHAR(255) NOT NULL,
      body MEDIUMTEXT NULL,
      url VARCHAR(1000) NULL,
      username VARCHAR(255) NULL,
      email VARCHAR(255) NULL,
      secret_enc TEXT NULL,
      project_id INT NULL,
      category VARCHAR(80) NULL,
      tags JSON NULL,
      files JSON NULL,
      visibility VARCHAR(12) NOT NULL DEFAULT 'team',
      pinned TINYINT(1) NOT NULL DEFAULT 0,
      created_by_id INT NULL,
      created_by VARCHAR(120) NULL,
      updated_by VARCHAR(120) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      KEY idx_kb_project (project_id),
      KEY idx_kb_type (type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await pool.query(`CREATE TABLE IF NOT EXISTS kb_access_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      item_id INT NOT NULL,
      user_id INT NULL,
      user_name VARCHAR(120) NULL,
      action VARCHAR(20) NOT NULL,
      at DATETIME DEFAULT CURRENT_TIMESTAMP,
      KEY idx_kb_log_item (item_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  })().catch(e => console.error('knowledge tables:', e.message));

  const isMgr = (req) => Boolean(req.user?.isManager || req.user?.isAdmin);
  const isAuthor = (item, req) => Number(item.created_by_id) === Number(req.user?.id);
  const canSee = (item, req) => item.visibility === 'team'
    || (item.visibility === 'managers' && (isMgr(req) || isAuthor(item, req)))
    || (item.visibility === 'private' && isAuthor(item, req));
  // Private items are the author's alone; anything else the author or a manager may change.
  const canEdit = (item, req) => isAuthor(item, req) || (item.visibility !== 'private' && isMgr(req));

  const shape = (row, req) => ({
    id: row.id, type: row.type, title: row.title, body: row.body || '', url: row.url || '',
    username: row.username || '', email: row.email || '', hasSecret: Boolean(row.secret_enc),
    projectId: row.project_id, project: row.project_name || '', category: row.category || '',
    tags: parseJson(row.tags, []), files: parseJson(row.files, []), visibility: row.visibility,
    pinned: Boolean(row.pinned), createdBy: row.created_by || '', createdById: row.created_by_id,
    updatedBy: row.updated_by || row.created_by || '', createdAt: row.created_at, updatedAt: row.updated_at,
    deletedAt: row.deleted_at, canEdit: canEdit(row, req)
  });

  const load = async (id) => {
    const [row] = await q(`SELECT k.*, COALESCE(p.name, p.title) AS project_name FROM kb_items k
      LEFT JOIN projects p ON p.id = k.project_id WHERE k.id = ?`, [id]);
    return row || null;
  };

  const needUser = (req, res) => {
    if (!req.user) { res.status(401).json({ error: 'Please sign in again.' }); return false; }
    return true;
  };

  // ── List ───────────────────────────────────────────────────────────────
  // view: all | pinned | mine | trash   type: note | link | credential | document
  app.get('/api/kb/items', async (req, res) => {
    try {
      if (!needUser(req, res)) return;
      await ready;
      const view = String(req.query.view || 'all');
      const rows = await q(`SELECT k.*, COALESCE(p.name, p.title) AS project_name FROM kb_items k
        LEFT JOIN projects p ON p.id = k.project_id
        WHERE ${view === 'trash' ? 'k.deleted_at IS NOT NULL' : 'k.deleted_at IS NULL'}
        ORDER BY k.pinned DESC, k.updated_at DESC`);
      let list = rows.filter(r => canSee(r, req));
      if (view === 'trash') list = list.filter(r => canEdit(r, req));
      const all = list;
      if (view === 'pinned') list = list.filter(r => r.pinned);
      if (view === 'mine') list = list.filter(r => isAuthor(r, req));
      if (TYPES.includes(req.query.type)) list = list.filter(r => r.type === req.query.type);
      if (req.query.project_id) list = list.filter(r => String(r.project_id || '') === String(req.query.project_id === 'none' ? '' : req.query.project_id));
      if (req.query.category) list = list.filter(r => (r.category || '') === req.query.category);
      if (req.query.tag) list = list.filter(r => parseJson(r.tags, []).includes(req.query.tag));
      const term = String(req.query.q || '').trim().toLowerCase();
      if (term) {
        list = list.filter(r => [r.title, r.body, r.url, r.username, r.email, r.category, r.project_name, parseJson(r.tags, []).join(' '),
          parseJson(r.files, []).map(f => f.name).join(' ')].some(v => String(v || '').toLowerCase().includes(term)));
      }
      // Counts for the sidebar, over everything the user can see (not the filtered list).
      const counts = { all: all.length, pinned: all.filter(r => r.pinned).length, mine: all.filter(r => isAuthor(r, req)).length,
        byType: Object.fromEntries(TYPES.map(t => [t, all.filter(r => r.type === t).length])) };
      const projects = {}; const categories = {}; const tags = {};
      all.forEach(r => {
        if (r.project_id) projects[r.project_id] = { id: r.project_id, name: r.project_name || `Project ${r.project_id}`, count: (projects[r.project_id]?.count || 0) + 1 };
        if (r.category) categories[r.category] = (categories[r.category] || 0) + 1;
        parseJson(r.tags, []).forEach(t => { tags[t] = (tags[t] || 0) + 1; });
      });
      res.json({
        items: list.map(r => shape(r, req)), counts,
        projects: Object.values(projects).sort((a, b) => a.name.localeCompare(b.name)),
        categories: Object.entries(categories).map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name)),
        tags: Object.entries(tags).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
        canManage: isMgr(req)
      });
    } catch (e) {
      console.error('kb list:', e.message);
      res.status(500).json({ error: 'Could not load the knowledge base' });
    }
  });

  const readBody = (b, isCreate) => {
    const out = {};
    if (isCreate || b.type !== undefined) out.type = TYPES.includes(b.type) ? b.type : 'note';
    if (isCreate || b.title !== undefined) out.title = String(b.title || '').trim().slice(0, 255);
    if (b.body !== undefined) out.body = String(b.body || '').slice(0, 200000);
    if (b.url !== undefined) out.url = cleanUrl(b.url);
    if (b.username !== undefined) out.username = String(b.username || '').trim().slice(0, 255) || null;
    if (b.email !== undefined) out.email = String(b.email || '').trim().slice(0, 255) || null;
    if (b.projectId !== undefined) out.project_id = b.projectId ? Number(b.projectId) || null : null;
    if (b.category !== undefined) out.category = String(b.category || '').trim().slice(0, 80) || null;
    if (b.tags !== undefined) out.tags = JSON.stringify(cleanTags(b.tags));
    if (b.files !== undefined) out.files = JSON.stringify(cleanFiles(b.files));
    if (b.visibility !== undefined) out.visibility = VISIBILITY.includes(b.visibility) ? b.visibility : 'team';
    if (b.pinned !== undefined) out.pinned = b.pinned ? 1 : 0;
    // secret: undefined keeps it, '' clears it, text replaces it.
    if (b.secret !== undefined) out.secret_enc = encrypt(b.secret);
    return out;
  };

  // ── Create ─────────────────────────────────────────────────────────────
  app.post('/api/kb/items', async (req, res) => {
    try {
      if (!needUser(req, res)) return;
      await ready;
      const data = readBody(req.body || {}, true);
      if (!data.title) return res.status(400).json({ error: 'Give it a title.' });
      if (data.type === 'link' && !data.url) return res.status(400).json({ error: 'Enter the link (a web address).' });
      if (req.body.url && !data.url) return res.status(400).json({ error: 'That link is not a valid web address.' });
      if (data.type === 'credential' && req.body.visibility === undefined) data.visibility = 'managers';
      data.created_by_id = req.user.id || null;
      data.created_by = req.user.name || null;
      data.updated_by = req.user.name || null;
      const cols = Object.keys(data);
      const [r] = await pool.query(`INSERT INTO kb_items (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`, cols.map(c => data[c]));
      res.status(201).json({ item: shape(await load(r.insertId), req) });
    } catch (e) {
      console.error('kb create:', e.message);
      res.status(500).json({ error: 'Could not save it' });
    }
  });

  // ── Update ─────────────────────────────────────────────────────────────
  app.put('/api/kb/items/:id', async (req, res) => {
    try {
      if (!needUser(req, res)) return;
      await ready;
      const item = await load(req.params.id);
      if (!item || !canSee(item, req)) return res.status(404).json({ error: 'Not found' });
      if (!canEdit(item, req)) return res.status(403).json({ error: 'Only the author or a manager can change this.' });
      const data = readBody(req.body || {}, false);
      if (data.title !== undefined && !data.title) return res.status(400).json({ error: 'Give it a title.' });
      if (req.body.url && !data.url) return res.status(400).json({ error: 'That link is not a valid web address.' });
      // Making an item private is for its author only.
      if (data.visibility === 'private' && !isAuthor(item, req)) return res.status(403).json({ error: 'Only the author can make this private.' });
      data.updated_by = req.user.name || null;
      const cols = Object.keys(data);
      await pool.query(`UPDATE kb_items SET ${cols.map(c => `${c} = ?`).join(', ')} WHERE id = ?`, [...cols.map(c => data[c]), item.id]);
      if (data.secret_enc !== undefined) {
        await pool.query('INSERT INTO kb_access_log (item_id, user_id, user_name, action) VALUES (?, ?, ?, ?)', [item.id, req.user.id, req.user.name, data.secret_enc ? 'changed' : 'cleared']);
      }
      res.json({ item: shape(await load(item.id), req) });
    } catch (e) {
      console.error('kb update:', e.message);
      res.status(500).json({ error: 'Could not save the changes' });
    }
  });

  // ── Trash / restore / delete for good ──────────────────────────────────
  app.delete('/api/kb/items/:id', async (req, res) => {
    try {
      if (!needUser(req, res)) return;
      await ready;
      const item = await load(req.params.id);
      if (!item || !canSee(item, req)) return res.status(404).json({ error: 'Not found' });
      if (!canEdit(item, req)) return res.status(403).json({ error: 'Only the author or a manager can delete this.' });
      if (req.query.permanent === '1') {
        if (!item.deleted_at) return res.status(400).json({ error: 'Move it to Trash first.' });
        await pool.query('DELETE FROM kb_items WHERE id = ?', [item.id]);
        await pool.query('DELETE FROM kb_access_log WHERE item_id = ?', [item.id]);
      } else {
        await pool.query('UPDATE kb_items SET deleted_at = NOW(), updated_by = ? WHERE id = ?', [req.user.name || null, item.id]);
      }
      res.json({ success: true });
    } catch (e) {
      console.error('kb delete:', e.message);
      res.status(500).json({ error: 'Could not delete it' });
    }
  });

  app.post('/api/kb/items/:id/restore', async (req, res) => {
    try {
      if (!needUser(req, res)) return;
      await ready;
      const item = await load(req.params.id);
      if (!item || !canEdit(item, req)) return res.status(404).json({ error: 'Not found' });
      await pool.query('UPDATE kb_items SET deleted_at = NULL, updated_by = ? WHERE id = ?', [req.user.name || null, item.id]);
      res.json({ item: shape(await load(item.id), req) });
    } catch (e) {
      res.status(500).json({ error: 'Could not restore it' });
    }
  });

  // ── Passwords: reveal on request, logged ───────────────────────────────
  app.post('/api/kb/items/:id/reveal', async (req, res) => {
    try {
      if (!needUser(req, res)) return;
      await ready;
      const item = await load(req.params.id);
      if (!item || item.deleted_at || !canSee(item, req)) return res.status(404).json({ error: 'Not found' });
      if (!item.secret_enc) return res.json({ secret: '' });
      let secret;
      try { secret = decrypt(item.secret_enc); } catch (e) {
        return res.status(500).json({ error: 'This password cannot be read: the vault key has changed. Save the password again.' });
      }
      const action = req.body?.action === 'copy' ? 'copy' : 'reveal';
      await pool.query('INSERT INTO kb_access_log (item_id, user_id, user_name, action) VALUES (?, ?, ?, ?)', [item.id, req.user.id, req.user.name, action]);
      res.json({ secret });
    } catch (e) {
      console.error('kb reveal:', e.message);
      res.status(500).json({ error: 'Could not read the password' });
    }
  });

  app.get('/api/kb/items/:id/access-log', async (req, res) => {
    try {
      if (!needUser(req, res)) return;
      await ready;
      const item = await load(req.params.id);
      if (!item || !canSee(item, req)) return res.status(404).json({ error: 'Not found' });
      if (!canEdit(item, req)) return res.status(403).json({ error: 'Only the author or a manager can see who viewed this.' });
      res.json({ log: await q('SELECT user_name, action, at FROM kb_access_log WHERE item_id = ? ORDER BY at DESC LIMIT 100', [item.id]) });
    } catch (e) {
      res.status(500).json({ error: 'Could not load the access log' });
    }
  });

  // ── Files already uploaded to projects and tickets (read-only) ─────────
  app.get('/api/kb/project-files', async (req, res) => {
    try {
      if (!needUser(req, res)) return;
      const projectFiles = await q(`SELECT f.id, f.name, f.file_type, f.mime_type, f.size_bytes, f.file_path, f.created_at, f.project_id,
          COALESCE(p.name, p.title) AS project_name, TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS uploaded_by
        FROM files f LEFT JOIN projects p ON p.id = f.project_id LEFT JOIN users u ON u.id = f.user_id
        ORDER BY f.created_at DESC LIMIT 1000`).catch(() => []);
      const attachments = await q(`SELECT a.id, a.file_name, a.file_path, a.file_size, a.file_type, a.uploaded_at, a.issue_key,
          i.title AS issue_title, i.project_id, COALESCE(p.name, p.title) AS project_name
        FROM it_kanban_attachments a LEFT JOIN it_kanban_issues i ON i.issue_key COLLATE utf8mb4_unicode_ci = a.issue_key COLLATE utf8mb4_unicode_ci LEFT JOIN projects p ON p.id = i.project_id
        ORDER BY a.uploaded_at DESC LIMIT 1000`).catch(() => []);
      const isImg = (name, mime) => /^image\//i.test(String(mime || '')) || /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(String(name || ''));
      const rows = [
        ...projectFiles.map(f => ({ id: `f-${f.id}`, source: 'Project file', name: f.name, url: f.file_path, size: f.size_bytes ? Number(f.size_bytes) : null,
          isImage: isImg(f.name, f.mime_type), projectId: f.project_id, project: f.project_name || '', by: f.uploaded_by || '', at: f.created_at })),
        ...attachments.map(a => ({ id: `a-${a.id}`, source: 'Ticket attachment', name: a.file_name, url: a.file_path, sizeText: a.file_size || '',
          isImage: isImg(a.file_name, a.file_type), projectId: a.project_id, project: a.project_name || '', issueKey: a.issue_key, issueTitle: a.issue_title || '', at: a.uploaded_at }))
      ].filter(r => r.url).sort((a, b) => new Date(b.at) - new Date(a.at));
      const term = String(req.query.q || '').trim().toLowerCase();
      let list = rows;
      if (req.query.project_id) list = list.filter(r => String(r.projectId || '') === String(req.query.project_id));
      if (term) list = list.filter(r => [r.name, r.project, r.issueKey, r.issueTitle].some(v => String(v || '').toLowerCase().includes(term)));
      res.json({ files: list, total: rows.length });
    } catch (e) {
      console.error('kb project files:', e.message);
      res.status(500).json({ error: 'Could not load project files' });
    }
  });
};

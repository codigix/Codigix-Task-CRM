/**
 * Live updates: when anything is saved, every open page is told so it can reload what it shows.
 *
 * It is a plain server-sent-events stream (the same technique chat already uses). The message says only
 * WHAT area changed ({ topic, key, method, by, at }), never the data itself: each page then asks the
 * normal API for what it displays, so every permission rule still applies and nothing private can leak
 * through this channel.
 *
 * Areas ("topics"):
 *   work           tickets, tasks, sprints, projects, time logs, performance approvals
 *   meetings       meetings and the calendar
 *   notifications  the bell
 *   anything else  its own first path segment, e.g. "followups", "invoices"
 */

const clients = new Set(); // { res, userId }

const WORK = new Set(['it-kanban', 'tasks', 'general-tasks', 'project-tasks', 'projects', 'sprints', 'performance-engine', 'timesheets', 'github']);
const MEETINGS = new Set(['meetings', 'calendar']);
// Never announced: they change constantly or have their own live channel.
const SILENT = new Set(['chat', 'auth', 'push', 'live', 'health', 'presence', 'uploads']);

const topicOf = (segment) => (WORK.has(segment) ? 'work' : MEETINGS.has(segment) ? 'meetings' : segment);

const publish = (event) => {
  const frame = `event: change\ndata: ${JSON.stringify({ at: Date.now(), ...event })}\n\n`;
  for (const c of clients) {
    try { c.res.write(frame); } catch (e) { clients.delete(c); }
  }
};

/** Express middleware: after any successful POST / PUT / PATCH / DELETE under /api, announce it. */
const announceChanges = (req, res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  res.on('finish', () => {
    if (res.statusCode >= 400) return;
    const m = /^\/api\/([^/?#]+)(?:\/([^?#]*))?/.exec(req.originalUrl || req.url || '');
    if (!m) return;
    const segment = m[1].toLowerCase();
    if (SILENT.has(segment)) return;
    // "/api/it-kanban/issues/ABC-12/..." -> key ABC-12 (lets a page that shows one ticket react to only that one)
    const km = segment === 'it-kanban' ? /^issues\/([^/]+)/.exec(m[2] || '') : null;
    let key;
    try { key = km ? decodeURIComponent(km[1]) : undefined; } catch (e) { key = undefined; }
    publish({ topic: topicOf(segment), area: segment, key, method: req.method, by: req.user ? req.user.id : null });
  });
  next();
};

/** Let another open stream (the chat stream) carry the live-change messages too. Returns a function that detaches it. */
const attach = (res, userId) => { const client = { res, userId }; clients.add(client); return () => clients.delete(client); };

/** GET /api/live/stream */
const stream = (req, res) => {
  if (!req.user || !req.user.id) return res.status(401).json({ error: 'Please log in' });
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.write(`event: hello\ndata: ${JSON.stringify({ userId: req.user.id })}\n\n`);
  const client = { res, userId: req.user.id };
  clients.add(client);
  const ping = setInterval(() => { try { res.write(': ping\n\n'); } catch (e) { /* closed */ } }, 25000);
  req.on('close', () => { clearInterval(ping); clients.delete(client); });
};

module.exports = { attach, publish, announceChanges, stream, topicOf, connected: () => clients.size };

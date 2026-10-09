/**
 * Login sessions.
 *
 * Login sets a signed, httpOnly cookie. Every /api request (except the few public ones
 * below) must carry it — or an "Authorization: Bearer <token>" header for scripts — and the
 * user is re-read from the database on each request, so a deactivated user or a changed
 * role takes effect immediately.
 *
 * Much of the existing route code identifies the caller from x-user-id / x-user-role /
 * x-user-name headers. Those used to come straight from the browser and could be forged;
 * this middleware now overwrites them with the verified user, so that code keeps working
 * but can no longer be lied to.
 */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const COOKIE_NAME = 'crm_session';
const SESSION_HOURS = Number(process.env.SESSION_HOURS) || 720; // 30 days (720 hours)
const isProduction = (process.env.NODE_ENV || 'development') === 'production';

// Persistent JWT secret so restarts never invalidate active sessions
const JWT_SECRET = process.env.JWT_SECRET || 'c0digix-crm-super-secure-production-jwt-token-secret-key-2026-auth-session';

// Reachable without a session: logging in, SSO, applying for an account, GitHub's
// server-to-server webhook, and the health check.
const PUBLIC_API = [
  { method: 'POST', path: /^\/api\/auth\/login\/?$/ },
  { method: 'POST', path: /^\/api\/auth\/sso-verify\/?$/ },
  { method: 'POST', path: /^\/api\/auth\/registration-request\/?$/ },
  { method: 'POST', path: /^\/api\/auth\/logout\/?$/ },
  { method: 'POST', path: /^\/api\/github\/webhook\/?$/ },
  { method: 'GET', path: /^\/api\/health\/?$/ }
];

const isPublic = (req) => {
  const url = (req.originalUrl || req.url || '').split('?')[0];
  return req.method === 'OPTIONS' || PUBLIC_API.some(p => p.method === req.method && p.path.test(url));
};

const parseCookies = (header) => {
  const out = {};
  String(header || '').split(';').forEach(part => {
    const idx = part.indexOf('=');
    if (idx > 0) out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  });
  return out;
};

const readToken = (req) => {
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7).trim();
  return parseCookies(req.headers.cookie)[COOKIE_NAME] || null;
};

const cookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: isProduction,
  path: '/',
  maxAge: SESSION_HOURS * 60 * 60 * 1000
});

const issueSession = (res, user) => {
  const token = jwt.sign({ sub: String(user.id) }, JWT_SECRET, { expiresIn: `${SESSION_HOURS}h` });
  res.cookie(COOKIE_NAME, token, cookieOptions());
  return token;
};

const clearSession = (res) => {
  const { maxAge, ...opts } = cookieOptions();
  res.clearCookie(COOKIE_NAME, opts);
};

const roleIsManager = (role) => {
  const r = String(role || '').toLowerCase();
  return r.includes('manager') || r.includes('admin');
};
const roleIsAdmin = (role) => String(role || '').toLowerCase().includes('admin');

const createSessionMiddleware = (pool) => async (req, res, next) => {
  if (!req.path.startsWith('/api') && !(req.originalUrl || '').startsWith('/api')) return next();
  if (isPublic(req)) return next();

  const token = readToken(req);
  if (!token) return res.status(401).json({ error: 'Please log in', code: 'NOT_AUTHENTICATED' });

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch (e) {
    clearSession(res);
    return res.status(401).json({ error: 'Your session has expired. Please log in again.', code: 'SESSION_EXPIRED' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.username, u.email, u.status, u.department, u.department_role, u.job_title,
              r.name AS role_name
         FROM users u LEFT JOIN roles r ON r.id = u.role_id
        WHERE u.id = ?`,
      [payload.sub]
    );
    const user = rows[0];
    if (!user || String(user.status || 'Active').toLowerCase() !== 'active') {
      clearSession(res);
      return res.status(401).json({ error: 'Your account is not active. Contact an administrator.', code: 'ACCOUNT_INACTIVE' });
    }

    const displayName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || user.email;
    const isDeptManager = String(user.department_role || '').toLowerCase() === 'manager';
    req.user = {
      id: user.id,
      role: user.role_name || '',
      department_role: user.department_role,
      job_title: user.job_title,
      name: displayName,
      email: user.email,
      department: user.department,
      isManager: roleIsManager(user.role_name) || isDeptManager,
      isAdmin: roleIsAdmin(user.role_name)
    };

    // Replace whatever the browser sent with the verified identity.
    req.headers['x-user-id'] = String(user.id);
    req.headers['x-user-role'] = user.role_name || '';
    req.headers['x-user-name'] = displayName;
    next();
  } catch (err) {
    console.error('Session lookup failed:', err.message);
    res.status(500).json({ error: 'Could not verify your session' });
  }
};

// For routes that only managers/admins (or only admins) may use.
const requireManager = (req, res, next) =>
  req.user?.isManager ? next() : res.status(403).json({ error: 'Only managers can do this.' });
const requireAdmin = (req, res, next) =>
  req.user?.isAdmin ? next() : res.status(403).json({ error: 'Only administrators can do this.' });

module.exports = {
  createSessionMiddleware,
  issueSession,
  clearSession,
  requireManager,
  requireAdmin,
  roleIsManager,
  COOKIE_NAME
};

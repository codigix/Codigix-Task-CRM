const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

dotenv.config({ path: path.join(__dirname, '.env') });
const NODE_ENV = process.env.NODE_ENV || 'development';

const app = express();
const PORT = process.env.PORT || 5000;

const pool = require('./config/database');
const { testConnection } = require('./database/init');
const { hashPassword, verifyPassword, checkPermission } = require('./middleware/helpers');
const { createSessionMiddleware, issueSession, clearSession, requireAdmin } = require('./middleware/session');
const automationService = require('./services/automationService');

const allowedOrigins = [
  process.env.CORS_ORIGIN,
  process.env.CLIENT_URL,
  'http://localhost:3000',
  'http://localhost:3001',
  'https://allinonecrm.codigixinfotech.com',
  'http://allinonecrm.codigixinfotech.com'
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      /^https?:\/\/([a-z0-9-]+\.)*codigixinfotech\.com$/i.test(origin) ||
      (NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1):[0-9]+$/.test(origin))
    ) {
      return callback(null, true);
    }
    // Any other website is refused: requests carry the login cookie, so allowing every
    // origin would let a third-party page act as a signed-in user.
    return callback(null, false);
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Serve static files strictly from UPLOAD_DIR defined in .env (no optional fallback paths)
const { UPLOAD_DIR } = require('./config/upload');
// Never serve database dumps, env/config files, keys, archives or scripts from uploads,
// even if someone uploads one: these leak data or credentials when fetched by URL.
const BLOCKED_UPLOAD_EXT = /\.(sql|sqlite|db|bak|dump|env|pem|key|p12|pfx|zip|tar|gz|7z|rar|js|mjs|cjs|sh|bat|ps1|php|py|exe)$/i;
app.use(['/uploads', '/api/uploads'], (req, res, next) => {
  const name = decodeURIComponent(path.basename(req.path || ''));
  if (BLOCKED_UPLOAD_EXT.test(name) || name.startsWith('.')) {
    return res.status(404).json({ error: 'Not found' });
  }
  next();
});
app.use('/uploads', express.static(UPLOAD_DIR, { dotfiles: 'deny' }));
app.use('/api/uploads', express.static(UPLOAD_DIR, { dotfiles: 'deny' }));

// Resolving uploads matching original filenames within UPLOAD_DIR without path-to-regexp syntax errors
app.use(['/uploads', '/api/uploads'], async (req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  const fs = require('fs');
  const filename = path.basename(req.path);
  if (!filename) return next();

  const relativePath = req.path.replace(/^\//, '');
  const exactPath = path.join(UPLOAD_DIR, relativePath);

  if (fs.existsSync(exactPath) && fs.statSync(exactPath).isFile()) {
    return res.sendFile(exactPath);
  }

  try {
    if (fs.existsSync(UPLOAD_DIR)) {
      const files = await fs.promises.readdir(UPLOAD_DIR);
      const suffix = '-' + filename;
      const matchedFile = files.find(f => f.endsWith(suffix));
      if (matchedFile) {
        return res.sendFile(path.join(UPLOAD_DIR, matchedFile));
      }
    }
  } catch (err) {
    console.error('Uploads resolution error:', err);
  }
  next();
});

// Serve React build assets (production mode)
const clientBuildPath = path.join(__dirname, '..', 'client', 'build');

// Serve CRA build static (js/css/media) + root index.html
app.use(express.static(clientBuildPath));

// Explicitly expose manifest + icons at server root (prevents SPA/404 fallback issues)
app.get(['/manifest.json', '/favicon.svg', '/favicon.ico'], (req, res) => {
  const filePath = path.join(clientBuildPath, req.path);
  return res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).json({ error: `Static file not found: ${req.path}` });
    }
  });
});

// If the client asks for manifest.webmanifest (PWA), serve the same content as manifest.json if needed
app.get('/manifest.webmanifest', (req, res) => {
  const filePath = path.join(clientBuildPath, 'manifest.json');
  return res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).json({ error: 'manifest.webmanifest not available' });
    }
  });
});





app.set('etag', false);
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

console.log(`Server running in ${NODE_ENV} mode`);
console.log(`Database: ${process.env.DB_HOST}/${process.env.DB_NAME}`);
console.log(`Port: ${PORT}`);

// Auth Routes Router
const authRouter = express.Router();

const loadUserByEmail = async (connection, email) => {
  const [users] = await connection.query(
    'SELECT u.*, r.name as role_name FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.email = ?',
    [String(email || '').trim()]
  );
  return users[0] || null;
};

const publicUser = (user) => {
  const { password: _, ...rest } = user;
  return rest;
};

authRouter.post('/login', async (req, res) => {
  let connection;
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    connection = await pool.getConnection();
    const user = await loadUserByEmail(connection, email);
    const check = user ? verifyPassword(password, user.password) : { ok: false };

    // Same message for unknown email and wrong password, so emails cannot be probed.
    if (!user || !check.ok) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (String(user.status || 'Active').toLowerCase() !== 'active') {
      return res.status(403).json({ error: 'Your account is not active. Contact an administrator.' });
    }

    // Re-save passwords still in the old fixed-salt format.
    if (check.needsUpgrade) {
      await connection.query('UPDATE users SET password = ? WHERE id = ?', [hashPassword(password), user.id])
        .catch(err => console.error('Password upgrade failed:', err.message));
    }

    issueSession(res, user);
    res.json(publicUser(user));
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ error: 'Failed to login' });
  } finally {
    if (connection) connection.release();
  }
});

authRouter.post('/logout', (req, res) => {
  clearSession(res);
  res.json({ success: true });
});

// The signed-in user, freshly read; the client uses this to confirm its session on load.
authRouter.get('/me', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT u.*, r.name as role_name FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = ?',
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(publicUser(rows[0]));
  } catch (error) {
    res.status(500).json({ error: 'Failed to load user' });
  }
});

authRouter.post('/sso-verify', async (req, res) => {
  const { token } = req.body || {};
  if (!token) {
    return res.status(400).json({ success: false, message: 'Token required' });
  }
  if (!process.env.SSO_SECRET_KEY) {
    return res.status(503).json({ success: false, message: 'SSO is not configured on this server' });
  }

  let connection;
  try {
    const decoded = jwt.verify(token, process.env.SSO_SECRET_KEY);

    connection = await pool.getConnection();
    const user = await loadUserByEmail(connection, decoded.email);

    if (!user) {
      return res.json({
        success: true,
        action: 'register',
        prefillData: {
          email: decoded.email,
          firstName: decoded.firstName || '',
          lastName: decoded.lastName || '',
          phone: decoded.phone || ''
        }
      });
    }
    if (String(user.status || 'Active').toLowerCase() !== 'active') {
      return res.status(403).json({ success: false, message: 'Your account is not active' });
    }

    issueSession(res, user);
    res.json({ success: true, user: publicUser(user) });
  } catch (error) {
    console.error('SSO verify error:', error.message);
    res.status(401).json({ success: false, message: 'Invalid SSO Token' });
  } finally {
    if (connection) connection.release();
  }
});

// Creating an account directly (with any role) is an administrator action. People signing
// themselves up go through /registration-request, which HR/Admin approve.
authRouter.post('/signup', requireAdmin, async (req, res) => {
  let connection;
  try {
    const { first_name, last_name, email, password, phone, company, department, job_title } = req.body;
    let { username } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    if (!username) {
      username = email.split('@')[0];
    }

    connection = await pool.getConnection();

    const [existingUser] = await connection.query(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [email, username]
    );

    if (existingUser.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const hashedPassword = hashPassword(password);

    // Only existing roles can be given; roles are no longer created on the fly.
    let role_id = 5; // Default to Employee
    if (req.body.role_name) {
      const [roles] = await connection.query('SELECT id FROM roles WHERE name = ?', [req.body.role_name]);
      if (roles.length === 0) {
        return res.status(400).json({ error: 'Unknown role: ' + req.body.role_name });
      }
      role_id = roles[0].id;
    }

    const userUuid = crypto.randomUUID();
    const [result] = await connection.query(
      'INSERT INTO users (uuid, first_name, last_name, email, username, password, phone1, location, role_id, status, department, job_title) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [userUuid, first_name || 'User', last_name || '', email, username, hashedPassword, phone || '', company || '', role_id, 'Active', department || null, job_title || null]
    );

    const [newUser] = await connection.query(
      'SELECT u.*, r.name as role_name FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = ?',
      [result.insertId]
    );

    res.status(201).json(publicUser(newUser[0]));

  } catch (error) {
    console.error('Signup error:', error.message);
    res.status(500).json({ error: 'Failed to create user' });
  } finally {
    if (connection) connection.release();
  }
});

authRouter.post('/registration-request', async (req, res) => {
  let connection;
  try {
    const { first_name, last_name, email, password, phone, company, department, role_type, role_name } = req.body;

    if (!first_name || !email || !password) {
      return res.status(400).json({ error: 'First name, email, and password are required' });
    }

    connection = await pool.getConnection();

    // Check if an active user already exists with this email
    const [existingUser] = await connection.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUser.length > 0) {
      return res.status(409).json({ error: 'An account with this email address already exists. Please sign in instead.' });
    }

    // Check if there is already a pending registration request for this email
    const [existingRequest] = await connection.query(
      'SELECT id FROM registration_requests WHERE email = ? AND status = "Pending"',
      [email]
    );

    if (existingRequest.length > 0) {
      return res.status(409).json({ error: 'A registration request with this email is already pending review by HR / Admin.' });
    }

    const hashedPassword = hashPassword(password);
    const requestUuid = crypto.randomUUID();

    const [insertResult] = await connection.query(
      `INSERT INTO registration_requests (
        uuid, first_name, last_name, email, password, phone, company, department, role_type, role_name, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`,
      [
        requestUuid,
        first_name,
        last_name || '',
        email,
        hashedPassword,
        phone || null,
        company || null,
        department || null,
        role_type || null,
        role_name || role_type || 'Employee'
      ]
    );

    const requestId = insertResult.insertId;
    const applicantName = `${first_name} ${last_name || ''}`.trim();

    // Trigger in-app notification to all HR and Admin users
    const createNotification = req.app?.locals?.createNotification;
    if (typeof createNotification === 'function') {
      createNotification({
        targetAudience: 'hr_and_admin',
        type: 'registration_request',
        title: 'New Registration Request',
        message: `${applicantName} (${email}) has submitted a registration request. Please review and assign role.`,
        link: '/hr/registration-requests',
        actorName: applicantName,
        entityType: 'registration_request',
        entityKey: String(requestUuid)
      }).catch(err => console.error('Failed to dispatch registration request notification:', err.message));
    }

    res.status(201).json({
      success: true,
      message: 'Registration request submitted successfully. It has been sent to HR and Admin for review.',
      requestId: requestUuid
    });
  } catch (error) {
    console.error('Registration request error:', error.message);
    res.status(500).json({ error: 'Failed to submit registration request', details: error.message });
  } finally {
    if (connection) connection.release();
  }
});

authRouter.post('/update-role', requireAdmin, async (req, res) => {
  let connection;
  try {
    const { email, role_name } = req.body;
    if (!email || !role_name) {
      return res.status(400).json({ error: 'Email and role_name required' });
    }

    connection = await pool.getConnection();
    const [roles] = await connection.query('SELECT id FROM roles WHERE name = ?', [role_name]);
    if (roles.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const role_id = roles[0].id;
    await connection.query('UPDATE users SET role_id = ? WHERE email = ?', [role_id, email]);
    
    res.json({ success: true, message: `User ${email} role updated to ${role_name}` });
  } catch (error) {
    console.error('Update role error:', error.message);
    res.status(500).json({ error: 'Failed to update role', details: error.message });
  } finally {
    if (connection) connection.release();
  }
});

authRouter.post('/check-permission', async (req, res) => {
  try {
    const { module, action } = req.body || {};
    const userId = req.user.isAdmin && req.body?.userId ? req.body.userId : req.user.id;
    const hasPermission = await checkPermission(userId, module, action);
    res.json({ success: true, hasPermission });
  } catch (error) {
    console.error('Permission check error:', error.message);
    res.status(500).json({ error: 'Failed to check permission', details: error.message });
  }
});

// Every /api request below needs a valid login session (see middleware/session.js).
app.use(createSessionMiddleware(pool));

// Register Auth Router
app.use('/api/auth', authRouter);
app.use('/api/it-documents', require('./routes/it-documents-routes'));
app.use('/api/seo-gmb', require('./routes/seo-gmb-routes')(pool));

app.use('/api/hr/dashboard', require('./routes/hr-dashboard-routes')(pool));
app.use('/api/hr/attendance', require('./routes/hr-attendance-routes')(pool));
app.use('/api/hr/performance', require('./routes/hr-performance-routes')(pool));
app.use('/api/hr/registration-requests', require('./routes/hr-registration-requests-routes')(pool));

// Register Performance Engine (Phase 2)
require('./routes/performance-engine-routes')(app, pool);

app.get('/api/roles', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [roles] = await connection.query('SELECT * FROM roles');
    connection.release();
    res.json(roles);
  } catch (error) {
    console.error('Error fetching roles:', error.message);
    res.status(500).json({ error: 'Failed to fetch roles', details: error.message });
  } finally {
    if (connection) connection.release();
  }
});

app.get('/api/roles/:roleId/permissions', async (req, res) => {
  let connection;
  try {
    const { roleId } = req.params;
    connection = await pool.getConnection();
    const [permissions] = await connection.query('SELECT * FROM permissions WHERE role_id = ?', [roleId]);
    connection.release();
    res.json(permissions);
  } catch (error) {
    console.error('Error fetching permissions:', error.message);
    res.status(500).json({ error: 'Failed to fetch permissions', details: error.message });
  } finally {
    if (connection) connection.release();
  }
});

app.post('/api/roles/:roleId/permissions', async (req, res) => {
  let connection;
  try {
    const { roleId } = req.params;
    const { module_name, can_create, can_read, can_update, can_delete } = req.body;

    connection = await pool.getConnection();
    
    await connection.query(
      'INSERT INTO permissions (role_id, module_name, can_create, can_read, can_update, can_delete) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE can_create=?, can_read=?, can_update=?, can_delete=?',
      [roleId, module_name, can_create, can_read, can_update, can_delete, can_create, can_read, can_update, can_delete]
    );

    connection.release();
    res.json({ success: true, message: 'Permission updated successfully' });
  } catch (error) {
    console.error('Error updating permission:', error.message);
    res.status(500).json({ error: 'Failed to update permission', details: error.message });
  } finally {
    if (connection) connection.release();
  }
});

app.post('/api/auth/check-permission', async (req, res) => {
  try {
    const { userId, module, action } = req.body;

    const hasPermission = await checkPermission(userId, module, action);

    res.json({ 
      success: true,
      hasPermission
    });

  } catch (error) {
    console.error('Permission check error:', error.message);
    res.status(500).json({ error: 'Failed to check permission', details: error.message });
  }
});

const setupEntitiesRoutes = require('./routes/entities-routes');
const setupActivitiesNotesRoutes = require('./routes/activities-notes-routes');
const setupTasksProjectsRoutes = require('./routes/tasks-projects-routes');
const setupEstimationsPipelineFilesRoutes = require('./routes/estimations-pipeline-files-routes');
const setupLeadsDealsRolesRoutes = require('./routes/leads-deals-roles-routes');
const setupInvoicesCampaignsCallsRoutes = require('./routes/invoices-campaigns-calls-routes');
const setupFilesConversationsRoutes = require('./routes/files-conversations-routes');
const setupAutomationRoutes = require('./routes/automation-routes');
const setupItKanbanRoutes = require('./routes/it-kanban-routes');
const setupApprovalRoutes = require('./routes/approval-routes');
const setupPerformanceRoutes = require('./routes/performance-routes');
const setupReminderRoutes = require('./routes/reminder-routes');
const setupRBACRoutes = require('./routes/rbac-routes');
const setupReportingRoutes = require('./routes/reporting-routes');
const setupDepartmentDashboardRoutes = require('./routes/department-dashboard-routes');
const setupMarketingITWorkflowRoutes = require('./routes/marketing-it-workflow-routes');
const setupFollowupsRoutes = require('./routes/followups-routes');
const setupNotificationsRoutes = require('./routes/notifications-routes');
const setupSprintsRoutes = require('./routes/sprints-routes');
const setupImportRoutes = require('./routes/import-routes');
const setupGithubRoutes = require('./routes/github-routes');
const setupItServicesRoutes = require('./routes/it-services-routes');

setupEntitiesRoutes(app, pool);
setupActivitiesNotesRoutes(app, pool);
setupTasksProjectsRoutes(app, pool);
setupEstimationsPipelineFilesRoutes(app, pool);
setupLeadsDealsRolesRoutes(app, pool);
setupInvoicesCampaignsCallsRoutes(app, pool);
setupFilesConversationsRoutes(app, pool);
setupAutomationRoutes(app, pool);
setupItKanbanRoutes(app, pool);
setupApprovalRoutes(app, pool);
setupPerformanceRoutes(app, pool);
setupReminderRoutes(app, pool);
setupRBACRoutes(app, pool);
setupReportingRoutes(app, pool);
setupDepartmentDashboardRoutes(app, pool);
setupMarketingITWorkflowRoutes(app, pool);
setupFollowupsRoutes(app, pool);
setupNotificationsRoutes(app, pool);
setupSprintsRoutes(app, pool);
setupImportRoutes(app, pool);
setupGithubRoutes(app, pool);
require('./routes/calendar-routes')(app, pool);
require('./routes/admin-dashboard-routes')(app, pool);
setupItServicesRoutes(app, pool);

const testerDashboardRoutes = require('./routes/tester-dashboard-routes');
app.use('/api/tester', testerDashboardRoutes);

// Root route serves the React app index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'), (err) => {
    if (err) {
      res.status(500).send('Error loading application. Please ensure the client is built.');
    }
  });
});

// SPA fallback for all other non-API routes
app.get(/.*/, (req, res, next) => {
  // If it's an API route or looks like a static asset request (has an extension), fall through
  if (req.path.startsWith('/api') || req.path.includes('.')) {
    return next();
  }
  res.sendFile(path.join(clientBuildPath, 'index.html'), (err) => {
    if (err) {
      next();
    }
  });
});

app.use((req, res) => {
  console.log(`404 at ${req.method} ${req.url}`);
  res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
});

app.use((err, req, res, next) => {
  // Rejected uploads are the client's mistake, not a server failure.
  if (err && (err.code === 'UPLOAD_TYPE_NOT_ALLOWED' || err.code === 'LIMIT_FILE_SIZE')) {
    return res.status(400).json({
      error: err.code === 'LIMIT_FILE_SIZE' ? 'File is too large (max 25 MB)' : err.message
    });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: NODE_ENV === 'production' ? 'Internal server error' : err.message 
  });
});

const server = app.listen(PORT, async () => {
  console.log('================================================');
  console.log(`🚀 CRM Backend Server has STARTED!`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log(`📁 Upload Directory: ${UPLOAD_DIR}`);
  console.log(`🔗 API Base: http://localhost:${PORT}/api`);
  console.log(`🔐 CORS Allowed: ${process.env.CORS_ORIGIN}`);
  console.log('================================================');
  await testConnection();
  
  // Reminders and alerts go out through the in-app notification system.
  automationService.setNotifier(app.locals.createNotification);

  // First run a minute after startup (so a restart doesn't delay reminders by an hour),
  // then hourly. Each reminder is sent at most once per item per day, so re-runs are safe.
  const runAutomation = () => automationService.runAllChecks()
    .catch(err => console.error('Automation run failed:', err.message));
  setTimeout(runAutomation, 60 * 1000);
  setInterval(runAutomation, 60 * 60 * 1000);

  console.log('✓ Automation checks scheduled (first run in 1 minute, then hourly)');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use by another process! Please free port ${PORT} or change PORT in .env.`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('uncaughtException', (err) => {
  console.error('🔥 Uncaught Exception detected:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = server;
// restart trigger 08/26/2026 17:59:54

// trigger restart

// trigger restart 2

// trigger restart 3

// trigger restart 5 - port 5001

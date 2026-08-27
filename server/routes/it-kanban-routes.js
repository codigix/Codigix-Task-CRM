const OpenAI = require('openai');
const nodemailer = require('nodemailer');
const { resolvePrefix, nextIssueKey } = require('../utils/issueKeys');

// Matches the definition of finished work used by sprint completion and the UI.
const isDoneStatus = (s) => ['DONE', 'COMPLETED', 'CLOSED'].includes(String(s || '').toUpperCase().trim());

// A subtask records completion two ways — a `completed` boolean and a `status` string.
// Either one counting as done keeps the check honest if only one was written.
const isSubtaskDone = (s) => {
  if (!s || typeof s !== 'object') return true; // Malformed entries must not block anyone.
  return s.completed === true || isDoneStatus(s.status);
};

module.exports = function setupItKanbanRoutes(app, pool) {
  const db = {
    query: (sql, params) => pool.query(sql, params)
  };

  /**
   * Works out who performed an action, so notifications name a person rather than "Someone".
   * Prefers the x-user-name header, falls back to looking up x-user-id, then to a
   * caller-supplied hint (e.g. the issue's reporter, which the create drawers set to
   * the logged-in user).
   */
  const resolveActorName = async (req, fallback) => {
    const headerName = req.headers['x-user-name'];
    if (headerName && String(headerName).trim()) return String(headerName).trim();

    const headerId = req.headers['x-user-id'];
    if (headerId) {
      try {
        const [rows] = await db.query(
          "SELECT TRIM(CONCAT(COALESCE(first_name,''), ' ', COALESCE(last_name,''))) AS name, username FROM users WHERE id = ?",
          [headerId]
        );
        if (rows.length > 0) return rows[0].name || rows[0].username;
      } catch (e) {
        console.error('Could not resolve actor from x-user-id:', e.message);
      }
    }

    if (fallback && String(fallback).trim() && fallback !== 'Unassigned') return String(fallback).trim();
    return 'Someone';
  };

  /**
   * Raises the in-app "assigned to you" notification.
   * Fire-and-forget: a notification failure must never break the save that triggered it,
   * and we skip it when someone assigns work to themselves.
   */
  const notifyAssignment = async ({ req, assigneeName, issueKey, issueTitle, department, isSubtask = false, fallbackActor }) => {
    if (!assigneeName || assigneeName === 'Unassigned') return;
    const createNotification = req.app.locals.createNotification;
    if (typeof createNotification !== 'function') return;

    const actor = await resolveActorName(req, fallbackActor);
    const label = isSubtask ? 'subtask' : 'issue';

    createNotification({
      userName: assigneeName,
      type: 'assignment',
      title: `${issueKey} assigned to you`,
      message: `${actor} assigned the ${label} "${issueTitle || issueKey}" to you`,
      actorName: actor,
      entityType: isSubtask ? 'subtask' : 'issue',
      entityKey: issueKey,
      link: `/${String(department || 'IT').toLowerCase() === 'marketing' ? 'marketing' : 'it'}`,
      excludeUserId: req.headers['x-user-id']
    }).catch(err => console.error('Failed to send assignment notification:', err.message));
  };

  /**
   * Turns an assignee's display name into an email address.
   *
   * Work items store the assignee as a name, and names are not unique — two people here
   * share "abhijit khedekar" and two share "Ashwini khedekar". Taking the first match sent
   * assignment mail to the wrong person, so the ticket's own department breaks the tie.
   * A name that is still ambiguous after that is skipped rather than mailed to a guess.
   */
  const getAssigneeEmail = async (assigneeName, department) => {
    if (!assigneeName || assigneeName === 'Unassigned') return null;
    if (assigneeName.includes('@')) return assigneeName;
    try {
      const [users] = await db.query(
        "SELECT email, department FROM users WHERE CONCAT(first_name, ' ', last_name) = ? OR first_name = ? OR email = ?",
        [assigneeName, assigneeName, assigneeName]
      );
      if (users.length === 0) return null;
      if (users.length === 1) return users[0].email;

      const norm = (d) => String(d || '').replace(/\s*department\s*$/i, '').trim().toLowerCase();
      const target = norm(department);
      const sameDept = users.filter(u => norm(u.department) === target);

      if (sameDept.length === 1) return sameDept[0].email;

      console.warn(
        `⚠️ "${assigneeName}" matches ${users.length} users` +
        `${target ? ` (${sameDept.length} in ${department})` : ''} — assignment email skipped ` +
        'rather than sent to the wrong person.'
      );
      return null;
    } catch (e) {
      console.error('Failed to get assignee email:', e);
    }
    return null;
  };

  const sendAssignmentEmail = async (assigneeEmail, assigneeName, ticketKey, ticketTitle, ticketType, ticketDescription, ticketStatus, ticketPriority, ticketDepartment) => {
    const SMTP_HOST = process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp.gmail.com';
    const SMTP_PORT = process.env.EMAIL_PORT || process.env.SMTP_PORT || '587';
    const SMTP_USER = process.env.EMAIL_USER || process.env.SMTP_USER;
    const SMTP_PASS = process.env.EMAIL_PASS || process.env.SMTP_PASS;

    if (!SMTP_USER || !SMTP_PASS) {
      console.warn('⚠️ SMTP credentials missing. Cannot send assignment notification email.');
      return false;
    }

    try {
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: parseInt(SMTP_PORT),
        secure: SMTP_PORT == 465,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS
        }
      });

      const clientBaseUrl = process.env.CLIENT_URL || process.env.CORS_ORIGIN || 'http://localhost:3001';
      // Point at the assignee's own workspace. This was hardcoded to /it/..., so someone
      // assigned a Marketing ticket landed on the IT board looking at another department.
      const workspace = String(ticketDepartment || '')
        .replace(/\s*department\s*$/i, '').trim().toLowerCase() === 'marketing' ? 'marketing' : 'it';
      const link = `${clientBaseUrl}/${workspace}/employee/${workspace}/tasks?ticketKey=${ticketKey}`;

      const mailOptions = {
        from: `"CRM Notifications" <${SMTP_USER}>`,
        to: assigneeEmail,
        subject: `[CRM Notification] New Task Assigned: ${ticketTitle} (${ticketKey})`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <div style="background-color: #3b82f6; padding: 15px; text-align: center; border-radius: 6px 6px 0 0;">
              <h2 style="color: white; margin: 0; font-size: 18px;">New Task Assigned</h2>
            </div>
            <div style="padding: 20px; color: #333333; line-height: 1.6;">
              <p>Hello <strong>${assigneeName}</strong>,</p>
              <p>You have been assigned a new task/issue in the IT Operations Dashboard:</p>
              
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; width: 30%;">Task Key</td>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;">${ticketKey}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Title</td>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;">${ticketTitle}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Type</td>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;">${ticketType || 'Task'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Priority</td>
                  <td style="padding: 8px; border-bottom: 1px solid #eee; color: ${ticketPriority === 'High' ? '#ef4444' : '#f97316'}; font-weight: bold;">${ticketPriority || 'Medium'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Status</td>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;"><span style="background-color: #eff6ff; color: #1e3a8a; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; border: 1px solid #bfdbfe;">${ticketStatus || 'TO DO'}</span></td>
                </tr>
              </table>

              <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; border-left: 4px solid #3b82f6; margin-bottom: 25px;">
                <h4 style="margin: 0 0 8px 0; font-size: 12px; color: #4b5563; text-transform: ;">Description</h4>
                <p style="margin: 0; font-size: 13px; color: #1f2937;">${ticketDescription || 'No description provided.'}</p>
              </div>

              <div style="text-align: center;">
                <a href="${link}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 14px; display: inline-block;">View Task in Portal</a>
              </div>
            </div>
            <div style="background-color: #f3f4f6; padding: 10px; text-align: center; font-size: 11px; color: #6b7280; border-radius: 0 0 6px 6px;">
              This is an automated notification. Please do not reply to this email.
            </div>
          </div>
        `
      };

      const info = await transporter.sendMail(mailOptions);
      // Log what the mail server actually said, not just that we tried. "Accepted" with a
      // 250 means delivery is the receiving server's responsibility from here — which is the
      // difference between "we failed to send" and "it was delivered but filed as spam".
      console.log(
        `✉️ Assignment email for ${ticketKey} → ${assigneeEmail}\n` +
        `   accepted: ${JSON.stringify(info.accepted)}  rejected: ${JSON.stringify(info.rejected)}\n` +
        `   server said: ${info.response}\n` +
        `   messageId: ${info.messageId}`
      );
      return true;
    } catch (error) {
      console.error('❌ Failed to send assignment notification email:', error.message);
      return false;
    }
  };

  // ── AI Provider Configuration (supports DeepSeek, OpenAI & Gemini) ──
  const aiProvider = (process.env.AI_PROVIDER || 'deepseek').toLowerCase();

  let aiClient, aiModel, aiModelReasoning;
  if (aiProvider === 'deepseek') {
    aiClient = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey: process.env.DEEPSEEK_API_KEY || 'disabled-key'
    });
    aiModel = 'deepseek-chat';           // Fast general model
    aiModelReasoning = 'deepseek-reasoner'; // R1 deep reasoning model
    console.log('🤖 AI Provider: DeepSeek (deepseek-chat / deepseek-reasoner)');
  } else if (aiProvider === 'gemini') {
    aiClient = new OpenAI({
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || 'disabled-key'
    });
    aiModel = 'gemini-1.5-flash';
    aiModelReasoning = 'gemini-1.5-flash';
    console.log('🤖 AI Provider: Gemini (gemini-1.5-flash via OpenAI SDK)');
  } else {
    aiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'disabled-key'
    });
    aiModel = 'gpt-4o';
    aiModelReasoning = 'gpt-4o';
    console.log('🤖 AI Provider: OpenAI (gpt-4o)');
  }

  // Helper: check if the active provider's API key exists
  const hasApiKey = () => {
    if (aiProvider === 'deepseek') return !!process.env.DEEPSEEK_API_KEY;
    if (aiProvider === 'gemini') return !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
    return !!process.env.OPENAI_API_KEY;
  };

  // Helper: safe JSON parse from AI response (DeepSeek may wrap in markdown)
  const safeParseJSON = (text) => {
    // Strip markdown code fences if present
    let cleaned = text.trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
    else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
    return JSON.parse(cleaned.trim());
  };

  const responseError = (res, statusCode, message, error) => {
    console.error(`Error: ${message}`, error?.message || error);
    return res.status(statusCode).json({ error: message, details: error?.message || error });
  };

  const generateSmartFallback = (title = '', description = '', fallbackType = 'description', key = 'WR-101', developers = []) => {
    const devList = developers.length > 0 ? developers : ['Olivia Taylor', 'Michael Brown', 'Sophia Davis', 'Emma Johnson'];

    // Clean title and description of HTML tags and formatting
    const cleanTitle = title.replace(/<\/?[^>]+(>|$)/g, " ").replace(/\s+/g, " ").trim() || 'Issue';
    let cleanDesc = (description || '')
      .split(/<hr[^>]*>/i)[0]
      .split(/✨|AI Assist|AI Enterprise|AI improved|Local Engine/i)[0]
      .replace(/<\/?[^>]+(>|$)/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanDesc || cleanDesc === 'Add a description...' || cleanDesc === 'None') {
      cleanDesc = `Implement the requirements specified in the title: "${cleanTitle}".`;
    }

    // Extract sentences from cleanDesc to use as dynamic context
    const sentences = cleanDesc
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 10 && !s.toLowerCase().includes('generated via') && !s.toLowerCase().includes('local engine'));

    // Categorization keyword checks
    const combinedText = `${cleanTitle} ${cleanDesc}`.toLowerCase();
    let category = 'General';
    if (combinedText.includes('testing') || combinedText.includes('test ') || combinedText.includes('qa') || combinedText.includes('verification')) {
      category = 'Testing';
    } else if (combinedText.includes('database') || combinedText.includes('db ') || combinedText.includes('schema') || combinedText.includes('sql') || combinedText.includes('migration') || combinedText.includes('table')) {
      category = 'Database';
    } else if (combinedText.includes('login') || combinedText.includes('auth') || combinedText.includes('mfa') || combinedText.includes('signup') || combinedText.includes('credential')) {
      category = 'Authentication';
    } else if (combinedText.includes('api') || combinedText.includes('endpoint') || combinedText.includes('route') || combinedText.includes('controller') || combinedText.includes('backend')) {
      category = 'Backend API';
    } else if (combinedText.includes('file') || combinedText.includes('upload') || combinedText.includes('download') || combinedText.includes('pdf') || combinedText.includes('image')) {
      category = 'Document Management';
    } else if (combinedText.includes('frontend') || combinedText.includes('ui') || combinedText.includes('ux') || combinedText.includes('component') || combinedText.includes('form') || combinedText.includes('view') || combinedText.includes('css')) {
      category = 'Frontend UI';
    }

    if (fallbackType === 'description') {
      const plainText = (cleanDesc || '')
        .replace(/<[^>]+>/g, '')
        .replace(/✨\s*AI Enterprise.*$/gm, '')
        .trim();

      // If user provided their own description text, format & preserve THEIR exact structure line by line!
      if (plainText.length > 10) {
        const knownHeaders = [
          'summary', 'context', 'acceptance criteria', 'user roles', 'system flow',
          'admin dashboard', 'client management', 'student (mentor) management', 'package management',
          'reports & analytics', 'user management', 'student (mentor) dashboard', 'assigned client management',
          'remedy assignment', 'follow-up tracking', 'notes management', 'progress monitoring',
          'client activity tracking', 'client dashboard', 'profile management', 'remedy tracking',
          'follow-up schedule', 'progress tracking', 'document upload', 'session history',
          'remedies management', 'follow-up management', 'client pwa', 'push notifications',
          'other information', 'major database tables', 'future enhancements', 'overview', 'user story'
        ];

        const isSubLabel = (line) => /^(features|information|supported packages|reports|filters|roles|fields|types|status|displays|view|supported files|proof types|frequency|package types|supported devices|notification types|examples|major database tables):/i.test(line);

        const lines = plainText
          .split('\n')
          .map(l => l.trim())
          .filter(l => l.length > 0);

        const outputLines = [];

        lines.forEach((line) => {
          const lower = line.toLowerCase().replace(/[:\*\#]/g, '').trim();
          const isHeader = knownHeaders.includes(lower) || line.startsWith('###') || (line.endsWith(':') && !isSubLabel(line) && line.length < 45);

          if (isHeader) {
            const cleanHeader = line.replace(/^#+\s*/, '').replace(/[\*:]+$/, '').trim();
            const titleCased = cleanHeader.charAt(0).toUpperCase() + cleanHeader.slice(1);
            outputLines.push(`\n${titleCased}`);
          } else if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
            const bulletContent = line.replace(/^[•\-\*]\s*/, '').trim();
            outputLines.push(`• ${bulletContent}`);
          } else if (isSubLabel(line)) {
            outputLines.push(`\n${line}`);
          } else {
            // Short feature item under section -> convert to bullet item
            if (line.length < 50 && !line.endsWith('.') && !line.includes('Infotech') && !line.includes('System Owner')) {
              outputLines.push(`• ${line}`);
            } else {
              outputLines.push(line);
            }
          }
        });

        return outputLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
      }

      // Default template only if description is completely empty
      return `Summary
Feature implementation for "${cleanTitle}".

Context
The system manages component workflows and database persistence for "${cleanTitle}".

Key Specifications & Requirements
• Design and configure user interface components supporting "${cleanTitle}"
• Build REST API router endpoints, validation logic & error responses
• Integrate database schema models & persistence checks for "${cleanTitle}"
• Run automated unit tests & cross-browser QA assertions

Acceptance Criteria
1. Given the user opens ticket details for "${cleanTitle}", Then all parameters load cleanly.
2. Given input values are valid, When saved, Then changes persist in database.`.trim();
    }

    if (fallbackType === 'subtasks') {
      const subtaskTitles = [];

      // 1. Extract actionable bullet points or list items from description
      const plainDesc = cleanDesc
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<\/h[1-6]>/gi, '\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .trim();

      const lines = plainDesc
        .split(/\n+/)
        .map(l => l.replace(/^[•\-\*\d\.\s]+/, '').trim())
        .filter(l => l.length > 8 && !l.toLowerCase().includes('overview') && !l.toLowerCase().includes('user story') && !l.toLowerCase().includes('technical notes') && !l.toLowerCase().includes('acceptance criteria'));

      lines.forEach(line => {
        if (subtaskTitles.length < 6) {
          subtaskTitles.push(line);
        }
      });

      // 2. Keyword-based dynamic technical subtasks derived from title and description
      const fullText = (cleanTitle + ' ' + plainDesc).toLowerCase();

      if (fullText.includes('auth') || fullText.includes('login') || fullText.includes('permission') || fullText.includes('user')) {
        subtaskTitles.push(`Configure authentication middleware & role-based access for ${cleanTitle}`);
      }

      if (fullText.includes('db') || fullText.includes('database') || fullText.includes('schema') || fullText.includes('table') || fullText.includes('model')) {
        subtaskTitles.push(`Design database table structures & schema migrations for ${cleanTitle}`);
      }

      if (fullText.includes('api') || fullText.includes('endpoint') || fullText.includes('router') || fullText.includes('backend') || fullText.includes('server')) {
        subtaskTitles.push(`Build REST API router endpoints, validation logic & error handlers for ${cleanTitle}`);
      }

      if (fullText.includes('ui') || fullText.includes('component') || fullText.includes('view') || fullText.includes('form') || fullText.includes('frontend') || fullText.includes('page')) {
        subtaskTitles.push(`Develop interactive UI components & frontend state logic for ${cleanTitle}`);
      }

      if (fullText.includes('test') || fullText.includes('qa') || fullText.includes('validation')) {
        subtaskTitles.push(`Write unit & integration test suites for ${cleanTitle}`);
      }

      if (fullText.includes('doc') || fullText.includes('swagger') || fullText.includes('export') || fullText.includes('report')) {
        subtaskTitles.push(`Create API technical documentation & user guide for ${cleanTitle}`);
      }

      // 3. Dynamic fallbacks derived specifically from cleanTitle
      if (subtaskTitles.length < 1) {
        subtaskTitles.push(`Initialize core project architecture & module setup for ${cleanTitle}`);
      }
      if (subtaskTitles.length < 2) {
        subtaskTitles.push(`Build data structures & backend business logic handlers for ${cleanTitle}`);
      }
      if (subtaskTitles.length < 3) {
        subtaskTitles.push(`Create responsive user interface views & form controls for ${cleanTitle}`);
      }
      if (subtaskTitles.length < 4) {
        subtaskTitles.push(`Implement API routing, payload validation & error responses for ${cleanTitle}`);
      }
      if (subtaskTitles.length < 5) {
        subtaskTitles.push(`Run QA test suite, edge-case validation & cross-device checks for ${cleanTitle}`);
      }

      // Deduplicate subtask titles
      const uniqueSubtasks = Array.from(new Set(subtaskTitles)).slice(0, 6);

      return uniqueSubtasks.map((stTitle, idx) => {
        const categories = ['Backend API', 'Frontend UI', 'Database', 'Testing', 'DevOps'];
        const selectedCat = categories[idx % categories.length];
        return {
          title: stTitle,
          description: `Implement, execute and verify the specifications regarding "${stTitle}".`,
          estimated_hours: [4, 6, 8, 4, 6][idx % 5],
          priority: ['High', 'Medium', 'Low'][idx % 3],
          suggested_assignee: 'Unassigned',
          dependencies: idx === 0 ? 'None' : uniqueSubtasks[idx - 1].substring(0, 50),
          labels: [selectedCat],
          sprint: 'Sprint 1',
          complexity: [4, 6, 8, 4, 6][idx % 5] > 6 ? 'High' : ([4, 6, 8, 4, 6][idx % 5] > 4 ? 'Medium' : 'Low'),
          category: selectedCat
        };
      });
    }

    if (fallbackType === 'docs') {
      let plan = '';
      let qa = '';
      let deploy = '';
      let rollback = '';
      let apiDoc = '';
      let userDoc = '';

      if (category === 'auth') {
        plan = `<ol class="list-decimal pl-4 space-y-1"><li>Draft user tables containing hashed password attributes.</li><li>Create auth routers wrapping jsonwebtoken.</li><li>Design Login page components.</li></ol>`;
        qa = `<ul class="list-disc pl-4 space-y-1"><li>Assert invalid emails fail form verification.</li><li>Verify token cookies cannot be read by browser script injection.</li></ul>`;
        deploy = `<ul class="list-disc pl-4 space-y-1"><li>Run db migrations to deploy user credentials attributes.</li><li>Restart production backend service.</li></ul>`;
        rollback = `<ul class="list-disc pl-4 space-y-1"><li>Run migration rollback script.</li><li>Restore backup configurations files.</li></ul>`;
        apiDoc = `<p><strong>POST /api/auth/login</strong></p><p>Returns user token cookie upon verification.</p>`;
        userDoc = `<p>Click sign-in button in top navigation. Input email and credentials to enter CRM panel.</p>`;
      } else if (category === 'frontend') {
        plan = `<ol class="list-decimal pl-4 space-y-1"><li>Establish component code files structures.</li><li>Connect state selectors loading parent models.</li><li>Design responsive grid borders.</li></ol>`;
        qa = `<ul class="list-disc pl-4 space-y-1"><li>Confirm interactive buttons trigger actions.</li><li>Validate layout borders adjust on mobile screens.</li></ul>`;
        deploy = `<ul class="list-disc pl-4 space-y-1"><li>Rebuild client static output artifacts.</li><li>Publish bundle files to frontend host.</li></ul>`;
        rollback = `<ul class="list-disc pl-4 space-y-1"><li>Deploy stable build bundle matching last Git tag commit.</li></ul>`;
        apiDoc = `<p>Does not contain backend routes changes.</p>`;
        userDoc = `<p>Component updates directly on corresponding screen. View statistics layout on main sidebar link.</p>`;
      } else if (category === 'database') {
        plan = `<ol class="list-decimal pl-4 space-y-1"><li>Draft schema ERD layout diagrams.</li><li>Initialize migration files directory.</li><li>Configure relational table indexing rules.</li></ol>`;
        qa = `<ul class="list-disc pl-4 space-y-1"><li>Assert foreign keys fail invalid insertions.</li><li>Measure index lookup speeds.</li></ul>`;
        deploy = `<ul class="list-disc pl-4 space-y-1"><li>Connect production DB console.</li><li>Apply upgrade database migration files.</li></ul>`;
        rollback = `<ul class="list-disc pl-4 space-y-1"><li>Run db downgrade migration scripts.</li></ul>`;
        apiDoc = `<p>Updates tables columns definitions. Verify models files in backend.</p>`;
        userDoc = `<p>Maintains persistent CRM lists. Works automatically in database background.</p>`;
      } else if (category === 'api') {
        plan = `<ol class="list-decimal pl-4 space-y-1"><li>Generate backend routes controllers.</li><li>Construct validation schema models.</li><li>Configure express server routes endpoints mapping.</li></ol>`;
        qa = `<ul class="list-disc pl-4 space-y-1"><li>Test API routes return 400 when keys are missing.</li><li>Verify CRUD operation payloads match DB types.</li></ul>`;
        deploy = `<ul class="list-disc pl-4 space-y-1"><li>Merge code changes to main trunk.</li><li>Restart production application servers.</li></ul>`;
        rollback = `<ul class="list-disc pl-4 space-y-1"><li>Revert API code changes commit to stable checkout.</li></ul>`;
        apiDoc = `<p><strong>POST /api/it-kanban/issues</strong></p><p>Creates new ticket with title and status parameters.</p>`;
        userDoc = `<p>Provides network API interfaces. Used directly by client applications.</p>`;
      } else if (category === 'document') {
        plan = `<ol class="list-decimal pl-4 space-y-1"><li>Import multer middleware.</li><li>Configure upload folder file paths.</li><li>Build attachment components views.</li></ol>`;
        qa = `<ul class="list-disc pl-4 space-y-1"><li>Test uploading file sizes larger than 10MB fails.</li><li>Verify files save to correct disk pathways.</li></ul>`;
        deploy = `<ul class="list-disc pl-4 space-y-1"><li>Create storage directories on target host server.</li><li>Deploy backend changes.</li></ul>`;
        rollback = `<ul class="list-disc pl-4 space-y-1"><li>Restore client panel components to previous commit.</li></ul>`;
        apiDoc = `<p><strong>POST /api/documents/upload</strong></p><p>Payload: multipart/form-data. Returns file path string.</p>`;
        userDoc = `<p>Drag and drop files onto client screens directly to upload files. Click files lists to view attachments.</p>`;
      } else {
        plan = `<ol class="list-decimal pl-4 space-y-1"><li>Read task details requirements.</li><li>Build client widgets and server API.</li><li>Conduct verification checks.</li></ol>`;
        qa = `<ul class="list-disc pl-4 space-y-1"><li>Verify main user scenarios succeed without errors.</li></ul>`;
        deploy = `<ul class="list-disc pl-4 space-y-1"><li>Push commit changes to repository production branch.</li></ul>`;
        rollback = `<ul class="list-disc pl-4 space-y-1"><li>Revert to last stable release commit state.</li></ul>`;
        apiDoc = `<p>No routing changes introduced.</p>`;
        userDoc = `<p>Feature integrates on IT Operations Kanban board. Access parent card to view details.</p>`;
      }

      return {
        summary: `<p>A comprehensive task resolving issue <strong>"${title}"</strong> to secure operations.</p>`,
        implementation_plan: plan,
        qa_checklist: qa,
        deployment_checklist: deploy,
        rollback_checklist: rollback,
        api_documentation: apiDoc,
        user_documentation: userDoc
      };
    }
  };

  // Auto-migrate columns onto it_kanban_issues if missing.
  // labels / story_points / flagged / parent_id back the fields the create drawers collect.
  (async () => {
    const wanted = [
      { name: 'department', definition: "VARCHAR(50) DEFAULT 'IT'" },
      { name: 'labels', definition: 'JSON' },
      { name: 'story_points', definition: 'VARCHAR(20)' },
      { name: 'flagged', definition: 'TINYINT(1) DEFAULT 0' },
      { name: 'parent_id', definition: 'INT' }
    ];
    try {
      const [cols] = await pool.query('DESCRIBE it_kanban_issues');
      const colNames = cols.map(c => c.Field);
      for (const col of wanted) {
        if (!colNames.includes(col.name)) {
          await pool.query(`ALTER TABLE it_kanban_issues ADD COLUMN ${col.name} ${col.definition}`);
          console.log(`Added '${col.name}' column to 'it_kanban_issues' table.`);
        }
      }
    } catch (e) {
      console.error('Error migrating columns on it_kanban_issues:', e.message);
    }

    // Audit trail behind the History tab: one row per field change.
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS it_kanban_history (
          id INT AUTO_INCREMENT PRIMARY KEY,
          issue_key VARCHAR(50) NOT NULL,
          field VARCHAR(64) NOT NULL,
          old_value TEXT,
          new_value TEXT,
          changed_by VARCHAR(120) DEFAULT 'System',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_issue_key (issue_key),
          INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    } catch (e) {
      console.error('Error creating it_kanban_history:', e.message);
    }

    // Time entries behind the Work log tab.
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS it_kanban_worklogs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          issue_key VARCHAR(50) NOT NULL,
          author VARCHAR(120) DEFAULT 'Unassigned',
          seconds INT NOT NULL DEFAULT 0,
          description TEXT,
          started_at DATETIME DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_issue_key (issue_key)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    } catch (e) {
      console.error('Error creating it_kanban_worklogs:', e.message);
    }
  })();

  // ── Work-log time helpers ──────────────────────────────────────────────
  // Jira-style duration strings: "3h 30m", "2d", "45m", "1w 2d".
  const parseDurationToSeconds = (input) => {
    if (input === null || input === undefined) return 0;
    const str = String(input).trim().toLowerCase();
    if (!str) return 0;
    if (/^\d+$/.test(str)) return parseInt(str, 10) * 60; // bare number = minutes
    const units = { w: 144000, d: 28800, h: 3600, m: 60 }; // 1d = 8h, 1w = 5d
    let total = 0;
    let matched = false;
    for (const m of str.matchAll(/(\d+(?:\.\d+)?)\s*([wdhm])/g)) {
      total += parseFloat(m[1]) * units[m[2]];
      matched = true;
    }
    return matched ? Math.round(total) : 0;
  };

  const formatSecondsToDuration = (seconds) => {
    const s = Math.max(0, Math.round(Number(seconds) || 0));
    if (s === 0) return '0h';
    const w = Math.floor(s / 144000);
    const d = Math.floor((s % 144000) / 28800);
    const h = Math.floor((s % 28800) / 3600);
    const m = Math.floor((s % 3600) / 60);
    return [w && `${w}w`, d && `${d}d`, h && `${h}h`, m && `${m}m`].filter(Boolean).join(' ');
  };

  // Recomputes time_spent / remaining_estimate from the issue's logged time.
  const recalcIssueTime = async (key) => {
    const [[totals]] = await db.query(
      'SELECT COALESCE(SUM(seconds),0) AS total FROM it_kanban_worklogs WHERE issue_key = ?',
      [key]
    );
    const [[issue]] = await db.query(
      'SELECT original_estimate FROM it_kanban_issues WHERE issue_key = ?',
      [key]
    );
    const spent = Number(totals.total) || 0;
    const original = parseDurationToSeconds(issue?.original_estimate);
    const remaining = original > 0 ? Math.max(0, original - spent) : 0;
    await db.query(
      'UPDATE it_kanban_issues SET time_spent = ?, remaining_estimate = ? WHERE issue_key = ?',
      [formatSecondsToDuration(spent), formatSecondsToDuration(remaining), key]
    );
    return { spentSeconds: spent, remainingSeconds: remaining };
  };

  // GET all kanban issues (supports optional department query parameter)
  /**
   * The labels already in use on a board, most-used first.
   *
   * Offering these when someone types is what stops a label set fragmenting into near
   * duplicates — the main way free-form tags stop being useful.
   */
  app.get('/api/it-kanban/labels', async (req, res) => {
    try {
      const department = String(req.query.department || 'IT').replace(/\s*department\s*$/i, '').trim();
      const [rows] = await db.query(
        'SELECT labels FROM it_kanban_issues WHERE labels IS NOT NULL'
      );

      const counts = new Map();
      for (const row of rows) {
        let list = row.labels;
        if (typeof list === 'string') {
          try { list = JSON.parse(list); } catch (e) { list = []; }
        }
        for (const raw of Array.isArray(list) ? list : []) {
          const label = String(raw || '').trim();
          if (label) counts.set(label, (counts.get(label) || 0) + 1);
        }
      }

      const labels = [...counts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([label, count]) => ({ label, count }));

      res.json(labels);
    } catch (error) {
      responseError(res, 500, 'Failed to fetch labels', error);
    }
  });

  app.get('/api/it-kanban/issues', async (req, res) => {
    try {
      const { department } = req.query;
      // Join the linked project so the details panel can show a real Parent instead of "None".
      let query = `
        SELECT i.*,
               p.name AS parent_project_name,
               COALESCE(p.project_id_code, CONCAT('PRJ-', p.id)) AS parent_project_code,
               -- The real sprint this work belongs to. The 'sprint' column is only a text
               -- label and goes stale the moment an item moves, so anything showing a sprint
               -- should read this instead.
               s.name AS sprint_name,
               s.status AS sprint_status
        FROM it_kanban_issues i
        LEFT JOIN projects p ON p.id = COALESCE(i.parent_id, i.project_id)
        LEFT JOIN sprints s ON s.id = i.sprint_id
      `;
      const params = [];

      // Removed department-based validation so everyone can view tasks of everyone
      /* if (department) {
        query += ' WHERE i.department = ? OR (i.department IS NULL AND ? = "IT")';
        params.push(department, department);
      } */
      // Rank first, so the List and Board show the priority order set by dragging in the
      // Backlog. Unranked rows keep the old newest-first behaviour at the end.
      query += ' ORDER BY i.rank_order IS NULL, i.rank_order ASC, i.created_at DESC';

      const [issues] = await db.query(query, params);

      // Parse JSON fields back to objects for the frontend
      const formattedIssues = issues.map(issue => ({
        ...issue,
        subtasks: typeof issue.subtasks === 'string' ? JSON.parse(issue.subtasks) : (issue.subtasks || []),
        linked_issues: typeof issue.linked_issues === 'string' ? JSON.parse(issue.linked_issues) : (issue.linked_issues || []),
        comments: typeof issue.comments === 'string' ? JSON.parse(issue.comments) : (issue.comments || []),
        labels: typeof issue.labels === 'string' ? JSON.parse(issue.labels) : (issue.labels || [])
      }));

      res.json(formattedIssues);
    } catch (error) {
      responseError(res, 500, 'Failed to fetch Kanban issues', error);
    }
  });

  // POST create a new issue
  app.post('/api/it-kanban/issues', async (req, res) => {
    try {
      const {
        title, type, priority, status, assignee, reporter, team, team_id, project_id,
        description, department, keyPrefix,
        due_date, start_date, sprint, sprint_id, labels, story_points, flagged, parent_id, linked_issues
      } = req.body;

      // Normalise the optional planning fields the create drawers send.
      const toDate = (v) => (v && String(v).trim() ? String(v).slice(0, 10) : null);
      const labelsJson = JSON.stringify(Array.isArray(labels) ? labels.filter(Boolean) : []);
      const linkedJson = JSON.stringify(Array.isArray(linked_issues) ? linked_issues.filter(Boolean) : []);

      const dept = department || 'IT';

      // Created into a sprint that owns a project? Then it belongs to that project — the
      // sprint wins, so a mismatched project on the form cannot contradict the sprint.
      // With no sprint (or a sprint with no project) the caller's choice stands.
      let resolvedProjectId = project_id || null;
      if (sprint_id) {
        const [[s]] = await db.query('SELECT project_id FROM sprints WHERE id = ?', [sprint_id]);
        if (s && s.project_id != null) resolvedProjectId = s.project_id;
      }

      // The key's prefix comes from the project the work belongs to — "bakul catering
      // services" gives BCS-101 — so a key says what it is part of. Work with no project
      // falls back to the department prefix.
      const prefix = await resolvePrefix(db, {
        projectId: resolvedProjectId,
        department: dept,
        fallbackPrefix: keyPrefix
      });
      const newKey = await nextIssueKey(db, prefix);

      const [result] = await db.query(`
        INSERT INTO it_kanban_issues (issue_key, title, type, priority, status, assignee, reporter, team, team_id, project_id, description, department, due_date, start_date, sprint, sprint_id, labels, story_points, flagged, parent_id, subtasks, linked_issues, comments, progress, original_estimate, remaining_estimate, time_spent, components, environment, vulnerability)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, '0h', '0h', '0h', '', '', '')
      `, [
        newKey,
        title,
        type || 'Task',
        priority || 'Medium',
        status || 'TO DO',
        assignee || 'Unassigned',
        reporter || 'Unassigned',
        team || 'None',
        team_id || null,
        resolvedProjectId,
        description || '',
        dept,
        toDate(due_date),
        toDate(start_date),
        sprint || null,
        // Lets the Backlog create work straight into a sprint section; NULL means backlog.
        sprint_id == null || sprint_id === '' ? null : Number(sprint_id),
        labelsJson,
        story_points || null,
        flagged ? 1 : 0,
        parent_id || null,
        JSON.stringify([]),
        linkedJson,
        JSON.stringify([])
      ]);

      // Send assignment email notification asynchronously
      if (assignee && assignee !== 'Unassigned') {
        getAssigneeEmail(assignee, dept).then(email => {
          if (email) {
            sendAssignmentEmail(email, assignee, newKey, title, type, description, status, priority, dept);
          }
        }).catch(err => console.error('Failed to trigger email notify:', err));

        // In-app notification for the person it was assigned to.
        notifyAssignment({
          req,
          assigneeName: assignee,
          issueKey: newKey,
          issueTitle: title,
          department: dept,
          // On creation the reporter is the person filling in the form, so it's a
          // reliable stand-in when the client didn't send the user headers.
          fallbackActor: reporter
        });
      }

      res.status(201).json({
        message: 'Issue created successfully',
        id: result.insertId,
        issue_key: newKey
      });
    } catch (error) {
      responseError(res, 500, 'Failed to create Kanban issue', error);
    }
  });

  // GET attachments for an issue by key
  app.get('/api/it-kanban/issues/:key/attachments', async (req, res) => {
    try {
      const { key } = req.params;
      const [attachments] = await db.query(
        'SELECT * FROM it_kanban_attachments WHERE issue_key = ? ORDER BY uploaded_at DESC',
        [key]
      );
      res.json(attachments);
    } catch (error) {
      responseError(res, 500, 'Failed to fetch attachments', error);
    }
  });

  // POST add attachment to issue
  app.post('/api/it-kanban/issues/:key/attachments', async (req, res) => {
    try {
      const { key } = req.params;
      const { file_name, file_path, file_size, file_type } = req.body;
      const [result] = await db.query(
        'INSERT INTO it_kanban_attachments (issue_key, file_name, file_path, file_size, file_type) VALUES (?, ?, ?, ?, ?)',
        [key, file_name, file_path || '', file_size || '0 KB', file_type || 'document']
      );
      res.status(201).json({ id: result.insertId, issue_key: key, file_name, file_path, file_size, file_type });
    } catch (error) {
      responseError(res, 500, 'Failed to save attachment', error);
    }
  });

  // DELETE attachment by id
  app.delete('/api/it-kanban/attachments/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await db.query('DELETE FROM it_kanban_attachments WHERE id = ?', [id]);
      res.json({ message: 'Attachment deleted successfully' });
    } catch (error) {
      responseError(res, 500, 'Failed to delete attachment', error);
    }
  });

  // PUT update an issue by key
  app.put('/api/it-kanban/issues/:key', async (req, res) => {
    try {
      const { key } = req.params;
      const updates = req.body; // e.g. { status: 'IN PROGRESS', title: 'New Title' }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      // Jira's "all sub-tasks must be resolved" workflow validator. A parent is the unit of
      // commitment, so it must not reach Done while its checklist is unfinished — otherwise
      // a sprint closes with the parent counted complete and open subtasks riding along.
      // Enforced here rather than in the UI because every surface (board drag, backlog
      // dropdown, details panel) writes through this one endpoint.
      if (updates.status && isDoneStatus(updates.status)) {
        // Use the subtasks from this same request when it is also changing them, so a
        // combined update is validated against what is actually being saved.
        let subtasks = updates.subtasks;
        if (subtasks === undefined) {
          const [[row]] = await db.query('SELECT subtasks FROM it_kanban_issues WHERE issue_key = ?', [key]);
          subtasks = row ? row.subtasks : [];
        }
        if (typeof subtasks === 'string') {
          try { subtasks = JSON.parse(subtasks); } catch (e) { subtasks = []; }
        }
        const open = (Array.isArray(subtasks) ? subtasks : []).filter(s => !isSubtaskDone(s));

        if (open.length > 0) {
          return res.status(409).json({
            error: `This work item has ${open.length} unfinished subtask${open.length === 1 ? '' : 's'}. Complete ${open.length === 1 ? 'it' : 'them'} before marking the parent Done.`,
            code: 'SUBTASKS_INCOMPLETE',
            openSubtasks: open.map(s => s.title).filter(Boolean)
          });
        }
      }

      // A work item cannot be its own parent, and cannot adopt one of its own children —
      // either would create a cycle that the board and any roll-up would loop on.
      if (updates.parent_id != null && updates.parent_id !== '') {
        const [[self]] = await db.query('SELECT id FROM it_kanban_issues WHERE issue_key = ?', [key]);
        if (self && Number(updates.parent_id) === Number(self.id)) {
          return res.status(400).json({ error: 'A work item cannot be its own parent.' });
        }
        const [[candidate]] = await db.query('SELECT parent_id FROM it_kanban_issues WHERE id = ?', [updates.parent_id]);
        if (self && candidate && Number(candidate.parent_id) === Number(self.id)) {
          return res.status(400).json({ error: 'That work item is already a child of this one.' });
        }
      }

      // A work item's project follows its sprint, matching what the Backlog's move and drag
      // do: joining a project-owning sprint adopts that project, and returning to the
      // Backlog (sprint_id null) drops it, because backlog work belongs to no project.
      if (Object.prototype.hasOwnProperty.call(updates, 'sprint_id') && updates.project_id === undefined) {
        const joining = updates.sprint_id != null && updates.sprint_id !== '';
        if (joining) {
          const [[s]] = await db.query('SELECT project_id FROM sprints WHERE id = ?', [updates.sprint_id]);
          if (s && s.project_id != null) updates.project_id = s.project_id;
        } else {
          updates.project_id = null;
        }
      }

      const updateFields = [];
      const updateValues = [];

      // Only allow updating these specific fields
      // 'sprint' is a display label; 'sprint_id' is the real membership the board and the
      // backlog filter on, so the details panel has to be able to write it.
      // 'flagged' and 'story_points' are written by the backlog row menu, which mirrors
      // Jira's Add flag and Story point estimate actions.
      const allowedFields = ['title', 'description', 'type', 'priority', 'status', 'assignee', 'reporter', 'team', 'team_id', 'project_id', 'sprint', 'sprint_id', 'parent_id', 'due_date', 'start_date', 'flagged', 'story_points', 'progress', 'original_estimate', 'remaining_estimate', 'time_spent', 'components', 'environment', 'vulnerability'];
      // 'labels' belongs here, not in allowedFields: it is stored as JSON, and without it
      // labels could be set at creation but never changed afterwards.
      const jsonFields = ['subtasks', 'linked_issues', 'comments', 'labels'];

      for (const [field, value] of Object.entries(updates)) {
        if (allowedFields.includes(field)) {
          updateFields.push(`${field} = ?`);
          updateValues.push(value);
        } else if (jsonFields.includes(field)) {
          updateFields.push(`${field} = ?`);
          updateValues.push(typeof value === 'object' ? JSON.stringify(value) : value);
        }
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ error: 'No valid fields provided to update' });
      }

      updateValues.push(key);

      // Check if assignee is updated
      if (updates.assignee) {
        try {
          const [currentIssues] = await db.query(
            "SELECT title, assignee, description, priority, type, status, department, reporter FROM it_kanban_issues WHERE issue_key = ?",
            [key]
          );
          if (currentIssues.length > 0) {
            const currentIssue = currentIssues[0];
            const newAssignee = updates.assignee;
            if (newAssignee !== currentIssue.assignee && newAssignee !== 'Unassigned') {
              getAssigneeEmail(newAssignee, currentIssue.department).then(email => {
                if (email) {
                  sendAssignmentEmail(
                    email,
                    newAssignee,
                    key,
                    updates.title || currentIssue.title,
                    updates.type || currentIssue.type,
                    updates.description || currentIssue.description,
                    updates.status || currentIssue.status,
                    updates.priority || currentIssue.priority,
                    currentIssue.department
                  );
                }
              }).catch(err => console.error('Failed to trigger email notify on update:', err));

              // In-app notification for the newly assigned person.
              notifyAssignment({
                req,
                assigneeName: newAssignee,
                issueKey: key,
                issueTitle: updates.title || currentIssue.title,
                department: currentIssue.department,
                fallbackActor: currentIssue.reporter
              });
            }
          }
        } catch (dbErr) {
          console.error('Failed to query current issue state for assignee check:', dbErr);
        }
      }

      // Subtasks are assigned by rewriting the whole subtasks array, so compare the
      // incoming list against the stored one and notify anyone newly assigned.
      if (updates.subtasks) {
        try {
          const [[stored]] = await db.query(
            'SELECT subtasks, title, department, reporter FROM it_kanban_issues WHERE issue_key = ?',
            [key]
          );
          const parse = (v) => {
            if (!v) return [];
            if (typeof v === 'string') { try { return JSON.parse(v); } catch (e) { return []; } }
            return Array.isArray(v) ? v : [];
          };
          const before = parse(stored?.subtasks);
          const after = parse(updates.subtasks);
          const previousBySt = new Map(before.map(s => [String(s.id), s.assignee || 'Unassigned']));

          after.forEach((st, idx) => {
            const newAssignee = st.assignee;
            if (!newAssignee || newAssignee === 'Unassigned') return;
            if (previousBySt.get(String(st.id)) === newAssignee) return; // unchanged
            notifyAssignment({
              req,
              assigneeName: newAssignee,
              issueKey: `${key}-${idx + 1}`,
              issueTitle: st.title || stored?.title,
              department: stored?.department,
              isSubtask: true,
              fallbackActor: stored?.reporter
            });
          });
        } catch (e) {
          console.error('Failed to check subtask assignment changes:', e.message);
        }
      }

      // Snapshot the fields being changed so we can write an audit trail (History tab).
      let beforeState = null;
      const auditableFields = Object.keys(updates).filter(f => allowedFields.includes(f));
      if (auditableFields.length > 0) {
        try {
          const [rows] = await db.query(
            `SELECT ${auditableFields.map(f => `\`${f}\``).join(', ')} FROM it_kanban_issues WHERE issue_key = ?`,
            [key]
          );
          beforeState = rows[0] || null;
        } catch (e) {
          console.error('Could not snapshot issue before update:', e.message);
        }
      }

      const [result] = await db.query(`
        UPDATE it_kanban_issues
        SET ${updateFields.join(', ')}
        WHERE issue_key = ?
      `, updateValues);

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Issue not found' });
      }

      // Log only fields whose value actually changed.
      if (beforeState) {
        const actor = req.headers['x-user-name'] || updates.updated_by || 'System';
        const norm = (v) => {
          if (v === null || v === undefined) return '';
          if (v instanceof Date) return v.toISOString().slice(0, 10);
          return String(v);
        };
        for (const field of auditableFields) {
          const oldVal = norm(beforeState[field]);
          const newVal = norm(updates[field]);
          if (oldVal === newVal) continue;
          try {
            await db.query(
              'INSERT INTO it_kanban_history (issue_key, field, old_value, new_value, changed_by) VALUES (?, ?, ?, ?, ?)',
              [key, field, oldVal.slice(0, 2000), newVal.slice(0, 2000), actor]
            );
          } catch (e) {
            console.error('Failed to record history entry:', e.message);
          }
        }
      }

      res.json({ message: 'Issue updated successfully' });
    } catch (error) {
      responseError(res, 500, 'Failed to update IT Kanban issue', error);
    }
  });

  // ── HISTORY (audit trail) ─────────────────────────────────────────────
  app.get('/api/it-kanban/issues/:key/history', async (req, res) => {
    try {
      const [rows] = await db.query(
        'SELECT id, field, old_value, new_value, changed_by, created_at FROM it_kanban_history WHERE issue_key = ? ORDER BY created_at DESC, id DESC',
        [req.params.key]
      );
      res.json(rows);
    } catch (error) {
      responseError(res, 500, 'Failed to fetch issue history', error);
    }
  });

  // ── WORK LOG ──────────────────────────────────────────────────────────
  app.get('/api/it-kanban/issues/:key/worklogs', async (req, res) => {
    try {
      const { key } = req.params;
      const [rows] = await db.query(
        'SELECT id, author, seconds, description, started_at, created_at FROM it_kanban_worklogs WHERE issue_key = ? ORDER BY COALESCE(started_at, created_at) DESC, id DESC',
        [key]
      );
      const [[issue]] = await db.query(
        'SELECT original_estimate, remaining_estimate, time_spent FROM it_kanban_issues WHERE issue_key = ?',
        [key]
      );
      const totalSeconds = rows.reduce((sum, r) => sum + (Number(r.seconds) || 0), 0);
      res.json({
        worklogs: rows.map(r => ({ ...r, timeSpent: formatSecondsToDuration(r.seconds) })),
        totalSeconds,
        totalSpent: formatSecondsToDuration(totalSeconds),
        originalEstimate: issue?.original_estimate || '0h',
        remainingEstimate: issue?.remaining_estimate || '0h'
      });
    } catch (error) {
      responseError(res, 500, 'Failed to fetch work logs', error);
    }
  });

  app.post('/api/it-kanban/issues/:key/worklogs', async (req, res) => {
    try {
      const { key } = req.params;
      const { timeSpent, description, author, startedAt, originalEstimate } = req.body;

      const seconds = parseDurationToSeconds(timeSpent);
      if (!seconds) {
        return res.status(400).json({ error: 'Enter time as 3h, 30m, 1d 4h, etc.' });
      }

      // Allow setting the original estimate alongside the first log entry.
      if (originalEstimate) {
        await db.query('UPDATE it_kanban_issues SET original_estimate = ? WHERE issue_key = ?',
          [formatSecondsToDuration(parseDurationToSeconds(originalEstimate)), key]);
      }

      await db.query(
        'INSERT INTO it_kanban_worklogs (issue_key, author, seconds, description, started_at) VALUES (?, ?, ?, ?, ?)',
        [key, author || 'Unassigned', seconds, description || null, startedAt ? String(startedAt).slice(0, 19).replace('T', ' ') : null]
      );

      const totals = await recalcIssueTime(key);
      res.status(201).json({
        success: true,
        totalSpent: formatSecondsToDuration(totals.spentSeconds),
        remainingEstimate: formatSecondsToDuration(totals.remainingSeconds)
      });
    } catch (error) {
      responseError(res, 500, 'Failed to log work', error);
    }
  });

  app.delete('/api/it-kanban/issues/:key/worklogs/:id', async (req, res) => {
    try {
      const { key, id } = req.params;
      const [result] = await db.query('DELETE FROM it_kanban_worklogs WHERE id = ? AND issue_key = ?', [id, key]);
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Work log not found' });
      const totals = await recalcIssueTime(key);
      res.json({
        success: true,
        totalSpent: formatSecondsToDuration(totals.spentSeconds),
        remainingEstimate: formatSecondsToDuration(totals.remainingSeconds)
      });
    } catch (error) {
      responseError(res, 500, 'Failed to delete work log', error);
    }
  });

  // DELETE an issue by key
  app.delete('/api/it-kanban/issues/:key', async (req, res) => {
    try {
      const { key } = req.params;
      const [result] = await db.query('DELETE FROM it_kanban_issues WHERE issue_key = ?', [key]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Issue not found' });
      }

      // Don't leave orphaned audit/worklog rows behind.
      await db.query('DELETE FROM it_kanban_history WHERE issue_key = ?', [key]).catch(() => {});
      await db.query('DELETE FROM it_kanban_worklogs WHERE issue_key = ?', [key]).catch(() => {});

      res.json({ message: 'Issue deleted successfully' });
    } catch (error) {
      responseError(res, 500, 'Failed to delete IT Kanban issue', error);
    }
  });

  // ── AI STAR ASSIST ENDPOINTS ──

  // 1. Improve Description
  app.post('/api/it-kanban/issues/:key/ai/improve-description', async (req, res) => {
    const { key } = req.params;
    try {
      const [rows] = await db.query('SELECT title, description FROM it_kanban_issues WHERE issue_key = ?', [key]);
      if (rows.length === 0) return res.status(404).json({ error: 'Issue not found' });
      const issue = rows[0];

      let improvedDescription = '';
      try {
        if (!hasApiKey()) throw new Error('API key missing');
        const response = await aiClient.chat.completions.create({
          model: aiModel,
          messages: [
            {
              role: "system",
              content: `You are a senior software architect and business analyst. Your job is to read the task title and description VERY carefully, understand the EXACT feature/bug/requirement being described, and then rewrite the description into a comprehensive, professional specification.

IMPORTANT RULES:
- Read every word of the original description. Understand what the user actually wants to build or fix.
- Do NOT produce generic filler text. Every sentence must be SPECIFIC to this exact task.
- Extract actual requirements, screens, components, APIs, database tables, user flows mentioned or implied.
- Organize the improved description using these sections (skip any that don't apply):

1. **Overview** - A clear 2-3 sentence summary of what this task accomplishes, referencing actual feature names, pages, or modules.
2. **User Story** - Write as "As a [specific role], I want [specific action on specific page/feature], so that [specific business value]."
3. **Functional Requirements** - Bullet list of SPECIFIC things the system must do. Reference actual UI elements, API endpoints, database fields, business rules.
4. **Acceptance Criteria** - Numbered checklist using Given/When/Then format with REAL scenarios from the description.
5. **Technical Implementation Notes** - Mention specific technologies, files, components, database tables, API routes relevant to THIS task.
6. **Edge Cases & Error Handling** - List specific edge cases relevant to THIS feature.
7. **Dependencies** - Other tasks, APIs, or systems this depends on.
8. **Testing Scenarios** - Specific test cases for THIS feature.

Format using clean HTML tags (<p>, <strong>, <ul>, <li>, <ol>, <h4>, <em>, <code>). Respond ONLY with HTML content.`
            },
            {
              role: "user",
              content: `Task Title: ${issue.title}\n\nOriginal Description:\n${issue.description || 'No description provided - analyze the title and create a detailed specification based on what the title implies.'}`
            }
          ]
        });

        improvedDescription = response.choices[0].message.content.trim();
      } catch (aiErr) {
        console.warn('AI Call failed, falling back to local description expander:', aiErr.message);
        improvedDescription = generateSmartFallback(issue.title, issue.description || '', 'description', key);
      }

      // Update the DB
      await db.query('UPDATE it_kanban_issues SET description = ? WHERE issue_key = ?', [improvedDescription, key]);

      res.json({ description: improvedDescription });
    } catch (error) {
      responseError(res, 500, 'AI Description generation failed', error);
    }
  });

  // 2. Link Confluence Content
  app.post('/api/it-kanban/issues/:key/ai/link-confluence', async (req, res) => {
    const { key } = req.params;
    try {
      const [rows] = await db.query('SELECT title, description, linked_issues FROM it_kanban_issues WHERE issue_key = ?', [key]);
      if (rows.length === 0) return res.status(404).json({ error: 'Issue not found' });
      const issue = rows[0];

      let suggestions = [];
      try {
        if (!hasApiKey()) throw new Error('API key missing');
        const response = await aiClient.chat.completions.create({
          model: aiModel,
          messages: [
            {
              role: "system",
              content: "You are an AI IT knowledge management assistant. Based on the issue title and description, suggest 2-3 Confluence pages or documentation items that would be helpful for resolving this ticket. Return the suggestions as a JSON array inside a JSON object with key 'suggestions', where each suggestion object has: 'title' (e.g. 'VPN Configuration Guide'), 'url' (e.g. 'https://confluence.internal/vpn-config'), and 'relation' (use 'Confluence'). Respond ONLY in valid JSON format. Example format: { \"suggestions\": [ { \"title\": \"VPN Guide\", \"url\": \"https://confluence.internal/vpn\", \"relation\": \"Confluence\" } ] }"
            },
            {
              role: "user",
              content: `Title: ${issue.title}\nDescription: ${issue.description || 'None'}`
            }
          ],
        });

        const data = safeParseJSON(response.choices[0].message.content);
        suggestions = Array.isArray(data.suggestions) ? data.suggestions : [];
      } catch (aiErr) {
        console.warn('AI Call failed, falling back to local confluence link generator:', aiErr.message);
        suggestions = [
          {
            title: `IT Runbook - ${issue.title} Resolution Playbook`,
            url: `https://confluence.internal/wiki/spaces/IT/pages/Runbook-${key}`,
            relation: 'Confluence'
          },
          {
            title: "Database Indexing & Query Tuning Guidelines",
            url: "https://confluence.internal/wiki/spaces/DEV/pages/DB-Guidelines",
            relation: 'Confluence'
          }
        ];
      }

      // Append these suggestions to linked_issues
      let currentLinked = [];
      if (issue.linked_issues) {
        currentLinked = typeof issue.linked_issues === 'string' ? JSON.parse(issue.linked_issues) : issue.linked_issues;
      }

      const newLinked = [...currentLinked, ...suggestions];

      // Save to database
      await db.query('UPDATE it_kanban_issues SET linked_issues = ? WHERE issue_key = ?', [JSON.stringify(newLinked), key]);

      res.json({ linked_issues: newLinked });
    } catch (error) {
      responseError(res, 500, 'AI Confluence suggestion failed', error);
    }
  });

  // 3. Summarize Comments
  app.post('/api/it-kanban/issues/:key/ai/summarize-comments', async (req, res) => {
    const { key } = req.params;
    try {
      const [rows] = await db.query('SELECT comments FROM it_kanban_issues WHERE issue_key = ?', [key]);
      if (rows.length === 0) return res.status(404).json({ error: 'Issue not found' });
      const issue = rows[0];

      let comments = [];
      if (issue.comments) {
        comments = typeof issue.comments === 'string' ? JSON.parse(issue.comments) : issue.comments;
      }

      if (comments.length === 0) {
        return res.json({ summary: "No comments available to summarize." });
      }

      let summary = '';
      try {
        if (!hasApiKey()) throw new Error('API key missing');
        const commentsText = comments.map(c => `${c.author || 'User'}: ${c.text}`).join('\n');

        const response = await aiClient.chat.completions.create({
          model: aiModel,
          messages: [
            {
              role: "system",
              content: "You are an AI comment summarization assistant. Summarize the following comments on this issue/ticket. Provide a short, bulleted summary of key points and any action items discussed in the comments. Respond in plain text with clean formatting."
            },
            {
              role: "user",
              content: `Comments:\n${commentsText}`
            }
          ]
        });

        summary = response.choices[0].message.content.trim();
      } catch (aiErr) {
        console.warn('AI Call failed, falling back to local comment summarizer:', aiErr.message);
        summary = `
Comment Summary for ${key} (Local Fallback):
- Discussion mostly focuses on task prioritization and testing workflows.
- There are ${comments.length} comment(s) registered on this ticket.
- Action Item: Verify implementation and confirm with assignee.
        `.trim();
      }

      res.json({ summary });
    } catch (error) {
      responseError(res, 500, 'AI Comment summarization failed', error);
    }
  });

  // 4. Suggest Subtasks (Child Work Items)
  app.post('/api/it-kanban/issues/:key/ai/suggest-subtasks', async (req, res) => {
    const { key } = req.params;
    const { title: reqTitle, description: reqDescription } = req.body;
    try {
      const [rows] = await db.query('SELECT title, description FROM it_kanban_issues WHERE issue_key = ?', [key]);
      const issue = rows.length > 0 ? rows[0] : {};
      const title = reqTitle || issue.title || 'Task';
      const description = reqDescription !== undefined ? reqDescription : (issue.description || '');

      let subtasks = [];
      try {
        if (!hasApiKey()) throw new Error('API key missing');
        const response = await aiClient.chat.completions.create({
          model: aiModel,
          messages: [
            {
              role: "system",
              content: "You are an IT project management assistant. Based on the issue title and description, suggest a list of 3-5 subtasks (child work items) needed to complete this ticket. Return the suggestions as a JSON array inside a JSON object with key 'subtasks', where each subtask object has: 'title' (e.g. 'Add database indexes') and 'completed' (boolean, false). Respond ONLY in valid JSON format. Example format: { \"subtasks\": [ { \"title\": \"Define key user flows\", \"completed\": false } ] }"
            },
            {
              role: "user",
              content: `Title: ${title}\nDescription: ${description || 'None'}`
            }
          ],
        });

        const data = safeParseJSON(response.choices[0].message.content);
        subtasks = Array.isArray(data.subtasks) ? data.subtasks : [];
      } catch (aiErr) {
        console.warn('AI Call failed, falling back to local description-based subtask generator:', aiErr.message);

        // Generate dynamic fallback subtasks
        const fallbackTasks = generateSmartFallback(title, description, 'subtasks', key);
        subtasks = fallbackTasks.map(t => ({
          title: t.title,
          completed: false
        }));
      }

      res.json({ subtasks });
    } catch (error) {
      responseError(res, 500, 'AI Subtask suggestion failed', error);
    }
  });

  // 5. Link Similar Work Items
  app.post('/api/it-kanban/issues/:key/ai/link-similar', async (req, res) => {
    const { key } = req.params;
    try {
      const [rows] = await db.query('SELECT title, description, linked_issues FROM it_kanban_issues WHERE issue_key = ?', [key]);
      if (rows.length === 0) return res.status(404).json({ error: 'Issue not found' });
      const currentIssue = rows[0];

      const [allIssues] = await db.query('SELECT issue_key, title, description FROM it_kanban_issues WHERE issue_key != ?', [key]);

      let suggestions = [];
      try {
        if (!hasApiKey()) throw new Error('API key missing');
        if (allIssues.length === 0) throw new Error('No other issues exist');

        const issuesListText = allIssues.map(i => `Key: ${i.issue_key}, Title: ${i.title}`).join('\n');

        const response = await aiClient.chat.completions.create({
          model: aiModel,
          messages: [
            {
              role: "system",
              content: "You are an AI assistant for matching software engineering issues. Based on the target issue, find the 2-3 most similar or related issues from the list of existing issues. Return a JSON array inside a JSON object with key 'similar', where each suggestion object has: 'key' (the issue key, e.g. 'WR-102'), 'title' (the issue title), and 'relation' (use 'is related to'). Respond ONLY in valid JSON format. Example format: { \"similar\": [ { \"key\": \"WR-102\", \"title\": \"Setup VPN\", \"relation\": \"is related to\" } ] }"
            },
            {
              role: "user",
              content: `Target Issue Title: ${currentIssue.title}\nTarget Issue Description: ${currentIssue.description || 'None'}\n\nExisting Issues:\n${issuesListText}`
            }
          ],
        });

        const data = safeParseJSON(response.choices[0].message.content);
        suggestions = Array.isArray(data.similar) ? data.similar : [];
      } catch (aiErr) {
        console.warn('AI Call failed, falling back to local similar issues matcher:', aiErr.message);
        if (allIssues.length > 0) {
          suggestions = allIssues.slice(0, 2).map(iss => ({
            key: iss.issue_key,
            title: iss.title,
            relation: 'is related to'
          }));
        }
      }

      // Append suggestions to current linked_issues
      let currentLinked = [];
      if (currentIssue.linked_issues) {
        currentLinked = typeof currentIssue.linked_issues === 'string' ? JSON.parse(currentIssue.linked_issues) : currentIssue.linked_issues;
      }

      // Avoid duplicates
      const newLinked = [...currentLinked];
      suggestions.forEach(suggest => {
        if (!newLinked.some(item => item.key === suggest.key)) {
          newLinked.push(suggest);
        }
      });

      // Save to database
      await db.query('UPDATE it_kanban_issues SET linked_issues = ? WHERE issue_key = ?', [JSON.stringify(newLinked), key]);

      res.json({ linked_issues: newLinked });
    } catch (error) {
      responseError(res, 500, 'AI Similar issues linking failed', error);
    }
  });

  // 6. Description improvement handler (supports both route aliases)
  const handleImproveDescriptionReq = async (req, res) => {
    const { key } = req.params;
    const { title: reqTitle, description } = req.body;
    try {
      let title = reqTitle;
      if (!title && key && db) {
        try {
          const [rows] = await db.query('SELECT title FROM it_kanban_issues WHERE issue_key = ?', [key]);
          if (rows && rows.length > 0) title = rows[0].title;
        } catch (e) {}
      }
      if (!title) title = 'CRM Feature';

      let improved = '';
      try {
        if (!hasApiKey()) throw new Error('API key missing');
        const response = await aiClient.chat.completions.create({
          model: aiModel,
          messages: [
            {
              role: "system",
              content: `You are a senior enterprise business analyst reviewing a task description for a CRM/Project Management system. Read the description WORD BY WORD and understand the EXACT feature, module, or bug being described.

Your job is to PRESERVE and ENHANCE the user's existing description. Take all points, lines, and specifications from the user's input, polish the grammar, and structure them into Summary, Context, Key Specifications & Requirements (with bullet points •), and Acceptance Criteria. Do NOT discard the user's original content.`
            },
            {
              role: "user",
              content: `Task Title: ${title}\n\nCurrent Description to Improve:\n${description || ''}`
            }
          ]
        });
        improved = response.choices[0].message.content.trim();
      } catch (err) {
        console.warn('AI generate-improved-description failed, running smart fallback:', err.message);
        improved = generateSmartFallback(title, description || '', 'description', key || 'WR-101');
      }

      res.json({ improvedDescription: improved, improved });
    } catch (error) {
      responseError(res, 500, 'AI Description analysis failed', error);
    }
  };

  app.post('/api/it-kanban/issues/:key/ai/generate-improved-description', handleImproveDescriptionReq);
  app.post('/api/it-kanban/issues/:key/ai/improve-description', handleImproveDescriptionReq);

  // 6.5. Improve description draft (before ticket creation)
  app.post('/api/it-kanban/ai/improve-description-draft', async (req, res) => {
    const { title, description } = req.body;
    try {
      let improved = '';
      try {
        if (!hasApiKey()) throw new Error('API key missing');
        const response = await aiClient.chat.completions.create({
          model: aiModel,
          messages: [
            {
              role: "system",
              content: `You are a senior enterprise business analyst reviewing a task description for a CRM/Project Management system. Read the description WORD BY WORD and understand the EXACT feature, module, or bug being described.

Your job is to improve THIS SPECIFIC description by:
1. Fixing grammar, spelling, and sentence structure while keeping the original meaning.
2. Adding SPECIFIC technical details that are implied but not written (e.g., if it mentions "add a form", specify what fields, validations, API calls are needed).
3. Breaking vague requirements into CONCRETE, actionable specifications.
4. Adding acceptance criteria that reference the ACTUAL feature described.
5. Identifying missing requirements, security considerations, and edge cases SPECIFIC to this task.

Structure the output as:
- <h4>📋 Overview</h4> - What this task does (be specific, name the actual module/page/component)
- <h4>👤 User Story</h4> - As a [role], I want [this specific thing], so that [this specific benefit]
- <h4>✅ Functional Requirements</h4> - Detailed bullet list of EXACTLY what needs to be built
- <h4>🎯 Acceptance Criteria</h4> - Numbered Given/When/Then scenarios
- <h4>🔧 Technical Notes</h4> - API endpoints, DB tables, components involved
- <h4>⚠️ Edge Cases</h4> - What could go wrong specific to THIS feature
- <h4>🧪 Testing Scenarios</h4> - How to test THIS specific feature

Do NOT produce generic boilerplate. Every line must relate to the actual task content.
Format using clean HTML (<p>, <strong>, <ul>, <li>, <ol>, <h4>, <code>). Respond ONLY with the HTML.`
            },
            {
              role: "user",
              content: `Task Title: ${title || 'New Task'}\n\nCurrent Description to Improve:\n${description || 'No description provided - analyze the title and create a detailed specification.'}`
            }
          ]
        });
        improved = response.choices[0].message.content.trim();
      } catch (err) {
        console.warn('AI improve-description-draft failed, running fallback:', err.message);
        improved = generateSmartFallback(title || 'New Task', description || '', 'description', 'WR-NEW');
      }

      res.json({ improvedDescription: improved });
    } catch (error) {
      responseError(res, 500, 'AI Description analysis failed', error);
    }
  });

  // 7. Detailed subtasks generation
  app.post('/api/it-kanban/issues/:key/ai/generate-subtasks-detailed', async (req, res) => {
    const { key } = req.params;
    const { title: reqTitle, description: reqDescription } = req.body;
    try {
      const [rows] = await db.query('SELECT title, description FROM it_kanban_issues WHERE issue_key = ?', [key]);
      const issue = rows.length > 0 ? rows[0] : {};
      const title = reqTitle || issue.title || 'Task';
      const description = reqDescription !== undefined ? reqDescription : (issue.description || '');

      // Fetch team users for assigning suggestions
      const [teamUsers] = await db.query('SELECT id, first_name, last_name FROM users');
      const developers = teamUsers.map(u => `${u.first_name} ${u.last_name}`);

      let subtasks = [];
      try {
        if (!hasApiKey()) throw new Error('API key missing');
        const response = await aiClient.chat.completions.create({
          model: aiModel,
          messages: [
            {
              role: "system",
              content: `You are an expert Scrum Master and Technical Lead. Read the task title and description VERY CAREFULLY. Understand the COMPLETE workflow, all the screens, APIs, database changes, validations, and user interactions described.

Then break this task down into 5-8 SPECIFIC, ACTIONABLE subtasks that follow the actual implementation flow described in the ticket. Each subtask must be DIRECTLY derived from the description content.

RULES:
- DO NOT create generic subtasks like "UI Design" or "Database Design" unless the description specifically mentions them.
- Each subtask title must reference the ACTUAL component, page, feature, API, or module mentioned in the description.
- Order subtasks in the logical implementation sequence (what must be built first → what depends on it).
- Estimate hours realistically based on the complexity described.
- The subtask titles should be so specific that a developer can understand exactly what to build without reading the parent ticket.

Examples of GOOD subtask titles (specific to the actual task):
- "Create /api/invoices POST endpoint with validation for amount, due_date, client_id"
- "Build InvoiceFormModal component with line items, tax calculation, and preview"
- "Add invoice_items table with foreign key to invoices and product_id columns"
- "Implement PDF generation for invoice with company letterhead template"
- "Write integration tests for invoice CRUD operations and edge cases"

Examples of BAD subtask titles (too generic):
- "UI Design & Wireframe"
- "Backend Development"
- "Database Schema Design"
- "Testing"

Return a JSON object with key 'subtasks'. Each subtask: { 'title' (specific string), 'description' (2-3 sentence detail of what exactly to implement), 'estimated_hours' (number), 'priority' ('High'|'Medium'|'Low'), 'suggested_assignee' (from developer list), 'dependencies' (which other subtask must finish first, or 'None'), 'labels' (array), 'sprint' (string), 'complexity' ('High'|'Medium'|'Low'), 'category' (e.g. 'Backend API', 'Frontend UI', 'Database', 'Testing', 'DevOps') }.
Respond ONLY in valid JSON format.`
            },
            {
              role: "user",
              content: `Task Title: ${title}\n\nFull Description:\n${(description || 'No description').replace(/<\/?[^>]+(>|$)/g, ' ').replace(/\s+/g, ' ').trim()}\n\nAvailable Developers: ${developers.join(', ')}`
            }
          ],
        });
        const data = safeParseJSON(response.choices[0].message.content);
        subtasks = Array.isArray(data.subtasks) ? data.subtasks : [];
      } catch (err) {
        console.warn('AI generate-subtasks-detailed failed, running fallback:', err.message);
        subtasks = generateSmartFallback(title, description, 'subtasks', key, developers);
      }

      res.json({ subtasks });
    } catch (error) {
      responseError(res, 500, 'AI Subtasks suggestion failed', error);
    }
  });

  // 8. Nested subtask AI suggestion
  app.post('/api/it-kanban/issues/:key/ai/subtask/:index/improve', async (req, res) => {
    const { key, index } = req.params;
    const { subtaskTitle } = req.body;
    try {
      // Fetch parent issue for full context
      const [parentRows] = await db.query('SELECT title, description FROM it_kanban_issues WHERE issue_key = ?', [key]);
      const parentTitle = parentRows.length > 0 ? parentRows[0].title : '';
      const parentDesc = parentRows.length > 0 ? (parentRows[0].description || '').replace(/<\/?[^>]+(>|$)/g, ' ').replace(/\s+/g, ' ').trim() : '';

      let improvement = {};
      try {
        if (!hasApiKey()) throw new Error('API key missing');
        const response = await aiClient.chat.completions.create({
          model: aiModel,
          messages: [
            {
              role: "system",
              content: `You are a senior tech lead creating a detailed spec sheet for a subtask. You have the parent issue context and the subtask title. Generate a SPECIFIC specification that references the actual technology, components, and implementation details relevant to this subtask.

DO NOT produce generic specs. Every item must be specific to what "${subtaskTitle}" actually involves.

Return a JSON object with these keys:
- 'acceptance_criteria': (HTML string) 3-5 specific criteria using Given/When/Then format referencing actual components/APIs
- 'developer_checklist': (array of strings) 4-6 specific implementation steps a developer must follow
- 'testing_checklist': (array of strings) 3-5 specific test scenarios with expected outcomes
- 'estimated_effort': (string) realistic estimate like '4h' or '12h'
- 'required_skills': (array of strings) specific technologies needed
- 'risk_analysis': (HTML string) what could go wrong specific to this subtask
- 'dependency_mapping': (string) what must be completed before this subtask
- 'implementation_notes': (HTML string) step-by-step technical approach
- 'tags': (array of strings) relevant labels
- 'priority': ('High'|'Medium'|'Low')
- 'story_points': (number 1-13)
- 'sprint': (string)
- 'due_date': (string YYYY-MM-DD, ~1 week from now)

Respond ONLY in valid JSON format.`
            },
            {
              role: "user",
              content: `Parent Issue: ${parentTitle} (${key})\nParent Description: ${parentDesc}\n\nSubtask to Specify: ${subtaskTitle}`
            }
          ],
        });
        improvement = safeParseJSON(response.choices[0].message.content);
      } catch (err) {
        console.warn('AI subtask improve failed, running fallback:', err.message);
        improvement = {
          acceptance_criteria: `
            <ul class="list-disc pl-4 space-y-1">
              <li>Subtask implementation is clean and adheres to guidelines.</li>
              <li>Unit tests verify basic operations without logic error regressions.</li>
              <li>UI flows match mobile/desktop layouts nicely.</li>
            </ul>
          `.trim(),
          developer_checklist: [
            'Setup boilerplate codes and files structures.',
            'Connect state hooks and props parameters.',
            'Refactor logic functions to maintain reusability.'
          ],
          testing_checklist: [
            'Test empty / null states in inputs.',
            'Verify responsive wrapper grids on multiple window dimensions.',
            'Confirm callback dispatch fires accurately.'
          ],
          estimated_effort: '6h',
          required_skills: ['React.js', 'TailwindCSS', 'REST APIs'],
          risk_analysis: '<p class="text-xs text-red-600"><strong>Low Risk:</strong> Verify API formats align exactly with DB indexes to avoid transaction failures.</p>',
          dependency_mapping: 'Requires backend migrations completion.',
          implementation_notes: '<p class="text-xs">Follow standard style system parameters. Keep callbacks lightweight.</p>',
          tags: ['Feature', 'Frontend'],
          priority: 'Medium',
          story_points: 3,
          sprint: 'Sprint 1',
          due_date: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0]
        };
      }

      res.json({ improvement });
    } catch (error) {
      responseError(res, 500, 'AI Subtask improve failed', error);
    }
  });

  app.post('/api/it-kanban/issues/:key/ai/subtask-specs', async (req, res) => {
    const { key } = req.params;
    const { subtaskTitle, parentTitle } = req.body;
    try {
      const [parentRows] = await db.query('SELECT title, description FROM it_kanban_issues WHERE issue_key = ?', [key]);
      const pTitle = parentTitle || (parentRows.length > 0 ? parentRows[0].title : '');
      const pDesc = parentRows.length > 0 ? (parentRows[0].description || '').replace(/<\/?[^>]+(>|$)/g, ' ').replace(/\s+/g, ' ').trim() : '';

      let specs = {};
      try {
        if (!hasApiKey()) throw new Error('API key missing');
        const response = await aiClient.chat.completions.create({
          model: aiModel,
          messages: [
            {
              role: "system",
              content: `You are a senior tech lead creating a detailed spec sheet for a subtask. You have the parent issue context and the subtask title. Generate a SPECIFIC specification that references the actual technology, components, and implementation details relevant to this subtask.

DO NOT produce generic specs. Every item must be specific to what "${subtaskTitle}" actually involves.

Return a JSON object with these keys:
- 'acceptance_criteria': (HTML string) 3-5 specific criteria using Given/When/Then format referencing actual components/APIs
- 'developer_checklist': (array of strings) 4-6 specific implementation steps a developer must follow
- 'testing_checklist': (array of strings) 3-5 specific test scenarios with expected outcomes
- 'estimated_effort': (string) realistic estimate like '4h' or '12h'
- 'required_skills': (array of strings) specific technologies needed
- 'risk_analysis': (HTML string) what could go wrong specific to this subtask
- 'dependency_mapping': (string) what must be completed before this subtask
- 'implementation_notes': (HTML string) step-by-step technical approach
- 'tags': (array of strings) relevant labels
- 'priority': ('High'|'Medium'|'Low')
- 'story_points': (number 1-13)
- 'sprint': (string)
- 'due_date': (string YYYY-MM-DD, ~1 week from now)

Respond ONLY in valid JSON format.`
            },
            {
              role: "user",
              content: `Parent Issue: ${pTitle} (${key})\nParent Description: ${pDesc}\n\nSubtask to Specify: ${subtaskTitle}`
            }
          ],
        });
        specs = safeParseJSON(response.choices[0].message.content);
      } catch (err) {
        console.warn('AI subtask specs failed, running fallback:', err.message);
        specs = {
          acceptance_criteria: `
            <ul class="list-disc pl-4 space-y-1">
              <li>Subtask implementation is clean and adheres to guidelines.</li>
              <li>Unit tests verify basic operations without logic error regressions.</li>
              <li>UI flows match mobile/desktop layouts nicely.</li>
            </ul>
          `.trim(),
          developer_checklist: [
            'Setup boilerplate codes and files structures.',
            'Connect state hooks and props parameters.',
            'Refactor logic functions to maintain reusability.'
          ],
          testing_checklist: [
            'Test empty / null states in inputs.',
            'Verify responsive wrapper grids on multiple window dimensions.',
            'Confirm callback dispatch fires accurately.'
          ],
          estimated_effort: '6h',
          required_skills: ['React.js', 'TailwindCSS', 'REST APIs'],
          risk_analysis: '<p class="text-xs text-red-600"><strong>Low Risk:</strong> Verify API formats align exactly with DB indexes to avoid transaction failures.</p>',
          dependency_mapping: 'Requires backend migrations completion.',
          implementation_notes: '<p class="text-xs">Follow standard style system parameters. Keep callbacks lightweight.</p>',
          tags: ['Feature', 'Frontend'],
          priority: 'Medium',
          story_points: 3,
          sprint: 'Sprint 1',
          due_date: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0]
        };
      }

      res.json({ specs, improvement: specs });
    } catch (error) {
      responseError(res, 500, 'AI Subtask specs failed', error);
    }
  });

  // 9. Duplicate issue check
  app.post('/api/it-kanban/issues/:key/ai/check-duplicates', async (req, res) => {
    const { key } = req.params;
    const { title } = req.body;
    try {
      const [rows] = await db.query('SELECT issue_key, title, status FROM it_kanban_issues WHERE issue_key != ?', [key]);

      const duplicates = [];
      rows.forEach(row => {
        let matchScore = 0;
        const words1 = title.toLowerCase().split(/\s+/);
        const words2 = row.title.toLowerCase().split(/\s+/);

        const commonWords = words1.filter(w => words2.includes(w) && w.length > 2);
        const ratio = commonWords.length / Math.max(words1.length, words2.length);

        if (ratio > 0.4 || row.title.toLowerCase().includes(title.toLowerCase()) || title.toLowerCase().includes(row.title.toLowerCase())) {
          duplicates.push({
            key: row.issue_key,
            title: row.title,
            status: row.status,
            similarity: Math.round(ratio * 100) || 75
          });
        }
      });

      res.json({ duplicates });
    } catch (error) {
      responseError(res, 500, 'Duplicate check failed', error);
    }
  });

  // 10. Generate Technical Documentation Suite
  app.post('/api/it-kanban/issues/:key/ai/generate-docs', async (req, res) => {
    const { key } = req.params;
    try {
      const [rows] = await db.query('SELECT title, description FROM it_kanban_issues WHERE issue_key = ?', [key]);
      if (rows.length === 0) return res.status(404).json({ error: 'Issue not found' });
      const issue = rows[0];

      let docs = {};
      try {
        if (!hasApiKey()) throw new Error('API key missing');
        const response = await aiClient.chat.completions.create({
          model: aiModel,
          messages: [
            {
              role: "system",
              content: "You are an enterprise technical writer. Generate a comprehensive documentation suite in JSON format. The object MUST contain: 'summary' (string HTML), 'implementation_plan' (string HTML), 'qa_checklist' (string HTML), 'deployment_checklist' (string HTML), 'rollback_checklist' (string HTML), 'api_documentation' (string HTML), and 'user_documentation' (string HTML)."
            },
            {
              role: "user",
              content: `Title: ${issue.title}\nDescription: ${issue.description}`
            }
          ],
        });
        docs = safeParseJSON(response.choices[0].message.content);
      } catch (err) {
        console.warn('AI generate-docs failed, running fallback:', err.message);
        docs = generateSmartFallback(issue.title, issue.description || '', 'docs', key);
      }

      res.json(docs);
    } catch (error) {
      responseError(res, 500, 'AI documentation generation failed', error);
    }
  });

  // 11. Refine AI subtask suggestions via inline chat/prompts
  app.post('/api/it-kanban/issues/:key/ai/refine-suggestions', async (req, res) => {
    const { key } = req.params;
    const { prompt, currentSuggestions } = req.body;
    try {
      const [rows] = await db.query('SELECT title, description FROM it_kanban_issues WHERE issue_key = ?', [key]);
      const issue = rows[0] || { title: 'Issue', description: '' };

      // Fetch team users for assignee options
      const [teamUsers] = await db.query('SELECT id, first_name, last_name FROM users');
      const developers = teamUsers.map(u => `${u.first_name} ${u.last_name}`);

      let suggestions = [];
      try {
        if (!hasApiKey()) throw new Error('API key missing');
        const response = await aiClient.chat.completions.create({
          model: aiModel,
          messages: [
            {
              role: "system",
              content: "You are an expert scrum master. The user wants to adjust, expand, or refine their list of subtask suggestions for a task. Read their prompt, the task title/description, and the current list of suggested subtasks. Return an updated JSON array inside a JSON object with key 'suggestions', incorporating their prompt instructions (e.g. adding missing tasks, changing details, etc.). Each suggestion has: 'title' (string), 'estimated_hours' (number), 'priority' ('High', 'Medium', 'Low'), 'suggested_assignee' (string, selected from provided developers list), 'dependencies' (string), 'labels' (array), 'sprint' (string), and 'complexity' ('High', 'Medium', 'Low'). Respond ONLY in valid JSON format."
            },
            {
              role: "user",
              content: `Task: ${issue.title}\nDescription: ${issue.description || 'None'}\nDevelopers: ${developers.join(', ')}\nCurrent Suggestions:\n${JSON.stringify(currentSuggestions)}\n\nUser Request: ${prompt}`
            }
          ],
        });
        const data = safeParseJSON(response.choices[0].message.content);
        suggestions = Array.isArray(data.suggestions) ? data.suggestions : [];
      } catch (err) {
        console.warn('AI refine-suggestions failed, using fallback:', err.message);
        const devList = developers.length > 0 ? developers : ['Olivia Taylor', 'Michael Brown', 'Sophia Davis', 'Emma Johnson'];
        // Fallback: append item matching the prompt
        suggestions = [
          ...currentSuggestions,
          {
            title: prompt || 'Refined implementation subtask',
            estimated_hours: 6,
            priority: 'Medium',
            suggested_assignee: devList[Math.floor(Math.random() * devList.length)],
            dependencies: 'None',
            labels: ['AI-Added'],
            sprint: 'Sprint 1',
            complexity: 'Medium'
          }
        ];
      }

      res.json({ suggestions });
    } catch (error) {
      responseError(res, 500, 'AI refine subtasks suggestion failed', error);
    }
  });
};

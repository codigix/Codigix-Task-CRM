const pool = require('../config/database');
const nodemailer = require('nodemailer');

/**
 * Scheduled checks: board-ticket reminders for assignees, and alerts for managers.
 *
 * Everything is delivered through the app's notification system (notifications table) —
 * the bell in the header — and board reminders also go out as one email digest per person
 * per day. Each reminder/alert is sent at most once per item per day, checked against the
 * notifications table, so running the checks hourly (or after a restart) never repeats them.
 */

const DONE_STATUSES = ['DONE', 'COMPLETED', 'CLOSED'];

// Local calendar date (YYYY-MM-DD). toISOString() would give the UTC date, which in IST
// is still "yesterday" until 05:30.
const localDate = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatDay = (value) => {
  const d = new Date(value);
  return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const escapeHtml = (s) => String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

class AutomationService {
  constructor() {
    this.notify = null; // set from server.js once the notification routes are registered
    this.running = false;
  }

  setNotifier(fn) {
    this.notify = typeof fn === 'function' ? fn : null;
  }

  // ── Recipients ──────────────────────────────────────────────────────

  async adminIds() {
    const [rows] = await pool.query(
      "SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE u.status = 'Active' AND r.name LIKE '%Admin%'"
    );
    return rows.map(r => r.id);
  }

  // Managers of a department ("IT", "Marketing", "IT Department" all match), plus admins.
  async managerIds(department) {
    const ids = new Set(await this.adminIds());
    if (department) {
      const dept = String(department).replace(/\s*department\s*$/i, '').trim();
      const [rows] = await pool.query(
        `SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id
          WHERE u.status = 'Active' AND r.name LIKE '%Manager%' AND u.department LIKE ?`,
        [`%${dept}%`]
      );
      rows.forEach(r => ids.add(r.id));
    }
    return [...ids];
  }

  // Board tickets store the assignee as a display name.
  async userByName(name) {
    if (!name || ['unassigned', 'none'].includes(String(name).trim().toLowerCase())) return null;
    const [rows] = await pool.query(
      `SELECT id, email, first_name, last_name FROM users
        WHERE status = 'Active' AND (CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))) = ? OR username = ? OR first_name = ?)
        LIMIT 1`,
      [String(name).trim(), String(name).trim(), String(name).trim()]
    );
    return rows[0] || null;
  }

  // ── Delivery with once-a-day de-duplication ─────────────────────────

  async alreadySentToday(userId, type, entityKey) {
    const [rows] = await pool.query(
      'SELECT 1 FROM notifications WHERE user_id = ? AND type = ? AND entity_key = ? AND DATE(created_at) = CURDATE() LIMIT 1',
      [userId, type, String(entityKey)]
    );
    return rows.length > 0;
  }

  /** Sends one notification per recipient who hasn't had this one today. Returns who got it. */
  async sendOncePerDay(userIds, { type, title, message, link, entityType, entityKey }) {
    if (!this.notify) return [];
    const sent = [];
    for (const uid of [...new Set(userIds)].filter(Boolean)) {
      if (await this.alreadySentToday(uid, type, entityKey)) continue;
      const n = await this.notify({ userId: uid, type, title, message, link, entityType, entityKey, actorName: 'Reminder' });
      if (n > 0) sent.push(uid);
    }
    return sent;
  }

  async alert(userIds, { entityType, entityId, alertType, title, message }) {
    return this.sendOncePerDay(userIds, {
      type: 'alert',
      title,
      message,
      entityType: entityType.toLowerCase(),
      entityKey: `${alertType}:${entityId}`
    });
  }

  // ── Board ticket reminders (new) ────────────────────────────────────

  /**
   * Due tomorrow / due today / overdue reminders for board tickets.
   * Assigned tickets remind the assignee; unassigned ones go to the board's managers, who
   * need to give them an owner. Each person also gets one email summarising their list.
   */
  async checkBoardTicketReminders() {
    const today = localDate(0);
    const tomorrow = localDate(1);
    const [tickets] = await pool.query(
      `SELECT issue_key, title, assignee, department, status, DATE_FORMAT(due_date, '%Y-%m-%d') AS due
         FROM it_kanban_issues
        WHERE due_date IS NOT NULL AND due_date <= ? AND UPPER(TRIM(status)) NOT IN (?)`,
      [tomorrow, DONE_STATUSES]
    );

    const digests = new Map(); // userId -> { user, items: [] }
    const addToDigest = (user, item) => {
      if (!user?.email) return;
      if (!digests.has(user.id)) digests.set(user.id, { user, items: [] });
      digests.get(user.id).items.push(item);
    };

    let notified = 0;
    const unassignedByDept = new Map(); // department -> [ticket]
    for (const t of tickets) {
      const kind = t.due < today ? 'overdue' : t.due === today ? 'due_today' : 'due_tomorrow';
      const when = kind === 'overdue' ? `was due ${formatDay(t.due)}` : kind === 'due_today' ? 'is due today' : 'is due tomorrow';
      const assignee = await this.userByName(t.assignee);

      if (assignee) {
        const sent = await this.sendOncePerDay([assignee.id], {
          type: kind === 'overdue' ? 'overdue' : 'due_reminder',
          title: kind === 'overdue' ? `${t.issue_key} is overdue` : `${t.issue_key} ${when}`,
          message: `"${t.title}" ${when}.`,
          entityType: 'issue',
          entityKey: t.issue_key
        });
        if (sent.length) {
          notified++;
          addToDigest(assignee, { ...t, kind, when });
        }
      } else if (kind !== 'due_tomorrow') {
        // Nobody owns it and it's due now or late: the board's managers need to act.
        // Collected per board and sent as one summary, not one notification per ticket.
        const dept = t.department || 'IT';
        if (!unassignedByDept.has(dept)) unassignedByDept.set(dept, []);
        unassignedByDept.get(dept).push(t);
      }
    }

    for (const [dept, list] of unassignedByDept) {
      const overdue = list.filter(t => t.due < today).length;
      const keys = list.slice(0, 5).map(t => t.issue_key).join(', ') + (list.length > 5 ? ` and ${list.length - 5} more` : '');
      const sent = await this.sendOncePerDay(await this.managerIds(dept), {
        type: 'overdue',
        title: `${list.length} unassigned ${dept} ticket${list.length > 1 ? 's' : ''} ${overdue ? 'overdue or due today' : 'due today'}`,
        message: `${keys}. Assign them or move their dates.`,
        entityType: 'board',
        entityKey: `UNASSIGNED_DUE:${dept}`
      });
      if (sent.length) notified += list.length;
    }

    let emailed = 0;
    for (const { user, items } of digests.values()) {
      if (await this.sendDigestEmail(user, items)) emailed++;
    }
    console.log(`✓ Board reminders: ${tickets.length} tickets due/overdue, ${notified} notified, ${emailed} digest emails`);
    return { tickets: tickets.length, notified, emailed };
  }

  async sendDigestEmail(user, items) {
    const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM } = process.env;
    if (!EMAIL_USER || !EMAIL_PASS) return false;
    try {
      const port = parseInt(EMAIL_PORT || '587', 10);
      const transporter = nodemailer.createTransport({
        host: EMAIL_HOST || 'smtp.gmail.com',
        port,
        secure: port === 465,
        auth: { user: EMAIL_USER, pass: EMAIL_PASS }
      });
      const order = { overdue: 0, due_today: 1, due_tomorrow: 2 };
      items.sort((a, b) => order[a.kind] - order[b.kind] || a.due.localeCompare(b.due));
      const overdue = items.filter(i => i.kind === 'overdue').length;
      const name = `${user.first_name || ''}`.trim() || 'there';
      const rows = items.map(i => `
        <tr>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;font-weight:600;white-space:nowrap">${escapeHtml(i.issue_key)}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee">${escapeHtml(i.title)}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;white-space:nowrap;color:${i.kind === 'overdue' ? '#b91c1c' : '#374151'}">${escapeHtml(i.when)}</td>
        </tr>`).join('');
      await transporter.sendMail({
        from: EMAIL_FROM || EMAIL_USER,
        to: user.email,
        subject: overdue
          ? `${overdue} overdue task${overdue > 1 ? 's' : ''}${items.length > overdue ? ` and ${items.length - overdue} due soon` : ''}`
          : `${items.length} task${items.length > 1 ? 's' : ''} due soon`,
        html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#111">
          <p>Hi ${escapeHtml(name)},</p>
          <p>These tasks assigned to you need attention:</p>
          <table style="border-collapse:collapse;font-size:13px">${rows}</table>
          <p style="color:#6b7280;font-size:12px;margin-top:16px">Open the CRM board to update them. You get at most one of these emails a day.</p>
        </div>`
      });
      return true;
    } catch (err) {
      console.error(`Reminder email to ${user.email} failed:`, err.message);
      return false;
    }
  }

  // ── Manager alerts (existing checks, now delivered) ─────────────────

  async checkStaleLeads() {
    const [rows] = await pool.query(
      `SELECT id, lead_name FROM leads
        WHERE updated_at < (NOW() - INTERVAL 3 DAY) AND converted_deal_id IS NULL AND lead_status NOT IN ('Converted to Deal', 'Lost', 'Junk')`
    );
    const admins = await this.adminIds();
    for (const lead of rows) {
      await this.alert(admins, {
        entityType: 'Lead', entityId: lead.id, alertType: 'STALE_LEAD',
        title: `Stale lead: ${lead.lead_name}`,
        message: `Lead "${lead.lead_name}" has not been updated for 3+ days. Follow up with the lead.`
      });
    }
    return rows.length;
  }

  async checkStuckDeals() {
    const [rows] = await pool.query(
      `SELECT d.id, d.deal_name, c.company_name
         FROM deals d LEFT JOIN companies c ON d.company_id = c.id
        WHERE d.deal_stage = 'Negotiation' AND d.updated_at < (NOW() - INTERVAL 30 DAY) AND COALESCE(d.status, '') <> 'Lost'`
    );
    const admins = await this.adminIds();
    for (const deal of rows) {
      await this.alert(admins, {
        entityType: 'Deal', entityId: deal.id, alertType: 'STUCK_DEAL',
        title: `Stuck deal: ${deal.deal_name}`,
        message: `Deal "${deal.deal_name}"${deal.company_name ? ` with ${deal.company_name}` : ''} has been in Negotiation for 30+ days.`
      });
    }
    return rows.length;
  }

  async checkOverdueInvoices() {
    const [rows] = await pool.query(
      `SELECT i.id, i.invoice_number, c.company_name, (i.amount - COALESCE(i.amount_paid, 0)) AS outstanding
         FROM invoices i LEFT JOIN companies c ON i.client_id = c.id
        WHERE i.status = 'Unpaid' AND i.open_till IS NOT NULL AND i.open_till < ?`,
      [localDate(0)]
    );
    const admins = await this.adminIds();
    for (const inv of rows) {
      await this.alert(admins, {
        entityType: 'Invoice', entityId: inv.id, alertType: 'OVERDUE_INVOICE',
        title: `Overdue invoice: ${inv.invoice_number}`,
        message: `Invoice ${inv.invoice_number}${inv.company_name ? ` (${inv.company_name})` : ''} is overdue. Outstanding: ${Number(inv.outstanding || 0).toFixed(2)}.`
      });
    }
    return rows.length;
  }

  async checkDelayedTasks() {
    const [rows] = await pool.query(
      `SELECT t.id, t.title, t.due_date FROM general_tasks t
        WHERE t.status IN ('To Do', 'In Progress', 'Open') AND t.due_date IS NOT NULL AND t.due_date < ?`,
      [localDate(0)]
    );
    const admins = await this.adminIds();
    for (const task of rows) {
      await this.alert(admins, {
        entityType: 'Task', entityId: task.id, alertType: 'DELAYED_TASK',
        title: `Delayed task: ${task.title}`,
        message: `Task "${task.title}" was due ${formatDay(task.due_date)} and is not finished.`
      });
    }
    return rows.length;
  }

  async checkProjectDelays() {
    const [rows] = await pool.query(
      `SELECT p.id, p.name, p.due_date, p.status, d.name AS department_name
         FROM projects p LEFT JOIN departments d ON p.department_id = d.id
        WHERE p.status IN ('Planning', 'Execution') AND p.due_date IS NOT NULL AND p.due_date < ?`,
      [localDate(0)]
    );
    for (const p of rows) {
      await this.alert(await this.managerIds(p.department_name), {
        entityType: 'Project', entityId: p.id, alertType: 'PROJECT_DELAY',
        title: `Delayed project: ${p.name}`,
        message: `Project "${p.name}" was due ${formatDay(p.due_date)} and is still in ${p.status}.`
      });
    }
    return rows.length;
  }

  async checkBugSeverity() {
    const [rows] = await pool.query(
      `SELECT b.id, b.title, p.name AS project_name FROM bugs b LEFT JOIN projects p ON b.project_id = p.id
        WHERE b.severity = 'Critical' AND b.status NOT IN ('Resolved', 'Qualified', 'Closed')`
    );
    const managers = await this.managerIds('IT');
    for (const bug of rows) {
      await this.alert(managers, {
        entityType: 'Bug', entityId: bug.id, alertType: 'CRITICAL_BUG',
        title: `Critical bug: ${bug.title}`,
        message: `Critical bug open${bug.project_name ? ` in "${bug.project_name}"` : ''}: ${bug.title}`
      });
    }
    return rows.length;
  }

  async checkSprintDelays() {
    const [rows] = await pool.query(
      `SELECT id, name, end_date, department FROM sprints
        WHERE status = 'Active' AND end_date IS NOT NULL AND end_date < ?`,
      [localDate(0)]
    );
    for (const s of rows) {
      await this.alert(await this.managerIds(s.department), {
        entityType: 'Sprint', entityId: s.id, alertType: 'SPRINT_DELAY',
        title: `Sprint overdue: ${s.name}`,
        message: `Sprint "${s.name}" ended ${formatDay(s.end_date)} but is still active. Complete it or extend it.`
      });
    }
    return rows.length;
  }

  async checkPendingApprovals() {
    const [rows] = await pool.query(
      `SELECT id, deal_name FROM deals WHERE discount_status = 'Pending' AND updated_at < (NOW() - INTERVAL 1 DAY)`
    );
    const admins = await this.adminIds();
    for (const deal of rows) {
      await this.alert(admins, {
        entityType: 'Deal', entityId: deal.id, alertType: 'PENDING_DISCOUNT',
        title: `Discount waiting for approval: ${deal.deal_name}`,
        message: `The discount on "${deal.deal_name}" has been waiting for approval for over 24 hours.`
      });
    }
    return rows.length;
  }

  async runAllChecks() {
    if (this.running) return { skipped: 'already running' };
    this.running = true;
    const checks = {
      boardReminders: () => this.checkBoardTicketReminders(),
      staleLeads: () => this.checkStaleLeads(),
      stuckDeals: () => this.checkStuckDeals(),
      overdueInvoices: () => this.checkOverdueInvoices(),
      delayedTasks: () => this.checkDelayedTasks(),
      delayedProjects: () => this.checkProjectDelays(),
      criticalBugs: () => this.checkBugSeverity(),
      sprintDelays: () => this.checkSprintDelays(),
      pendingApprovals: () => this.checkPendingApprovals()
    };
    const results = {};
    try {
      // One failing check (e.g. a missing table) must not stop the others.
      for (const [name, run] of Object.entries(checks)) {
        try {
          results[name] = await run();
        } catch (err) {
          console.error(`Automation check "${name}" failed:`, err.message);
          results[name] = { error: err.message };
        }
      }
      console.log('✅ Automation checks completed', JSON.stringify(results));
      return results;
    } finally {
      this.running = false;
    }
  }
}

module.exports = new AutomationService();

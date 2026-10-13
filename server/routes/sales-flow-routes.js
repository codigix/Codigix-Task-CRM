const nodemailer = require('nodemailer');
const { buildPdf, computeTotals, round2 } = require('../services/salesPdf');
const push = require('../services/push');
const catalog = require('../services/salesCatalog');
const { DEFAULT_PROPOSAL_SETTINGS } = require('../services/proposalTemplates');

/**
 * Sales flow: Lead (enquiry) -> Deal (opportunity) -> Quotations -> Won / Lost / On Hold.
 *
 *   Lead       New -> Contacted -> Qualified -> Converted to Deal
 *              or Unqualified / Lost (reason) / On Hold (until + reason)
 *   Deal       the pipeline stages (pipeline_stages) incl. Won (closing value) and Lost (reason),
 *              plus On Hold (until + reason) which keeps the stage
 *   Quotation  stored in estimations (+ estimation_line_items): GST lines, versions v1, v2...
 *              Draft -> [Pending Approval -> Approved] -> Sent -> Accepted / Declined
 *              Revise = a new version (Draft) with a "what changed" note; the old one -> Revised
 *              Discounts above the Sales Settings limit need a manager's approval.
 *   Communications (call, email, WhatsApp, meeting, visit, note) and every status / stage /
 *   quotation change are written to sales_events; follow-ups and meetings to followups.
 */

const LEAD_STATUSES = ['New', 'Contacted', 'Qualified', 'Unqualified', 'Lost', 'On Hold'];
const CHANNELS = ['Call', 'Email', 'WhatsApp', 'Meeting', 'Visit', 'Note', 'SMS'];
const FOLLOWUP_TYPES = ['Call', 'Meeting', 'Google Meet', 'Email', 'WhatsApp', 'Visit', 'Demo', 'Proposal Discussion', 'Payment Reminder'];
const OPEN_FU = ['Scheduled', 'Pending', 'Overdue'];

const DEFAULT_SETTINGS = {
  company: { name: 'Codigix Infotech Pvt. Ltd.', address: '', state: 'Maharashtra', gstin: '', pan: '', phone: '', email: '', website: 'www.codigixinfotech.com' },
  bank: { name: '', accountName: '', account: '', ifsc: '', branch: '', upi: '' },
  quotation: {
    prefix: 'QT', validityDays: 15, defaultTaxPct: 18, discountApprovalPct: 10,
    terms: catalog.TERMS_GENERAL, termsRetainer: catalog.TERMS_RETAINER, termsProject: catalog.TERMS_PROJECT,
    signatory: 'Authorised Signatory'
  },
  email: {
    subject: 'Quotation {number} from {company}', message: 'Dear {client},\n\nThank you for your enquiry. Please find our quotation {number} attached.\n\nTotal: {total}\nValid until: {validUntil}\n\nWe look forward to working with you.\n\nRegards,\n{sender}\n{company}',
    invoiceSubject: 'Invoice {number} from {company}', invoiceMessage: 'Dear {client},\n\nPlease find invoice {number} attached.\n\nAmount due: {balance}\nDue date: {dueDate}\n\nBank details are printed on the invoice. Kindly share the payment reference once paid.\n\nRegards,\n{sender}\n{company}'
  },
  invoice: { prefix: 'INV', dueDays: 15, terms: '1. Payment is due by the due date shown above.\n2. Please quote the invoice number with your payment.\n3. Cheques / transfers in favour of the account name shown.' },
  // About the company, contact details and the standard text used by proposal decks.
  proposal: DEFAULT_PROPOSAL_SETTINGS,
  // What we sell: marketing services priced per unit (keywords, reels, creatives...) and IT / software scopes.
  services: catalog.DEFAULT_SERVICES,
  // Commission paid to the owner of the deal, on collected payments or on won deal value.
  team: { commissionPct: 0, commissionBasis: 'collected' }
};

const deepMerge = (base, over) => {
  const out = Array.isArray(base) ? [...base] : { ...base };
  Object.entries(over || {}).forEach(([k, v]) => {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' ? deepMerge(base[k], v) : v;
  });
  return out;
};
const parseJson = (v, fb) => { if (v == null) return fb; if (typeof v !== 'string') return v; try { return JSON.parse(v); } catch (e) { return fb; } };
const ymd = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
const isDay = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ''));
const isTime = (v) => /^\d{2}:\d{2}(:\d{2})?$/.test(String(v || ''));
const num = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
// Services edited in Sales Settings: keep only what the quotation editor understands.
const cleanServices = (list) => (Array.isArray(list) ? list : []).map((x, i) => ({
  id: String(x.id || `svc-${i}-${Date.now()}`).slice(0, 40), name: String(x.name || '').trim().slice(0, 120), category: String(x.category || 'Other').slice(0, 40),
  billing: x.billing === 'monthly' ? 'monthly' : 'one-time', unit: String(x.unit || '').trim().slice(0, 24), rate: Math.max(0, num(x.rate)), hsn: String(x.hsn || '998361').slice(0, 12),
  taxPct: Math.min(40, Math.max(0, num(x.taxPct, 18))), defaultQty: Math.max(1, num(x.defaultQty, 1)), description: String(x.description || '').slice(0, 300),
  slabs: (Array.isArray(x.slabs) ? x.slabs : []).map(b => ({ upTo: b.upTo === null || b.upTo === '' || b.upTo === undefined ? null : Math.max(1, num(b.upTo)), rate: Math.max(0, num(b.rate)) })).filter(b => b.rate > 0),
  scope: (Array.isArray(x.scope) ? x.scope : String(x.scope || '').split('\n')).map(t => String(t).trim()).filter(Boolean).slice(0, 40), active: x.active !== false
})).filter(x => x.name);
const monthOk = (v) => /^\d{4}-\d{2}$/.test(String(v || ''));
const trimTo = (v, n) => String(v || '').trim().slice(0, n);
/** The part of a quotation that is not price lines: what a retainer delivers each month, or a project's scope, milestones and rules. */
const cleanPlan = (type, p = {}) => {
  if (!['retainer', 'project'].includes(type)) return null;
  const plan = {
    sections: (Array.isArray(p.sections) ? p.sections : []).map(sec => ({
      title: trimTo(sec.title, 120),
      items: (Array.isArray(sec.items) ? sec.items : String(sec.items || '').split('\n')).map(t => trimTo(t, 400)).filter(Boolean).slice(0, 60)
    })).filter(sec => sec.title && sec.items.length).slice(0, 20)
  };
  if (type === 'retainer') {
    plan.months = Math.min(60, Math.max(1, parseInt(p.months, 10) || 6));
    const d = new Date(); const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    plan.startMonth = monthOk(p.startMonth) ? p.startMonth : `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
    plan.adSpendNote = trimTo(p.adSpendNote, 300);
  } else {
    plan.timeline = trimTo(p.timeline, 200);
    plan.milestones = (Array.isArray(p.milestones) ? p.milestones : []).map(m => ({ name: trimTo(m.name, 120), pct: Math.min(100, Math.max(0, num(m.pct))) })).filter(m => m.name && m.pct > 0).slice(0, 12);
  }
  return plan;
};
const planProblem = (data) => {
  if (data.quoteType === 'project') {
    const total = (data.plan?.milestones || []).reduce((s, m) => s + m.pct, 0);
    if (!data.plan?.milestones?.length) return 'Add the payment milestones (for example 30% advance, 40% on delivery, 30% on go-live).';
    if (Math.abs(total - 100) > 0.01) return `The milestones add up to ${total}%; they must total 100%.`;
  }
  return null;
};
const fill = (tpl, vars) => String(tpl || '').replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));

module.exports = function setupSalesFlowRoutes(app, pool) {
  const q = async (sql, params = []) => (await pool.query(sql, params))[0];
  push.init(pool);

  // ── Schema (idempotent; also in prisma migration) ─────────────────────
  const addCol = async (table, col, def) => {
    const [[has]] = await pool.query('SELECT COUNT(*) n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?', [table, col]);
    if (!has.n) await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${col}\` ${def}`);
  };
  // Two servers starting together can collide on these ALTERs; retry a few times.
  const withRetry = async (fn) => { for (let i = 0; ; i += 1) { try { return await fn(); } catch (e) { if (i < 4 && /Deadlock|Lock wait/i.test(e.message)) { await new Promise(r => setTimeout(r, 400 * (i + 1))); continue; } throw e; } } };
  const ready = withRetry(async () => {
    await pool.query(`CREATE TABLE IF NOT EXISTS sales_settings (id INT PRIMARY KEY, data JSON NULL, updated_by VARCHAR(120) NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await pool.query(`CREATE TABLE IF NOT EXISTS sales_events (
      id INT AUTO_INCREMENT PRIMARY KEY, lead_id INT NULL, deal_id INT NULL, quotation_id INT NULL,
      kind VARCHAR(30) NOT NULL, title VARCHAR(300) NOT NULL, body TEXT NULL, meta JSON NULL,
      by_id INT NULL, by_name VARCHAR(120) NULL, happened_at DATETIME DEFAULT CURRENT_TIMESTAMP, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      KEY idx_se_lead (lead_id), KEY idx_se_deal (deal_id), KEY idx_se_quote (quotation_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    // Leads: On Hold + reasons
    await pool.query("ALTER TABLE leads MODIFY COLUMN lead_status ENUM('New','Qualified','Contacted','Unqualified','Not Contacted','Closed','Lost','Converted to Deal','Quotation','Revised Quotation','On Hold') DEFAULT 'New'");
    await addCol('leads', 'hold_until', 'DATE NULL');
    await addCol('leads', 'hold_reason', 'VARCHAR(255) NULL');
    await addCol('leads', 'lost_reason', 'VARCHAR(255) NULL');
    await addCol('leads', 'status_changed_at', 'DATETIME NULL');
    // Deals: On Hold, Won value, Lost reason, origin lead
    await addCol('deals', 'on_hold', 'TINYINT(1) NOT NULL DEFAULT 0');
    await addCol('deals', 'hold_until', 'DATE NULL');
    await addCol('deals', 'hold_reason', 'VARCHAR(255) NULL');
    await addCol('deals', 'lost_reason', 'VARCHAR(255) NULL');
    await addCol('deals', 'won_value', 'DECIMAL(15,2) NULL');
    await addCol('deals', 'closed_at', 'DATETIME NULL');
    await addCol('deals', 'lead_id', 'INT NULL');
    // Quotations (estimations)
    await pool.query("ALTER TABLE estimations MODIFY COLUMN status ENUM('Draft','Pending Approval','Approved','Sent','Accepted','Declined','Revised','Finalized','Expired') DEFAULT 'Draft'");
    for (const [c, d] of [
      ['quote_base', 'VARCHAR(40) NULL'], ['subject', 'VARCHAR(255) NULL'], ['gst_mode', "VARCHAR(10) NOT NULL DEFAULT 'intra'"],
      ['cgst_amount', 'DECIMAL(15,2) NOT NULL DEFAULT 0'], ['sgst_amount', 'DECIMAL(15,2) NOT NULL DEFAULT 0'], ['igst_amount', 'DECIMAL(15,2) NOT NULL DEFAULT 0'],
      ['terms', 'TEXT NULL'], ['notes', 'TEXT NULL'], ['revision_note', 'VARCHAR(500) NULL'],
      ['approval_status', 'VARCHAR(20) NULL'], ['approval_note', 'VARCHAR(500) NULL'], ['approval_requested_by', 'VARCHAR(120) NULL'],
      ['approved_by', 'VARCHAR(120) NULL'], ['approved_at', 'DATETIME NULL'], ['max_discount_pct', 'DECIMAL(5,2) NULL'],
      ['sent_at', 'DATETIME NULL'], ['sent_to', 'VARCHAR(500) NULL'], ['responded_at', 'DATETIME NULL'], ['decline_reason', 'VARCHAR(500) NULL'],
      ['created_by_name', 'VARCHAR(120) NULL'], ['client_name', 'VARCHAR(255) NULL'], ['client_contact', 'VARCHAR(255) NULL'],
      ['client_email', 'VARCHAR(255) NULL'], ['client_phone', 'VARCHAR(50) NULL'], ['client_address', 'TEXT NULL'],
      ['client_gstin', 'VARCHAR(20) NULL'], ['client_state', 'VARCHAR(60) NULL']
    ]) await addCol('estimations', c, d);
    await addCol('estimation_line_items', 'hsn_sac', 'VARCHAR(20) NULL');
    await addCol('estimation_line_items', 'unit', 'VARCHAR(20) NULL');
    await addCol('estimation_line_items', 'position', 'INT NOT NULL DEFAULT 0');
    for (const [c, d] of [['gst_mode', "VARCHAR(10) NOT NULL DEFAULT 'intra'"], ['cgst_amount', 'DECIMAL(15,2) NOT NULL DEFAULT 0'], ['sgst_amount', 'DECIMAL(15,2) NOT NULL DEFAULT 0'], ['igst_amount', 'DECIMAL(15,2) NOT NULL DEFAULT 0'],
      ['client_gstin', 'VARCHAR(20) NULL'], ['client_address', 'TEXT NULL'], ['client_state', 'VARCHAR(60) NULL'], ['client_email', 'VARCHAR(255) NULL'], ['client_phone', 'VARCHAR(50) NULL']]) await addCol('invoices', c, d);
    await addCol('invoice_items', 'hsn_sac', 'VARCHAR(20) NULL');
    await addCol('invoice_items', 'unit', 'VARCHAR(20) NULL');
    await addCol('invoice_items', 'position', 'INT NOT NULL DEFAULT 0');
    // Billing, customers, targets (routes/sales-desk-routes.js)
    await addCol('invoices', 'sent_at', 'DATETIME NULL');
    await addCol('invoices', 'sent_to', 'VARCHAR(500) NULL');
    await addCol('invoices', 'subject', 'VARCHAR(255) NULL');
    await addCol('companies', 'gstin', 'VARCHAR(20) NULL');
    await addCol('sales_events', 'invoice_id', 'INT NULL');
    await addCol('sales_events', 'company_id', 'INT NULL');
    await pool.query(`CREATE TABLE IF NOT EXISTS sales_payments (
      id INT AUTO_INCREMENT PRIMARY KEY, receipt_number VARCHAR(40) NULL, invoice_id INT NULL, company_id INT NULL, deal_id INT NULL,
      amount DECIMAL(15,2) NOT NULL, paid_on DATE NOT NULL, mode VARCHAR(30) NULL, reference VARCHAR(120) NULL, notes VARCHAR(500) NULL,
      by_id INT NULL, by_name VARCHAR(120) NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      KEY idx_sp_invoice (invoice_id), KEY idx_sp_company (company_id), KEY idx_sp_paid_on (paid_on)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await pool.query(`CREATE TABLE IF NOT EXISTS sales_targets (
      id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, month CHAR(7) NOT NULL,
      won_value DECIMAL(15,2) NOT NULL DEFAULT 0, collection DECIMAL(15,2) NOT NULL DEFAULT 0, deals_won INT NOT NULL DEFAULT 0,
      enquiries INT NOT NULL DEFAULT 0, activities INT NOT NULL DEFAULT 0, updated_by VARCHAR(120) NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_st_user_month (user_id, month)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    // Plans (retainer / project), monthly + milestone billing, advance payments (no invoice yet).
    await addCol('estimations', 'quote_type', 'VARCHAR(20) NULL');
    await addCol('estimations', 'proposal_id', 'INT NULL');
    await addCol('estimations', 'plan', 'JSON NULL');
    await addCol('invoices', 'service_month', 'CHAR(7) NULL');
    await addCol('invoices', 'milestone_no', 'INT NULL');
    await addCol('invoices', 'milestone_name', 'VARCHAR(120) NULL');
    await pool.query('ALTER TABLE sales_payments MODIFY COLUMN invoice_id INT NULL');
  }).catch(e => console.error('sales flow schema:', e.message));

  // ── Helpers ───────────────────────────────────────────────────────────
  const getSettings = async () => {
    const [row] = await q('SELECT data FROM sales_settings WHERE id = 1');
    return deepMerge(DEFAULT_SETTINGS, parseJson(row?.data, {}));
  };
  const isMgr = (req) => Boolean(req.user?.isManager || req.user?.isAdmin);
  const canQuote = (req) => isMgr(req) || /executive/i.test(String(req.user?.role || ''));
  const who = (req) => ({ id: req.user?.id || null, name: req.user?.name || 'Someone' });
  const event = async (req, { leadId = null, dealId = null, quotationId = null, invoiceId = null, companyId = null, kind, title, body = null, meta = null, at = null }) => {
    const u = who(req);
    await pool.query('INSERT INTO sales_events (lead_id, deal_id, quotation_id, invoice_id, company_id, kind, title, body, meta, by_id, by_name, happened_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, NOW()))',
      [leadId, dealId, quotationId, invoiceId, companyId, kind, String(title).slice(0, 300), body, meta ? JSON.stringify(meta) : null, u.id, u.name, at]);
  };
  const userName = (u) => (u ? `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || u.email : '');
  const usersById = async () => new Map((await q('SELECT id, first_name, last_name, username, email FROM users')).map(u => [Number(u.id), userName(u)]));
  const stages = async () => q("SELECT id, name, probability, position FROM pipeline_stages WHERE COALESCE(status, 'Active') = 'Active' ORDER BY position, id");
  const salesManagers = async () => (await q(`SELECT u.id FROM users u LEFT JOIN roles r ON r.id = u.role_id
    WHERE COALESCE(u.status, 'Active') = 'Active' AND (LOWER(COALESCE(r.name, '')) LIKE '%admin%'
      OR (LOWER(COALESCE(u.department, '')) LIKE '%sales%' AND (LOWER(COALESCE(r.name, '')) LIKE '%manager%' OR u.department_role = 'Manager')))`)).map(r => Number(r.id));
  const notify = async (userIds, title, message, url) => {
    const ids = [...new Set(userIds.map(Number).filter(Boolean))];
    if (!ids.length) return;
    await pool.query('INSERT INTO notifications (user_id, type, title, message, link, actor_name, entity_type) VALUES ?',
      [ids.map(id => [id, 'sales', title.slice(0, 255), message, url || null, null, 'sales'])]).catch(() => {});
    push.sendToUsers(ids, { title, body: message, url: url || '/', tag: `sales-${Date.now()}`, kind: 'sales' }).catch(() => {});
  };
  const nextFollowups = async (col, ids) => {
    if (!ids.length) return new Map();
    const rows = await q(`SELECT ${col} AS k, MIN(CONCAT(scheduled_date, ' ', scheduled_time)) AS at FROM followups
      WHERE ${col} IN (?) AND status IN (?) GROUP BY ${col}`, [ids, OPEN_FU]);
    return new Map(rows.map(r => [Number(r.k), r.at]));
  };
  const lastContacts = async (col, ids) => {
    if (!ids.length) return new Map();
    const rows = await q(`SELECT ${col} AS k, MAX(happened_at) AS at FROM sales_events WHERE ${col} IN (?) AND kind = 'communication' GROUP BY ${col}`, [ids]);
    return new Map(rows.map(r => [Number(r.k), r.at]));
  };
  const needUser = (req, res) => { if (!req.user?.id) { res.status(401).json({ error: 'Please sign in again.' }); return false; } return true; };
  const fail = (res, e, msg) => { console.error(`sales flow: ${msg}:`, e.message); res.status(500).json({ error: msg }); };

  // ── Meta + settings ───────────────────────────────────────────────────
  // ── Who may touch what ───────────────────────────────────────────────
  // Managers and admins: everything. Sales executives: only their own enquiries, deals, quotations and
  // follow-ups (and what belongs to them through those). This is checked here on the server, so asking the
  // API directly for someone else's record, or for scope=all, gets a refusal instead of the data.
  const ownsEntity = async (kind, id, req) => {
    const uid = Number(req.user.id); const me = String(req.user.name || '').trim().toLowerCase();
    const [lead] = kind === 'leads' ? await q('SELECT owner_id FROM leads WHERE id = ?', [id]) : [];
    if (kind === 'leads') return lead ? { found: true, ok: Number(lead.owner_id) === uid } : { found: false };
    const [deal] = kind === 'deals' ? await q('SELECT assignee_id FROM deals WHERE id = ?', [id]) : [];
    if (kind === 'deals') return deal ? { found: true, ok: Number(deal.assignee_id) === uid } : { found: false };
    let row;
    if (kind === 'quotations') [row] = await q('SELECT created_by_name, estimate_by, deal_id, lead_id FROM estimations WHERE id = ?', [id]);
    else [row] = await q('SELECT assigned_to, deal_id, lead_id FROM followups WHERE id = ?', [id]);
    if (!row) return { found: false };
    if (Number(row.estimate_by) === uid || Number(row.assigned_to) === uid || String(row.created_by_name || '').trim().toLowerCase() === me) return { found: true, ok: true };
    if (row.deal_id) { const [d] = await q('SELECT assignee_id FROM deals WHERE id = ?', [row.deal_id]); if (d && Number(d.assignee_id) === uid) return { found: true, ok: true }; }
    if (row.lead_id) { const [l] = await q('SELECT owner_id FROM leads WHERE id = ?', [row.lead_id]); if (l && Number(l.owner_id) === uid) return { found: true, ok: true }; }
    return { found: true, ok: false };
  };
  // Two sales roles. A sales employee adds enquiries, records calls and handles follow-ups. Creating deals,
  // quotations and billing is for sales executives (and managers), so those writes are refused for everyone else.
  app.use('/api/sales-flow', (req, res, next) => {
    if (req.method === 'GET' || !req.user || canQuote(req)) return next();
    const p = String(req.originalUrl || '').split('?')[0].replace('/api/sales-flow', '');
    const seg = p.split('/').filter(Boolean);
    if (seg[0] === 'deals' || seg[0] === 'quotations' || (seg[0] === 'leads' && seg[2] === 'convert')) {
      return res.status(403).json({ error: 'Deals and quotations are created by a sales executive. Add the enquiry and its follow-ups, and pass it on.' });
    }
    next();
  });
  app.use('/api/sales-flow/:kind/:id', async (req, res, next) => {
    try {
      if (!['leads', 'deals', 'quotations', 'followups'].includes(req.params.kind) || !req.user || isMgr(req)) return next();
      const r = await ownsEntity(req.params.kind, req.params.id, req);
      if (r.found && !r.ok) return res.status(403).json({ error: 'This belongs to someone else. Ask a manager if you need access.' });
      next();
    } catch (e) { next(e); }
  });
  const onlyManagerAssigns = (req, res, ownerId) => {
    if (ownerId === undefined || ownerId === null || ownerId === '' || isMgr(req) || Number(ownerId) === Number(req.user.id)) return false;
    res.status(403).json({ error: 'Only a manager can assign work to someone else.' });
    return true;
  };

  app.get('/api/sales-flow/meta', async (req, res) => {
    try {
      if (!needUser(req, res)) return;
      await ready;
      const settings = await getSettings();
      const people = (await q("SELECT id, first_name, last_name, username, email, department FROM users WHERE COALESCE(status, 'Active') = 'Active' ORDER BY first_name"))
        .map(u => ({ id: u.id, name: userName(u), department: u.department || '' }));
      res.json({
        stages: await stages(), leadStatuses: LEAD_STATUSES, channels: CHANNELS, followupTypes: FOLLOWUP_TYPES, people,
        me: { id: req.user.id, name: req.user.name, isManager: isMgr(req) },
        quotation: { validityDays: settings.quotation.validityDays, defaultTaxPct: settings.quotation.defaultTaxPct, discountApprovalPct: settings.quotation.discountApprovalPct, terms: settings.quotation.terms, termsRetainer: settings.quotation.termsRetainer, termsProject: settings.quotation.termsProject },
        services: (settings.services || []).filter(x => x.active !== false),
        planDefaults: { sections: catalog.PLAN_SECTIONS, milestones: catalog.DEFAULT_MILESTONES },
        companyState: settings.company.state
      });
    } catch (e) { fail(res, e, 'Could not load sales settings'); }
  });

  app.get('/api/sales-flow/settings', async (req, res) => {
    try { if (!needUser(req, res)) return; await ready; res.json({ settings: await getSettings(), canEdit: isMgr(req) }); } catch (e) { fail(res, e, 'Could not load settings'); }
  });
  app.put('/api/sales-flow/settings', async (req, res) => {
    try {
      if (!needUser(req, res)) return;
      if (!isMgr(req)) return res.status(403).json({ error: 'Only managers can change sales settings.' });
      await ready;
      const next = deepMerge(await getSettings(), req.body?.settings || {});
      next.quotation.discountApprovalPct = Math.max(0, Math.min(100, Number(next.quotation.discountApprovalPct) || 0));
      next.quotation.validityDays = Math.max(1, Math.min(365, parseInt(next.quotation.validityDays, 10) || 15));
      next.quotation.defaultTaxPct = Math.max(0, Math.min(40, Number(next.quotation.defaultTaxPct) || 0));
      next.quotation.prefix = String(next.quotation.prefix || 'QT').replace(/[^A-Za-z0-9]/g, '').slice(0, 8) || 'QT';
      if (next.proposal) {
        const a = next.proposal.about || (next.proposal.about = {});
        a.text = String(a.text || '').slice(0, 3000); a.textMarketing = String(a.textMarketing || '').slice(0, 3000);
        a.stats = (Array.isArray(a.stats) ? a.stats : []).slice(0, 4).map(x => ({ value: String(x.value || '').slice(0, 20), label: String(x.label || '').slice(0, 80) })).filter(x => x.value);
        a.services = (Array.isArray(a.services) ? a.services : String(a.services || '').split('\n')).map(x => String(x).trim()).filter(Boolean).slice(0, 12);
      }
      next.services = cleanServices(req.body?.settings?.services !== undefined ? req.body.settings.services : next.services);
      next.invoice.prefix = String(next.invoice.prefix || 'INV').replace(/[^A-Za-z0-9]/g, '').slice(0, 8) || 'INV';
      next.invoice.dueDays = Math.max(0, Math.min(180, parseInt(next.invoice.dueDays, 10) || 0));
      next.team.commissionPct = Math.max(0, Math.min(50, Number(next.team.commissionPct) || 0));
      next.team.commissionBasis = next.team.commissionBasis === 'won' ? 'won' : 'collected';
      await pool.query('INSERT INTO sales_settings (id, data, updated_by) VALUES (1, ?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data), updated_by = VALUES(updated_by)',
        [JSON.stringify(next), req.user.name]);
      res.json({ settings: next });
    } catch (e) { fail(res, e, 'Could not save settings'); }
  });

  // ── Board + KPIs ──────────────────────────────────────────────────────
  app.get('/api/sales-flow/board', async (req, res) => {
    try {
      if (!needUser(req, res)) return;
      await ready;
      const mine = req.query.scope === 'mine' || !isMgr(req);
      const uid = Number(req.user.id);
      const names = await usersById();
      const term = String(req.query.q || '').trim().toLowerCase();

      let leads = await q(`SELECT id, lead_name, project_name, company, email, phone, lead_source, lead_status, value, currency, owner_id,
          hold_until, hold_reason, lost_reason, converted_deal_id, created_at, updated_at, status_changed_at FROM leads ORDER BY updated_at DESC`);
      let deals = await q(`SELECT d.id, d.deal_name, d.deal_value, d.currency, d.deal_stage, d.pipeline_stage_id, d.status, d.probability,
          d.assignee_id, d.expected_close_date, d.on_hold, d.hold_until, d.hold_reason, d.lost_reason, d.won_value, d.closed_at,
          d.company_id, c.company_name, d.lead_id, d.created_at, d.updated_at
        FROM deals d LEFT JOIN companies c ON c.id = d.company_id ORDER BY d.updated_at DESC`);
      if (mine) { leads = leads.filter(l => Number(l.owner_id) === uid); deals = deals.filter(d => Number(d.assignee_id) === uid); }
      if (term) {
        leads = leads.filter(l => [l.lead_name, l.project_name, l.company, l.email, l.phone].some(v => String(v || '').toLowerCase().includes(term)));
        deals = deals.filter(d => [d.deal_name, d.company_name].some(v => String(v || '').toLowerCase().includes(term)));
      }
      const [nfL, nfD, lcL, lcD] = await Promise.all([
        nextFollowups('lead_id', leads.map(l => l.id)), nextFollowups('deal_id', deals.map(d => d.id)),
        lastContacts('lead_id', leads.map(l => l.id)), lastContacts('deal_id', deals.map(d => d.id))
      ]);
      const quotes = deals.length ? await q(`SELECT e.id, e.deal_id, e.estimation_number, e.quote_base, e.version, e.status, e.total FROM estimations e
        JOIN (SELECT deal_id, MAX(id) mid FROM estimations WHERE deal_id IN (?) AND status <> 'Revised' AND proposal_id IS NULL GROUP BY deal_id) t ON t.mid = e.id`, [deals.map(d => d.id)]) : [];
      const quoteBy = new Map(quotes.map(x => [Number(x.deal_id), x]));
      const decks = await deckRows();
      const deckBy = new Map(); decks.forEach(dk => { if (dk.dealId && !deckBy.has(Number(dk.dealId))) deckBy.set(Number(dk.dealId), dk); });
      const stageList = await stages();

      const leadCards = leads.map(l => ({
        id: l.id, name: l.lead_name, project: l.project_name, company: l.company, phone: l.phone, email: l.email, source: l.lead_source,
        status: l.lead_status === 'Not Contacted' ? 'New' : l.lead_status, value: Number(l.value) || 0, currency: l.currency || 'INR',
        owner: names.get(Number(l.owner_id)) || '', ownerId: l.owner_id, holdUntil: l.hold_until, holdReason: l.hold_reason, lostReason: l.lost_reason,
        dealId: l.converted_deal_id, nextFollowup: nfL.get(l.id) || null, lastContact: lcL.get(l.id) || null, createdAt: l.created_at, updatedAt: l.updated_at
      }));
      const dealCards = deals.map(d => ({
        id: d.id, name: d.deal_name, company: d.company_name || '', value: Number(d.deal_value) || 0, currency: d.currency || 'INR',
        stage: d.deal_stage || (stageList.find(s => s.id === d.pipeline_stage_id)?.name) || stageList[0]?.name || 'New',
        stageId: d.pipeline_stage_id, status: d.on_hold ? 'On Hold' : (d.status || 'Open'), probability: Number(d.probability) || 0,
        owner: names.get(Number(d.assignee_id)) || '', ownerId: d.assignee_id, expectedClose: d.expected_close_date,
        onHold: Boolean(d.on_hold), holdUntil: d.hold_until, holdReason: d.hold_reason, lostReason: d.lost_reason, wonValue: d.won_value, closedAt: d.closed_at,
        leadId: d.lead_id, nextFollowup: nfD.get(d.id) || null, lastContact: lcD.get(d.id) || null,
        quotation: deckBy.get(d.id) ? { id: deckBy.get(d.id).id, deck: true, number: deckBy.get(d.id).number, version: 1, status: deckBy.get(d.id).status, total: deckBy.get(d.id).total } : quoteBy.get(d.id) ? { id: quoteBy.get(d.id).id, number: quoteBy.get(d.id).estimation_number, version: quoteBy.get(d.id).version, status: quoteBy.get(d.id).status, total: Number(quoteBy.get(d.id).total) || 0 } : null,
        createdAt: d.created_at, updatedAt: d.updated_at
      }));

      // KPIs
      const now = new Date(); const monthStart = new Date(now.getFullYear(), now.getMonth(), 1); const d90 = new Date(now.getTime() - 90 * 86400000);
      const isWon = (d) => d.status === 'Won' || /^won$/i.test(d.stage); const isLost = (d) => d.status === 'Lost' || /^lost$/i.test(d.stage);
      const openDeals = dealCards.filter(d => !isWon(d) && !isLost(d));
      const fuRows = await q(`SELECT f.scheduled_date d, f.lead_id, f.deal_id, f.assigned_to FROM followups f WHERE f.status IN (?) AND (f.lead_id IS NOT NULL OR f.deal_id IS NOT NULL)`, [OPEN_FU]);
      const fu = mine ? fuRows.filter(r => Number(r.assigned_to) === uid) : fuRows;
      const today = ymd(now);
      const qs = await q("SELECT status, COUNT(*) n FROM estimations WHERE quote_base IS NOT NULL AND proposal_id IS NULL GROUP BY status");
      const qCount = (s) => Number(qs.find(x => x.status === s)?.n || 0) + decks.filter(x => x.status === s).length;
      const won90 = dealCards.filter(d => isWon(d) && d.closedAt && new Date(d.closedAt) >= d90).length;
      const lost90 = dealCards.filter(d => isLost(d) && d.closedAt && new Date(d.closedAt) >= d90).length;
      res.json({
        leads: leadCards, deals: dealCards, stages: stageList,
        kpis: {
          openLeads: leadCards.filter(l => ['New', 'Contacted', 'Qualified'].includes(l.status)).length,
          newLeadsWeek: leadCards.filter(l => new Date(l.createdAt) >= new Date(now.getTime() - 7 * 86400000)).length,
          openDeals: openDeals.filter(d => !d.onHold).length,
          pipelineValue: round2(openDeals.filter(d => !d.onHold).reduce((s, d) => s + d.value, 0)),
          weightedValue: round2(openDeals.filter(d => !d.onHold).reduce((s, d) => s + d.value * (d.probability / 100), 0)),
          onHold: leadCards.filter(l => l.status === 'On Hold').length + dealCards.filter(d => d.onHold).length,
          followupsToday: fu.filter(r => ymd(r.d) === today).length,
          followupsOverdue: fu.filter(r => ymd(r.d) < today).length,
          quotesPendingApproval: qCount('Pending Approval'),
          quotesAwaitingClient: qCount('Sent'),
          wonMonth: dealCards.filter(d => isWon(d) && d.closedAt && new Date(d.closedAt) >= monthStart).length,
          wonMonthValue: round2(dealCards.filter(d => isWon(d) && d.closedAt && new Date(d.closedAt) >= monthStart).reduce((s, d) => s + (Number(d.wonValue) || d.value), 0)),
          winRate: won90 + lost90 ? Math.round((won90 / (won90 + lost90)) * 100) : null,
          noNextStep: leadCards.filter(l => ['New', 'Contacted', 'Qualified'].includes(l.status) && !l.nextFollowup).length + openDeals.filter(d => !d.onHold && !d.nextFollowup).length
        }
      });
    } catch (e) { fail(res, e, 'Could not load the pipeline'); }
  });

  // ── Timeline ──────────────────────────────────────────────────────────
  const timeline = async ({ leadId, dealId }) => {
    const conds = []; const params = [];
    if (leadId) { conds.push('lead_id = ?'); params.push(leadId); }
    if (dealId) { conds.push('deal_id = ?'); params.push(dealId); }
    if (!conds.length) return [];
    const ev = await q(`SELECT * FROM sales_events WHERE ${conds.join(' OR ')} ORDER BY happened_at DESC, id DESC LIMIT 500`, params);
    const fus = await q(`SELECT f.*, CONCAT(f.scheduled_date, ' ', f.scheduled_time) AS at FROM followups f WHERE ${conds.join(' OR ')} ORDER BY f.scheduled_date DESC, f.scheduled_time DESC`, params);
    const names = await usersById();
    const items = ev.map(e => ({ id: `e-${e.id}`, kind: e.kind, title: e.title, body: e.body, meta: parseJson(e.meta, {}), by: e.by_name, at: e.happened_at, quotationId: e.quotation_id }));
    fus.filter(f => f.status === 'Completed').forEach(f => items.push({
      id: `f-${f.id}`, kind: 'followup_done', title: `${f.type} completed${f.outcome ? ` · ${f.outcome}` : ''}`, body: f.remarks || f.description || '',
      meta: { type: f.type, subject: f.subject }, by: f.assigned_to_name || names.get(Number(f.assigned_to)) || '', at: f.updated_at || f.at
    }));
    items.sort((a, b) => new Date(b.at) - new Date(a.at));
    const followups = fus.map(f => ({
      id: f.id, type: f.type, subject: f.subject, notes: f.description, date: ymd(f.scheduled_date), time: String(f.scheduled_time || '').slice(0, 5),
      status: f.status, outcome: f.outcome, remarks: f.remarks, priority: f.priority, meetingLink: f.meeting_link, location: f.meeting_location,
      duration: f.meeting_duration, assignedTo: f.assigned_to, assignedName: f.assigned_to_name || names.get(Number(f.assigned_to)) || '',
      overdue: OPEN_FU.includes(f.status) && new Date(`${ymd(f.scheduled_date)}T${String(f.scheduled_time || '23:59').slice(0, 5)}`) < new Date()
    }));
    return { items, followups };
  };

  // ── Leads ─────────────────────────────────────────────────────────────
  app.get('/api/sales-flow/leads/:id', async (req, res) => {
    try {
      if (!needUser(req, res)) return;
      await ready;
      const [lead] = await q('SELECT * FROM leads WHERE id = ?', [req.params.id]);
      if (!lead) return res.status(404).json({ error: 'Lead not found' });
      const names = await usersById();
      const [deal] = lead.converted_deal_id ? await q('SELECT id, deal_name, deal_stage, status, on_hold FROM deals WHERE id = ?', [lead.converted_deal_id]) : [];
      const t = await timeline({ leadId: lead.id });
      res.json({
        lead: { ...lead, status: lead.lead_status === 'Not Contacted' ? 'New' : lead.lead_status, owner: names.get(Number(lead.owner_id)) || '', tags: parseJson(lead.tags, lead.tags) },
        deal: deal || null, timeline: t.items, followups: t.followups
      });
    } catch (e) { fail(res, e, 'Could not load the lead'); }
  });

  app.post('/api/sales-flow/leads', async (req, res) => {
    try {
      if (!needUser(req, res)) return;
      await ready;
      if (onlyManagerAssigns(req, res, (req.body || {}).owner_id)) return;
      const b = req.body || {};
      const name = String(b.lead_name || '').trim();
      if (!name) return res.status(400).json({ error: 'Enter the contact or company name.' });
      if (!String(b.phone || '').trim() && !String(b.email || '').trim()) return res.status(400).json({ error: 'Enter a phone number or an email.' });
      // An enquiry from an existing customer keeps the link (repeat business).
      const [company] = Number(b.company_id) ? await q('SELECT id, company_name FROM companies WHERE id = ?', [b.company_id]) : [];
      const [r] = await pool.query(`INSERT INTO leads (lead_name, project_name, company, company_id, email, phone, lead_source, lead_status, value, currency, notes, owner_id, industry, status_changed_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'New', ?, ?, ?, ?, ?, NOW(), NOW(), NOW())`,
      [name, b.project_name || null, b.company || company?.company_name || null, company?.id || null, b.email || null, String(b.phone || '').slice(0, 20) || null, b.lead_source || null, Number(b.value) || 0, b.currency || 'INR',
        b.notes || null, Number(b.owner_id) || req.user.id, b.industry || null]);
      await event(req, { leadId: r.insertId, companyId: company?.id || null, kind: 'created', title: 'Enquiry received', body: b.notes || null, meta: { source: b.lead_source || '' } });
      if (b.followup && isDay(b.followup.date)) {
        await createFollowup(req, { leadId: r.insertId, ...b.followup });
      }
      if (Number(b.owner_id) && Number(b.owner_id) !== Number(req.user.id)) {
        notify([b.owner_id], `New enquiry assigned: ${name}`, `${req.user.name} assigned you an enquiry${b.lead_source ? ` from ${b.lead_source}` : ''}.`, null);
      }
      res.status(201).json({ id: r.insertId });
    } catch (e) { fail(res, e, 'Could not create the lead'); }
  });

  app.put('/api/sales-flow/leads/:id', async (req, res) => {
    try {
      if (!needUser(req, res)) return;
      if (onlyManagerAssigns(req, res, req.body?.owner_id)) return;
      const allowed = ['lead_name', 'project_name', 'company', 'email', 'phone', 'lead_source', 'value', 'currency', 'notes', 'industry', 'owner_id', 'rating'];
      const sets = []; const vals = [];
      allowed.forEach(k => { if (req.body?.[k] !== undefined) { sets.push(`${k} = ?`); vals.push(req.body[k] === '' ? null : req.body[k]); } });
      if (!sets.length) return res.json({ ok: true });
      const [before] = await q('SELECT owner_id, lead_name FROM leads WHERE id = ?', [req.params.id]);
      if (!before) return res.status(404).json({ error: 'Lead not found' });
      await pool.query(`UPDATE leads SET ${sets.join(', ')}, updated_at = NOW() WHERE id = ?`, [...vals, req.params.id]);
      if (req.body.owner_id !== undefined && Number(req.body.owner_id) !== Number(before.owner_id)) {
        const names = await usersById();
        await event(req, { leadId: Number(req.params.id), kind: 'assigned', title: `Assigned to ${names.get(Number(req.body.owner_id)) || 'nobody'}` });
        if (Number(req.body.owner_id) !== Number(req.user.id)) notify([req.body.owner_id], `Enquiry assigned: ${before.lead_name}`, `${req.user.name} assigned this enquiry to you.`, null);
      }
      res.json({ ok: true });
    } catch (e) { fail(res, e, 'Could not save the lead'); }
  });

  app.post('/api/sales-flow/leads/:id/status', async (req, res) => {
    try {
      if (!needUser(req, res)) return;
      await ready;
      const status = String(req.body?.status || '');
      if (!LEAD_STATUSES.includes(status)) return res.status(400).json({ error: 'Unknown status.' });
      const reason = String(req.body?.reason || '').trim();
      const holdUntil = req.body?.holdUntil;
      if (['Lost', 'Unqualified', 'On Hold'].includes(status) && !reason) return res.status(400).json({ error: `Give a reason for ${status === 'On Hold' ? 'putting it on hold' : `marking it ${status}`}.` });
      if (status === 'On Hold' && !isDay(holdUntil)) return res.status(400).json({ error: 'Choose until when it is on hold.' });
      const [lead] = await q('SELECT lead_status, converted_deal_id FROM leads WHERE id = ?', [req.params.id]);
      if (!lead) return res.status(404).json({ error: 'Lead not found' });
      if (lead.converted_deal_id && status !== 'Lost') return res.status(400).json({ error: 'This enquiry is already a deal; change the deal instead.' });
      await pool.query(`UPDATE leads SET lead_status = ?, status_changed_at = NOW(), updated_at = NOW(),
          hold_until = ?, hold_reason = ?, lost_reason = ? WHERE id = ?`,
      [status, status === 'On Hold' ? holdUntil : null, status === 'On Hold' ? reason : null, ['Lost', 'Unqualified'].includes(status) ? reason : null, req.params.id]);
      await event(req, { leadId: Number(req.params.id), kind: 'status', title: `Status: ${lead.lead_status} → ${status}`, body: reason || null, meta: { from: lead.lead_status, to: status, holdUntil: status === 'On Hold' ? holdUntil : null } });
      // A lead put on hold gets a reminder on the day it comes back.
      if (status === 'On Hold') await createFollowup(req, { leadId: Number(req.params.id), type: 'Call', subject: 'Back from hold: check in', date: holdUntil, time: '11:00', notes: `On hold: ${reason}` });
      if (['Lost', 'Unqualified'].includes(status)) await pool.query("UPDATE followups SET status = 'Cancelled', remarks = CONCAT(COALESCE(remarks, ''), ?) WHERE lead_id = ? AND status IN (?)", [` [Cancelled: lead ${status.toLowerCase()}]`, req.params.id, OPEN_FU]);
      res.json({ ok: true });
    } catch (e) { fail(res, e, 'Could not change the status'); }
  });

  app.post('/api/sales-flow/leads/:id/convert', async (req, res) => {
    let conn;
    try {
      if (!needUser(req, res)) return;
      await ready;
      conn = await pool.getConnection();
      await conn.beginTransaction();
      const [[lead]] = await conn.query('SELECT * FROM leads WHERE id = ? FOR UPDATE', [req.params.id]);
      if (!lead) { await conn.rollback(); return res.status(404).json({ error: 'Lead not found' }); }
      if (lead.converted_deal_id) { await conn.rollback(); return res.json({ dealId: lead.converted_deal_id, already: true }); }
      const b = req.body || {};
      if (!isMgr(req) && b.assignee_id && Number(b.assignee_id) !== Number(req.user.id)) { await conn.rollback(); return res.status(403).json({ error: 'Only a manager can assign work to someone else.' }); }
      const dealName = String(b.deal_name || lead.project_name || lead.company || lead.lead_name).trim();
      let companyId = lead.company_id || lead.converted_company_id || null;
      const companyName = String(b.company || lead.company || lead.lead_name || '').trim();
      if (!companyId && companyName) {
        const [[match]] = await conn.query('SELECT id FROM companies WHERE company_name = ? LIMIT 1', [companyName]);
        if (match) companyId = match.id;
        else {
          const [ins] = await conn.query("INSERT INTO companies (company_name, email, phone, industry, status, source, created_at, updated_at) VALUES (?, ?, ?, ?, 'Active', ?, NOW(), NOW())",
            [companyName, lead.email || null, lead.phone || null, lead.industry || null, lead.lead_source || 'Enquiry']);
          companyId = ins.insertId;
        }
      }
      const [[first]] = await conn.query("SELECT id, name, probability FROM pipeline_stages WHERE COALESCE(status, 'Active') = 'Active' ORDER BY position, id LIMIT 1");
      const stageRow = b.stage ? (await conn.query('SELECT id, name, probability FROM pipeline_stages WHERE name = ?', [b.stage]))[0][0] : first;
      const [ins] = await conn.query(`INSERT INTO deals (deal_name, description, deal_value, currency, status, company_id, deal_stage, pipeline_stage_id, probability,
          assignee_id, expected_close_date, source, priority, lead_id, created_at, updated_at) VALUES (?, ?, ?, ?, 'Open', ?, ?, ?, ?, ?, ?, ?, 'Medium', ?, NOW(), NOW())`,
      [dealName, b.description || lead.notes || null, Number(b.deal_value ?? lead.value) || 0, lead.currency || 'INR', companyId, stageRow?.name || 'New', stageRow?.id || null,
        stageRow?.probability ?? 10, Number(b.assignee_id) || lead.owner_id || req.user.id, isDay(b.expected_close_date) ? b.expected_close_date : null, lead.lead_source || null, lead.id]);
      const dealId = ins.insertId;
      await conn.query("UPDATE leads SET lead_status = 'Converted to Deal', converted_deal_id = ?, converted_company_id = COALESCE(converted_company_id, ?), status_changed_at = NOW(), updated_at = NOW() WHERE id = ?", [dealId, companyId, lead.id]);
      // Open follow-ups carry over to the deal.
      await conn.query("UPDATE followups SET deal_id = ?, related_type = 'Deal', related_id = ? WHERE lead_id = ? AND status IN (?)", [dealId, dealId, lead.id, OPEN_FU]);
      await conn.commit();
      await event(req, { leadId: lead.id, dealId, kind: 'converted', title: `Converted to deal: ${dealName}`, meta: { stage: stageRow?.name } });
      res.status(201).json({ dealId });
    } catch (e) {
      if (conn) await conn.rollback().catch(() => {});
      fail(res, e, 'Could not convert the lead');
    } finally { if (conn) conn.release(); }
  });

  // ── Deals ─────────────────────────────────────────────────────────────
  /** Presentation-style quotations (proposal decks); the same documents as quotations, in another format. */
  const deckRows = async () => (app.locals.salesProposals ? app.locals.salesProposals.rows() : []);
  const loadQuotations = async (dealId) => {
    const rows = await q('SELECT * FROM estimations WHERE deal_id = ? AND proposal_id IS NULL ORDER BY COALESCE(quote_base, estimation_number), version DESC, id DESC', [dealId]);
    return rows.map(shapeQuote);
  };
  const shapeQuote = (e) => ({
    id: e.id, number: e.estimation_number, base: e.quote_base || e.estimation_number, version: e.version || 1, status: e.status,
    subject: e.subject || e.description || '', date: e.estimate_date, validUntil: e.expiry_date, currency: e.currency || 'INR',
    subtotal: Number(e.subtotal) || 0, discount: Number(e.discount_amount) || 0, tax: Number(e.tax_amount) || 0, total: Number(e.total) || 0,
    gstMode: e.gst_mode || 'intra', cgst: Number(e.cgst_amount) || 0, sgst: Number(e.sgst_amount) || 0, igst: Number(e.igst_amount) || 0,
    maxDiscountPct: Number(e.max_discount_pct) || 0, revisionNote: e.revision_note, approvalStatus: e.approval_status, approvalNote: e.approval_note,
    approvalRequestedBy: e.approval_requested_by, approvedBy: e.approved_by, approvedAt: e.approved_at, sentAt: e.sent_at, sentTo: e.sent_to,
    respondedAt: e.responded_at, declineReason: e.decline_reason, createdBy: e.created_by_name, dealId: e.deal_id, leadId: e.lead_id,
    terms: e.terms, notes: e.notes, parentId: e.parent_id, proposalId: e.proposal_id || null, quoteType: e.quote_type || 'general', plan: parseJson(e.plan, null),
    client: { name: e.client_name || e.bill_to || '', contact: e.client_contact || '', email: e.client_email || '', phone: e.client_phone || '', address: e.client_address || '', gstin: e.client_gstin || '', state: e.client_state || '' },
    createdAt: e.created_at, updatedAt: e.updated_at
  });

  app.get('/api/sales-flow/deals/:id', async (req, res) => {
    try {
      if (!needUser(req, res)) return;
      await ready;
      const [deal] = await q(`SELECT d.*, c.company_name, c.email AS company_email, c.phone AS company_phone, c.address AS company_address, c.city, c.state AS company_state
        FROM deals d LEFT JOIN companies c ON c.id = d.company_id WHERE d.id = ?`, [req.params.id]);
      if (!deal) return res.status(404).json({ error: 'Deal not found' });
      const names = await usersById();
      let [lead] = deal.lead_id ? await q('SELECT * FROM leads WHERE id = ?', [deal.lead_id]) : [];
      if (!lead) [lead] = await q('SELECT * FROM leads WHERE converted_deal_id = ? LIMIT 1', [deal.id]);
      const [contact] = deal.contact_id ? await q('SELECT id, first_name, last_name, email, phone, position FROM contacts WHERE id = ?', [deal.contact_id]) : [];
      const t = await timeline({ leadId: lead?.id || null, dealId: deal.id });
      res.json({
        deal: {
          ...deal, owner: names.get(Number(deal.assignee_id)) || '', status: deal.on_hold ? 'On Hold' : (deal.status || 'Open'),
          contact: contact ? { ...contact, name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim() } : null
        },
        lead: lead ? { id: lead.id, name: lead.lead_name, email: lead.email, phone: lead.phone, company: lead.company, source: lead.lead_source } : null,
        stages: await stages(), quotations: await loadQuotations(deal.id), decks: (await deckRows()).filter(x => Number(x.dealId) === Number(deal.id)), timeline: t.items, followups: t.followups
      });
    } catch (e) { fail(res, e, 'Could not load the deal'); }
  });

  app.put('/api/sales-flow/deals/:id', async (req, res) => {
    try {
      if (!needUser(req, res)) return;
      if (onlyManagerAssigns(req, res, req.body?.assignee_id)) return;
      const allowed = ['deal_name', 'deal_value', 'currency', 'expected_close_date', 'assignee_id', 'priority', 'description', 'company_id', 'contact_id', 'source'];
      const sets = []; const vals = [];
      allowed.forEach(k => { if (req.body?.[k] !== undefined) { sets.push(`${k} = ?`); vals.push(req.body[k] === '' ? null : req.body[k]); } });
      if (!sets.length) return res.json({ ok: true });
      const [before] = await q('SELECT assignee_id, deal_name FROM deals WHERE id = ?', [req.params.id]);
      if (!before) return res.status(404).json({ error: 'Deal not found' });
      await pool.query(`UPDATE deals SET ${sets.join(', ')}, updated_at = NOW() WHERE id = ?`, [...vals, req.params.id]);
      if (req.body.assignee_id !== undefined && Number(req.body.assignee_id) !== Number(before.assignee_id)) {
        const names = await usersById();
        await event(req, { dealId: Number(req.params.id), kind: 'assigned', title: `Assigned to ${names.get(Number(req.body.assignee_id)) || 'nobody'}` });
        if (Number(req.body.assignee_id) !== Number(req.user.id)) notify([req.body.assignee_id], `Deal assigned: ${before.deal_name}`, `${req.user.name} assigned this deal to you.`, null);
      }
      res.json({ ok: true });
    } catch (e) { fail(res, e, 'Could not save the deal'); }
  });

  app.post('/api/sales-flow/deals/:id/stage', async (req, res) => {
    try {
      if (!needUser(req, res)) return;
      await ready;
      const [deal] = await q('SELECT * FROM deals WHERE id = ?', [req.params.id]);
      if (!deal) return res.status(404).json({ error: 'Deal not found' });
      const stageName = String(req.body?.stage || '');
      const [stage] = await q('SELECT id, name, probability FROM pipeline_stages WHERE name = ?', [stageName]);
      if (!stage) return res.status(400).json({ error: 'Unknown stage.' });
      const reason = String(req.body?.reason || '').trim();
      const won = /^won$/i.test(stage.name); const lost = /^lost$/i.test(stage.name);
      if (lost && !reason) return res.status(400).json({ error: 'Give the reason the deal was lost.' });
      let wonValue = null;
      if (won) {
        wonValue = Number(req.body?.wonValue);
        if (!(wonValue > 0)) {
          const [acc] = await q("SELECT total FROM estimations WHERE deal_id = ? AND status = 'Accepted' ORDER BY id DESC LIMIT 1", [deal.id]);
          wonValue = Number(acc?.total) || Number(deal.deal_value) || 0;
        }
      }
      await pool.query(`UPDATE deals SET deal_stage = ?, pipeline_stage_id = ?, probability = ?, status = ?, on_hold = 0, hold_until = NULL, hold_reason = NULL,
          lost_reason = ?, won_value = ?, closed_at = ?, updated_at = NOW() WHERE id = ?`,
      [stage.name, stage.id, stage.probability, won ? 'Won' : lost ? 'Lost' : 'Open', lost ? reason : null, won ? wonValue : null, won || lost ? new Date() : null, deal.id]);
      await event(req, {
        dealId: deal.id, kind: won ? 'won' : lost ? 'lost' : 'stage',
        title: won ? `Deal won · ${round2(wonValue).toLocaleString('en-IN')}` : lost ? 'Deal lost' : `Stage: ${deal.deal_stage || '—'} → ${stage.name}`,
        body: reason || null, meta: { from: deal.deal_stage, to: stage.name, wonValue }
      });
      if (won || lost) {
        await pool.query("UPDATE followups SET status = 'Cancelled' WHERE deal_id = ? AND status IN (?)", [deal.id, OPEN_FU]);
        const mgrs = (await salesManagers()).filter(id => id !== Number(req.user.id));
        notify(mgrs, `${won ? 'Won' : 'Lost'}: ${deal.deal_name}`, won ? `${req.user.name} closed it for ${round2(wonValue).toLocaleString('en-IN')}.` : `${req.user.name}: ${reason}`, null);
      }
      res.json({ ok: true });
    } catch (e) { fail(res, e, 'Could not change the stage'); }
  });

  app.post('/api/sales-flow/deals/:id/hold', async (req, res) => {
    try {
      if (!needUser(req, res)) return;
      await ready;
      const reason = String(req.body?.reason || '').trim(); const until = req.body?.until;
      if (!reason) return res.status(400).json({ error: 'Give a reason for putting it on hold.' });
      if (!isDay(until)) return res.status(400).json({ error: 'Choose until when it is on hold.' });
      const [deal] = await q('SELECT id FROM deals WHERE id = ?', [req.params.id]);
      if (!deal) return res.status(404).json({ error: 'Deal not found' });
      await pool.query('UPDATE deals SET on_hold = 1, hold_until = ?, hold_reason = ?, updated_at = NOW() WHERE id = ?', [until, reason, deal.id]);
      await event(req, { dealId: deal.id, kind: 'hold', title: `On hold until ${until}`, body: reason });
      await createFollowup(req, { dealId: deal.id, type: 'Call', subject: 'Back from hold: check in', date: until, time: '11:00', notes: `On hold: ${reason}` });
      res.json({ ok: true });
    } catch (e) { fail(res, e, 'Could not put it on hold'); }
  });
  app.post('/api/sales-flow/deals/:id/resume', async (req, res) => {
    try {
      if (!needUser(req, res)) return;
      await pool.query('UPDATE deals SET on_hold = 0, hold_until = NULL, hold_reason = NULL, updated_at = NOW() WHERE id = ?', [req.params.id]);
      await event(req, { dealId: Number(req.params.id), kind: 'resume', title: 'Taken off hold' });
      res.json({ ok: true });
    } catch (e) { fail(res, e, 'Could not resume'); }
  });
  app.post('/api/sales-flow/leads/:id/resume', async (req, res) => {
    try {
      if (!needUser(req, res)) return;
      await pool.query("UPDATE leads SET lead_status = 'Contacted', hold_until = NULL, hold_reason = NULL, status_changed_at = NOW(), updated_at = NOW() WHERE id = ?", [req.params.id]);
      await event(req, { leadId: Number(req.params.id), kind: 'resume', title: 'Taken off hold' });
      res.json({ ok: true });
    } catch (e) { fail(res, e, 'Could not resume'); }
  });

  // ── Communications ────────────────────────────────────────────────────
  app.post('/api/sales-flow/communications', async (req, res) => {
    try {
      if (!needUser(req, res)) return;
      await ready;
      const b = req.body || {};
      const leadId = Number(b.leadId) || null; const dealId = Number(b.dealId) || null;
      if (!leadId && !dealId) return res.status(400).json({ error: 'Missing lead or deal.' });
      const channel = CHANNELS.includes(b.channel) ? b.channel : 'Note';
      const summary = String(b.summary || '').trim();
      if (!summary) return res.status(400).json({ error: 'Write what was discussed.' });
      const at = b.at ? new Date(b.at) : new Date();
      const title = channel === 'Note' ? 'Note' : `${channel}${b.direction === 'in' ? ' from client' : b.direction === 'out' ? ' to client' : ''}${b.outcome ? ` · ${b.outcome}` : ''}`;
      await event(req, { leadId, dealId, kind: 'communication', title, body: summary, meta: { channel, direction: b.direction || null, outcome: b.outcome || null, durationMin: Number(b.durationMin) || null }, at: isNaN(at) ? null : at });
      if (leadId && channel !== 'Note') {
        await pool.query("UPDATE leads SET follow_up_count = COALESCE(follow_up_count, 0) + 1, last_follow_up = NOW(), lead_status = IF(lead_status IN ('New', 'Not Contacted'), 'Contacted', lead_status), updated_at = NOW() WHERE id = ?", [leadId]);
      }
      if (dealId) await pool.query('UPDATE deals SET updated_at = NOW() WHERE id = ?', [dealId]);
      let followupId = null;
      if (b.next && isDay(b.next.date)) followupId = await createFollowup(req, { leadId, dealId, ...b.next });
      res.status(201).json({ ok: true, followupId });
    } catch (e) { fail(res, e, 'Could not save the communication'); }
  });

  // ── Follow-ups & meetings ─────────────────────────────────────────────
  async function createFollowup(req, f) {
    const date = f.date; const time = isTime(f.time) ? f.time : '11:00';
    const type = FOLLOWUP_TYPES.includes(f.type) ? f.type : 'Call';
    const assigned = Number(f.assignedTo) || req.user.id;
    const names = await usersById();
    const leadId = Number(f.leadId) || null; const dealId = Number(f.dealId) || null;
    const [r] = await pool.query(`INSERT INTO followups (related_type, related_id, type, subject, description, scheduled_date, scheduled_time, priority,
        meeting_link, meeting_location, meeting_duration, assigned_to, assigned_to_name, status, lead_id, deal_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Scheduled', ?, ?, NOW(), NOW())`,
    [dealId ? 'Deal' : 'Lead', dealId || leadId, type, String(f.subject || `${type} follow-up`).slice(0, 255), f.notes || null, date, time,
      ['Low', 'Medium', 'High'].includes(f.priority) ? f.priority : 'Medium', f.meetingLink || null, f.location || null, f.duration ? String(f.duration).slice(0, 50) : null,
      assigned, names.get(assigned) || null, leadId, dealId]);
    await event(req, { leadId, dealId, kind: 'scheduled', title: `${type} scheduled for ${date} ${time.slice(0, 5)}`, body: f.subject || null, meta: { followupId: r.insertId, type, assignedTo: names.get(assigned) } });
    if (assigned !== Number(req.user.id)) notify([assigned], `${type} scheduled for you`, `${f.subject || type} on ${date} at ${time.slice(0, 5)} (by ${req.user.name}).`, null);
    return r.insertId;
  }

  app.post('/api/sales-flow/followups', async (req, res) => {
    try {
      if (!needUser(req, res)) return;
      await ready;
      const b = req.body || {};
      if (!Number(b.leadId) && !Number(b.dealId)) return res.status(400).json({ error: 'Missing lead or deal.' });
      if (!isDay(b.date)) return res.status(400).json({ error: 'Choose a date.' });
      const id = await createFollowup(req, b);
      res.status(201).json({ id });
    } catch (e) { fail(res, e, 'Could not schedule it'); }
  });

  app.post('/api/sales-flow/followups/:id/complete', async (req, res) => {
    try {
      if (!needUser(req, res)) return;
      const [f] = await q('SELECT * FROM followups WHERE id = ?', [req.params.id]);
      if (!f) return res.status(404).json({ error: 'Not found' });
      const outcome = String(req.body?.outcome || '').trim();
      const notes = String(req.body?.notes || '').trim();
      if (!notes && !outcome) return res.status(400).json({ error: 'Write how it went.' });
      await pool.query("UPDATE followups SET status = 'Completed', outcome = ?, remarks = ?, updated_at = NOW() WHERE id = ?", [outcome.slice(0, 100) || null, notes || null, f.id]);
      const channel = /meet|visit|demo/i.test(f.type) ? 'Meeting' : /whatsapp/i.test(f.type) ? 'WhatsApp' : /email/i.test(f.type) ? 'Email' : 'Call';
      await event(req, { leadId: f.lead_id, dealId: f.deal_id, kind: 'communication', title: `${f.type}${outcome ? ` · ${outcome}` : ''}`, body: notes || f.subject, meta: { channel, outcome, followupId: f.id } });
      if (f.lead_id) await pool.query("UPDATE leads SET follow_up_count = COALESCE(follow_up_count, 0) + 1, last_follow_up = NOW(), lead_status = IF(lead_status IN ('New', 'Not Contacted'), 'Contacted', lead_status), updated_at = NOW() WHERE id = ?", [f.lead_id]);
      let nextId = null;
      const n = req.body?.next;
      if (n && isDay(n.date)) nextId = await createFollowup(req, { leadId: f.lead_id, dealId: f.deal_id, ...n });
      res.json({ ok: true, nextId });
    } catch (e) { fail(res, e, 'Could not complete it'); }
  });

  app.post('/api/sales-flow/followups/:id/reschedule', async (req, res) => {
    try {
      if (!needUser(req, res)) return;
      const [f] = await q('SELECT * FROM followups WHERE id = ?', [req.params.id]);
      if (!f) return res.status(404).json({ error: 'Not found' });
      if (!isDay(req.body?.date)) return res.status(400).json({ error: 'Choose a date.' });
      const time = isTime(req.body?.time) ? req.body.time : String(f.scheduled_time || '11:00').slice(0, 5);
      await pool.query("UPDATE followups SET scheduled_date = ?, scheduled_time = ?, status = 'Scheduled', updated_at = NOW() WHERE id = ?", [req.body.date, time, f.id]);
      await event(req, { leadId: f.lead_id, dealId: f.deal_id, kind: 'rescheduled', title: `${f.type} moved to ${req.body.date} ${time.slice(0, 5)}`, body: req.body?.reason || null });
      res.json({ ok: true });
    } catch (e) { fail(res, e, 'Could not reschedule'); }
  });

  app.post('/api/sales-flow/followups/:id/cancel', async (req, res) => {
    try {
      if (!needUser(req, res)) return;
      const [f] = await q('SELECT * FROM followups WHERE id = ?', [req.params.id]);
      if (!f) return res.status(404).json({ error: 'Not found' });
      await pool.query("UPDATE followups SET status = 'Cancelled', remarks = ?, updated_at = NOW() WHERE id = ?", [req.body?.reason || null, f.id]);
      await event(req, { leadId: f.lead_id, dealId: f.deal_id, kind: 'cancelled', title: `${f.type} cancelled`, body: req.body?.reason || null });
      res.json({ ok: true });
    } catch (e) { fail(res, e, 'Could not cancel'); }
  });

  // Agenda: follow-ups and meetings across leads and deals.
  app.get('/api/sales-flow/agenda', async (req, res) => {
    try {
      if (!needUser(req, res)) return;
      await ready;
      const mine = req.query.scope !== 'all' || !isMgr(req);
      const uid = Number(req.user.id);
      const rows = await q(`SELECT f.*, l.lead_name, l.phone AS lead_phone, l.email AS lead_email, l.lead_status, d.deal_name, d.deal_stage, c.company_name, c.phone AS company_phone
        FROM followups f LEFT JOIN leads l ON l.id = f.lead_id LEFT JOIN deals d ON d.id = f.deal_id LEFT JOIN companies c ON c.id = d.company_id
        WHERE (f.lead_id IS NOT NULL OR f.deal_id IS NOT NULL) AND (f.status IN (?) OR (f.status = 'Completed' AND f.updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)))
        ${mine ? 'AND f.assigned_to = ?' : ''} ORDER BY f.scheduled_date, f.scheduled_time`, mine ? [OPEN_FU, uid] : [OPEN_FU]);
      const names = await usersById();
      const now = new Date(); const today = ymd(now);
      const items = rows.map(f => {
        const date = ymd(f.scheduled_date); const time = String(f.scheduled_time || '').slice(0, 5);
        const open = OPEN_FU.includes(f.status);
        return {
          id: f.id, type: f.type, subject: f.subject, notes: f.description, date, time, status: f.status, outcome: f.outcome, remarks: f.remarks,
          meetingLink: f.meeting_link, location: f.meeting_location, priority: f.priority,
          assignedTo: f.assigned_to, assignedName: f.assigned_to_name || names.get(Number(f.assigned_to)) || '',
          leadId: f.lead_id, dealId: f.deal_id, name: f.deal_name || f.lead_name || '', company: f.company_name || '',
          phone: f.lead_phone || f.company_phone || '', email: f.lead_email || '', stage: f.deal_stage || f.lead_status || '',
          bucket: !open ? 'done' : date < today || (date === today && new Date(`${date}T${time || '23:59'}`) < now) ? 'overdue' : date === today ? 'today' : 'upcoming'
        };
      });
      res.json({ items, counts: ['overdue', 'today', 'upcoming', 'done'].reduce((o, k) => ({ ...o, [k]: items.filter(i => i.bucket === k).length }), {}) });
    } catch (e) { fail(res, e, 'Could not load the agenda'); }
  });

  // ── Quotations ────────────────────────────────────────────────────────
  const nextBase = async (prefix) => {
    const year = new Date().getFullYear();
    const like = `${prefix}-${year}-%`;
    const rows = [...await q('SELECT quote_base FROM estimations WHERE quote_base LIKE ?', [like]), ...(await q('SELECT proposal_number AS quote_base FROM sales_proposals WHERE proposal_number LIKE ?', [like]).catch(() => []))];
    const max = rows.reduce((m, r) => Math.max(m, parseInt(String(r.quote_base).split('-').pop(), 10) || 0), 0);
    return `${prefix}-${year}-${String(max + 1).padStart(4, '0')}`;
  };
  async function nextInvoiceNumber(settings) {
    const prefix = settings?.invoice?.prefix || 'INV';
    const year = new Date().getFullYear();
    const rows = await q('SELECT invoice_number FROM invoices WHERE invoice_number LIKE ?', [`${prefix}-${year}-%`]);
    const next = rows.reduce((m, r) => Math.max(m, parseInt(String(r.invoice_number).split('-').pop(), 10) || 0), 0) + 1;
    return `${prefix}-${year}-${String(next).padStart(4, '0')}`;
  }
  const cleanItems = (items, defaultTax) => (Array.isArray(items) ? items : []).map((it, i) => ({
    name: String(it.name || it.item_name || '').trim().slice(0, 255), description: String(it.description || '').slice(0, 2000),
    hsn: String(it.hsn || it.hsn_sac || '').trim().slice(0, 20), unit: String(it.unit || '').trim().slice(0, 20),
    qty: Number(it.qty ?? it.quantity) || 0, rate: Math.max(0, Number(it.rate) || 0),
    discountPct: Math.min(100, Math.max(0, Number(it.discountPct ?? it.discount_percent) || 0)),
    taxPct: Math.min(40, Math.max(0, it.taxPct === undefined && it.tax_percent === undefined ? defaultTax : Number(it.taxPct ?? it.tax_percent) || 0)), position: i
  })).filter(it => it.name && it.qty !== 0);

  const saveQuote = async (conn, id, data, items) => {
    const t = computeTotals(items, data.gstMode);
    await conn.query(`UPDATE estimations SET subject = ?, description = ?, gst_mode = ?, estimate_date = ?, expiry_date = ?, terms = ?, notes = ?,
        subtotal = ?, discount_amount = ?, discount_percentage = ?, tax_amount = ?, tax_percentage = ?, cgst_amount = ?, sgst_amount = ?, igst_amount = ?, total = ?, amount = ?,
        max_discount_pct = ?, client_name = ?, client_contact = ?, client_email = ?, client_phone = ?, client_address = ?, client_gstin = ?, client_state = ?, bill_to = ?,
        currency = ?, quote_type = ?, plan = ?, updated_at = NOW() WHERE id = ?`,
    [data.subject || null, data.subject || null, data.gstMode, data.date, data.validUntil, data.terms || null, data.notes || null,
      t.gross, t.discount, t.discountPct, t.tax, t.taxable ? round2((t.tax / t.taxable) * 100) : 0, t.cgst, t.sgst, t.igst, t.total, t.total,
      Math.max(t.discountPct, t.maxLineDiscountPct), data.client.name || null, data.client.contact || null, data.client.email || null, data.client.phone || null,
      data.client.address || null, data.client.gstin || null, data.client.state || null, data.client.name || null, data.currency || 'INR',
      data.quoteType || null, data.plan ? JSON.stringify(data.plan) : null, id]);
    await conn.query('DELETE FROM estimation_line_items WHERE estimation_id = ?', [id]);
    for (const l of t.lines) {
      await conn.query(`INSERT INTO estimation_line_items (estimation_id, item_name, description, quantity, rate, discount_percent, discount_amount, tax_percent, tax_amount, subtotal, total, hsn_sac, unit, position)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, l.name, l.description || null, l.qty, l.rate, l.discountPct, l.discount, l.taxPct, l.tax, l.taxable, l.total, l.hsn || null, l.unit || null, l.position]);
    }
    return t;
  };
  const quoteInput = (b, settings, fallbackClient = {}) => {
    const days = settings.quotation.validityDays;
    const date = isDay(b.date) ? b.date : ymd(new Date());
    const valid = isDay(b.validUntil) ? b.validUntil : ymd(new Date(new Date(`${date}T12:00:00`).getTime() + days * 86400000));
    const c = { ...fallbackClient, ...(b.client || {}) };
    let gstMode = b.gstMode === 'inter' ? 'inter' : b.gstMode === 'intra' ? 'intra' : null;
    if (!gstMode) gstMode = c.state && settings.company.state && c.state.trim().toLowerCase() !== settings.company.state.trim().toLowerCase() ? 'inter' : 'intra';
    const quoteType = ['retainer', 'project'].includes(b.quoteType) ? b.quoteType : null;
    const defaultTerms = quoteType === 'retainer' ? settings.quotation.termsRetainer : quoteType === 'project' ? settings.quotation.termsProject : settings.quotation.terms;
    return { subject: String(b.subject || '').slice(0, 255), date, validUntil: valid, terms: b.terms ?? defaultTerms, notes: b.notes || null, gstMode, currency: b.currency || 'INR', client: c, quoteType, plan: cleanPlan(quoteType, b.plan || {}) };
  };
  const loadQuote = async (id) => {
    const [e] = await q('SELECT * FROM estimations WHERE id = ?', [id]);
    if (!e) return null;
    const items = await q('SELECT * FROM estimation_line_items WHERE estimation_id = ? ORDER BY position, id', [id]);
    const versions = await q('SELECT id, estimation_number, version, status, total, created_at, revision_note FROM estimations WHERE quote_base = ? ORDER BY version', [e.quote_base || e.estimation_number]);
    const [deal] = e.deal_id ? await q('SELECT d.id, d.deal_name, d.deal_stage, c.company_name FROM deals d LEFT JOIN companies c ON c.id = d.company_id WHERE d.id = ?', [e.deal_id]) : [];
    return {
      ...shapeQuote(e),
      items: items.map(i => ({ id: i.id, name: i.item_name, description: i.description || '', hsn: i.hsn_sac || '', unit: i.unit || '', qty: Number(i.quantity), rate: Number(i.rate), discountPct: Number(i.discount_percent) || 0, taxPct: Number(i.tax_percent) || 0, total: Number(i.total) || 0 })),
      versions: versions.map(v => ({ id: v.id, number: v.estimation_number, version: v.version, status: v.status, total: Number(v.total) || 0, createdAt: v.created_at, revisionNote: v.revision_note })),
      deal: deal ? { id: deal.id, name: deal.deal_name, stage: deal.deal_stage, company: deal.company_name } : null
    };
  };
  const quoteEvents = async (id) => (await q('SELECT * FROM sales_events WHERE quotation_id = ? ORDER BY happened_at DESC, id DESC', [id]))
    .map(e => ({ id: e.id, kind: e.kind, title: e.title, body: e.body, by: e.by_name, at: e.happened_at }));

  app.get('/api/sales-flow/quotations', async (req, res) => {
    try {
      if (!needUser(req, res)) return;
      await ready;
      const rows = await q(`SELECT e.*, d.deal_name, d.assignee_id, c.company_name,
          (SELECT COUNT(*) FROM estimations v WHERE v.quote_base = e.quote_base) AS version_count
        FROM estimations e LEFT JOIN deals d ON d.id = e.deal_id LEFT JOIN companies c ON c.id = d.company_id
        WHERE e.quote_base IS NOT NULL AND e.status <> 'Revised' AND e.proposal_id IS NULL ORDER BY e.updated_at DESC`);
      const allDecks = await deckRows();
      let decks = allDecks;
      if (req.query.scope === 'mine') decks = decks.filter(x => Number(x.ownerId) === Number(req.user.id) || x.createdBy === req.user.name);
      if (req.query.status) decks = decks.filter(x => x.status === req.query.status);
      const dterm = String(req.query.q || '').trim().toLowerCase();
      if (dterm) decks = decks.filter(x => [x.number, x.title, x.client, x.dealName].some(v => String(v || '').toLowerCase().includes(dterm)));
      let list = rows;
      if (req.query.scope === 'mine' || !isMgr(req)) list = list.filter(r => Number(r.assignee_id) === Number(req.user.id) || r.created_by_name === req.user.name);
      if (req.query.status) list = list.filter(r => r.status === req.query.status);
      const term = String(req.query.q || '').trim().toLowerCase();
      if (term) list = list.filter(r => [r.estimation_number, r.subject, r.client_name, r.deal_name, r.company_name].some(v => String(v || '').toLowerCase().includes(term)));
      const today = ymd(new Date());
      res.json({
        quotations: list.map(r => ({ ...shapeQuote(r), dealName: r.deal_name, company: r.company_name, versionCount: Number(r.version_count) || 1, expired: r.status === 'Sent' && r.expiry_date && ymd(r.expiry_date) < today })),
        decks,
        counts: ['Draft', 'Pending Approval', 'Approved', 'Sent', 'Accepted', 'Declined'].reduce((o, s) => ({ ...o, [s]: rows.filter(r => r.status === s).length + allDecks.filter(x => x.status === s).length }), {})
      });
    } catch (e) { fail(res, e, 'Could not load quotations'); }
  });

  app.get('/api/sales-flow/quotations/:id', async (req, res) => {
    try {
      if (!needUser(req, res)) return;
      await ready;
      const quote = await loadQuote(req.params.id);
      if (!quote) return res.status(404).json({ error: 'Quotation not found' });
      const settings = await getSettings();
      res.json({ quotation: quote, events: await quoteEvents(quote.id), approvalLimit: settings.quotation.discountApprovalPct, canApprove: isMgr(req) });
    } catch (e) { fail(res, e, 'Could not load the quotation'); }
  });

  app.post('/api/sales-flow/deals/:id/quotations', async (req, res) => {
    let conn;
    try {
      if (!needUser(req, res)) return;
      await ready;
      const [deal] = await q(`SELECT d.*, c.company_name, c.email AS c_email, c.phone AS c_phone, c.address AS c_address, c.city, c.state AS c_state
        FROM deals d LEFT JOIN companies c ON c.id = d.company_id WHERE d.id = ?`, [req.params.id]);
      if (!deal) return res.status(404).json({ error: 'Deal not found' });
      const settings = await getSettings();
      const items = cleanItems(req.body?.items, settings.quotation.defaultTaxPct);
      if (!items.length) return res.status(400).json({ error: 'Add at least one item with a name and quantity.' });
      let [lead] = deal.lead_id ? await q('SELECT * FROM leads WHERE id = ?', [deal.lead_id]) : [];
      if (!lead) [lead] = await q('SELECT * FROM leads WHERE converted_deal_id = ? LIMIT 1', [deal.id]);
      const fallbackClient = { name: deal.company_name || lead?.company || lead?.lead_name || deal.deal_name, contact: lead?.lead_name || '', email: deal.c_email || lead?.email || '', phone: deal.c_phone || lead?.phone || '', address: [deal.c_address, deal.city].filter(Boolean).join(', '), state: deal.c_state || '' };
      const data = quoteInput(req.body || {}, settings, fallbackClient);
      const problem = planProblem(data); if (problem) return res.status(400).json({ error: problem });
      const base = await nextBase(settings.quotation.prefix);
      conn = await pool.getConnection();
      await conn.beginTransaction();
      const [ins] = await conn.query(`INSERT INTO estimations (estimation_number, quote_base, version, client_id, lead_id, deal_id, status, currency, estimate_by, created_by_name, amount, created_at, updated_at)
        VALUES (?, ?, 1, ?, ?, ?, 'Draft', ?, ?, ?, 0, NOW(), NOW())`, [base, base, deal.company_id || null, lead?.id || null, deal.id, data.currency, req.user.id, req.user.name]);
      const t = await saveQuote(conn, ins.insertId, data, items);
      await conn.commit();
      await event(req, { dealId: deal.id, quotationId: ins.insertId, kind: 'quotation', title: `Quotation ${base} drafted`, meta: { total: t.total } });
      res.status(201).json({ id: ins.insertId });
    } catch (e) {
      if (conn) await conn.rollback().catch(() => {});
      fail(res, e, 'Could not create the quotation');
    } finally { if (conn) conn.release(); }
  });

  app.put('/api/sales-flow/quotations/:id', async (req, res) => {
    let conn;
    try {
      if (!needUser(req, res)) return;
      const [e] = await q('SELECT * FROM estimations WHERE id = ?', [req.params.id]);
      if (!e) return res.status(404).json({ error: 'Quotation not found' });
      if (!['Draft', 'Approved'].includes(e.status)) return res.status(400).json({ error: `A ${e.status.toLowerCase()} quotation cannot be edited. Revise it to make a new version.` });
      const settings = await getSettings();
      const items = cleanItems(req.body?.items, settings.quotation.defaultTaxPct);
      if (!items.length) return res.status(400).json({ error: 'Add at least one item with a name and quantity.' });
      const current = shapeQuote(e);
      const data = quoteInput({ ...req.body, client: { ...current.client, ...(req.body?.client || {}) } }, settings);
      const problem = planProblem(data); if (problem) return res.status(400).json({ error: problem });
      conn = await pool.getConnection();
      await conn.beginTransaction();
      await saveQuote(conn, e.id, data, items);
      // Edits after approval need approval again.
      if (e.status === 'Approved') await conn.query("UPDATE estimations SET status = 'Draft', approval_status = NULL WHERE id = ?", [e.id]);
      await conn.commit();
      res.json({ ok: true });
    } catch (err) {
      if (conn) await conn.rollback().catch(() => {});
      fail(res, err, 'Could not save the quotation');
    } finally { if (conn) conn.release(); }
  });

  app.delete('/api/sales-flow/quotations/:id', async (req, res) => {
    try {
      if (!needUser(req, res)) return;
      const [e] = await q('SELECT * FROM estimations WHERE id = ?', [req.params.id]);
      if (!e) return res.status(404).json({ error: 'Quotation not found' });
      if (e.status !== 'Draft') return res.status(400).json({ error: 'Only drafts can be deleted.' });
      await pool.query('DELETE FROM estimation_line_items WHERE estimation_id = ?', [e.id]);
      await pool.query('DELETE FROM estimations WHERE id = ?', [e.id]);
      // Deleting a revision draft brings the previous version back.
      if (e.parent_id) await pool.query("UPDATE estimations SET status = IF(sent_at IS NULL, 'Approved', 'Sent') WHERE id = ? AND status = 'Revised'", [e.parent_id]);
      await event(req, { dealId: e.deal_id, kind: 'quotation', title: `Draft ${e.estimation_number} deleted` });
      res.json({ ok: true });
    } catch (err) { fail(res, err, 'Could not delete the draft'); }
  });

  app.post('/api/sales-flow/quotations/:id/submit', async (req, res) => {
    try {
      if (!needUser(req, res)) return;
      const [e] = await q('SELECT * FROM estimations WHERE id = ?', [req.params.id]);
      if (!e) return res.status(404).json({ error: 'Quotation not found' });
      if (e.status !== 'Draft') return res.status(400).json({ error: 'Only a draft can be submitted.' });
      const settings = await getSettings();
      const limit = Number(settings.quotation.discountApprovalPct) || 0;
      const disc = Number(e.max_discount_pct) || 0;
      if (disc > limit && !isMgr(req)) {
        await pool.query("UPDATE estimations SET status = 'Pending Approval', approval_status = 'pending', approval_requested_by = ?, approval_note = ?, updated_at = NOW() WHERE id = ?", [req.user.name, req.body?.note || null, e.id]);
        await event(req, { dealId: e.deal_id, quotationId: e.id, kind: 'approval', title: `Discount approval requested (${disc}% > ${limit}%)`, body: req.body?.note || null });
        notify(await salesManagers(), `Discount approval: ${e.estimation_number}`, `${req.user.name} asks to approve ${disc}% discount (limit ${limit}%) on ${e.client_name || 'a quotation'}.`, null);
        return res.json({ status: 'Pending Approval' });
      }
      await pool.query("UPDATE estimations SET status = 'Approved', approval_status = ?, approved_by = ?, approved_at = NOW(), updated_at = NOW() WHERE id = ?",
        [disc > limit ? 'approved' : null, disc > limit ? req.user.name : null, e.id]);
      await event(req, { dealId: e.deal_id, quotationId: e.id, kind: 'quotation', title: `${e.estimation_number} ready to send` });
      res.json({ status: 'Approved' });
    } catch (err) { fail(res, err, 'Could not submit'); }
  });

  const decide = (approve) => async (req, res) => {
    try {
      if (!needUser(req, res)) return;
      if (!isMgr(req)) return res.status(403).json({ error: 'Only managers can approve discounts.' });
      const [e] = await q('SELECT * FROM estimations WHERE id = ?', [req.params.id]);
      if (!e) return res.status(404).json({ error: 'Quotation not found' });
      if (e.status !== 'Pending Approval') return res.status(400).json({ error: 'This quotation is not waiting for approval.' });
      const note = String(req.body?.note || '').trim();
      if (!approve && !note) return res.status(400).json({ error: 'Say why, so it can be corrected.' });
      await pool.query(`UPDATE estimations SET status = ?, approval_status = ?, approval_note = ?, approved_by = ?, approved_at = NOW(), updated_at = NOW() WHERE id = ?`,
        [approve ? 'Approved' : 'Draft', approve ? 'approved' : 'rejected', note || null, req.user.name, e.id]);
      await event(req, { dealId: e.deal_id, quotationId: e.id, kind: 'approval', title: approve ? `Discount approved by ${req.user.name}` : `Discount rejected by ${req.user.name}`, body: note || null });
      const [creator] = await q('SELECT id FROM users WHERE id = ?', [e.estimate_by]);
      if (creator) notify([creator.id], `${e.estimation_number} ${approve ? 'approved' : 'needs changes'}`, approve ? `${req.user.name} approved the discount. You can send it now.` : `${req.user.name}: ${note}`, null);
      res.json({ ok: true });
    } catch (err) { fail(res, err, 'Could not save the decision'); }
  };
  app.post('/api/sales-flow/quotations/:id/approve', decide(true));
  app.post('/api/sales-flow/quotations/:id/reject', decide(false));

  app.post('/api/sales-flow/quotations/:id/revise', async (req, res) => {
    let conn;
    try {
      if (!needUser(req, res)) return;
      const [e] = await q('SELECT * FROM estimations WHERE id = ?', [req.params.id]);
      if (!e) return res.status(404).json({ error: 'Quotation not found' });
      if (!['Sent', 'Declined', 'Approved', 'Accepted'].includes(e.status)) return res.status(400).json({ error: 'Edit the draft instead; revisions are for quotations already approved or sent.' });
      const note = String(req.body?.note || '').trim();
      if (!note) return res.status(400).json({ error: 'Say what changes in this revision.' });
      const base = e.quote_base || e.estimation_number;
      const [[mx]] = await pool.query('SELECT MAX(version) v FROM estimations WHERE quote_base = ?', [base]);
      const version = (Number(mx?.v) || Number(e.version) || 1) + 1;
      conn = await pool.getConnection();
      await conn.beginTransaction();
      const [ins] = await conn.query(`INSERT INTO estimations (estimation_number, quote_base, version, parent_id, client_id, lead_id, deal_id, status, currency, estimate_by, created_by_name, revision_note, amount, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'Draft', ?, ?, ?, ?, 0, NOW(), NOW())`, [`${base}-v${version}`, base, version, e.id, e.client_id, e.lead_id, e.deal_id, e.currency, req.user.id, req.user.name, note.slice(0, 500)]);
      const items = (await conn.query('SELECT * FROM estimation_line_items WHERE estimation_id = ? ORDER BY position, id', [e.id]))[0]
        .map(i => ({ name: i.item_name, description: i.description, hsn: i.hsn_sac, unit: i.unit, qty: Number(i.quantity), rate: Number(i.rate), discountPct: Number(i.discount_percent), taxPct: Number(i.tax_percent) }));
      const settings = await getSettings();
      await saveQuote(conn, ins.insertId, quoteInput({ subject: e.subject, terms: e.terms, notes: e.notes, gstMode: e.gst_mode, currency: e.currency, quoteType: e.quote_type, plan: parseJson(e.plan, null) }, settings, shapeQuote(e).client), cleanItems(items, settings.quotation.defaultTaxPct));
      await conn.query("UPDATE estimations SET status = 'Revised', updated_at = NOW() WHERE id = ?", [e.id]);
      await conn.commit();
      await event(req, { dealId: e.deal_id, quotationId: ins.insertId, kind: 'revision', title: `Revision ${version} started (${base})`, body: note });
      // Revising after the client has seen it means the deal is in negotiation.
      if (e.deal_id && e.sent_at) {
        const [neg] = await q("SELECT id, name, probability, position FROM pipeline_stages WHERE LOWER(name) = 'negotiation'");
        const [d] = await q('SELECT pipeline_stage_id FROM deals WHERE id = ?', [e.deal_id]);
        const [curStage] = d?.pipeline_stage_id ? await q('SELECT position FROM pipeline_stages WHERE id = ?', [d.pipeline_stage_id]) : [];
        if (neg && (!curStage || curStage.position < neg.position)) {
          await pool.query("UPDATE deals SET deal_stage = ?, pipeline_stage_id = ?, probability = ?, updated_at = NOW() WHERE id = ? AND status NOT IN ('Won', 'Lost')", [neg.name, neg.id, neg.probability, e.deal_id]);
          await event(req, { dealId: e.deal_id, kind: 'stage', title: `Stage → ${neg.name} (quotation revised)` });
        }
      }
      res.status(201).json({ id: ins.insertId });
    } catch (err) {
      if (conn) await conn.rollback().catch(() => {});
      fail(res, err, 'Could not create the revision');
    } finally { if (conn) conn.release(); }
  });

  // Month helpers for retainers: "2026-11" -> "Nov 2026"
  const monthName = (ym) => new Date(`${ym}-01T12:00:00`).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  const shiftMonth = (ym, n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
  const rs = (n) => `Rs. ${round2(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  /** Scope sections, deliverables and payment schedule printed on a retainer or project quotation. */
  const planParts = (quote, settings) => {
    const svc = (settings.services || []);
    const t = computeTotals(quote.items, quote.gstMode);
    const plan = quote.plan || {};
    const scope = [];
    quote.items.forEach(it => {
      const sv = svc.find(x => x.name.trim().toLowerCase() === String(it.name).trim().toLowerCase());
      if (sv && sv.scope?.length && it.qty > 0) scope.push({ heading: `Scope of work: ${sv.name}${it.qty > 1 && sv.unit ? ` (${it.qty} ${sv.unit}${it.qty === 1 ? '' : 's'})` : ''}`, text: sv.scope.map(x => `• ${x}`).join('\n') });
    });
    const extra = (plan.sections || []).map(x => ({ heading: x.title, text: x.items.map(i => `• ${i}`).join('\n') }));
    if (quote.quoteType === 'retainer') {
      const months = plan.months || 1; const start = plan.startMonth;
      const rows = quote.items.filter(i => i.qty > 0).map(i => [i.name, `${i.qty}${i.unit ? ` ${i.unit}${i.qty === 1 ? '' : 's'}` : ''} / month`, rs(i.qty * i.rate * (1 - (i.discountPct || 0) / 100))]);
      const months12 = Array.from({ length: Math.min(months, 12) }, (_, k) => [monthName(shiftMonth(start, k)), rs(t.total)]);
      return {
        highlights: [{ label: 'Monthly fee (incl. GST)', value: rs(t.total) }, { label: 'Period', value: `${months} month${months === 1 ? '' : 's'} from ${monthName(start)}` }, { label: 'Contract value (incl. GST)', value: rs(t.total * months) }],
        tables: [
          { title: 'Monthly deliverables', columns: [{ k: 'Service' }, { k: 'Quantity', w: 120 }, { k: 'Monthly amount (before GST)', w: 130, a: 'right' }], rows, boldLast: false },
          { title: 'Billing schedule', columns: [{ k: 'Month' }, { k: 'Invoice amount (incl. GST)', w: 170, a: 'right' }], rows: months12, boldLast: false }
        ],
        sections: [...scope, ...(plan.adSpendNote ? [{ heading: 'Ad spend and platform costs', text: plan.adSpendNote }] : []), ...extra]
      };
    }
    if (quote.quoteType === 'project') {
      const ms = plan.milestones || []; let left = t.total;
      const rows = ms.map((m, i) => { const amt = i === ms.length - 1 ? left : round2((t.total * m.pct) / 100); left = round2(left - amt); return [String(i + 1), m.name, `${m.pct}%`, rs(amt)]; });
      return {
        highlights: [{ label: 'Project value (incl. GST)', value: rs(t.total) }, { label: 'Timeline', value: plan.timeline || 'To be agreed' }, { label: 'Payments', value: `${ms.length} milestone${ms.length === 1 ? '' : 's'}` }],
        tables: [{ title: 'Payment schedule', columns: [{ k: '#', w: 26, a: 'center' }, { k: 'Milestone' }, { k: '%', w: 50, a: 'right' }, { k: 'Amount (incl. GST)', w: 130, a: 'right' }], rows, boldLast: true }],
        sections: [...scope, ...extra]
      };
    }
    return { highlights: null, tables: [], sections: [] };
  };

  const pdfFor = async (id, settings) => {
    const quote = await loadQuote(id);
    if (!quote) return null;
    const [maker] = await q('SELECT first_name, last_name, email, phone1 FROM users WHERE id = (SELECT estimate_by FROM estimations WHERE id = ?)', [id]);
    const buf = await buildPdf({
      type: 'QUOTATION', number: quote.base, version: quote.version, date: quote.date, validUntil: quote.validUntil,
      status: ['Draft', 'Pending Approval'].includes(quote.status) ? 'Draft' : null, currency: quote.currency,
      company: settings.company, client: quote.client, subject: quote.subject, gstMode: quote.gstMode, revisionNote: quote.revisionNote,
      items: quote.items, terms: quote.terms, bank: settings.bank, signatory: settings.quotation.signatory,
      ...(() => { const p = planParts(quote, settings); return { highlights: p.highlights, tables: p.tables }; })(),
      sections: [...planParts(quote, settings).sections, ...(quote.notes ? [{ heading: 'Notes', text: quote.notes }] : [])],
      preparedBy: maker ? userName(maker) : quote.createdBy, preparedByContact: maker ? [maker.phone1, maker.email].filter(Boolean).join('  ·  ') : '',
      placeOfSupply: quote.client.state || null
    });
    return { quote, buf };
  };

  app.get('/api/sales-flow/quotations/:id/pdf', async (req, res) => {
    try {
      if (!needUser(req, res)) return;
      const out = await pdfFor(req.params.id, await getSettings());
      if (!out) return res.status(404).json({ error: 'Quotation not found' });
      const name = `${out.quote.base}${out.quote.version > 1 ? `-Rev${out.quote.version}` : ''}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `${req.query.download ? 'attachment' : 'inline'}; filename="${name}"`);
      res.send(out.buf);
    } catch (e) { fail(res, e, 'Could not build the PDF'); }
  });

  const markSent = async (req, e, via, to) => {
    await pool.query("UPDATE estimations SET status = 'Sent', sent_at = NOW(), sent_to = ?, updated_at = NOW() WHERE id = ?", [String(to || via).slice(0, 500), e.id]);
    // The deal moves to "Proposal Sent" when that is further along than where it is.
    if (e.deal_id) {
      const [ps] = await q("SELECT id, name, probability, position FROM pipeline_stages WHERE LOWER(name) LIKE 'proposal%' ORDER BY position LIMIT 1");
      const [d] = await q('SELECT pipeline_stage_id, status FROM deals WHERE id = ?', [e.deal_id]);
      const [curStage] = d?.pipeline_stage_id ? await q('SELECT position FROM pipeline_stages WHERE id = ?', [d.pipeline_stage_id]) : [];
      if (ps && d && !['Won', 'Lost'].includes(d.status) && (!curStage || curStage.position < ps.position)) {
        await pool.query('UPDATE deals SET deal_stage = ?, pipeline_stage_id = ?, probability = ?, updated_at = NOW() WHERE id = ?', [ps.name, ps.id, ps.probability, e.deal_id]);
        await event(req, { dealId: e.deal_id, kind: 'stage', title: `Stage → ${ps.name} (quotation sent)` });
      }
    }
  };

  app.post('/api/sales-flow/quotations/:id/send', async (req, res) => {
    try {
      if (!needUser(req, res)) return;
      const [e] = await q('SELECT * FROM estimations WHERE id = ?', [req.params.id]);
      if (!e) return res.status(404).json({ error: 'Quotation not found' });
      if (!['Approved', 'Sent'].includes(e.status)) return res.status(400).json({ error: e.status === 'Pending Approval' ? 'Waiting for a manager to approve the discount.' : 'Submit the draft first.' });
      const to = String(req.body?.to || '').split(/[;,]/).map(s => s.trim()).filter(s => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s));
      if (!to.length) return res.status(400).json({ error: 'Enter the client\'s email address.' });
      const cc = String(req.body?.cc || '').split(/[;,]/).map(s => s.trim()).filter(s => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s));
      const settings = await getSettings();
      const out = await pdfFor(e.id, settings);
      const host = process.env.EMAIL_HOST || process.env.SMTP_HOST; const user = process.env.EMAIL_USER || process.env.SMTP_USER; const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS;
      if (!host || !user || !pass) return res.status(503).json({ error: 'Email is not set up on the server. Download the PDF and send it yourself, then use "Mark as sent".' });
      const port = Number(process.env.EMAIL_PORT || process.env.SMTP_PORT || 587);
      const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
      const vars = {
        number: `${out.quote.base}${out.quote.version > 1 ? ` (Rev. ${out.quote.version})` : ''}`, company: settings.company.name, client: out.quote.client.contact || out.quote.client.name,
        total: `Rs. ${out.quote.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, validUntil: out.quote.validUntil ? ymd(out.quote.validUntil) : '', sender: req.user.name
      };
      const subject = String(req.body?.subject || fill(settings.email.subject, vars)).slice(0, 250);
      const text = String(req.body?.message || fill(settings.email.message, vars));
      const fromAddr = process.env.EMAIL_FROM || user;
      await transporter.sendMail({
        from: fromAddr, to: to.join(', '), cc: cc.length ? cc.join(', ') : undefined, replyTo: req.user.email || undefined, subject, text,
        html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#111827;white-space:pre-wrap">${text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</div>`,
        attachments: [{ filename: `${out.quote.base}${out.quote.version > 1 ? `-Rev${out.quote.version}` : ''}.pdf`, content: out.buf, contentType: 'application/pdf' }]
      });
      await markSent(req, e, 'Email', to.join(', '));
      await event(req, { leadId: e.lead_id, dealId: e.deal_id, quotationId: e.id, kind: 'communication', title: `Email to client · Quotation ${vars.number} sent`, body: `To: ${to.join(', ')}${cc.length ? `\nCc: ${cc.join(', ')}` : ''}\nSubject: ${subject}`, meta: { channel: 'Email', direction: 'out' } });
      res.json({ ok: true });
    } catch (err) { fail(res, err, `Could not send the email: ${err.message}`); }
  });

  app.post('/api/sales-flow/quotations/:id/mark-sent', async (req, res) => {
    try {
      if (!needUser(req, res)) return;
      const [e] = await q('SELECT * FROM estimations WHERE id = ?', [req.params.id]);
      if (!e) return res.status(404).json({ error: 'Quotation not found' });
      if (!['Approved', 'Sent'].includes(e.status)) return res.status(400).json({ error: e.status === 'Pending Approval' ? 'Waiting for a manager to approve the discount.' : 'Submit the draft first.' });
      const via = ['WhatsApp', 'In person', 'Email', 'Courier'].includes(req.body?.via) ? req.body.via : 'WhatsApp';
      await markSent(req, e, via, via);
      await event(req, { leadId: e.lead_id, dealId: e.deal_id, quotationId: e.id, kind: 'communication', title: `${via === 'In person' ? 'Visit' : via} · Quotation ${e.estimation_number} shared`, body: req.body?.note || null, meta: { channel: via === 'In person' ? 'Visit' : via, direction: 'out' } });
      res.json({ ok: true });
    } catch (err) { fail(res, err, 'Could not mark it sent'); }
  });

  const respond = (accepted) => async (req, res) => {
    try {
      if (!needUser(req, res)) return;
      const [e] = await q('SELECT * FROM estimations WHERE id = ?', [req.params.id]);
      if (!e) return res.status(404).json({ error: 'Quotation not found' });
      if (e.status !== 'Sent') return res.status(400).json({ error: 'Only a sent quotation can be accepted or declined.' });
      const reason = String(req.body?.reason || '').trim();
      if (!accepted && !reason) return res.status(400).json({ error: 'Give the reason the client declined.' });
      await pool.query('UPDATE estimations SET status = ?, responded_at = NOW(), decline_reason = ?, updated_at = NOW() WHERE id = ?', [accepted ? 'Accepted' : 'Declined', accepted ? null : reason, e.id]);
      await event(req, { dealId: e.deal_id, quotationId: e.id, kind: accepted ? 'accepted' : 'declined', title: `Client ${accepted ? 'accepted' : 'declined'} ${e.estimation_number}`, body: reason || req.body?.note || null });
      res.json({ ok: true });
    } catch (err) { fail(res, err, 'Could not save the response'); }
  };
  // Accepted quotation -> tax invoice (draft), with every line, GST split and the client details.
  app.post('/api/sales-flow/quotations/:id/invoice', async (req, res) => {
    let conn;
    try {
      if (!needUser(req, res)) return;
      await ready;
      const quote = await loadQuote(req.params.id);
      if (!quote) return res.status(404).json({ error: 'Quotation not found' });
      if (quote.status !== 'Accepted') return res.status(400).json({ error: 'Only an accepted quotation can be invoiced.' });
      const [existing] = await q('SELECT id, invoice_number FROM invoices WHERE estimate_id = ? LIMIT 1', [quote.id]);
      if (existing) return res.json({ id: existing.id, number: existing.invoice_number, already: true });
      const [e] = await q('SELECT client_id, deal_id FROM estimations WHERE id = ?', [quote.id]);
      let clientId = e.client_id;
      if (!clientId && e.deal_id) clientId = (await q('SELECT company_id FROM deals WHERE id = ?', [e.deal_id]))[0]?.company_id || null;
      if (!clientId) return res.status(400).json({ error: 'Link the deal to a customer (company) first.' });
      const settings = await getSettings();
      const number = await nextInvoiceNumber(settings);
      const t = computeTotals(quote.items, quote.gstMode);
      const due = ymd(new Date(Date.now() + (Number(settings.invoice.dueDays) || 0) * 86400000));
      conn = await pool.getConnection();
      await conn.beginTransaction();
      const [ins] = await conn.query(`INSERT INTO invoices (invoice_number, client_id, bill_to, deal_id, amount, currency, invoice_date, open_till, status, description, subject,
          subtotal, discount_percentage, discount_amount, tax_percentage, tax_amount, total, terms_conditions, amount_paid, estimate_id, created_by,
          gst_mode, cgst_amount, sgst_amount, igst_amount, client_gstin, client_address, client_state, client_email, client_phone)
        VALUES (?, ?, ?, ?, ?, ?, CURDATE(), ?, 'Draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [number, clientId, quote.client.name || null, e.deal_id || null, t.total, quote.currency, due, quote.subject || null, quote.subject || null,
        t.gross, t.discountPct, t.discount, t.taxable ? round2((t.tax / t.taxable) * 100) : 0, t.tax, t.total, settings.invoice.terms || settings.quotation.terms || null, quote.id, req.user.id,
        quote.gstMode, t.cgst, t.sgst, t.igst, quote.client.gstin || null, quote.client.address || null, quote.client.state || null, quote.client.email || null, quote.client.phone || null]);
      for (const l of t.lines) {
        await conn.query(`INSERT INTO invoice_items (invoice_id, item_name, description, quantity, price, discount_percentage, discount_amount, tax_percentage, tax_amount, amount, hsn_sac, unit, position)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [ins.insertId, l.name, l.description || null, l.qty, l.rate, l.discountPct, l.discount, l.taxPct, l.tax, l.total, l.hsn || null, l.unit || null, l.position || 0]);
      }
      await conn.commit();
      await event(req, { dealId: e.deal_id, quotationId: quote.id, invoiceId: ins.insertId, companyId: clientId, kind: 'invoice', title: `Invoice ${number} created from ${quote.number}`, meta: { total: t.total } });
      res.status(201).json({ id: ins.insertId, number });
    } catch (err) {
      if (conn) await conn.rollback().catch(() => {});
      fail(res, err, 'Could not create the invoice');
    } finally { if (conn) conn.release(); }
  });

  app.post('/api/sales-flow/quotations/:id/accept', respond(true));
  app.post('/api/sales-flow/quotations/:id/decline', respond(false));

  // Shared with routes/sales-desk-routes.js (customers, billing, targets, reports).
  app.locals.salesFlow = { saveQuote, quoteInput, shapeQuote, deckRows, monthName, shiftMonth, loadQuote, cleanItems, planProblem, cleanPlan, ready, getSettings, event, notify, usersById, userName, salesManagers, isMgr, stages, createFollowup, nextInvoiceNumber, needUser, fail, OPEN_FU, ymd, isDay, fill, parseJson };
};

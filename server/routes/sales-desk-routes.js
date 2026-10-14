const nodemailer = require('nodemailer');
const mailError = require('../services/mailError');
const { computeTotals, round2 } = require('../services/salesPdf');

/**
 * Sales desk: everything around the pipeline (routes/sales-flow-routes.js).
 *
 *   Home        my day: agenda, what needs attention, numbers vs this month's target
 *   Customers   companies with their contacts, enquiries, deals, quotations, invoices, payments
 *   Billing     invoices (from accepted quotations or new), email / mark sent,
 *               payments with receipts; Draft -> Sent -> Partially Paid -> Paid (Overdue after the due date)
 *   Team        performance per person, monthly targets, commission (Sales Settings), reports,
 *               lead distribution
 */

const PAY_MODES = ['Bank transfer', 'UPI', 'Cheque', 'Cash', 'Card', 'Other'];

module.exports = function setupSalesDeskRoutes(app, pool) {
  const q = async (sql, params = []) => (await pool.query(sql, params))[0];
  const {
    ready, getSettings, event, notify, usersById, userName, salesManagers, isMgr, stages, nextInvoiceNumber, needUser, fail, OPEN_FU, ymd, isDay, fill, loadQuote, monthName, shiftMonth
  } = app.locals.salesFlow;
  // Presentation quotations (decks) count as quotations everywhere on the desk.
  const decksOf = async () => (app.locals.salesFlow.deckRows ? app.locals.salesFlow.deckRows() : []);
  const qLink = (x) => (x.deck ? { proposal: x.id } : { quotation: x.id });

  // ── Helpers ───────────────────────────────────────────────────────────
  const today = () => ymd(new Date());
  const monthOf = (d) => ymd(d).slice(0, 7);
  const monthRange = (ym) => {
    const [y, m] = ym.split('-').map(Number);
    return { from: `${ym}-01`, to: ymd(new Date(y, m, 0)) };
  };
  const rangeOf = (req) => {
    const now = new Date();
    const from = isDay(req.query.from) ? req.query.from : ymd(new Date(now.getFullYear(), now.getMonth(), 1));
    const to = isDay(req.query.to) ? req.query.to : today();
    return from <= to ? { from, to } : { from: to, to: from };
  };
  const inRange = (v, r) => { if (!v) return false; const d = ymd(v); return d >= r.from && d <= r.to; };
  const isWon = (d) => d.status === 'Won' || /^won$/i.test(d.deal_stage || '');
  const isLost = (d) => d.status === 'Lost' || /^lost$/i.test(d.deal_stage || '');
  const wonAmount = (d) => Number(d.won_value) || Number(d.deal_value) || 0;
  const sum = (list, f) => round2(list.reduce((s, x) => s + (Number(f(x)) || 0), 0));

  const invoiceStatus = (inv) => {
    if (inv.status === 'Draft') return 'Draft';
    const total = Number(inv.total) || 0; const paid = Number(inv.amount_paid) || 0;
    if (total > 0 && paid >= total - 0.005) return 'Paid';
    if (inv.open_till && ymd(inv.open_till) < today()) return 'Overdue';
    return paid > 0 ? 'Partially Paid' : 'Sent';
  };
  const daysLate = (inv) => (inv.open_till ? Math.max(0, Math.round((new Date(`${today()}T12:00:00`) - new Date(`${ymd(inv.open_till)}T12:00:00`)) / 86400000)) : 0);
  const shapeInvoice = (r, names) => {
    const total = Number(r.total) || 0; const paid = Number(r.amount_paid) || 0;
    const status = invoiceStatus(r);
    return {
      id: r.id, number: r.invoice_number, status, date: r.invoice_date || r.created_at, dueDate: r.open_till, subject: r.subject || r.description || '',
      total, paid, balance: round2(Math.max(0, total - paid)), currency: r.currency || 'INR', companyId: r.client_id, company: r.company_name || r.bill_to || '',
      dealId: r.deal_id, dealName: r.deal_name || '', quotationId: r.estimate_id, quotationNumber: r.estimation_number || null, sentAt: r.sent_at, sentTo: r.sent_to,
      gstMode: r.gst_mode || 'intra', cgst: Number(r.cgst_amount) || 0, sgst: Number(r.sgst_amount) || 0, igst: Number(r.igst_amount) || 0,
      subtotal: Number(r.subtotal) || 0, discount: Number(r.discount_amount) || 0, tax: Number(r.tax_amount) || 0,
      owner: names ? names.get(Number(r.assignee_id || r.created_by)) || '' : '', ownerId: r.assignee_id || r.created_by || null,
      serviceMonth: r.service_month || null, milestoneNo: r.milestone_no || null, milestoneName: r.milestone_name || null,
      daysLate: status === 'Overdue' ? daysLate(r) : 0, createdAt: r.created_at
    };
  };
  const invoiceRows = async (where = '1=1', params = []) => q(`SELECT i.*, c.company_name, d.deal_name, d.assignee_id, e.estimation_number
      FROM invoices i LEFT JOIN companies c ON c.id = i.client_id LEFT JOIN deals d ON d.id = i.deal_id LEFT JOIN estimations e ON e.id = i.estimate_id
      WHERE ${where} ORDER BY COALESCE(i.invoice_date, i.created_at) DESC, i.id DESC`, params);
  const ownsInvoice = (r, uid) => Number(r.assignee_id) === uid || (!r.assignee_id && Number(r.created_by) === uid);

  /** People who sell: the Sales department plus anyone who owns enquiries or deals. */
  const salesPeople = async () => {
    const rows = await q(`SELECT u.id, u.first_name, u.last_name, u.username, u.email, u.department, u.job_title, r.name AS role
      FROM users u LEFT JOIN roles r ON r.id = u.role_id
      WHERE COALESCE(u.status, 'Active') = 'Active' AND (
        LOWER(COALESCE(u.department, '')) LIKE '%sales%' OR LOWER(COALESCE(r.name, '')) LIKE '%sales%'
        OR u.id IN (SELECT owner_id FROM leads WHERE owner_id IS NOT NULL) OR u.id IN (SELECT assignee_id FROM deals WHERE assignee_id IS NOT NULL))
      ORDER BY u.first_name`);
    return rows.map(u => ({ id: Number(u.id), name: userName(u), title: u.job_title || u.role || '', department: u.department || '' }));
  };

  const recalcInvoice = async (id) => {
    const [inv] = await q('SELECT id, total, status FROM invoices WHERE id = ?', [id]);
    if (!inv) return;
    const [[s]] = await pool.query('SELECT COALESCE(SUM(amount), 0) paid, MAX(paid_on) last FROM sales_payments WHERE invoice_id = ?', [id]);
    const paid = round2(s.paid); const total = Number(inv.total) || 0;
    const status = total > 0 && paid >= total - 0.005 ? 'Paid' : paid > 0 ? 'Partially Paid' : inv.status === 'Draft' ? 'Draft' : 'Sent';
    await pool.query('UPDATE invoices SET amount_paid = ?, payment_date = ?, status = ?, updated_at = NOW() WHERE id = ?', [paid, s.last || null, status, id]);
  };
  const nextReceiptNumber = async () => {
    const year = new Date().getFullYear();
    const rows = await q('SELECT receipt_number FROM sales_payments WHERE receipt_number LIKE ?', [`RCT-${year}-%`]);
    const n = rows.reduce((m, r) => Math.max(m, parseInt(String(r.receipt_number).split('-').pop(), 10) || 0), 0) + 1;
    return `RCT-${year}-${String(n).padStart(4, '0')}`;
  };
  const cleanItems = (items, defaultTax) => (Array.isArray(items) ? items : []).map((it, i) => ({
    name: String(it.name || '').trim().slice(0, 255), description: String(it.description || '').slice(0, 2000),
    hsn: String(it.hsn || '').trim().slice(0, 20), unit: String(it.unit || '').trim().slice(0, 20),
    qty: Number(it.qty) || 0, rate: Math.max(0, Number(it.rate) || 0),
    discountPct: Math.min(100, Math.max(0, Number(it.discountPct) || 0)),
    taxPct: Math.min(40, Math.max(0, it.taxPct === undefined ? defaultTax : Number(it.taxPct) || 0)), position: i
  })).filter(it => it.name && it.qty !== 0);
  const emailReady = () => {
    const host = process.env.EMAIL_HOST || process.env.SMTP_HOST; const user = process.env.EMAIL_USER || process.env.SMTP_USER; const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS;
    if (!host || !user || !pass) return null;
    const port = Number(process.env.EMAIL_PORT || process.env.SMTP_PORT || 587);
    return { transporter: nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } }), from: process.env.EMAIL_FROM || user };
  };
  const route = (method, path, msg, fn) => app[method](`/api/sales-desk${path}`, async (req, res) => {
    try { if (!needUser(req, res)) return; await ready; await fn(req, res); } catch (e) { fail(res, e, msg); }
  });

  // Billing is for sales executives and managers; a sales employee can read but not create or change it.
  app.use('/api/sales-desk', (req, res, next) => {
    if (req.method === 'GET' || !req.user || isMgr(req) || /executive/i.test(String(req.user.role || ''))) return next();
    const p = String(req.originalUrl || '').split('?')[0].replace('/api/sales-desk', '');
    const seg = p.split('/').filter(Boolean);
    if (['invoices', 'payments', 'quotations'].includes(seg[0]) || (seg[0] === 'customers' && (seg[2] === 'advance' || seg[2] === 'deals'))) {
      return res.status(403).json({ error: 'Quotations, deals and invoices are handled by a sales executive.' });
    }
    next();
  });

  // An executive can open, edit, send or take payment on only their own invoices (the list is already limited the same way).
  app.use('/api/sales-desk/invoices/:id', async (req, res, next) => {
    try {
      if (!req.user || isMgr(req) || !/^[0-9]+$/.test(req.params.id)) return next();
      const [inv] = await invoiceRows('i.id = ?', [req.params.id]);
      if (inv && !ownsInvoice(inv, Number(req.user.id))) return res.status(403).json({ error: 'This invoice belongs to someone else. Ask a manager if you need access.' });
      next();
    } catch (e) { next(e); }
  });

  // ── Home ──────────────────────────────────────────────────────────────
  route('get', '/home', 'Could not load your sales home', async (req, res) => {
    const uid = Number(req.user.id);
    const team = req.query.scope === 'team' && isMgr(req);
    const names = await usersById();
    const now = new Date(); const t = today(); const month = monthOf(now); const mr = monthRange(month);

    let leads = await q('SELECT id, lead_name, company, phone, lead_status, owner_id, hold_until, created_at, status_changed_at, converted_deal_id FROM leads');
    let deals = await q(`SELECT d.id, d.deal_name, d.deal_value, d.won_value, d.status, d.deal_stage, d.pipeline_stage_id, d.probability, d.on_hold, d.hold_until,
        d.assignee_id, d.closed_at, d.created_at, d.updated_at, c.company_name FROM deals d LEFT JOIN companies c ON c.id = d.company_id`);
    let fus = await q(`SELECT f.id, f.type, f.subject, f.scheduled_date, f.scheduled_time, f.status, f.assigned_to, f.lead_id, f.deal_id, l.lead_name, d.deal_name, c.company_name
      FROM followups f LEFT JOIN leads l ON l.id = f.lead_id LEFT JOIN deals d ON d.id = f.deal_id LEFT JOIN companies c ON c.id = d.company_id
      WHERE f.status IN (?) AND (f.lead_id IS NOT NULL OR f.deal_id IS NOT NULL) ORDER BY f.scheduled_date, f.scheduled_time`, [OPEN_FU]);
    let quotes = await q(`SELECT e.id, e.estimation_number, e.status, e.total, e.sent_at, e.expiry_date, e.updated_at, e.estimate_by, e.client_name, e.max_discount_pct, e.approval_requested_by,
        d.assignee_id, d.deal_name FROM estimations e LEFT JOIN deals d ON d.id = e.deal_id WHERE e.quote_base IS NOT NULL AND e.proposal_id IS NULL AND e.status IN ('Draft', 'Pending Approval', 'Approved', 'Sent')`);
    quotes = quotes.concat((await decksOf()).filter(x => ['Draft', 'Sent'].includes(x.status)).map(x => ({ id: x.id, deck: true, estimation_number: x.number, status: x.status, total: x.total, sent_at: x.sentAt, expiry_date: null, updated_at: x.updatedAt, estimate_by: x.ownerId, client_name: x.client, max_discount_pct: 0, approval_requested_by: null, assignee_id: x.ownerId, deal_name: x.dealName })));
    let invs = await invoiceRows("i.status <> 'Draft'");
    let pays = await q('SELECT p.amount, p.paid_on, i.created_by, d.assignee_id FROM sales_payments p LEFT JOIN invoices i ON i.id = p.invoice_id LEFT JOIN deals d ON d.id = i.deal_id WHERE p.paid_on >= ?', [ymd(new Date(now.getFullYear(), now.getMonth() - 5, 1))]);
    let comms = await q("SELECT by_id FROM sales_events WHERE kind = 'communication' AND happened_at >= ?", [mr.from]);
    if (!team) {
      leads = leads.filter(l => Number(l.owner_id) === uid);
      deals = deals.filter(d => Number(d.assignee_id) === uid);
      fus = fus.filter(f => Number(f.assigned_to) === uid);
      quotes = quotes.filter(x => Number(x.assignee_id) === uid || Number(x.estimate_by) === uid);
      invs = invs.filter(r => ownsInvoice(r, uid));
      pays = pays.filter(p => Number(p.assignee_id) === uid || (!p.assignee_id && Number(p.created_by) === uid));
      comms = comms.filter(c => Number(c.by_id) === uid);
    }

    const at = (f) => new Date(`${ymd(f.scheduled_date)}T${String(f.scheduled_time || '23:59').slice(0, 5)}`);
    const agenda = fus.filter(f => ymd(f.scheduled_date) <= t).map(f => ({
      id: f.id, type: f.type, subject: f.subject, date: ymd(f.scheduled_date), time: String(f.scheduled_time || '').slice(0, 5), overdue: at(f) < now,
      name: f.deal_name || f.lead_name || '', company: f.company_name || '', leadId: f.lead_id, dealId: f.deal_id, owner: names.get(Number(f.assigned_to)) || ''
    }));
    const upcoming = fus.filter(f => ymd(f.scheduled_date) > t).slice(0, 5).map(f => ({ id: f.id, type: f.type, subject: f.subject, date: ymd(f.scheduled_date), time: String(f.scheduled_time || '').slice(0, 5), name: f.deal_name || f.lead_name || '', leadId: f.lead_id, dealId: f.deal_id }));

    const openLeads = leads.filter(l => ['New', 'Not Contacted', 'Contacted', 'Qualified'].includes(l.lead_status));
    const openDeals = deals.filter(d => !isWon(d) && !isLost(d));
    const activeDeals = openDeals.filter(d => !d.on_hold);
    const wonMonth = deals.filter(d => isWon(d) && inRange(d.closed_at, mr));
    const lostMonth = deals.filter(d => isLost(d) && inRange(d.closed_at, mr));
    const collectedMonth = sum(pays.filter(p => inRange(p.paid_on, mr)), p => p.amount);
    const outstanding = invs.filter(r => ['Sent', 'Partially Paid', 'Overdue'].includes(invoiceStatus(r)));
    const overdue = outstanding.filter(r => invoiceStatus(r) === 'Overdue');
    const withNext = new Set(fus.map(f => `${f.lead_id ? 'l' : 'd'}${f.lead_id || f.deal_id}`));

    // What needs doing, most urgent first.
    const attention = [];
    const add = (tone, text, link, sub) => attention.push({ tone, text, link, sub });
    if (isMgr(req)) quotes.filter(x => x.status === 'Pending Approval').forEach(x => add('amber', `Approve ${Number(x.max_discount_pct)}% discount on ${x.estimation_number}`, qLink(x), `${x.client_name || x.deal_name || ''} · asked by ${x.approval_requested_by || '—'}`));
    overdue.slice(0, 5).forEach(r => add('red', `${r.invoice_number} is ${daysLate(r)} day${daysLate(r) === 1 ? '' : 's'} overdue`, { invoice: r.id }, `${r.company_name || r.bill_to || ''} · balance ₹${round2(Number(r.total) - Number(r.amount_paid)).toLocaleString('en-IN')}`));
    quotes.filter(x => x.status === 'Sent' && x.expiry_date && ymd(x.expiry_date) < t).forEach(x => add('red', `${x.estimation_number} expired without an answer`, qLink(x), `${x.client_name || ''} · revise it or mark declined`));
    quotes.filter(x => x.status === 'Sent' && x.sent_at && (now - new Date(x.sent_at)) > 5 * 86400000 && !(x.expiry_date && ymd(x.expiry_date) < t)).forEach(x => add('amber', `No answer on ${x.estimation_number} for ${Math.floor((now - new Date(x.sent_at)) / 86400000)} days`, qLink(x), `${x.client_name || ''} · call the client`));
    quotes.filter(x => x.status === 'Approved').forEach(x => add('blue', `${x.estimation_number} is approved but not sent`, qLink(x), x.client_name || x.deal_name || ''));
    leads.filter(l => ['New', 'Not Contacted'].includes(l.lead_status) && (now - new Date(l.created_at)) > 86400000).forEach(l => add('amber', `${l.lead_name} has not been contacted`, { lead: l.id }, `Enquiry from ${Math.floor((now - new Date(l.created_at)) / 86400000)} days ago`));
    [...leads.filter(l => l.lead_status === 'On Hold' && l.hold_until && ymd(l.hold_until) <= t).map(l => ({ text: `${l.lead_name}: hold ended`, link: { lead: l.id } })),
      ...deals.filter(d => d.on_hold && d.hold_until && ymd(d.hold_until) <= t).map(d => ({ text: `${d.deal_name}: hold ended`, link: { deal: d.id } }))].forEach(x => add('blue', x.text, x.link, 'Check in and resume or close it'));
    activeDeals.filter(d => !withNext.has(`d${d.id}`)).forEach(d => add('gray', `${d.deal_name} has no next step`, { deal: d.id }, `${d.deal_stage || ''}${d.company_name ? ` · ${d.company_name}` : ''}`));
    openLeads.filter(l => !['New', 'Not Contacted'].includes(l.lead_status) && !withNext.has(`l${l.id}`)).forEach(l => add('gray', `${l.lead_name} has no next step`, { lead: l.id }, l.lead_status));

    // Monthly retainers: invoice for the current month (and any missed month) not raised yet.
    const retainers = await q(`SELECT e.id, e.estimation_number, e.plan, e.client_name, d.assignee_id, e.estimate_by FROM estimations e LEFT JOIN deals d ON d.id = e.deal_id
      WHERE e.quote_base IS NOT NULL AND e.status = 'Accepted' AND e.quote_type = 'retainer'`);
    const billed = await q('SELECT estimate_id, service_month FROM invoices WHERE estimate_id IS NOT NULL AND service_month IS NOT NULL');
    const billedKey = new Set(billed.map(b => `${b.estimate_id}:${b.service_month}`));
    const ymNow = today().slice(0, 7);
    let billingDue = 0;
    retainers.filter(r => team || Number(r.assignee_id) === uid || Number(r.estimate_by) === uid).forEach(r => {
      let plan = r.plan; if (typeof plan === 'string') { try { plan = JSON.parse(plan); } catch (e2) { plan = null; } }
      if (!plan?.startMonth) return;
      const missing = [];
      for (let i = 0; i < (plan.months || 0); i += 1) { const ym = shiftMonth(plan.startMonth, i); if (ym <= ymNow && !billedKey.has(`${r.id}:${ym}`)) missing.push(ym); }
      if (missing.length) { billingDue += missing.length; attention.splice(Math.min(attention.length, 3), 0, { tone: 'blue', text: `Raise the ${monthName(missing[0])} invoice for ${r.client_name || 'the client'}${missing.length > 1 ? ` (+${missing.length - 1} earlier month${missing.length > 2 ? 's' : ''})` : ''}`, link: { quotation: r.id }, sub: `Monthly retainer ${r.estimation_number}` }); }
    });

    // Pipeline by stage (open deals).
    const stageList = await stages();
    const funnel = stageList.filter(s => !/^(won|lost)$/i.test(s.name)).map(s => {
      const list = activeDeals.filter(d => (d.pipeline_stage_id ? Number(d.pipeline_stage_id) === Number(s.id) : d.deal_stage === s.name));
      return { stage: s.name, count: list.length, value: sum(list, d => d.deal_value) };
    });

    // Target for this month (mine, or the team's total).
    const targets = await q('SELECT * FROM sales_targets WHERE month = ?', [month]);
    const mineT = team ? targets : targets.filter(x => Number(x.user_id) === uid);
    const target = mineT.length ? {
      wonValue: sum(mineT, x => x.won_value), collection: sum(mineT, x => x.collection), dealsWon: mineT.reduce((s, x) => s + Number(x.deals_won || 0), 0),
      enquiries: mineT.reduce((s, x) => s + Number(x.enquiries || 0), 0), activities: mineT.reduce((s, x) => s + Number(x.activities || 0), 0)
    } : null;

    // Six months of won value and collections.
    const trend = [];
    for (let i = 5; i >= 0; i -= 1) {
      const ym = monthOf(new Date(now.getFullYear(), now.getMonth() - i, 1)); const r = monthRange(ym);
      trend.push({ month: ym, won: sum(deals.filter(d => isWon(d) && inRange(d.closed_at, r)), wonAmount), collected: sum(pays.filter(p => inRange(p.paid_on, r)), p => p.amount) });
    }

    const recent = await q(`SELECT se.*, COALESCE(d.deal_name, l.lead_name) AS name FROM sales_events se LEFT JOIN deals d ON d.id = se.deal_id LEFT JOIN leads l ON l.id = se.lead_id
      ${team ? '' : 'WHERE se.by_id = ?'} ORDER BY se.happened_at DESC, se.id DESC LIMIT 12`, team ? [] : [uid]);

    res.json({
      scope: team ? 'team' : 'mine', isManager: isMgr(req), me: { id: uid, name: req.user.name }, month,
      agenda, upcoming, attention: attention.slice(0, 14), attentionTotal: attention.length, funnel, trend,
      kpis: {
        openLeads: openLeads.length, newLeadsMonth: leads.filter(l => inRange(l.created_at, mr)).length,
        openDeals: activeDeals.length, pipelineValue: sum(activeDeals, d => d.deal_value), weightedValue: sum(activeDeals, d => (Number(d.deal_value) || 0) * (Number(d.probability) || 0) / 100),
        onHold: leads.filter(l => l.lead_status === 'On Hold').length + openDeals.filter(d => d.on_hold).length,
        wonMonth: wonMonth.length, wonMonthValue: sum(wonMonth, wonAmount), lostMonth: lostMonth.length,
        quotesPendingApproval: quotes.filter(x => x.status === 'Pending Approval').length, quotesAwaitingClient: quotes.filter(x => x.status === 'Sent').length,
        quotesToSend: quotes.filter(x => x.status === 'Approved').length, quotesDraft: quotes.filter(x => x.status === 'Draft').length,
        collectedMonth, outstanding: sum(outstanding, r => Number(r.total) - Number(r.amount_paid)), overdue: sum(overdue, r => Number(r.total) - Number(r.amount_paid)), overdueCount: overdue.length,
        billingDue, activitiesMonth: comms.length, followupsOverdue: agenda.filter(a => a.overdue).length, followupsToday: agenda.filter(a => !a.overdue).length
      },
      target,
      recent: recent.map(e => ({ id: e.id, kind: e.kind, title: e.title, name: e.name || '', by: e.by_name, at: e.happened_at, leadId: e.lead_id, dealId: e.deal_id, quotationId: e.quotation_id, invoiceId: e.invoice_id }))
    });
  });

  // ── Customers ─────────────────────────────────────────────────────────
  route('get', '/customers', 'Could not load customers', async (req, res) => {
    const uid = Number(req.user.id);
    const names = await usersById();
    const companies = await q('SELECT * FROM companies ORDER BY company_name');
    const deals = await q('SELECT id, company_id, deal_value, won_value, status, deal_stage, on_hold, assignee_id, updated_at, closed_at FROM deals WHERE company_id IS NOT NULL ORDER BY updated_at DESC');
    const invs = await q('SELECT client_id, status, total, amount_paid, open_till FROM invoices WHERE client_id IS NOT NULL');
    const quotes = (await q(`SELECT d.company_id FROM estimations e JOIN deals d ON d.id = e.deal_id WHERE e.quote_base IS NOT NULL AND e.proposal_id IS NULL AND e.status IN ('Draft', 'Pending Approval', 'Approved', 'Sent')`))
      .concat((await decksOf()).filter(x => ['Draft', 'Sent'].includes(x.status) && x.companyId).map(x => ({ company_id: x.companyId })));
    const contacts = await q('SELECT id, company_id, first_name, last_name, phone, email, position FROM contacts WHERE company_id IS NOT NULL ORDER BY id');
    const leads = await q('SELECT company_id, converted_company_id, owner_id, lead_name, phone, email FROM leads WHERE company_id IS NOT NULL OR converted_company_id IS NOT NULL ORDER BY id');
    const last = await q(`SELECT k, MAX(at) at FROM (
        SELECT d.company_id k, se.happened_at at FROM sales_events se JOIN deals d ON d.id = se.deal_id
        UNION ALL SELECT company_id k, happened_at at FROM sales_events WHERE company_id IS NOT NULL) x GROUP BY k`);
    const lastBy = new Map(last.map(r => [Number(r.k), r.at]));
    const group = (list, key) => list.reduce((m, x) => { const k = Number(x[key]); if (!m.has(k)) m.set(k, []); m.get(k).push(x); return m; }, new Map());
    const dealsBy = group(deals, 'company_id'); const invBy = group(invs, 'client_id'); const quoteBy = group(quotes, 'company_id'); const contactBy = group(contacts, 'company_id');
    const leadBy = new Map(); leads.forEach(l => { const k = Number(l.company_id || l.converted_company_id); if (!leadBy.has(k)) leadBy.set(k, []); leadBy.get(k).push(l); });

    let list = companies.map(c => {
      const ds = dealsBy.get(c.id) || []; const is = (invBy.get(c.id) || []).filter(i => i.status !== 'Draft'); const ls = leadBy.get(c.id) || [];
      const cs = contactBy.get(c.id) || [];
      const won = ds.filter(isWon); const open = ds.filter(d => !isWon(d) && !isLost(d) && !d.on_hold);
      const ownerId = Number(ds[0]?.assignee_id || ls[0]?.owner_id || c.created_by) || null;
      const primary = cs[0] ? { name: `${cs[0].first_name || ''} ${cs[0].last_name || ''}`.trim(), phone: cs[0].phone || '', email: cs[0].email || '' }
        : ls[0] ? { name: ls[0].lead_name, phone: ls[0].phone || '', email: ls[0].email || '' } : null;
      const invoiced = sum(is, i => i.total); const paid = sum(is, i => i.amount_paid);
      return {
        id: c.id, name: c.company_name, email: c.email || '', phone: c.phone || '', city: c.city || '', state: c.state || '', gstin: c.gstin || '', industry: c.industry || '',
        type: c.status === 'Inactive' ? 'Inactive' : won.length || is.length ? 'Customer' : 'Prospect',
        owner: names.get(ownerId) || c.owner || '', ownerId, contact: primary, contacts: cs.length,
        openDeals: open.length, pipelineValue: sum(open, d => d.deal_value), wonDeals: won.length, wonValue: sum(won, wonAmount), openQuotes: (quoteBy.get(c.id) || []).length,
        invoiced, paid, outstanding: round2(invoiced - paid), overdue: sum(is.filter(i => invoiceStatus(i) === 'Overdue'), i => Number(i.total) - Number(i.amount_paid)),
        lastActivity: lastBy.get(c.id) || c.updated_at || c.created_at, createdAt: c.created_at,
        mine: ownerId === uid || ds.some(d => Number(d.assignee_id) === uid) || Number(c.created_by) === uid || ls.some(l => Number(l.owner_id) === uid)
      };
    });
    // Relationships with something going on first, then by latest activity.
    const live = (x) => (x.openDeals || x.outstanding > 0 || x.openQuotes ? 1 : 0);
    list.sort((p, q) => live(q) - live(p) || new Date(q.lastActivity || 0) - new Date(p.lastActivity || 0) || p.name.localeCompare(q.name));
    const counts = { all: list.length, Customer: list.filter(x => x.type === 'Customer').length, Prospect: list.filter(x => x.type === 'Prospect').length, Inactive: list.filter(x => x.type === 'Inactive').length, dues: list.filter(x => x.outstanding > 0).length };
    if (req.query.scope === 'mine' || !isMgr(req)) list = list.filter(x => x.mine);
    if (req.query.type === 'dues') list = list.filter(x => x.outstanding > 0);
    else if (req.query.type) list = list.filter(x => x.type === req.query.type);
    const term = String(req.query.q || '').trim().toLowerCase();
    if (term) list = list.filter(x => [x.name, x.email, x.phone, x.city, x.gstin, x.contact?.name, x.contact?.phone].some(v => String(v || '').toLowerCase().includes(term)));
    res.json({ customers: list, counts, totals: { outstanding: sum(list, x => x.outstanding), wonValue: sum(list, x => x.wonValue), pipelineValue: sum(list, x => x.pipelineValue) } });
  });

  const COMPANY_FIELDS = { name: 'company_name', email: 'email', phone: 'phone', phone2: 'phone2', website: 'website', industry: 'industry', address: 'address', city: 'city', state: 'state', zipcode: 'zipcode', country: 'country', gstin: 'gstin', source: 'source', notes: 'description' };

  route('post', '/customers', 'Could not add the customer', async (req, res) => {
    const b = req.body || {};
    const name = String(b.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Enter the company or customer name.' });
    const [dupe] = await q('SELECT id FROM companies WHERE LOWER(company_name) = LOWER(?) LIMIT 1', [name]);
    if (dupe) return res.status(409).json({ error: `${name} already exists.`, id: dupe.id });
    const cols = []; const vals = [];
    Object.entries(COMPANY_FIELDS).forEach(([k, col]) => { if (b[k] !== undefined && String(b[k]).trim() !== '') { cols.push(col); vals.push(k === 'gstin' ? String(b[k]).trim().toUpperCase() : String(b[k]).trim()); } });
    const [r] = await pool.query(`INSERT INTO companies (${cols.join(', ')}, status, created_by, owner, created_at, updated_at) VALUES (${cols.map(() => '?').join(', ')}, 'Active', ?, ?, NOW(), NOW())`, [...vals, req.user.id, req.user.name]);
    const c = b.contact || {};
    if (String(c.name || '').trim()) {
      const [first, ...rest] = String(c.name).trim().split(/\s+/);
      await pool.query("INSERT INTO contacts (first_name, last_name, email, phone, position, company_id, company_name, status, owner_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'Active', ?, NOW(), NOW())",
        [first, rest.join(' ') || null, c.email || null, String(c.phone || '').slice(0, 20) || null, c.position || null, r.insertId, name, req.user.id]);
    }
    await event(req, { companyId: r.insertId, kind: 'created', title: `Customer added: ${name}` });
    res.status(201).json({ id: r.insertId });
  });

  route('get', '/customers/:id', 'Could not load the customer', async (req, res) => {
    const [c] = await q('SELECT * FROM companies WHERE id = ?', [req.params.id]);
    if (!c) return res.status(404).json({ error: 'Customer not found' });
    const names = await usersById();
    const contacts = await q('SELECT * FROM contacts WHERE company_id = ? ORDER BY id', [c.id]);
    const leads = await q('SELECT id, lead_name, project_name, phone, email, lead_status, lead_source, value, owner_id, converted_deal_id, created_at, lost_reason, hold_until FROM leads WHERE company_id = ? OR converted_company_id = ? ORDER BY created_at DESC', [c.id, c.id]);
    const deals = await q('SELECT id, deal_name, deal_value, won_value, status, deal_stage, on_hold, hold_until, assignee_id, expected_close_date, closed_at, lost_reason, created_at, updated_at FROM deals WHERE company_id = ? ORDER BY updated_at DESC', [c.id]);
    const dealIds = deals.map(d => d.id); const leadIds = leads.map(l => l.id);
    const quotes = await q(`SELECT id, estimation_number, quote_base, version, status, total, subject, estimate_date, expiry_date, sent_at, deal_id FROM estimations
      WHERE quote_base IS NOT NULL AND proposal_id IS NULL AND status <> 'Revised' AND (client_id = ? ${dealIds.length ? 'OR deal_id IN (?)' : ''}) ORDER BY updated_at DESC`, dealIds.length ? [c.id, dealIds] : [c.id]);
    const myDecks = (await decksOf()).filter(x => Number(x.companyId) === Number(c.id) || dealIds.includes(x.dealId));
    const invs = await invoiceRows('i.client_id = ?', [c.id]);
    const invIds = invs.map(i => i.id);
    const pays = await q(`SELECT p.*, i.invoice_number FROM sales_payments p LEFT JOIN invoices i ON i.id = p.invoice_id WHERE p.company_id = ? ${invIds.length ? 'OR p.invoice_id IN (?)' : ''} ORDER BY p.paid_on DESC, p.id DESC`, invIds.length ? [c.id, invIds] : [c.id]);
    const conds = ['company_id = ?']; const params = [c.id];
    if (leadIds.length) { conds.push('lead_id IN (?)'); params.push(leadIds); }
    if (dealIds.length) { conds.push('deal_id IN (?)'); params.push(dealIds); }
    if (invIds.length) { conds.push('invoice_id IN (?)'); params.push(invIds); }
    const events = await q(`SELECT * FROM sales_events WHERE ${conds.join(' OR ')} ORDER BY happened_at DESC, id DESC LIMIT 300`, params);
    const fuConds = []; const fuParams = [OPEN_FU];
    if (leadIds.length) { fuConds.push('f.lead_id IN (?)'); fuParams.push(leadIds); }
    if (dealIds.length) { fuConds.push('f.deal_id IN (?)'); fuParams.push(dealIds); }
    const followups = fuConds.length ? await q(`SELECT f.*, COALESCE(d.deal_name, l.lead_name) AS name FROM followups f LEFT JOIN deals d ON d.id = f.deal_id LEFT JOIN leads l ON l.id = f.lead_id
      WHERE f.status IN (?) AND (${fuConds.join(' OR ')}) ORDER BY f.scheduled_date, f.scheduled_time`, fuParams) : [];
    const shapedInv = invs.map(r => shapeInvoice(r, names));
    const issued = shapedInv.filter(i => i.status !== 'Draft');
    const won = deals.filter(isWon); const open = deals.filter(d => !isWon(d) && !isLost(d));
    res.json({
      customer: {
        id: c.id, name: c.company_name, email: c.email || '', phone: c.phone || '', phone2: c.phone2 || '', website: c.website || '', industry: c.industry || '',
        address: c.address || '', city: c.city || '', state: c.state || '', zipcode: c.zipcode || '', country: c.country || '', gstin: c.gstin || '', source: c.source || '',
        notes: c.description || '', status: c.status || 'Active', type: c.status === 'Inactive' ? 'Inactive' : won.length || issued.length ? 'Customer' : 'Prospect',
        createdBy: names.get(Number(c.created_by)) || c.owner || '', createdAt: c.created_at
      },
      contacts: contacts.map(x => ({ id: x.id, name: `${x.first_name || ''} ${x.last_name || ''}`.trim(), email: x.email || '', phone: x.phone || '', position: x.position || '', notes: x.notes || '' })),
      leads: leads.map(l => ({ id: l.id, name: l.lead_name, project: l.project_name, status: l.lead_status === 'Not Contacted' ? 'New' : l.lead_status, source: l.lead_source, value: Number(l.value) || 0, owner: names.get(Number(l.owner_id)) || '', dealId: l.converted_deal_id, createdAt: l.created_at, lostReason: l.lost_reason })),
      deals: deals.map(d => ({ id: d.id, name: d.deal_name, value: Number(d.deal_value) || 0, wonValue: Number(d.won_value) || null, stage: d.deal_stage, status: d.on_hold ? 'On Hold' : isWon(d) ? 'Won' : isLost(d) ? 'Lost' : 'Open', owner: names.get(Number(d.assignee_id)) || '', expectedClose: d.expected_close_date, closedAt: d.closed_at, lostReason: d.lost_reason, updatedAt: d.updated_at })),
      quotations: quotes.map(x => ({ id: x.id, number: x.estimation_number, base: x.quote_base, version: x.version, status: x.status, total: Number(x.total) || 0, subject: x.subject || '', date: x.estimate_date, validUntil: x.expiry_date, sentAt: x.sent_at, dealId: x.deal_id }))
        .concat(myDecks.map(x => ({ id: x.id, deck: true, number: x.number, base: x.number, version: 1, status: x.status, total: x.total, subject: x.title || '', date: x.createdAt, validUntil: null, sentAt: x.sentAt, dealId: x.dealId }))),
      invoices: shapedInv,
      payments: pays.map(p => ({ id: p.id, receipt: p.receipt_number, invoiceId: p.invoice_id, invoice: p.invoice_number, amount: Number(p.amount) || 0, date: p.paid_on, mode: p.mode, reference: p.reference, by: p.by_name, advance: !p.invoice_id })),
      advance: await advanceBalance(c.id),
      followups: followups.map(f => ({ id: f.id, type: f.type, subject: f.subject, date: ymd(f.scheduled_date), time: String(f.scheduled_time || '').slice(0, 5), name: f.name, leadId: f.lead_id, dealId: f.deal_id, assignedName: f.assigned_to_name || names.get(Number(f.assigned_to)) || '' })),
      timeline: events.map(e => ({ id: `e-${e.id}`, kind: e.kind, title: e.title, body: e.body, by: e.by_name, at: e.happened_at, leadId: e.lead_id, dealId: e.deal_id, quotationId: e.quotation_id, invoiceId: e.invoice_id })),
      summary: {
        wonValue: sum(won, wonAmount), wonDeals: won.length, openDeals: open.filter(d => !d.on_hold).length, pipelineValue: sum(open.filter(d => !d.on_hold), d => d.deal_value),
        invoiced: sum(issued, i => i.total), paid: sum(issued, i => i.paid), outstanding: sum(issued, i => i.balance), overdue: sum(issued.filter(i => i.status === 'Overdue'), i => i.balance),
        lastPayment: pays[0] ? { amount: Number(pays[0].amount), date: pays[0].paid_on } : null, advance: await advanceBalance(c.id)
      }
    });
  });

  route('put', '/customers/:id', 'Could not save the customer', async (req, res) => {
    const b = req.body || {};
    const sets = []; const vals = [];
    Object.entries(COMPANY_FIELDS).forEach(([k, col]) => { if (b[k] !== undefined) { sets.push(`${col} = ?`); vals.push(String(b[k]).trim() === '' ? null : k === 'gstin' ? String(b[k]).trim().toUpperCase() : String(b[k]).trim()); } });
    if (b.status !== undefined && ['Active', 'Inactive', 'Prospect'].includes(b.status)) { sets.push('status = ?'); vals.push(b.status); }
    if (b.name !== undefined && !String(b.name).trim()) return res.status(400).json({ error: 'The name cannot be empty.' });
    if (!sets.length) return res.json({ ok: true });
    const [r] = await pool.query(`UPDATE companies SET ${sets.join(', ')}, updated_at = NOW() WHERE id = ?`, [...vals, req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Customer not found' });
    if (b.status) await event(req, { companyId: Number(req.params.id), kind: 'status', title: `Customer marked ${b.status}` });
    res.json({ ok: true });
  });

  route('post', '/customers/:id/contacts', 'Could not add the contact', async (req, res) => {
    const b = req.body || {};
    const [c] = await q('SELECT id, company_name FROM companies WHERE id = ?', [req.params.id]);
    if (!c) return res.status(404).json({ error: 'Customer not found' });
    if (!String(b.name || '').trim()) return res.status(400).json({ error: 'Enter the contact name.' });
    if (!String(b.phone || '').trim() && !String(b.email || '').trim()) return res.status(400).json({ error: 'Enter a phone number or an email.' });
    const [first, ...rest] = String(b.name).trim().split(/\s+/);
    const [r] = await pool.query("INSERT INTO contacts (first_name, last_name, email, phone, position, notes, company_id, company_name, status, owner_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?, NOW(), NOW())",
      [first, rest.join(' ') || null, b.email || null, String(b.phone || '').slice(0, 20) || null, b.position || null, b.notes || null, c.id, c.company_name, req.user.id]);
    res.status(201).json({ id: r.insertId });
  });
  route('put', '/contacts/:id', 'Could not save the contact', async (req, res) => {
    const b = req.body || {};
    const [first, ...rest] = String(b.name || '').trim().split(/\s+/);
    if (!first) return res.status(400).json({ error: 'Enter the contact name.' });
    await pool.query('UPDATE contacts SET first_name = ?, last_name = ?, email = ?, phone = ?, position = ?, notes = ?, updated_at = NOW() WHERE id = ?',
      [first, rest.join(' ') || null, b.email || null, String(b.phone || '').slice(0, 20) || null, b.position || null, b.notes || null, req.params.id]);
    res.json({ ok: true });
  });
  route('delete', '/contacts/:id', 'Could not remove the contact', async (req, res) => {
    await pool.query('DELETE FROM contacts WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  });

  // Repeat business: a new deal straight on an existing customer (no enquiry step).
  route('post', '/customers/:id/deals', 'Could not create the deal', async (req, res) => {
    const b = req.body || {};
    const [c] = await q('SELECT id, company_name FROM companies WHERE id = ?', [req.params.id]);
    if (!c) return res.status(404).json({ error: 'Customer not found' });
    const name = String(b.deal_name || '').trim();
    if (!name) return res.status(400).json({ error: 'Name the deal, e.g. "AMC renewal 2027".' });
    const list = await stages();
    const stage = list.find(s => s.name === b.stage) || list[0];
    const [r] = await pool.query(`INSERT INTO deals (deal_name, description, deal_value, currency, status, company_id, deal_stage, pipeline_stage_id, probability, assignee_id, expected_close_date, source, priority, created_at, updated_at)
      VALUES (?, ?, ?, 'INR', 'Open', ?, ?, ?, ?, ?, ?, ?, 'Medium', NOW(), NOW())`,
    [name, b.description || null, Number(b.deal_value) || 0, c.id, stage?.name || 'New', stage?.id || null, stage?.probability ?? 10, Number(b.assignee_id) || req.user.id, isDay(b.expected_close_date) ? b.expected_close_date : null, b.source || 'Existing customer']);
    await event(req, { dealId: r.insertId, companyId: c.id, kind: 'created', title: `Deal opened for ${c.company_name}`, body: b.description || null });
    if (Number(b.assignee_id) && Number(b.assignee_id) !== Number(req.user.id)) notify([b.assignee_id], `Deal assigned: ${name}`, `${req.user.name} opened a deal for ${c.company_name} and assigned it to you.`, null);
    res.status(201).json({ dealId: r.insertId });
  });

  // ── Invoices ──────────────────────────────────────────────────────────
  route('get', '/invoices', 'Could not load invoices', async (req, res) => {
    const uid = Number(req.user.id);
    const names = await usersById();
    let rows = await invoiceRows();
    if (req.query.scope === 'mine' || !isMgr(req)) rows = rows.filter(r => ownsInvoice(r, uid));
    const all = rows.map(r => shapeInvoice(r, names));
    const issued = all.filter(i => i.status !== 'Draft');
    const r = { from: isDay(req.query.from) ? req.query.from : null, to: isDay(req.query.to) ? req.query.to : null };
    let list = all;
    if (r.from) list = list.filter(i => ymd(i.date) >= r.from);
    if (r.to) list = list.filter(i => ymd(i.date) <= r.to);
    if (req.query.status === 'Outstanding') list = list.filter(i => i.balance > 0 && i.status !== 'Draft');
    else if (req.query.status) list = list.filter(i => i.status === req.query.status);
    const term = String(req.query.q || '').trim().toLowerCase();
    if (term) list = list.filter(i => [i.number, i.company, i.subject, i.dealName, i.quotationNumber].some(v => String(v || '').toLowerCase().includes(term)));
    const mr = monthRange(monthOf(new Date()));
    const [[col]] = await pool.query('SELECT COALESCE(SUM(amount), 0) n FROM sales_payments WHERE paid_on BETWEEN ? AND ?', [mr.from, mr.to]);
    res.json({
      invoices: list,
      counts: ['Draft', 'Sent', 'Partially Paid', 'Overdue', 'Paid'].reduce((o, s) => ({ ...o, [s]: all.filter(i => i.status === s).length }), { Outstanding: issued.filter(i => i.balance > 0).length }),
      totals: {
        invoiced: sum(issued, i => i.total), collected: sum(issued, i => i.paid), outstanding: sum(issued, i => i.balance),
        overdue: sum(issued.filter(i => i.status === 'Overdue'), i => i.balance), collectedMonth: req.query.scope === 'mine' ? null : round2(col.n),
        drafts: all.filter(i => i.status === 'Draft').length
      }
    });
  });

  /** Money paid in advance (no invoice yet) and waiting to be adjusted against an invoice. */
  const advanceBalance = async (companyId) => round2((await q('SELECT COALESCE(SUM(amount), 0) a FROM sales_payments WHERE company_id = ? AND invoice_id IS NULL', [companyId]))[0].a);
  /** Earlier issued invoices of the same customer that still have a balance. */
  const previousDues = async (inv) => {
    if (!inv.client_id) return [];
    const rows = await q("SELECT id, invoice_number, invoice_date, open_till, total, amount_paid, status, created_at FROM invoices WHERE client_id = ? AND id <> ? AND status <> 'Draft' AND id < ? ORDER BY id", [inv.client_id, inv.id, inv.id]);
    return rows.filter(r => Number(r.total) - Number(r.amount_paid) > 0.005).map(r => ({ id: r.id, number: r.invoice_number, balance: round2(Number(r.total) - Number(r.amount_paid)), dueDate: r.open_till, status: invoiceStatus(r), daysLate: invoiceStatus(r) === 'Overdue' ? daysLate(r) : 0 }));
  };
  const loadInvoice = async (id) => {
    const names = await usersById();
    const [row] = await invoiceRows('i.id = ?', [id]);
    if (!row) return null;
    const items = await q('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY COALESCE(position, 0), id', [id]);
    const [c] = row.client_id ? await q('SELECT * FROM companies WHERE id = ?', [row.client_id]) : [];
    const pays = await q('SELECT * FROM sales_payments WHERE invoice_id = ? ORDER BY paid_on, id', [id]);
    return {
      ...shapeInvoice(row, names),
      client: { name: row.bill_to || c?.company_name || '', email: row.client_email || c?.email || '', phone: row.client_phone || c?.phone || '', address: row.client_address || [c?.address, c?.city].filter(Boolean).join(', '), gstin: row.client_gstin || c?.gstin || '', state: row.client_state || c?.state || '' },
      items: items.map(i => ({ id: i.id, name: i.item_name, description: i.description || '', hsn: i.hsn_sac || '', unit: i.unit || '', qty: Number(i.quantity) || 0, rate: Number(i.price) || 0, discountPct: Number(i.discount_percentage) || 0, taxPct: Number(i.tax_percentage) || 0, total: Number(i.amount) || 0 })),
      terms: row.terms_conditions || '', notes: row.notes || '',
      previousDues: await previousDues(row), advance: row.client_id ? await advanceBalance(row.client_id) : 0,
      payments: pays.map(p => ({ id: p.id, receipt: p.receipt_number, amount: Number(p.amount) || 0, date: p.paid_on, mode: p.mode, reference: p.reference, notes: p.notes, by: p.by_name, createdAt: p.created_at }))
    };
  };

  route('get', '/invoices/:id', 'Could not load the invoice', async (req, res) => {
    const invoice = await loadInvoice(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    const events = (await q('SELECT * FROM sales_events WHERE invoice_id = ? ORDER BY happened_at DESC, id DESC', [invoice.id])).map(e => ({ id: e.id, kind: e.kind, title: e.title, body: e.body, by: e.by_name, at: e.happened_at }));
    res.json({ invoice, events, payModes: PAY_MODES, canDeletePayments: isMgr(req) });
  });

  const saveInvoiceLines = async (conn, id, items, gstMode) => {
    const t = computeTotals(items, gstMode);
    await conn.query(`UPDATE invoices SET subtotal = ?, discount_percentage = ?, discount_amount = ?, tax_percentage = ?, tax_amount = ?, total = ?, amount = ?,
        gst_mode = ?, cgst_amount = ?, sgst_amount = ?, igst_amount = ?, updated_at = NOW() WHERE id = ?`,
    [t.gross, t.discountPct, t.discount, t.taxable ? round2((t.tax / t.taxable) * 100) : 0, t.tax, t.total, t.total, gstMode, t.cgst, t.sgst, t.igst, id]);
    await conn.query('DELETE FROM invoice_items WHERE invoice_id = ?', [id]);
    for (const l of t.lines) {
      await conn.query(`INSERT INTO invoice_items (invoice_id, item_name, description, quantity, price, discount_percentage, discount_amount, tax_percentage, tax_amount, amount, hsn_sac, unit, position)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, l.name, l.description || null, l.qty, l.rate, l.discountPct, l.discount, l.taxPct, l.tax, l.total, l.hsn || null, l.unit || null, l.position]);
    }
    return t;
  };
  const gstModeFor = (b, client, settings) => (b.gstMode === 'inter' || b.gstMode === 'intra' ? b.gstMode
    : client.state && settings.company.state && client.state.trim().toLowerCase() !== settings.company.state.trim().toLowerCase() ? 'inter' : 'intra');

  route('post', '/invoices', 'Could not create the invoice', async (req, res) => {
    const b = req.body || {};
    const settings = await getSettings();
    const [c] = Number(b.companyId) ? await q('SELECT * FROM companies WHERE id = ?', [b.companyId]) : [];
    if (!c) return res.status(400).json({ error: 'Choose the customer.' });
    const items = cleanItems(b.items, settings.quotation.defaultTaxPct);
    if (!items.length) return res.status(400).json({ error: 'Add at least one item with a name and quantity.' });
    const [deal] = Number(b.dealId) ? await q('SELECT id FROM deals WHERE id = ? AND company_id = ?', [b.dealId, c.id]) : [];
    const client = { name: c.company_name, email: c.email || '', phone: c.phone || '', address: [c.address, c.city].filter(Boolean).join(', '), gstin: c.gstin || '', state: c.state || '', ...(b.client || {}) };
    const gstMode = gstModeFor(b, client, settings);
    const date = isDay(b.date) ? b.date : today();
    const due = isDay(b.dueDate) ? b.dueDate : ymd(new Date(new Date(`${date}T12:00:00`).getTime() + (Number(settings.invoice.dueDays) || 0) * 86400000));
    const number = await nextInvoiceNumber(settings);
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [ins] = await conn.query(`INSERT INTO invoices (invoice_number, client_id, bill_to, deal_id, amount, currency, invoice_date, open_till, status, description, subject, notes, terms_conditions, amount_paid, created_by,
          client_gstin, client_address, client_state, client_email, client_phone) VALUES (?, ?, ?, ?, 0, 'INR', ?, ?, 'Draft', ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)`,
      [number, c.id, client.name, deal?.id || null, date, due, b.subject || null, b.subject || null, b.notes || null, b.terms ?? settings.invoice.terms ?? null, req.user.id,
        client.gstin || null, client.address || null, client.state || null, client.email || null, client.phone || null]);
      const t = await saveInvoiceLines(conn, ins.insertId, items, gstMode);
      await conn.commit();
      await event(req, { invoiceId: ins.insertId, dealId: deal?.id || null, companyId: c.id, kind: 'invoice', title: `Invoice ${number} drafted`, meta: { total: t.total } });
      res.status(201).json({ id: ins.insertId, number });
    } catch (e) { await conn.rollback().catch(() => {}); throw e; } finally { conn.release(); }
  });

  route('put', '/invoices/:id', 'Could not save the invoice', async (req, res) => {
    const b = req.body || {};
    const [inv] = await q('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
    if (!inv) return res.status(404).json({ error: 'Invoice not found' });
    if (inv.status !== 'Draft') {
      // Issued invoices keep their lines; only the due date and the notes can change.
      await pool.query('UPDATE invoices SET open_till = COALESCE(?, open_till), notes = ?, updated_at = NOW() WHERE id = ?', [isDay(b.dueDate) ? b.dueDate : null, b.notes ?? inv.notes, inv.id]);
      if (isDay(b.dueDate) && b.dueDate !== ymd(inv.open_till)) await event(req, { invoiceId: inv.id, dealId: inv.deal_id, companyId: inv.client_id, kind: 'invoice', title: `Due date moved to ${b.dueDate}` });
      return res.json({ ok: true });
    }
    const settings = await getSettings();
    const items = cleanItems(b.items, settings.quotation.defaultTaxPct);
    if (!items.length) return res.status(400).json({ error: 'Add at least one item with a name and quantity.' });
    const client = { ...(b.client || {}) };
    const gstMode = gstModeFor(b, client, settings);
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(`UPDATE invoices SET invoice_date = ?, open_till = ?, subject = ?, description = ?, notes = ?, terms_conditions = ?, bill_to = ?, client_gstin = ?, client_address = ?, client_state = ?, client_email = ?, client_phone = ? WHERE id = ?`,
        [isDay(b.date) ? b.date : ymd(inv.invoice_date || new Date()), isDay(b.dueDate) ? b.dueDate : inv.open_till, b.subject || null, b.subject || null, b.notes || null, b.terms || null,
          client.name || inv.bill_to, client.gstin || null, client.address || null, client.state || null, client.email || null, client.phone || null, inv.id]);
      await saveInvoiceLines(conn, inv.id, items, gstMode);
      await conn.commit();
      res.json({ ok: true });
    } catch (e) { await conn.rollback().catch(() => {}); throw e; } finally { conn.release(); }
  });

  route('delete', '/invoices/:id', 'Could not delete the invoice', async (req, res) => {
    const [inv] = await q('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
    if (!inv) return res.status(404).json({ error: 'Invoice not found' });
    if (inv.status !== 'Draft') return res.status(400).json({ error: 'Only a draft invoice can be deleted.' });
    const [[p]] = await pool.query('SELECT COUNT(*) n FROM sales_payments WHERE invoice_id = ?', [inv.id]);
    if (p.n) return res.status(400).json({ error: 'This invoice has payments.' });
    await pool.query('DELETE FROM invoice_items WHERE invoice_id = ?', [inv.id]);
    await pool.query('DELETE FROM invoices WHERE id = ?', [inv.id]);
    await event(req, { dealId: inv.deal_id, companyId: inv.client_id, kind: 'invoice', title: `Draft invoice ${inv.invoice_number} deleted` });
    res.json({ ok: true });
  });

  const issue = async (req, inv, to) => {
    await pool.query(`UPDATE invoices SET status = IF(status IN ('Draft', 'Unpaid'), 'Sent', status), sent_at = NOW(), sent_to = ?, invoice_date = IF(status = 'Draft', CURDATE(), invoice_date), updated_at = NOW() WHERE id = ?`, [String(to).slice(0, 500), inv.id]);
  };
  route('post', '/invoices/:id/mark-sent', 'Could not mark it sent', async (req, res) => {
    const [inv] = await q('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
    if (!inv) return res.status(404).json({ error: 'Invoice not found' });
    if (!(Number(inv.total) > 0)) return res.status(400).json({ error: 'The invoice total is zero.' });
    const via = ['WhatsApp', 'Email', 'In person', 'Courier'].includes(req.body?.via) ? req.body.via : 'WhatsApp';
    await issue(req, inv, via);
    await event(req, { invoiceId: inv.id, dealId: inv.deal_id, companyId: inv.client_id, kind: 'communication', title: `${via === 'In person' ? 'Visit' : via} · Invoice ${inv.invoice_number} shared`, meta: { channel: via === 'In person' ? 'Visit' : via, direction: 'out' } });
    res.json({ ok: true });
  });
  route('post', '/invoices/:id/send', 'Could not send the invoice', async (req, res) => {
    const [inv] = await q('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
    if (!inv) return res.status(404).json({ error: 'Invoice not found' });
    if (!(Number(inv.total) > 0)) return res.status(400).json({ error: 'The invoice total is zero.' });
    const valid = (v) => String(v || '').split(/[;,]/).map(s => s.trim()).filter(s => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s));
    const to = valid(req.body?.to); const cc = valid(req.body?.cc);
    if (!to.length) return res.status(400).json({ error: 'Enter the client\'s email address.' });
    const mail = emailReady();
    if (!mail) return res.status(503).json({ error: 'Email is not set up on the server. Download the PDF and send it yourself, then use "Mark as sent".' });
    const out = await app.locals.salesPdf.invoicePdf(inv.id);
    const settings = await getSettings();
    const balance = round2(Math.max(0, Number(inv.total) - Number(inv.amount_paid)));
    const vars = { number: inv.invoice_number, company: settings.company.name, client: out.client.name, total: `Rs. ${Number(inv.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, balance: `Rs. ${balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, dueDate: inv.open_till ? ymd(inv.open_till) : '', sender: req.user.name };
    const subject = String(req.body?.subject || fill(settings.email.invoiceSubject, vars)).slice(0, 250);
    const text = String(req.body?.message || fill(settings.email.invoiceMessage, vars));
    try {
    await mail.transporter.sendMail({
      from: mail.from, to: to.join(', '), cc: cc.length ? cc.join(', ') : undefined, replyTo: req.user.email || undefined, subject, text,
      html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#111827;white-space:pre-wrap">${text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</div>`,
      attachments: [{ filename: `${inv.invoice_number}.pdf`, content: out.buf, contentType: 'application/pdf' }]
    });
    } catch (e) { const m = mailError(e); return res.status(m.status).json({ error: m.error }); }
    await issue(req, inv, to.join(', '));
    await event(req, { invoiceId: inv.id, dealId: inv.deal_id, companyId: inv.client_id, kind: 'communication', title: `Email to client · Invoice ${inv.invoice_number} sent`, body: `To: ${to.join(', ')}${cc.length ? `\nCc: ${cc.join(', ')}` : ''}\nSubject: ${subject}`, meta: { channel: 'Email', direction: 'out' } });
    res.json({ ok: true });
  });

  // ── Payments ──────────────────────────────────────────────────────────
  route('post', '/invoices/:id/payments', 'Could not record the payment', async (req, res) => {
    const b = req.body || {};
    const [inv] = await q('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
    if (!inv) return res.status(404).json({ error: 'Invoice not found' });
    const amount = round2(b.amount);
    const balance = round2(Math.max(0, Number(inv.total) - Number(inv.amount_paid)));
    if (!(amount > 0)) return res.status(400).json({ error: 'Enter the amount received.' });
    const excess = round2(amount - balance);
    if (excess > 0.01 && !b.excessAsAdvance) return res.status(400).json({ error: `That is more than the balance due (₹${balance.toLocaleString('en-IN')}). Tick “keep the extra as advance” to adjust it on the next invoice.` });
    if (!isDay(b.date) || b.date > today()) return res.status(400).json({ error: 'Choose the date it was received (not in the future).' });
    if (inv.invoice_date && b.date < ymd(inv.invoice_date)) return res.status(400).json({ error: `The invoice is dated ${ymd(inv.invoice_date)}; a payment cannot be dated before it.` });
    const mode = PAY_MODES.includes(b.mode) ? b.mode : 'Bank transfer';
    if (['Bank transfer', 'UPI', 'Cheque'].includes(mode) && !String(b.reference || '').trim()) return res.status(400).json({ error: `Enter the ${mode === 'Cheque' ? 'cheque number' : 'transaction reference / UTR'}.` });
    const receipt = await nextReceiptNumber();
    const [r] = await pool.query('INSERT INTO sales_payments (receipt_number, invoice_id, company_id, deal_id, amount, paid_on, mode, reference, notes, by_id, by_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [receipt, inv.id, inv.client_id || null, inv.deal_id || null, amount, b.date, mode, String(b.reference || '').trim().slice(0, 120) || null, String(b.notes || '').slice(0, 500) || null, req.user.id, req.user.name]);
    if (inv.status === 'Draft') await pool.query('UPDATE invoices SET invoice_date = COALESCE(invoice_date, CURDATE()) WHERE id = ?', [inv.id]);
    if (excess > 0.01) {
      // The invoice takes its balance; the rest is held as advance for this customer under the same receipt.
      await pool.query('UPDATE sales_payments SET amount = ? WHERE id = ?', [balance, r.insertId]);
      await pool.query('INSERT INTO sales_payments (receipt_number, invoice_id, company_id, deal_id, amount, paid_on, mode, reference, notes, by_id, by_name) VALUES (?, NULL, ?, NULL, ?, ?, ?, ?, ?, ?, ?)',
        [receipt, inv.client_id || null, excess, b.date, mode, String(b.reference || '').trim().slice(0, 120) || null, `Advance: extra received against ${inv.invoice_number}`, req.user.id, req.user.name]);
    }
    await recalcInvoice(inv.id);
    const left = round2(balance - Math.min(amount, balance));
    await event(req, { invoiceId: inv.id, dealId: inv.deal_id, companyId: inv.client_id, kind: 'payment', title: `Payment ₹${amount.toLocaleString('en-IN')} received · ${inv.invoice_number}`, body: `${mode}${b.reference ? ` · ${b.reference}` : ''}${left > 0 ? ` · balance ₹${left.toLocaleString('en-IN')}` : ' · fully paid'}`, meta: { amount, mode, receipt } });
    const [deal] = inv.deal_id ? await q('SELECT assignee_id FROM deals WHERE id = ?', [inv.deal_id]) : [];
    const owner = Number(deal?.assignee_id || inv.created_by);
    if (owner && owner !== Number(req.user.id)) notify([owner], `Payment received: ${inv.invoice_number}`, `₹${amount.toLocaleString('en-IN')} by ${mode}${left > 0 ? `; ₹${left.toLocaleString('en-IN')} still due` : '; fully paid'}.`, null);
    res.status(201).json({ id: r.insertId, receipt });
  });

  // Money received before an invoice exists (retainers paid in advance, extra paid this month).
  route('post', '/customers/:id/advance', 'Could not record the advance', async (req, res) => {
    const b = req.body || {};
    const [c] = await q('SELECT id, company_name FROM companies WHERE id = ?', [req.params.id]);
    if (!c) return res.status(404).json({ error: 'Customer not found' });
    const amount = round2(b.amount);
    if (!(amount > 0)) return res.status(400).json({ error: 'Enter the amount received.' });
    if (!isDay(b.date) || b.date > today()) return res.status(400).json({ error: 'Choose the date it was received (not in the future).' });
    const mode = PAY_MODES.includes(b.mode) ? b.mode : 'Bank transfer';
    if (['Bank transfer', 'UPI', 'Cheque'].includes(mode) && !String(b.reference || '').trim()) return res.status(400).json({ error: `Enter the ${mode === 'Cheque' ? 'cheque number' : 'transaction reference / UTR'}.` });
    const receipt = await nextReceiptNumber();
    const [r] = await pool.query('INSERT INTO sales_payments (receipt_number, invoice_id, company_id, deal_id, amount, paid_on, mode, reference, notes, by_id, by_name) VALUES (?, NULL, ?, NULL, ?, ?, ?, ?, ?, ?, ?)',
      [receipt, c.id, amount, b.date, mode, String(b.reference || '').trim().slice(0, 120) || null, String(b.notes || 'Advance received').slice(0, 500), req.user.id, req.user.name]);
    await event(req, { companyId: c.id, kind: 'payment', title: `Advance ₹${amount.toLocaleString('en-IN')} received from ${c.company_name}`, body: `${mode}${b.reference ? ` · ${b.reference}` : ''} · adjust it against the next invoice`, meta: { amount, mode, receipt } });
    res.status(201).json({ id: r.insertId, receipt });
  });

  // Use advance held for the customer to pay (part of) an issued invoice.
  route('post', '/invoices/:id/apply-advance', 'Could not apply the advance', async (req, res) => {
    const [inv] = await q('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
    if (!inv) return res.status(404).json({ error: 'Invoice not found' });
    if (inv.status === 'Draft') return res.status(400).json({ error: 'Issue the invoice first (send it or mark it as sent).' });
    const held = await advanceBalance(inv.client_id);
    const balance = round2(Math.max(0, Number(inv.total) - Number(inv.amount_paid)));
    let amount = round2(req.body?.amount === undefined ? Math.min(held, balance) : req.body.amount);
    if (!(amount > 0)) return res.status(400).json({ error: held > 0 ? 'Nothing is due on this invoice.' : 'This customer has no advance to adjust.' });
    if (amount > held + 0.01) return res.status(400).json({ error: `Only ₹${held.toLocaleString('en-IN')} advance is held.` });
    if (amount > balance + 0.01) return res.status(400).json({ error: `The invoice balance is ₹${balance.toLocaleString('en-IN')}.` });
    let left = amount;
    for (const row of await q('SELECT * FROM sales_payments WHERE company_id = ? AND invoice_id IS NULL ORDER BY paid_on, id', [inv.client_id])) {
      if (left <= 0.004) break;
      const take = round2(Math.min(left, Number(row.amount)));
      if (take >= Number(row.amount) - 0.004) await pool.query('UPDATE sales_payments SET invoice_id = ?, deal_id = ?, notes = ? WHERE id = ?', [inv.id, inv.deal_id || null, `Advance adjusted against ${inv.invoice_number}`, row.id]);
      else {
        await pool.query('UPDATE sales_payments SET amount = ? WHERE id = ?', [round2(Number(row.amount) - take), row.id]);
        await pool.query('INSERT INTO sales_payments (receipt_number, invoice_id, company_id, deal_id, amount, paid_on, mode, reference, notes, by_id, by_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [row.receipt_number, inv.id, inv.client_id, inv.deal_id || null, take, row.paid_on, row.mode, row.reference, `Advance adjusted against ${inv.invoice_number}`, req.user.id, req.user.name]);
      }
      left = round2(left - take);
    }
    await recalcInvoice(inv.id);
    await event(req, { invoiceId: inv.id, dealId: inv.deal_id, companyId: inv.client_id, kind: 'payment', title: `Advance ₹${amount.toLocaleString('en-IN')} adjusted against ${inv.invoice_number}`, body: `Balance now ₹${round2(balance - amount).toLocaleString('en-IN')}` });
    res.json({ ok: true, applied: amount });
  });

  // ── Billing from a quotation: one invoice per month (retainer) or per milestone (project) ──
  const billingFor = async (qid) => {
    const quote = await loadQuote(qid);
    if (!quote) return null;
    const names = await usersById();
    const invs = (await invoiceRows('i.estimate_id = ?', [qid])).map(r => shapeInvoice(r, names));
    const t = computeTotals(quote.items, quote.gstMode);
    const plan = quote.plan || {};
    const nowYm = today().slice(0, 7);
    const rows = [];
    if (quote.quoteType === 'retainer') {
      for (let i = 0; i < (plan.months || 0); i += 1) {
        const ym = shiftMonth(plan.startMonth, i);
        const inv = invs.find(x => x.serviceMonth === ym) || null;
        rows.push({ key: `m:${ym}`, label: monthName(ym), month: ym, amount: t.total, invoice: inv, status: inv ? inv.status : ym <= nowYm ? 'Due' : 'Upcoming' });
      }
    } else if (quote.quoteType === 'project') {
      let left = t.total;
      (plan.milestones || []).forEach((m, i, all) => {
        const amount = i === all.length - 1 ? left : round2((t.total * m.pct) / 100); left = round2(left - amount);
        const inv = invs.find(x => x.milestoneNo === i + 1) || null;
        rows.push({ key: `ms:${i + 1}`, label: m.name, milestone: i + 1, pct: m.pct, amount, invoice: inv, status: inv ? inv.status : 'Not billed' });
      });
    }
    const billed = round2(rows.reduce((x, r) => x + (r.invoice ? r.invoice.total : 0), 0));
    return { quote: { id: quote.id, number: quote.number, status: quote.status, quoteType: quote.quoteType, total: t.total, client: quote.client.name }, rows, billed, canBill: quote.status === 'Accepted', invoicesTotal: round2(invs.reduce((x, r) => x + r.total, 0)) };
  };
  route('get', '/quotations/:id/billing', 'Could not load the billing schedule', async (req, res) => {
    const b = await billingFor(req.params.id);
    if (!b) return res.status(404).json({ error: 'Quotation not found' });
    res.json(b);
  });

  route('post', '/quotations/:id/bill', 'Could not create the invoice', async (req, res) => {
    const quote = await loadQuote(req.params.id);
    if (!quote) return res.status(404).json({ error: 'Quotation not found' });
    if (quote.status !== 'Accepted') return res.status(400).json({ error: 'Only an accepted quotation can be billed.' });
    if (!['retainer', 'project'].includes(quote.quoteType)) return res.status(400).json({ error: 'Use “Create invoice” on this quotation.' });
    const sched = await billingFor(quote.id);
    const row = sched.rows.find(x => (req.body?.month ? x.month === req.body.month : Number(x.milestone) === Number(req.body?.milestone)));
    if (!row) return res.status(400).json({ error: req.body?.month ? 'That month is not part of this retainer.' : 'That milestone is not part of this quotation.' });
    if (row.invoice) return res.json({ id: row.invoice.id, number: row.invoice.number, already: true });
    const [e] = await q('SELECT client_id, deal_id FROM estimations WHERE id = ?', [quote.id]);
    let clientId = e.client_id;
    if (!clientId && e.deal_id) clientId = (await q('SELECT company_id FROM deals WHERE id = ?', [e.deal_id]))[0]?.company_id || null;
    if (!clientId) return res.status(400).json({ error: 'Link the deal to a customer (company) first.' });
    const settings = await getSettings();
    const t = computeTotals(quote.items, quote.gstMode);
    let lines;
    let subject;
    if (quote.quoteType === 'retainer') {
      subject = `${quote.subject || quote.client.name} · ${row.label}`;
      lines = quote.items.map(i => ({ name: i.name, description: [`Period: ${row.label}`, i.description].filter(Boolean).join('\n'), hsn: i.hsn, unit: i.unit, qty: i.qty, rate: i.rate, discountPct: i.discountPct, taxPct: i.taxPct }));
    } else {
      const ms = quote.plan.milestones; const m = ms[row.milestone - 1]; const last = row.milestone === ms.length;
      subject = `${quote.subject || quote.client.name} · ${m.name}`;
      const before = ms.slice(0, row.milestone - 1).reduce((x, y) => x + y.pct, 0);
      lines = t.lines.map(l => {
        // Each line is billed in the same proportion, so the GST on every rate stays right.
        const share = last ? round2(l.taxable - round2((l.taxable * before) / 100)) : round2((l.taxable * m.pct) / 100);
        return { name: l.name, description: `Milestone ${row.milestone} of ${ms.length}: ${m.name} (${m.pct}%)`, hsn: l.hsn, unit: '', qty: share < 0 ? -1 : 1, rate: Math.abs(share), discountPct: 0, taxPct: l.taxPct };
      }).filter(l => l.rate > 0);
    }
    const number = await nextInvoiceNumber(settings);
    const tot = computeTotals(lines, quote.gstMode);
    const due = ymd(new Date(Date.now() + (Number(settings.invoice.dueDays) || 0) * 86400000));
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [ins] = await conn.query(`INSERT INTO invoices (invoice_number, client_id, bill_to, deal_id, amount, currency, invoice_date, open_till, status, description, subject, notes, terms_conditions, amount_paid, estimate_id, created_by,
          gst_mode, client_gstin, client_address, client_state, client_email, client_phone, service_month, milestone_no, milestone_name)
        VALUES (?, ?, ?, ?, 0, ?, CURDATE(), ?, 'Draft', ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [number, clientId, quote.client.name || null, e.deal_id || null, quote.currency, due, subject, subject, null, settings.invoice.terms || null, quote.id, req.user.id,
        quote.gstMode, quote.client.gstin || null, quote.client.address || null, quote.client.state || null, quote.client.email || null, quote.client.phone || null,
        row.month || null, row.milestone || null, row.milestone ? row.label : null]);
      await saveInvoiceLines(conn, ins.insertId, cleanItems(lines, settings.quotation.defaultTaxPct), quote.gstMode);
      await conn.commit();
      await event(req, { dealId: e.deal_id, quotationId: quote.id, invoiceId: ins.insertId, companyId: clientId, kind: 'invoice', title: `Invoice ${number} drafted for ${row.label}`, meta: { total: tot.total } });
      res.status(201).json({ id: ins.insertId, number });
    } catch (err) { await conn.rollback().catch(() => {}); throw err; } finally { conn.release(); }
  });

  route('delete', '/payments/:id', 'Could not remove the payment', async (req, res) => {
    if (!isMgr(req)) return res.status(403).json({ error: 'Only a manager can remove a recorded payment.' });
    const reason = String(req.body?.reason || '').trim();
    if (!reason) return res.status(400).json({ error: 'Say why it is being removed.' });
    const [p] = await q('SELECT p.*, i.invoice_number, i.deal_id AS inv_deal FROM sales_payments p LEFT JOIN invoices i ON i.id = p.invoice_id WHERE p.id = ?', [req.params.id]);
    if (!p) return res.status(404).json({ error: 'Payment not found' });
    await pool.query('DELETE FROM sales_payments WHERE id = ?', [p.id]);
    if (p.invoice_id) await recalcInvoice(p.invoice_id);
    await event(req, { invoiceId: p.invoice_id, dealId: p.inv_deal, companyId: p.company_id, kind: 'payment', title: `Payment ${p.receipt_number || ''} of ₹${Number(p.amount).toLocaleString('en-IN')} removed`, body: reason });
    res.json({ ok: true });
  });

  route('get', '/payments', 'Could not load payments', async (req, res) => {
    const uid = Number(req.user.id);
    const r = rangeOf(req);
    let rows = await q(`SELECT p.*, i.invoice_number, i.total AS invoice_total, i.amount_paid AS invoice_paid, i.created_by, c.company_name, d.deal_name, d.assignee_id
      FROM sales_payments p LEFT JOIN invoices i ON i.id = p.invoice_id LEFT JOIN companies c ON c.id = COALESCE(p.company_id, i.client_id) LEFT JOIN deals d ON d.id = COALESCE(p.deal_id, i.deal_id)
      WHERE p.paid_on BETWEEN ? AND ? ORDER BY p.paid_on DESC, p.id DESC`, [r.from, r.to]);
    if (req.query.scope === 'mine' || !isMgr(req)) rows = rows.filter(p => Number(p.assignee_id) === uid || (!p.assignee_id && Number(p.created_by) === uid));
    if (req.query.mode) rows = rows.filter(p => p.mode === req.query.mode);
    const term = String(req.query.q || '').trim().toLowerCase();
    if (term) rows = rows.filter(p => [p.receipt_number, p.invoice_number, p.company_name, p.reference, p.deal_name].some(v => String(v || '').toLowerCase().includes(term)));
    const names = await usersById();
    res.json({
      range: r, payModes: PAY_MODES, canDelete: isMgr(req),
      payments: rows.map(p => ({ id: p.id, receipt: p.receipt_number, date: p.paid_on, amount: Number(p.amount) || 0, mode: p.mode, reference: p.reference, notes: p.notes, by: p.by_name,
        invoiceId: p.invoice_id, invoice: p.invoice_number, advance: !p.invoice_id, invoiceBalance: p.invoice_id ? round2(Math.max(0, Number(p.invoice_total) - Number(p.invoice_paid))) : 0, companyId: p.company_id, company: p.company_name || '', dealId: p.deal_id, dealName: p.deal_name || '', owner: names.get(Number(p.assignee_id || p.created_by)) || '' })),
      totals: { count: rows.length, amount: sum(rows, p => p.amount), byMode: PAY_MODES.map(m => ({ mode: m, amount: sum(rows.filter(p => p.mode === m), p => p.amount), count: rows.filter(p => p.mode === m).length })).filter(x => x.count) }
    });
  });

  // ── Team: performance, targets ────────────────────────────────────────
  const performance = async (r) => {
    const people = await salesPeople();
    const leads = await q('SELECT id, owner_id, lead_status, created_at, status_changed_at, converted_deal_id, follow_up_count FROM leads');
    const deals = await q('SELECT id, assignee_id, deal_value, won_value, status, deal_stage, on_hold, closed_at, created_at FROM deals');
    const comms = await q("SELECT by_id, meta FROM sales_events WHERE kind = 'communication' AND happened_at BETWEEN ? AND ?", [`${r.from} 00:00:00`, `${r.to} 23:59:59`]);
    const quotes = (await q('SELECT e.estimate_by, d.assignee_id, e.sent_at, e.status, e.responded_at FROM estimations e LEFT JOIN deals d ON d.id = e.deal_id WHERE e.quote_base IS NOT NULL AND e.proposal_id IS NULL AND e.sent_at BETWEEN ? AND ?', [`${r.from} 00:00:00`, `${r.to} 23:59:59`]))
      .concat((await decksOf()).filter(x => x.sentAt && ymd(x.sentAt) >= r.from && ymd(x.sentAt) <= r.to).map(x => ({ estimate_by: x.ownerId, assignee_id: x.ownerId, sent_at: x.sentAt, status: x.status, responded_at: x.respondedAt })));
    const pays = await q('SELECT p.amount, i.created_by, d.assignee_id FROM sales_payments p LEFT JOIN invoices i ON i.id = p.invoice_id LEFT JOIN deals d ON d.id = COALESCE(p.deal_id, i.deal_id) WHERE p.paid_on BETWEEN ? AND ?', [r.from, r.to]);
    const fus = await q('SELECT assigned_to, scheduled_date FROM followups WHERE status IN (?) AND (lead_id IS NOT NULL OR deal_id IS NOT NULL)', [OPEN_FU]);
    const settings = await getSettings();
    const pct = Number(settings.team.commissionPct) || 0;
    const t = today();
    const ids = new Set(people.map(p => p.id));
    const rows = people.map(p => {
      const mine = (x, k) => Number(x[k]) === p.id;
      const myLeads = leads.filter(l => mine(l, 'owner_id'));
      const newLeads = myLeads.filter(l => inRange(l.created_at, r));
      const converted = myLeads.filter(l => l.converted_deal_id && inRange(l.status_changed_at, r));
      const myDeals = deals.filter(d => mine(d, 'assignee_id'));
      const won = myDeals.filter(d => isWon(d) && inRange(d.closed_at, r)); const lost = myDeals.filter(d => isLost(d) && inRange(d.closed_at, r));
      const open = myDeals.filter(d => !isWon(d) && !isLost(d) && !d.on_hold);
      const wonValue = sum(won, wonAmount);
      const collected = sum(pays.filter(x => Number(x.assignee_id) === p.id || (!x.assignee_id && Number(x.created_by) === p.id)), x => x.amount);
      const cycle = won.filter(d => d.created_at && d.closed_at).map(d => (new Date(d.closed_at) - new Date(d.created_at)) / 86400000);
      const myComms = comms.filter(c => mine(c, 'by_id'));
      const sent = quotes.filter(x => Number(x.assignee_id || x.estimate_by) === p.id);
      return {
        userId: p.id, name: p.name, title: p.title,
        enquiries: newLeads.length, contacted: newLeads.filter(l => !['New', 'Not Contacted'].includes(l.lead_status) || Number(l.follow_up_count) > 0).length, converted: converted.length,
        activities: myComms.length, calls: myComms.filter(c => /"channel":\s*"Call"/.test(String(typeof c.meta === 'string' ? c.meta : JSON.stringify(c.meta || {})))).length,
        meetings: myComms.filter(c => /"channel":\s*"(Meeting|Visit)"/.test(String(typeof c.meta === 'string' ? c.meta : JSON.stringify(c.meta || {})))).length,
        quotesSent: sent.length, quotesAccepted: sent.filter(x => x.status === 'Accepted').length,
        dealsWon: won.length, dealsLost: lost.length, wonValue, winRate: won.length + lost.length ? Math.round((won.length / (won.length + lost.length)) * 100) : null,
        avgDeal: won.length ? round2(wonValue / won.length) : 0, cycleDays: cycle.length ? Math.round(cycle.reduce((s, x) => s + x, 0) / cycle.length) : null,
        openDeals: open.length, pipelineValue: sum(open, d => d.deal_value), collected,
        overdueFollowups: fus.filter(f => Number(f.assigned_to) === p.id && ymd(f.scheduled_date) < t).length,
        commission: pct ? round2(((settings.team.commissionBasis === 'won' ? wonValue : collected) * pct) / 100) : null
      };
    });
    return { rows, ids, commission: { pct, basis: settings.team.commissionBasis } };
  };

  route('get', '/team', 'Could not load team performance', async (req, res) => {
    const r = rangeOf(req);
    const perf = await performance(r);
    const uid = Number(req.user.id);
    const rows = isMgr(req) ? perf.rows : perf.rows.filter(x => x.userId === uid);
    // Six months of won value and collections for the chart.
    const now = new Date();
    const deals = await q("SELECT assignee_id, deal_value, won_value, status, deal_stage, closed_at FROM deals WHERE closed_at >= ?", [ymd(new Date(now.getFullYear(), now.getMonth() - 5, 1))]);
    const pays = await q('SELECT p.amount, p.paid_on, i.created_by, d.assignee_id FROM sales_payments p LEFT JOIN invoices i ON i.id = p.invoice_id LEFT JOIN deals d ON d.id = COALESCE(p.deal_id, i.deal_id) WHERE p.paid_on >= ?', [ymd(new Date(now.getFullYear(), now.getMonth() - 5, 1))]);
    const mineOnly = !isMgr(req);
    const trend = [];
    for (let i = 5; i >= 0; i -= 1) {
      const ym = monthOf(new Date(now.getFullYear(), now.getMonth() - i, 1)); const mr = monthRange(ym);
      trend.push({
        month: ym,
        won: sum(deals.filter(d => isWon(d) && inRange(d.closed_at, mr) && (!mineOnly || Number(d.assignee_id) === uid)), wonAmount),
        collected: sum(pays.filter(p => inRange(p.paid_on, mr) && (!mineOnly || Number(p.assignee_id) === uid || (!p.assignee_id && Number(p.created_by) === uid))), p => p.amount)
      });
    }
    const total = (k) => sum(rows, x => x[k]);
    const won = rows.reduce((s, x) => s + x.dealsWon, 0); const lost = rows.reduce((s, x) => s + x.dealsLost, 0);
    res.json({
      range: r, isManager: isMgr(req), commission: perf.commission, rows: rows.sort((a, b) => b.wonValue - a.wonValue || b.collected - a.collected || b.activities - a.activities), trend,
      totals: { enquiries: total('enquiries'), converted: total('converted'), activities: total('activities'), quotesSent: total('quotesSent'), dealsWon: won, dealsLost: lost, wonValue: total('wonValue'), collected: total('collected'), pipelineValue: total('pipelineValue'), winRate: won + lost ? Math.round((won / (won + lost)) * 100) : null, commission: perf.commission.pct ? total('commission') : null }
    });
  });

  route('get', '/targets', 'Could not load targets', async (req, res) => {
    const month = /^\d{4}-\d{2}$/.test(String(req.query.month || '')) ? req.query.month : monthOf(new Date());
    const mr = monthRange(month);
    const perf = await performance({ from: mr.from, to: mr.to });
    const targets = await q('SELECT * FROM sales_targets WHERE month = ?', [month]);
    const tBy = new Map(targets.map(x => [Number(x.user_id), x]));
    const uid = Number(req.user.id);
    const rows = perf.rows.filter(x => isMgr(req) || x.userId === uid).map(x => {
      const tg = tBy.get(x.userId);
      return {
        userId: x.userId, name: x.name, title: x.title,
        target: tg ? { wonValue: Number(tg.won_value) || 0, collection: Number(tg.collection) || 0, dealsWon: Number(tg.deals_won) || 0, enquiries: Number(tg.enquiries) || 0, activities: Number(tg.activities) || 0, updatedBy: tg.updated_by } : null,
        achieved: { wonValue: x.wonValue, collection: x.collected, dealsWon: x.dealsWon, enquiries: x.enquiries, activities: x.activities }
      };
    });
    const elapsed = month === monthOf(new Date()) ? new Date().getDate() / Number(mr.to.slice(8)) : month < monthOf(new Date()) ? 1 : 0;
    res.json({ month, canEdit: isMgr(req), elapsed: round2(elapsed), rows });
  });

  route('put', '/targets', 'Could not save targets', async (req, res) => {
    if (!isMgr(req)) return res.status(403).json({ error: 'Only managers set targets.' });
    const month = String(req.body?.month || '');
    if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ error: 'Choose the month.' });
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    for (const x of rows) {
      const uidx = Number(x.userId); if (!uidx) continue;
      const v = (k) => Math.max(0, Number(x[k]) || 0);
      if (!v('wonValue') && !v('collection') && !v('dealsWon') && !v('enquiries') && !v('activities')) { await pool.query('DELETE FROM sales_targets WHERE user_id = ? AND month = ?', [uidx, month]); continue; }
      await pool.query(`INSERT INTO sales_targets (user_id, month, won_value, collection, deals_won, enquiries, activities, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE won_value = VALUES(won_value), collection = VALUES(collection), deals_won = VALUES(deals_won), enquiries = VALUES(enquiries), activities = VALUES(activities), updated_by = VALUES(updated_by)`,
      [uidx, month, round2(v('wonValue')), round2(v('collection')), Math.round(v('dealsWon')), Math.round(v('enquiries')), Math.round(v('activities')), req.user.name]);
    }
    const changed = rows.map(x => Number(x.userId)).filter(id => id && id !== Number(req.user.id));
    if (changed.length) notify(changed, `Sales target set for ${month}`, `${req.user.name} set your targets for ${month}. See them on your Sales home.`, null);
    res.json({ ok: true });
  });

  // ── Reports ───────────────────────────────────────────────────────────
  route('get', '/reports', 'Could not build the report', async (req, res) => {
    const r = rangeOf(req);
    const owner = isMgr(req) ? (Number(req.query.owner) || null) : Number(req.user.id);
    const names = await usersById();
    let leads = await q('SELECT id, lead_name, lead_source, lead_status, owner_id, created_at, status_changed_at, converted_deal_id, lost_reason, hold_until, hold_reason FROM leads');
    let deals = await q('SELECT d.id, d.deal_name, d.assignee_id, d.deal_value, d.won_value, d.status, d.deal_stage, d.pipeline_stage_id, d.on_hold, d.hold_until, d.hold_reason, d.lost_reason, d.closed_at, d.created_at, d.updated_at, d.lead_id, d.source, c.company_name FROM deals d LEFT JOIN companies c ON c.id = d.company_id');
    let quotes = await q('SELECT e.id, e.status, e.total, e.max_discount_pct, e.created_at, e.sent_at, e.responded_at, e.estimate_by, d.assignee_id FROM estimations e LEFT JOIN deals d ON d.id = e.deal_id WHERE e.quote_base IS NOT NULL AND e.proposal_id IS NULL');
    quotes = quotes.concat((await decksOf()).map(x => ({ id: `deck-${x.id}`, status: x.status, total: x.total, max_discount_pct: 0, created_at: x.createdAt, sent_at: x.sentAt, responded_at: x.respondedAt, estimate_by: x.ownerId, assignee_id: x.ownerId })));
    let invs = await invoiceRows("i.status <> 'Draft'");
    let pays = await q('SELECT p.amount, p.paid_on, p.mode, i.created_by, d.assignee_id FROM sales_payments p LEFT JOIN invoices i ON i.id = p.invoice_id LEFT JOIN deals d ON d.id = COALESCE(p.deal_id, i.deal_id)');
    if (owner) {
      leads = leads.filter(l => Number(l.owner_id) === owner); deals = deals.filter(d => Number(d.assignee_id) === owner);
      quotes = quotes.filter(x => Number(x.assignee_id || x.estimate_by) === owner); invs = invs.filter(x => ownsInvoice(x, owner));
      pays = pays.filter(p => Number(p.assignee_id) === owner || (!p.assignee_id && Number(p.created_by) === owner));
    }
    const dealById = new Map(deals.map(d => [d.id, d]));
    const cohort = leads.filter(l => inRange(l.created_at, r));
    const reached = (l) => !['New', 'Not Contacted'].includes(l.lead_status);
    const funnel = [
      { step: 'Enquiries received', count: cohort.length },
      { step: 'Contacted', count: cohort.filter(reached).length },
      { step: 'Qualified', count: cohort.filter(l => ['Qualified', 'Converted to Deal'].includes(l.lead_status) || l.converted_deal_id).length },
      { step: 'Became deals', count: cohort.filter(l => l.converted_deal_id).length },
      { step: 'Won', count: cohort.filter(l => l.converted_deal_id && dealById.get(l.converted_deal_id) && isWon(dealById.get(l.converted_deal_id))).length }
    ];
    const sources = {};
    cohort.forEach(l => {
      const k = l.lead_source || 'Not recorded';
      sources[k] = sources[k] || { source: k, enquiries: 0, deals: 0, won: 0, wonValue: 0, lost: 0 };
      sources[k].enquiries += 1;
      const d = l.converted_deal_id ? dealById.get(l.converted_deal_id) : null;
      if (d) { sources[k].deals += 1; if (isWon(d)) { sources[k].won += 1; sources[k].wonValue = round2(sources[k].wonValue + wonAmount(d)); } }
      if (['Lost', 'Unqualified'].includes(l.lead_status) || (d && isLost(d))) sources[k].lost += 1;
    });
    const reasons = {};
    const addReason = (why, kind) => { const k = String(why || 'No reason given').trim(); reasons[k] = reasons[k] || { reason: k, enquiries: 0, deals: 0 }; reasons[k][kind] += 1; };
    leads.filter(l => ['Lost', 'Unqualified'].includes(l.lead_status) && inRange(l.status_changed_at, r)).forEach(l => addReason(l.lost_reason, 'enquiries'));
    deals.filter(d => isLost(d) && inRange(d.closed_at, r)).forEach(d => addReason(d.lost_reason, 'deals'));
    const qIn = quotes.filter(x => inRange(x.created_at, r));
    const answered = qIn.filter(x => ['Accepted', 'Declined'].includes(x.status));
    const respDays = qIn.filter(x => x.sent_at && x.responded_at).map(x => (new Date(x.responded_at) - new Date(x.sent_at)) / 86400000);
    const months = [];
    const start = new Date(`${r.from}T12:00:00`); const end = new Date(`${r.to}T12:00:00`);
    for (let d = new Date(start.getFullYear(), start.getMonth(), 1); d <= end && months.length < 24; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) months.push(monthOf(d));
    const stageList = await stages();
    const now = new Date();
    const openDeals = deals.filter(d => !isWon(d) && !isLost(d) && !d.on_hold);
    const issuedOpen = invs.filter(x => ['Sent', 'Partially Paid', 'Overdue'].includes(invoiceStatus(x)));
    const bucket = (lo, hi) => sum(issuedOpen.filter(x => { const dl = invoiceStatus(x) === 'Overdue' ? daysLate(x) : 0; return dl >= lo && dl <= hi; }), x => Number(x.total) - Number(x.amount_paid));
    res.json({
      range: r, owner, isManager: isMgr(req),
      people: isMgr(req) ? (await salesPeople()).map(p => ({ id: p.id, name: p.name })) : [],
      summary: {
        enquiries: cohort.length, dealsWon: deals.filter(d => isWon(d) && inRange(d.closed_at, r)).length, wonValue: sum(deals.filter(d => isWon(d) && inRange(d.closed_at, r)), wonAmount),
        dealsLost: deals.filter(d => isLost(d) && inRange(d.closed_at, r)).length, invoiced: sum(invs.filter(x => inRange(x.invoice_date || x.created_at, r)), x => x.total),
        collected: sum(pays.filter(p => inRange(p.paid_on, r)), p => p.amount), outstanding: sum(issuedOpen, x => Number(x.total) - Number(x.amount_paid))
      },
      funnel, sources: Object.values(sources).sort((a, b) => b.enquiries - a.enquiries), lostReasons: Object.values(reasons).sort((a, b) => (b.enquiries + b.deals) - (a.enquiries + a.deals)),
      quotations: {
        created: qIn.length, sent: qIn.filter(x => x.sent_at).length, accepted: qIn.filter(x => x.status === 'Accepted').length, declined: qIn.filter(x => x.status === 'Declined').length,
        open: qIn.filter(x => ['Draft', 'Pending Approval', 'Approved', 'Sent'].includes(x.status)).length,
        acceptanceRate: answered.length ? Math.round((answered.filter(x => x.status === 'Accepted').length / answered.length) * 100) : null,
        quotedValue: sum(qIn, x => x.total), acceptedValue: sum(qIn.filter(x => x.status === 'Accepted'), x => x.total),
        avgDiscount: qIn.length ? round2(qIn.reduce((s, x) => s + (Number(x.max_discount_pct) || 0), 0) / qIn.length) : 0,
        avgResponseDays: respDays.length ? Math.round(respDays.reduce((s, x) => s + x, 0) / respDays.length) : null
      },
      months: months.map(ym => { const mr = monthRange(ym); return { month: ym, enquiries: leads.filter(l => inRange(l.created_at, mr)).length, won: sum(deals.filter(d => isWon(d) && inRange(d.closed_at, mr)), wonAmount), collected: sum(pays.filter(p => inRange(p.paid_on, mr)), p => p.amount) }; }),
      stages: stageList.filter(s => !/^(won|lost)$/i.test(s.name)).map(s => {
        const list = openDeals.filter(d => (d.pipeline_stage_id ? Number(d.pipeline_stage_id) === Number(s.id) : d.deal_stage === s.name));
        const ages = list.map(d => (now - new Date(d.updated_at)) / 86400000);
        return { stage: s.name, count: list.length, value: sum(list, d => d.deal_value), idleDays: ages.length ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : null };
      }),
      holds: [
        ...leads.filter(l => l.lead_status === 'On Hold').map(l => ({ kind: 'Enquiry', id: l.id, name: l.lead_name, until: l.hold_until, reason: l.hold_reason, owner: names.get(Number(l.owner_id)) || '' })),
        ...deals.filter(d => d.on_hold && !isWon(d) && !isLost(d)).map(d => ({ kind: 'Deal', id: d.id, name: d.deal_name, until: d.hold_until, reason: d.hold_reason, owner: names.get(Number(d.assignee_id)) || '' }))
      ].sort((a, b) => String(a.until || '').localeCompare(String(b.until || ''))),
      aging: [
        { bucket: 'Not yet due', amount: sum(issuedOpen.filter(x => invoiceStatus(x) !== 'Overdue'), x => Number(x.total) - Number(x.amount_paid)) },
        { bucket: '1–30 days late', amount: bucket(1, 30) }, { bucket: '31–60 days late', amount: bucket(31, 60) },
        { bucket: '61–90 days late', amount: bucket(61, 90) }, { bucket: 'Over 90 days late', amount: bucket(91, 100000) }
      ],
      payModes: PAY_MODES.map(m => ({ mode: m, amount: sum(pays.filter(p => inRange(p.paid_on, r) && p.mode === m), p => p.amount) })).filter(x => x.amount)
    });
  });

  // ── Lead distribution ─────────────────────────────────────────────────
  route('get', '/distribution', 'Could not load lead distribution', async (req, res) => {
    const names = await usersById();
    const people = await salesPeople();
    const leads = await q("SELECT id, lead_name, company, phone, email, lead_source, lead_status, owner_id, value, created_at FROM leads WHERE lead_status IN ('New', 'Not Contacted', 'Contacted', 'Qualified', 'On Hold') ORDER BY created_at DESC");
    const deals = await q("SELECT assignee_id, status, deal_stage, on_hold, deal_value FROM deals");
    const fus = await q('SELECT assigned_to, scheduled_date FROM followups WHERE status IN (?) AND (lead_id IS NOT NULL OR deal_id IS NOT NULL)', [OPEN_FU]);
    const t = today();
    const wonMonth = monthRange(monthOf(new Date()));
    const dealRows = await q('SELECT assignee_id, closed_at, status, deal_stage FROM deals WHERE closed_at >= ?', [wonMonth.from]);
    res.json({
      canAssign: isMgr(req),
      leads: leads.map(l => ({ id: l.id, name: l.lead_name, company: l.company, phone: l.phone, email: l.email, source: l.lead_source, status: l.lead_status === 'Not Contacted' ? 'New' : l.lead_status, ownerId: l.owner_id, owner: names.get(Number(l.owner_id)) || '', value: Number(l.value) || 0, createdAt: l.created_at })),
      people: people.map(p => ({
        id: p.id, name: p.name, title: p.title,
        openLeads: leads.filter(l => Number(l.owner_id) === p.id).length,
        newLeads: leads.filter(l => Number(l.owner_id) === p.id && ['New', 'Not Contacted'].includes(l.lead_status)).length,
        openDeals: deals.filter(d => Number(d.assignee_id) === p.id && !isWon(d) && !isLost(d) && !d.on_hold).length,
        overdue: fus.filter(f => Number(f.assigned_to) === p.id && ymd(f.scheduled_date) < t).length,
        wonMonth: dealRows.filter(d => Number(d.assignee_id) === p.id && isWon(d)).length
      }))
    });
  });

  // Assign to one person, or share evenly (fewest open enquiries first) across several.
  route('post', '/distribution/assign', 'Could not assign', async (req, res) => {
    if (!isMgr(req)) return res.status(403).json({ error: 'Only managers distribute enquiries.' });
    const leadIds = (Array.isArray(req.body?.leadIds) ? req.body.leadIds : []).map(Number).filter(Boolean);
    const ownerIds = (Array.isArray(req.body?.ownerIds) ? req.body.ownerIds : [req.body?.ownerId]).map(Number).filter(Boolean);
    if (!leadIds.length) return res.status(400).json({ error: 'Select the enquiries to assign.' });
    if (!ownerIds.length) return res.status(400).json({ error: 'Choose who gets them.' });
    const names = await usersById();
    const load = new Map(ownerIds.map(id => [id, 0]));
    (await q("SELECT owner_id, COUNT(*) n FROM leads WHERE owner_id IN (?) AND lead_status IN ('New', 'Not Contacted', 'Contacted', 'Qualified') GROUP BY owner_id", [ownerIds])).forEach(r => load.set(Number(r.owner_id), Number(r.n)));
    const leads = await q('SELECT id, lead_name, owner_id FROM leads WHERE id IN (?)', [leadIds]);
    const given = new Map();
    for (const l of leads) {
      const to = [...load.entries()].sort((a, b) => a[1] - b[1])[0][0];
      load.set(to, load.get(to) + 1);
      if (Number(l.owner_id) === to) continue;
      await pool.query('UPDATE leads SET owner_id = ?, updated_at = NOW() WHERE id = ?', [to, l.id]);
      await pool.query("UPDATE followups SET assigned_to = ?, assigned_to_name = ? WHERE lead_id = ? AND status IN (?)", [to, names.get(to) || null, l.id, OPEN_FU]);
      await event(req, { leadId: l.id, kind: 'assigned', title: `Assigned to ${names.get(to) || 'someone'}` });
      given.set(to, [...(given.get(to) || []), l.lead_name]);
    }
    for (const [to, list] of given.entries()) {
      if (to !== Number(req.user.id)) notify([to], `${list.length} enquir${list.length === 1 ? 'y' : 'ies'} assigned to you`, `${req.user.name}: ${list.slice(0, 3).join(', ')}${list.length > 3 ? ` and ${list.length - 3} more` : ''}.`, null);
    }
    res.json({ ok: true, assigned: [...given.entries()].map(([id, list]) => ({ id, name: names.get(id), count: list.length })) });
  });
};

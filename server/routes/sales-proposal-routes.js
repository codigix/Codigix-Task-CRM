const nodemailer = require('nodemailer');
const mailError = require('../services/mailError');
const { buildDeck } = require('../services/proposalDeck');
const { newContent } = require('../services/proposalTemplates');

/**
 * Proposal decks (slide-style PDFs) for a deal: cover, about, summary, modules / services, priced
 * options, budget and timeline, technology, support, AMC and notes, all edited per client.
 *
 *   Draft -> Sent -> Accepted (one option chosen) / Declined
 *   Accepted -> "Create quotation" from the chosen option (GST quotation, milestones, billing).
 *
 *   GET  /api/sales-proposals               list
 *   POST /api/sales-proposals               new (from a deal / customer / enquiry)
 *   GET / PUT / DELETE /api/sales-proposals/:id
 *   GET  /api/sales-proposals/:id/pdf       the deck
 *   POST /api/sales-proposals/:id/send | mark-sent | respond | link
 */

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const num = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
const str = (v, n) => String(v ?? '').trim().slice(0, n);
const list = (v, n = 60, len = 500) => (Array.isArray(v) ? v : String(v || '').split('\n')).map(x => str(x, len)).filter(Boolean).slice(0, n);
const parseJson = (v, fb) => { if (v == null) return fb; if (typeof v !== 'string') return v; try { return JSON.parse(v); } catch (e) { return fb; } };
const SECTIONS = ['about', 'summary', 'overview', 'options', 'budget', 'tech', 'support', 'amc', 'notes'];

/** Whatever the editor sends, keep only what the deck understands, within sane sizes. */
const cleanContent = (c = {}) => ({
  sections: Object.fromEntries(SECTIONS.map(k => [k, c.sections?.[k] !== false])),
  cover: { title: str(c.cover?.title, 120), subtitle: str(c.cover?.subtitle, 200), date: str(c.cover?.date, 30), preparedFor: str(c.cover?.preparedFor, 160) },
  about: { text: str(c.about?.text, 3000), stats: Array.isArray(c.about?.stats) ? c.about.stats.map(s => ({ value: str(s.value, 20), label: str(s.label, 80) })).filter(s => s.value).slice(0, 4) : null },
  summary: { text: str(c.summary?.text, 3000), points: list(c.summary?.points, 20, 200), closing: str(c.summary?.closing, 1500) },
  overview: { title: str(c.overview?.title, 120), intro: str(c.overview?.intro, 600), items: list(c.overview?.items, 60, 160) },
  options: (Array.isArray(c.options) ? c.options : []).slice(0, 6).map((o, i) => ({
    key: str(o.key || String.fromCharCode(65 + i), 4), name: str(o.name, 160), intro: str(o.intro, 700),
    groups: (Array.isArray(o.groups) ? o.groups : []).slice(0, 40).map(g => ({ title: str(g.title, 160), items: list(g.items, 80, 300) })).filter(g => g.title || g.items.length),
    lines: (Array.isArray(o.lines) ? o.lines : []).slice(0, 40).map(l => ({ name: str(l.name, 160), unit: str(l.unit, 24), qty: Math.max(0, num(l.qty)), rate: Math.max(0, num(l.rate)), discountPct: Math.min(100, Math.max(0, num(l.discountPct))) })).filter(l => l.name),
    priceMode: o.priceMode === 'lines' ? 'lines' : 'fixed', price: Math.max(0, num(o.price)), gstPct: Math.min(40, Math.max(0, num(o.gstPct, 18))),
    billing: o.billing === 'monthly' ? 'monthly' : 'one-time', months: Math.min(60, Math.max(0, parseInt(o.months, 10) || 0)), startMonth: /^\d{4}-\d{2}$/.test(o.startMonth || '') ? o.startMonth : '',
    deadline: str(o.deadline, 80), showScope: o.showScope !== false
  })),
  payment: { milestones: (Array.isArray(c.payment?.milestones) ? c.payment.milestones : []).map(m => ({ name: str(m.name, 200), pct: Math.min(100, Math.max(0, num(m.pct))) })).filter(m => m.name && m.pct > 0).slice(0, 12), notes: list(c.payment?.notes, 12, 300) },
  tech: { title: str(c.tech?.title, 120), blocks: (Array.isArray(c.tech?.blocks) ? c.tech.blocks : []).slice(0, 4).map(b => ({ title: str(b.title, 120), items: list(b.items, 20, 200) })).filter(b => b.title || b.items.length) },
  support: { title: str(c.support?.title, 120), intro: str(c.support?.intro, 600), items: list(c.support?.items, 20, 300), footer: str(c.support?.footer, 600) },
  amc: { headline: str(c.amc?.headline, 400), includes: list(c.amc?.includes, 30, 300), excludes: list(c.amc?.excludes, 30, 300), footer: str(c.amc?.footer, 400) },
  notes: list(c.notes, 20, 700)
});

const MK_SECTIONS = ['about', 'agenda', 'services', 'roles', 'plan', 'wrapup'];
const cleanMarketing = (c = {}) => ({
  kind: 'marketing',
  sections: Object.fromEntries(MK_SECTIONS.map(k => [k, c.sections?.[k] !== false])),
  cover: { title: str(c.cover?.title, 200), subtitle: str(c.cover?.subtitle, 200), date: str(c.cover?.date, 30), preparedFor: str(c.cover?.preparedFor, 160) },
  about: { heading: str(c.about?.heading, 120), text: str(c.about?.text, 3000), clients: Array.isArray(c.about?.clients) ? list(c.about.clients, 12, 100) : null },
  agenda: { title: str(c.agenda?.title, 80), text: str(c.agenda?.text, 4000) },
  blocks: (Array.isArray(c.blocks) ? c.blocks : []).slice(0, 10).map(b => ({
    type: b.type === 'paid' ? 'paid' : 'service', title: str(b.title, 160), note: str(b.note, 500),
    variants: (Array.isArray(b.variants) ? b.variants : []).slice(0, 4).map(v => ({
      label: str(v.label, 80), price: Math.max(0, num(v.price)), priceLabel: str(v.priceLabel, 40), priceMode: v.priceMode === 'lines' ? 'lines' : 'fixed', note: str(v.note, 500),
      rows: (Array.isArray(v.rows) ? v.rows : []).slice(0, 14).map(r => ({ description: str(r.description, 160), activities: str(r.activities, 160), platform: str(r.platform, 160), qty: Math.max(0, num(r.qty)), rate: Math.max(0, num(r.rate)) })).filter(r => r.description)
    })),
    groups: (Array.isArray(b.groups) ? b.groups : []).slice(0, 30).map(g => ({ title: str(g.title, 200), text: str(g.text, 1500), items: list(g.items, 60, 300) })).filter(g => g.title || g.text || g.items.length),
    platforms: list(b.platforms, 8, 80), fee: str(b.fee, 200)
  })),
  roles: { agencyTitle: str(c.roles?.agencyTitle, 120), clientTitle: str(c.roles?.clientTitle, 120), agency: list(c.roles?.agency, 30, 500), client: list(c.roles?.client, 30, 500) },
  plan: { title: str(c.plan?.title, 80), commitmentsTitle: str(c.plan?.commitmentsTitle, 80), rows: (Array.isArray(c.plan?.rows) ? c.plan.rows : []).slice(0, 12).map(r => ({ month: str(r.month, 40), focus: str(r.focus, 120), deliverables: str(r.deliverables, 1500) })).filter(r => r.month || r.focus || r.deliverables), commitments: list(c.plan?.commitments, 20, 300) },
  wrapup: { title: str(c.wrapup?.title, 80), points: list(c.wrapup?.points, 24, 300) },
  gstPct: Math.min(40, Math.max(0, num(c.gstPct, 18))),
  contact: { name: str(c.contact?.name, 120), phones: str(c.contact?.phones, 120), email: str(c.contact?.email, 120), website: str(c.contact?.website, 120), address: str(c.contact?.address, 240) },
  chosen: Array.isArray(c.chosen) ? c.chosen.map(x => str(x, 20)).slice(0, 20) : []
});
const cleanFor = (kind, c) => (kind === 'marketing' ? cleanMarketing(c) : cleanContent(c));
/** Monthly price of one variant (rows with quantity x rate when priced from lines, otherwise the typed price). */
const variantBase = (v) => (v.priceMode === 'lines' && (v.rows || []).some(r => r.qty && r.rate) ? round2(v.rows.reduce((t, r) => t + r.qty * r.rate, 0)) : round2(v.price));
const fmtInt = (n) => (Math.round((Number(n) || 0) * 100) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 });
/** Every priced variant of a marketing proposal, plus the package total (the first variant of each service block). */
const marketingOptions = (c) => {
  const gstPct = c.gstPct ?? 18; const out = [];
  (c.blocks || []).forEach((b, bi) => { if (b.type !== 'service') return; (b.variants || []).forEach((v, vi) => {
    const base = variantBase(v); const gst = round2((base * gstPct) / 100);
    out.push({ key: `b${bi}v${vi}`, name: `${b.title}${v.label ? ` (${v.label})` : ''}`, base, gstPct, gst, total: round2(base + gst), monthly: true, months: 0, blockIndex: bi, first: vi === 0 });
  }); });
  const pack = out.filter(o => o.first).reduce((t, o) => t + o.total, 0);
  return { options: out, packageTotal: round2(pack) };
};

/** Price of an option: from its lines (quantity x rate, with volume rates picked in the editor) or a fixed price. */
const priceOption = (o) => {
  const lines = (o.lines || []).map(l => ({ ...l, amount: round2(l.qty * l.rate * (1 - (l.discountPct || 0) / 100)) }));
  const base = o.priceMode === 'lines' && lines.length ? round2(lines.reduce((s, l) => s + l.amount, 0)) : round2(o.price);
  const gst = round2((base * o.gstPct) / 100);
  return { ...o, lines, totals: { base, gstPct: o.gstPct, gst, total: round2(base + gst), monthly: o.billing === 'monthly', months: o.months || 0 } };
};

module.exports = function setupSalesProposalRoutes(app, pool) {
  const q = async (sql, params = []) => (await pool.query(sql, params))[0];
  const flow = app.locals.salesFlow;
  const { ready, getSettings, event, notify, usersById, isMgr, needUser, fail, ymd, fill, monthName } = flow;

  const schema = (async () => {
    await ready;
    await pool.query(`CREATE TABLE IF NOT EXISTS sales_proposals (
      id INT AUTO_INCREMENT PRIMARY KEY, proposal_number VARCHAR(40) NOT NULL, kind VARCHAR(20) NOT NULL DEFAULT 'it', title VARCHAR(255) NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'Draft', deal_id INT NULL, company_id INT NULL, lead_id INT NULL, content JSON NULL,
      chosen_option VARCHAR(10) NULL, quotation_id INT NULL, sent_at DATETIME NULL, sent_to VARCHAR(500) NULL, responded_at DATETIME NULL, decline_reason VARCHAR(500) NULL,
      created_by INT NULL, created_by_name VARCHAR(120) NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_sprop_number (proposal_number), KEY idx_sprop_deal (deal_id), KEY idx_sprop_company (company_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  })().catch(e => console.error('sales proposals schema:', e.message));
  const route = (method, path, msg, fn) => app[method](`/api/sales-proposals${path}`, async (req, res) => {
    try { if (!needUser(req, res)) return; await schema; await fn(req, res); } catch (e) { fail(res, e, msg); }
  });

  const clientOf = async (p) => {
    const [c] = p.company_id ? await q('SELECT company_name, email FROM companies WHERE id = ?', [p.company_id]) : [];
    const [l] = p.lead_id ? await q('SELECT lead_name, company, email FROM leads WHERE id = ?', [p.lead_id]) : [];
    return { name: c?.company_name || l?.company || l?.lead_name || '', email: c?.email || l?.email || '' };
  };
  const shape = async (p) => {
    const content = parseJson(p.content, {});
    const mk = p.kind === 'marketing' ? marketingOptions(content) : null;
    const priced = mk ? [] : (content.options || []).map(priceOption);
    const totals = mk ? mk.options.map(o => o.total).filter(x => x > 0) : priced.map(o => o.totals.total).filter(x => x > 0);
    const client = await clientOf(p);
    let total = 0;
    if (mk) { const ch = content.chosen || []; total = ch.length ? round2(mk.options.filter(o => ch.includes(o.key)).reduce((t, o) => t + o.total, 0)) : mk.packageTotal; }
    else { const co = priced.find(o => o.key === p.chosen_option); total = co ? co.totals.total : (totals.length ? Math.max(...totals) : 0); }
    return {
      total, ownerId: p.assignee_id || p.created_by || null, createdById: p.created_by || null, dealName: p.deal_name || '',
      id: p.id, number: p.proposal_number, kind: p.kind, title: p.title, status: p.status, dealId: p.deal_id, companyId: p.company_id, leadId: p.lead_id,
      client: client.name, clientEmail: client.email, chosenOption: p.chosen_option, quotationId: p.quotation_id, sentAt: p.sent_at, sentTo: p.sent_to, respondedAt: p.responded_at, declineReason: p.decline_reason,
      createdBy: p.created_by_name, createdAt: p.created_at, updatedAt: p.updated_at, content,
      options: mk ? mk.options : priced.map(o => ({ key: o.key, name: o.name, ...o.totals })), minTotal: totals.length ? Math.min(...totals) : 0, maxTotal: mk ? mk.packageTotal : (totals.length ? Math.max(...totals) : 0)
    };
  };
  // Decks and plain quotations share one number series (QT-2026-0007 ...).
  const nextNumber = async () => {
    const year = new Date().getFullYear();
    const prefix = (await getSettings()).quotation?.prefix || 'QT';
    const like = `${prefix}-${year}-%`;
    const rows = [...await q('SELECT proposal_number AS n FROM sales_proposals WHERE proposal_number LIKE ?', [like]), ...await q('SELECT quote_base AS n FROM estimations WHERE quote_base LIKE ?', [like])];
    const n = rows.reduce((m, r) => Math.max(m, parseInt(String(r.n).split('-').pop(), 10) || 0), 0) + 1;
    return `${prefix}-${year}-${String(n).padStart(4, '0')}`;
  };
  const load = async (id) => { const [p] = await q('SELECT * FROM sales_proposals WHERE id = ?', [id]); return p || null; };

  /** What the deck renderer needs: content + company details + priced options + the service catalogue. */
  const deckDoc = async (p, settings) => {
    const c = parseJson(p.content, {});
    const ps = settings.proposal || {};
    if (p.kind === 'marketing') {
      const ct = { ...(ps.contactMarketing || {}), ...Object.fromEntries(Object.entries(c.contact || {}).filter(([, v]) => v)) };
      const opts = marketingOptions(c).options;
      return {
        kind: 'marketing', sections: c.sections, preparedBy: settings.company?.name || 'Codigix Infotech Pvt. Ltd.',
        cover: { ...c.cover, preparedFor: c.cover?.preparedFor || (await clientOf(p)).name },
        company: { name: ct.name || settings.company?.name, website: ct.website, phones: ct.phones, email: ct.email, address: ct.address },
        about: { heading: c.about?.heading || 'Codigix Infotech Pvt Ltd', text: c.about?.text || ps.about?.textMarketing || '', clients: c.about?.clients?.length ? c.about.clients : (ps.about?.clients || []) },
        agenda: c.agenda,
        glance: opts.filter(o => o.first && o.base > 0).map(o => ({ label: o.name, sub: `Rs. ${fmtInt(o.base)}/- per month` })),
        blocks: (c.blocks || []).map(b => ({ ...b, variants: (b.variants || []).map(v => { const base = variantBase(v); return { ...v, rows: v.rows, priceText: base > 0 ? `${fmtInt(base)}/- ${v.priceLabel || ''}`.trim() : '' }; }) })),
        roles: c.roles, plan: c.plan, wrapup: c.wrapup
      };
    }
    const about = { text: c.about?.text || (p.kind === 'marketing' ? ps.about?.textMarketing : ps.about?.text) || '', stats: c.about?.stats || ps.about?.stats || [], services: ps.about?.services || [] };
    return {
      number: p.proposal_number, kind: p.kind, sections: c.sections, preparedBy: settings.company?.name || 'Codigix Infotech Pvt. Ltd',
      cover: { ...c.cover, preparedFor: c.cover?.preparedFor || (await clientOf(p)).name },
      company: { name: settings.company?.name, website: ps.contact?.website || settings.company?.website, phones: ps.contact?.phones || settings.company?.phone, email: ps.contact?.email || settings.company?.email, address: ps.contact?.address || settings.company?.address },
      about, summary: c.summary, overview: c.overview,
      options: (c.options || []).map(priceOption).map(o => ({ ...o, startMonth: o.startMonth ? monthName(o.startMonth) : '' })),
      payment: c.payment, tech: c.tech, support: c.support, amc: c.amc, notes: c.notes, services: settings.services || []
    };
  };

  // For the quotation register, deal page, home and reports: every deck without its content.
  app.locals.salesProposals = {
    rows: async () => {
      await schema;
      const rows = await q('SELECT p.*, d.assignee_id, d.deal_name FROM sales_proposals p LEFT JOIN deals d ON d.id = p.deal_id ORDER BY p.updated_at DESC');
      return Promise.all(rows.map(async r => { const { content, ...rest } = await shape(r); return rest; }));
    }
  };

  // ── list ──────────────────────────────────────────────────────────────
  route('get', '', 'Could not load proposals', async (req, res) => {
    const uid = Number(req.user.id);
    let rows = await q(`SELECT p.*, d.assignee_id, d.deal_name FROM sales_proposals p LEFT JOIN deals d ON d.id = p.deal_id ORDER BY p.updated_at DESC`);
    if (req.query.scope === 'mine') rows = rows.filter(r => Number(r.created_by) === uid || Number(r.assignee_id) === uid);
    const shaped = await Promise.all(rows.map(shape));
    const counts = ['Draft', 'Sent', 'Accepted', 'Declined'].reduce((o, s) => ({ ...o, [s]: shaped.filter(x => x.status === s).length }), {});
    let out = shaped.map(({ content, ...rest }) => rest);
    if (req.query.status) out = out.filter(x => x.status === req.query.status);
    const term = String(req.query.q || '').trim().toLowerCase();
    if (term) out = out.filter(x => [x.number, x.title, x.client].some(v => String(v || '').toLowerCase().includes(term)));
    res.json({ proposals: out, counts });
  });

  // ── create ────────────────────────────────────────────────────────────
  route('post', '', 'Could not create the proposal', async (req, res) => {
    const b = req.body || {};
    const kind = b.kind === 'marketing' ? 'marketing' : 'it';
    let dealId = Number(b.dealId) || null; let companyId = Number(b.companyId) || null; const leadId = Number(b.leadId) || null;
    let name = '';
    if (dealId) {
      const [d] = await q('SELECT d.id, d.deal_name, d.company_id, c.company_name FROM deals d LEFT JOIN companies c ON c.id = d.company_id WHERE d.id = ?', [dealId]);
      if (!d) return res.status(404).json({ error: 'Deal not found' });
      companyId = companyId || d.company_id; name = d.company_name || d.deal_name;
    } else if (companyId) {
      const [c] = await q('SELECT company_name FROM companies WHERE id = ?', [companyId]);
      if (!c) return res.status(404).json({ error: 'Customer not found' });
      name = c.company_name;
    } else if (leadId) {
      const [l] = await q('SELECT lead_name, company FROM leads WHERE id = ?', [leadId]);
      if (!l) return res.status(404).json({ error: 'Enquiry not found' });
      name = l.company || l.lead_name;
    } else return res.status(400).json({ error: 'Choose the deal or customer this proposal is for.' });
    const content = newContent(kind, { date: ymd(new Date()), preparedFor: name.trim() });
    const number = await nextNumber();
    const title = str(b.title, 200) || `${kind === 'marketing' ? 'Digital marketing proposal' : 'Project proposal'} for ${name.trim()}`;
    const [r] = await pool.query('INSERT INTO sales_proposals (proposal_number, kind, title, status, deal_id, company_id, lead_id, content, created_by, created_by_name) VALUES (?, ?, ?, \'Draft\', ?, ?, ?, ?, ?, ?)',
      [number, kind, title, dealId, companyId, leadId, JSON.stringify(content), req.user.id, req.user.name]);
    await event(req, { dealId, leadId, companyId, kind: 'proposal', title: `Proposal ${number} drafted`, body: title });
    res.status(201).json({ id: r.insertId, number });
  });

  route('get', '/:id', 'Could not load the proposal', async (req, res) => {
    const p = await load(req.params.id);
    if (!p) return res.status(404).json({ error: 'Proposal not found' });
    const settings = await getSettings();
    const events = (await q('SELECT * FROM sales_events WHERE kind = ? AND (deal_id <=> ? OR lead_id <=> ?) AND title LIKE ? ORDER BY happened_at DESC, id DESC', ['proposal', p.deal_id, p.lead_id, `%${p.proposal_number}%`]))
      .map(e => ({ id: e.id, title: e.title, body: e.body, by: e.by_name, at: e.happened_at }));
    const [deal] = p.deal_id ? await q('SELECT id, deal_name, deal_stage FROM deals WHERE id = ?', [p.deal_id]) : [];
    res.json({ proposal: await shape(p), proposalSettings: settings.proposal, deal: deal ? { id: deal.id, name: deal.deal_name, stage: deal.deal_stage } : null, events });
  });

  route('put', '/:id', 'Could not save the proposal', async (req, res) => {
    const p = await load(req.params.id);
    if (!p) return res.status(404).json({ error: 'Proposal not found' });
    const title = req.body?.title !== undefined ? str(req.body.title, 200) : p.title;
    const content = req.body?.content ? cleanFor(p.kind, req.body.content) : parseJson(p.content, {});
    await pool.query('UPDATE sales_proposals SET title = ?, content = ?, updated_at = NOW() WHERE id = ?', [title, JSON.stringify(content), p.id]);
    res.json({ ok: true });
  });

  route('delete', '/:id', 'Could not delete the proposal', async (req, res) => {
    const p = await load(req.params.id);
    if (!p) return res.status(404).json({ error: 'Proposal not found' });
    if (p.status !== 'Draft') return res.status(400).json({ error: 'Only a draft proposal can be deleted.' });
    await pool.query('DELETE FROM sales_proposals WHERE id = ?', [p.id]);
    await event(req, { dealId: p.deal_id, leadId: p.lead_id, companyId: p.company_id, kind: 'proposal', title: `Draft proposal ${p.proposal_number} deleted` });
    res.json({ ok: true });
  });

  // ── the deck ──────────────────────────────────────────────────────────
  route('get', '/:id/pdf', 'Could not build the PDF', async (req, res) => {
    const p = await load(req.params.id);
    if (!p) return res.status(404).json({ error: 'Proposal not found' });
    const buf = await buildDeck(await deckDoc(p, await getSettings()));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${req.query.download ? 'attachment' : 'inline'}; filename="${String(p.proposal_number).replace(/[^A-Za-z0-9._-]/g, '_')}.pdf"`);
    res.send(buf);
  });

  // ── sending and the client's answer ───────────────────────────────────
  const markSent = async (req, p, to) => {
    await pool.query("UPDATE sales_proposals SET status = IF(status = 'Draft', 'Sent', status), sent_at = NOW(), sent_to = ?, updated_at = NOW() WHERE id = ?", [str(to, 500), p.id]);
    if (p.deal_id) {
      const [ps] = await q("SELECT id, name, probability, position FROM pipeline_stages WHERE LOWER(name) LIKE 'proposal%' ORDER BY position LIMIT 1");
      const [d] = await q('SELECT pipeline_stage_id, status FROM deals WHERE id = ?', [p.deal_id]);
      const [cur] = d?.pipeline_stage_id ? await q('SELECT position FROM pipeline_stages WHERE id = ?', [d.pipeline_stage_id]) : [];
      if (ps && d && !['Won', 'Lost'].includes(d.status) && (!cur || cur.position < ps.position)) {
        await pool.query('UPDATE deals SET deal_stage = ?, pipeline_stage_id = ?, probability = ?, updated_at = NOW() WHERE id = ?', [ps.name, ps.id, ps.probability, p.deal_id]);
        await event(req, { dealId: p.deal_id, kind: 'stage', title: `Stage → ${ps.name} (proposal sent)` });
      }
    }
  };
  route('post', '/:id/mark-sent', 'Could not mark it sent', async (req, res) => {
    const p = await load(req.params.id);
    if (!p) return res.status(404).json({ error: 'Proposal not found' });
    const via = ['WhatsApp', 'In person', 'Email', 'Courier'].includes(req.body?.via) ? req.body.via : 'WhatsApp';
    await markSent(req, p, via);
    await event(req, { leadId: p.lead_id, dealId: p.deal_id, companyId: p.company_id, kind: 'communication', title: `${via === 'In person' ? 'Visit' : via} · Proposal ${p.proposal_number} shared`, meta: { channel: via === 'In person' ? 'Visit' : via, direction: 'out' } });
    res.json({ ok: true });
  });
  route('post', '/:id/send', 'Could not send the email', async (req, res) => {
    const p = await load(req.params.id);
    if (!p) return res.status(404).json({ error: 'Proposal not found' });
    const valid = (v) => String(v || '').split(/[;,]/).map(s => s.trim()).filter(s => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s));
    const to = valid(req.body?.to); const cc = valid(req.body?.cc);
    if (!to.length) return res.status(400).json({ error: 'Enter the client\'s email address.' });
    const host = process.env.EMAIL_HOST || process.env.SMTP_HOST; const user = process.env.EMAIL_USER || process.env.SMTP_USER; const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS;
    if (!host || !user || !pass) return res.status(503).json({ error: 'Email is not set up on the server. Download the PDF and send it yourself, then use "Mark as sent".' });
    const settings = await getSettings();
    const buf = await buildDeck(await deckDoc(p, settings));
    const port = Number(process.env.EMAIL_PORT || process.env.SMTP_PORT || 587);
    const client = await clientOf(p);
    const vars = { number: p.proposal_number, company: settings.company.name, client: client.name, sender: req.user.name, title: p.title };
    const subject = str(req.body?.subject, 250) || fill('Proposal {number} from {company}', vars);
    const body = str(req.body?.message, 4000) || fill('Dear {client},\n\nThank you for the opportunity. Please find our proposal "{title}" attached.\n\nPlease go through it and tell us which option suits you. We are happy to walk you through any part of it.\n\nRegards,\n{sender}\n{company}', vars);
    try {
      await nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } }).sendMail({
        from: process.env.EMAIL_FROM || user, to: to.join(', '), cc: cc.length ? cc.join(', ') : undefined, replyTo: req.user.email || undefined, subject, text: body,
        html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#111827;white-space:pre-wrap">${body.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</div>`,
        attachments: [{ filename: `${p.proposal_number}.pdf`, content: buf, contentType: 'application/pdf' }]
      });
    } catch (e) { const m = mailError(e); return res.status(m.status).json({ error: m.error }); }
    await markSent(req, p, to.join(', '));
    await event(req, { leadId: p.lead_id, dealId: p.deal_id, companyId: p.company_id, kind: 'communication', title: `Email to client · Proposal ${p.proposal_number} sent`, body: `To: ${to.join(', ')}\nSubject: ${subject}`, meta: { channel: 'Email', direction: 'out' } });
    res.json({ ok: true });
  });
  // One document: accepting the quotation (deck) sets up what billing needs. That is a hidden, already accepted
  // GST quotation (monthly months or payment milestones) behind this one; people only ever see this document.
  const billingQuotation = async (req, p, content, opts) => {
    const settings = await getSettings();
    const tax = Number(content.gstPct ?? 18) || 18;
    let items = []; let plan; let quoteType;
    const nm = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);
    const nextMonth = `${nm.getFullYear()}-${String(nm.getMonth() + 1).padStart(2, '0')}`;
    if (p.kind === 'marketing') {
      items = (content.chosen || []).map(key => {
        const m = String(key).match(/^b(\d+)v(\d+)$/); const b = m && content.blocks?.[Number(m[1])]; const v = b?.variants?.[Number(m[2])];
        if (!v) return null;
        return { name: `${b.title}${v.label ? ` (${v.label})` : ''}`, description: (v.rows || []).map(r => `${r.description}: ${r.activities}${r.platform ? ` (${r.platform})` : ''}`).join('\n'), hsn: '998361', unit: 'month', qty: 1, rate: variantBase(v), discountPct: 0, taxPct: tax };
      }).filter(Boolean);
      const paid = (content.blocks || []).find(b => b.type === 'paid');
      const sections = (content.blocks || []).filter(b => b.type === 'service').flatMap(b => (b.groups || []).map(g => ({ title: `${b.title}: ${g.title}`, items: [g.text, ...(g.items || [])].filter(Boolean).slice(0, 60) }))).filter(g => g.items.length).slice(0, 18);
      quoteType = 'retainer';
      plan = { months: Math.max(1, parseInt(opts.months, 10) || 6), startMonth: /^\d{4}-\d{2}$/.test(opts.startMonth || '') ? opts.startMonth : nextMonth, adSpendNote: paid ? [paid.fee, paid.note].filter(Boolean).join('. ') : '', sections };
    } else {
      const opt = (content.options || []).map(priceOption).find(o => o.key === opts.option);
      if (!opt) throw new Error('Choose the option the client picked.');
      const hsnOf = (name) => settings.services?.find(x => String(x.name).trim().toLowerCase() === String(name).trim().toLowerCase())?.hsn || '998314';
      items = opt.priceMode === 'lines' && opt.lines.length
        ? opt.lines.filter(l => l.qty > 0).map(l => ({ name: l.name, unit: l.unit, hsn: hsnOf(l.name), qty: l.qty, rate: l.rate, discountPct: l.discountPct || 0, taxPct: opt.gstPct }))
        : [{ name: opt.name, description: p.title, hsn: '998314', unit: '', qty: 1, rate: opt.totals.base, discountPct: 0, taxPct: opt.gstPct }];
      const sections = (opt.groups || []).filter(g => g.title && (g.items || []).length).slice(0, 18).map(g => ({ title: `Scope: ${g.title}`, items: g.items.slice(0, 60) }));
      if (opt.billing === 'monthly') { quoteType = 'retainer'; plan = { months: opt.months || Math.max(1, parseInt(opts.months, 10) || 6), startMonth: opt.startMonth || (/^\d{4}-\d{2}$/.test(opts.startMonth || '') ? opts.startMonth : nextMonth), adSpendNote: '', sections }; }
      else { quoteType = 'project'; plan = { timeline: opt.deadline || '', milestones: (content.payment?.milestones || []).filter(m => m.name && m.pct > 0), sections }; }
    }
    const cleaned = flow.cleanItems(items, settings.quotation.defaultTaxPct);
    if (!cleaned.length) throw new Error('There is nothing to bill: add a price first.');
    const [co] = p.company_id ? await q('SELECT * FROM companies WHERE id = ?', [p.company_id]) : [];
    const fallback = { name: co?.company_name || '', contact: '', email: co?.email || '', phone: co?.phone || '', address: [co?.address, co?.city].filter(Boolean).join(', '), state: co?.state || '', gstin: co?.gstin || '' };
    const data = flow.quoteInput({ subject: p.title, quoteType, plan }, settings, fallback);
    const problem = flow.planProblem(data);
    if (problem) throw new Error(problem);
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [ins] = await conn.query(`INSERT INTO estimations (estimation_number, quote_base, version, client_id, lead_id, deal_id, status, currency, estimate_by, created_by_name, amount, sent_at, responded_at, proposal_id, created_at, updated_at)
        VALUES (?, ?, 1, ?, ?, ?, 'Accepted', 'INR', ?, ?, 0, NOW(), NOW(), ?, NOW(), NOW())`, [p.proposal_number, p.proposal_number, p.company_id || null, p.lead_id || null, p.deal_id || null, p.created_by || req.user.id, p.created_by_name || req.user.name, p.id]);
      await flow.saveQuote(conn, ins.insertId, data, cleaned);
      await conn.commit();
      return ins.insertId;
    } catch (e) { await conn.rollback().catch(() => {}); throw e; } finally { conn.release(); }
  };

  route('post', '/:id/respond', 'Could not save the answer', async (req, res) => {
    const p = await load(req.params.id);
    if (!p) return res.status(404).json({ error: 'Quotation not found' });
    if (!['Sent', 'Draft'].includes(p.status)) return res.status(400).json({ error: `This quotation is already ${p.status.toLowerCase()}.` });
    const accepted = Boolean(req.body?.accepted);
    const content = parseJson(p.content, {});
    const reason = str(req.body?.reason, 500);
    if (!accepted && !reason) return res.status(400).json({ error: 'Give the reason the client declined.' });
    let option = String(req.body?.option || ''); let quotationId = null;
    if (accepted) {
      if (p.kind === 'marketing') {
        const valid = marketingOptions(content).options.map(o => o.key);
        const chosen = (Array.isArray(req.body?.variants) ? req.body.variants : []).filter(k => valid.includes(k));
        if (!chosen.length) return res.status(400).json({ error: 'Choose the services the client agreed to.' });
        content.chosen = chosen; option = 'Selected';
      } else if (!(content.options || []).some(o => o.key === option)) return res.status(400).json({ error: 'Choose the option the client picked.' });
      try { quotationId = await billingQuotation(req, p, content, { option, months: req.body?.months, startMonth: req.body?.startMonth }); } catch (e) { return res.status(400).json({ error: e.message }); }
      if (p.kind === 'marketing') await pool.query('UPDATE sales_proposals SET content = ? WHERE id = ?', [JSON.stringify(content), p.id]);
    }
    await pool.query('UPDATE sales_proposals SET status = ?, chosen_option = ?, quotation_id = ?, responded_at = NOW(), decline_reason = ?, updated_at = NOW() WHERE id = ?', [accepted ? 'Accepted' : 'Declined', accepted ? option : null, quotationId, accepted ? null : reason, p.id]);
    const name = p.kind === 'marketing' ? `${(content.chosen || []).length} service${(content.chosen || []).length === 1 ? '' : 's'}` : ((content.options || []).find(o => o.key === option)?.name || option);
    await event(req, { leadId: p.lead_id, dealId: p.deal_id, companyId: p.company_id, kind: accepted ? 'accepted' : 'declined', title: `Client ${accepted ? `accepted ${name}` : 'declined'} · Quotation ${p.proposal_number}`, body: reason || null });
    res.json({ ok: true, quotationId });
  });
  route('post', '/:id/link', 'Could not link the quotation', async (req, res) => {
    const p = await load(req.params.id);
    if (!p) return res.status(404).json({ error: 'Proposal not found' });
    await pool.query('UPDATE sales_proposals SET quotation_id = ?, chosen_option = COALESCE(?, chosen_option), updated_at = NOW() WHERE id = ?', [Number(req.body?.quotationId) || null, req.body?.option || null, p.id]);
    await event(req, { leadId: p.lead_id, dealId: p.deal_id, companyId: p.company_id, kind: 'proposal', title: `Quotation created from proposal ${p.proposal_number}` });
    res.json({ ok: true });
  });
};

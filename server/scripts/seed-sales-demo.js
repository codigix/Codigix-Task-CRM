/**
 * Demo data for the Sales department, to check the whole flow end to end.
 *
 *   node scripts/seed-sales-demo.js            add the demo data
 *   node scripts/seed-sales-demo.js --remove   remove exactly what it added
 *
 * It goes through the real API (so statuses, timeline events, quotation numbers, GST, receipts and
 * notifications are produced by the real code) and then backdates some records in the database so the
 * charts, overdue lists and receivables ageing have history. DEVELOPMENT ONLY: refuses to run unless
 * DB_NAME is deals_db on localhost, and the API must be the local server on port 5001.
 *
 * Needs the API running (npm run dev). Acts as the Sales Executive (SALES_USER_ID, default 46) and
 * the manager (MANAGER_USER_ID, default 44).
 */
const path = require('path');
const fs = require('fs');
require(path.join(__dirname, '..', 'node_modules', 'dotenv')).config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const jwt = require(path.join(__dirname, '..', 'node_modules', 'jsonwebtoken'));
const mysql = require(path.join(__dirname, '..', 'node_modules', 'mysql2', 'promise'));
const { upaseContent, karishmaContent } = require(path.join(__dirname, 'sales-demo-proposals.js'));

const e = process.env;
if (e.DB_NAME !== 'deals_db' || !/^(127\.0\.0\.1|localhost)$/.test(e.DB_HOST || '')) { console.error('Refusing to run: DB_* is not the local development database.'); process.exit(2); }
const API = 'http://localhost:5001/api';
const SALES = Number(e.SALES_USER_ID || 46); const MANAGER = Number(e.MANAGER_USER_ID || 44);
// Outside the project: nodemon restarts the API on any file change in it, which would interrupt the run.
const IDS_FILE = path.join(require('os').tmpdir(), 'codigix-sales-demo-ids.json');
const secret = e.JWT_SECRET || 'c0digix-crm-super-secure-production-jwt-token-secret-key-2026-auth-session';
const token = (id) => jwt.sign({ sub: String(id) }, secret, { expiresIn: '2h' });

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daysFrom = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d); };
const stamp = (n, h = 11, m = 0) => { const d = new Date(); d.setDate(d.getDate() + n); d.setHours(h, m, 0, 0); return `${ymd(d)} ${pad(h)}:${pad(m)}:00`; };

const call = async (user, method, p, body) => {
  const res = await fetch(`${API}${p}`, { method, headers: { Cookie: `crm_session=${token(user)}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${p} -> ${res.status} ${data.error || ''}`);
  return data;
};
const as = (user) => ({ get: (p) => call(user, 'GET', p), post: (p, b = {}) => call(user, 'POST', p, b), put: (p, b) => call(user, 'PUT', p, b) });
const rep = as(SALES); const mgr = as(MANAGER);

const connect = () => mysql.createConnection({ host: e.DB_HOST, user: e.DB_USER, password: e.DB_PASSWORD, database: e.DB_NAME });

// ── remove ────────────────────────────────────────────────────────────────
async function remove() {
  if (!fs.existsSync(IDS_FILE)) { console.log('Nothing to remove (no ids file).'); return; }
  const ids = JSON.parse(fs.readFileSync(IDS_FILE, 'utf8'));
  const c = await connect();
  const q = async (s, p) => (await c.query(s, p))[0];
  const has = (a) => Array.isArray(a) && a.length;
  if (has(ids.proposals)) await q('DELETE FROM sales_proposals WHERE id IN (?)', [ids.proposals]);
  if (has(ids.invoices)) { await q('DELETE FROM sales_payments WHERE invoice_id IN (?)', [ids.invoices]); await q('DELETE FROM invoice_items WHERE invoice_id IN (?)', [ids.invoices]); await q('DELETE FROM invoices WHERE id IN (?)', [ids.invoices]); }
  if (has(ids.quotations)) { await q('DELETE FROM estimation_line_items WHERE estimation_id IN (?)', [ids.quotations]); await q('DELETE FROM estimations WHERE id IN (?)', [ids.quotations]); }
  const evWhere = []; const evP = [];
  if (has(ids.leads)) { evWhere.push('lead_id IN (?)'); evP.push(ids.leads); }
  if (has(ids.deals)) { evWhere.push('deal_id IN (?)'); evP.push(ids.deals); }
  if (has(ids.companies)) { evWhere.push('company_id IN (?)'); evP.push(ids.companies); }
  if (evWhere.length) await q(`DELETE FROM sales_events WHERE ${evWhere.join(' OR ')}`, evP);
  if (has(ids.leads)) await q('DELETE FROM followups WHERE lead_id IN (?)', [ids.leads]);
  if (has(ids.deals)) await q('DELETE FROM followups WHERE deal_id IN (?)', [ids.deals]);
  if (has(ids.deals)) await q('DELETE FROM deals WHERE id IN (?)', [ids.deals]);
  if (has(ids.leads)) await q('DELETE FROM leads WHERE id IN (?)', [ids.leads]);
  if (has(ids.companies)) { await q('DELETE FROM contacts WHERE company_id IN (?)', [ids.companies]); await q('DELETE FROM companies WHERE id IN (?)', [ids.companies]); }
  if (ids.targetMonths?.length) await q('DELETE FROM sales_targets WHERE month IN (?) AND user_id = ?', [ids.targetMonths, SALES]);
  await q("DELETE FROM notifications WHERE type = 'sales' AND created_at >= ?", [ids.startedAt]);
  await c.end();
  fs.unlinkSync(IDS_FILE);
  console.log('Removed the sales demo data.');
}

// ── seed ──────────────────────────────────────────────────────────────────
async function seed() {
  if (fs.existsSync(IDS_FILE)) { console.error('Demo data is already there. Run with --remove first.'); process.exit(1); }
  const ids = { companies: [], leads: [], deals: [], quotations: [], invoices: [], proposals: [], targetMonths: [], startedAt: new Date().toISOString().slice(0, 19).replace('T', ' ') };
  const save = () => fs.writeFileSync(IDS_FILE, JSON.stringify(ids, null, 1));
  const db = await connect();
  const sql = async (s, p) => (await db.query(s, p))[0];
  const back = []; // backdating statements, applied at the end

  const existing = (await rep.get('/sales-desk/customers')).customers;
  const known = (name) => { const c = existing.find(x => x.name.trim().toLowerCase() === name.toLowerCase()); if (!c) throw new Error(`existing customer not found: ${name}`); return c.id; };
  const stages = (await rep.get('/sales-flow/meta')).stages.map(s => s.name);
  const stage = (re) => stages.find(s => re.test(s));

  const customer = async (body) => { const r = await rep.post('/sales-desk/customers', body); ids.companies.push(r.id); save(); return r.id; };
  const dealFor = async (companyId, body) => { const r = await rep.post(`/sales-desk/customers/${companyId}/deals`, body); ids.deals.push(r.dealId); save(); return r.dealId; };
  const item = (name, hsn, unit, qty, rate, discountPct = 0) => ({ name, hsn, unit, qty, rate, discountPct, taxPct: 18 });
  const quote = async (dealId, subject, items, extra = {}) => { const r = await rep.post(`/sales-flow/deals/${dealId}/quotations`, { subject, items, ...extra }); ids.quotations.push(r.id); save(); return r.id; };
  const sendQuote = async (qid, via = 'Email') => { const s = await rep.post(`/sales-flow/quotations/${qid}/submit`, {}); if (s.status === 'Pending Approval') await mgr.post(`/sales-flow/quotations/${qid}/approve`, { note: 'Approved for this client' }); await rep.post(`/sales-flow/quotations/${qid}/mark-sent`, { via }); };
  const invoiceFrom = async (qid) => { const r = await rep.post(`/sales-flow/quotations/${qid}/invoice`, {}); ids.invoices.push(r.id); save(); return r.id; };
  const issue = (iid, via = 'Email') => rep.post(`/sales-desk/invoices/${iid}/mark-sent`, { via });
  const pay = (iid, amount, mode, reference) => rep.post(`/sales-desk/invoices/${iid}/payments`, { amount, date: daysFrom(0), mode, reference });
  const talk = (target, channel, outcome, summary, next, direction = 'out') => rep.post('/sales-flow/communications', { ...target, channel, outcome, summary, direction, durationMin: channel === 'Call' ? 8 : undefined, next });
  const lead = async (b) => { const r = await rep.post('/sales-flow/leads', b); ids.leads.push(r.id); save(); return r.id; };

  // ── Targets ─────────────────────────────────────────────────────────────
  const thisMonth = daysFrom(0).slice(0, 7); const lastMonth = ymd(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)).slice(0, 7);
  await mgr.put('/sales-desk/targets', { month: thisMonth, rows: [{ userId: SALES, wonValue: 400000, collection: 250000, dealsWon: 4, enquiries: 15, activities: 60 }] });
  await mgr.put('/sales-desk/targets', { month: lastMonth, rows: [{ userId: SALES, wonValue: 300000, collection: 200000, dealsWon: 3, enquiries: 12, activities: 50 }] });
  ids.targetMonths.push(thisMonth, lastMonth); save();

  // ── Customers ───────────────────────────────────────────────────────────
  const bakers = await customer({ name: 'Sahyadri Bakers', phone: '9822011001', email: 'accounts@sahyadribakers.example', city: 'Pune', state: 'Maharashtra', gstin: '27AABCS1429B1Z5', address: 'Shop 4, FC Road, Pune 411004', industry: 'Food & Bakery', contact: { name: 'Ravi Kulkarni', phone: '9822011001', email: 'ravi@sahyadribakers.example', position: 'Owner' } });
  const blueleaf = await customer({ name: 'BlueLeaf Technologies Pvt Ltd', phone: '9845012345', email: 'finance@blueleaf.example', city: 'Bengaluru', state: 'Karnataka', gstin: '29AABCB4412C1Z2', address: '12, Indiranagar, Bengaluru 560038', industry: 'IT services', contact: { name: 'Priya Nair', phone: '9845012345', email: 'priya@blueleaf.example', position: 'Operations Head' } });
  const clinic = await customer({ name: 'Dr. Joshi Dental Clinic', phone: '9890077665', email: 'clinic@drjoshi.example', city: 'Pune', state: 'Maharashtra', address: 'Baner Road, Pune 411045', industry: 'Healthcare', contact: { name: 'Dr. Meera Joshi', phone: '9890077665', position: 'Doctor' } });
  const hotel = await customer({ name: 'Hotel Panchavati Grand', phone: '9922334455', email: 'gm@panchavati.example', city: 'Nashik', state: 'Maharashtra', gstin: '27AAACH9981M1ZP', address: 'College Road, Nashik 422005', industry: 'Hospitality', contact: { name: 'Sanjay Pawar', phone: '9922334455', position: 'General Manager' } });
  const jewel = await customer({ name: 'Tanishka Jewellers', phone: '9820099887', email: 'owner@tanishka.example', city: 'Mumbai', state: 'Maharashtra', industry: 'Retail', contact: { name: 'Hetal Shah', phone: '9820099887', position: 'Partner' } });
  console.log('customers: 5 added');

  // ── History: deals won in earlier months (value only), for the trend ──
  const history = [[jewel, 'Brand shoot + reels package', 85000, -150, 'Jul'], [clinic, 'Website revamp', 120000, -95, 'Aug'], [bakers, 'Google Business setup', 36000, -70, 'Aug']];
  for (const [co, name, value, ago] of history) {
    const d = await dealFor(co, { deal_name: name, deal_value: value, description: 'Earlier work (demo history)' });
    await rep.post(`/sales-flow/deals/${d}/stage`, { stage: stage(/^won$/i), wonValue: value });
    back.push(['UPDATE deals SET created_at = ?, closed_at = ?, updated_at = ? WHERE id = ?', [stamp(ago - 20), stamp(ago), stamp(ago), d]]);
    back.push(['UPDATE sales_events SET happened_at = ? WHERE deal_id = ?', [stamp(ago), d]]);
  }

  // ── A. Won last month, fully paid ───────────────────────────────────────
  const dA = await dealFor(bakers, { deal_name: 'Website + GMB + social media (annual)', deal_value: 140000, description: 'Annual digital package for the bakery chain' });
  await talk({ dealId: dA }, 'Meeting', 'Price discussed', 'Visited the shop. Wants website, GMB and 3 reels a month. Budget around 1.4L a year.');
  const qA = await quote(dA, 'Website + GMB + social media, 12 months', [item('Website Development', '998314', '', 1, 45000), item('GMB Management', '998361', 'month', 12, 4000, 5), item('Social Media Reels', '998361', 'reel', 36, 1500, 5)]);
  await sendQuote(qA);
  await rep.post(`/sales-flow/quotations/${qA}/accept`, {});
  await rep.post(`/sales-flow/deals/${dA}/stage`, { stage: stage(/^won$/i) });
  const iA = await invoiceFrom(qA); await issue(iA); const payA = await pay(iA, (await rep.get(`/sales-desk/invoices/${iA}`)).invoice.total, 'UPI', 'UPI-441908236611');
  const lastMonthDay = (d) => stamp(-35 + d); const lmDate = (d) => daysFrom(-35 + d);
  back.push(['UPDATE deals SET created_at = ?, closed_at = ?, updated_at = ? WHERE id = ?', [stamp(-52), lastMonthDay(0), lastMonthDay(0), dA]]);
  back.push(['UPDATE estimations SET estimate_date = ?, expiry_date = ?, sent_at = ?, responded_at = ?, created_at = ?, updated_at = ? WHERE id = ?', [lmDate(-12), lmDate(3), lastMonthDay(-10), lastMonthDay(-3), lastMonthDay(-12), lastMonthDay(0), qA]]);
  back.push(['UPDATE invoices SET invoice_date = ?, open_till = ?, sent_at = ?, payment_date = ?, created_at = ? WHERE id = ?', [lmDate(0), lmDate(15), lastMonthDay(0), lmDate(6), lastMonthDay(0), iA]]);
  back.push(['UPDATE sales_payments SET paid_on = ?, created_at = ? WHERE id = ?', [lmDate(6), lastMonthDay(6), payA.id]]);
  back.push(['UPDATE sales_events SET happened_at = DATE_SUB(happened_at, INTERVAL 35 DAY) WHERE deal_id = ?', [dA]]);

  // ── B. Won this month, IGST, half paid ──────────────────────────────────
  const dB = await dealFor(blueleaf, { deal_name: 'Custom CRM for field team', deal_value: 180000, description: 'Lead + visit tracking CRM for 25 field staff' });
  await talk({ dealId: dB }, 'Call', 'Needs quotation', 'Priya shared requirements: lead capture, visit check-in, monthly reports.', { type: 'Meeting', date: daysFrom(-9), time: '15:00', subject: 'Demo of the CRM' });
  const qB = await quote(dB, 'Custom CRM, phase 1', [item('Custom Software / CRM', '998314', '', 1, 150000), item('Domain & Hosting (1 year)', '998315', 'year', 1, 6000), item('Website Maintenance', '998316', 'month', 6, 3000)]);
  await sendQuote(qB, 'Email');
  await rep.post(`/sales-flow/quotations/${qB}/accept`, {});
  await rep.post(`/sales-flow/deals/${dB}/stage`, { stage: stage(/^won$/i) });
  const iB = await invoiceFrom(qB); await issue(iB);
  const totB = (await rep.get(`/sales-desk/invoices/${iB}`)).invoice.total;
  const payB = await pay(iB, Math.round(totB / 2), 'Bank transfer', 'NEFT-SBIN524718832');
  back.push(['UPDATE estimations SET estimate_date = ?, expiry_date = ?, sent_at = ?, responded_at = ? WHERE id = ?', [daysFrom(-16), daysFrom(-1), stamp(-15), stamp(-8), qB]]);
  back.push(['UPDATE deals SET created_at = ?, closed_at = ?, updated_at = ? WHERE id = ?', [stamp(-20), stamp(-7), stamp(-7), dB]]);
  back.push(['UPDATE invoices SET invoice_date = ?, open_till = ?, sent_at = ? WHERE id = ?', [daysFrom(-7), daysFrom(8), stamp(-7), iB]]);
  back.push(['UPDATE sales_payments SET paid_on = ? WHERE id = ?', [daysFrom(-3), payB.id]]);

  // ── C. Won, invoice overdue, nothing paid ───────────────────────────────
  const dC = await dealFor(hotel, { deal_name: 'Social media + Google Ads, 3 months', deal_value: 150000, description: 'Festival season campaign' });
  const qC = await quote(dC, 'Social media + Google Ads (quarter)', [item('Social Media Management', '998361', 'month', 3, 15000), item('Google Ads Management', '998361', 'month', 3, 10000), item('Graphic Design (creatives)', '998391', 'creative', 30, 500)]);
  await sendQuote(qC, 'WhatsApp');
  await rep.post(`/sales-flow/quotations/${qC}/accept`, {});
  await rep.post(`/sales-flow/deals/${dC}/stage`, { stage: stage(/^won$/i) });
  const iC = await invoiceFrom(qC); await issue(iC, 'WhatsApp');
  back.push(['UPDATE invoices SET invoice_date = ?, open_till = ?, sent_at = ? WHERE id = ?', [daysFrom(-38), daysFrom(-23), stamp(-38), iC]]);
  back.push(['UPDATE deals SET created_at = ?, closed_at = ?, updated_at = ? WHERE id = ?', [stamp(-50), stamp(-39), stamp(-39), dC]]);
  back.push(['UPDATE estimations SET estimate_date = ?, expiry_date = ?, sent_at = ?, responded_at = ? WHERE id = ?', [daysFrom(-46), daysFrom(-31), stamp(-45), stamp(-40), qC]]);

  // ── D. Negotiation: revised quotation ───────────────────────────────────
  const dD = await dealFor(clinic, { deal_name: 'GMB + SEO + reels for 2nd branch', deal_value: 96000, description: 'New branch at Kothrud' });
  const qD1 = await quote(dD, 'GMB + SEO, 6 months', [item('GMB Management', '998361', 'month', 6, 12000, 8), item('SEO (On-page + Off-page)', '998361', 'month', 6, 15000, 8)]);
  await sendQuote(qD1);
  await talk({ dealId: dD }, 'Call', 'Negotiating price', 'Dr. Joshi finds it high; asks for a 3-month start and monthly billing.', { type: 'Call', date: daysFrom(0), time: '17:00', subject: 'Share revised quotation' });
  const qD2 = (await rep.post(`/sales-flow/quotations/${qD1}/revise`, { note: 'Reduced to 3 months with monthly billing, as asked' })).id; ids.quotations.push(qD2); save();
  await rep.put(`/sales-flow/quotations/${qD2}`, { subject: 'GMB + SEO, 3 months (revised)', items: [item('GMB Management', '998361', 'month', 3, 12000, 5), item('SEO (On-page + Off-page)', '998361', 'month', 3, 15000, 5)] });
  await rep.post(`/sales-flow/quotations/${qD2}/submit`, {});
  back.push(['UPDATE estimations SET sent_at = ? WHERE id = ?', [stamp(-6), qD1]]);

  // ── E. Waiting for the manager's approval (20% discount) ────────────────
  const dE = await dealFor(known('Vertex Infotech Pvt. Ltd.'), { deal_name: 'Mobile app for dealers', deal_value: 200000, description: 'iOS + Android app' });
  const qE = await quote(dE, 'Mobile app, phase 1', [item('Mobile App Development', '998314', '', 1, 200000, 20), item('Domain & Hosting (1 year)', '998315', 'year', 1, 6000)]);
  await rep.post(`/sales-flow/quotations/${qE}/submit`, { note: 'Competing with two agencies; needs a sharp price to win' });

  // ── F. Approved, not sent yet ───────────────────────────────────────────
  const dF = await dealFor(known('TechNova Solutions Pvt. Ltd.'), { deal_name: 'Website redesign', deal_value: 60000, description: 'Corporate site refresh' });
  const qF = await quote(dF, 'Website redesign', [item('Website Development', '998314', '', 1, 55000, 5), item('Website Maintenance', '998316', 'month', 3, 3000)]);
  await rep.post(`/sales-flow/quotations/${qF}/submit`, {});

  // ── G. Sent, no answer, expired ─────────────────────────────────────────
  const dG = await dealFor(known('mk farma'), { deal_name: 'E-commerce store', deal_value: 95000, description: 'Online pharmacy catalogue' });
  const qG = await quote(dG, 'E-commerce website', [item('E-commerce Website', '998314', '', 1, 90000), item('Domain & Hosting (1 year)', '998315', 'year', 1, 6000)]);
  await sendQuote(qG);
  back.push(['UPDATE estimations SET estimate_date = ?, expiry_date = ?, sent_at = ? WHERE id = ?', [daysFrom(-24), daysFrom(-9), stamp(-23), qG]]);

  // ── H. Lost and on hold deals ───────────────────────────────────────────
  const dH = await dealFor(known('aditya homeopathy'), { deal_name: 'SEO package', deal_value: 48000, description: '6 month SEO' });
  const qH = await quote(dH, 'SEO, 6 months', [item('SEO (On-page + Off-page)', '998361', 'month', 4, 12000)]);
  await sendQuote(qH);
  await rep.post(`/sales-flow/quotations/${qH}/decline`, { reason: 'Price too high' });
  await rep.post(`/sales-flow/deals/${dH}/stage`, { stage: stage(/^lost$/i), reason: 'Price too high' });
  back.push(['UPDATE deals SET created_at = ?, closed_at = ?, updated_at = ? WHERE id = ?', [stamp(-30), stamp(-12), stamp(-12), dH]]);
  const dI = await dealFor(known('Fitrack'), { deal_name: 'Gym management software', deal_value: 130000, description: 'Membership + billing app' });
  await talk({ dealId: dI }, 'Meeting', 'Decision pending', 'Owner likes the demo but will decide after the new branch opens.');
  await rep.post(`/sales-flow/deals/${dI}/hold`, { reason: 'Waiting for the new branch to open', until: daysFrom(18) });

  // ── Enquiries ───────────────────────────────────────────────────────────
  const l1 = await lead({ lead_name: 'Amit Deshmukh', company: 'Deshmukh Traders', phone: '9823456701', email: 'amit@deshmukhtraders.example', lead_source: 'Website', value: 40000, project_name: 'Website for wholesale business', notes: 'Filled the contact form: needs a catalogue website.', followup: { type: 'Call', date: daysFrom(0), time: '16:00', subject: 'First call' } });
  const l2 = await lead({ lead_name: 'Sneha Patil', company: 'Patil Boutique', phone: '9823456702', lead_source: 'Social media', value: 25000, project_name: 'Instagram management', notes: 'DM on Instagram asking for rates.' });
  back.push(['UPDATE leads SET created_at = ?, updated_at = ? WHERE id = ?', [stamp(-3, 10), stamp(-3, 10), l2]]);
  back.push(['UPDATE sales_events SET happened_at = ? WHERE lead_id = ?', [stamp(-3, 10), l2]]);
  const l3 = await lead({ lead_name: 'Rahul Verma', company: 'Verma Motors', phone: '9823456703', email: 'rahul@vermamotors.example', lead_source: 'Google Ads', value: 60000, project_name: 'Lead generation ads', notes: 'Came from the Google Ads landing page.' });
  await talk({ leadId: l3 }, 'Call', 'Interested', 'Runs a two-wheeler showroom; wants 30+ enquiries a month. Budget 20k/month for ads.', { type: 'Call', date: daysFrom(1), time: '11:30', subject: 'Share ad plan and rates' });
  const l4 = await lead({ lead_name: 'Kavita Rao', company: 'Rao Constructions', phone: '9823456704', email: 'kavita@raoconstructions.example', lead_source: 'Referral', value: 90000, project_name: 'Website + brochure + social', notes: 'Referred by Sahyadri Bakers.' });
  await talk({ leadId: l4 }, 'Meeting', 'Requirement understood', 'Met at the site office. Wants a project showcase website and a brochure. Decision in a week.', { type: 'Google Meet', date: daysFrom(2), time: '12:00', subject: 'Walk through sample designs', meetingLink: 'https://meet.google.com/demo-rao-sites' });
  await rep.post(`/sales-flow/leads/${l4}/status`, { status: 'Qualified' });
  const l5 = await lead({ lead_name: 'Nilesh Shinde', company: 'Shinde Agro', phone: '9823456705', lead_source: 'IndiaMART', value: 30000, project_name: 'Catalogue website' });
  await talk({ leadId: l5 }, 'Call', 'Call back later', 'Busy with harvest season; asked to call after the festival.');
  await rep.post(`/sales-flow/leads/${l5}/status`, { status: 'On Hold', reason: 'Budget next quarter', holdUntil: daysFrom(14) });
  const l6 = await lead({ lead_name: 'Pooja Mehta', company: 'Mehta Classes', phone: '9823456706', lead_source: 'JustDial', value: 20000, project_name: 'Admissions ads' });
  await talk({ leadId: l6 }, 'Call', 'Not reachable', 'Phone not answered on three attempts.');
  await rep.post(`/sales-flow/leads/${l6}/status`, { status: 'Lost', reason: 'No response' });
  const l7 = await lead({ lead_name: 'Sandeep Kale', company: 'Kale Enterprises', phone: '9823456707', lead_source: 'Walk-in', value: 10000, project_name: 'Logo design' });
  await rep.post(`/sales-flow/leads/${l7}/status`, { status: 'Unqualified', reason: 'Not a fit' });
  const l8 = await lead({ lead_name: 'Farhan Sheikh', company: 'Sheikh Caterers', phone: '9823456708', email: 'farhan@sheikhcaterers.example', lead_source: 'Phone call', value: 35000, project_name: 'GMB + Instagram' });
  await talk({ leadId: l8 }, 'WhatsApp', 'Shared details', 'Sent the service list and sample posts on WhatsApp.', { type: 'Call', date: daysFrom(0), time: '10:00', subject: 'Follow up on WhatsApp details' });
  const l9 = await lead({ lead_name: 'Anita Kulkarni', company: 'Kulkarni Sweets', phone: '9823456709', email: 'anita@kulkarnisweets.example', lead_source: 'Referral', value: 55000, project_name: 'Online ordering website', notes: 'Wants online ordering for festival sweets.' });
  await talk({ leadId: l9 }, 'Call', 'Interested', 'Wants online ordering live before Diwali.');
  const conv = await rep.post(`/sales-flow/leads/${l9}/convert`, { deal_name: 'Online ordering website', deal_value: 55000, stage: stage(/discovery/i) });
  ids.deals.push(conv.dealId); ids.companies.push((await sql('SELECT converted_company_id c FROM leads WHERE id = ?', [l9]))[0].c); save();
  await rep.post('/sales-flow/followups', { dealId: conv.dealId, type: 'Demo', subject: 'Show the ordering demo', date: daysFrom(3), time: '15:30' });
  // Spread the enquiries over the last weeks (the funnel and "enquiries by month" need history).
  const when = [[l1, 0], [l3, -2], [l4, -6], [l5, -12], [l6, -20], [l7, -22], [l8, -4], [l9, -9]];
  for (const [id, n] of when) { if (n) { back.push(['UPDATE leads SET created_at = ?, updated_at = ? WHERE id = ?', [stamp(n, 10), stamp(n, 10), id]]); } }
  // Farhan's call was due yesterday and was missed: overdue.
  back.push(["UPDATE followups SET scheduled_date = ?, scheduled_time = '10:00:00' WHERE lead_id = ? AND status = 'Scheduled'", [daysFrom(-1), l8]]);

  // ── J. Digital marketing retainer: priced per keyword / reel / creative, billed every month ──
  const green = await customer({ name: 'GreenLeaf Organics', phone: '9890123456', email: 'accounts@greenleaf.example', city: 'Pune', state: 'Maharashtra', gstin: '27AAECG4521K1Z8', address: 'Kothrud, Pune 411038', industry: 'Organic food retail', contact: { name: 'Neha Bhide', phone: '9890123456', email: 'neha@greenleaf.example', position: 'Marketing Manager' } });
  const dJ = await dealFor(green, { deal_name: 'SEO + GEO + social media retainer', deal_value: 75000, description: 'Six-month growth package for the online store' });
  await talk({ dealId: dJ }, 'Meeting', 'Price discussed', 'Wants top-3 for 20 keywords, AI visibility, 8 reels and 12 creatives a month, plus Meta ads. Ad budget 30k a month, paid by them.');
  const startMonth = ymd(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)).slice(0, 7);
  const qJ = await quote(dJ, 'SEO, GEO, social media and Meta Ads: 6 month retainer', [
    item('SEO (keyword based)', '998361', 'keyword', 20, 1200), item('GEO: Generative Engine Optimisation', '998361', 'page', 5, 3000),
    item('Google Business Profile (GMB) management', '998361', 'location', 1, 6000), item('Reels / short videos', '998361', 'reel', 8, 1500),
    item('Graphic creatives', '998391', 'creative', 12, 500), item('Meta Ads management (Facebook & Instagram)', '998361', 'campaign', 1, 6000)
  ], { quoteType: 'retainer', plan: { months: 6, startMonth, adSpendNote: 'Meta ad spend (about Rs. 30,000 a month) is paid by the client directly to Meta and is not part of this fee.', sections: [
    { title: 'Reporting & communication', items: ['Monthly report by the 7th with rankings, traffic, leads and ad results', 'One review call every month', 'A single point of contact on WhatsApp during working hours'] },
    { title: 'What we need from you', items: ['Brand assets: logo, product photos, offers', 'Access to website, Google Business Profile and Meta ad account', 'Approvals within 3 working days'] },
    { title: 'Not included', items: ['Ad spend paid to Meta or Google', 'Photo / video shoots', 'Website redesign'] }] } });
  await sendQuote(qJ); await rep.post(`/sales-flow/quotations/${qJ}/accept`, {});
  await rep.post(`/sales-flow/deals/${dJ}/stage`, { stage: stage(/^won$/i), wonValue: 446040 });
  // Last month: invoiced, part paid; this month: invoiced with a credit for undelivered reels, an advance adjusted.
  const jLast = await rep.post(`/sales-desk/quotations/${qJ}/bill`, { month: startMonth }); ids.invoices.push(jLast.id); save();
  await issue(jLast.id); const jPay1 = await pay(jLast.id, 50000, 'Bank transfer', 'NEFT-GL-0001');
  const jNow = await rep.post(`/sales-desk/quotations/${qJ}/bill`, { month: daysFrom(0).slice(0, 7) }); ids.invoices.push(jNow.id); save();
  const jInv = (await rep.get(`/sales-desk/invoices/${jNow.id}`)).invoice;
  await rep.put(`/sales-desk/invoices/${jNow.id}`, { ...jInv, dueDate: undefined, items: [...jInv.items, { name: 'Credit: 2 reels not delivered last month', hsn: '998361', unit: 'reel', qty: -2, rate: 1500, discountPct: 0, taxPct: 18 }] });
  await issue(jNow.id);
  await rep.post(`/sales-desk/customers/${green}/advance`, { amount: 10000, date: daysFrom(0), mode: 'UPI', reference: 'UPI-GL-ADV-7781', notes: 'Advance for next month' });
  back.push(['UPDATE estimations SET estimate_date = ?, expiry_date = ?, sent_at = ?, responded_at = ?, created_at = ? WHERE id = ?', [daysFrom(-45), daysFrom(-30), stamp(-44), stamp(-38), stamp(-45), qJ]]);
  back.push(['UPDATE deals SET created_at = ?, closed_at = ?, updated_at = ? WHERE id = ?', [stamp(-50), stamp(-38), stamp(-38), dJ]]);
  back.push(['UPDATE invoices SET invoice_date = ?, open_till = ?, sent_at = ? WHERE id = ?', [daysFrom(-33), daysFrom(-18), stamp(-33), jLast.id]]);
  back.push(['UPDATE sales_payments SET paid_on = ? WHERE id = ?', [daysFrom(-26), jPay1.id]]);

  // ── K. IT project: ERP with IoT machine monitoring, paid by milestones ──
  const auto = await customer({ name: 'Shree Auto Components Pvt Ltd', phone: '9822098220', email: 'it@shreeauto.example', city: 'Pune (Chakan)', state: 'Maharashtra', gstin: '27AAGCS7788P1Z3', address: 'MIDC Chakan, Pune 410501', industry: 'Manufacturing', contact: { name: 'Mahesh Gaikwad', phone: '9822098220', email: 'mahesh@shreeauto.example', position: 'Plant Head' } });
  const dK = await dealFor(auto, { deal_name: 'ERP + IoT machine monitoring', deal_value: 800000, description: 'Replace Excel and paper with one ERP; live machine status from 12 CNC machines' });
  await talk({ dealId: dK }, 'Meeting', 'Requirement understood', 'Plant visit. Needs sales, purchase, inventory, production and accounts. Wants OEE and downtime alerts from CNC machines.', { type: 'Meeting', date: daysFrom(4), time: '11:00', subject: 'Scope walkthrough with the plant team', location: 'Chakan plant' });
  const qK = await quote(dK, 'ERP with IoT machine monitoring: phase 1', [
    item('ERP development (custom)', '998314', 'module', 5, 60000), item('IoT integration', '998314', 'device type', 3, 50000),
    item('Data migration', '998314', 'source', 2, 10000), item('API / third-party integration', '998314', 'integration', 2, 15000),
    item('Software support & AMC', '998316', 'month', 12, 15000)
  ], { quoteType: 'project', plan: { timeline: '18-22 weeks from the advance', milestones: [{ name: 'Advance with the order', pct: 30 }, { name: 'Core ERP modules delivered for testing (UAT)', pct: 30 }, { name: 'IoT integration live and go-live', pct: 30 }, { name: 'After 30 days of stable use', pct: 10 }], sections: [
    { title: 'Deliverables', items: ['ERP: sales, purchase, inventory, production and accounts modules', 'IoT gateway integration for 12 CNC machines with live dashboard and downtime alerts', 'Source code, database and documentation handed over after final payment', 'Two training sessions for plant staff'] },
    { title: 'Assumptions', items: ['Machine controllers expose data (Modbus / MTConnect / OPC-UA) and network is available at the plant', 'Master data in Excel is shared in the agreed format within 2 weeks', 'One decision-maker from the plant signs off each milestone within 5 working days'] },
    { title: 'Exclusions', items: ['IoT sensors, gateways and networking hardware', 'Server or cloud hosting charges', 'SMS and WhatsApp credits', 'Tally or other accounting software licences'] },
    { title: 'Support & warranty', items: ['90 days warranty on delivered scope after go-live', 'AMC for 12 months is included as priced above'] }] } });
  await sendQuote(qK); await rep.post(`/sales-flow/quotations/${qK}/accept`, {});
  await rep.post(`/sales-flow/deals/${dK}/stage`, { stage: stage(/^won$/i) });
  const kM1 = await rep.post(`/sales-desk/quotations/${qK}/bill`, { milestone: 1 }); ids.invoices.push(kM1.id); save();
  await issue(kM1.id); const kPay = await pay(kM1.id, (await rep.get(`/sales-desk/invoices/${kM1.id}`)).invoice.total, 'Bank transfer', 'RTGS-SAC-55120');
  const kM2 = await rep.post(`/sales-desk/quotations/${qK}/bill`, { milestone: 2 }); ids.invoices.push(kM2.id); save();
  back.push(['UPDATE estimations SET estimate_date = ?, expiry_date = ?, sent_at = ?, responded_at = ?, created_at = ? WHERE id = ?', [daysFrom(-30), daysFrom(-15), stamp(-29), stamp(-22), stamp(-30), qK]]);
  back.push(['UPDATE deals SET created_at = ?, closed_at = ?, updated_at = ? WHERE id = ?', [stamp(-42), stamp(-22), stamp(-22), dK]]);
  back.push(['UPDATE invoices SET invoice_date = ?, open_till = ?, sent_at = ? WHERE id = ?', [daysFrom(-21), daysFrom(-6), stamp(-21), kM1.id]]);
  back.push(['UPDATE sales_payments SET paid_on = ? WHERE id = ?', [daysFrom(-15), kPay.id]]);
  // A second software proposal still being negotiated: CRM for a distributor.
  const dL = await dealFor(known('Vertex Infotech Pvt. Ltd.'), { deal_name: 'Dealer CRM with WhatsApp integration', deal_value: 260000, description: 'Lead and order tracking for 40 dealers' });
  const qL = await quote(dL, 'Dealer CRM phase 1', [item('CRM development (custom)', '998314', 'module', 4, 40000), item('API / third-party integration', '998314', 'integration', 2, 15000), item('UI / UX design', '998391', 'screen', 10, 2500)], { quoteType: 'project', plan: { timeline: '10-12 weeks', milestones: [{ name: 'Advance with the order', pct: 50 }, { name: 'On go-live', pct: 50 }], sections: [{ title: 'Exclusions', items: ['WhatsApp Business API charges', 'Hosting'] }] } });
  await sendQuote(qL);

  // ── L. Proposal decks: an ERP proposal with two priced options, and marketing plans ──
  const upase = await customer({ name: 'Upase Process Equipments', phone: '9822155501', email: 'purchase@upase.example', city: 'Pune', state: 'Maharashtra', industry: 'Process equipment manufacturing', contact: { name: 'Prashant Upase', phone: '9822155501', email: 'prashant@upase.example', position: 'Director' } });
  const dU = await dealFor(upase, { deal_name: 'Custom ERP development', deal_value: 860000, description: 'ERP for engineering, procurement, production, quality, dispatch, accounts and HRM' });
  await talk({ dealId: dU }, 'Meeting', 'Requirement understood', 'Walked through all departments. Wants option A or B priced; compliance and welding management are the difference.', { type: 'Meeting', date: daysFrom(2), time: '12:00', subject: 'Present the proposal', location: 'Upase works, Pune' });
  const pU = await rep.post('/sales-proposals', { dealId: dU, kind: 'it' }); ids.proposals.push(pU.id); save();
  await rep.put(`/sales-proposals/${pU.id}`, { title: 'ERP Proposal to Upase Process Equipments', content: upaseContent((await rep.get(`/sales-proposals/${pU.id}`)).proposal.content) });
  await rep.post(`/sales-proposals/${pU.id}/mark-sent`, { via: 'Email' });
  const karishma = await customer({ name: 'Dr Karishma Dafle', phone: '9822244100', email: 'clinic@drkarishma.example', city: 'Pune', state: 'Maharashtra', industry: 'Healthcare (fertility)', contact: { name: 'Dr Karishma Dafle', phone: '9822244100', position: 'Doctor' } });
  const dK2 = await dealFor(karishma, { deal_name: 'SEO, GEO, GMB, SMM & Paid Ads', deal_value: 47000, description: 'Monthly digital marketing for an IVF / fertility clinic' });
  const pM = await rep.post('/sales-proposals', { dealId: dK2, kind: 'marketing', title: 'DM Proposal to Dr Karishma Dafle' }); ids.proposals.push(pM.id); save();
  await rep.put(`/sales-proposals/${pM.id}`, { title: 'DM Proposal to Dr Karishma Dafle', content: karishmaContent((await rep.get(`/sales-proposals/${pM.id}`)).proposal.content) });

  // ── I. A standalone draft invoice and a part-paid retainer ─────────────
  const draft = await rep.post('/sales-desk/invoices', { companyId: jewel, subject: 'Festive creatives pack', items: [item('Graphic Design (creatives)', '998391', 'creative', 20, 500), item('Social Media Reels', '998361', 'reel', 4, 1500)] });
  ids.invoices.push(draft.id); save();

  // ── Backdating, then a final summary ────────────────────────────────────
  for (const [s, p] of back) await sql(s, p);
  await db.end();
  console.log('Demo data added.');
}

(async () => { try { if (process.argv.includes('--remove')) await remove(); else await seed(); } catch (err) { console.error('FAILED:', err.message); console.error('Run with --remove to clear what was added so far.'); process.exit(1); } })();

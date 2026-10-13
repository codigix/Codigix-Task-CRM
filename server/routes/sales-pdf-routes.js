const { buildPdf } = require('../services/salesPdf');

/**
 * PDFs for the other sales documents, on the same letterhead as quotations:
 *   GET /api/sales-pdf/invoice/:id    tax invoice (lines, GST split, paid / balance)
 *   GET /api/sales-pdf/proposal/:id   proposal (scope sections + priced lines)
 *   GET /api/sales-pdf/contract/:id   contract (terms, value, signatures)
 *   GET /api/sales-pdf/receipt/:id    payment receipt (sales_payments)
 *   GET /api/sales-pdf/statement/:companyId?from&to   statement of account (invoices, payments, balance)
 * ?download=1 saves the file instead of opening it.
 */

const parseJson = (v, fb) => { if (v == null) return fb; if (typeof v !== 'string') return v; try { return JSON.parse(v); } catch (e) { return fb; } };

module.exports = function setupSalesPdfRoutes(app, pool) {
  const q = async (sql, params = []) => (await pool.query(sql, params))[0];
  const settings = async () => {
    if (app.locals.salesFlow) return app.locals.salesFlow.getSettings();
    const [row] = await q('SELECT data FROM sales_settings WHERE id = 1').catch(() => [null]);
    const s = parseJson(row?.data, {});
    return { company: { name: 'Codigix Infotech Pvt. Ltd.', state: 'Maharashtra', ...(s.company || {}) }, bank: s.bank || {}, quotation: s.quotation || {}, invoice: s.invoice || {} };
  };
  const ymd = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
  const money = (n) => (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const day = (v) => new Date(String(v).length === 10 ? `${v}T12:00:00` : v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  // Draft / Sent / Partially Paid / Paid / Overdue, from the amounts and the due date.
  const invoiceStatus = (inv) => {
    if (inv.status === 'Draft') return 'Draft';
    const total = Number(inv.total) || 0; const paid = Number(inv.amount_paid) || 0;
    if (total > 0 && paid >= total - 0.005) return 'Paid';
    if (inv.open_till && ymd(inv.open_till) < ymd(new Date())) return 'Overdue';
    return paid > 0 ? 'Partially Paid' : 'Sent';
  };
  const companyClient = async (id) => {
    const [c] = id ? await q('SELECT * FROM companies WHERE id = ?', [id]) : [];
    return c ? { name: c.company_name, email: c.email || '', phone: c.phone || '', address: [c.address, c.city, c.zipcode].filter(Boolean).join(', '), state: c.state || '', gstin: c.gstin || '' } : {};
  };
  const send = (res, req, buf, name) => {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${req.query.download ? 'attachment' : 'inline'}; filename="${String(name).replace(/[^A-Za-z0-9._-]/g, '_')}.pdf"`);
    res.send(buf);
  };
  const guard = (req, res) => { if (!req.user?.id) { res.status(401).json({ error: 'Please sign in again.' }); return false; } return true; };

  /** The tax invoice PDF; also attached when an invoice is emailed. */
  const invoicePdf = async (id) => {
    const [inv] = await q('SELECT * FROM invoices WHERE id = ?', [id]);
    if (!inv) return null;
    const items = await q('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY COALESCE(position, 0), id', [inv.id]);
    const s = await settings();
    const base = await companyClient(inv.client_id);
    const client = { ...base, name: base.name || inv.bill_to || 'Client', address: inv.client_address || base.address, gstin: inv.client_gstin || base.gstin || '', state: inv.client_state || base.state, email: inv.client_email || base.email, phone: inv.client_phone || base.phone };
    const lines = items.length ? items.map(i => ({ name: i.item_name, description: i.description || '', hsn: i.hsn_sac || '', unit: i.unit || '', qty: Number(i.quantity) || 1, rate: Number(i.price) || 0, discountPct: Number(i.discount_percentage) || 0, taxPct: Number(i.tax_percentage) || 0 }))
      : [{ name: inv.description || 'Services', qty: 1, rate: Number(inv.subtotal || inv.amount) || 0, taxPct: Number(inv.tax_percentage) || 0, discountPct: Number(inv.discount_percentage) || 0 }];
    const gstMode = inv.gst_mode || (client.state && s.company.state && client.state.toLowerCase() !== s.company.state.toLowerCase() ? 'inter' : 'intra');
    const status = invoiceStatus(inv);
    const earlier = (await q("SELECT invoice_number, open_till, total, amount_paid, status FROM invoices WHERE client_id = ? AND id < ? AND status <> 'Draft' ORDER BY id", [inv.client_id, inv.id]))
      .filter(r => Number(r.total) - Number(r.amount_paid) > 0.005);
    const dueNow = Math.max(0, (Number(inv.total) || 0) - (Number(inv.amount_paid) || 0));
    const duesSum = earlier.reduce((x, r) => x + Number(r.total) - Number(r.amount_paid), 0);
    const buf = await buildPdf({
      dues: earlier.length ? earlier.map(r => ({ label: `${r.invoice_number}${r.open_till ? ` (due ${day(r.open_till)})` : ''}`, value: `Rs. ${money(Number(r.total) - Number(r.amount_paid))}` })) : null,
      duesTotal: `Rs. ${money(duesSum + dueNow)}`,
      type: 'TAX INVOICE', number: inv.invoice_number, date: inv.invoice_date || inv.created_at, dueDate: inv.open_till, status: status === 'Sent' ? null : status, currency: inv.currency || 'INR',
      company: s.company, client, subject: inv.subject || null, items: lines, gstMode, paid: Number(inv.amount_paid) || 0, terms: inv.terms_conditions || '', bank: s.bank, signatory: s.quotation.signatory,
      sections: inv.notes ? [{ heading: 'Notes', text: inv.notes }] : [], placeOfSupply: client.state || null
    });
    return { inv, buf, client, status };
  };
  app.locals.salesPdf = { invoicePdf, invoiceStatus };

  app.get('/api/sales-pdf/invoice/:id', async (req, res) => {
    try {
      if (!guard(req, res)) return;
      const out = await invoicePdf(req.params.id);
      if (!out) return res.status(404).json({ error: 'Invoice not found' });
      send(res, req, out.buf, out.inv.invoice_number);
    } catch (e) { console.error('invoice pdf:', e.message); res.status(500).json({ error: 'Could not build the PDF' }); }
  });

  app.get('/api/sales-pdf/receipt/:id', async (req, res) => {
    try {
      if (!guard(req, res)) return;
      const [p] = await q('SELECT * FROM sales_payments WHERE id = ?', [req.params.id]);
      if (!p) return res.status(404).json({ error: 'Payment not found' });
      const [inv] = p.invoice_id ? await q('SELECT * FROM invoices WHERE id = ?', [p.invoice_id]) : [];
      const s = await settings();
      const client = await companyClient(p.company_id || inv?.client_id);
      // Paid up to and including this receipt.
      const [[upto]] = await pool.query('SELECT COALESCE(SUM(amount), 0) paid FROM sales_payments WHERE invoice_id = ? AND (paid_on < ? OR (paid_on = ? AND id <= ?))', [p.invoice_id, p.paid_on, p.paid_on, p.id]);
      const total = Number(inv?.total) || 0;
      const buf = await buildPdf({
        type: 'PAYMENT RECEIPT', number: p.receipt_number || `RCT-${p.id}`, date: p.paid_on, currency: inv?.currency || 'INR',
        company: s.company, client: { ...client, name: client.name || inv?.bill_to || 'Client', gstin: inv?.client_gstin || client.gstin || '' },
        amount: Number(p.amount) || 0,
        summary: [
          ...(inv ? [['Against invoice', `${inv.invoice_number} dated ${day(inv.invoice_date || inv.created_at)}`], ['Invoice total', `Rs. ${money(total)}`]] : [['Received as', 'Advance, to be adjusted against the next invoice']]),
          ['Received now', `Rs. ${money(p.amount)}`],
          ...(inv ? [['Received till date', `Rs. ${money(upto.paid)}`], ['Balance due', `Rs. ${money(Math.max(0, total - Number(upto.paid)))}`]] : []),
          ['Payment mode', p.mode || '—'],
          ...(p.reference ? [['Reference / UTR / cheque no.', p.reference]] : []),
          ['Received by', p.by_name || '—']
        ],
        sections: p.notes ? [{ heading: 'Notes', text: p.notes }] : [],
        terms: 'This receipt is valid subject to realisation of the payment.', signatory: s.quotation.signatory
      });
      send(res, req, buf, p.receipt_number || `receipt-${p.id}`);
    } catch (e) { console.error('receipt pdf:', e.message); res.status(500).json({ error: 'Could not build the PDF' }); }
  });

  // Statement of account: every issued invoice (debit) and payment (credit) with the running balance.
  app.get('/api/sales-pdf/statement/:companyId', async (req, res) => {
    try {
      if (!guard(req, res)) return;
      const client = await companyClient(req.params.companyId);
      if (!client.name) return res.status(404).json({ error: 'Customer not found' });
      const isDay = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ''));
      const from = isDay(req.query.from) ? req.query.from : null; const to = isDay(req.query.to) ? req.query.to : ymd(new Date());
      const invs = await q("SELECT id, invoice_number, invoice_date, created_at, open_till, total, subject, description FROM invoices WHERE client_id = ? AND status <> 'Draft'", [req.params.companyId]);
      const pays = await q('SELECT p.*, i.invoice_number FROM sales_payments p LEFT JOIN invoices i ON i.id = p.invoice_id WHERE p.company_id = ? OR p.invoice_id IN (SELECT id FROM invoices WHERE client_id = ?)', [req.params.companyId, req.params.companyId]);
      const entries = [
        ...invs.map(i => ({ at: ymd(i.invoice_date || i.created_at), sort: 0, ref: i.invoice_number, text: `Invoice${i.subject || i.description ? ` · ${String(i.subject || i.description).slice(0, 60)}` : ''}${i.open_till ? ` (due ${day(ymd(i.open_till))})` : ''}`, debit: Number(i.total) || 0, credit: 0 })),
        ...pays.map(p => ({ at: ymd(p.paid_on), sort: 1, ref: p.receipt_number || `RCT-${p.id}`, text: `${p.invoice_id ? 'Payment' : 'Advance'}${p.mode ? ` · ${p.mode}` : ''}${p.reference ? ` · ${p.reference}` : ''}${p.invoice_number ? ` (for ${p.invoice_number})` : ''}`, debit: 0, credit: Number(p.amount) || 0 }))
      ].filter(e => e.at <= to).sort((x, y) => (x.at === y.at ? x.sort - y.sort : x.at < y.at ? -1 : 1));
      let opening = 0; let bal = 0; const rows = [];
      entries.forEach(e => {
        bal += e.debit - e.credit;
        if (from && e.at < from) { opening = bal; return; }
        rows.push([day(e.at), e.ref, e.text, e.debit ? money(e.debit) : '', e.credit ? money(e.credit) : '', money(bal)]);
      });
      const inRange = entries.filter(e => !from || e.at >= from);
      const s = await settings();
      const buf = await buildPdf({
        type: 'STATEMENT OF ACCOUNT', number: `SOA-${String(req.params.companyId).padStart(4, '0')}`, date: new Date(), period: `${from ? day(from) : 'Beginning'} – ${day(to)}`,
        company: s.company, client,
        table: {
          columns: [{ k: 'Date', w: 62 }, { k: 'Ref.', w: 78 }, { k: 'Particulars' }, { k: 'Debit (Rs.)', w: 72, a: 'right' }, { k: 'Credit (Rs.)', w: 72, a: 'right' }, { k: 'Balance (Rs.)', w: 76, a: 'right' }],
          rows: from ? [['', '', 'Opening balance', '', '', money(opening)], ...rows] : rows,
          totals: [['Invoiced', `Rs. ${money(inRange.reduce((t, e) => t + e.debit, 0))}`], ['Received', `Rs. ${money(inRange.reduce((t, e) => t + e.credit, 0))}`], ['Balance due', `Rs. ${money(bal)}`]]
        },
        bank: s.bank, terms: 'Please let us know within 7 days if anything in this statement does not match your records.', signatory: s.quotation.signatory
      });
      send(res, req, buf, `statement-${client.name}`);
    } catch (e) { console.error('statement pdf:', e.message); res.status(500).json({ error: 'Could not build the PDF' }); }
  });

  app.get('/api/sales-pdf/proposal/:id', async (req, res) => {
    try {
      if (!guard(req, res)) return;
      const [p] = await q('SELECT * FROM proposals WHERE id = ?', [req.params.id]);
      if (!p) return res.status(404).json({ error: 'Proposal not found' });
      const items = await q('SELECT * FROM proposal_line_items WHERE proposal_id = ? ORDER BY id', [p.id]).catch(() => []);
      const s = await settings();
      let client = await companyClient(p.client_id);
      if (!client.name && p.lead_id) { const [l] = await q('SELECT lead_name, company, email, phone FROM leads WHERE id = ?', [p.lead_id]); if (l) client = { name: l.company || l.lead_name, contact: l.lead_name, email: l.email || '', phone: l.phone || '' }; }
      const text = (v) => { const x = parseJson(v, v); return Array.isArray(x) ? x.map(i => (typeof i === 'string' ? `• ${i}` : `• ${i.name || i.title || i.phase || ''}${i.description ? ` — ${i.description}` : ''}${i.duration ? ` (${i.duration})` : ''}`)).join('\n') : String(x || ''); };
      const sections = [
        ['Executive summary', p.executive_summary], ['Your requirements', p.client_requirements], ['Proposed solution', p.proposed_solution],
        ['Scope of work', p.scope_of_work || p.project_scope], ['Deliverables', p.deliverables], ['Project phases', p.project_phases],
        ['Approach', p.implementation_approach], ['Timeline', p.estimated_duration ? `${p.estimated_duration} ${p.duration_unit || ''}`.trim() : ''],
        ['Assumptions', p.assumptions], ['Exclusions', p.exclusions], ['Notes', p.notes]
      ].map(([heading, v]) => ({ heading, text: text(v) })).filter(x => x.text.trim());
      const buf = await buildPdf({
        type: 'PROPOSAL', number: p.proposal_number, version: p.version || 1, date: p.proposal_date || p.created_at, validUntil: p.validity_date, status: p.status, currency: p.currency || 'INR',
        company: s.company, client, subject: p.title,
        items: items.map(i => ({ name: i.item_name, description: i.description || '', qty: Number(i.quantity) || 1, rate: Number(i.rate) || 0, discountPct: Number(i.discount_percent) || 0, taxPct: Number(i.tax_percent) || 0 })),
        gstMode: client.state && s.company.state && client.state.toLowerCase() !== s.company.state.toLowerCase() ? 'inter' : 'intra',
        sections, terms: p.terms_conditions || s.quotation.terms || '', bank: items.length ? s.bank : {}, signatory: s.quotation.signatory
      });
      send(res, req, buf, p.proposal_number || `proposal-${p.id}`);
    } catch (e) { console.error('proposal pdf:', e.message); res.status(500).json({ error: 'Could not build the PDF' }); }
  });

  app.get('/api/sales-pdf/contract/:id', async (req, res) => {
    try {
      if (!guard(req, res)) return;
      const [c] = await q('SELECT * FROM contracts WHERE id = ?', [req.params.id]);
      if (!c) return res.status(404).json({ error: 'Contract not found' });
      const s = await settings();
      const client = await companyClient(c.client_id);
      const fmt = (v) => (v ? new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '—');
      const value = Number(c.contract_value) || 0;
      const sections = [
        { heading: 'Agreement', text: `This agreement${c.contract_type ? ` (${c.contract_type})` : ''} is made between ${s.company.name} ("Service Provider") and ${client.name || 'the Client'} ("Client") for: ${c.subject}.` },
        { heading: 'Term', text: `From ${fmt(c.start_date)} to ${fmt(c.end_date)}.` },
        { heading: 'Contract value', text: `Rs. ${value.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (plus GST as applicable).` },
        { heading: 'Scope and terms', text: c.description || '' }
      ].filter(x => x.text.trim());
      const buf = await buildPdf({
        type: 'CONTRACT', number: `CON-${String(c.id).padStart(4, '0')}`, date: c.start_date || c.created_at, status: c.status,
        company: s.company, client, subject: c.subject, sections, terms: s.quotation.terms || '', signatory: s.quotation.signatory
      });
      send(res, req, buf, `contract-${c.id}`);
    } catch (e) { console.error('contract pdf:', e.message); res.status(500).json({ error: 'Could not build the PDF' }); }
  });
};

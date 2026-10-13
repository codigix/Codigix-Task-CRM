const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * One letterhead and layout for every sales document: quotations, tax invoices, proposals and
 * contracts. Built on the server so the downloaded PDF and the emailed attachment are the
 * same file.
 *
 * buildPdf(doc) -> Promise<Buffer>
 *   doc.type        'QUOTATION' | 'TAX INVOICE' | 'PROPOSAL' | 'CONTRACT' | 'ESTIMATE' | 'PAYMENT RECEIPT' | 'STATEMENT OF ACCOUNT'
 *   doc.number, doc.version, doc.date, doc.validUntil / doc.dueDate, doc.status
 *   doc.company     letterhead (from Sales Settings): name, address, gstin, pan, phone, email, website, state
 *   doc.client      { name, contact, address, gstin, email, phone, state }
 *   doc.subject     one-line subject
 *   doc.items       [{ name, description, hsn, qty, unit, rate, discountPct, taxPct }]
 *   doc.gstMode     'intra' (CGST + SGST) | 'inter' (IGST)
 *   doc.sections    [{ heading, text }]  free text (proposals / contracts / notes)
 *   doc.terms, doc.bank { name, account, ifsc, branch, upi }, doc.revisionNote, doc.signatory
 *   doc.paid        amount already paid (invoices)
 *   doc.amount + doc.summary [[label, value]]                 payment receipt
 *   doc.table { columns: [{ k, w, a }], rows, totals }        statement of account (ledger)
 *   doc.tables [{ title, columns, rows, totals }]            deliverables / payment schedule
 *   doc.highlights [{ label, value }]                        headline figures (monthly fee, contract value)
 *   doc.dues [{ label, value }] + doc.duesTotal               earlier unpaid invoices
 */

const LOGO = path.join(__dirname, '..', 'assets', 'codigix-logo.png');
const C = { ink: '#111827', muted: '#6b7280', line: '#e5e7eb', band: '#1e2b4a', accent: '#c81e1e', soft: '#f3f4f6', zebra: '#fafafa' };
const MARGIN = 40;

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const money = (n, cur = 'INR') => {
  const v = round2(n);
  const s = v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return cur === 'INR' ? `Rs. ${s}` : `${cur} ${s}`;
};
const dateText = (v) => {
  if (!v) return '—';
  const d = v instanceof Date ? v : new Date(String(v).length === 10 ? `${v}T12:00:00` : v);
  return isNaN(d) ? String(v) : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Indian numbering in words: 1,25,430.50 -> "One Lakh Twenty Five Thousand Four Hundred Thirty Rupees and Fifty Paise Only"
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const twoDigits = (n) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ''}`);
const threeDigits = (n) => `${n >= 100 ? `${ONES[Math.floor(n / 100)]} Hundred${n % 100 ? ' ' : ''}` : ''}${n % 100 ? twoDigits(n % 100) : ''}`;
const inWords = (amount, cur = 'INR') => {
  let n = Math.floor(Math.abs(Number(amount) || 0));
  const paise = Math.round((Math.abs(Number(amount) || 0) - n) * 100);
  if (n === 0 && !paise) return 'Zero Only';
  const parts = [];
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (n) parts.push(threeDigits(n));
  const unit = cur === 'INR' ? 'Rupees' : cur;
  return `${parts.join(' ') || 'Zero'} ${unit}${paise ? ` and ${twoDigits(paise)} Paise` : ''} Only`;
};

/** Line and document totals, shared by the PDF and the API so they always agree. */
const computeTotals = (items = [], gstMode = 'intra') => {
  const lines = items.map(it => {
    const qty = Number(it.qty ?? it.quantity) || 0;
    const rate = Number(it.rate) || 0;
    const discountPct = Math.min(100, Math.max(0, Number(it.discountPct ?? it.discount_percent) || 0));
    const taxPct = Math.max(0, Number(it.taxPct ?? it.tax_percent) || 0);
    const gross = qty * rate;
    const discount = round2((gross * discountPct) / 100);
    const taxable = round2(gross - discount);
    const tax = round2((taxable * taxPct) / 100);
    return { ...it, qty, rate, discountPct, taxPct, gross: round2(gross), discount, taxable, tax, total: round2(taxable + tax) };
  });
  const sum = (k) => round2(lines.reduce((s, l) => s + l[k], 0));
  const tax = sum('tax');
  const gross = sum('gross');
  const discount = sum('discount');
  return {
    lines, gross, discount, taxable: sum('taxable'), tax,
    cgst: gstMode === 'inter' ? 0 : round2(tax / 2), sgst: gstMode === 'inter' ? 0 : round2(tax - round2(tax / 2)), igst: gstMode === 'inter' ? tax : 0,
    total: sum('total'),
    discountPct: gross ? round2((discount / gross) * 100) : 0,
    maxLineDiscountPct: lines.reduce((m, l) => Math.max(m, l.discountPct), 0)
  };
};

const buildPdf = (doc) => new Promise((resolve, reject) => {
  const pdf = new PDFDocument({ size: 'A4', margin: MARGIN, bufferPages: true, info: { Title: `${doc.type} ${doc.number || ''}`.trim(), Author: doc.company?.name || 'Codigix Infotech' } });
  const chunks = [];
  pdf.on('data', c => chunks.push(c));
  pdf.on('end', () => resolve(Buffer.concat(chunks)));
  pdf.on('error', reject);

  const W = pdf.page.width;
  const H = pdf.page.height;
  const inner = W - MARGIN * 2;
  const cur = doc.currency || 'INR';
  const company = doc.company || {};
  const bottomLimit = H - 70;

  const ensure = (h) => { if (pdf.y + h > bottomLimit) { pdf.addPage(); pdf.y = MARGIN + 10; return true; } return false; };
  const label = (t, x, y, w, opts = {}) => pdf.font('Helvetica-Bold').fontSize(7.5).fillColor(C.muted).text(String(t).toUpperCase(), x, y, { width: w, characterSpacing: 0.5, ...opts });

  // ── Letterhead ──
  pdf.rect(0, 0, W, 6).fill(C.band);
  let headTop = 24;
  if (fs.existsSync(LOGO)) {
    try { pdf.image(LOGO, MARGIN, headTop, { fit: [130, 46] }); } catch (e) { /* bad image */ }
  } else {
    pdf.font('Helvetica-Bold').fontSize(18).fillColor(C.band).text(company.name || 'Codigix Infotech', MARGIN, headTop);
  }
  const rightX = MARGIN + inner / 2;
  pdf.font('Helvetica-Bold').fontSize(10).fillColor(C.ink).text(company.name || 'Codigix Infotech Pvt. Ltd.', rightX, headTop, { width: inner / 2, align: 'right' });
  pdf.font('Helvetica').fontSize(8).fillColor(C.muted);
  [company.address, [company.phone, company.email].filter(Boolean).join('  ·  '), company.website, [company.gstin && `GSTIN: ${company.gstin}`, company.pan && `PAN: ${company.pan}`].filter(Boolean).join('  ·  ')]
    .filter(Boolean).forEach(line => pdf.text(line, rightX, pdf.y + 1, { width: inner / 2, align: 'right' }));
  const headBottom = Math.max(pdf.y, headTop + 50) + 12;
  pdf.moveTo(MARGIN, headBottom).lineTo(W - MARGIN, headBottom).lineWidth(0.8).strokeColor(C.line).stroke();

  // ── Title + meta ──
  let y = headBottom + 14;
  pdf.font('Helvetica-Bold').fontSize(20).fillColor(C.band).text(doc.type, MARGIN, y);
  if (doc.status) {
    const st = String(doc.status).toUpperCase();
    const stW = pdf.font('Helvetica-Bold').fontSize(8).widthOfString(st) + 14;
    const tone = /ACCEPT|PAID|WON|APPROV|ACTIVE|SIGNED/.test(st) ? '#047857' : /DECLIN|LOST|CANCEL|EXPIRED|OVERDUE/.test(st) ? C.accent : '#374151';
    pdf.roundedRect(MARGIN, y + 27, stW, 15, 3).lineWidth(0.8).strokeColor(tone).stroke();
    pdf.fillColor(tone).text(st, MARGIN, y + 31, { width: stW, align: 'center' });
  }
  const noLabel = { 'TAX INVOICE': 'Invoice', CONTRACT: 'Contract', PROPOSAL: 'Proposal', 'PAYMENT RECEIPT': 'Receipt', 'STATEMENT OF ACCOUNT': 'Statement' }[doc.type] || 'Quotation';
  const meta = [
    [`${noLabel} No.`, `${doc.number || '—'}${doc.version > 1 ? `  (Rev. ${doc.version})` : ''}`],
    ['Date', dateText(doc.date)],
    ...(doc.period ? [['Period', doc.period]] : []),
    ...(doc.validUntil ? [['Valid until', dateText(doc.validUntil)]] : []),
    ...(doc.dueDate ? [['Due date', dateText(doc.dueDate)]] : []),
    ...(doc.placeOfSupply ? [['Place of supply', doc.placeOfSupply]] : [])
  ];
  const metaX = MARGIN + inner - 220;
  let my = y;
  meta.forEach(([k, v]) => {
    pdf.font('Helvetica').fontSize(8.5).fillColor(C.muted).text(k, metaX, my, { width: 90 });
    pdf.font('Helvetica-Bold').fontSize(8.5).fillColor(C.ink).text(v, metaX + 90, my, { width: 130, align: 'right' });
    my += 14;
  });
  y = Math.max(my, y + 48) + 10;

  // ── Bill to / From ──
  const boxW = (inner - 12) / 2;
  const client = doc.client || {};
  const billLines = [client.contact && client.contact !== client.name ? `Attn: ${client.contact}` : null, client.address, [client.phone, client.email].filter(Boolean).join('  ·  '), client.gstin ? `GSTIN: ${client.gstin}` : null, client.state ? `State: ${client.state}` : null].filter(Boolean);
  const fromLines = [doc.preparedBy ? `Prepared by: ${doc.preparedBy}` : null, doc.preparedByContact || null, company.state ? `State: ${company.state}` : null].filter(Boolean);
  const textH = (lines) => lines.reduce((h, l) => h + pdf.font('Helvetica').fontSize(8.5).heightOfString(l, { width: boxW - 20 }) + 2, 0);
  const boxH = Math.max(textH(billLines), textH(fromLines)) + 42;
  [[doc.type === 'CONTRACT' ? 'Client' : 'Bill to', client.name || '—', billLines, MARGIN], [doc.type === 'CONTRACT' ? 'Service provider' : 'From', company.name || 'Codigix Infotech Pvt. Ltd.', fromLines, MARGIN + boxW + 12]].forEach(([t, name, lines, x]) => {
    pdf.roundedRect(x, y, boxW, boxH, 4).fill(C.soft);
    label(t, x + 10, y + 9, boxW - 20);
    pdf.font('Helvetica-Bold').fontSize(10.5).fillColor(C.ink).text(name, x + 10, y + 21, { width: boxW - 20 });
    pdf.font('Helvetica').fontSize(8.5).fillColor('#374151');
    lines.forEach(l => pdf.text(l, x + 10, pdf.y + 2, { width: boxW - 20 }));
  });
  y += boxH + 14;
  pdf.y = y;

  if (doc.subject) {
    pdf.font('Helvetica-Bold').fontSize(10).fillColor(C.ink).text(`Subject: ${doc.subject}`, MARGIN, pdf.y, { width: inner });
    pdf.moveDown(0.6);
  }
  if (doc.revisionNote && doc.version > 1) {
    const t = `Revision ${doc.version}: ${doc.revisionNote}`;
    const h = pdf.font('Helvetica').fontSize(8.5).heightOfString(t, { width: inner - 20 }) + 12;
    ensure(h);
    pdf.roundedRect(MARGIN, pdf.y, inner, h, 3).fill('#fff7ed');
    pdf.fillColor('#9a3412').text(t, MARGIN + 10, pdf.y + 6, { width: inner - 20 });
    pdf.y += 6;
    pdf.moveDown(0.6);
  }

  // ── Items ──
  if (Array.isArray(doc.items) && doc.items.length) {
    const t = computeTotals(doc.items, doc.gstMode);
    const showDisc = t.lines.some(l => l.discountPct > 0);
    const cols = [
      { k: '#', w: 22, a: 'center' },
      { k: 'Description', w: 0, a: 'left' },
      { k: 'HSN/SAC', w: 48, a: 'center' },
      { k: 'Qty', w: 72, a: 'right' },
      { k: 'Rate', w: 68, a: 'right' },
      ...(showDisc ? [{ k: 'Disc.', w: 36, a: 'right' }] : []),
      { k: 'GST', w: 34, a: 'right' },
      { k: 'Amount', w: 76, a: 'right' }
    ];
    const fixed = cols.reduce((s, c) => s + c.w, 0);
    cols[1].w = inner - fixed;
    const xs = []; cols.reduce((x, c) => { xs.push(x); return x + c.w; }, MARGIN);
    const header = () => {
      ensure(24);
      const hy = pdf.y;
      pdf.rect(MARGIN, hy, inner, 20).fill(C.band);
      pdf.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff');
      cols.forEach((c, i) => pdf.text(c.k, xs[i] + 4, hy + 6, { width: c.w - 8, align: c.a }));
      pdf.y = hy + 20;
    };
    header();
    t.lines.forEach((l, idx) => {
      const desc = [l.description].filter(Boolean).join('');
      const nameH = pdf.font('Helvetica-Bold').fontSize(8.8).heightOfString(l.name || '', { width: cols[1].w - 8 });
      const descH = desc ? pdf.font('Helvetica').fontSize(7.8).heightOfString(desc, { width: cols[1].w - 8 }) + 2 : 0;
      const rowH = Math.max(20, nameH + descH + 10);
      if (pdf.y + rowH > bottomLimit) { pdf.addPage(); pdf.y = MARGIN + 10; header(); }
      const ry = pdf.y;
      if (idx % 2 === 1) pdf.rect(MARGIN, ry, inner, rowH).fill(C.zebra);
      const cells = [String(idx + 1), null, l.hsn || '', `${l.qty}${l.unit ? ` ${l.unit}` : ''}`, money(l.rate, cur).replace(/^Rs\. /, ''), ...(showDisc ? [l.discountPct ? `${l.discountPct}%` : '—'] : []), `${l.taxPct}%`, money(l.total, cur).replace(/^Rs\. /, '')];
      cols.forEach((c, i) => {
        if (i === 1) {
          pdf.font('Helvetica-Bold').fontSize(8.8).fillColor(C.ink).text(l.name || '', xs[i] + 4, ry + 5, { width: c.w - 8 });
          if (desc) pdf.font('Helvetica').fontSize(7.8).fillColor(C.muted).text(desc, xs[i] + 4, pdf.y + 2, { width: c.w - 8 });
        } else {
          pdf.font('Helvetica').fontSize(8.5).fillColor('#374151').text(cells[i], xs[i] + 4, ry + 6, { width: c.w - 8, align: c.a });
        }
      });
      pdf.moveTo(MARGIN, ry + rowH).lineTo(MARGIN + inner, ry + rowH).lineWidth(0.5).strokeColor(C.line).stroke();
      pdf.y = ry + rowH;
    });

    // Totals
    const rows = [['Sub-total', money(t.gross, cur)]];
    if (t.discount) rows.push([`Discount (${t.discountPct}%)`, `- ${money(t.discount, cur)}`]);
    rows.push(['Taxable value', money(t.taxable, cur)]);
    if (doc.gstMode === 'inter') rows.push(['IGST', money(t.igst, cur)]);
    else { rows.push(['CGST', money(t.cgst, cur)]); rows.push(['SGST', money(t.sgst, cur)]); }
    const paid = Number(doc.paid) || 0;
    const boxH2 = rows.length * 16 + 34 + (paid ? 32 : 0);
    ensure(boxH2 + 40);
    const ty = pdf.y + 10;
    const tw = 240; const tx = MARGIN + inner - tw;
    rows.forEach(([k, v], i) => {
      pdf.font('Helvetica').fontSize(9).fillColor(C.muted).text(k, tx, ty + i * 16, { width: 120 });
      pdf.font('Helvetica').fontSize(9).fillColor(C.ink).text(v, tx + 120, ty + i * 16, { width: tw - 120, align: 'right' });
    });
    const gy = ty + rows.length * 16 + 4;
    pdf.rect(tx, gy, tw, 24).fill(C.band);
    pdf.font('Helvetica-Bold').fontSize(10.5).fillColor('#ffffff').text('Total', tx + 10, gy + 7, { width: 100 });
    pdf.text(money(t.total, cur), tx + 100, gy + 7, { width: tw - 110, align: 'right' });
    let after = gy + 24;
    if (paid) {
      pdf.font('Helvetica').fontSize(9).fillColor(C.muted).text('Paid', tx, after + 5, { width: 120 });
      pdf.fillColor(C.ink).text(money(paid, cur), tx + 120, after + 5, { width: tw - 120, align: 'right' });
      pdf.font('Helvetica-Bold').fillColor(C.accent).text('Balance due', tx, after + 19, { width: 120 });
      pdf.text(money(Math.max(0, t.total - paid), cur), tx + 120, after + 19, { width: tw - 120, align: 'right' });
      after += 32;
    }
    // Amount in words on the left of the totals
    label('Amount in words', MARGIN, ty, inner - tw - 20);
    pdf.font('Helvetica-Bold').fontSize(9).fillColor(C.ink).text(inWords(t.total, cur), MARGIN, ty + 11, { width: inner - tw - 20 });
    pdf.y = Math.max(after, pdf.y) + 16;
  }

  // ── Receipt: what was received, against which invoice ──
  if (Array.isArray(doc.summary) && doc.summary.length) {
    const amt = Number(doc.amount) || 0;
    ensure(90 + doc.summary.length * 16);
    const sy = pdf.y + 4;
    pdf.roundedRect(MARGIN, sy, inner, 54, 4).fill('#ecfdf5');
    label('Amount received', MARGIN + 14, sy + 10, 200);
    pdf.font('Helvetica-Bold').fontSize(20).fillColor('#047857').text(money(amt, cur), MARGIN + 14, sy + 22, { width: inner / 2 });
    pdf.font('Helvetica').fontSize(8.5).fillColor('#065f46').text(inWords(amt, cur), MARGIN + inner / 2, sy + 24, { width: inner / 2 - 14, align: 'right' });
    pdf.y = sy + 68;
    doc.summary.forEach(([k, v], i) => {
      const ry = pdf.y;
      if (i % 2 === 0) pdf.rect(MARGIN, ry, inner, 18).fill(C.zebra);
      pdf.font('Helvetica').fontSize(9).fillColor(C.muted).text(k, MARGIN + 10, ry + 5, { width: 180 });
      pdf.font('Helvetica-Bold').fontSize(9).fillColor(C.ink).text(String(v ?? '—'), MARGIN + 190, ry + 5, { width: inner - 200, align: 'right' });
      pdf.y = ry + 18;
    });
    pdf.y += 16;
  }

  // ── Highlights (monthly fee, contract value...), dues carried from earlier invoices ──
  if (Array.isArray(doc.highlights) && doc.highlights.length) {
    const n = doc.highlights.length; const gap = 8; const w = (inner - gap * (n - 1)) / n;
    ensure(58);
    const hy = pdf.y + 2;
    doc.highlights.forEach((h, i) => {
      const x = MARGIN + i * (w + gap);
      pdf.roundedRect(x, hy, w, 46, 4).fill(i === n - 1 ? '#eff6ff' : C.soft);
      label(h.label, x + 10, hy + 8, w - 20);
      pdf.font('Helvetica-Bold').fontSize(11.5).fillColor(i === n - 1 ? '#1d4ed8' : C.ink).text(h.value, x + 10, hy + 22, { width: w - 20 });
    });
    pdf.y = hy + 58;
  }
  if (Array.isArray(doc.dues) && doc.dues.length) {
    const rowsH = doc.dues.length * 15 + 44;
    ensure(rowsH + 10);
    const dy = pdf.y + 2;
    pdf.roundedRect(MARGIN, dy, inner, rowsH, 4).fill('#fff7ed');
    label('Earlier invoices still unpaid', MARGIN + 12, dy + 9, inner - 24);
    let ry = dy + 22;
    doc.dues.forEach(d => {
      pdf.font('Helvetica').fontSize(8.8).fillColor('#7c2d12').text(d.label, MARGIN + 12, ry, { width: inner - 140 });
      pdf.font('Helvetica-Bold').text(d.value, MARGIN + inner - 128, ry, { width: 116, align: 'right' });
      ry += 15;
    });
    pdf.font('Helvetica-Bold').fontSize(9.5).fillColor('#7c2d12').text('Total outstanding with this invoice', MARGIN + 12, ry + 3, { width: inner - 140 });
    pdf.text(doc.duesTotal, MARGIN + inner - 128, ry + 3, { width: 116, align: 'right' });
    pdf.y = dy + rowsH + 12;
  }

  // ── Tables: deliverables, payment schedule, statement ledger ──
  const drawTable = (t) => {
    const cols = t.columns.map(c => ({ ...c }));
    const fixed = cols.reduce((x, c) => x + (c.w || 0), 0);
    const flex = cols.find(c => !c.w); if (flex) flex.w = inner - fixed;
    const xs = []; cols.reduce((x, c) => { xs.push(x); return x + c.w; }, MARGIN);
    if (t.title) {
      ensure(60);
      pdf.font('Helvetica-Bold').fontSize(10).fillColor(C.band).text(t.title, MARGIN, pdf.y, { width: inner });
      pdf.moveTo(MARGIN, pdf.y + 2).lineTo(MARGIN + 40, pdf.y + 2).lineWidth(1.5).strokeColor(C.accent).stroke();
      pdf.y += 10;
    }
    const header = () => {
      ensure(24);
      const hy = pdf.y;
      pdf.rect(MARGIN, hy, inner, 20).fill(C.band);
      pdf.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff');
      cols.forEach((c, i) => pdf.text(c.k, xs[i] + 4, hy + 6, { width: c.w - 8, align: c.a || 'left' }));
      pdf.y = hy + 20;
    };
    header();
    if (!t.rows.length) { pdf.font('Helvetica').fontSize(9).fillColor(C.muted).text('No transactions in this period.', MARGIN + 4, pdf.y + 8); pdf.y += 26; }
    t.rows.forEach((row, idx) => {
      const rowH = Math.max(18, ...row.map((cell, i) => pdf.font('Helvetica').fontSize(8.3).heightOfString(String(cell ?? ''), { width: cols[i].w - 8 }) + 8));
      if (pdf.y + rowH > bottomLimit) { pdf.addPage(); pdf.y = MARGIN + 10; header(); }
      const ry = pdf.y;
      if (idx % 2 === 1) pdf.rect(MARGIN, ry, inner, rowH).fill(C.zebra);
      row.forEach((cell, i) => pdf.font(i === row.length - 1 && t.boldLast !== false ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.3).fillColor('#374151').text(String(cell ?? ''), xs[i] + 4, ry + 5, { width: cols[i].w - 8, align: cols[i].a || 'left' }));
      pdf.moveTo(MARGIN, ry + rowH).lineTo(MARGIN + inner, ry + rowH).lineWidth(0.5).strokeColor(C.line).stroke();
      pdf.y = ry + rowH;
    });
    if (Array.isArray(t.totals) && t.totals.length) {
      const tw = 240; const tx = MARGIN + inner - tw;
      ensure(t.totals.length * 16 + 30);
      let ty = pdf.y + 10;
      t.totals.forEach(([k, v], i) => {
        const last = i === t.totals.length - 1;
        if (last) { pdf.rect(tx, ty - 3, tw, 22).fill(C.band); }
        pdf.font(last ? 'Helvetica-Bold' : 'Helvetica').fontSize(last ? 10 : 9).fillColor(last ? '#ffffff' : C.muted).text(k, tx + (last ? 10 : 0), ty + (last ? 3 : 0), { width: 130 });
        pdf.fillColor(last ? '#ffffff' : C.ink).text(v, tx + 120, ty + (last ? 3 : 0), { width: tw - 130, align: 'right' });
        ty += last ? 24 : 16;
      });
      pdf.y = ty + 10;
    } else pdf.y += 12;
  };
  if (doc.table && Array.isArray(doc.table.rows)) drawTable(doc.table);
  (doc.tables || []).filter(t => t && Array.isArray(t.rows) && t.rows.length).forEach(drawTable);

  // ── Free sections (proposal scope, contract clauses, notes) ──
  (doc.sections || []).filter(s => s && (s.text || '').trim()).forEach(s => {
    ensure(40);
    pdf.font('Helvetica-Bold').fontSize(10).fillColor(C.band).text(s.heading, MARGIN, pdf.y, { width: inner });
    pdf.moveTo(MARGIN, pdf.y + 2).lineTo(MARGIN + 40, pdf.y + 2).lineWidth(1.5).strokeColor(C.accent).stroke();
    pdf.moveDown(0.5);
    String(s.text).split(/\n{2,}/).forEach(par => {
      ensure(20);
      pdf.font('Helvetica').fontSize(9).fillColor('#374151').text(par.trim(), MARGIN, pdf.y, { width: inner, lineGap: 2 });
      pdf.moveDown(0.5);
    });
    pdf.moveDown(0.3);
  });

  // ── Terms + bank ──
  const bank = doc.bank || {};
  const bankLines = [bank.name && `Bank: ${bank.name}`, bank.accountName && `A/c name: ${bank.accountName}`, bank.account && `A/c no.: ${bank.account}`, bank.ifsc && `IFSC: ${bank.ifsc}`, bank.branch && `Branch: ${bank.branch}`, bank.upi && `UPI: ${bank.upi}`].filter(Boolean);
  if (doc.terms || bankLines.length) {
    const termsW = bankLines.length ? inner * 0.6 : inner;
    const termsText = String(doc.terms || '').trim();
    const th = termsText ? pdf.font('Helvetica').fontSize(8.2).heightOfString(termsText, { width: termsW - 10 }) : 0;
    ensure(Math.min(th, 300) + 40);
    const sy = pdf.y;
    if (termsText) {
      label('Terms & conditions', MARGIN, sy, termsW);
      pdf.font('Helvetica').fontSize(8.2).fillColor('#374151').text(termsText, MARGIN, sy + 12, { width: termsW - 10, lineGap: 1.5 });
    }
    const termsEnd = pdf.y;
    if (bankLines.length) {
      const bx = MARGIN + inner * 0.6 + 10; const bw = inner * 0.4 - 10;
      const bh = bankLines.length * 12 + 24;
      pdf.roundedRect(bx, sy, bw, bh, 4).fill(C.soft);
      label('Payment details', bx + 10, sy + 8, bw - 20);
      pdf.font('Helvetica').fontSize(8.2).fillColor(C.ink);
      bankLines.forEach((l, i) => pdf.text(l, bx + 10, sy + 20 + i * 12, { width: bw - 20 }));
      pdf.y = Math.max(termsEnd, sy + bh) + 10;
    }
  }

  // ── Signature ──
  ensure(80);
  const sigY = pdf.y + 16;
  if (doc.type === 'CONTRACT') {
    [['For the client', client.name || ''], [`For ${company.name || 'Codigix Infotech Pvt. Ltd.'}`, doc.signatory || 'Authorised Signatory']].forEach(([t, n], i) => {
      const x = MARGIN + i * (inner / 2 + 10);
      pdf.moveTo(x, sigY + 40).lineTo(x + inner / 2 - 30, sigY + 40).lineWidth(0.6).strokeColor('#9ca3af').stroke();
      pdf.font('Helvetica-Bold').fontSize(8.5).fillColor(C.ink).text(t, x, sigY + 46, { width: inner / 2 - 30 });
      pdf.font('Helvetica').fillColor(C.muted).text(n, x, pdf.y + 1, { width: inner / 2 - 30 });
    });
  } else {
    const sx = MARGIN + inner - 200;
    pdf.font('Helvetica-Bold').fontSize(9).fillColor(C.ink).text(`For ${company.name || 'Codigix Infotech Pvt. Ltd.'}`, sx, sigY, { width: 200, align: 'right' });
    pdf.moveTo(sx + 40, sigY + 46).lineTo(sx + 200, sigY + 46).lineWidth(0.6).strokeColor('#9ca3af').stroke();
    pdf.font('Helvetica').fontSize(8.5).fillColor(C.muted).text(doc.signatory || 'Authorised Signatory', sx, sigY + 50, { width: 200, align: 'right' });
  }

  // ── Footer on every page ──
  const range = pdf.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    pdf.switchToPage(i);
    // Writing below the bottom margin would make pdfkit start a new page.
    const keepBottom = pdf.page.margins.bottom;
    pdf.page.margins.bottom = 0;
    const fy = H - 34;
    pdf.moveTo(MARGIN, fy - 6).lineTo(W - MARGIN, fy - 6).lineWidth(0.5).strokeColor(C.line).stroke();
    pdf.font('Helvetica').fontSize(7.5).fillColor(C.muted)
      .text(`${doc.type} ${doc.number || ''}${doc.version > 1 ? ` (Rev. ${doc.version})` : ''}  ·  This is a computer-generated document.`, MARGIN, fy, { width: inner * 0.75, lineBreak: false })
      .text(`Page ${i - range.start + 1} of ${range.count}`, MARGIN, fy, { width: inner, align: 'right', lineBreak: false });
    pdf.rect(0, H - 6, W, 6).fill(C.band);
    pdf.page.margins.bottom = keepBottom;
  }
  pdf.end();
});

module.exports = { buildPdf, computeTotals, inWords, money, round2 };

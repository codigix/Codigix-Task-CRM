const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Proposal deck: a landscape, slide-style PDF in the Codigix proposal look (cover with red band,
 * About, Executive Summary, module / service lists, option pages, Budget & Timeline, Technology,
 * Post-Deployment Support, AMC, Notes and Thank You). All content comes from the proposal; slides
 * the salesperson switches off are left out and long lists flow onto extra slides.
 *
 *   buildDeck(doc) -> Promise<Buffer>
 */

const LOGO = path.join(__dirname, '..', 'assets', 'codigix-logo.png');
const W = 960; const H = 720;
const NAVY = '#1a0a5c'; const RED = '#ec0022'; const INK = '#1a0a5c'; const SOFT = '#f4f2fb';
const BAND = 54; const LEFT = 48; const BOTTOM = H - BAND - 26;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
const ordinal = (n) => (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'));
const dateText = (v) => {
  if (!v) return '';
  const d = new Date(String(v).length === 10 ? `${v}T12:00:00` : v);
  return isNaN(d) ? String(v) : `${d.getDate()}${ordinal(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};
const rs = (n) => `Rs. ${(Math.round((Number(n) || 0) * 100) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const buildDeck = (doc) => new Promise((resolve, reject) => {
  const pdf = new PDFDocument({ size: [W, H], margin: 0, bufferPages: true, info: { Title: `${doc.cover?.title || 'Proposal'} - ${doc.cover?.preparedFor || ''}`.trim(), Author: doc.company?.name || 'Codigix Infotech' } });
  const chunks = [];
  pdf.on('data', c => chunks.push(c));
  pdf.on('end', () => resolve(Buffer.concat(chunks)));
  pdf.on('error', reject);

  const sec = doc.sections || {};
  const on = (k) => sec[k] !== false;
  const company = doc.company || {};

  // ── drawing helpers ───────────────────────────────────────────────────
  const font = (size, bold, color = INK) => pdf.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size).fillColor(color);
  const plain = (t) => String(t ?? '').replace(/\u2192/g, '->').replace(/\u2713/g, 'v');
  const hOf = (text, size, bold, width, lineGap = 3) => { font(size, bold); return pdf.heightOfString(plain(text), { width, lineGap }); };
  const text = (t, x, y, o = {}) => {
    const { size = 13, bold = false, color = INK, width = 400, align = 'left', lineGap = 3 } = o;
    font(size, bold, color).text(plain(t), x, y, { width, align, lineGap });
    return y + hOf(t, size, bold, width, lineGap);
  };
  const dashes = (x, y, n = 12, c = RED) => { for (let i = 0; i < n; i += 1) pdf.rect(x, y + i * 5, 14, 2.4).fill(c); };
  const bullets = (items, x, y, w, size = 12.5, gap = 4, color = INK) => {
    let cy = y;
    (items || []).filter(i => String(i || '').trim()).forEach(it => {
      const hh = hOf(it, size, false, w - 16);
      pdf.circle(x + 4, cy + size * 0.58, 2).fill(color);
      text(it, x + 16, cy, { size, width: w - 16, color });
      cy += hh + gap;
    });
    return cy;
  };
  const bulletsHeight = (items, w, size = 12.5, gap = 4) => (items || []).filter(i => String(i || '').trim()).reduce((s, it) => s + hOf(it, size, false, w - 16) + gap, 0);
  const slide = (opts = {}) => {
    pdf.addPage({ size: [W, H], margin: 0 });
    if (opts.band !== false) pdf.rect(0, H - BAND, W, BAND).fill(RED);
    if (opts.dashes !== false) { dashes(930, 40, 12); dashes(930, 480, 12); }
    return LEFT;
  };
  const title = (t, x = LEFT, y = 40, size = 30) => text(t, x, y, { size, bold: true, width: W - x - 110 });

  // ── cover (the first page) ────────────────────────────────────────────
  if (doc.kind !== 'marketing') {
    pdf.rect(0, H - 144, W, 144).fill(RED);
    dashes(872, 0, 14);
    if (fs.existsSync(LOGO)) { try { pdf.image(LOGO, 64, 60, { fit: [230, 80] }); } catch (e) { /* ignore */ } }
    text(`Date: ${dateText(doc.cover?.date)}`, 560, 100, { size: 13, width: 300, align: 'right' });
    text(doc.cover?.title || 'Project Proposal', 0, 235, { size: 58, bold: true, width: W, align: 'center' });
    if (doc.cover?.subtitle) text(doc.cover.subtitle, 60, 330, { size: 24, bold: true, width: W - 120, align: 'center' });
    text(company.website ? `www.${String(company.website).replace(/^www\./, '')}` : '', 560, 548, { size: 13, width: 336, align: 'right' });
    text('Prepared for:', 40, 592, { size: 21, bold: true, color: '#fff', width: 430, align: 'center' });
    text(doc.cover?.preparedFor || '', 40, 618, { size: 21, bold: true, color: '#fff', width: 430, align: 'center' });
    text('Prepared by:', 490, 592, { size: 21, bold: true, color: '#fff', width: 430, align: 'center' });
    text(doc.preparedBy || company.name || 'Codigix Infotech Pvt. Ltd', 490, 618, { size: 21, bold: true, color: '#fff', width: 430, align: 'center' });
  }

  const panel = (x, w, heading, lines, h = H - BAND) => {
    pdf.rect(x, 0, w, h).fill(NAVY);
    dashes(x + w - 36, 40, 10, RED);
    if (heading) text(heading, x + 36, 92, { size: 22, bold: true, color: '#fff', width: w - 90 });
    let y = 140;
    (lines || []).forEach(item => {
      const l = typeof item === 'object' ? item : { label: item };
      pdf.circle(x + 42, y + 8, 3).fill(RED);
      y = text(l.label, x + 56, y, { size: 14, bold: !!l.sub, color: '#fff', width: w - 100 }) + (l.sub ? 0 : 12);
      if (l.sub) y = text(l.sub, x + 56, y, { size: 12, color: '#c9c3ee', width: w - 100 }) + 12;
    });
  };


  // ══ Digital marketing proposal: the Codigix DM format ═══════════════════
  if (doc.kind === 'marketing') {
    const CORAL = '#ff8f7b'; const PINK = '#ff5f7a';
    const para = (t) => String(t || '').split(/\n{2,}/).map(x => x.trim()).filter(Boolean);
    const stroke = (x, y, w, h, color = RED, lw = 1.6) => { pdf.lineWidth(lw).rect(x, y, w, h).strokeColor(color).stroke(); };
    const noteLine = (label, t, x, y, w, size) => {
      font(size, true, RED).text(label, x, y, { width: w, continued: true, lineGap: 3 });
      font(size, true, INK).text(` ${t}`, { width: w, lineGap: 3 });
      return y + hOf(`${label} ${t}`, size, true, w, 3);
    };
    const bulletsNested = (items, x, y, w, size, gap = 3, color = '#222') => {
      let cy = y;
      (items || []).filter(i => String(i || '').trim()).forEach(raw => {
        const sub = /^-\s+/.test(raw); const t = sub ? raw.replace(/^-\s+/, '') : raw;
        const ix = x + (sub ? 20 : 0); const iw = w - (sub ? 20 : 0);
        const hh = hOf(t, size, false, iw - 14);
        if (sub) pdf.circle(ix + 3, cy + size * 0.55, 2).lineWidth(0.8).strokeColor(color).stroke(); else pdf.circle(ix + 3, cy + size * 0.55, 1.9).fill(color);
        text(t, ix + 14, cy, { size, width: iw - 14, color });
        cy += hh + gap;
      });
      return cy;
    };
    const nestedHeight = (items, w, size, gap = 3) => (items || []).filter(i => String(i || '').trim()).reduce((t, raw) => { const sub = /^-\s+/.test(raw); return t + hOf(sub ? raw.replace(/^-\s+/, '') : raw, size, false, w - (sub ? 20 : 0) - 14) + gap; }, 0);

    // cover
    pdf.rect(0, H - 144, W, 144).fill(RED);
    dashes(872, 0, 14);
    if (fs.existsSync(LOGO)) { try { pdf.image(LOGO, 64, 62, { fit: [230, 80] }); } catch (e) { /* ignore */ } }
    {
      const tw = 700; const ch = hOf(doc.cover?.title || 'Proposal', 44, true, tw);
      const cy = 340 - ch / 2;
      text(doc.cover?.title || 'Proposal', (W - tw) / 2, cy, { size: 44, bold: true, width: tw, align: 'center' });
      if (doc.cover?.subtitle) text(doc.cover.subtitle, 100, cy + ch + 14, { size: 20, bold: true, width: W - 200, align: 'center' });
      if (doc.cover?.date) text(`Date: ${dateText(doc.cover.date)}`, 560, 100, { size: 13, width: 336, align: 'right' });
    }
    text('Prepared For:', 68, 590, { size: 20, bold: true, color: '#fff', width: 400, align: 'center' });
    text(doc.cover?.preparedFor || '', 68, 616, { size: 20, bold: true, color: '#fff', width: 400, align: 'center' });
    text('Prepared By:', 557, 590, { size: 20, bold: true, color: '#fff', width: 400, align: 'center' });
    text(doc.preparedBy || 'Codigix Infotech Pvt. Ltd.', 557, 616, { size: 20, bold: true, color: '#fff', width: 400, align: 'center' });

    // about + clients
    if (on('about') && doc.about?.text) {
      slide({ band: false, dashes: false });
      pdf.rect(590, 0, W - 590, 440).fill(CORAL);
      pdf.polygon([590, 372], [W, 292], [W, 440], [590, 440]).fill(PINK);
      pdf.circle(800, 255, 54).fill('#ff7a66');
      text('About', 36, 36, { size: 29, bold: true, width: 500 });
      text(doc.about.heading || 'Codigix Infotech Pvt Ltd', 36, 72, { size: 29, bold: true, color: RED, width: 540 });
      text(doc.about.text, 36, 124, { size: 15, width: 500, lineGap: 6 });
      const clients = (doc.about.clients || []).filter(Boolean).slice(0, 9);
      if (clients.length) {
        font(25, true, INK).text('Our ', 36, 452, { continued: true }); font(25, true, RED).text('Clients');
        pdf.roundedRect(18, 492, W - 36, 196, 30).lineWidth(3).strokeColor(RED).stroke();
        const colsN = clients.length > 6 ? 3 : Math.min(3, clients.length); const rowsN = Math.ceil(clients.length / colsN);
        const cw = (W - 80) / colsN; const rh = Math.min(86, 170 / rowsN);
        clients.forEach((n, i) => {
          const cx = 40 + (i % colsN) * cw; const cy = 506 + Math.floor(i / colsN) * rh;
          const sz = hOf(n, 14, true, cw - 30) > rh - 14 ? 11 : 14;
          text(n, cx + 15, cy + (rh - 14 - hOf(n, sz, true, cw - 30)) / 2, { size: sz, bold: true, width: cw - 30, align: 'center' });
        });
      }
    }

    // agenda
    if (on('agenda') && doc.agenda?.text) {
      slide({ dashes: false });
      panel(590, W - 590, doc.glance?.length ? 'What this covers' : '', doc.glance || []);
      dashes(40, 520, 12);
      let y = text(doc.agenda.title || 'Agenda', 60, 110, { size: 31, bold: true, width: 500 }) + 18;
      const size = doc.agenda.text.length > 900 ? 15 : 16.5;
      para(doc.agenda.text).forEach(pp => { y = text(pp, 60, y, { size, width: 500, lineGap: 5 }) + 20; });
    }

    // service pages: a framed page per service, with its priced table(s) and what is delivered
    const FX = 29; const FY = 48; const FW = 902; const FH = 624; const IX = 60; const IW = 840;
    const renderService = (b, k, draw) => {
      let y = FY + 26; const bottom = FY + FH - 14;
      const T = (t, x, yy, o) => (draw ? text(t, x, yy, o) : yy + hOf(t, o.size, o.bold, o.width, o.lineGap ?? 3));
      (b.variants || []).forEach((v, vi) => {
        if (vi > 0) { y += 6; y = T('OR', IX, y, { size: 21 * k, bold: true, color: RED, width: IW, align: 'center' }) + 8; }
        const head = `${b.title}${v.label ? ` - ${v.label}` : ''}:`;
        const hs = 26 * k;
        const priceX = IX + (() => { font(hs, true); return pdf.widthOfString(`${head} `); })();
        if (draw) {
          font(hs, true, INK).text(head, IX, y, { width: IW, continued: !!v.priceText, lineGap: 2 });
          if (v.priceText) font(hs, true, RED).text(` ${v.priceText}`, { width: IW });
        }
        y += hOf(`${head} ${v.priceText || ''}`, hs, true, IW, 2) + 10 * k;
        void priceX;
        if ((v.rows || []).length) {
          const cw = [0.38 * IW, 0.27 * IW, 0.35 * IW]; const cx = [IX, IX + cw[0], IX + cw[0] + cw[1]]; const fs1 = 12.5 * k;
          const hh = 30 * k;
          if (draw) { stroke(IX, y, IW, hh); cw.forEach((w, i) => { if (i) pdf.moveTo(cx[i], y).lineTo(cx[i], y + hh).lineWidth(1.6).strokeColor(RED).stroke(); }); ['Description', 'Activities', 'Platform'].forEach((t, i) => text(t, cx[i], y + (hh - fs1) / 2 - 1, { size: fs1 + 1, bold: true, width: cw[i], align: 'center' })); }
          y += hh;
          v.rows.forEach(r => {
            const cells = [r.description, r.activities, r.platform];
            const rh = Math.max(...cells.map((c, i) => hOf(c, fs1, i === 0, cw[i] - 20))) + 18 * k;
            if (draw) { stroke(IX, y, IW, rh); cw.forEach((w, i) => { if (i) pdf.moveTo(cx[i], y).lineTo(cx[i], y + rh).lineWidth(1.6).strokeColor(RED).stroke(); }); cells.forEach((c, i) => text(c, cx[i] + 10, y + (rh - hOf(c, fs1, i === 0, cw[i] - 20)) / 2, { size: fs1, bold: i === 0 || i === 1 && false, width: cw[i] - 20, align: i === 0 ? 'left' : 'center' })); }
            y += rh;
          });
          if (v.note) {
            const nh = hOf(`Note: ${v.note}`, 12 * k, true, IW - 20) + 14 * k;
            if (draw) { stroke(IX, y, IW, nh); noteLine('Note:', v.note, IX + 10, y + 7 * k, IW - 20, 12 * k); }
            y += nh;
          }
        }
        y += 14 * k;
      });
      // what is delivered, in two columns
      const gs = 10.2 * k; const gw = (IW - 28) / 2;
      const measure = (g) => (g.title ? hOf(g.title, gs + 0.8, true, gw, 2) + 3 : 0) + (g.text ? hOf(g.text, gs, false, gw, 2) : 0) + (g.items?.length ? nestedHeight(g.items, gw, gs, 2.2) : 0) + 12 * k;
      const groups = b.groups || [];
      const total = groups.reduce((t, g) => t + measure(g), 0);
      // Split the groups (in order) where the taller column is shortest.
      let split = groups.length; let best = Infinity;
      for (let i = 0; i <= groups.length; i += 1) { const a = groups.slice(0, i).reduce((t, g) => t + measure(g), 0); const bb = total - a; if (Math.max(a, bb) < best) { best = Math.max(a, bb); split = i; } }
      const colOf = groups.map((g, i) => (i < split ? 0 : 1));
      const ys = [y, y];
      groups.forEach((g, i) => {
        const col = colOf[i]; const x = IX + col * (gw + 28); let gy = ys[col];
        if (g.title) { gy = (draw ? text(g.title, x, gy, { size: gs + 0.8, bold: true, width: gw, lineGap: 2 }) : gy + hOf(g.title, gs + 0.8, true, gw, 2)) + 3; }
        if (g.text) gy = (draw ? text(g.text, x, gy, { size: gs, color: '#222', width: gw, lineGap: 2 }) : gy + hOf(g.text, gs, false, gw, 2));
        if (g.items?.length) gy = draw ? bulletsNested(g.items, x, gy, gw, gs, 2.2) : gy + nestedHeight(g.items, gw, gs, 2.2);
        ys[col] = gy + 12 * k;
      });
      y = Math.max(ys[0], ys[1]);
      if (b.note) {
        y += 4;
        const nh = hOf(`Note: ${b.note}`, 13 * k, true, IW - 40, 3);
        if (draw) noteLine('Note:', b.note, IX + 20, y, IW - 40, 13 * k);
        y += nh + 6;
      }
      return { y, fits: y <= bottom };
    };
    const platformMark = (name, cx, cy) => {
      const n = name.toLowerCase();
      if (n.includes('google')) {
        const r = 46; const arc = (a0, a1, col) => { const p = (a) => [cx + r * Math.cos(a * Math.PI / 180), cy + r * Math.sin(a * Math.PI / 180)]; const [x0, y0] = p(a0); const [x1, y1] = p(a1); pdf.path(`M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`).lineWidth(20).strokeColor(col).stroke(); };
        arc(-140, -50, '#EA4335'); arc(-50, 20, '#4285F4'); arc(20, 140, '#34A853'); arc(140, 220, '#FBBC05'); pdf.rect(cx - 2, cy - 9, r + 8, 18).fill('#4285F4');
      } else if (n.includes('facebook')) { pdf.circle(cx, cy, 40).fill('#1877F2'); font(70, true, '#fff').text('f', cx - 20, cy - 34, { width: 40, align: 'center', lineBreak: false }); }
      else if (n.includes('instagram')) { pdf.roundedRect(cx - 38, cy - 38, 76, 76, 22).lineWidth(8).strokeColor('#D62976').stroke(); pdf.circle(cx, cy, 17).lineWidth(7).strokeColor('#D62976').stroke(); pdf.circle(cx + 24, cy - 24, 5).fill('#D62976'); }
      else if (n.includes('linkedin')) { font(32, true, '#0A66C2').text('Linked', cx - 62, cy - 14, { lineBreak: false }); pdf.roundedRect(cx + 46, cy - 22, 44, 44, 6).fill('#0A66C2'); font(28, true, '#fff').text('in', cx + 46, cy - 15, { width: 44, align: 'center', lineBreak: false }); }
    };
    if (on('services')) {
      (doc.blocks || []).forEach(b => {
        slide({ band: false, dashes: false });
        stroke(FX, FY, FW, FH, RED, 2.2);
        if (b.type === 'paid') {
          dashes(FX + FW - 38, FY + 40, 12); dashes(FX + FW - 38, FY + FH - 190, 12);
          text(b.title || 'Paid Campaign:', 90, 160, { size: 29, bold: true, width: 420 });
          text('Platforms:', 100, 212, { size: 18, bold: true, width: 300 });
          let y = 250;
          (b.platforms || []).forEach(p => { stroke(112, y, 250, 34, RED, 1.6); text(p, 112, y + 9, { size: 13, bold: true, width: 250, align: 'center' }); y += 50; });
          const fee = b.fee || '';
          if (fee) { const fh = hOf(fee, 24, true, 560) + 22; stroke(112, y + 4, 590, fh, RED, 1.8); text(fee, 124, y + 15, { size: 24, bold: true, color: RED, width: 566 }); y += fh + 36; }
          if (b.note) noteLine('Note:', b.note, 108, y, 590, 13);
          const marks = [(b.platforms || []).find(p => /google/i.test(p)), (b.platforms || []).find(p => /facebook/i.test(p)), (b.platforms || []).find(p => /instagram/i.test(p)), (b.platforms || []).find(p => /linkedin/i.test(p))];
          [[556, 236], [800, 240], [690, 338], [700, 404]].forEach(([mx, my], i) => { if (marks[i]) platformMark(marks[i], mx, my); });
          return;
        }
        let k = 1; let res = renderService(b, k, false);
        for (const kk of [0.94, 0.88, 0.82, 0.76, 0.7, 0.64]) { if (res.fits) break; k = kk; res = renderService(b, k, false); }
        renderService(b, k, true);
      });
    }

    // roles and responsibility
    if (on('roles') && ((doc.roles?.agency || []).length || (doc.roles?.client || []).length)) {
      slide({ band: false, dashes: false });
      pdf.rect(0, 0, 250, H).fill('#6b2455');
      pdf.rect(0, H - BAND, 250, BAND).fill('#7a1f4d');
      pdf.rect(250, H - BAND, W - 250, BAND).fill('#d41a21');
      dashes(30, 40, 12, '#ff9fb2');
      stroke(262, 26, 672, 626, RED, 2.2);
      text('Roles and Responsibility:', 282, 46, { size: 25, bold: true, width: 600 });
      const gw = 630;
      let size = 12.5;
      const need = (sz) => 86 + 2 * 26 + [...(doc.roles.agency || []), ...(doc.roles.client || [])].reduce((t, it) => t + hOf(it, sz, false, gw - 14) + 5, 0);
      while (need(size) > 600 && size > 9) size -= 0.5;
      let y = 96;
      const section = (title, items) => { y = text(title, 282, y, { size: 15, bold: true, width: gw }) + 8; (items || []).forEach(it => { text('\u2022', 284, y, { size, width: 12, color: '#222' }); y = text(it, 298, y, { size, width: gw - 14, color: '#222' }) + 5; }); y += 14; };
      section(doc.roles.agencyTitle || 'Agency (Codigix Infotech)', doc.roles.agency);
      section(doc.roles.clientTitle || 'Client', doc.roles.client);
    }

    // plan of action + commitments
    if (on('plan') && ((doc.plan?.rows || []).length || (doc.plan?.commitments || []).length)) {
      slide({ band: false, dashes: false });
      pdf.rect(0, 0, W, H).fill('#fcfcfe');
      let y = text(doc.plan.title || 'Plan Of Action', 47, 78, { size: 30, bold: true, width: 700 }) + 18;
      const rows = doc.plan.rows || [];
      if (rows.length) {
        const cw = [96, 186, 574]; const cx = [47, 143, 329]; const dsz = rows.length > 4 ? 10.5 : 12;
        const hh = 40;
        stroke(47, y, 856, hh); cw.forEach((w, i) => { if (i) pdf.moveTo(cx[i], y).lineTo(cx[i], y + hh).lineWidth(1.6).strokeColor(RED).stroke(); });
        ['Month', 'Focus', 'Deliverables'].forEach((t, i) => text(t, cx[i], y + 12, { size: 14, bold: true, width: cw[i], align: 'center' }));
        y += hh;
        rows.forEach(r => {
          const rh = Math.max(46, hOf(r.deliverables, dsz, false, cw[2] - 20) + 22, hOf(r.focus, 12.5, true, cw[1] - 16) + 22);
          stroke(47, y, 856, rh); cw.forEach((w, i) => { if (i) pdf.moveTo(cx[i], y).lineTo(cx[i], y + rh).lineWidth(1.6).strokeColor(RED).stroke(); });
          text(r.month, cx[0], y + (rh - 15) / 2, { size: 12.5, bold: true, width: cw[0], align: 'center', color: '#111' });
          text(r.focus, cx[1] + 8, y + (rh - hOf(r.focus, 12.5, true, cw[1] - 16)) / 2, { size: 12.5, bold: true, width: cw[1] - 16, align: 'center', color: '#111' });
          text(r.deliverables, cx[2] + 10, y + (rh - hOf(r.deliverables, dsz, false, cw[2] - 20)) / 2, { size: dsz, width: cw[2] - 20, color: '#222' });
          y += rh;
        });
        y += 34;
      }
      if ((doc.plan.commitments || []).length) {
        y = text(doc.plan.commitmentsTitle || 'Commitments', 47, y, { size: 30, bold: true, width: 700 }) + 10;
        bullets(doc.plan.commitments, 60, y, 820, 13.5, 6);
      }
    }

    // wrap up + thank you
    {
      slide({ band: false, dashes: false });
      pdf.rect(0, 0, W, H).fill('#fcfcfe');
      let y = 0;
      if (on('wrapup') && (doc.wrapup?.points || []).length) {
        y = text(doc.wrapup.title || 'Wrap Up', 40, 100, { size: 29, bold: true, width: 600 }) + 22;
        y = bulletsNested(doc.wrapup.points, 62, y, 780, 14.5, 7, INK) + 20;
      } else y = 160;
      y = Math.max(y, 340);
      for (let i = 0; i < 5; i += 1) { for (let kx = 0; kx < 13; kx += 1) pdf.rect(56 + i * 188 + kx * 5, y, 2.4, 14).fill(RED); }
      y += 40;
      pdf.save().rotate(-9, { origin: [200, y + 80] }).font('Helvetica-BoldOblique').fontSize(44).fillColor(RED).text('Thank You', 150, y + 56, { width: 320, lineBreak: false }).restore();
      const co = doc.company || {};
      text(co.name || 'Codigix Infotech Pvt Ltd', 462, y + 30, { size: 26, bold: true, width: 480 });
      let cy = y + 74;
      [co.phones && `Contact: ${co.phones}`, co.email && `Email: ${co.email}`, co.website && `Website: ${co.website}`, co.address && `Address: ${co.address}`].filter(Boolean).forEach(l => { cy = text(l, 466, cy, { size: 13.5, width: 470 }) + 3; });
    }
    pdf.end();
    return;
  }

  // ── about ─────────────────────────────────────────────────────────────
  if (on('about') && doc.about?.text) {
    slide({ dashes: false });
    panel(520, W - 520, 'What we do', doc.about.services || []);
    if (fs.existsSync(LOGO)) { pdf.roundedRect(556, 520, 200, 64, 8).fill('#fff'); try { pdf.image(LOGO, 566, 530, { fit: [180, 44] }); } catch (e) { /* ignore */ } }
    text('About', LEFT, 38, { size: 31, bold: true, width: 440 });
    text(company.name ? company.name.replace(/\s*(Pvt\.?|Private)\s*(Ltd\.?|Limited)\.?$/i, '') : 'Codigix Infotech', LEFT, 74, { size: 31, bold: true, width: 440 });
    text(doc.about.text, LEFT, 132, { size: 14, width: 440, lineGap: 5 });
    const stats = (doc.about.stats || []).slice(0, 4);
    if (stats.length) {
      const sw = 440 / stats.length; const sy = 500;
      stats.forEach((s, i) => {
        const x = LEFT + i * sw;
        if (i) pdf.moveTo(x - 6, sy - 6).lineTo(x - 6, sy + 76).lineWidth(0.8).strokeColor(NAVY).stroke();
        text(s.value, x, sy, { size: 34, bold: true, width: sw - 14 });
        text(s.label, x, sy + 46, { size: 9.5, bold: true, width: sw - 20 });
      });
    }
  }

  // ── executive summary ─────────────────────────────────────────────────
  if (on('summary') && (doc.summary?.text || doc.summary?.points?.length)) {
    slide({ dashes: false });
    const glance = (doc.options || []).filter(o => o.totals?.total > 0).map(o => ({ label: o.name, sub: o.totals.monthly ? `${rs(o.totals.base)} per month + GST` : `${rs(o.totals.base)} + GST` }));
    const wide = glance.length === 0;
    const tw = wide ? 760 : 440;
    if (!wide) panel(552, W - 552, 'At a glance', glance);
    let y = title('Executive Summary', 70, 44, 31) + 22;
    y = text(doc.summary.text, 70, y, { size: 14.5, width: tw, lineGap: 4 }) + 10;
    if (doc.summary.points?.length) y = bullets(doc.summary.points, 84, y + 4, tw - 20, 14.5, 7) + 10;
    if (doc.summary.closing) text(doc.summary.closing, 70, y + 8, { size: 14.5, width: tw, lineGap: 4 });
  }

  // ── overview list (modules / services) ────────────────────────────────
  if (on('overview') && (doc.overview?.items || []).length) {
    slide();
    let y = title(doc.overview.title || 'Overview', 64, 44, 30) + 10;
    if (doc.overview.intro) y = text(doc.overview.intro, 64, y, { size: 13.5, bold: true, width: 720 }) + 16;
    const items = doc.overview.items;
    const colsN = items.length > 24 ? 3 : items.length > 11 ? 2 : 1;
    const cw = 760 / colsN; const per = Math.ceil(items.length / colsN);
    for (let c = 0; c < colsN; c += 1) bullets(items.slice(c * per, (c + 1) * per), 80 + c * cw, y + 6, cw - 14, 15, 9);
  }

  // ── option pages: groups in columns, flowing onto more slides ─────────
  const optionGroups = (o) => {
    const groups = [];
    const lines = (o.lines || []).filter(l => Number(l.qty) !== 0 && l.name);
    if (lines.length) {
      groups.push({ title: o.billing === 'monthly' ? 'Delivered every month' : 'Included', items: lines.map(l => `${l.name}: ${l.qty}${l.unit ? ` ${l.unit}${Number(l.qty) === 1 ? '' : 's'}` : ''}`) });
    }
    (o.groups || []).forEach(g => { if (g.title || (g.items || []).length) groups.push(g); });
    if (lines.length && o.totals?.total > 0) {
      groups.push({ title: o.billing === 'monthly' ? 'Price per month' : 'Price', items: [...lines.map(l => `${l.name}: ${l.qty} × ${rs(l.rate)}${l.discountPct ? ` less ${l.discountPct}%` : ''} = ${rs(l.amount)}`), `Total before GST: ${rs(o.totals.base)}`, `GST ${o.totals.gstPct}%: ${rs(o.totals.gst)}`, `Total ${o.billing === 'monthly' ? 'per month ' : ''}with GST: ${rs(o.totals.total)}`] });
    }
    if (o.showScope !== false) {
      lines.forEach(l => { const sv = (doc.services || []).find(x => String(x.name).trim().toLowerCase() === String(l.name).trim().toLowerCase()); if (sv?.scope?.length) groups.push({ title: sv.name, items: sv.scope }); });
    }
    return groups;
  };
  if (on('options')) {
    (doc.options || []).forEach(o => {
      const groups = optionGroups(o);
      if (!groups.length && !o.intro) return;
      const COLS = 3; const colW = 268; const gapX = 24; const x0 = 40;
      let page = 0; let col = 0; let y = 0; let top = 0;
      const start = () => {
        slide(); page += 1; col = 0;
        let ty = title(page > 1 ? `${o.name} (continued)` : o.name, 40, 36, 28) + 6;
        if (page === 1 && o.intro) ty = text(o.intro, 40, ty, { size: 12.5, bold: true, width: 780 }) + 8;
        top = ty + 8; y = top;
      };
      const place = (h) => { if (y + h > BOTTOM) { col += 1; y = top; if (col >= COLS) { start(); } } };
      start();
      groups.forEach(g => {
        const items = (g.items || []).filter(i => String(i || '').trim());
        const first = (g.title ? hOf(g.title, 13, true, colW) + 6 : 0) + (items[0] ? hOf(items[0], 12, false, colW - 16) + 3 : 0);
        place(first);
        if (g.title) y = text(g.title, x0 + col * (colW + gapX), y, { size: 13, bold: true, width: colW }) + 6;
        items.forEach((it, i) => {
          const hh = hOf(it, 12, false, colW - 16) + 3;
          const before = col + page * 10;
          if (i > 0) place(hh);
          if (i > 0 && g.title && col + page * 10 !== before) y = text(`${g.title} (continued)`, x0 + col * (colW + gapX), y, { size: 11, bold: true, color: '#6b6396', width: colW }) + 4;
          const x = x0 + col * (colW + gapX);
          pdf.circle(x + 4, y + 7, 2).fill(INK);
          text(it, x + 16, y, { size: 12, width: colW - 16 });
          y += hh;
        });
        y += 14;
      });
    });
  }

  // ── budget & timeline ─────────────────────────────────────────────────
  if (on('budget') && (doc.options || []).length) {
    slide();
    const opts = doc.options;
    const big = opts.length <= 3;
    let y = title('Budget & Timeline', 70, 40, 30) + 18;
    opts.forEach((o, i) => {
      const t = o.totals || {};
      const cost = t.total > 0 ? (t.monthly ? `${rs(t.base)}/- per month` : `${rs(t.base)}/-`) : 'To be confirmed';
      const head = `${i + 1}. ${o.name} Cost: ${cost}${t.total > 0 ? ` (+ ${t.gstPct}% GST)` : ''}`;
      const sub = o.billing === 'monthly' ? `${o.months || 1} month${(o.months || 1) === 1 ? '' : 's'}${o.startMonth ? ` from ${o.startMonth}` : ''} · contract value ${rs(t.base * (o.months || 1))} + GST` : (o.deadline ? `Deadline: ${o.deadline}` : '');
      const hs = hOf(head, big ? 21 : 16, true, 740);
      const bh = hs + (sub ? (big ? 26 : 22) : 6) + 16;
      pdf.lineWidth(1.4).rect(70, y, 780, bh).strokeColor(RED).stroke();
      text(head, 86, y + 8, { size: big ? 21 : 16, bold: true, color: RED, width: 748 });
      if (sub) text(sub, 90, y + 8 + hs + 4, { size: big ? 15 : 13, bold: true, width: 740 });
      y += bh + (big ? 26 : 14);
    });
    const pay = doc.payment || {};
    const terms = [...(pay.milestones || []).map(m => `${m.pct}% ${m.name}.`), ...(pay.notes || [])].filter(Boolean);
    if (terms.length) {
      const termsH = terms.reduce((s, tt) => s + hOf(tt, 12.5, false, 730) + 5, 0);
      const bh = Math.min(termsH + 40, BOTTOM - y);
      pdf.lineWidth(1.4).rect(70, y + 6, 780, bh).strokeColor(RED).stroke();
      text('Payment Terms:', 86, y + 14, { size: 12.5, bold: true, width: 400 });
      let ty = y + 34;
      terms.forEach((tt, i) => { text(`${i + 1}.`, 92, ty, { size: 12.5, width: 20 }); ty = text(tt, 112, ty, { size: 12.5, width: 720 }) + 5; });
    }
  }

  // ── technology + post-deployment support ──────────────────────────────
  const hasTech = on('tech') && (doc.tech?.blocks || []).length;
  const hasSupport = on('support') && (doc.support?.items?.length || doc.support?.intro);
  if (hasTech || hasSupport) {
    slide();
    let y = 36;
    if (hasTech) {
      const blocks = doc.tech.blocks.slice(0, 4);
      pdf.rect(54, y, 840, 40).fill(NAVY);
      text(doc.tech.title || 'Technology Specifications:', 68, y + 11, { size: 14.5, bold: true, color: '#fff', width: 700 });
      y += 40;
      const bw = 840 / blocks.length;
      const bh = Math.max(...blocks.map(b => 22 + hOf(b.title, 12.5, true, bw - 24) + bulletsHeight(b.items, bw - 24, 12, 4))) + 6;
      pdf.lineWidth(2).rect(54, y, 840, bh).strokeColor(NAVY).stroke();
      blocks.forEach((b, i) => {
        const x = 54 + i * bw;
        if (i) pdf.moveTo(x, y).lineTo(x, y + bh).lineWidth(2).strokeColor(NAVY).stroke();
        const ty = text(b.title, x + 12, y + 12, { size: 12.5, bold: true, width: bw - 24 }) + 4;
        bullets(b.items, x + 12, ty, bw - 24, 12, 4);
      });
      y += bh + 34;
    }
    if (hasSupport) {
      const s = doc.support;
      pdf.rect(54, y, 840, 40).fill(NAVY);
      text(s.title || 'Post-Deployment Support', 68, y + 11, { size: 14.5, bold: true, color: '#fff', width: 700 });
      y += 40;
      const innerW = 800;
      const bh = 24 + (s.intro ? hOf(s.intro, 12.5, false, innerW) + 8 : 0) + bulletsHeight(s.items, innerW, 12.5, 5) + (s.footer ? hOf(s.footer, 12.5, false, innerW) + 14 : 0);
      pdf.lineWidth(2).rect(54, y, 840, Math.min(bh, BOTTOM - y)).strokeColor(NAVY).stroke();
      let ty = y + 14;
      if (s.intro) ty = text(s.intro, 68, ty, { size: 12.5, width: innerW }) + 8;
      ty = bullets(s.items, 74, ty, innerW - 20, 12.5, 5) + 6;
      if (s.footer) text(s.footer, 68, ty + 4, { size: 12.5, width: innerW });
    }
  }

  // ── AMC ───────────────────────────────────────────────────────────────
  if (on('amc') && ((doc.amc?.includes || []).length || doc.amc?.headline)) {
    const a = doc.amc;
    slide();
    pdf.rect(48, 28, 864, 38).fill(NAVY);
    text('Annual Maintenance Charges (AMC)', 62, 38, { size: 14.5, bold: true, color: '#fff', width: 700 });
    let y = 66;
    const two = (a.includes || []).length + (a.excludes || []).length > 16;
    const innerW = two ? 392 : 820;
    const headH = a.headline ? hOf(a.headline, 15, true, 820) + 26 : 12;
    const listH = (items) => bulletsHeight(items, innerW, 12, 4) + 28;
    const bh = Math.min(BOTTOM - y, headH + (two ? Math.max(listH(a.includes), listH(a.excludes)) : listH(a.includes) + listH(a.excludes)) + (a.footer ? hOf(a.footer, 12, false, 820) + 22 : 14));
    pdf.lineWidth(2).rect(48, y, 864, bh).strokeColor(NAVY).stroke();
    let ty = y + 16;
    if (a.headline) ty = text(a.headline, 62, ty, { size: 15, bold: true, width: 820 }) + 10;
    if (two) {
      const t0 = ty;
      text('Includes:', 62, t0, { size: 12.5, bold: true, width: 300 }); bullets(a.includes, 62, t0 + 22, innerW, 12, 4);
      text('Does not include:', 476, t0, { size: 12.5, bold: true, width: 300 }); ty = bullets(a.excludes, 476, t0 + 22, innerW, 12, 4);
      ty = Math.max(ty, t0 + 22 + bulletsHeight(a.includes, innerW, 12, 4));
    } else {
      text('Includes:', 62, ty, { size: 12.5, bold: true, width: 300 }); ty = bullets(a.includes, 62, ty + 22, innerW, 12, 4) + 4;
      if ((a.excludes || []).length) { text('Does not include:', 62, ty, { size: 12.5, bold: true, width: 300 }); ty = bullets(a.excludes, 62, ty + 22, innerW, 12, 4) + 4; }
    }
    if (a.footer) text(a.footer, 62, ty + 8, { size: 12, width: 820 });
  }

  // ── notes + thank you ─────────────────────────────────────────────────
  {
    slide({ dashes: false });
    const notes = (doc.notes || []).filter(Boolean);
    let y = 44;
    if (on('notes') && notes.length) {
      const size = notes.length > 9 ? 10.5 : 11.5;
      const nh = notes.reduce((s, n) => s + hOf(n, size, false, 780) + 4, 0) + 40;
      const bh = Math.min(nh, 380);
      pdf.lineWidth(1.6).rect(56, y, 848, bh).strokeColor(RED).stroke();
      text('Note:', 70, y + 10, { size: 12.5, bold: true, width: 200 });
      let ty = y + 30;
      notes.forEach((n, i) => { text(`${i + 1}.`, 76, ty, { size, width: 20 }); ty = text(n, 100, ty, { size, width: 780 }) + 4; });
      y += bh + 34;
    }
    for (let i = 0; i < 5; i += 1) { for (let k = 0; k < 13; k += 1) pdf.rect(56 + i * 176 + k * 5, y, 2.4, 14).fill(RED); }
    y += 34;
    pdf.save().rotate(-8, { origin: [120, y + 90] }).font('Helvetica-BoldOblique').fontSize(42).fillColor(RED).text('Thank You', 70, y + 70, { width: 300, lineBreak: false }).restore();
    const cx = 400;
    text(company.name || 'Codigix Infotech Pvt. Ltd.', cx, y + 44, { size: 24, bold: true, width: 500 });
    let cy = y + 84;
    [company.phones && `Contact: ${company.phones}`, company.email && `Email: ${company.email}`, company.website && `Website: ${company.website}`, company.address && `Address: ${company.address}`].filter(Boolean).forEach(l => { cy = text(l, cx, cy, { size: 13, width: 500 }) + 2; });
  }

  // page numbers on the content slides
  const range = pdf.bufferedPageRange();
  for (let i = 1; i < range.count; i += 1) {
    pdf.switchToPage(range.start + i);
    pdf.page.margins.bottom = 0;
    font(11, true, '#fff').text(String(i + 1), W - 70, H - 36, { width: 40, align: 'right', lineBreak: false });
  }
  pdf.end();
});

module.exports = { buildDeck, dateText, rs };

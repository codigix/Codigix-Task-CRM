const PDFDocument = require('pdfkit');
const path = require('path');
const { employeeInsights, employeeStats, SCORE_NOTE, GRADE_COLOR } = require('./performanceEmail');

/**
 * Performance reports as PDF, built on the server so the downloaded file and the emailed
 * attachment are the same. Same letterhead style as services/salesPdf.js.
 *
 *   buildEmployeePdf(row, range)  one person's report (what is emailed to them)
 *   buildTeamPdf(report)          summary + ranking of everyone, then one page per person (HR download)
 *
 * `row` is an employee row of buildTeamReport; `report` is the whole buildTeamReport result.
 * Like the email, it never shows the HR-only effort figures (services/effort.js).
 */

const LOGO = path.join(__dirname, '..', 'assets', 'codigix-logo.png');
const C = { ink: '#111827', muted: '#6b7280', line: '#e5e7eb', band: '#1e2b4a', accent: '#c81e1e', soft: '#f3f4f6', zebra: '#fafafa', good: '#059669', warn: '#d97706' };
const M = 40;

const toBuffer = (pdf) => new Promise((resolve, reject) => {
  const chunks = [];
  pdf.on('data', (c) => chunks.push(c));
  pdf.on('end', () => resolve(Buffer.concat(chunks)));
  pdf.on('error', reject);
});

const newDoc = (title) => new PDFDocument({ size: 'A4', margin: M, bufferPages: true, info: { Title: title, Author: 'Codigix CRM' } });

const header = (pdf, title, subtitle) => {
  const top = M;
  try { pdf.image(LOGO, M, top, { fit: [120, 40] }); } catch (e) { pdf.font('Helvetica-Bold').fontSize(16).fillColor(C.band).text('Codigix', M, top); }
  const w = pdf.page.width - M * 2;
  pdf.font('Helvetica-Bold').fontSize(16).fillColor(C.band).text(title, M, top + 2, { width: w, align: 'right' });
  pdf.font('Helvetica').fontSize(9).fillColor(C.muted).text(subtitle, M, top + 24, { width: w, align: 'right' });
  pdf.moveTo(M, top + 50).lineTo(pdf.page.width - M, top + 50).lineWidth(1).strokeColor(C.line).stroke();
  pdf.y = top + 62;
};

const footer = (pdf, text) => {
  const range = pdf.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    pdf.switchToPage(i);
    // The footer sits inside the bottom margin; without lifting it PDFKit would start a new page.
    const bottom = pdf.page.margins.bottom;
    pdf.page.margins.bottom = 0;
    const y = pdf.page.height - M + 12;
    pdf.font('Helvetica').fontSize(7.5).fillColor(C.muted)
      .text(text, M, y, { width: pdf.page.width - M * 2 - 60, lineBreak: false })
      .text(`Page ${i - range.start + 1} of ${range.count}`, pdf.page.width - M - 60, y, { width: 60, align: 'right', lineBreak: false });
    pdf.page.margins.bottom = bottom;
  }
};

const ensure = (pdf, needed) => { if (pdf.y + needed > pdf.page.height - M - 20) pdf.addPage(); };

const generatedOn = () => new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

/** One employee's report from the current pdf.y (used alone, and as a page of the team PDF). */
const employeeSection = (pdf, row, range) => {
  const w = pdf.page.width - M * 2;
  // Name
  pdf.font('Helvetica-Bold').fontSize(15).fillColor(C.ink).text(row.name || 'Employee', M, pdf.y, { width: w });
  pdf.font('Helvetica').fontSize(9).fillColor(C.muted).text([row.role, row.department, row.email].filter(Boolean).join('  ·  '), M, pdf.y + 2, { width: w });
  pdf.moveDown(0.8);

  // Score + rank boxes
  const boxY = pdf.y; const boxW = (w - 12) / 2; const boxH = 62;
  const gradeColor = GRADE_COLOR[row.grade] || C.muted;
  [[M, 'SCORE', row.score == null ? '—' : `${row.score} / 100`, row.grade || 'Not enough data', gradeColor],
    [M + boxW + 12, 'TEAM RANK', row.rank ? `#${row.rank}` : '—', row.rank ? `of ${row.rankedOutOf} ranked` : 'Not ranked this period', C.ink]]
    .forEach(([x, label, big, small, color]) => {
      pdf.roundedRect(x, boxY, boxW, boxH, 4).fillAndStroke(C.soft, C.line);
      pdf.font('Helvetica-Bold').fontSize(7.5).fillColor(C.muted).text(label, x, boxY + 9, { width: boxW, align: 'center', characterSpacing: 0.5 });
      pdf.font('Helvetica-Bold').fontSize(20).fillColor(color).text(big, x, boxY + 20, { width: boxW, align: 'center' });
      pdf.font('Helvetica-Bold').fontSize(9).fillColor(color).text(small, x, boxY + 44, { width: boxW, align: 'center' });
    });
  pdf.y = boxY + boxH + 14;

  // Figures
  pdf.font('Helvetica-Bold').fontSize(10.5).fillColor(C.band).text(`Figures for ${range?.label || 'the period'}`, M, pdf.y);
  pdf.moveDown(0.4);
  employeeStats(row).forEach(([k, v], i) => {
    ensure(pdf, 20);
    const y = pdf.y;
    if (i % 2 === 0) pdf.rect(M, y, w, 18).fill(C.zebra);
    pdf.font('Helvetica').fontSize(9).fillColor(C.muted).text(k, M + 8, y + 5, { width: w * 0.48 });
    pdf.font('Helvetica-Bold').fontSize(9).fillColor(C.ink).text(String(v), M + w * 0.5, y + 5, { width: w * 0.48 });
    pdf.y = y + 18;
  });
  pdf.moveDown(0.8);

  // What went well / to work on
  const { strengths, attention } = employeeInsights(row);
  [['What went well', strengths, C.good], ['To work on', attention, C.warn]].forEach(([title, items, color]) => {
    ensure(pdf, 40);
    pdf.font('Helvetica-Bold').fontSize(10.5).fillColor(color).text(title, M, pdf.y);
    pdf.moveDown(0.3);
    if (!items.length) pdf.font('Helvetica').fontSize(9).fillColor(C.muted).text('Nothing to note.', M + 8, pdf.y, { width: w - 8 });
    items.forEach(t => { ensure(pdf, 16); pdf.font('Helvetica').fontSize(9).fillColor(C.ink).text(`•  ${t}`, M + 8, pdf.y, { width: w - 8 }); pdf.moveDown(0.2); });
    pdf.moveDown(0.7);
  });

  ensure(pdf, 40);
  pdf.font('Helvetica').fontSize(8).fillColor(C.muted).text(SCORE_NOTE, M, pdf.y, { width: w });
};

const buildEmployeePdf = async (row, range) => {
  const pdf = newDoc(`Performance report – ${row.name} – ${range?.label || ''}`);
  const done = toBuffer(pdf);
  header(pdf, 'PERFORMANCE REPORT', `${range?.label || ''}  ·  Generated ${generatedOn()}`);
  employeeSection(pdf, row, range);
  footer(pdf, `Codigix CRM · Performance report · ${row.name} · ${range?.label || ''} · Confidential`);
  pdf.end();
  return done;
};

const buildTeamPdf = async (report, { department } = {}) => {
  const range = report.range;
  const pdf = newDoc(`Team performance report – ${range?.label || ''}`);
  const done = toBuffer(pdf);
  const w = pdf.page.width - M * 2;
  header(pdf, 'TEAM PERFORMANCE REPORT', `${range?.label || ''}${department ? `  ·  ${department}` : ''}  ·  Generated ${generatedOn()}`);

  // Team figures
  const t = report.team || {};
  const tiles = [
    ['Employees', t.employees], ['Active contributors', t.activeContributors], ['Tasks completed', t.tasksCompleted],
    ['Finished on time', t.onTimeRate == null ? '—' : `${t.onTimeRate}%`], ['Overdue now', t.overdueOpen], ['Hours logged', t.hoursLogged == null ? '—' : `${t.hoursLogged} h`],
    ['Meetings', t.meetings], ['Average score', t.avgScore == null ? '—' : t.avgScore], ['Avg start-to-finish', t.avgCycleDays == null ? '—' : `${t.avgCycleDays} d`]
  ];
  const tileW = (w - 16) / 3; const tileH = 44; let ty = pdf.y;
  tiles.forEach(([label, value], i) => {
    const x = M + (i % 3) * (tileW + 8); if (i % 3 === 0 && i) ty += tileH + 8;
    pdf.roundedRect(x, ty, tileW, tileH, 4).fillAndStroke(C.soft, C.line);
    pdf.font('Helvetica').fontSize(8).fillColor(C.muted).text(label, x + 10, ty + 8, { width: tileW - 20 });
    pdf.font('Helvetica-Bold').fontSize(14).fillColor(C.ink).text(String(value ?? '—'), x + 10, ty + 21, { width: tileW - 20 });
  });
  pdf.y = ty + tileH + 14;
  const grades = (t.gradeCounts || []).filter(g => g.count).map(g => `${g.grade}: ${g.count}`).join('   ·   ');
  if (grades) { pdf.font('Helvetica').fontSize(9).fillColor(C.muted).text(`Grades  —  ${grades}`, M, pdf.y, { width: w }); pdf.moveDown(0.8); }

  // Ranking table
  pdf.font('Helvetica-Bold').fontSize(10.5).fillColor(C.band).text('Ranking', M, pdf.y);
  pdf.moveDown(0.4);
  const cols = [
    { h: '#', w: 24, v: r => (r.rank ? `#${r.rank}` : '—') },
    { h: 'Employee', w: 140, v: r => r.name },
    { h: 'Department', w: 92, v: r => String(r.department || '').replace(/\s*department\s*$/i, '') },
    { h: 'Score', w: 74, v: r => (r.score == null ? '—' : `${r.score} ${r.grade}`) },
    { h: 'Done', w: 34, v: r => r.metrics.tasksCompleted },
    { h: 'On time', w: 42, v: r => (r.metrics.onTimeRate == null ? '—' : `${r.metrics.onTimeRate}%`) },
    { h: 'Overdue', w: 42, v: r => r.metrics.overdueOpen },
    { h: 'Hours', w: 36, v: r => r.metrics.hoursLogged ?? 0 },
    { h: 'Meet.', w: 30, v: r => r.metrics.meetings }
  ];
  const drawHead = () => {
    const y = pdf.y; let x = M;
    pdf.rect(M, y, w, 18).fill(C.band);
    cols.forEach(c => { pdf.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff').text(c.h, x + 4, y + 5, { width: c.w - 6, lineBreak: false }); x += c.w; });
    pdf.y = y + 18;
  };
  drawHead();
  (report.employees || []).forEach((r, i) => {
    if (pdf.y + 18 > pdf.page.height - M - 20) { pdf.addPage(); drawHead(); }
    const y = pdf.y; let x = M;
    if (i % 2 === 0) pdf.rect(M, y, w, 18).fill(C.zebra);
    cols.forEach(c => {
      const color = c.h === 'Score' ? (GRADE_COLOR[r.grade] || C.ink) : C.ink;
      pdf.font(c.h === 'Employee' ? 'Helvetica-Bold' : 'Helvetica').fontSize(8).fillColor(color).text(String(c.v(r) ?? ''), x + 4, y + 5, { width: c.w - 6, lineBreak: false, ellipsis: true });
      x += c.w;
    });
    pdf.y = y + 18;
  });

  // One page per person who has something recorded
  const { hasActivity } = require('./performanceEmail');
  (report.employees || []).filter(hasActivity).forEach(r => {
    pdf.addPage();
    header(pdf, 'PERFORMANCE REPORT', `${range?.label || ''}  ·  Generated ${generatedOn()}`);
    employeeSection(pdf, r, range);
  });

  footer(pdf, `Codigix CRM · Team performance report · ${range?.label || ''} · Confidential`);
  pdf.end();
  return done;
};

const pdfFileName = (label, who) => `Performance-${String(who || 'Team').replace(/[^\w]+/g, '-')}-${String(label || '').replace(/[^\w]+/g, '-')}.pdf`.replace(/-+/g, '-');

module.exports = { buildEmployeePdf, buildTeamPdf, pdfFileName };

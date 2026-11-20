/**
 * Downloadable performance reports (real PDF files, vector text, several pages).
 *
 *   downloadTeamPdf(data)       whole team / department for the chosen period (landscape A4)
 *   downloadEmployeePdf(data)   one employee in full (portrait A4)
 *
 * `data` is exactly what the on-screen report was built from, so the file always matches it.
 */
import { jsPDF } from 'jspdf';
import { weeklyRows, qualityScoreOf, improvementAreasOf, splitLines, planReviewOf } from './performanceShared';

/* ───────────── palette & formatting ───────────── */

const C = {
  navy: [30, 43, 74], red: [220, 38, 38], blue: [42, 120, 214], lightBlue: [169, 209, 247],
  green: [21, 128, 61], amber: [180, 83, 9], purple: [109, 40, 217],
  ink: [17, 24, 39], text: [55, 65, 81], muted: [107, 114, 128], line: [229, 231, 235], soft: [248, 250, 252],
  white: [255, 255, 255]
};
const GRADE = { Excellent: C.green, Good: C.blue, Fair: C.amber, 'Needs attention': C.red, 'Not enough data': C.muted };
const TONE = { amber: C.amber, red: C.red, purple: C.purple };

const num = (v, suffix = '') => (v == null || Number.isNaN(v) ? '—' : `${v}${suffix}`);
const date = (v) => (v ? new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const stamp = () => new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const safeName = (s) => String(s || 'report').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
const hm = (h) => {
  const mins = Math.round((Number(h) || 0) * 60);
  if (!mins) return '0h';
  const H = Math.floor(mins / 60); const M = mins % 60;
  return H && M ? `${H}h ${M}m` : H ? `${H}h` : `${M}m`;
};

/* ───────────── layout toolkit ───────────── */

const create = (orientation, title, period) => {
  const doc = new jsPDF({ orientation, unit: 'pt', format: 'a4', compress: true });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  return { doc, W, H, m: 36, top: 52, bottom: 38, y: 0, title, period, firstPage: true };
};
const inner = (c) => c.W - c.m * 2;
const fill = (c, col) => c.doc.setFillColor(...col);
const stroke = (c, col, w = 0.6) => { c.doc.setDrawColor(...col); c.doc.setLineWidth(w); };
const ink = (c, col, size, style = 'normal') => { c.doc.setTextColor(...col); c.doc.setFontSize(size); c.doc.setFont('helvetica', style); };

/** Cut text to a width, ending with an ellipsis. */
const fit = (c, text, w) => {
  const t = String(text ?? '');
  if (c.doc.getTextWidth(t) <= w) return t;
  let s = t;
  while (s.length > 1 && c.doc.getTextWidth(`${s}…`) > w) s = s.slice(0, -1);
  return `${s.trimEnd()}…`;
};

const pageHeader = (c) => {
  ink(c, C.muted, 8);
  c.doc.text(c.title, c.m, 24);
  c.doc.text(c.period, c.W - c.m, 24, { align: 'right' });
  stroke(c, C.line); c.doc.line(c.m, 30, c.W - c.m, 30);
  c.y = c.top;
};

const ensure = (c, need) => {
  if (c.y + need <= c.H - c.bottom) return false;
  c.doc.addPage();
  pageHeader(c);
  return true;
};

const footers = (c) => {
  const n = c.doc.getNumberOfPages();
  for (let i = 1; i <= n; i += 1) {
    c.doc.setPage(i);
    stroke(c, C.line); c.doc.line(c.m, c.H - 28, c.W - c.m, c.H - 28);
    ink(c, C.muted, 7.5);
    c.doc.text(`Codigix Infotech  ·  Performance report  ·  Confidential  ·  Generated ${stamp()}`, c.m, c.H - 17);
    c.doc.text(`Page ${i} of ${n}`, c.W - c.m, c.H - 17, { align: 'right' });
  }
};

/** Dark title band on the first page. */
const banner = (c, { title, subtitle, right, rightSub }) => {
  const h = 78;
  fill(c, C.navy); c.doc.rect(0, 0, c.W, h, 'F');
  fill(c, C.red); c.doc.rect(0, 0, 7, h, 'F');
  ink(c, C.white, 20, 'bold'); c.doc.text(title, c.m + 6, 34);
  ink(c, [203, 213, 225], 10); c.doc.text(subtitle, c.m + 6, 53);
  if (right) { ink(c, C.white, 13, 'bold'); c.doc.text(right, c.W - c.m, 34, { align: 'right' }); }
  if (rightSub) { ink(c, [203, 213, 225], 9); c.doc.text(rightSub, c.W - c.m, 53, { align: 'right' }); }
  c.y = h + 16;
};

const section = (c, title, sub) => {
  ensure(c, 44);
  if (c.y > c.top + 4) c.y += 8;
  fill(c, C.blue); c.doc.roundedRect(c.m, c.y - 9, 4, 12, 1, 1, 'F');
  ink(c, C.ink, 12, 'bold'); c.doc.text(title, c.m + 10, c.y);
  if (sub) { ink(c, C.muted, 8); c.doc.text(fit(c, sub, inner(c) - 10), c.m + 10, c.y + 11); c.y += 24; } else c.y += 14;
};

/** A row of summary tiles with a coloured top edge. items: [{ label, value, hint, color }] */
const tiles = (c, items, { perRow = items.length, h = 54, valueSize = 17 } = {}) => {
  const gap = 8;
  const w = (inner(c) - gap * (perRow - 1)) / perRow;
  items.forEach((it, i) => {
    const row = Math.floor(i / perRow);
    if (i % perRow === 0) ensure(c, h + 6);
    const x = c.m + (i % perRow) * (w + gap);
    const y = c.y + (i % perRow === 0 ? 0 : 0);
    fill(c, C.white); stroke(c, C.line); c.doc.roundedRect(x, y, w, h, 4, 4, 'FD');
    fill(c, it.color || C.blue); c.doc.roundedRect(x, y, w, 3, 1.5, 1.5, 'F');
    ink(c, C.muted, 7); c.doc.text(String(it.label).toUpperCase(), x + 8, y + 14);
    ink(c, it.color && it.color !== C.blue ? it.color : C.ink, valueSize, 'bold'); c.doc.text(fit(c, it.value, w - 14), x + 8, y + 33);
    if (it.hint) { ink(c, C.muted, 7); c.doc.text(fit(c, it.hint, w - 14), x + 8, y + 46); }
    if (i % perRow === perRow - 1 || i === items.length - 1) c.y += h + (row < Math.ceil(items.length / perRow) - 1 ? gap : 0);
  });
  c.y += 12;
};

/**
 * Table with a repeating header. cols: [{ label, w (share of the width), align, get(row), color?(row), bold? }]
 * Returns nothing; moves c.y below the table.
 */
const table = (c, { cols, rows, rowH = 17, size = 8, empty = 'Nothing to show.' }) => {
  const total = cols.reduce((s, k) => s + k.w, 0);
  const width = inner(c);
  const xs = []; let acc = c.m;
  cols.forEach(k => { xs.push(acc); acc += (k.w / total) * width; });
  const cw = (i) => (cols[i].w / total) * width;
  const cellX = (i) => (cols[i].align === 'right' ? xs[i] + cw(i) - 6 : cols[i].align === 'center' ? xs[i] + cw(i) / 2 : xs[i] + 6);

  const head = () => {
    ensure(c, rowH * 2);
    fill(c, C.navy); c.doc.rect(c.m, c.y, width, rowH + 3, 'F');
    ink(c, C.white, size - 0.5, 'bold');
    cols.forEach((k, i) => c.doc.text(fit(c, k.label, cw(i) - 8), cellX(i), c.y + rowH / 2 + 3.5, { align: k.align || 'left' }));
    c.y += rowH + 3;
  };
  if (!rows.length) {
    ink(c, C.muted, 9); c.doc.text(empty, c.m + 4, c.y + 4); c.y += 20; return;
  }
  head();
  rows.forEach((r, ri) => {
    if (c.y + rowH > c.H - c.bottom) { c.doc.addPage(); pageHeader(c); head(); }
    if (ri % 2 === 1) { fill(c, C.soft); c.doc.rect(c.m, c.y, width, rowH, 'F'); }
    cols.forEach((k, i) => {
      const col = (k.color && k.color(r)) || C.text;
      ink(c, col, size, k.bold ? 'bold' : 'normal');
      c.doc.text(fit(c, k.get(r), cw(i) - 10), cellX(i), c.y + rowH / 2 + 3, { align: k.align || 'left' });
    });
    stroke(c, C.line, 0.3); c.doc.line(c.m, c.y + rowH, c.m + width, c.y + rowH);
    c.y += rowH;
  });
  c.y += 10;
};

/** Small coloured pill. Returns its width. */
const pill = (c, text, x, y, col, size = 7.5) => {
  ink(c, col, size, 'bold');
  const w = c.doc.getTextWidth(text) + 12;
  fill(c, col.map(v => Math.round(v + (255 - v) * 0.88))); // light tint of the colour
  c.doc.roundedRect(x, y - 9, w, 13, 6.5, 6.5, 'F');
  ink(c, col, size, 'bold'); c.doc.text(text, x + 6, y);
  return w;
};

/** Grouped bar chart. series: [{ name, color, values }]; labels: x labels. */
const barChart = (c, { x, y, w, h, labels, series, title, unit = '' }) => {
  const doc = c.doc;
  fill(c, C.white); stroke(c, C.line); doc.roundedRect(x, y, w, h, 4, 4, 'FD');
  ink(c, C.ink, 9, 'bold'); doc.text(title, x + 10, y + 15);
  if (series.length > 1) {
    let lx = x + w - 10;
    [...series].reverse().forEach(s => {
      ink(c, C.muted, 7.5); const tw = doc.getTextWidth(s.name); lx -= tw;
      doc.text(s.name, lx, y + 15); lx -= 10; fill(c, s.color); doc.rect(lx, y + 9, 7, 7, 'F'); lx -= 12;
    });
  }
  const px = x + 30; const py = y + 28; const pw = w - 40; const ph = h - 28 - 24;
  const max = Math.max(1, ...series.flatMap(s => s.values.map(v => v || 0)));
  const step = max <= 5 ? 1 : max <= 10 ? 2 : max <= 25 ? 5 : max <= 50 ? 10 : max <= 100 ? 20 : Math.pow(10, Math.floor(Math.log10(max)));
  const top = Math.ceil(max / step) * step;
  stroke(c, C.line, 0.4); ink(c, C.muted, 7);
  for (let v = 0; v <= top; v += step) {
    const gy = py + ph - (v / top) * ph;
    doc.line(px, gy, px + pw, gy);
    doc.text(String(v), px - 4, gy + 2.5, { align: 'right' });
  }
  const n = labels.length;
  const slot = pw / Math.max(1, n);
  const barW = Math.min(26, (slot * 0.7) / series.length);
  labels.forEach((lab, i) => {
    const cx = px + slot * i + slot / 2;
    series.forEach((s, si) => {
      const v = s.values[i] || 0;
      const bh = (v / top) * ph;
      const bx = cx - (barW * series.length) / 2 + si * barW;
      fill(c, s.color); if (bh > 0) doc.rect(bx, py + ph - bh, barW - 1.5, bh, 'F');
      if (v > 0) { ink(c, C.text, 6.5); doc.text(`${Math.round(v * 10) / 10}`, bx + (barW - 1.5) / 2, py + ph - bh - 2.5, { align: 'center' }); }
    });
    const crowded = slot < 40;
    ink(c, C.muted, crowded ? 6.5 : 7); doc.text(fit(c, crowded ? String(lab).split(' ')[0].slice(0, 3) : lab, slot - 2), cx, py + ph + 11, { align: 'center' });
  });
  if (unit) { ink(c, C.muted, 7); doc.text(unit, x + w - 10, y + h - 6, { align: 'right' }); }
};

/** A box with a left accent bar and wrapped text. Returns its height. */
const noteHeight = (c, w, text) => 22 + c.doc.splitTextToSize(String(text), w - 20).length * 10 + 4;
const noteBox = (c, { x, y, w, title, text, color }) => {
  const lines = c.doc.splitTextToSize(String(text), w - 20);
  const h = noteHeight(c, w, text);
  fill(c, C.white); stroke(c, C.line); c.doc.roundedRect(x, y, w, h, 3, 3, 'FD');
  fill(c, color); c.doc.rect(x, y, 3.5, h, 'F');
  ink(c, C.ink, 9, 'bold'); c.doc.text(title, x + 11, y + 14);
  ink(c, C.text, 8); c.doc.text(lines, x + 11, y + 26);
  return h;
};

const bullets = (c, items, x, y, w, size = 8.5) => {
  let yy = y;
  items.forEach(t => {
    const lines = c.doc.splitTextToSize(t, w - 10);
    ink(c, C.text, size); c.doc.text('•', x, yy); c.doc.text(lines, x + 8, yy);
    yy += lines.length * (size + 3) + 2;
  });
  return yy - y;
};

const WEIGHT_LABELS = {
  output: 'Effort delivered vs hours available', utilisation: 'Hours recorded vs hours available', onTime: 'On-time delivery',
  engagement: 'Days active vs working days', review: 'Manager review score', efficiency: 'Plan efficiency (information only)'
};

const scoreExplainer = (c, weights) => {
  ensure(c, 96);
  section(c, 'How the score is calculated', 'Every figure comes from recorded work: tickets, status history, work logs, meetings and reviews.');
  const parts = Object.entries(weights || {}).map(([k, w]) => `${WEIGHT_LABELS[k] || k}: ${w}`);
  ink(c, C.text, 8.5);
  const lines = c.doc.splitTextToSize(
    `The score (0–100) measures work, not ticket counts: each finished task is worth the standard size of its kind of work, adjusted for priority and quality (deadline, rework, review). Parts of the score and their weights — ${parts.join(' · ')}. Parts with no data are left out and the rest re-weighted. Grades: 85+ Excellent · 70+ Good · 50+ Fair · below 50 Needs attention.`,
    inner(c));
  ensure(c, lines.length * 11 + 6);
  c.doc.text(lines, c.m, c.y);
  c.y += lines.length * 11 + 8;
};

/* ───────────── whole team ───────────── */

export const downloadTeamPdf = (data, { department } = {}) => {
  const t = data.team;
  const c = create('landscape', 'Employee Performance Report', data.range.label);
  const scope = department && department !== 'All' ? department : 'All departments';
  banner(c, {
    title: 'Employee Performance Report',
    subtitle: `Team overview  ·  ${scope}  ·  ${t.employees} employee${t.employees === 1 ? '' : 's'}`,
    right: `Report period: ${data.range.label}`,
    rightSub: `Generated ${stamp()}`
  });

  tiles(c, [
    { label: 'Employees', value: String(t.employees), hint: `${t.activeContributors} with recorded work` },
    { label: 'Average score', value: t.avgScore != null ? `${t.avgScore}/100` : '—', hint: 'scored employees', color: C.green },
    { label: 'Tasks completed', value: String(t.tasksCompleted), hint: `of ${t.tasksAssigned} assigned` },
    { label: 'On-time delivery', value: num(t.onTimeRate, '%'), hint: `${t.overdueOpen} overdue now`, color: t.onTimeRate != null && t.onTimeRate < 70 ? C.red : C.blue },
    { label: 'Hours logged', value: `${t.hoursLogged} h`, hint: `${num(t.utilisation, '%')} of available` },
    { label: 'Effort delivered', value: `${t.effortHours} h`, hint: 'standard-size hours' },
    { label: 'Speed vs standard', value: num(t.speedVsStandard, '%'), hint: '100% = as long as standard' },
    { label: 'Meetings', value: String(t.meetings), hint: `${t.meetingHours} h in meetings` }
  ], { perRow: 8, h: 54, valueSize: 15 });

  // Grade spread + leaders, side by side
  ensure(c, 150);
  const gap = 12; const half = (inner(c) - gap) / 2; const topY = c.y;
  fill(c, C.white); stroke(c, C.line); c.doc.roundedRect(c.m, topY, half, 128, 4, 4, 'FD');
  ink(c, C.ink, 10, 'bold'); c.doc.text('Grade spread', c.m + 12, topY + 17);
  ink(c, C.muted, 8); c.doc.text(t.avgScore != null ? `Team average score ${t.avgScore}` : 'No one has a score yet', c.m + 12, topY + 29);
  const totalG = Math.max(1, t.gradeCounts.reduce((s, g) => s + g.count, 0));
  let bx = c.m + 12; const barW = half - 24;
  t.gradeCounts.forEach(g => { const w = (g.count / totalG) * barW; if (w > 0) { fill(c, GRADE[g.grade]); c.doc.rect(bx, topY + 38, w, 14, 'F'); bx += w; } });
  t.gradeCounts.forEach((g, i) => {
    const ly = topY + 70 + i * 11;
    fill(c, GRADE[g.grade]); c.doc.rect(c.m + 12, ly - 6, 7, 7, 'F');
    ink(c, C.text, 8.5); c.doc.text(g.grade, c.m + 24, ly);
    ink(c, C.ink, 8.5, 'bold'); c.doc.text(String(g.count), c.m + half - 14, ly, { align: 'right' });
  });

  const lx = c.m + half + gap;
  fill(c, C.white); stroke(c, C.line); c.doc.roundedRect(lx, topY, half, 128, 4, 4, 'FD');
  ink(c, C.ink, 10, 'bold'); c.doc.text('Best records this period', lx + 12, topY + 17);
  const L = data.leaders || {};
  const leaders = [
    ['Most tasks completed', L.mostCompleted, (v) => `${v} tasks`], ['Best on-time rate', L.bestOnTime, (v) => `${v}%`],
    ['Most effort delivered', L.mostEffort, (v) => `${v} h`], ['Most hours logged', L.mostHours, (v) => `${v} h`],
    ['Most active days', L.mostActiveDays, (v) => `${v} days`], ['Quickest vs standard', L.bestSpeed, (v) => `${v}%`]
  ];
  leaders.forEach(([label, who, f], i) => {
    const col = i % 2; const row = Math.floor(i / 2);
    const x = lx + 12 + col * (half / 2 - 4); const y = topY + 36 + row * 30;
    ink(c, C.muted, 7.5); c.doc.text(label, x, y);
    ink(c, C.ink, 9, 'bold'); c.doc.text(who ? fit(c, `${who.name}`, half / 2 - 70) : '—', x, y + 11);
    if (who) { ink(c, C.blue, 9, 'bold'); c.doc.text(f(who.value), x + half / 2 - 18, y + 11, { align: 'right' }); }
  });
  c.y = topY + 128 + 14;

  // Monthly trend
  const months = (data.monthly || []).slice(-12);
  if (months.length) {
    ensure(c, 150);
    const w2 = (inner(c) - gap) / 2;
    const y0 = c.y;
    barChart(c, { x: c.m, y: y0, w: w2, h: 132, title: 'Tasks completed per month', labels: months.map(m => m.label), series: [{ name: 'Tasks', color: C.blue, values: months.map(m => m.tasksCompleted) }] });
    barChart(c, { x: c.m + w2 + gap, y: y0, w: w2, h: 132, title: 'Hours logged per month', labels: months.map(m => m.label), series: [{ name: 'Hours', color: C.green, values: months.map(m => m.hoursLogged) }], unit: 'h' });
    c.y = y0 + 132 + 14;
  }

  // Employees
  section(c, `Employees (${data.employees.length})`, 'Ranked by score. Score is 0–100; grade bands: 85+ Excellent · 70+ Good · 50+ Fair · below 50 Needs attention.');
  table(c, {
    size: 7.8, rowH: 18,
    cols: [
      { label: '#', w: 3, align: 'center', get: r => (r.rank != null ? String(r.rank) : '—') },
      { label: 'Employee', w: 17, bold: true, get: r => r.name, color: () => C.ink },
      { label: 'Role / department', w: 18, get: r => `${r.role} · ${String(r.department).replace(/s*department$/i, '')}` },
      { label: 'Score', w: 6, align: 'center', bold: true, get: r => (r.score != null ? String(r.score) : '—'), color: r => GRADE[r.grade] || C.muted },
      { label: 'Grade', w: 9, align: 'center', get: r => r.grade, color: r => GRADE[r.grade] || C.muted },
      { label: 'Tasks done', w: 7, align: 'center', get: r => `${r.metrics.tasksCompleted}/${r.metrics.tasksAssigned}` },
      { label: 'On-time', w: 6, align: 'center', get: r => num(r.metrics.onTimeRate, '%'), color: r => (r.metrics.onTimeRate != null && r.metrics.onTimeRate < 60 ? C.red : C.text) },
      { label: 'Hours', w: 5, align: 'center', get: r => num(r.metrics.hoursLogged) },
      { label: 'Effort h', w: 6, align: 'center', get: r => num(r.metrics.effortHours) },
      { label: 'Effort / avail.', w: 7, align: 'center', get: r => num(r.metrics.productivity, '%') },
      { label: 'Speed', w: 5.5, align: 'center', get: r => num(r.metrics.speedVsStandard, '%') },
      { label: 'Meet.', w: 4.5, align: 'center', get: r => String(r.metrics.meetings) },
      { label: 'Active d.', w: 5, align: 'center', get: r => String(r.metrics.activeDays) },
      { label: 'Overdue', w: 5, align: 'center', get: r => String(r.metrics.overdueOpen), color: r => (r.metrics.overdueOpen > 0 ? C.red : C.text) }
    ],
    rows: data.employees
  });

  // Needs attention
  const flagged = data.employees.filter(r => (r.insights?.attention || []).length).slice(0, 12);
  if (flagged.length) {
    section(c, 'Needs attention', 'What the recorded numbers point at, per person. These are conversation starters, not verdicts.');
    flagged.forEach(r => {
      const first = r.insights.attention.slice(0, 2);
      const text = first.join('  ');
      const h = noteHeight(c, inner(c), text);
      ensure(c, h + 6);
      noteBox(c, { x: c.m, y: c.y, w: inner(c), title: `${r.name} — ${num(r.score)}${r.score != null ? '/100' : ''} · ${r.grade}`, text, color: GRADE[r.grade] || C.red });
      c.y += h + 8;
    });
  }

  scoreExplainer(c, data.scoreWeights);
  footers(c);
  c.doc.save(`Performance-Report-Team-${safeName(data.range.label)}${department && department !== 'All' ? `-${safeName(department)}` : ''}.pdf`);
};

/* ───────────── one employee ───────────── */

export const downloadEmployeePdf = (data) => {
  const e = data.employee; const m = data.metrics;
  const c = create('portrait', `Performance report — ${e.name}`, data.range.label);
  banner(c, {
    title: e.name,
    subtitle: `${e.role}  ·  ${e.department}  ·  Joined ${date(e.joinedAt)}`,
    right: `Report period: ${data.range.label}`,
    rightSub: data.rank ? `Rank #${data.rank} of ${data.rankedOutOf} in ${e.department}` : 'Not ranked this period'
  });

  // Score badge
  const gcol = GRADE[data.grade] || C.muted;
  fill(c, C.white); stroke(c, C.line); c.doc.roundedRect(c.m, c.y, inner(c), 56, 5, 5, 'FD');
  fill(c, gcol); c.doc.roundedRect(c.m, c.y, 5, 56, 2, 2, 'F');
  const scoreText = data.score != null ? String(data.score) : '—';
  ink(c, gcol, 30, 'bold'); c.doc.text(scoreText, c.m + 22, c.y + 38);
  const scoreW = c.doc.getTextWidth(scoreText);
  ink(c, C.muted, 11); c.doc.text('/ 100', c.m + 22 + scoreW + 5, c.y + 38);
  ink(c, C.ink, 12, 'bold'); c.doc.text('Overall performance score', c.m + 150, c.y + 24);
  pill(c, data.grade, c.m + 150, c.y + 42, gcol, 9);
  const avg = data.teamAverage?.score;
  ink(c, C.muted, 8.5);
  c.doc.text(avg != null ? `${e.department} average ${avg}${data.score != null ? `  ·  ${data.score >= avg ? '+' : ''}${data.score - avg} vs average` : ''}` : 'No department average yet', c.W - c.m - 12, c.y + 34, { align: 'right' });
  c.y += 56 + 14;

  tiles(c, [
    { label: 'Tasks completed', value: String(m.tasksCompleted), hint: `of ${m.tasksAssigned} assigned` },
    { label: 'On-time delivery', value: num(m.onTimeRate, '%'), hint: `${m.onTimeCompleted} on time · ${m.lateCompleted} late`, color: C.green },
    { label: 'Quality score', value: num(qualityScoreOf(m), '%'), hint: m.reopened ? `${m.reopened} reopened` : 'none reopened', color: C.amber },
    { label: 'Effort points', value: String(m.pointsEarned), hint: m.pointsPossible ? `of ${m.pointsPossible} possible · ${m.effortQuality}%` : 'from finished tasks', color: C.purple },
    { label: 'Hours logged', value: `${m.hoursLogged || 0} h`, hint: `${num(m.utilisation, '%')} of ${m.availableHours} h available` }
  ], { perRow: 5, h: 54, valueSize: 16 });

  // Secondary figures
  tiles(c, [
    { label: 'Effort delivered', value: `${m.effortHours || 0} h`, hint: m.tasksCompleted ? `~${m.avgEffortPerTask} h per task` : '—' },
    { label: 'Effort / available', value: num(m.productivity, '%'), hint: 'standard-size hours' },
    { label: 'Avg days / task', value: num(m.avgCycleDays), hint: m.fastestCycleDays != null ? `fastest ${m.fastestCycleDays} d` : 'start to done' },
    { label: 'Speed vs standard', value: num(m.speedVsStandard, '%'), hint: '100% = standard' },
    { label: 'Meetings', value: String(m.meetings), hint: `${m.meetingHours || 0} h` },
    { label: 'Active days', value: String(m.activeDays), hint: `of ${m.workingDays} working days` },
    { label: 'Overdue now', value: String(m.overdueOpen), hint: 'open past due', color: m.overdueOpen ? C.red : C.blue },
    { label: 'Rescheduled', value: String(m.reschedules || 0), hint: m.reschedules ? `+${m.postponedDays} days` : 'none moved' }
  ], { perRow: 4, h: 50, valueSize: 14 });

  // Score breakdown
  section(c, 'Performance score breakdown (weighted)', 'Parts with no data are left out and the rest re-weighted.');
  if (!data.breakdown.length) {
    ink(c, C.muted, 9); c.doc.text('No finished task or review in this period, so there is nothing to score.', c.m, c.y); c.y += 18;
  } else {
    const rows = data.breakdown.map(p => ({ ...p, weighted: Math.round(p.value * p.weight) / 100 }));
    const cw = inner(c);
    table(c, {
      rowH: 19, size: 8.5,
      cols: [
        { label: 'Parameter', w: 40, get: r => WEIGHT_LABELS[r.component] || r.component },
        { label: 'Weight', w: 10, align: 'center', get: r => `${r.weight}%` },
        { label: 'Score (100)', w: 30, get: () => '' },
        { label: 'Score', w: 8, align: 'center', bold: true, get: r => String(r.value) },
        { label: 'Weighted', w: 12, align: 'right', bold: true, get: r => r.weighted.toFixed(1) }
      ],
      rows
    });
    // score bars drawn over the empty "Score (100)" column
    const tableTop = c.y - 10 - rows.length * 19;
    const colX = c.m + (40 + 10) / 100 * cw + 6; const colW = (30 / 100) * cw - 14;
    rows.forEach((r, i) => {
      const by = tableTop + i * 19 + 6;
      fill(c, C.line); c.doc.roundedRect(colX, by, colW, 6, 3, 3, 'F');
      fill(c, r.value >= 85 ? C.green : r.value >= 50 ? C.blue : C.red); c.doc.roundedRect(colX, by, Math.max(2, (r.value / 100) * colW), 6, 3, 3, 'F');
    });
    ensure(c, 26);
    fill(c, gcol.map(v => Math.round(v + (255 - v) * 0.9))); c.doc.rect(c.m, c.y - 6, cw, 22, 'F');
    ink(c, C.ink, 10, 'bold'); c.doc.text('Overall performance score', c.m + 8, c.y + 8);
    ink(c, gcol, 12, 'bold'); c.doc.text(`${data.score} / 100`, c.m + cw - 8, c.y + 9, { align: 'right' });
    c.y += 30;
  }

  // Effort points evaluation (nine parameters)
  if (m.pointsPossible) {
    section(c, 'Effort points evaluation', `${m.pointsEarned} earned of ${m.pointsPossible} possible (${m.effortQuality}%). Each task earns base points × its score on these parameters.`);
    const evRows = m.effortBreakdown || [];
    const cwEv = inner(c);
    table(c, {
      rowH: 19, size: 8,
      cols: [
        { label: 'Parameter', w: 22, bold: true, get: r => r.label },
        { label: 'How it is judged', w: 40, get: r => r.how },
        { label: 'Weight', w: 8, align: 'center', get: r => `${r.weight}%` },
        { label: 'Score', w: 14, get: () => '' },
        { label: 'Weighted', w: 8, align: 'right', bold: true, get: r => (r.weighted != null ? r.weighted.toFixed(1) : '—') }
      ],
      rows: evRows
    });
    const topEv = c.y - 10 - evRows.length * 19;
    const bx = c.m + ((22 + 40 + 8) / 92) * cwEv + 6; const bw = (14 / 92) * cwEv - 26;
    evRows.forEach((r, i) => {
      const by = topEv + i * 19 + 6;
      if (r.score == null) { ink(c, C.muted, 7); c.doc.text('No data', bx, by + 5); return; }
      fill(c, C.line); c.doc.roundedRect(bx, by, bw, 6, 3, 3, 'F');
      fill(c, r.score >= 85 ? C.green : r.score >= 50 ? C.blue : C.red); c.doc.roundedRect(bx, by, Math.max(2, (r.score / 100) * bw), 6, 3, 3, 'F');
      ink(c, C.ink, 7.5, 'bold'); c.doc.text(String(r.score), bx + bw + 4, by + 6);
    });
  }

  // Comparison with department
  const ta = data.teamAverage || {};
  section(c, `Compared with the ${e.department} average`, data.range.label);
  table(c, {
    rowH: 17, size: 8.5,
    cols: [
      { label: 'Measure', w: 30, get: r => r[0] },
      { label: e.name, w: 20, align: 'center', bold: true, get: r => r[1] },
      { label: `${e.department} average`, w: 20, align: 'center', get: r => r[2] }
    ],
    rows: [
      ['Score', data.score != null ? `${data.score}` : '—', num(ta.score)],
      ['Tasks completed', String(m.tasksCompleted), num(ta.tasksCompleted)],
      ['On-time delivery', num(m.onTimeRate, '%'), num(ta.onTimeRate, '%')],
      ['Average days per task', num(m.avgCycleDays), num(ta.avgCycleDays)],
      ['Hours logged', num(m.hoursLogged), num(ta.hoursLogged)],
      ['Average hours per task', num(m.avgHoursPerTask), num(ta.avgHoursPerTask)]
    ]
  });

  // Charts
  const weekly = weeklyRows(data.tasks.completed, data.range);
  const gap = 12; const half = (inner(c) - gap) / 2;
  if (weekly && weekly.length) {
    ensure(c, 160);
    section(c, 'Weekly view', weekly.map(w => `${w.week}: ${w.label}`).join('   '));
    const y0 = c.y - 4;
    barChart(c, { x: c.m, y: y0, w: half, h: 140, title: 'Weekly productivity (tasks completed)', labels: weekly.map(w => w.week), series: [{ name: 'Tasks', color: C.blue, values: weekly.map(w => w.Tasks) }] });
    barChart(c, { x: c.m + half + gap, y: y0, w: half, h: 140, title: 'Estimated vs actual hours', labels: weekly.map(w => w.week), series: [{ name: 'Estimated', color: C.lightBlue, values: weekly.map(w => w.Estimated) }, { name: 'Actual', color: C.blue, values: weekly.map(w => w.Actual) }], unit: 'h' });
    c.y = y0 + 140 + 12;
  }
  const months = (data.monthly || []).slice(-12);
  if (months.length) {
    ensure(c, 160);
    section(c, 'Last 12 months');
    const y0 = c.y - 4;
    barChart(c, { x: c.m, y: y0, w: half, h: 130, title: 'Tasks completed per month', labels: months.map(x => x.label), series: [{ name: 'Tasks', color: C.blue, values: months.map(x => x.tasksCompleted) }] });
    barChart(c, { x: c.m + half + gap, y: y0, w: half, h: 130, title: 'Hours logged per month', labels: months.map(x => x.label), series: [{ name: 'Hours', color: C.green, values: months.map(x => x.hoursLogged) }], unit: 'h' });
    c.y = y0 + 130 + 12;
  }

  // Improvement areas
  const areas = improvementAreasOf(m);
  section(c, 'Improvement areas', 'Worked out from the recorded numbers');
  if (!areas.length) { ink(c, C.muted, 9); c.doc.text('Nothing to improve stands out in this period.', c.m, c.y); c.y += 18; }
  areas.forEach(a => {
    const h = noteHeight(c, inner(c), a.text);
    ensure(c, h + 6);
    noteBox(c, { x: c.m, y: c.y, w: inner(c), title: a.title, text: a.text, color: TONE[a.tone] || C.amber });
    c.y += h + 6;
  });

  // Manager feedback & action plan
  const r = planReviewOf(data.reviews, data.range);
  section(c, 'Manager feedback & action plan', r ? `From the review of ${date(r.at)}${r.reviewer ? ` by ${r.reviewer}` : ''}` : 'No review with an action plan yet');
  const auto = data.insights?.strengths || [];
  const strengths = r ? splitLines(r.strengths) : [];
  const colsPlan = [
    ['Strengths', strengths.length ? strengths : auto, C.green, strengths.length || !auto.length ? null : 'From the recorded numbers (no manager note yet)'],
    ['Focus next month', r ? splitLines(r.focusNextMonth) : [], C.blue],
    ['Actions', r ? splitLines(r.actions) : [], C.purple]
  ];
  const cwid = (inner(c) - 16) / 3;
  const measure = (items) => items.reduce((s, t) => s + c.doc.splitTextToSize(t, cwid - 22).length * 11.5 + 2, 0);
  const planH = Math.max(60, 30 + Math.max(...colsPlan.map(k => (k[1].length ? measure(k[1]) : 12)))) + 14;
  ensure(c, planH + 6);
  colsPlan.forEach(([title, items, col, note], i) => {
    const x = c.m + i * (cwid + 8);
    fill(c, C.white); stroke(c, C.line); c.doc.roundedRect(x, c.y, cwid, planH, 4, 4, 'FD');
    fill(c, col); c.doc.rect(x, c.y, cwid, 3, 'F');
    ink(c, C.ink, 9.5, 'bold'); c.doc.text(title, x + 10, c.y + 18);
    if (items.length) bullets(c, items, x + 10, c.y + 32, cwid - 18, 8.2);
    else { ink(c, C.muted, 8); c.doc.text(r ? 'Not filled in on this review.' : 'Nothing recorded yet.', x + 10, c.y + 32); }
    if (note) { ink(c, C.muted, 6.5); c.doc.text(fit(c, note, cwid - 16), x + 10, c.y + planH - 6); }
  });
  c.y += planH + 14;

  // Summary
  const attention = data.insights?.attention || [];
  if (attention.length) {
    section(c, 'Needs attention');
    attention.forEach(t => {
      const h = noteHeight(c, inner(c), t);
      ensure(c, h + 6);
      noteBox(c, { x: c.m, y: c.y, w: inner(c), title: 'Observation', text: t, color: C.red });
      c.y += h + 6;
    });
  }

  // Work by type
  if ((data.workTypes || []).length) {
    section(c, 'Work by type', 'Compared with the department\'s average time for the same kind of work');
    table(c, {
      size: 8, rowH: 17,
      cols: [
        { label: 'Work type', w: 26, bold: true, get: w => w.workType },
        { label: 'Tasks done', w: 10, align: 'center', get: w => String(w.completed) },
        { label: 'Hours', w: 9, align: 'center', get: w => num(w.hours) },
        { label: 'Avg h / task', w: 12, align: 'center', get: w => num(w.avgHours) },
        { label: 'Team avg h', w: 12, align: 'center', get: w => num(w.teamAvgHours) },
        { label: 'On-time', w: 10, align: 'center', get: w => num(w.onTimeRate, '%') },
        { label: 'Speed vs std', w: 12, align: 'center', get: w => num(w.speedVsStandard, '%') }
      ],
      rows: data.workTypes
    });
  }

  // Completed tasks
  const done = data.tasks.completed;
  section(c, `Completed tasks (${done.length})`, 'Finished in this period, newest first');
  table(c, {
    size: 7.6, rowH: 16, empty: 'No task finished in this period.',
    cols: [
      { label: 'Task', w: 17, get: t => t.key },
      { label: 'Title', w: 34, get: t => t.title },
      { label: 'Finished', w: 11, get: t => date(t.completedAt) },
      { label: 'Due', w: 11, get: t => date(t.dueAt) },
      { label: 'On time', w: 8, align: 'center', get: t => (t.onTime == null ? '—' : t.onTime ? 'Yes' : 'No'), color: t => (t.onTime === false ? C.red : C.text) },
      { label: 'Hours', w: 7, align: 'right', get: t => num(t.hoursLogged || 0) },
      { label: 'Pts', w: 6, align: 'right', get: t => String(t.points || 0) }
    ],
    rows: done.slice(0, 60)
  });
  if (done.length > 60) { ink(c, C.muted, 8); c.doc.text(`… and ${done.length - 60} more (see the CSV export for the full list).`, c.m, c.y - 2); c.y += 12; }

  // Open tasks
  const open = data.tasks.open;
  if (open.length) {
    section(c, `Open tasks (${open.length})`, 'Still in progress; overdue ones are marked');
    table(c, {
      size: 7.6, rowH: 16,
      cols: [
        { label: 'Task', w: 17, get: t => t.key },
        { label: 'Title', w: 41, get: t => t.title },
        { label: 'Status', w: 14, get: t => (t.overdue ? 'Overdue' : t.status), color: t => (t.overdue ? C.red : C.text) },
        { label: 'Due', w: 12, get: t => date(t.dueAt) },
        { label: 'Hours', w: 8, align: 'right', get: t => num(t.hoursLogged || 0) }
      ],
      rows: open.slice(0, 30)
    });
    if (open.length > 30) { ink(c, C.muted, 8); c.doc.text(`… and ${open.length - 30} more.`, c.m, c.y - 2); c.y += 12; }
  }

  // Reviews
  if ((data.reviews || []).length) {
    section(c, 'Review history');
    table(c, {
      size: 8, rowH: 17,
      cols: [
        { label: 'Date', w: 14, get: v => date(v.at) },
        { label: 'Reviewer', w: 22, get: v => v.reviewer || '—' },
        { label: 'Score', w: 8, align: 'center', bold: true, get: v => String(v.score) },
        { label: 'Completion', w: 11, align: 'center', get: v => num(v.taskCompletion) },
        { label: 'Quality', w: 10, align: 'center', get: v => num(v.quality) },
        { label: 'On-time', w: 10, align: 'center', get: v => num(v.onTime) },
        { label: 'Efficiency', w: 11, align: 'center', get: v => num(v.efficiency) }
      ],
      rows: data.reviews.slice(0, 8)
    });
  }

  scoreExplainer(c, data.scoreWeights);

  // Sign-off
  ensure(c, 70);
  c.y += 24;
  const sw = (inner(c) - 40) / 3;
  ['Employee', 'Reviewed by (manager)', 'HR'].forEach((label, i) => {
    const x = c.m + i * (sw + 20);
    stroke(c, C.muted, 0.6); c.doc.line(x, c.y, x + sw, c.y);
    ink(c, C.muted, 7.5); c.doc.text(`${label} — signature & date`, x, c.y + 11);
  });

  footers(c);
  c.doc.save(`Performance-${safeName(e.name)}-${safeName(data.range.label)}.pdf`);
};

// exported for the on-screen "daily" tab to format time the same way
export { hm };

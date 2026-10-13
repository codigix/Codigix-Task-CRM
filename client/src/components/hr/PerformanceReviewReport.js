import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, LabelList
} from 'recharts';
import { X, Download, Printer, RefreshCw, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { API_BASE_URL } from '../../config/environment';
import { showErrorToast, showSuccessToast } from '../../utils/toast';
import useLiveRefresh from '../../hooks/useLiveRefresh';

/**
 * Review-meeting report: a printable A4 document built from the employee's live report
 * data. It refreshes itself every minute while open, the meeting notes typed into it are
 * part of the document, and "Download PDF" renders exactly what is on screen.
 */

const INK = '#111827';
const MUTED = '#6b7280';
const BLUE = '#2a78d6';
const GREEN = '#15803d';
const RED = '#b91c1c';
const AMBER = '#b45309';
const GRID = '#e5e7eb';
const PAGE_W = 794; // A4 at 96 dpi
const CHART_W = PAGE_W - 2 * 48;
const INNER_W = CHART_W - 26; // inside a card
const HALF_W = Math.floor((CHART_W - 12) / 2) - 26; // inside a half-width card

const GRADE_COLOR = { Excellent: GREEN, Good: BLUE, Fair: AMBER, 'Needs attention': RED, 'Not enough data': MUTED };
const fmt = (v, s = '') => (v == null ? '—' : `${v}${s}`);

/* ───────────── document building blocks (inline styles so the PDF matches the screen) ───────────── */

const Page = ({ children, n, total, name, period }) => (
  <div className="review-page" style={{
    width: PAGE_W, minHeight: 1123, background: '#fff', color: INK, padding: '40px 48px 56px', boxSizing: 'border-box',
    position: 'relative', fontFamily: "'Inter','Segoe UI',Arial,sans-serif", fontSize: 12, lineHeight: 1.45,
    boxShadow: '0 1px 4px rgba(0,0,0,.12)', margin: '0 auto 24px'
  }}>
    {children}
    <div style={{ position: 'absolute', left: 48, right: 48, bottom: 22, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: MUTED, borderTop: `1px solid ${GRID}`, paddingTop: 6 }}>
      <span>Codigix Infotech · Performance review · {name} · {period}</span>
      <span>Confidential · Page {n} of {total}</span>
    </div>
  </div>
);

const CARD = { background: '#f8fafc', border: `1px solid ${GRID}`, borderRadius: 10, padding: 12 };

const H2 = ({ children, sub, first }) => (
  <div style={{ margin: first ? '0 0 8px' : '18px 0 8px' }}>
    <div style={{ fontSize: 14, fontWeight: 700, color: INK, paddingLeft: 0 }}><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: BLUE, marginRight: 7 }} />{children}</div>
    {sub && <div style={{ fontSize: 10.5, color: MUTED, paddingLeft: 15, marginTop: 1 }}>{sub}</div>}
  </div>
);

const Kpi = ({ label, value, hint, tone }) => (
  <div style={{ border: `1px solid ${GRID}`, borderTop: `3px solid ${tone || BLUE}`, borderRadius: 8, padding: '8px 10px', background: '#fff' }}>
    <div style={{ fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 800, color: tone || INK, marginTop: 2 }}>{value}</div>
    {hint && <div style={{ fontSize: 10, color: MUTED }}>{hint}</div>}
  </div>
);

const ScoreRing = ({ score, grade }) => {
  const r = 46; const c = 2 * Math.PI * r; const v = score == null ? 0 : Math.max(0, Math.min(100, score));
  const color = GRADE_COLOR[grade] || MUTED;
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" role="img" aria-label={`Score ${fmt(score)}`}>
      <circle cx="60" cy="60" r={r} fill="none" stroke={GRID} strokeWidth="10" />
      <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
        strokeDasharray={`${(v / 100) * c} ${c}`} transform="rotate(-90 60 60)" />
      <text x="60" y="58" textAnchor="middle" fontSize="28" fontWeight="700" fill={INK}>{score == null ? '—' : score}</text>
      <text x="60" y="78" textAnchor="middle" fontSize="10" fill={MUTED}>out of 100</text>
    </svg>
  );
};

const Bars = ({ data, dataKey, color = BLUE, unit = '', height = 170, width = CHART_W }) => {
  if (!data.some(d => Number(d[dataKey]) > 0)) return <div style={{ height: 60, color: MUTED, fontSize: 11, display: 'flex', alignItems: 'center' }}>Nothing recorded in this window.</div>;
  return (
    <BarChart width={width} height={height} data={data} margin={{ top: 16, right: 8, left: -14, bottom: 0 }}>
      <CartesianGrid vertical={false} stroke={GRID} />
      <XAxis dataKey="label" tick={{ fontSize: 10, fill: MUTED }} tickLine={false} axisLine={{ stroke: GRID }} interval={0} />
      <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: MUTED }} tickLine={false} axisLine={false} />
      <Tooltip formatter={(v) => [`${v}${unit}`, '']} />
      <Bar dataKey={dataKey} fill={color} radius={[3, 3, 0, 0]} maxBarSize={28} isAnimationActive={false}>
        <LabelList dataKey={dataKey} position="top" style={{ fontSize: 9, fill: MUTED }} formatter={(v) => (v ? v : '')} />
      </Bar>
    </BarChart>
  );
};

const Legend = () => (
  <div style={{ display: 'flex', gap: 14, fontSize: 10.5, color: MUTED, marginBottom: 4 }}>
    <span><span style={{ display: 'inline-block', width: 9, height: 9, background: BLUE, borderRadius: 2, marginRight: 5 }} />This employee</span>
    <span><span style={{ display: 'inline-block', width: 9, height: 9, background: '#9ca3af', borderRadius: 2, marginRight: 5 }} />Department average</span>
  </div>
);

// Employee next to the department average, one pair of bars per measure.
const Pair = ({ data, width, height = 170 }) => (
  <BarChart width={width} height={height} data={data} margin={{ top: 16, right: 8, left: -14, bottom: 0 }}>
    <CartesianGrid vertical={false} stroke={GRID} />
    <XAxis dataKey="label" tick={{ fontSize: 9.5, fill: MUTED }} tickLine={false} axisLine={{ stroke: GRID }} interval={0} />
    <YAxis tick={{ fontSize: 10, fill: MUTED }} tickLine={false} axisLine={false} />
    <Bar dataKey="me" fill={BLUE} radius={[3, 3, 0, 0]} maxBarSize={26} isAnimationActive={false}>
      <LabelList dataKey="me" position="top" style={{ fontSize: 9, fill: INK }} />
    </Bar>
    <Bar dataKey="team" fill="#9ca3af" radius={[3, 3, 0, 0]} maxBarSize={26} isAnimationActive={false}>
      <LabelList dataKey="team" position="top" style={{ fontSize: 9, fill: MUTED }} />
    </Bar>
  </BarChart>
);

// Meeting notes: editable on screen, plain text while the PDF is being captured.
// Defined outside the report so typing doesn't remount the textarea (which loses focus).
const NoteField = ({ label, placeholder, value, onChange, asText }) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 4 }}>{label}</div>
    {asText ? (
      <div style={{ minHeight: 64, border: `1px solid ${GRID}`, borderRadius: 6, padding: 8, whiteSpace: 'pre-wrap', color: value ? INK : '#9ca3af' }}>
        {value || ' '}
      </div>
    ) : (
      <textarea value={value} onChange={ev => onChange(ev.target.value)} placeholder={placeholder} rows={3} aria-label={label}
        style={{ width: '100%', minHeight: 64, border: `1px solid ${GRID}`, borderRadius: 6, padding: 8, fontSize: 12, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
    )}
  </div>
);

/* ───────────── the report ───────────── */

export default function PerformanceReviewReport({ employeeId, query, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [notes, setNotes] = useState({ discussion: '', goals: '', support: '', employee: '' });
  const docRef = useRef(null);

  const load = useCallback(async (silent) => {
    if (silent !== true) setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/hr/performance/report/employee/${employeeId}?${query}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not load the report');
      setData(json); setError(''); setUpdatedAt(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [employeeId, query]);

  // Live: refresh every minute while the report is open (not while exporting).
  useEffect(() => { load(); }, [load]);
  useLiveRefresh(['work'], () => load(true), { wait: 1500, maxWait: 10000, enabled: !exporting });
  useEffect(() => {
    if (exporting) return undefined;
    const t = setInterval(() => load(true), 20000);
    return () => clearInterval(t);
  }, [load, exporting]);

  // Notes are kept per employee + period in this browser, so a draft survives a refresh.
  const notesKey = `reviewNotes:${employeeId}:${query}`;
  useEffect(() => {
    try { const saved = JSON.parse(localStorage.getItem(notesKey) || 'null'); if (saved) setNotes(saved); } catch (e) { /* ignore */ }
  }, [notesKey]);
  useEffect(() => { try { localStorage.setItem(notesKey, JSON.stringify(notes)); } catch (e) { /* ignore */ } }, [notes, notesKey]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !exporting) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, exporting]);

  const downloadPdf = async () => {
    if (!docRef.current || !data) return;
    setExporting(true);
    try {
      await load(true); // the PDF carries the figures as they are right now
      await new Promise(r => setTimeout(r, 400)); // let "exporting" layout settle (textareas → text)
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      const pageW = 210; const pageH = 297;
      const pages = [...docRef.current.querySelectorAll('.review-page')];
      let first = true;
      for (const el of pages) {
        const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
        // A page taller than A4 (long task lists) is split across several PDF pages.
        const sliceH = Math.floor(canvas.width * (pageH / pageW));
        for (let y = 0; y < canvas.height; y += sliceH) {
          const h = Math.min(sliceH, canvas.height - y);
          const part = document.createElement('canvas');
          part.width = canvas.width; part.height = h;
          part.getContext('2d').drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
          if (!first) pdf.addPage();
          first = false;
          pdf.addImage(part.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pageW, (h / canvas.width) * pageW);
        }
      }
      const safe = (s) => String(s).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
      pdf.save(`Performance-Review-${safe(data.employee.name)}-${safe(data.range.label)}.pdf`);
      showSuccessToast('PDF downloaded');
    } catch (e) {
      console.error(e);
      showErrorToast('Could not create the PDF');
    } finally {
      setExporting(false);
    }
  };

  const toolbar = (
    <div className="no-print" style={{ position: 'sticky', top: 0, zIndex: 2, background: '#111827', color: '#fff', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <strong style={{ fontSize: 14 }}>Review meeting report</strong>
      <span style={{ fontSize: 12, opacity: 0.8 }}>
        {data ? `${data.employee.name} · ${data.range.label}` : ''}
        {updatedAt && ` · updated ${updatedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`}
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#86efac' }}><span className="animate-pulse" style={{ width: 8, height: 8, borderRadius: 4, background: '#22c55e' }} />LIVE until you download</span>
      <div style={{ flex: 1 }} />
      <button onClick={() => load()} disabled={loading || exporting} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 disabled:opacity-50 cursor-pointer">
        <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
      </button>
      <button onClick={() => window.print()} disabled={!data || exporting} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 disabled:opacity-50 cursor-pointer">
        <Printer size={13} /> Print
      </button>
      <button onClick={downloadPdf} disabled={!data || exporting} className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded bg-red-600 hover:bg-red-700 disabled:opacity-50 cursor-pointer">
        {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} {exporting ? 'Creating PDF…' : 'Download PDF'}
      </button>
      <button onClick={onClose} disabled={exporting} className="p-1.5 rounded hover:bg-white/20 cursor-pointer" aria-label="Close report"><X size={16} /></button>
    </div>
  );

  const shell = (body) => (
    <div className="review-report-root" style={{ position: 'fixed', inset: 0, zIndex: 10001, background: '#e5e7eb', overflowY: 'auto' }}>
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body * { visibility: hidden !important; }
          .review-report-root, .review-report-root * { visibility: visible !important; }
          .review-report-root { position: absolute !important; inset: auto !important; left: 0; top: 0; background: #fff !important; overflow: visible !important; }
          .review-report-root .no-print { display: none !important; }
          .review-page { box-shadow: none !important; margin: 0 !important; page-break-after: always; break-after: page; }
        }
      `}</style>
      {toolbar}
      <div style={{ padding: '24px 12px' }}>{body}</div>
    </div>
  );

  if (!data) {
    return shell(
      <div style={{ textAlign: 'center', padding: 80, color: error ? RED : MUTED }}>
        {error || 'Building the report…'}
      </div>
    );
  }

  const e = data.employee; const m = data.metrics;
  const team = data.teamAverage || {};
  const name = e.name; const period = data.range.label;
  const chrono = [...(data.scorecard || [])].reverse(); // oldest → newest
  const short = chrono.map(c => ({ ...c, label: String(c.label).slice(0, 3) }));
  const scoreTrend = chrono.map(c => ({ ...c, label: String(c.label).slice(0, 3) })).map(s => ({ label: s.label, score: s.score }));
  const onTimeData = [
    { name: 'On time', value: m.onTimeCompleted, color: GREEN },
    { name: 'Late', value: m.lateCompleted, color: RED }
  ].filter(x => x.value > 0);
  const completedNoDue = Math.max(0, m.tasksCompleted - m.onTimeCompleted - m.lateCompleted);
  const rateVs = [
    { label: 'Score', me: data.score, team: team.score },
    { label: 'On-time %', me: m.onTimeRate, team: team.onTimeRate },
    { label: 'Hours vs available %', me: m.utilisation, team: team.utilisation }
  ];
  const volumeVs = [
    { label: 'Effort (h)', me: m.effortHours, team: team.effortHours },
    { label: 'Hours worked', me: m.hoursLogged, team: team.hoursLogged },
    { label: 'Active days', me: m.activeDays, team: team.activeDays }
  ];
  const typeVs = (data.workTypes || []).filter(w => w.avgHours != null).slice(0, 6).map(w => ({ label: String(w.workType).slice(0, 14), me: w.avgHours, team: w.teamAvgHours }));
  const TOTAL = 2;

  return shell(
    <div ref={docRef}>
      {/* ───────── Page 1: score, results and trend ───────── */}
      <Page n={1} total={TOTAL} name={name} period={period}>
        <div style={{ margin: '-40px -48px 0', padding: '20px 48px', background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 8, padding: '6px 14px' }}><img src={`${process.env.PUBLIC_URL || ""}/codigix-logo.png`} alt="Codigix Infotech" style={{ height: 40, objectFit: 'contain', display: 'block' }} /></div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: 1.5 }}>PERFORMANCE REVIEW</div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>{period}</div>
            <div style={{ fontSize: 10, opacity: 0.7 }}>Live data as of {(updatedAt || new Date()).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>

        <div style={{ ...CARD, display: 'flex', gap: 20, alignItems: 'center', marginTop: 16, padding: '14px 18px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{name}</div>
            <div style={{ fontSize: 12, color: '#374151' }}>{e.role} · {e.department}</div>
            <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: GRADE_COLOR[data.grade] || MUTED, borderRadius: 12, padding: '3px 10px' }}>{data.grade}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: INK, background: '#f3f4f6', borderRadius: 12, padding: '3px 10px' }}>
                {data.rank ? `Rank #${data.rank} of ${data.rankedOutOf} in ${e.department}` : 'Not ranked this period'}
              </span>
            </div>
          </div>
          <ScoreRing score={data.score} grade={data.grade} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 16 }}>
          <Kpi label="Effort delivered" value={`${m.effortHours || 0} h`} hint={`${m.tasksCompleted} tasks done`} />
          <Kpi label="On-time delivery" value={fmt(m.onTimeRate, '%')} tone={m.onTimeRate != null && m.onTimeRate < 60 ? RED : undefined} hint={`${m.onTimeCompleted} on time · ${m.lateCompleted} late`} />
          <Kpi label="Hours worked" value={fmt(m.hoursLogged || 0, ' h')} hint={`${m.activeDays} active days`} />
          <Kpi label="Overdue now" value={m.overdueOpen} tone={m.overdueOpen > 0 ? RED : undefined} hint="Open past due date" />
        </div>

        <div style={{ ...CARD, marginTop: 16 }}>
        <H2 first sub="Score each month (0–100), last 12 months">Score trend</H2>
        {scoreTrend.some(s => s.score != null) ? (
          <LineChart width={INNER_W} height={170} data={scoreTrend} margin={{ top: 16, right: 22, left: -14, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: MUTED }} tickLine={false} axisLine={{ stroke: GRID }} interval={0} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: MUTED }} tickLine={false} axisLine={false} />
            <Line type="monotone" dataKey="score" stroke={BLUE} strokeWidth={2.5} dot={{ r: 3, fill: BLUE }} connectNulls isAnimationActive={false}>
              <LabelList dataKey="score" position="top" style={{ fontSize: 9, fill: MUTED }} />
            </Line>
          </LineChart>
        ) : <div style={{ color: MUTED }}>No scored months yet.</div>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
          <div style={CARD}>
            <H2 first sub="Last 12 months">Tasks completed</H2>
            <Bars data={short} dataKey="tasksCompleted" unit=" tasks" width={HALF_W} height={150} />
          </div>
          <div style={CARD}>
            <H2 first sub="Last 12 months">Hours worked</H2>
            <Bars data={short} dataKey="hoursLogged" unit=" h" color="#0f766e" width={HALF_W} height={150} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '230px 1fr', gap: 12, alignItems: 'stretch', marginTop: 12 }}>
          <div style={CARD}>
            <H2 first sub={period}>Delivery against due dates</H2>
            {onTimeData.length ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ position: 'relative', width: 110, height: 110 }}>
                <PieChart width={110} height={110}>
                  <Pie data={onTimeData} dataKey="value" innerRadius={32} outerRadius={50} paddingAngle={2} isAnimationActive={false} stroke="none">
                    {onTimeData.map(d => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                </PieChart>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800 }}>{fmt(m.onTimeRate, '%')}</div>
                </div>
                <div style={{ fontSize: 11 }}>
                  {onTimeData.map(d => <div key={d.name}><span style={{ display: 'inline-block', width: 8, height: 8, background: d.color, borderRadius: 2, marginRight: 5 }} />{d.name}: <strong>{d.value}</strong></div>)}
                  {completedNoDue > 0 && <div style={{ color: MUTED }}>No due date: {completedNoDue}</div>}
                </div>
              </div>
            ) : <div style={{ color: MUTED, fontSize: 11 }}>No finished tasks with due dates.</div>}
          </div>
          <div style={CARD}>
            <H2 first sub="Parts without data are left out and the rest re-weighted">What makes up the score</H2>
            {(data.breakdown || []).length === 0 ? <div style={{ color: MUTED }}>Not enough recorded work to score this period.</div> : data.breakdown.map(p => (
              <div key={p.component} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <div style={{ width: 150, fontSize: 10.5 }}>{({ output: 'Effort vs hours available', utilisation: 'Hours recorded', onTime: 'On-time delivery', engagement: 'Days active', efficiency: 'Efficiency', review: 'Manager review', completion: 'Completion rate', logging: 'Time recorded' })[p.component] || p.component} <span style={{ color: MUTED }}>({p.weight}%)</span></div>
                <div style={{ flex: 1, height: 8, background: '#f3f4f6', borderRadius: 4 }}>
                  <div style={{ width: `${p.value}%`, height: 8, background: p.value >= 75 ? GREEN : p.value >= 50 ? BLUE : p.value >= 30 ? AMBER : RED, borderRadius: 4 }} />
                </div>
                <div style={{ width: 26, textAlign: 'right', fontWeight: 600, fontSize: 11 }}>{p.value}</div>
              </div>
            ))}
          </div>
        </div>
      </Page>

      {/* ───────── Page 2: comparison, notes, sign-off ───────── */}
      <Page n={2} total={TOTAL} name={name} period={period}>
        <div style={CARD}>
        <H2 first sub={`${name.split(' ')[0]} compared with the ${e.department} average for ${period}`}>Versus the department</H2>
        <Legend />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Pair data={rateVs} width={Math.floor((INNER_W - 12) / 2)} />
          <Pair data={volumeVs} width={Math.floor((INNER_W - 12) / 2)} />
        </div>
        </div>

        {typeVs.length > 0 && (
          <div style={{ ...CARD, marginTop: 12 }}>
            <H2 first sub="Average hours per finished task, against the department for the same work">Time per task by work type</H2>
            <Pair data={typeVs} width={INNER_W} height={170} />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
          <div style={{ ...CARD, background: '#f0fdf4' }}>
            <H2 first>Strengths</H2>
            {(data.insights?.strengths || []).slice(0, 3).map((t, i) => (
              <div key={i} style={{ borderLeft: '2px solid #86efac', paddingLeft: 8, marginBottom: 5 }}>{t}</div>
            ))}
            {!(data.insights?.strengths || []).length && <div style={{ color: MUTED }}>None stand out.</div>}
          </div>
          <div style={{ ...CARD, background: '#fef2f2' }}>
            <H2 first>Needs attention</H2>
            {(data.insights?.attention || []).slice(0, 3).map((t, i) => (
              <div key={i} style={{ borderLeft: '2px solid #fca5a5', paddingLeft: 8, marginBottom: 5 }}>{t}</div>
            ))}
            {!(data.insights?.attention || []).length && <div style={{ color: MUTED }}>Nothing flagged.</div>}
          </div>
        </div>

        <H2 sub="Filled in during the meeting; included in the PDF">Review discussion</H2>
        <NoteField label="Discussion points" placeholder="What went well, what was difficult, context behind the numbers…" value={notes.discussion} asText={exporting} onChange={v => setNotes(n => ({ ...n, discussion: v }))} />
        <NoteField label="Goals agreed for the next period" placeholder="e.g. Keep on-time delivery above 90%" value={notes.goals} asText={exporting} onChange={v => setNotes(n => ({ ...n, goals: v }))} />
        <NoteField label="Support / training needed" placeholder="Tools, training, workload changes…" value={notes.support} asText={exporting} onChange={v => setNotes(n => ({ ...n, support: v }))} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginTop: 26 }}>
          {['Employee', 'Reviewing manager', 'HR'].map(l => (
            <div key={l}>
              <div style={{ height: 30 }} />
              <div style={{ borderTop: `1px solid ${INK}`, paddingTop: 4, fontSize: 11 }}>{l}</div>
              <div style={{ fontSize: 10, color: MUTED }}>Signature &amp; date</div>
            </div>
          ))}
        </div>
      </Page>
    </div>
  );
}

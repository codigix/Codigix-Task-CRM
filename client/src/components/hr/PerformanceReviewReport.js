import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, LabelList
} from 'recharts';
import { X, Download, Printer, RefreshCw, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { API_BASE_URL } from '../../config/environment';
import { CODIGIX_LOGO_B64 } from '../../utils/codigixLogoB64';
import { showErrorToast, showSuccessToast } from '../../utils/toast';

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

const GRADE_COLOR = { Excellent: GREEN, Good: BLUE, Fair: AMBER, 'Needs attention': RED, 'Not enough data': MUTED };
const fmt = (v, s = '') => (v == null ? '—' : `${v}${s}`);
const fmtDate = (v) => (v ? new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const monthLabel = (k) => { if (!k) return '—'; const [y, m] = k.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleString('en-GB', { month: 'long', year: 'numeric' }); };

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

const H2 = ({ children, sub }) => (
  <div style={{ margin: '22px 0 10px' }}>
    <div style={{ fontSize: 14, fontWeight: 700, color: INK, borderLeft: `3px solid ${BLUE}`, paddingLeft: 8 }}>{children}</div>
    {sub && <div style={{ fontSize: 10.5, color: MUTED, paddingLeft: 11, marginTop: 2 }}>{sub}</div>}
  </div>
);

const Kpi = ({ label, value, hint, tone }) => (
  <div style={{ border: `1px solid ${GRID}`, borderRadius: 6, padding: '8px 10px' }}>
    <div style={{ fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
    <div style={{ fontSize: 20, fontWeight: 700, color: tone || INK, marginTop: 2 }}>{value}</div>
    {hint && <div style={{ fontSize: 10, color: MUTED }}>{hint}</div>}
  </div>
);

const Table = ({ head, rows, align = [] }) => (
  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
    <thead>
      <tr>{head.map((h, i) => (
        <th key={i} style={{ textAlign: align[i] || 'left', padding: '6px 8px', background: '#f3f4f6', color: '#374151', fontWeight: 600, borderBottom: `1px solid ${GRID}` }}>{h}</th>
      ))}</tr>
    </thead>
    <tbody>
      {rows.length === 0 ? (
        <tr><td colSpan={head.length} style={{ padding: 10, color: MUTED, textAlign: 'center' }}>Nothing recorded.</td></tr>
      ) : rows.map((r, i) => (
        <tr key={i}>{r.map((c, j) => (
          <td key={j} style={{ textAlign: align[j] || 'left', padding: '5px 8px', borderBottom: `1px solid ${GRID}`, verticalAlign: 'top' }}>{c}</td>
        ))}</tr>
      ))}
    </tbody>
  </table>
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

  const load = useCallback(async () => {
    setLoading(true);
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
  useEffect(() => {
    if (exporting) return undefined;
    const t = setInterval(load, 60000);
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
      await new Promise(r => setTimeout(r, 50)); // let "exporting" layout settle (textareas → text)
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
        {updatedAt && ` · live, updated ${updatedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`}
      </span>
      <div style={{ flex: 1 }} />
      <button onClick={load} disabled={loading || exporting} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 disabled:opacity-50 cursor-pointer">
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

  const e = data.employee; const m = data.metrics; const b = data.bests || {};
  const team = data.teamAverage || {};
  const name = e.name; const period = data.range.label;
  const chrono = [...(data.scorecard || [])].reverse(); // oldest → newest
  const scoreTrend = chrono.map(s => ({ label: s.label, score: s.score }));
  const onTimeData = [
    { name: 'On time', value: m.onTimeCompleted, color: GREEN },
    { name: 'Late', value: m.lateCompleted, color: RED }
  ].filter(x => x.value > 0);
  const completedNoDue = Math.max(0, m.tasksCompleted - m.onTimeCompleted - m.lateCompleted);
  const pctDiff = (mine, avg, better = 'up') => {
    if (mine == null || avg == null || avg === 0) return '—';
    const d = Math.round(((mine - avg) / Math.abs(avg)) * 100);
    if (Math.abs(d) < 5) return <span style={{ color: MUTED }}>On par</span>;
    const good = better === 'up' ? d > 0 : d < 0;
    return <span style={{ color: good ? GREEN : RED, fontWeight: 600 }}>{d > 0 ? '+' : ''}{d}%</span>;
  };
  const completed = data.tasks?.completed || [];
  const open = data.tasks?.open || [];
  const TOTAL = 4;

  return shell(
    <div ref={docRef}>
      {/* ───────── Page 1: summary ───────── */}
      <Page n={1} total={TOTAL} name={name} period={period}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: `2px solid ${INK}`, paddingBottom: 12 }}>
          <img src={CODIGIX_LOGO_B64} alt="Codigix Infotech" style={{ height: 40, objectFit: 'contain' }} />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: 0.5 }}>PERFORMANCE REVIEW</div>
            <div style={{ fontSize: 11, color: MUTED }}>Review period: <strong style={{ color: INK }}>{period}</strong></div>
            <div style={{ fontSize: 11, color: MUTED }}>Generated {new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginTop: 18 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{name}</div>
            <div style={{ fontSize: 12, color: '#374151' }}>{e.role} · {e.department}</div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>Employee since {fmtDate(e.joinedAt)} · Reviewer: ____________________</div>
            <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: GRADE_COLOR[data.grade] || MUTED, borderRadius: 12, padding: '3px 10px' }}>{data.grade}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: INK, background: '#f3f4f6', borderRadius: 12, padding: '3px 10px' }}>
                {data.rank ? `Rank #${data.rank} of ${data.rankedOutOf} in ${e.department}` : 'Not ranked this period'}
              </span>
              {team.score != null && <span style={{ fontSize: 11, color: INK, background: '#f3f4f6', borderRadius: 12, padding: '3px 10px' }}>Department average score {team.score}</span>}
            </div>
          </div>
          <ScoreRing score={data.score} grade={data.grade} />
        </div>

        <H2 sub="Recorded in the system for the review period">Key results</H2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          <Kpi label="Tasks completed" value={m.tasksCompleted} hint={`of ${m.tasksAssigned} assigned (${fmt(m.completionRate, '%')})`} />
          <Kpi label="On-time delivery" value={fmt(m.onTimeRate, '%')} hint={`${m.onTimeCompleted} on time · ${m.lateCompleted} late`} tone={m.onTimeRate != null && m.onTimeRate < 60 ? RED : undefined} />
          <Kpi label="Hours worked" value={fmt(m.hoursLogged || 0, ' h')} hint="Recorded working hours" />
          <Kpi label="Avg time per task" value={fmt(m.avgHoursPerTask, ' h')} hint={m.avgCycleDays != null ? `${m.avgCycleDays} days start → done` : 'No timed tasks'} />
          <Kpi label="Active days" value={m.activeDays} hint="Days with recorded work" />
          <Kpi label="Meetings" value={m.meetings} hint={m.meetingHours ? `${m.meetingHours} h total` : '—'} />
          <Kpi label="Points earned" value={m.pointsEarned} hint={m.pointsApproved ? `${m.pointsApproved} approved` : 'From finished tasks'} />
          <Kpi label="Overdue now" value={m.overdueOpen} tone={m.overdueOpen > 0 ? RED : undefined} hint={m.reopened ? `${m.reopened} reopened` : 'Open past due date'} />
        </div>

        <H2>Summary</H2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: GREEN, marginBottom: 4 }}>STRENGTHS</div>
            {(data.insights?.strengths || []).length ? data.insights.strengths.map((t, i) => (
              <div key={i} style={{ borderLeft: `2px solid #86efac`, paddingLeft: 8, marginBottom: 5 }}>{t}</div>
            )) : <div style={{ color: MUTED }}>None stand out from the recorded data.</div>}
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: RED, marginBottom: 4 }}>NEEDS ATTENTION</div>
            {(data.insights?.attention || []).length ? data.insights.attention.map((t, i) => (
              <div key={i} style={{ borderLeft: `2px solid #fca5a5`, paddingLeft: 8, marginBottom: 5 }}>{t}</div>
            )) : <div style={{ color: MUTED }}>Nothing flagged.</div>}
          </div>
        </div>

        <H2 sub="Parts without data are left out and the rest re-weighted">How the score is made up</H2>
        {(data.breakdown || []).length === 0 ? <div style={{ color: MUTED }}>Not enough recorded work to score this period.</div> : data.breakdown.map(p => (
          <div key={p.component} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{ width: 210, fontSize: 11 }}>{({ completion: 'Completion rate', onTime: 'On-time delivery', output: 'Output vs busiest peer', logging: 'Time recorded on tasks', review: 'Manager review' })[p.component]} <span style={{ color: MUTED }}>({p.weight}%)</span></div>
            <div style={{ flex: 1, height: 8, background: '#f3f4f6', borderRadius: 4 }}>
              <div style={{ width: `${p.value}%`, height: 8, background: BLUE, borderRadius: 4 }} />
            </div>
            <div style={{ width: 30, textAlign: 'right', fontWeight: 600 }}>{p.value}</div>
          </div>
        ))}

        <H2 sub={`Compared with the ${e.department} average for ${period}`}>Versus the team</H2>
        <Table
          head={['Measure', name.split(' ')[0], 'Dept. average', 'Difference']}
          align={['left', 'right', 'right', 'right']}
          rows={[
            ['Score', fmt(data.score), fmt(team.score), pctDiff(data.score, team.score)],
            ['Tasks completed', m.tasksCompleted, fmt(team.tasksCompleted), pctDiff(m.tasksCompleted, team.tasksCompleted)],
            ['On-time delivery', fmt(m.onTimeRate, '%'), fmt(team.onTimeRate, '%'), pctDiff(m.onTimeRate, team.onTimeRate)],
            ['Avg hours per task', fmt(m.avgHoursPerTask, ' h'), fmt(team.avgHoursPerTask, ' h'), pctDiff(m.avgHoursPerTask, team.avgHoursPerTask, 'down')],
            ['Avg days start → done', fmt(m.avgCycleDays), fmt(team.avgCycleDays), pctDiff(m.avgCycleDays, team.avgCycleDays, 'down')],
            ['Hours worked', fmt(m.hoursLogged || 0), fmt(team.hoursLogged), pctDiff(m.hoursLogged, team.hoursLogged)],
            ['Active days', m.activeDays, fmt(team.activeDays), pctDiff(m.activeDays, team.activeDays)]
          ]}
        />
      </Page>

      {/* ───────── Page 2: analytics ───────── */}
      <Page n={2} total={TOTAL} name={name} period={period}>
        <H2 sub="Score each month (0–100), last 12 months">Performance trend</H2>
        {scoreTrend.some(s => s.score != null) ? (
          <LineChart width={CHART_W} height={180} data={scoreTrend} margin={{ top: 16, right: 12, left: -14, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: MUTED }} tickLine={false} axisLine={{ stroke: GRID }} interval={0} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: MUTED }} tickLine={false} axisLine={false} />
            <Tooltip />
            <Line type="monotone" dataKey="score" stroke={BLUE} strokeWidth={2.5} dot={{ r: 3, fill: BLUE }} connectNulls isAnimationActive={false}>
              <LabelList dataKey="score" position="top" style={{ fontSize: 9, fill: MUTED }} />
            </Line>
          </LineChart>
        ) : <div style={{ color: MUTED }}>No scored months yet.</div>}

        <H2 sub="Last 12 months">Tasks completed per month</H2>
        <Bars data={chrono} dataKey="tasksCompleted" unit=" tasks" />

        <H2 sub="Last 12 months, working hours only">Hours worked per month</H2>
        <Bars data={chrono} dataKey="hoursLogged" unit=" h" color="#0f766e" />

        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 18, alignItems: 'start' }}>
          <div>
            <H2 sub={period}>Delivery against due dates</H2>
            {onTimeData.length ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <PieChart width={110} height={110}>
                  <Pie data={onTimeData} dataKey="value" innerRadius={32} outerRadius={50} paddingAngle={2} isAnimationActive={false} stroke="none">
                    {onTimeData.map(d => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                </PieChart>
                <div style={{ fontSize: 11 }}>
                  {onTimeData.map(d => <div key={d.name}><span style={{ display: 'inline-block', width: 8, height: 8, background: d.color, borderRadius: 2, marginRight: 5 }} />{d.name}: <strong>{d.value}</strong></div>)}
                  {completedNoDue > 0 && <div style={{ color: MUTED }}>No due date: {completedNoDue}</div>}
                </div>
              </div>
            ) : <div style={{ color: MUTED }}>No finished tasks with due dates.</div>}
          </div>
          <div>
            <H2 sub="Average hours per finished task vs the department's average for the same work">Work by type</H2>
            <Table
              head={['Work type', 'Done', 'Avg h', 'Team avg h', 'On-time']}
              align={['left', 'right', 'right', 'right', 'right']}
              rows={(data.workTypes || []).map(w => [
                w.workType, w.completed,
                <span style={{ color: w.avgHours != null && w.teamAvgHours != null ? (w.avgHours < w.teamAvgHours * 0.95 ? GREEN : w.avgHours > w.teamAvgHours * 1.05 ? RED : INK) : INK, fontWeight: 600 }}>{fmt(w.avgHours)}</span>,
                fmt(w.teamAvgHours), fmt(w.onTimeRate, '%')
              ])}
            />
          </div>
        </div>

        <H2 sub="All recorded history">Personal best records</H2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          <Kpi label="Best month (tasks)" value={b.bestMonthTasks ? `${b.bestMonthTasks.value} tasks` : '—'} hint={b.bestMonthTasks ? monthLabel(b.bestMonthTasks.month) : 'No finished tasks yet'} />
          <Kpi label="Best month (hours)" value={b.bestMonthHours ? `${b.bestMonthHours.value} h` : '—'} hint={b.bestMonthHours ? monthLabel(b.bestMonthHours.month) : 'No time recorded yet'} />
          <Kpi label="Longest on-time run" value={b.longestOnTimeStreak ? `${b.longestOnTimeStreak} in a row` : '—'} hint="Tasks finished by their due date" />
          <Kpi label="Fastest task" value={b.fastestTask ? `${b.fastestTask.days} days` : '—'} hint={b.fastestTask ? b.fastestTask.key : undefined} />
          <Kpi label="Biggest task" value={b.biggestTask ? `${b.biggestTask.points} pts` : '—'} hint={b.biggestTask ? b.biggestTask.key : undefined} />
          <Kpi label="Total completed" value={b.totalCompleted ?? 0} hint="All time" />
        </div>
      </Page>

      {/* ───────── Page 3: scorecards & work ───────── */}
      <Page n={3} total={TOTAL} name={name} period={period}>
        <H2 sub="Score and rank are within the department for each month">Monthly scorecard</H2>
        <Table
          head={['Month', 'Score', 'Grade', 'Rank', 'Tasks', 'Hours', 'Avg h/task', 'On-time', 'Meetings']}
          align={['left', 'right', 'left', 'right', 'right', 'right', 'right', 'right', 'right']}
          rows={(data.scorecard || []).filter(s => s.score != null || s.tasksCompleted || s.hoursLogged || s.meetings).map(s => [
            s.label, fmt(s.score), s.score != null ? <span style={{ color: GRADE_COLOR[s.grade], fontWeight: 600 }}>{s.grade}</span> : '—',
            s.rank ? `#${s.rank}/${s.rankedOutOf}` : '—', s.tasksCompleted, s.hoursLogged || 0, fmt(s.avgHoursPerTask), fmt(s.onTimeRate, '%'), s.meetings
          ])}
        />

        <H2>Quarterly scorecard</H2>
        <Table
          head={['Quarter', 'Score', 'Grade', 'Rank', 'Tasks', 'Hours', 'Avg h/task', 'On-time', 'Meetings']}
          align={['left', 'right', 'left', 'right', 'right', 'right', 'right', 'right', 'right']}
          rows={(data.quarterCard || []).map(s => [
            s.label, fmt(s.score), s.score != null ? <span style={{ color: GRADE_COLOR[s.grade], fontWeight: 600 }}>{s.grade}</span> : '—',
            s.rank ? `#${s.rank}/${s.rankedOutOf}` : '—', s.tasksCompleted, s.hoursLogged || 0, fmt(s.avgHoursPerTask), fmt(s.onTimeRate, '%'), s.meetings
          ])}
        />

        <H2 sub={`${completed.length} finished in ${period}${completed.length > 15 ? ' · most recent 15 shown' : ''}`}>Completed work</H2>
        <Table
          head={['Task', 'Type', 'Due', 'Finished', 'Days', 'Hours', 'Result']}
          align={['left', 'left', 'left', 'left', 'right', 'right', 'left']}
          rows={completed.slice(0, 15).map(t => [
            <span><strong>{t.key}</strong> {String(t.title).slice(0, 60)}</span>, t.workType || t.type, fmtDate(t.dueAt), fmtDate(t.completedAt),
            fmt(t.cycleDays), t.hoursLogged || '—',
            t.onTime == null ? <span style={{ color: MUTED }}>No due date</span> : t.onTime ? <span style={{ color: GREEN }}>On time</span> : <span style={{ color: RED }}>Late</span>
          ])}
        />

        <H2 sub="Open now, earliest due first">Open work</H2>
        <Table
          head={['Task', 'Status', 'Due', 'Hours so far']}
          align={['left', 'left', 'left', 'right']}
          rows={open.slice(0, 10).map(t => [
            <span><strong>{t.key}</strong> {String(t.title).slice(0, 70)}</span>,
            t.overdue ? <span style={{ color: RED, fontWeight: 600 }}>Overdue · {t.status}</span> : t.status,
            fmtDate(t.dueAt), t.hoursLogged || '—'
          ])}
        />
      </Page>

      {/* ───────── Page 4: meetings, reviews, discussion, sign-off ───────── */}
      <Page n={4} total={TOTAL} name={name} period={period}>
        <H2 sub={`${m.meetings} attended in ${period}${m.avgMeetingMinutes ? ` · average ${m.avgMeetingMinutes} min` : ''}`}>Meetings</H2>
        <Table
          head={['Date', 'Meeting', 'Type', 'Minutes', 'Status']}
          align={['left', 'left', 'left', 'right', 'left']}
          rows={(data.meetings || []).slice(0, 10).map(mt => [fmtDate(mt.at), String(mt.title).slice(0, 60), mt.source, fmt(mt.minutes), mt.status || '—'])}
        />

        <H2>Previous manager reviews</H2>
        <Table
          head={['Date', 'Reviewer', 'Score', 'Feedback']}
          align={['left', 'left', 'right', 'left']}
          rows={(data.reviews || []).slice(0, 4).map(r => [fmtDate(r.at), r.reviewer || '—', fmt(r.score), String(r.feedback || '').slice(0, 160)])}
        />

        <H2 sub="Filled in during the meeting; included in the PDF">Review discussion</H2>
        <NoteField label="Discussion points" placeholder="What went well, what was difficult, context behind the numbers…" value={notes.discussion} asText={exporting} onChange={v => setNotes(n => ({ ...n, discussion: v }))} />
        <NoteField label="Goals agreed for the next period" placeholder="e.g. Keep on-time delivery above 90%; bring blog-banner time to under 18 h…" value={notes.goals} asText={exporting} onChange={v => setNotes(n => ({ ...n, goals: v }))} />
        <NoteField label="Support / training needed" placeholder="Tools, training, workload changes…" value={notes.support} asText={exporting} onChange={v => setNotes(n => ({ ...n, support: v }))} />
        <NoteField label="Employee comments" placeholder="The employee's own view" value={notes.employee} asText={exporting} onChange={v => setNotes(n => ({ ...n, employee: v }))} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginTop: 34 }}>
          {['Employee', 'Reviewing manager', 'HR'].map(l => (
            <div key={l}>
              <div style={{ height: 34 }} />
              <div style={{ borderTop: `1px solid ${INK}`, paddingTop: 4, fontSize: 11 }}>{l}</div>
              <div style={{ fontSize: 10, color: MUTED }}>Signature &amp; date</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 10, color: MUTED, marginTop: 18 }}>
          All figures are calculated from work recorded in the Codigix CRM (tickets, status history, time tracked while tickets are In Progress
          during working hours, work logs, meetings and manager reviews). Nothing is estimated.
        </div>
      </Page>
    </div>
  );
}

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users, CheckCircle2, Clock, Timer, AlertTriangle, Trophy, Award, Zap, Target,
  Download, Printer, ArrowLeft, Search, ChevronUp, ChevronDown, Info, Star, TrendingUp, X,
  ListChecks, MessageSquare, Video, FileText, Flame, CircleSlash
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Legend } from 'recharts';
import Swal from 'sweetalert2';
import { API_BASE_URL } from '../../config/environment';
import { useAuth } from '../../hooks/useAuth';
import PerformanceReviewReport from './PerformanceReviewReport';

/* ───────────────────────── constants & helpers ───────────────────────── */

const SERIES = '#2a78d6';           // single-series colour (reference palette slot 1)
const GRID = '#e8e7e3';
const AXIS = '#77766f';
const GRADE_STYLE = {
  Excellent: { cls: 'bg-green-50 text-green-800 border-green-200', icon: Trophy },
  Good: { cls: 'bg-blue-50 text-blue-800 border-blue-200', icon: CheckCircle2 },
  Fair: { cls: 'bg-amber-50 text-amber-800 border-amber-200', icon: Info },
  'Needs attention': { cls: 'bg-red-50 text-red-800 border-red-200', icon: AlertTriangle },
  'Not enough data': { cls: 'bg-gray-50 text-gray-600 border-gray-200', icon: CircleSlash }
};
const COMPONENT_LABELS = {
  completion: 'Completion rate',
  onTime: 'On-time delivery',
  output: 'Output (points vs. busiest peer)',
  logging: 'Time logged on finished tasks',
  efficiency: 'Efficiency (planned ÷ actual time)',
  review: 'Manager review score'
};

const fmtNum = (v, suffix = '') => (v == null ? '—' : `${v}${suffix}`);
const fmtDate = (v) => (v ? new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const fmtDateTime = (v) => (v ? new Date(v).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
const monthLabel = (key) => {
  if (!key) return '—';
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('en-GB', { month: 'long', year: 'numeric' });
};
const initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();

const currentMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const currentQuarter = () => { const d = new Date(); return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`; };
const recentQuarters = () => {
  const out = []; const d = new Date(); let y = d.getFullYear(); let q = Math.floor(d.getMonth() / 3) + 1;
  for (let i = 0; i < 8; i++) { out.push(`${y}-Q${q}`); q -= 1; if (q === 0) { q = 4; y -= 1; } }
  return out;
};

const buildQuery = (p) => {
  const params = new URLSearchParams({ period: p.period });
  if (p.period === 'custom') { params.set('from', p.from); params.set('to', p.to); } else params.set('value', p.value);
  if (p.department && p.department !== 'All') params.set('department', p.department);
  if (p.includeAdmins) params.set('includeAdmins', 'true');
  return params.toString();
};

const downloadCsv = (filename, header, rows) => {
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [header, ...rows].map(r => r.map(esc).join(',')).join('\n');
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};

const useReport = (url) => {
  const [state, setState] = useState({ loading: true, error: '', data: null, status: 0 });
  const load = useCallback(async () => {
    if (!url) return;
    setState(s => ({ ...s, loading: true, error: '' }));
    try {
      const res = await fetch(url);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setState({ loading: false, error: data.error || 'Failed to load report', data: null, status: res.status }); return; }
      setState({ loading: false, error: '', data, status: res.status });
    } catch (e) {
      setState({ loading: false, error: 'Network error — is the server running?', data: null, status: 0 });
    }
  }, [url]);
  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load };
};

/* ───────────────────────── small building blocks ───────────────────────── */

const GradeBadge = ({ grade, score }) => {
  const g = GRADE_STYLE[grade] || GRADE_STYLE['Not enough data'];
  const Icon = g.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px]  px-2 py-0.5 rounded-full border ${g.cls}`}>
      <Icon size={12} aria-hidden="true" />
      {score != null ? `${score} · ` : ''}{grade}
    </span>
  );
};

const StatTile = ({ icon: Icon, label, value, hint, tone = 'default' }) => (
  <div className="bg-white border border-gray-200 rounded p-4 flex flex-col gap-1 min-w-0">
    <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
      <Icon size={14} className={tone === 'warn' ? 'text-red-600' : 'text-gray-400'} aria-hidden="true" />
      <span className="truncate">{label}</span>
    </div>
    <div className={`text-2xl  tabular-nums ${tone === 'warn' && value && value !== '—' && value !== 0 ? 'text-red-700' : 'text-gray-900'}`}>{value}</div>
    {hint && <div className="text-[11px] text-gray-500 leading-snug">{hint}</div>}
  </div>
);

const Section = ({ title, subtitle, right, children, className = '' }) => (
  <section className={`bg-white border border-gray-200 rounded ${className}`}>
    <div className="px-4 py-3 border-b border-gray-100 flex items-start justify-between gap-3 flex-wrap">
      <div>
        <h3 className="text-sm  text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
    <div className="p-4">{children}</div>
  </section>
);

const Empty = ({ children }) => (
  <div className="text-center text-sm text-gray-500 py-8 border border-dashed border-gray-200 rounded">{children}</div>
);

const ChartTooltip = ({ active, payload, label, unit }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded shadow-sm px-3 py-2 text-xs">
      <div className=" text-gray-800 mb-0.5">{label}</div>
      <div className="text-gray-600 tabular-nums">{payload[0].value ?? 0}{unit}</div>
    </div>
  );
};

/** Single-series monthly bar chart; one measure per chart (never two axes). */
const TrendChart = ({ data, dataKey, unit = '', height = 190 }) => {
  const hasData = (data || []).some(d => Number(d[dataKey]) > 0);
  if (!hasData) return <Empty>Nothing recorded in these 12 months yet.</Empty>;
  return (
    <div style={{ height }} role="img" aria-label={`Monthly ${dataKey}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 16, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: AXIS }} tickLine={false} axisLine={{ stroke: GRID }} interval={0} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: AXIS }} tickLine={false} axisLine={false} />
          <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ fill: 'rgba(42,120,214,0.06)' }} />
          <Bar dataKey={dataKey} fill={SERIES} radius={[4, 4, 0, 0]} maxBarSize={26}>
            <LabelList dataKey={dataKey} position="top" style={{ fontSize: 10, fill: AXIS }} formatter={(v) => (v ? v : '')} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const QuarterTable = ({ rows }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
          <th className="py-2 pr-3 font-medium">Quarter</th>
          <th className="py-2 px-3 font-medium text-right">Tasks done</th>
          <th className="py-2 px-3 font-medium text-right">Hours logged</th>
          <th className="py-2 px-3 font-medium text-right">Points</th>
          <th className="py-2 px-3 font-medium text-right">On-time</th>
          <th className="py-2 px-3 font-medium text-right">Avg days / task</th>
          <th className="py-2 pl-3 font-medium text-right">Meetings</th>
        </tr>
      </thead>
      <tbody>
        {(rows || []).map(q => (
          <tr key={q.key} className="border-b border-gray-100 last:border-0">
            <td className="py-2 pr-3 font-medium text-gray-800">{q.label}</td>
            <td className="py-2 px-3 text-right tabular-nums">{q.tasksCompleted}</td>
            <td className="py-2 px-3 text-right tabular-nums">{q.hoursLogged || 0}</td>
            <td className="py-2 px-3 text-right tabular-nums">{q.pointsEarned}</td>
            <td className="py-2 px-3 text-right tabular-nums">{fmtNum(q.onTimeRate, '%')}</td>
            <td className="py-2 px-3 text-right tabular-nums">{fmtNum(q.avgCycleDays)}</td>
            <td className="py-2 pl-3 text-right tabular-nums">{q.meetings}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const ScoreExplainer = ({ weights }) => (
  <details className="text-xs text-gray-600 mt-2">
    <summary className="cursor-pointer text-blue-700 font-medium select-none">How is the score calculated?</summary>
    <div className="mt-2 space-y-1 leading-relaxed">
      <p>The score (0–100) combines only what was recorded in the selected period:</p>
      <ul className="list-disc pl-5 space-y-0.5">
        {Object.entries(weights || {}).map(([k, w]) => (
          <li key={k}><strong>{COMPONENT_LABELS[k]}</strong> — weight {w}</li>
        ))}
      </ul>
      <p>Parts with no data (for example no due dates, or no review) are left out and the rest are re-weighted.
        With no finished task and no review, the grade is <em>Not enough data</em> rather than a guess.
        Grades: 85+ Excellent · 70+ Good · 50+ Fair · below 50 Needs attention.</p>
    </div>
  </details>
);

/* ───────────────────────── insights, comparisons, scorecards ───────────────────────── */

const InsightsCard = ({ insights }) => {
  const s = insights?.strengths || [];
  const a = insights?.attention || [];
  return (
    <Section title="Summary" subtitle="Observations from the recorded numbers">
      {s.length === 0 && a.length === 0 ? (
        <Empty>Not enough recorded work in this period to draw conclusions.</Empty>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-xs  text-green-800 mb-2 flex items-center gap-1"><CheckCircle2 size={13} aria-hidden="true" /> Strengths</h4>
            {s.length ? (
              <ul className="space-y-1.5">{s.map((t, i) => <li key={i} className="text-sm text-gray-800 pl-3 border-l-2 border-green-300">{t}</li>)}</ul>
            ) : <p className="text-xs text-gray-500">None stand out yet.</p>}
          </div>
          <div>
            <h4 className="text-xs  text-red-800 mb-2 flex items-center gap-1"><AlertTriangle size={13} aria-hidden="true" /> Needs attention</h4>
            {a.length ? (
              <ul className="space-y-1.5">{a.map((t, i) => <li key={i} className="text-sm text-gray-800 pl-3 border-l-2 border-red-300">{t}</li>)}</ul>
            ) : <p className="text-xs text-gray-500">Nothing flagged.</p>}
          </div>
        </div>
      )}
    </Section>
  );
};

// "Better" direction per measure, so the comparison can say ahead/behind correctly.
const COMPARE_ROWS = [
  ['score', 'Score', '', 'up'],
  ['tasksCompleted', 'Tasks completed', '', 'up'],
  ['onTimeRate', 'On-time delivery', '%', 'up'],
  ['avgHoursPerTask', 'Avg hours per task', ' h', 'down'],
  ['efficiency', 'Efficiency (planned ÷ actual)', '%', 'up'],
  ['avgCycleDays', 'Avg days start → done', ' d', 'down'],
  ['hoursLogged', 'Hours logged', ' h', 'up'],
  ['activeDays', 'Active days', '', 'up'],
  ['meetings', 'Meetings', '', 'neutral']
];

const CompareTable = ({ me, team }) => (
  <table className="w-full text-sm">
    <thead>
      <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
        <th className="py-2 pr-3 font-medium">Measure</th>
        <th className="py-2 px-3 font-medium text-right">This person</th>
        <th className="py-2 px-3 font-medium text-right">Department average</th>
        <th className="py-2 pl-3 font-medium text-right">vs average</th>
      </tr>
    </thead>
    <tbody>
      {COMPARE_ROWS.map(([k, label, unit, better]) => {
        const v = me[k]; const t = team[k];
        let verdict = <span className="text-gray-400">—</span>;
        if (v != null && t != null && better !== 'neutral' && t !== 0) {
          const ahead = better === 'up' ? v > t : v < t;
          const same = Math.abs(v - t) / Math.abs(t) < 0.05;
          verdict = same
            ? <span className="text-gray-600">On par</span>
            : <span className={ahead ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>{ahead ? 'Ahead' : 'Behind'}</span>;
        }
        return (
          <tr key={k} className="border-b border-gray-100 last:border-0">
            <td className="py-2 pr-3 text-gray-700">{label}</td>
            <td className="py-2 px-3 text-right tabular-nums  text-gray-900">{fmtNum(v, unit)}</td>
            <td className="py-2 px-3 text-right tabular-nums text-gray-600">{fmtNum(t, unit)}</td>
            <td className="py-2 pl-3 text-right text-xs">{verdict}</td>
          </tr>
        );
      })}
    </tbody>
  </table>
);

const WorkTypeTable = ({ rows, team = false }) => {
  if (!rows || !rows.length) return <Empty>No finished work to group yet.</Empty>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[560px]">
        <thead>
          <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
            <th className="py-2 pr-3 font-medium">Work type</th>
            <th className="py-2 px-3 font-medium text-right">Finished</th>
            {team && <th className="py-2 px-3 font-medium text-right">People</th>}
            <th className="py-2 px-3 font-medium text-right">Avg hours / task</th>
            {!team && <th className="py-2 px-3 font-medium text-right">Team avg hours</th>}
            <th className="py-2 px-3 font-medium text-right">{team ? 'Avg days start → done' : 'On-time'}</th>
            {team && <th className="py-2 pl-3 font-medium text-right">Tasks with time</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const faster = !team && r.avgHours != null && r.teamAvgHours != null && r.avgHours < r.teamAvgHours * 0.95;
            const slower = !team && r.avgHours != null && r.teamAvgHours != null && r.avgHours > r.teamAvgHours * 1.05;
            return (
              <tr key={r.workType} className="border-b border-gray-100 last:border-0">
                <td className="py-2 pr-3 font-medium text-gray-800">{r.workType}</td>
                <td className="py-2 px-3 text-right tabular-nums">{r.completed}</td>
                {team && <td className="py-2 px-3 text-right tabular-nums">{r.people}</td>}
                <td className={`py-2 px-3 text-right tabular-nums ${faster ? 'text-green-700 ' : slower ? 'text-red-700 ' : ''}`}>{fmtNum(r.avgHours, ' h')}</td>
                {!team && <td className="py-2 px-3 text-right tabular-nums text-gray-600">{fmtNum(r.teamAvgHours, ' h')}</td>}
                <td className="py-2 px-3 text-right tabular-nums">{team ? fmtNum(r.avgDays, ' d') : fmtNum(r.onTimeRate, '%')}</td>
                {team && <td className="py-2 pl-3 text-right tabular-nums text-gray-600">{r.tasksWithTime}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="text-[11px] text-gray-500 mt-2">
        Work type is the ticket's label (e.g. GMB Graphics, Content Writing), or its type when it has none.
        {team ? ' Averages use all recorded history so they are stable enough to compare against.' : ' Green: faster than the team average; red: slower.'}
      </p>
    </div>
  );
};

const ScorecardTable = ({ rows, quarter = false }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm min-w-[820px]">
      <thead>
        <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
          <th className="py-2 pr-3 font-medium">{quarter ? 'Quarter' : 'Month'}</th>
          <th className="py-2 px-3 font-medium">Score</th>
          <th className="py-2 px-3 font-medium text-right">Rank</th>
          <th className="py-2 px-3 font-medium text-right">Tasks</th>
          <th className="py-2 px-3 font-medium text-right">Hours</th>
          <th className="py-2 px-3 font-medium text-right">Avg h / task</th>
          <th className="py-2 px-3 font-medium text-right">Efficiency</th>
          <th className="py-2 px-3 font-medium text-right">On-time</th>
          <th className="py-2 px-3 font-medium text-right">Avg days</th>
          {!quarter && <th className="py-2 px-3 font-medium text-right">Active days</th>}
          <th className="py-2 pl-3 font-medium text-right">Meetings</th>
        </tr>
      </thead>
      <tbody>
        {(rows || []).map(r => {
          const empty = !r.tasksCompleted && !r.hoursLogged && !r.meetings && r.score == null;
          return (
            <tr key={r.key} className={`border-b border-gray-100 last:border-0 ${empty ? 'text-gray-400' : ''}`}>
              <td className="py-2 pr-3 font-medium whitespace-nowrap">{r.label}</td>
              <td className="py-2 px-3">{r.score != null ? <GradeBadge grade={r.grade} score={r.score} /> : <span className="text-xs">—</span>}</td>
              <td className="py-2 px-3 text-right tabular-nums">{r.rank ? `#${r.rank} / ${r.rankedOutOf}` : '—'}</td>
              <td className="py-2 px-3 text-right tabular-nums">{r.tasksCompleted}</td>
              <td className="py-2 px-3 text-right tabular-nums">{r.hoursLogged || 0}</td>
              <td className="py-2 px-3 text-right tabular-nums">{fmtNum(r.avgHoursPerTask)}</td>
              <td className="py-2 px-3 text-right tabular-nums">{fmtNum(r.efficiency, '%')}</td>
              <td className="py-2 px-3 text-right tabular-nums">{fmtNum(r.onTimeRate, '%')}</td>
              <td className="py-2 px-3 text-right tabular-nums">{fmtNum(r.avgCycleDays)}</td>
              {!quarter && <td className="py-2 px-3 text-right tabular-nums">{r.activeDays}</td>}
              <td className="py-2 pl-3 text-right tabular-nums">{r.meetings}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

const DataQualityCard = ({ dq }) => {
  if (!dq) return null;
  const items = [
    [`${dq.unassignedTickets} of ${dq.ticketsInPeriod}`, 'tickets have no assignee', dq.unassignedTickets > 0, 'Unassigned work counts for nobody.'],
    [fmtNum(dq.completedWithTimeLogged, '%'), 'of finished tasks have time recorded', dq.completedWithTimeLogged != null && dq.completedWithTimeLogged < 70, 'Time is recorded automatically while a ticket is In Progress.'],
    [fmtNum(dq.completedWithDueDate, '%'), 'of finished tasks had a due date', dq.completedWithDueDate != null && dq.completedWithDueDate < 70, 'On-time delivery can only be judged with a due date.'],
    [dq.peopleWithNoActivity.length, 'people with no recorded activity', dq.peopleWithNoActivity.length > 0, dq.peopleWithNoActivity.map(p => p.name).join(', ')]
  ];
  return (
    <Section title="How complete the data is" subtitle="Low coverage means the figures above understate real work">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {items.map(([value, label, warn, hint], i) => (
          <div key={i} className={`rounded border p-3 ${warn ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-white'}`}>
            <div className={`text-lg  tabular-nums ${warn ? 'text-amber-900' : 'text-gray-900'}`}>{value}</div>
            <div className="text-xs text-gray-700">{label}</div>
            {hint && <div className="text-[11px] text-gray-500 mt-1 line-clamp-2" title={hint}>{hint}</div>}
          </div>
        ))}
      </div>
    </Section>
  );
};

/* ───────────────────────── champions & records ───────────────────────── */

const PersonCell = ({ p, unit = '', onOpen }) => p ? (
  <button onClick={() => onOpen(p.id)} className="text-left hover:text-blue-700 cursor-pointer">
    <div className="text-sm font-medium text-gray-900 truncate max-w-[170px]">{p.name}</div>
    <div className="text-[11px] text-gray-500 tabular-nums">{p.score != null ? `Score ${p.score}` : `${p.value}${unit}`}</div>
  </button>
) : <span className="text-xs text-gray-400">—</span>;

const ChampionsTable = ({ rows, onOpen, quarter }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm min-w-[880px]">
      <thead>
        <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
          <th className="py-2 pr-3 font-medium">{quarter ? 'Quarter' : 'Month'}</th>
          <th className="py-2 px-3 font-medium">Top performer</th>
          <th className="py-2 px-3 font-medium">Most tasks</th>
          <th className="py-2 px-3 font-medium">Most hours</th>
          <th className="py-2 px-3 font-medium">Best on-time</th>
          <th className="py-2 px-3 font-medium">Most meetings</th>
          <th className="py-2 pl-3 font-medium text-right">Team tasks / hours</th>
        </tr>
      </thead>
      <tbody>
        {(rows || []).map(r => (
          <tr key={r.key} className="border-b border-gray-100 last:border-0 align-top">
            <td className="py-2 pr-3 font-medium text-gray-800 whitespace-nowrap">{r.label}</td>
            <td className="py-2 px-3">
              {r.topPerformer ? (
                <div className="flex items-start gap-1.5"><Trophy size={14} className="text-amber-500 mt-0.5 shrink-0" aria-hidden="true" /><PersonCell p={r.topPerformer} onOpen={onOpen} /></div>
              ) : <span className="text-xs text-gray-400">No one scored</span>}
            </td>
            <td className="py-2 px-3"><PersonCell p={r.mostCompleted} unit=" tasks" onOpen={onOpen} /></td>
            <td className="py-2 px-3"><PersonCell p={r.mostHours} unit=" h" onOpen={onOpen} /></td>
            <td className="py-2 px-3"><PersonCell p={r.bestOnTime} unit="%" onOpen={onOpen} /></td>
            <td className="py-2 px-3"><PersonCell p={r.mostMeetings} onOpen={onOpen} /></td>
            <td className="py-2 pl-3 text-right tabular-nums text-gray-700">{r.tasksCompleted} / {r.hoursLogged || 0} h</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const ChampionsView = ({ data, onOpenEmployee }) => {
  const rec = data.records || {};
  return (
    <div className="space-y-4">
      <Section title="All-time team records" subtitle="Best ever, across everyone in this view">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          <BestTile icon={Trophy} label="Most tasks in a month" value={rec.mostTasksInAMonth ? `${rec.mostTasksInAMonth.value} tasks` : null}
            detail={rec.mostTasksInAMonth ? `${rec.mostTasksInAMonth.name} · ${monthLabel(rec.mostTasksInAMonth.month)}` : 'No finished tasks yet'} />
          <BestTile icon={Clock} label="Most hours in a month" value={rec.mostHoursInAMonth ? `${rec.mostHoursInAMonth.value} h` : null}
            detail={rec.mostHoursInAMonth ? `${rec.mostHoursInAMonth.name} · ${monthLabel(rec.mostHoursInAMonth.month)}` : 'No time recorded yet'} />
          <BestTile icon={Flame} label="Longest on-time run" value={rec.longestOnTimeStreak ? `${rec.longestOnTimeStreak.value} in a row` : null}
            detail={rec.longestOnTimeStreak ? rec.longestOnTimeStreak.name : 'Needs tasks with due dates'} />
          <BestTile icon={Zap} label="Fastest task" value={rec.fastestTask ? `${rec.fastestTask.days} days` : null}
            detail={rec.fastestTask ? `${rec.fastestTask.name} · ${rec.fastestTask.key}` : undefined} />
          <BestTile icon={TrendingUp} label="Team's best month" value={rec.teamBestMonth ? `${rec.teamBestMonth.value} tasks` : null}
            detail={rec.teamBestMonth ? monthLabel(rec.teamBestMonth.month) : undefined} />
        </div>
      </Section>
      <Section title="Monthly champions" subtitle="Last 12 months, newest first. Click a name for their report.">
        <ChampionsTable rows={data.champions?.monthly} onOpen={onOpenEmployee} />
        <p className="text-[11px] text-gray-500 mt-2">Top performer = highest score that month. Best on-time needs at least 3 finished tasks with due dates.</p>
      </Section>
      <Section title="Quarterly champions" subtitle="Last 4 quarters">
        <ChampionsTable rows={data.champions?.quarterly} onOpen={onOpenEmployee} quarter />
      </Section>
    </div>
  );
};

/* ───────────────────────── period & filter bar ───────────────────────── */

const PeriodBar = ({ params, setParams, departments, onExport, onPrint, showDepartment = true }) => (
  <div className="flex flex-wrap items-end gap-2 no-print">
    <div className="inline-flex rounded border border-gray-300 overflow-hidden" role="tablist" aria-label="Report period">
      {[['month', 'Monthly'], ['quarter', 'Quarterly'], ['year', 'Yearly'], ['custom', 'Custom']].map(([p, label]) => (
        <button
          key={p}
          role="tab"
          aria-selected={params.period === p}
          onClick={() => setParams(prev => ({
            ...prev,
            period: p,
            value: p === 'month' ? currentMonth() : p === 'quarter' ? currentQuarter() : p === 'year' ? String(new Date().getFullYear()) : prev.value
          }))}
          className={`px-3 py-1.5 text-xs font-medium border-r border-gray-300 last:border-r-0 cursor-pointer ${params.period === p ? 'bg-red-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
        >
          {label}
        </button>
      ))}
    </div>

    {params.period === 'month' && (
      <input type="month" value={params.value} max={currentMonth()} onChange={e => setParams(p => ({ ...p, value: e.target.value }))}
        className="text-xs border border-gray-300 rounded px-2 py-1.5 bg-white" aria-label="Month" />
    )}
    {params.period === 'quarter' && (
      <select value={params.value} onChange={e => setParams(p => ({ ...p, value: e.target.value }))}
        className="text-xs border border-gray-300 rounded px-2 py-1.5 bg-white" aria-label="Quarter">
        {recentQuarters().map(q => <option key={q} value={q}>{q.replace('-', ' ')}</option>)}
      </select>
    )}
    {params.period === 'year' && (
      <select value={params.value} onChange={e => setParams(p => ({ ...p, value: e.target.value }))}
        className="text-xs border border-gray-300 rounded px-2 py-1.5 bg-white" aria-label="Year">
        {[0, 1, 2, 3].map(i => String(new Date().getFullYear() - i)).map(y => <option key={y} value={y}>{y}</option>)}
      </select>
    )}
    {params.period === 'custom' && (
      <>
        <input type="date" value={params.from} max={params.to} onChange={e => setParams(p => ({ ...p, from: e.target.value }))}
          className="text-xs border border-gray-300 rounded px-2 py-1.5 bg-white" aria-label="From" />
        <span className="text-xs text-gray-500 pb-1.5">to</span>
        <input type="date" value={params.to} min={params.from} onChange={e => setParams(p => ({ ...p, to: e.target.value }))}
          className="text-xs border border-gray-300 rounded px-2 py-1.5 bg-white" aria-label="To" />
      </>
    )}

    {showDepartment && departments && departments.length > 0 && (
      <select value={params.department} onChange={e => setParams(p => ({ ...p, department: e.target.value }))}
        className="text-xs border border-gray-300 rounded px-2 py-1.5 bg-white" aria-label="Department">
        <option value="All">All departments</option>
        {departments.map(d => <option key={d} value={d}>{d}</option>)}
      </select>
    )}
    {showDepartment && (
      <label className="inline-flex items-center gap-1.5 text-xs text-gray-700 pb-1.5 cursor-pointer select-none">
        <input type="checkbox" checked={Boolean(params.includeAdmins)} onChange={e => setParams(p => ({ ...p, includeAdmins: e.target.checked }))} />
        Include admins
      </label>
    )}

    <div className="flex-1" />
    {onExport && (
      <button onClick={onExport} className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-pointer">
        <Download size={13} /> Export CSV
      </button>
    )}
    {onPrint && (
      <button onClick={onPrint} className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-pointer">
        <Printer size={13} /> Print / PDF
      </button>
    )}
  </div>
);

/* ───────────────────────── team overview ───────────────────────── */

const LeaderCard = ({ icon: Icon, label, leader, unit, onOpen }) => (
  <button
    disabled={!leader}
    onClick={() => leader && onOpen(leader.id)}
    className="text-left bg-white border border-gray-200 rounded p-3 hover:border-blue-300 hover:shadow-sm transition disabled:cursor-default disabled:hover:border-gray-200 disabled:hover:shadow-none cursor-pointer"
  >
    <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium"><Icon size={13} className="text-amber-600" aria-hidden="true" />{label}</div>
    {leader ? (
      <>
        <div className="text-sm  text-gray-900 mt-1 truncate">{leader.name}</div>
        <div className="text-xs text-gray-600 tabular-nums">{leader.value}{unit}</div>
      </>
    ) : (
      <div className="text-xs text-gray-400 mt-1">No one qualifies yet</div>
    )}
  </button>
);

const TeamOverview = ({ data, onOpenEmployee }) => {
  const t = data.team;
  const noTime = !t.hoursLogged;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        <StatTile icon={CheckCircle2} label="Tasks completed" value={t.tasksCompleted} hint={`of ${t.tasksAssigned} in the period`} />
        <StatTile icon={Clock} label="Hours logged" value={t.hoursLogged || 0} hint={noTime ? 'No time was logged' : 'Working hours, all sources'} />
        <StatTile icon={Timer} label="Avg hours / task" value={t.avgHoursPerTask != null ? `${t.avgHoursPerTask} h` : '—'} hint="Recorded time per finished task" />
        <StatTile icon={Zap} label="Efficiency" value={fmtNum(t.efficiency, '%')} hint={t.plannedHours ? `Planned ${t.plannedHours} h · took ${t.actualHoursOnPlanned} h` : 'Needs planned time on tasks'} />
        <StatTile icon={Target} label="On-time delivery" value={fmtNum(t.onTimeRate, '%')} hint="Finished tasks that had a due date" />
        <StatTile icon={Timer} label="Avg completion time" value={t.avgCycleDays != null ? `${t.avgCycleDays} d` : '—'} hint="Start → done, per task" />
        <StatTile icon={Video} label="Meetings" value={t.meetings} hint={t.meetingHours ? `${t.meetingHours} h in meetings` : 'Meetings & calls'} />
        <StatTile icon={AlertTriangle} label="Overdue now" value={t.overdueOpen} tone="warn" hint="Past due date, not finished" />
      </div>

      {(noTime || t.tasksCompleted === 0) && (
        <div className="flex gap-2 text-xs bg-amber-50 border border-amber-200 text-amber-900 rounded p-3">
          <Info size={15} className="shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            {t.tasksCompleted === 0 && <p>No task was marked Done in this period, so completion and timing figures are empty.</p>}
            {noTime && <p>No time was recorded in this period. Time is now recorded automatically while a ticket is In Progress (working hours only), and people can also add entries in a ticket's Work log tab.</p>}
          </div>
        </div>
      )}

      <DataQualityCard dq={data.dataQuality} />

      <Section title="Best records this period" subtitle="Click a name to open their report">
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
          <LeaderCard icon={Trophy} label="Most tasks completed" leader={data.leaders.mostCompleted} unit=" tasks" onOpen={onOpenEmployee} />
          <LeaderCard icon={Star} label="Most points earned" leader={data.leaders.mostPoints} unit=" pts" onOpen={onOpenEmployee} />
          <LeaderCard icon={Clock} label="Most hours logged" leader={data.leaders.mostHours} unit=" h" onOpen={onOpenEmployee} />
          <LeaderCard icon={Target} label="Best on-time rate" leader={data.leaders.bestOnTime} unit="%" onOpen={onOpenEmployee} />
          <LeaderCard icon={Zap} label="Fastest avg completion" leader={data.leaders.fastestCycle} unit=" days" onOpen={onOpenEmployee} />
          <LeaderCard icon={Video} label="Most meetings" leader={data.leaders.mostMeetings} unit="" onOpen={onOpenEmployee} />
          <LeaderCard icon={Zap} label="Best efficiency" leader={data.leaders.bestEfficiency} unit="%" onOpen={onOpenEmployee} />
        </div>
        <p className="text-[11px] text-gray-500 mt-2">On-time, speed and efficiency records need at least 3 finished tasks, so one quick task doesn't top the list.</p>
      </Section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Section title="Tasks completed per month" subtitle="Last 12 months">
          <TrendChart data={data.monthly} dataKey="tasksCompleted" unit=" tasks" />
        </Section>
        <Section title="Hours logged per month" subtitle="Last 12 months">
          <TrendChart data={data.monthly} dataKey="hoursLogged" unit=" h" />
        </Section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Section title="Quarter by quarter" subtitle="Last 4 quarters" className="xl:col-span-2">
          <QuarterTable rows={data.quarterly} />
        </Section>
        <Section title="Grade spread" subtitle={t.avgScore != null ? `Team average score ${t.avgScore}` : 'No one has a score yet'}>
          <ul className="space-y-2">
            {t.gradeCounts.map(g => (
              <li key={g.grade} className="flex items-center justify-between gap-2">
                <GradeBadge grade={g.grade} />
                <span className="text-sm  tabular-nums text-gray-800">{g.count}</span>
              </li>
            ))}
          </ul>
          <ScoreExplainer weights={data.scoreWeights} />
        </Section>
      </div>
    </div>
  );
};

/* ───────────────────────── employees table ───────────────────────── */

const COLUMNS = [
  { key: 'rank', label: 'Rank', get: r => -(r.rank ?? 9999) },
  { key: 'name', label: 'Employee', get: r => r.name, align: 'left' },
  { key: 'score', label: 'Score', get: r => r.score ?? -1 },
  { key: 'completed', label: 'Done / assigned', get: r => r.metrics.tasksCompleted },
  { key: 'onTime', label: 'On-time', get: r => r.metrics.onTimeRate ?? -1 },
  { key: 'cycle', label: 'Avg days', get: r => r.metrics.avgCycleDays ?? 9999 },
  { key: 'hours', label: 'Hours', get: r => r.metrics.hoursLogged ?? 0 },
  { key: 'perTask', label: 'Avg h / task', get: r => r.metrics.avgHoursPerTask ?? -1 },
  { key: 'efficiency', label: 'Efficiency', get: r => r.metrics.efficiency ?? -1 },
  { key: 'points', label: 'Points', get: r => r.metrics.pointsEarned },
  { key: 'meetings', label: 'Meetings', get: r => r.metrics.meetings },
  { key: 'activeDays', label: 'Active days', get: r => r.metrics.activeDays },
  { key: 'overdue', label: 'Overdue', get: r => r.metrics.overdueOpen }
];

const EmployeesTable = ({ data, onOpenEmployee }) => {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState({ key: 'rank', dir: 'desc' });
  const maxDone = Math.max(1, ...data.employees.map(e => e.metrics.tasksCompleted));

  const rows = useMemo(() => {
    const col = COLUMNS.find(c => c.key === sort.key) || COLUMNS[1];
    const q = search.trim().toLowerCase();
    return data.employees
      .filter(e => !q || e.name.toLowerCase().includes(q) || String(e.role).toLowerCase().includes(q) || String(e.department).toLowerCase().includes(q))
      .sort((a, b) => {
        const va = col.get(a); const vb = col.get(b);
        const cmp = typeof va === 'string' ? va.localeCompare(vb) : va - vb;
        return sort.dir === 'asc' ? cmp : -cmp;
      });
  }, [data.employees, search, sort]);

  const toggleSort = (key) => setSort(s => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }));

  return (
    <Section
      title={`Employees (${rows.length})`}
      subtitle="Click a row for the full report. Click a column to sort."
      right={(
        <div className="relative no-print">
          <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, role, department"
            className="pl-7 pr-2 py-1.5 text-xs border border-gray-300 rounded w-60 max-w-full" />
        </div>
      )}
    >
      <div className="overflow-x-auto -mx-4">
        <table className="w-full text-sm min-w-[1180px]">
          <thead>
            <tr className="text-xs text-gray-500 border-b border-gray-200">
              {COLUMNS.map(c => (
                <th key={c.key} className={`py-2 px-3 font-medium ${c.align === 'left' ? 'text-left pl-4' : 'text-right'}`}>
                  <button onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-0.5 hover:text-gray-900 cursor-pointer">
                    {c.label}
                    {sort.key === c.key && (sort.dir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} onClick={() => onOpenEmployee(r.id)} className="border-b border-gray-100 last:border-0 hover:bg-blue-50/40 cursor-pointer">
                <td className="py-2.5 px-3 text-right tabular-nums  text-gray-700">{r.rank ? `#${r.rank}` : '—'}</td>
                <td className="py-2.5 px-3 pl-4">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center text-[11px]  shrink-0">{initials(r.name)}</div>
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 truncate">{r.name}</div>
                      <div className="text-[11px] text-gray-500 truncate">{r.role} · {r.department}</div>
                    </div>
                  </div>
                </td>
                <td className="py-2.5 px-3 text-right"><GradeBadge grade={r.grade} score={r.score} /></td>
                <td className="py-2.5 px-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden hidden md:block" aria-hidden="true">
                      <div className="h-full rounded-full" style={{ width: `${(r.metrics.tasksCompleted / maxDone) * 100}%`, background: SERIES }} />
                    </div>
                    <span className="tabular-nums">{r.metrics.tasksCompleted}<span className="text-gray-400"> / {r.metrics.tasksAssigned}</span></span>
                  </div>
                </td>
                <td className="py-2.5 px-3 text-right tabular-nums">{fmtNum(r.metrics.onTimeRate, '%')}</td>
                <td className="py-2.5 px-3 text-right tabular-nums">{fmtNum(r.metrics.avgCycleDays)}</td>
                <td className="py-2.5 px-3 text-right tabular-nums">{r.metrics.hoursLogged || 0}</td>
                <td className="py-2.5 px-3 text-right tabular-nums">{fmtNum(r.metrics.avgHoursPerTask)}</td>
                <td className={`py-2.5 px-3 text-right tabular-nums ${r.metrics.efficiency == null ? '' : r.metrics.efficiency >= 90 ? 'text-green-700' : r.metrics.efficiency < 75 ? 'text-red-700' : 'text-amber-700'}`}>{fmtNum(r.metrics.efficiency, '%')}</td>
                <td className="py-2.5 px-3 text-right tabular-nums">{r.metrics.pointsEarned}</td>
                <td className="py-2.5 px-3 text-right tabular-nums">{r.metrics.meetings}</td>
                <td className="py-2.5 px-3 text-right tabular-nums">{r.metrics.activeDays}</td>
                <td className={`py-2.5 px-3 pr-4 text-right tabular-nums ${r.metrics.overdueOpen > 0 ? 'text-red-700 ' : ''}`}>{r.metrics.overdueOpen}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <Empty>No employees match.</Empty>}
      </div>
    </Section>
  );
};

/* ───────────────────────── planned vs actual ───────────────────────── */

const VERDICT_STYLE = {
  'On plan': 'bg-green-50 text-green-800 border-green-200',
  'Under plan': 'bg-emerald-50 text-emerald-800 border-emerald-200',
  'Over plan': 'bg-red-50 text-red-800 border-red-200',
  'No plan': 'bg-amber-50 text-amber-800 border-amber-200',
  'No time recorded': 'bg-gray-50 text-gray-600 border-gray-200'
};

const PlannedVsActual = ({ metrics: m, tasks }) => {
  const rows = (tasks || []).filter(t => t.estimateHours);
  const chart = rows.filter(t => t.hoursLogged).slice(0, 12).reverse()
    .map(t => ({ label: t.key, Planned: Math.round(t.estimateHours * 10) / 10, Actual: t.hoursLogged }));
  return (
    <Section title="Planned vs actual time" subtitle="Finished tasks in this period that had a planned time. Efficiency = planned ÷ actual (100% = exactly on plan).">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <StatTile icon={Target} label="Planned" value={fmtNum(m.plannedHours, ' h')} />
        <StatTile icon={Clock} label="Actual" value={fmtNum(m.actualHoursOnPlanned, ' h')} />
        <StatTile icon={Zap} label="Efficiency" value={fmtNum(m.efficiency, '%')} tone={m.efficiency != null && m.efficiency < 75 ? 'warn' : 'default'} />
        <StatTile icon={CheckCircle2} label="Within plan" value={m.tasksWithPlan ? `${m.tasksWithinPlan} / ${m.tasksWithPlan}` : '—'} hint="Up to 10% over counts as within" />
        <StatTile icon={Info} label="Tasks with a plan" value={fmtNum(m.planCoverage, '%')} hint="of finished tasks" />
      </div>
      {chart.length > 0 && (
        <div style={{ height: 220 }} role="img" aria-label="Planned and actual hours per task">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: AXIS }} tickLine={false} axisLine={{ stroke: GRID }} interval={0} />
              <YAxis tick={{ fontSize: 11, fill: AXIS }} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v, n) => [`${v} h`, n]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Planned" fill="#c3c2bb" radius={[3, 3, 0, 0]} maxBarSize={18} />
              <Bar dataKey="Actual" fill={SERIES} radius={[3, 3, 0, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {rows.length === 0 ? (
        <Empty>No finished task in this period had a planned time. Set "Planned time" on tickets to measure efficiency.</Empty>
      ) : (
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-sm min-w-[680px]">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                <th className="py-2 pr-3 font-medium">Task</th>
                <th className="py-2 px-3 font-medium">Work type</th>
                <th className="py-2 px-3 font-medium text-right">Planned</th>
                <th className="py-2 px-3 font-medium text-right">Actual</th>
                <th className="py-2 px-3 font-medium text-right">Difference</th>
                <th className="py-2 px-3 font-medium text-right">Efficiency</th>
                <th className="py-2 pl-3 font-medium">Result</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(t => (
                <tr key={t.key} className="border-b border-gray-100 last:border-0">
                  <td className="py-2 pr-3 max-w-[300px]"><div className="text-[11px] text-gray-500">{t.key}</div><div className="truncate" title={t.title}>{t.title}</div></td>
                  <td className="py-2 px-3 text-xs text-gray-700">{t.workType}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{Math.round(t.estimateHours * 10) / 10} h</td>
                  <td className="py-2 px-3 text-right tabular-nums">{t.hoursLogged ? `${t.hoursLogged} h` : '—'}</td>
                  <td className={`py-2 px-3 text-right tabular-nums ${t.varianceHours > 0 ? 'text-red-700' : t.varianceHours < 0 ? 'text-green-700' : ''}`}>{t.varianceHours == null ? '—' : `${t.varianceHours > 0 ? '+' : ''}${t.varianceHours} h`}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{fmtNum(t.efficiency, '%')}</td>
                  <td className="py-2 pl-3"><span className={`text-[11px] px-1.5 py-0.5 rounded border ${VERDICT_STYLE[t.planVerdict] || VERDICT_STYLE['No plan']}`}>{t.planVerdict}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
};

/* ───────────────────────── review modal ───────────────────────── */

const ReviewModal = ({ employee, metrics, onClose, onSaved }) => {
  // Pre-fill from the recorded numbers so a review starts from evidence, not a blank form.
  const [form, setForm] = useState({
    taskCompletion: metrics?.completionRate ?? 0,
    quality: 0,
    onTime: metrics?.onTimeRate ?? 0,
    efficiency: 0,
    feedback: ''
  });
  const [saving, setSaving] = useState(false);
  const fields = [
    ['taskCompletion', 'Task completion', 'Pre-filled from the completion rate'],
    ['quality', 'Quality of work', 'Your judgement: accuracy, rework, standards'],
    ['onTime', 'On-time delivery', 'Pre-filled from the on-time rate'],
    ['efficiency', 'Efficiency', 'Your judgement: speed vs. estimates, focus']
  ];
  const overall = Math.round((Number(form.taskCompletion) + Number(form.quality) + Number(form.onTime) + Number(form.efficiency)) / 4);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/hr/performance/employees/${employee.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to save the review');
      Swal.fire({ icon: 'success', title: 'Review saved', timer: 1500, showConfirmButton: false });
      onSaved();
    } catch (e) {
      Swal.fire('Could not save', e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-black/40 flex items-center justify-center p-4" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base  text-gray-900">Review — {employee.name}</h2>
          <button onClick={onClose} className="p-1 text-gray-500 hover:bg-gray-100 rounded cursor-pointer"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto">
          {fields.map(([k, label, hint]) => (
            <div key={k}>
              <div className="flex items-center justify-between text-sm">
                <label htmlFor={`rv-${k}`} className="font-medium text-gray-800">{label}</label>
                <span className="tabular-nums  text-gray-900">{form[k]}</span>
              </div>
              <input id={`rv-${k}`} type="range" min="0" max="100" value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: Number(e.target.value) }))} className="w-full accent-blue-600" />
              <p className="text-[11px] text-gray-500">{hint}</p>
            </div>
          ))}
          <div>
            <label htmlFor="rv-feedback" className="text-sm font-medium text-gray-800">Feedback</label>
            <textarea id="rv-feedback" rows={4} value={form.feedback} onChange={e => setForm(f => ({ ...f, feedback: e.target.value }))}
              placeholder="Strengths, areas to improve, agreed goals for next period"
              className="mt-1 w-full text-sm border border-gray-300 rounded p-2 outline-none focus:border-blue-500" />
          </div>
        </div>
        <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-between">
          <span className="text-sm text-gray-600">Overall: <strong className="tabular-nums text-gray-900">{overall}</strong>/100</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer">Cancel</button>
            <button onClick={save} disabled={saving} className="px-4 py-1.5 text-sm font-medium bg-red-600 text-white rounded hover:bg-gray-800 disabled:opacity-50 cursor-pointer">
              {saving ? 'Saving…' : 'Save review'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ───────────────────────── employee report ───────────────────────── */

const DETAIL_TABS = [
  ['completed', 'Completed tasks', ListChecks],
  ['open', 'Open tasks', FileText],
  ['time', 'Time log', Clock],
  ['meetings', 'Meetings', Video],
  ['activity', 'Activity', MessageSquare],
  ['reviews', 'Reviews', Star]
];

const TaskTable = ({ rows, open }) => {
  if (!rows.length) return <Empty>{open ? 'No open tasks.' : 'No task finished in this period.'}</Empty>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[760px]">
        <thead>
          <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
            <th className="py-2 pr-3 font-medium">Task</th>
            <th className="py-2 px-3 font-medium">Status</th>
            <th className="py-2 px-3 font-medium">Due</th>
            {!open && <th className="py-2 px-3 font-medium">Finished</th>}
            {!open && <th className="py-2 px-3 font-medium text-right">Days</th>}
            <th className="py-2 px-3 font-medium text-right">Hours</th>
            <th className="py-2 pl-3 font-medium text-right">Points</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(t => (
            <tr key={`${t.source}-${t.key}`} className="border-b border-gray-100 last:border-0 align-top">
              <td className="py-2 pr-3 max-w-[360px]">
                <div className="text-[11px] text-gray-500">{t.key} · {t.source}</div>
                <div className="text-gray-900 line-clamp-2" title={t.title}>{t.title}</div>
              </td>
              <td className="py-2 px-3 text-xs">
                {open
                  ? (t.overdue
                    ? <span className="inline-flex items-center gap-1 text-red-700 "><AlertTriangle size={12} aria-hidden="true" />Overdue</span>
                    : <span className="text-gray-700">{t.status}</span>)
                  : (t.onTime == null
                    ? <span className="text-gray-500">No due date</span>
                    : t.onTime
                      ? <span className="inline-flex items-center gap-1 text-green-700 font-medium"><CheckCircle2 size={12} aria-hidden="true" />On time</span>
                      : <span className="inline-flex items-center gap-1 text-red-700 font-medium"><AlertTriangle size={12} aria-hidden="true" />Late</span>)}
              </td>
              <td className="py-2 px-3 text-xs text-gray-700 whitespace-nowrap">{fmtDate(t.dueAt)}</td>
              {!open && (
                <td className="py-2 px-3 text-xs text-gray-700 whitespace-nowrap">
                  {fmtDate(t.completedAt)}
                  {t.completionEstimated && <span className="text-gray-400" title="No status history; date taken from the last update"> *</span>}
                </td>
              )}
              {!open && <td className="py-2 px-3 text-right tabular-nums">{fmtNum(t.cycleDays)}</td>}
              <td className="py-2 px-3 text-right tabular-nums">{t.hoursLogged || '—'}{t.estimateHours ? <span className="text-gray-400"> / {Math.round(t.estimateHours * 10) / 10}</span> : ''}</td>
              <td className="py-2 pl-3 text-right tabular-nums">{t.points || 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!open && rows.some(t => t.completionEstimated) && (
        <p className="text-[11px] text-gray-500 mt-2">* No status history for this task, so its finish date is the date it was last updated.</p>
      )}
      <p className="text-[11px] text-gray-500 mt-1">Hours = this person's logged time on the task{rows.some(t => t.estimateHours) ? ' / original estimate' : ''}.</p>
    </div>
  );
};

const BestTile = ({ icon: Icon, label, value, detail }) => (
  <div className="border border-gray-200 rounded p-3 bg-white min-w-0">
    <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium"><Icon size={13} className="text-amber-600" aria-hidden="true" />{label}</div>
    <div className="text-base  text-gray-900 mt-1 tabular-nums">{value ?? '—'}</div>
    {detail && <div className="text-[11px] text-gray-500 truncate" title={detail}>{detail}</div>}
  </div>
);

const EmployeeReport = ({ employeeId, params, setParams, onBack, canReview, isSelf }) => {
  const url = `${API_BASE_URL}/hr/performance/report/employee/${employeeId}?${buildQuery(params)}`;
  const { loading, error, data, reload } = useReport(url);
  const [tab, setTab] = useState('completed');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [meetingReportOpen, setMeetingReportOpen] = useState(false);

  if (loading && !data) return <div className="py-20 text-center text-sm text-gray-500">Loading report…</div>;
  if (error) return <div className="py-20 text-center text-sm text-red-700">{error}</div>;
  if (!data) return null;

  const { employee: e, metrics: m, bests: b } = data;

  const exportCsv = () => downloadCsv(
    `performance-${e.name.replace(/\s+/g, '-')}-${data.range.label.replace(/\s+/g, '-')}.csv`,
    ['Key', 'Title', 'Source', 'Status', 'Due', 'Finished', 'Days', 'On time', 'Hours logged', 'Points'],
    [...data.tasks.completed, ...data.tasks.open].map(t => [
      t.key, t.title, t.source, t.status, fmtDate(t.dueAt), fmtDate(t.completedAt), t.cycleDays ?? '',
      t.onTime == null ? '' : (t.onTime ? 'Yes' : 'No'), t.hoursLogged || 0, t.points || 0
    ])
  );

  return (
    <div className="space-y-4 print-area">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {!isSelf ? (
          <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-gray-700 hover:text-gray-900 no-print cursor-pointer">
            <ArrowLeft size={15} /> All employees
          </button>
        ) : <span />}
        <div className="flex items-end gap-2 flex-wrap">
          <button onClick={() => setMeetingReportOpen(true)}
            className="no-print inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700 cursor-pointer">
            <FileText size={13} /> Review meeting report (PDF)
          </button>
          <PeriodBar params={params} setParams={setParams} showDepartment={false} onExport={exportCsv} onPrint={() => window.print()} />
        </div>
      </div>

      <div className="hidden print:block">
        <h1 className="text-xl ">Performance report</h1>
        <p className="text-xs text-gray-600">Generated {fmtDate(new Date())} from recorded work in the CRM.</p>
      </div>

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded p-4 flex flex-wrap items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-red-600 text-white flex items-center justify-center text-lg  shrink-0">{initials(e.name)}</div>
        <div className="flex-1 min-w-[200px]">
          <h2 className="text-lg  text-gray-900">{e.name}</h2>
          <p className="text-sm text-gray-600">{e.role} · {e.department}</p>
          <p className="text-xs text-gray-500 mt-0.5">Report for <strong>{data.range.label}</strong> · joined {fmtDate(e.joinedAt)}</p>
        </div>
        <div className="text-right">
          <GradeBadge grade={data.grade} score={data.score} />
          <div className="text-xs text-gray-600 mt-1">
            {data.rank ? <>Rank <strong className="text-gray-900">#{data.rank}</strong> of {data.rankedOutOf} in {e.department}</> : 'Not ranked this period'}
          </div>
          {canReview && !isSelf && (
            <div className="mt-2 no-print">
              <button onClick={() => setReviewOpen(true)} className="text-xs font-medium px-3 py-1.5 bg-red-600 text-white rounded hover:bg-gray-800 cursor-pointer">
                Add review
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatTile icon={CheckCircle2} label="Completed" value={m.tasksCompleted} hint={`of ${m.tasksAssigned} assigned`} />
        <StatTile icon={ListChecks} label="Subtasks done" value={m.subtasksCompleted} />
        <StatTile icon={Target} label="On-time" value={fmtNum(m.onTimeRate, '%')} hint={`${m.onTimeCompleted} on time · ${m.lateCompleted} late`} />
        <StatTile icon={Timer} label="Avg days / task" value={fmtNum(m.avgCycleDays)} hint={m.fastestCycleDays != null ? `Fastest ${m.fastestCycleDays} d` : 'Start → done'} />
        <StatTile icon={Clock} label="Hours logged" value={m.hoursLogged || 0} hint="Working hours recorded" />
        <StatTile icon={Timer} label="Avg hours / task" value={m.avgHoursPerTask != null ? `${m.avgHoursPerTask} h` : '—'} hint={m.tasksWithTimeLogged ? `From ${m.tasksWithTimeLogged} finished task${m.tasksWithTimeLogged > 1 ? 's' : ''}` : 'No time on finished tasks'} />
        <StatTile icon={Users} label="Active days" value={m.activeDays} hint="Days with any recorded work" />
        <StatTile icon={Zap} label="Efficiency" value={fmtNum(m.efficiency, '%')} hint={m.tasksWithPlan ? `${m.tasksWithinPlan} of ${m.tasksWithPlan} tasks within plan` : 'No finished task with a plan'} tone={m.efficiency != null && m.efficiency < 75 ? 'warn' : 'default'} />
        <StatTile icon={Star} label="Points" value={m.pointsEarned} hint={m.pointsApproved ? `${m.pointsApproved} approved` : 'From finished tasks'} />
        <StatTile icon={Video} label="Meetings" value={m.meetings} hint={m.meetingHours ? `${m.meetingHours} h${m.avgMeetingMinutes ? ` · avg ${m.avgMeetingMinutes} min` : ''}` : undefined} />
        <StatTile icon={AlertTriangle} label="Overdue now" value={m.overdueOpen} tone="warn" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <InsightsCard insights={data.insights} />
        <Section title={`Compared with the ${e.department} average`} subtitle={data.range.label}>
          <CompareTable me={{ ...m, score: data.score }} team={data.teamAverage || {}} />
        </Section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Score breakdown */}
        <Section title="Score breakdown" subtitle="What the score is made of">
          {data.breakdown.length === 0 ? (
            <Empty>No finished task or review in this period, so there is nothing to score.</Empty>
          ) : (
            <ul className="space-y-3">
              {data.breakdown.map(part => (
                <li key={part.component}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-700">{COMPONENT_LABELS[part.component]} <span className="text-gray-400">· weight {part.weight}%</span></span>
                    <span className=" tabular-nums text-gray-900">{part.value}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden" aria-hidden="true">
                    <div className="h-full rounded-full" style={{ width: `${part.value}%`, background: SERIES }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <ScoreExplainer weights={data.scoreWeights} />
          {(m.estimateAccuracy != null || m.reopened > 0 || m.updates + m.comments > 0) && (
            <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-3 gap-2 text-center">
              <div><div className="text-sm  tabular-nums">{fmtNum(m.estimateAccuracy, '%')}</div><div className="text-[10px] text-gray-500">of estimate used</div></div>
              <div><div className="text-sm  tabular-nums">{m.reopened}</div><div className="text-[10px] text-gray-500">reopened after done</div></div>
              <div><div className="text-sm  tabular-nums">{m.updates + m.comments}</div><div className="text-[10px] text-gray-500">ticket updates & comments</div></div>
            </div>
          )}
        </Section>

        {/* Personal bests */}
        <Section title="Personal best records" subtitle="Across all recorded history" className="xl:col-span-2">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <BestTile icon={Trophy} label="Best month (tasks)" value={b.bestMonthTasks ? `${b.bestMonthTasks.value} tasks` : null} detail={b.bestMonthTasks ? monthLabel(b.bestMonthTasks.month) : 'No finished tasks yet'} />
            <BestTile icon={Clock} label="Best month (hours)" value={b.bestMonthHours ? `${b.bestMonthHours.value} h` : null} detail={b.bestMonthHours ? monthLabel(b.bestMonthHours.month) : 'No time logged yet'} />
            <BestTile icon={Zap} label="Fastest task" value={b.fastestTask ? `${b.fastestTask.days} days` : null} detail={b.fastestTask ? `${b.fastestTask.key} · ${b.fastestTask.title}` : undefined} />
            <BestTile icon={Award} label="Biggest task" value={b.biggestTask ? `${b.biggestTask.points} pts` : null} detail={b.biggestTask ? `${b.biggestTask.key} · ${b.biggestTask.title}` : undefined} />
            <BestTile icon={Flame} label="Longest on-time run" value={b.longestOnTimeStreak ? `${b.longestOnTimeStreak} in a row` : null} detail="Consecutive tasks finished by their due date" />
            <BestTile icon={TrendingUp} label="Total tasks completed" value={b.totalCompleted} detail="All time" />
          </div>
        </Section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Section title="Tasks completed per month" subtitle="Last 12 months"><TrendChart data={data.monthly} dataKey="tasksCompleted" unit=" tasks" /></Section>
        <Section title="Hours logged per month" subtitle="Last 12 months"><TrendChart data={data.monthly} dataKey="hoursLogged" unit=" h" /></Section>
      </div>

      <PlannedVsActual metrics={m} tasks={data.tasks.completed} />

      <Section title="Work by type" subtitle={`${data.range.label} · compared with the department's average time for the same kind of work`}>
        <WorkTypeTable rows={data.workTypes} />
      </Section>

      <Section title="Monthly scorecard" subtitle="Last 12 months, newest first. Score and rank are within the department for that month.">
        <ScorecardTable rows={data.scorecard} />
      </Section>

      <Section title="Quarterly scorecard" subtitle="Last 4 quarters">
        <ScorecardTable rows={data.quarterCard} quarter />
      </Section>

      {/* Detail tabs */}
      <section className="bg-white border border-gray-200 rounded">
        <div className="flex gap-1 px-2 pt-2 border-b border-gray-200 overflow-x-auto no-print" role="tablist">
          {DETAIL_TABS.map(([k, label, Icon]) => {
            const count = k === 'completed' ? data.tasks.completed.length : k === 'open' ? data.tasks.open.length
              : k === 'time' ? data.timeLog.length : k === 'meetings' ? data.meetings.length
                : k === 'activity' ? data.activity.length : data.reviews.length;
            return (
              <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px whitespace-nowrap cursor-pointer ${tab === k ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
                <Icon size={13} /> {label} <span className="text-gray-400 tabular-nums">{count}</span>
              </button>
            );
          })}
        </div>
        <div className="p-4">
          {tab === 'completed' && <TaskTable rows={data.tasks.completed} />}
          {tab === 'open' && <TaskTable rows={data.tasks.open} open />}
          {tab === 'time' && (data.timeLog.length === 0 ? <Empty>No time logged in this period.</Empty> : (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                <th className="py-2 pr-3 font-medium">When</th><th className="py-2 px-3 font-medium">Task</th><th className="py-2 px-3 font-medium">Source</th><th className="py-2 px-3 font-medium">Note</th><th className="py-2 pl-3 font-medium text-right">Hours</th>
              </tr></thead>
              <tbody>{data.timeLog.map((t, i) => (
                <tr key={i} className="border-b border-gray-100 last:border-0">
                  <td className="py-2 pr-3 text-xs text-gray-700">{fmtDateTime(t.at)}</td>
                  <td className="py-2 px-3 text-xs">{t.taskKey || '—'}</td>
                  <td className="py-2 px-3 text-xs text-gray-600">{t.source}</td>
                  <td className="py-2 px-3 text-xs text-gray-600 max-w-[280px] truncate" title={t.note || ''}>{t.note || '—'}</td>
                  <td className="py-2 pl-3 text-right tabular-nums">{t.hours}</td>
                </tr>
              ))}</tbody>
            </table>
          ))}
          {tab === 'meetings' && (data.meetings.length === 0 ? <Empty>No meetings or calls recorded in this period.</Empty> : (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                <th className="py-2 pr-3 font-medium">When</th><th className="py-2 px-3 font-medium">Meeting</th><th className="py-2 px-3 font-medium">Type</th><th className="py-2 px-3 font-medium">Status</th><th className="py-2 pl-3 font-medium text-right">Minutes</th>
              </tr></thead>
              <tbody>{data.meetings.map((mt, i) => (
                <tr key={i} className="border-b border-gray-100 last:border-0">
                  <td className="py-2 pr-3 text-xs text-gray-700">{fmtDateTime(mt.at)}</td>
                  <td className="py-2 px-3">{mt.title}</td>
                  <td className="py-2 px-3 text-xs text-gray-600">{mt.source}</td>
                  <td className="py-2 px-3 text-xs">{mt.status}</td>
                  <td className="py-2 pl-3 text-right tabular-nums">{mt.minutes ?? '—'}</td>
                </tr>
              ))}</tbody>
            </table>
          ))}
          {tab === 'activity' && (data.activity.length === 0 ? <Empty>No ticket updates or comments in this period.</Empty> : (
            <ol className="relative border-l border-gray-200 ml-2 space-y-3">
              {data.activity.map((a, i) => (
                <li key={i} className="ml-4">
                  <span className="absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full border-2 border-white" style={{ background: a.kind === 'comment' ? '#77766f' : SERIES }} aria-hidden="true" />
                  <div className="text-[11px] text-gray-500">{fmtDateTime(a.at)} · {a.kind === 'comment' ? 'Comment' : 'Update'}</div>
                  <div className="text-sm text-gray-800 break-words">{a.detail}</div>
                </li>
              ))}
            </ol>
          ))}
          {tab === 'reviews' && (data.reviews.length === 0 ? <Empty>No reviews yet.{canReview && !isSelf ? ' Use “Add review” above.' : ''}</Empty> : (
            <ul className="space-y-3">
              {data.reviews.map(r => (
                <li key={r.id} className="border border-gray-200 rounded p-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="text-sm  text-gray-900">Score {r.score}/100</div>
                    <div className="text-xs text-gray-500">{fmtDate(r.at)}{r.reviewer ? ` · by ${r.reviewer}` : ''}</div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-xs text-gray-600">
                    <span>Completion {fmtNum(r.taskCompletion)}</span><span>Quality {fmtNum(r.quality)}</span>
                    <span>On-time {fmtNum(r.onTime)}</span><span>Efficiency {fmtNum(r.efficiency)}</span>
                  </div>
                  {r.feedback && <p className="text-sm text-gray-800 mt-2 whitespace-pre-wrap">{r.feedback}</p>}
                </li>
              ))}
            </ul>
          ))}
        </div>
      </section>

      {/* Sign-off for printed copies used in review meetings */}
      <div className="hidden print:grid grid-cols-3 gap-8 pt-10 text-xs text-gray-700">
        {['Employee', 'Reviewed by (manager)', 'HR'].map(l => (
          <div key={l}><div className="border-t border-gray-400 pt-1">{l} — signature &amp; date</div></div>
        ))}
      </div>

      {meetingReportOpen && (
        <PerformanceReviewReport employeeId={e.id} query={buildQuery(params)} onClose={() => setMeetingReportOpen(false)} />
      )}

      {reviewOpen && (
        <ReviewModal employee={e} metrics={m} onClose={() => setReviewOpen(false)} onSaved={() => { setReviewOpen(false); reload(); }} />
      )}
    </div>
  );
};

/* ───────────────────────── page ───────────────────────── */

const HRPerformance = () => {
  const { user } = useAuth();
  const [params, setParams] = useState(() => {
    const d = new Date();
    const from = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
    return { period: 'month', value: currentMonth(), from, to: d.toISOString().slice(0, 10), department: 'All' };
  });
  const [tab, setTab] = useState('overview');
  const [openEmployee, setOpenEmployee] = useState(null);

  const teamUrl = `${API_BASE_URL}/hr/performance/report?${buildQuery(params)}`;
  const { loading, error, data, status } = useReport(teamUrl);

  // People without HR/manager access get their own report instead of the team view.
  const selfOnly = status === 403;
  const canReview = !selfOnly;

  const exportTeamCsv = () => {
    if (!data) return;
    downloadCsv(
      `team-performance-${data.range.label.replace(/\s+/g, '-')}.csv`,
      ['Rank', 'Employee', 'Role', 'Department', 'Score', 'Grade', 'Tasks assigned', 'Tasks completed', 'Completion %', 'Subtasks done',
        'On-time %', 'Late', 'Overdue now', 'Avg days per task', 'Hours logged', 'Avg hours per task', 'Points earned',
        'Points approved', 'Meetings', 'Meeting hours', 'Ticket updates', 'Comments', 'Review score', 'Active days'],
      data.employees.map(r => [r.rank ?? '', r.name, r.role, r.department, r.score ?? '', r.grade, r.metrics.tasksAssigned, r.metrics.tasksCompleted,
      r.metrics.completionRate ?? '', r.metrics.subtasksCompleted, r.metrics.onTimeRate ?? '', r.metrics.lateCompleted,
      r.metrics.overdueOpen, r.metrics.avgCycleDays ?? '', r.metrics.hoursLogged || 0, r.metrics.avgHoursPerTask ?? '',
      r.metrics.pointsEarned, r.metrics.pointsApproved, r.metrics.meetings, r.metrics.meetingHours || 0,
      r.metrics.updates, r.metrics.comments, r.metrics.reviewScore ?? '', r.metrics.activeDays])
    );
  };

  const printStyles = (
    <style>{`
      @media print {
        body * { visibility: hidden !important; }
        .perf-root, .perf-root * { visibility: visible !important; }
        .perf-root { position: absolute; left: 0; top: 0; width: 100%; padding: 0 !important; }
        .no-print { display: none !important; }
        section, .bg-white { break-inside: avoid; box-shadow: none !important; }
      }
    `}</style>
  );

  if (selfOnly || (openEmployee != null)) {
    return (
      <div className="perf-root p-4 md:p-6 bg-gray-50 min-h-screen">
        {printStyles}
        <EmployeeReport
          employeeId={selfOnly ? user?.id : openEmployee}
          params={params}
          setParams={setParams}
          onBack={() => setOpenEmployee(null)}
          canReview={canReview}
          isSelf={selfOnly}
        />
      </div>
    );
  }

  return (
    <div className="perf-root p-4 md:p-6 bg-gray-50 min-h-screen space-y-4">
      {printStyles}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl  text-gray-900">Performance reports</h1>
          <p className="text-sm text-gray-600">
            Built only from recorded work — tasks, status history, time tracked while tickets are In Progress, work logs, meetings and reviews.
            {data && <> Showing <strong>{data.range.label}</strong>.</>}
          </p>
        </div>
        <div className="inline-flex rounded border border-gray-300 overflow-hidden no-print" role="tablist" aria-label="Report view">
          {[['overview', 'Team overview', Users], ['employees', 'Employees', ListChecks], ['champions', 'Champions & records', Trophy], ['worktypes', 'Work types', Award]].map(([k, label, Icon]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-r border-gray-300 last:border-r-0 cursor-pointer ${tab === k ? 'bg-red-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
      </div>

      <PeriodBar params={params} setParams={setParams} departments={data?.departments} onExport={exportTeamCsv} onPrint={() => window.print()} />

      {loading && !data && <div className="py-20 text-center text-sm text-gray-500">Loading report…</div>}
      {error && !selfOnly && <div className="py-10 text-center text-sm text-red-700">{error}</div>}
      {data && (
        <div className={loading ? 'opacity-60 transition-opacity' : ''}>
          {tab === 'overview' && <TeamOverview data={data} onOpenEmployee={setOpenEmployee} />}
          {tab === 'employees' && <EmployeesTable data={data} onOpenEmployee={setOpenEmployee} />}
          {tab === 'champions' && <ChampionsView data={data} onOpenEmployee={setOpenEmployee} />}
          {tab === 'worktypes' && (
            <Section title="Average time by kind of work" subtitle="Team benchmarks from all recorded history. Use them to set realistic estimates and spot outliers.">
              <WorkTypeTable rows={data.workTypes} team />
            </Section>
          )}
        </div>
      )}
    </div>
  );
};

export default HRPerformance;

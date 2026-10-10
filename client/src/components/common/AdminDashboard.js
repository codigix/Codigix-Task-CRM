import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import {
  Users, ListChecks, CheckCircle2, AlertTriangle, Clock, FolderKanban, IndianRupee,
  RefreshCw, ChevronRight, CalendarDays, UserX, Timer, Inbox, Flag, Activity, TrendingUp
} from 'lucide-react';
import { API_BASE_URL } from '../../config/environment';
import { useAuth } from '../../hooks/useAuth';
import AdminDetailPanel from './AdminDetailPanel';

/* Palette (validated: categorical slots 1–4 adjacent, light surface). Text never uses series colors. */
const C = {
  s1: '#2a78d6', // blue   — To Do / primary series
  s2: '#eb6834', // orange — In Progress
  s3: '#1baf7a', // aqua   — Done
  s4: '#eda100', // yellow — In Review
  grid: '#e1e0d9', axis: '#898781', ink2: '#52514e',
  critical: '#d03b3b', warning: '#fab219', good: '#0ca30c'
};
const STATUS_SERIES = [
  { key: 'todo', label: 'To Do', color: C.s1 },
  { key: 'inProgress', label: 'In Progress', color: C.s2 },
  { key: 'review', label: 'In Review', color: C.s4 },
  { key: 'done', label: 'Done', color: C.s3 }
];

const num = (v) => (v == null ? '—' : Number(v).toLocaleString('en-IN'));
const money = (v) => (v == null ? '—' : `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`);
const dayLabel = (s) => new Date(`${s}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
const weekday = (s) => new Date(`${s}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit' });
const timeAgo = (v) => {
  const m = Math.round((Date.now() - new Date(v).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
};

/* ───────── building blocks ───────── */

const Card = ({ title, subtitle, right, children, className = '' }) => (
  <section className={`bg-white border border-gray-200 rounded-lg ${className}`}>
    <div className="px-4 py-3 border-b border-gray-100 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
    <div className="p-4">{children}</div>
  </section>
);

const Kpi = ({ icon: Icon, label, value, hint, onOpen, tone }) => {
  const body = (
    <div className={`h-full text-left bg-white border rounded-lg p-4 transition ${onOpen ? 'hover:border-blue-300 hover:shadow-sm' : ''} ${tone === 'critical' ? 'border-red-200' : 'border-gray-200'}`}>
      <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
        <Icon size={14} className={tone === 'critical' ? 'text-red-600' : 'text-gray-400'} aria-hidden="true" />
        <span className="truncate">{label}</span>
      </div>
      <div className={`text-2xl font-semibold tabular-nums mt-1 ${tone === 'critical' ? 'text-red-700' : 'text-gray-900'}`}>{value}</div>
      {hint && <div className="text-[11px] text-gray-500 mt-0.5 truncate" title={typeof hint === 'string' ? hint : undefined}>{hint}</div>}
    </div>
  );
  return onOpen ? <button type="button" onClick={onOpen} className="block w-full cursor-pointer">{body}</button> : body;
};

const Empty = ({ children }) => (
  <div className="text-center text-sm text-gray-500 py-8 border border-dashed border-gray-200 rounded">{children}</div>
);

const ChartTip = ({ active, payload, label, render }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded shadow-sm px-3 py-2 text-xs text-gray-700">
      {render(payload[0].payload, label)}
    </div>
  );
};

/* ───────── page ───────── */

export default function AdminDashboard() {
  const { user } = useAuth();
  const { designation = 'admin', username = 'admin' } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  // Every figure opens its rows here, on the same page.
  const [detail, setDetail] = useState(null);
  const open = (title, params, subtitle) => () => setDetail({ title, params, subtitle });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/overview`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not load the dashboard');
      setData(json); setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  // Live: refresh every 2 minutes while open.
  useEffect(() => { const t = setInterval(load, 120000); return () => clearInterval(t); }, [load]);

  const base = (dept) => `/${dept}/${designation}/${username}`;

  const w = data?.work; const p = data?.people; const t = data?.time; const a = data?.attention;
  const pr = data?.projects; const s = data?.sales; const f = data?.finance;

  const attentionItems = useMemo(() => {
    if (!data) return [];
    return [
      { icon: AlertTriangle, label: 'Overdue tasks', value: w?.overdue, tone: 'critical', params: { type: 'tasks', filter: 'overdue' }, note: 'Past due date, not finished' },
      { icon: UserX, label: 'Open tasks with no assignee', value: w?.unassignedOpen, tone: 'serious', params: { type: 'tasks', filter: 'unassigned' }, note: 'Nobody owns them' },
      { icon: CalendarDays, label: 'Due today', value: w?.dueToday, tone: 'warning', params: { type: 'tasks', filter: 'dueToday' } },
      { icon: Flag, label: 'Sprints past their end date', value: a?.lateSprints?.length, tone: 'serious', params: { type: 'sprints', filter: 'late' }, note: a?.lateSprints?.map(x => x.name).slice(0, 3).join(', ') },
      { icon: Timer, label: 'Time entries waiting for approval', value: t?.pendingApprovals, tone: 'warning', params: { type: 'approvals' } },
      { icon: Clock, label: 'Planned-time requests waiting', value: a?.planRequests, tone: 'warning', params: { type: 'planRequests' } },
      { icon: Inbox, label: 'Registration requests', value: p?.pendingRegistrations, tone: 'warning', params: { type: 'registrations' } },
      { icon: FolderKanban, label: 'Projects past their due date', value: pr?.late, tone: 'serious', params: { type: 'projects', late: '1' } }
    ].filter(x => Number(x.value) > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  if (!data) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="py-24 text-center text-sm text-gray-500">{error ? <span className="text-red-700">{error}</span> : 'Loading dashboard…'}</div>
      </div>
    );
  }

  const name = user?.first_name || user?.username || 'Admin';
  const totals = w?.totals || {};
  const completedSeries = (w?.completedByDay || []).map(d => ({ ...d, label: dayLabel(d.date) }));
  const dueSeries = (data.upcoming?.dueByDay || []).map(d => ({ ...d, label: weekday(d.date) }));
  const maxDeptTotal = Math.max(1, ...(w?.byDepartment || []).map(d => d.todo + d.inProgress + d.review + d.done));
  const toneDot = { critical: C.critical, serious: '#ec835a', warning: C.warning };

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Admin overview</h1>
          <p className="text-sm text-gray-600">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {name}.
            {' '}{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Updated {timeAgo(data.generatedAt)}</span>
          <button onClick={load} disabled={loading} className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 cursor-pointer">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <Link to={`${base('sales')}/dashboard?view=sales`} className="inline-flex items-center h-8 px-3 text-xs font-medium rounded border border-gray-300 bg-white hover:bg-gray-50">
            Sales dashboard
          </Link>
        </div>
      </div>
      {error && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">{error} (showing the last loaded figures)</div>}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        <Kpi icon={Users} label="Active people" value={num(p?.active)} hint={p?.newThisMonth ? `${p.newThisMonth} joined this month` : `${p?.byDepartment?.length || 0} departments`} onOpen={open('People', { type: 'people' })} />
        <Kpi icon={ListChecks} label="Open tasks" value={num(w?.open)} hint={`${num(w?.total)} in total`} onOpen={open('Open tasks', { type: 'tasks', filter: 'open' })} />
        <Kpi icon={CheckCircle2} label="Completed · 30 days" value={num(w?.completed30)} hint={`${num(w?.completed7)} in the last 7 days`} onOpen={open('Tasks completed in the last 30 days', { type: 'tasks', filter: 'completed30' })} />
        <Kpi icon={AlertTriangle} label="Overdue" value={num(w?.overdue)} hint={`${num(w?.dueToday)} due today`} tone={w?.overdue ? 'critical' : undefined} onOpen={open('Overdue tasks', { type: 'tasks', filter: 'overdue' })} />
        <Kpi icon={Clock} label="Hours tracked · 7 days" value={`${num(t?.hours7)} h`} hint={`${num(t?.hoursToday)} h today · ${num(t?.trackers30)} people tracking`} onOpen={open('Time tracked', { type: 'hours' }, 'Last 7 days')} />
        <Kpi icon={FolderKanban} label="Active projects" value={num(pr?.active)} hint={`${num(pr?.total)} in total · ${num(a?.activeSprints)} running sprints`} onOpen={open('Projects', { type: 'projects' })} />
        <Kpi icon={TrendingUp} label="Sales pipeline" value={money(s?.pipelineValue)} hint={`${num(s?.openDeals)} open deals · ${num(s?.leads)} leads`} onOpen={open('Open deals', { type: 'deals', filter: 'open' })} />
        <Kpi icon={IndianRupee} label="Outstanding" value={money(f?.outstanding)} hint={`${num(f?.invoices)} invoices · ${money(f?.collected)} collected`} onOpen={open('Outstanding invoices', { type: 'invoices', filter: 'outstanding' })} />
      </div>

      {/* Attention + completed trend */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card title="Needs attention" subtitle="Things waiting on someone right now">
          {attentionItems.length === 0 ? <Empty>All clear. Nothing is waiting.</Empty> : (
            <ul className="divide-y divide-gray-100 -my-2">
              {attentionItems.map(item => {
                const Icon = item.icon;
                return (
                  <li key={item.label}>
                    <button type="button" onClick={open(item.label, item.params)} className="w-full text-left flex items-center gap-3 py-2.5 group cursor-pointer">
                      <span className="w-8 h-8 rounded-md flex items-center justify-center shrink-0" style={{ background: `${toneDot[item.tone]}1a` }}>
                        <Icon size={15} style={{ color: toneDot[item.tone] }} aria-hidden="true" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm text-gray-900 group-hover:text-blue-700">{item.label}</span>
                        {item.note && <span className="block text-[11px] text-gray-500 truncate">{item.note}</span>}
                      </span>
                      <span className="text-sm font-semibold tabular-nums text-gray-900">{num(item.value)}</span>
                      <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title="Tasks completed per day" subtitle="Last 30 days, all departments · click a bar for that day's tasks" className="xl:col-span-2">
          {completedSeries.some(d => d.count > 0) ? (
            <div style={{ height: 230 }} role="img" aria-label="Tasks completed per day over the last 30 days">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={completedSeries} margin={{ top: 8, right: 4, left: -18, bottom: 0 }} barCategoryGap={2}>
                  <CartesianGrid vertical={false} stroke={C.grid} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: C.axis }} tickLine={false} axisLine={{ stroke: C.grid }} interval={4} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: C.axis }} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(42,120,214,0.06)' }}
                    content={<ChartTip render={(d) => (<>
                      <div className="font-semibold text-gray-900">{dayLabel(d.date)}</div>
                      <div className="tabular-nums">{d.count} completed</div>
                      <div className="tabular-nums text-gray-500">{d.created} created</div>
                    </>)} />} />
                  <Bar dataKey="count" fill={C.s1} radius={[4, 4, 0, 0]} maxBarSize={18} cursor="pointer"
                    onClick={(d) => d && d.count > 0 && setDetail({ title: `Completed on ${dayLabel(d.date)}`, params: { type: 'tasks', filter: 'completedOn', date: d.date } })} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <Empty>No task was completed in the last 30 days.</Empty>}
        </Card>
      </div>

      {/* Work by department + team workload */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card title="Work by department" subtitle="Tasks by status">
          <div className="flex flex-wrap gap-x-3 gap-y-1 mb-3 text-[11px] text-gray-600">
            {STATUS_SERIES.map(sr => (
              <span key={sr.key} className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: sr.color }} aria-hidden="true" />{sr.label}</span>
            ))}
          </div>
          {(w?.byDepartment || []).length === 0 ? <Empty>No tasks yet.</Empty> : (
            <ul className="space-y-4">
              {w.byDepartment.map(d => {
                const total = d.todo + d.inProgress + d.review + d.done;
                return (
                  <li key={d.department}>
                    <button type="button" onClick={open(`${d.department}: all tasks`, { type: 'tasks', filter: 'all', department: d.department })} className="block w-full text-left group cursor-pointer">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-gray-900 group-hover:text-blue-700">{d.department}</span>
                        <span className="text-gray-500 tabular-nums">{num(total)} tasks{d.overdue ? <span className="text-red-700"> · {d.overdue} overdue</span> : ''}</span>
                      </div>
                      <div className="flex h-3 rounded overflow-hidden gap-[2px] bg-gray-100" style={{ width: `${Math.max(8, (total / maxDeptTotal) * 100)}%` }}
                        role="img" aria-label={`${d.department}: ${STATUS_SERIES.map(sr => `${d[sr.key]} ${sr.label}`).join(', ')}`}>
                        {STATUS_SERIES.map(sr => d[sr.key] > 0 && (
                          <span key={sr.key} title={`${sr.label}: ${d[sr.key]}`} style={{ width: `${(d[sr.key] / total) * 100}%`, background: sr.color }} />
                        ))}
                      </div>
                      <div className="grid grid-cols-4 gap-1 mt-1.5 text-[11px] text-gray-600 tabular-nums">
                        {STATUS_SERIES.map(sr => <span key={sr.key}>{sr.label}: <strong className="text-gray-900">{num(d[sr.key])}</strong></span>)}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-gray-100 text-center">
            {STATUS_SERIES.map(sr => (
              <button type="button" key={sr.key} onClick={open(`Tasks: ${sr.label}`, { type: 'tasks', filter: 'all', status: sr.key })} className="rounded hover:bg-gray-50 py-1 cursor-pointer">
                <div className="text-base font-semibold tabular-nums text-gray-900">{num(totals[sr.key])}</div>
                <div className="text-[10px] text-gray-500">{sr.label}</div>
              </button>
            ))}
          </div>
        </Card>

        <Card title="Team workload" subtitle="Open work, overdue, completed and hours tracked (30 days) · click a person for their tasks" className="xl:col-span-2"
          right={<button type="button" onClick={open('Time tracked', { type: 'hours', days: '30' }, 'Last 30 days')} className="text-xs font-medium text-blue-700 hover:underline whitespace-nowrap cursor-pointer">Time by person →</button>}>
          {(data.team || []).length === 0 ? <Empty>No team members.</Empty> : (
            <div className="overflow-x-auto -mx-4">
              <table className="w-full text-sm min-w-[620px]">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-200">
                    <th className="py-2 px-4 font-medium text-left">Person</th>
                    <th className="py-2 px-3 font-medium text-right">Open</th>
                    <th className="py-2 px-3 font-medium text-right">In progress</th>
                    <th className="py-2 px-3 font-medium text-right">Overdue</th>
                    <th className="py-2 px-3 font-medium text-right">Done · 30d</th>
                    <th className="py-2 px-4 font-medium text-right">Hours · 30d</th>
                  </tr>
                </thead>
                <tbody>
                  {data.team.map(m => (
                    <tr key={m.id} onClick={open(`${m.name}: open tasks`, { type: 'tasks', filter: 'open', person: m.name }, `${m.role} · ${m.department}`)} className="border-b border-gray-100 last:border-0 hover:bg-blue-50/40 cursor-pointer">
                      <td className="py-2 px-4">
                        <div className="font-medium text-gray-900">{m.name}</div>
                        <div className="text-[11px] text-gray-500">{m.role} · {m.department}</div>
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums">{m.open}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{m.inProgress}</td>
                      <td className={`py-2 px-3 text-right tabular-nums ${m.overdue ? 'text-red-700 font-semibold' : ''}`}>{m.overdue}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{m.done30}</td>
                      <td className="py-2 px-4 text-right tabular-nums">{m.hours30 || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Projects + coming up */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card title="Active projects" subtitle="By number of tasks · progress = tasks done"
          className="xl:col-span-2"
          right={<button type="button" onClick={open('Projects', { type: 'projects' })} className="text-xs font-medium text-blue-700 hover:underline whitespace-nowrap cursor-pointer">All projects →</button>}>
          {(pr?.list || []).length === 0 ? <Empty>No active projects.</Empty> : (
            <div className="overflow-x-auto -mx-4">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-200">
                    <th className="py-2 px-4 font-medium text-left">Project</th>
                    <th className="py-2 px-3 font-medium text-left">Status</th>
                    <th className="py-2 px-3 font-medium text-left w-[34%]">Progress</th>
                    <th className="py-2 px-3 font-medium text-right">Overdue</th>
                    <th className="py-2 px-4 font-medium text-right">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {pr.list.map(x => (
                    <tr key={x.id} onClick={open(`${x.name}: tasks`, { type: 'tasks', filter: 'all', projectId: x.id }, x.status)} className="border-b border-gray-100 last:border-0 hover:bg-blue-50/40 cursor-pointer">
                      <td className="py-2 px-4 font-medium text-gray-900 truncate max-w-[220px]" title={x.name}>{x.name}</td>
                      <td className="py-2 px-3 text-xs text-gray-700">{x.status}</td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden" aria-hidden="true">
                            <div className="h-full rounded-full" style={{ width: `${x.progress}%`, background: C.s3 }} />
                          </div>
                          <span className="text-[11px] text-gray-600 tabular-nums whitespace-nowrap">{x.done}/{x.tasks} · {x.progress}%</span>
                        </div>
                      </td>
                      <td className={`py-2 px-3 text-right tabular-nums ${x.overdue ? 'text-red-700 font-semibold' : 'text-gray-500'}`}>{x.overdue}</td>
                      <td className={`py-2 px-4 text-right text-xs whitespace-nowrap ${x.late ? 'text-red-700 font-semibold' : 'text-gray-600'}`}>
                        {x.dueDate ? new Date(x.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {(pr?.byStatus || []).length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
              {pr.byStatus.map(b => <button type="button" key={b.status} onClick={open(`Projects: ${b.status}`, { type: 'projects', status: b.status })} className="text-[11px] bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full px-2 py-0.5 cursor-pointer">{b.status}: <strong>{b.count}</strong></button>)}
            </div>
          )}
        </Card>

        <Card title="Coming up" subtitle="Tasks due in the next 7 days"
>
          {dueSeries.some(d => d.count > 0) ? (
            <div style={{ height: 140 }} role="img" aria-label="Tasks due per day for the next 7 days">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dueSeries} margin={{ top: 14, right: 4, left: -24, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={C.grid} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: C.axis }} tickLine={false} axisLine={{ stroke: C.grid }} interval={0} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: C.axis }} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(42,120,214,0.06)' }}
                    content={<ChartTip render={(d) => (<><div className="font-semibold text-gray-900">{weekday(d.date)}</div><div className="tabular-nums">{d.count} due</div></>)} />} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={26} cursor="pointer"
                    onClick={(d) => d && d.count > 0 && setDetail({ title: `Due ${weekday(d.date)}`, params: { type: 'tasks', filter: 'dueOn', date: d.date } })}>
                    {dueSeries.map((d, i) => <Cell key={d.date} fill={i === 0 ? C.s2 : C.s1} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <Empty>Nothing due this week.</Empty>}
          <p className="text-[11px] text-gray-500 mt-1">Orange = today. Click a bar for that day's tasks.</p>
          <h3 className="text-xs font-semibold text-gray-700 mt-4 mb-2">Meetings & events</h3>
          {(data.upcoming?.events || []).length === 0 ? <p className="text-xs text-gray-500">No events in the next 7 days.</p> : (
            <ul className="space-y-2">
              {data.upcoming.events.map(e => (
                <li key={e.id} className="text-xs">
                  <div className="font-medium text-gray-900 truncate">{e.title}</div>
                  <div className="text-gray-500">{new Date(e.start).toLocaleString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} · {e.category}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Sales & finance + people + activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card title="Sales & finance" subtitle="Leads, deals and invoices">
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Leads', num(s?.leads), `${num(s?.newLeads30)} new in 30 days`, { type: 'leads' }],
              ['Converted / qualified', num(s?.converted), 'leads', { type: 'leads' }],
              ['Open deals', num(s?.openDeals), money(s?.pipelineValue), { type: 'deals', filter: 'open' }],
              ['Deals won', num(s?.wonDeals), money(s?.wonValue), { type: 'deals', filter: 'won' }],
              ['Billed', money(f?.billed), `${money(f?.billed30)} in 30 days`, { type: 'invoices' }],
              ['Collected', money(f?.collected), `${num(f?.overdueInvoices)} invoices overdue`, { type: 'invoices', filter: 'overdue' }]
            ].map(([l, v, h, params]) => (
              <button type="button" key={l} onClick={open(l, params)} className="text-left border border-gray-200 rounded p-2.5 hover:border-blue-300 cursor-pointer">
                <div className="text-[11px] text-gray-500">{l}</div>
                <div className="text-base font-semibold text-gray-900 tabular-nums">{v}</div>
                <div className="text-[11px] text-gray-500 truncate">{h}</div>
              </button>
            ))}
          </div>
          {(s?.byStage || []).length > 0 ? (
            <div className="mt-4">
              <h3 className="text-xs font-semibold text-gray-700 mb-2">Pipeline by stage (value)</h3>
              <ul className="space-y-1.5">
                {s.byStage.map(st => {
                  const max = Math.max(1, ...s.byStage.map(x => x.value));
                  return (
                    <li key={st.stage} className="text-xs cursor-pointer hover:bg-gray-50 rounded" onClick={open(`Deals: ${st.stage}`, { type: 'deals', stage: st.stage })}>
                      <div className="flex justify-between"><span className="text-gray-700">{st.stage} ({st.count})</span><span className="tabular-nums text-gray-900">{money(st.value)}</span></div>
                      <div className="h-2 bg-gray-100 rounded-full mt-0.5"><div className="h-full rounded-full" style={{ width: `${(st.value / max) * 100}%`, background: C.s1 }} /></div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <p className="text-[11px] text-gray-500 mt-3">No leads, deals or invoices recorded yet. These fill in as the sales team uses Leads, Deals and Invoices.</p>
          )}
        </Card>

        <Card title="People" subtitle="Active staff by department"
          right={<button type="button" onClick={open('People', { type: 'people' })} className="text-xs font-medium text-blue-700 hover:underline whitespace-nowrap cursor-pointer">Everyone →</button>}>
          {(p?.byDepartment || []).length === 0 ? <Empty>No active staff.</Empty> : (
            <ul className="space-y-2.5">
              {p.byDepartment.map(d => {
                const max = Math.max(1, ...p.byDepartment.map(x => x.count));
                return (
                  <li key={d.department} className="text-xs cursor-pointer hover:bg-gray-50 rounded" onClick={open(`People: ${d.department}`, { type: 'people', department: d.department })}>
                    <div className="flex justify-between mb-0.5"><span className="text-gray-800">{d.department}</span><span className="tabular-nums font-semibold text-gray-900">{d.count}</span></div>
                    <div className="h-2 bg-gray-100 rounded-full"><div className="h-full rounded-full" style={{ width: `${(d.count / max) * 100}%`, background: C.s1 }} /></div>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-gray-100 text-center">
            <button type="button" onClick={open('Active people', { type: 'people', status: 'Active' })} className="rounded hover:bg-gray-50 cursor-pointer"><div className="text-base font-semibold tabular-nums">{num(p?.active)}</div><div className="text-[10px] text-gray-500">Active</div></button>
            <button type="button" onClick={open('Inactive accounts', { type: 'people', status: 'Inactive' })} className="rounded hover:bg-gray-50 cursor-pointer"><div className="text-base font-semibold tabular-nums">{num(p?.inactive)}</div><div className="text-[10px] text-gray-500">Inactive</div></button>
            <div><div className="text-base font-semibold tabular-nums">{num(t?.runningTimers)}</div><div className="text-[10px] text-gray-500">Working now</div></div>
          </div>
        </Card>

        <Card title="Recent activity" subtitle="Latest changes on tasks">
          {(data.activity || []).length === 0 ? <Empty>No recent activity.</Empty> : (
            <ol className="relative border-l border-gray-200 ml-1.5 space-y-3">
              {data.activity.map((x, i) => (
                <li key={i} className="ml-4">
                  <span className="absolute -left-[5px] mt-1.5 w-2.5 h-2.5 rounded-full border-2 border-white" style={{ background: x.field === 'status' ? C.s3 : C.s1 }} aria-hidden="true" />
                  <div className="text-[11px] text-gray-500">{timeAgo(x.at)} · {x.by || 'System'}</div>
                  <div className="text-xs text-gray-800">
                    <span className="font-semibold">{x.key}</span>{' '}
                    {x.field === 'status' ? <>moved to <strong>{x.to}</strong></>
                      : x.field === 'assignee' ? <>assigned to <strong>{x.to || 'nobody'}</strong></>
                        : x.field === 'due_date' ? <>due date → <strong>{x.to}</strong></>
                          : <>{x.field} → <strong>{x.to}</strong></>}
                  </div>
                  {x.title && <div className="text-[11px] text-gray-500 truncate" title={x.title}>{x.title}</div>}
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <p className="text-[11px] text-gray-400 flex items-center gap-1"><Activity size={11} /> Live figures from the CRM, refreshed every 2 minutes. Click any figure, row or bar to see the records behind it.</p>

      {detail && <AdminDetailPanel detail={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

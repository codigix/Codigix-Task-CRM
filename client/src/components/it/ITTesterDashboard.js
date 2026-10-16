import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  CheckCircle, XCircle, ShieldAlert, PlayCircle, FileText, Bug, Settings, ExternalLink, ClipboardList, Calendar, Plus, AlertTriangle
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import NewTestCaseModal from './NewTestCaseModal';
import { useAuth } from '../../hooks/useAuth';
import { API_BASE_URL } from '../../config/environment';

/**
 * Tester dashboard. The tester's own work comes first (their board tasks and the open bugs);
 * test cases, runs and automation follow, from their own tables. Every figure is real: with no
 * testing records yet, one card says so instead of a wall of empty charts.
 * Server: GET /api/tester/dashboard/:username (routes/tester-dashboard-routes.js).
 */

const ymd = (d) => (d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : undefined);
const pct = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);
const todayStr = ymd(new Date());
const fmtDay = (v) => (v ? new Date(`${v}T12:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'No date');
const PRIORITY_STYLE = { Highest: 'bg-red-100 text-red-700', High: 'bg-red-100 text-red-700', Critical: 'bg-red-100 text-red-700', Medium: 'bg-amber-100 text-amber-700', Low: 'bg-gray-100 text-gray-600', Lowest: 'bg-gray-100 text-gray-600' };
const STATUS_STYLE = (s) => (/progress/i.test(s) ? 'bg-blue-50 text-blue-700' : /review|test/i.test(s) ? 'bg-violet-50 text-violet-700' : /hold|discussion/i.test(s) ? 'bg-slate-100 text-slate-600' : 'bg-gray-100 text-gray-600');
const COLORS = { passed: '#22c55e', failed: '#ef4444', blocked: '#f59e0b', open: '#3b82f6', inProgress: '#8b5cf6', resolved: '#10b981', closed: '#6b7280' };

// Period choice, with "All time" (the default).
const PERIODS = {
  all: { label: 'All time', range: () => [null, null] },
  week: { label: 'Last 7 days', range: () => { const e = new Date(); const s = new Date(); s.setDate(s.getDate() - 6); return [s, e]; } },
  month30: { label: 'Last 30 days', range: () => { const e = new Date(); const s = new Date(); s.setDate(s.getDate() - 29); return [s, e]; } },
  thisMonth: { label: 'This month', range: () => { const n = new Date(); return [new Date(n.getFullYear(), n.getMonth(), 1), n]; } },
  lastMonth: { label: 'Last month', range: () => { const n = new Date(); return [new Date(n.getFullYear(), n.getMonth() - 1, 1), new Date(n.getFullYear(), n.getMonth(), 0)]; } }
};

const Empty = ({ children }) => <div className="text-xs text-gray-400 text-center py-8">{children}</div>;
const Card = ({ title, action, children, className = '' }) => (
  <section className={`bg-white p-4 rounded border border-gray-100 ${className}`}>
    <div className="flex justify-between items-center mb-3">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {action}
    </div>
    {children}
  </section>
);

function Donut({ data, total, label }) {
  const has = total > 0;
  return (
    <div className="flex items-center justify-center h-44 relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={has ? data : [{ value: 1, color: '#e5e7eb' }]} innerRadius={52} outerRadius={70} paddingAngle={has ? 2 : 0} dataKey="value" stroke="none" isAnimationActive={has}>
            {(has ? data : [{ color: '#e5e7eb' }]).map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
          </Pie>
          {has && <RechartsTooltip contentStyle={{ fontSize: '12px', borderRadius: '4px', border: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />}
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-2xl text-gray-900">{total}</span>
        <span className="text-xs text-gray-500">{label}</span>
      </div>
    </div>
  );
}

export default function ITTesterDashboard() {
  const { username: urlName, designation } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const base = `/it/${designation || 'tester'}/${urlName || user?.username || 'me'}`;
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [isTestCaseModalOpen, setIsTestCaseModalOpen] = useState(false);
  const [period, setPeriod] = useState('all');

  const load = useCallback(async () => {
    const [start, end] = PERIODS[period].range();
    try {
      const res = await axios.get(`${API_BASE_URL}/tester/dashboard/${encodeURIComponent(urlName || user?.username || 'me')}`, {
        params: { start: ymd(start), end: ymd(end) }
      });
      if (res.data.success) { setData(res.data.data); setError(''); } else setError('Could not load the dashboard.');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load the dashboard. Check your connection and refresh.');
    }
  }, [urlName, user?.username, period]);
  useEffect(() => { load(); }, [load]);

  if (!data) {
    return <div className="min-h-[60vh] flex items-center justify-center text-gray-500">{error || 'Loading dashboard…'}</div>;
  }

  const k = data.kpis;
  const firstName = data.me?.firstName || user?.first_name || '';
  const openTicket = (key) => navigate(`${base}/kanban?ticketKey=${encodeURIComponent(key)}`);
  const overdue = data.assignedTasks.filter(t => t.due_date && t.due_date < todayStr).length;
  const statusData = [
    { name: 'Passed', value: k.passedTests, color: COLORS.passed },
    { name: 'Failed', value: k.failedTests, color: COLORS.failed },
    { name: 'Blocked', value: k.blockedTests, color: COLORS.blocked }
  ];
  const b = data.bugStatusOverview;
  const bugData = [
    { name: 'Open', value: b.open, color: COLORS.open },
    { name: 'In Progress', value: b.inProgress, color: COLORS.inProgress },
    { name: 'Resolved', value: b.resolved, color: COLORS.resolved },
    { name: 'Closed', value: b.closed, color: COLORS.closed }
  ];
  const bugTotal = bugData.reduce((s, x) => s + x.value, 0);
  const hasTrend = data.trendData.some(t => t.total > 0);
  const myBugCount = (data.openBugs || []).filter(x => x.mine).length;

  const Kpi = ({ icon: Icon, tone, label, value, sub, warn, onClick }) => (
    <button type="button" onClick={onClick} disabled={!onClick}
      className={`text-left bg-white rounded p-4 border flex items-start gap-3 ${warn ? 'border-red-200' : 'border-gray-100'} ${onClick ? 'hover:border-gray-300 cursor-pointer' : 'cursor-default'}`}>
      <div className={`w-9 h-9 rounded flex items-center justify-center shrink-0 ${tone}`}><Icon size={18} /></div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium mb-0.5">{label}</p>
        <p className={`text-xl font-semibold ${warn ? 'text-red-700' : 'text-gray-900'}`}>{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5 truncate">{sub}</p>}
      </div>
    </button>
  );

  return (
    <div className="bg-[#f8fafc] min-h-screen p-6 font-sans text-gray-900">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-5 gap-3">
        <div>
          <h1 className="text-2xl text-gray-900 flex items-center gap-2">IT Tester Dashboard <ShieldAlert size={20} className="text-blue-500" /></h1>
          <p className="text-gray-500 mt-1 text-sm">Welcome back{firstName ? `, ${firstName}` : ''}! {k.myOpenTasks ? `You have ${k.myOpenTasks} open task${k.myOpenTasks === 1 ? '' : 's'}${overdue ? `, ${overdue} overdue` : ''}.` : 'Nothing open is assigned to you right now.'}</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <Calendar size={14} className="text-gray-400" /> Period
            <select value={period} onChange={(e) => setPeriod(e.target.value)} className="h-9 text-sm border border-gray-300 rounded px-2 bg-white outline-none focus:border-blue-500" aria-label="Period for test runs and bugs">
              {Object.entries(PERIODS).map(([key, p]) => <option key={key} value={key}>{p.label}</option>)}
            </select>
          </label>
          <button onClick={() => setIsTestCaseModalOpen(true)} className="h-9 bg-red-600 hover:bg-red-700 text-white px-3 rounded text-sm font-medium flex items-center gap-1.5 transition-colors">
            <Plus size={15} /> Create Test
          </button>
        </div>
      </div>

      <NewTestCaseModal isOpen={isTestCaseModalOpen} onClose={() => setIsTestCaseModalOpen(false)} onSuccess={() => { setIsTestCaseModalOpen(false); load(); }} />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
        <Kpi icon={ClipboardList} tone="bg-sky-50 text-sky-600" label="My open tasks" value={k.myOpenTasks} sub={overdue ? `${overdue} overdue` : 'On the task board'} warn={overdue > 0} onClick={() => navigate(`${base}/kanban`)} />
        <Kpi icon={Bug} tone="bg-rose-50 text-rose-600" label="Open bugs" value={k.openBugsCount} sub={myBugCount ? `${myBugCount} assigned to you` : 'None assigned to you'} onClick={() => navigate(`${base}/bugs`)} />
        <Kpi icon={FileText} tone="bg-indigo-50 text-indigo-600" label="Test cases" value={k.totalTestCases} sub={k.totalTestCases ? `${data.testCaseCoverage.coveredPercent}% automated` : 'None written yet'} onClick={() => navigate(`${base}/test-cases`)} />
        <Kpi icon={PlayCircle} tone="bg-blue-50 text-blue-600" label="Tests executed" value={k.executedTests} sub={PERIODS[period].label} />
        <Kpi icon={CheckCircle} tone="bg-green-50 text-green-600" label="Passed" value={k.passedTests} sub={`${pct(k.passedTests, k.executedTests)}% of executed`} />
        <Kpi icon={XCircle} tone="bg-red-50 text-red-600" label="Failed / blocked" value={`${k.failedTests} / ${k.blockedTests}`} sub={`${pct(k.failedTests + k.blockedTests, k.executedTests)}% of executed`} />
      </div>

      {/* My work first */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
        <Card title={`My assigned tasks (${data.assignedTasks.length})`} className="xl:col-span-2"
          action={<Link to={`${base}/kanban`} className="text-indigo-600 text-xs font-medium hover:underline flex items-center gap-1">Open board <ExternalLink size={12} /></Link>}>
          {data.assignedTasks.length ? (
            <ul className="divide-y divide-gray-100 border border-gray-100 rounded max-h-96 overflow-y-auto">
              {data.assignedTasks.map(t => {
                const late = t.due_date && t.due_date < todayStr;
                return (
                  <li key={t.issue_key}>
                    <button type="button" onClick={() => openTicket(t.issue_key)} className="w-full text-left flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors cursor-pointer">
                      <span className="text-xs text-blue-600 shrink-0 w-36 truncate" title={t.issue_key}>{t.issue_key}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate" title={t.title}>{t.title}</p>
                        {t.project && <p className="text-xs text-gray-500 truncate">{t.project}</p>}
                      </div>
                      <span className={`text-[11px] px-2 py-0.5 rounded shrink-0 ${STATUS_STYLE(t.status)}`}>{t.status}</span>
                      <span className={`text-xs shrink-0 w-20 text-right inline-flex items-center justify-end gap-1 ${late ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                        {late && <AlertTriangle size={11} />}{fmtDay(t.due_date)}
                      </span>
                      <span className={`text-[11px] px-2 py-0.5 rounded font-medium shrink-0 ${PRIORITY_STYLE[t.priority] || PRIORITY_STYLE.Medium}`}>{t.priority || 'Medium'}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : <Empty>Nothing open is assigned to you on the board.</Empty>}
        </Card>

        <Card title={`Open bugs (${(data.openBugs || []).length})`}
          action={<Link to={`${base}/bugs`} className="text-indigo-600 text-xs font-medium hover:underline flex items-center gap-1">Bug Tracking <ExternalLink size={12} /></Link>}>
          {(data.openBugs || []).length ? (
            <ul className="space-y-2 max-h-96 overflow-y-auto">
              {data.openBugs.map(bug => (
                <li key={bug.id}>
                  <button type="button" onClick={() => (bug.source === 'board' ? openTicket(bug.id) : navigate(`${base}/bugs`))}
                    className={`w-full text-left flex items-start gap-2.5 p-2.5 rounded border transition-colors cursor-pointer ${bug.mine ? 'bg-red-50/60 border-red-200 hover:border-red-300' : 'bg-gray-50 border-gray-100 hover:border-gray-300'}`}>
                    <Bug className="text-red-500 shrink-0 mt-0.5" size={15} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs text-red-600">{bug.id}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${PRIORITY_STYLE[bug.priority] || PRIORITY_STYLE.Medium}`}>{bug.priority || 'Medium'}</span>
                        <span className="text-[10px] text-gray-500">{bug.status}</span>
                        {bug.mine && <span className="text-[10px] font-semibold text-red-700">You</span>}
                      </div>
                      <p className="text-xs text-gray-800 truncate mt-0.5" title={bug.title}>{bug.title}</p>
                      <p className="text-[11px] text-gray-500 truncate">{bug.assignee || 'Unassigned'}{bug.project ? ` · ${bug.project}` : ''}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : <Empty>No open bugs. Nice.</Empty>}
        </Card>
      </div>

      {/* Testing records: charts when there is data, one clear card when there isn't */}
      {!data.hasTestingData ? (
        <section className="bg-white rounded border border-dashed border-gray-300 p-6 flex flex-col md:flex-row md:items-center gap-4">
          <div className="w-11 h-11 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0"><FileText size={20} /></div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900">No testing records yet</h3>
            <p className="text-xs text-gray-500 mt-0.5">Test cases, test runs, Bug Tracking entries and automation scripts appear here with their charts once they are added.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setIsTestCaseModalOpen(true)} className="h-9 px-3 rounded bg-red-600 text-white text-sm font-medium hover:bg-red-700 flex items-center gap-1.5"><Plus size={14} /> Create test case</button>
            <button onClick={() => navigate(`${base}/bugs`)} className="h-9 px-3 rounded border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-1.5"><Bug size={14} /> Report a bug</button>
          </div>
        </section>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
            <Card title="Test runs · last 6 months">
              <div className="h-56">
                {hasTrend ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280' }} />
                      <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280' }} />
                      <RechartsTooltip contentStyle={{ fontSize: '12px', borderRadius: '4px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                      <Line type="monotone" dataKey="total" name="Total" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="passed" name="Passed" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="failed" name="Failed" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <div className="h-full flex items-center justify-center"><Empty>No test runs in the last 6 months.</Empty></div>}
              </div>
            </Card>
            <Card title="Test runs by result">
              <Donut data={statusData} total={k.executedTests} label="Executed" />
              <div className="flex flex-col gap-1.5 mt-2">
                {statusData.map(d => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2"><span className="w-2 h-2 rounded" style={{ backgroundColor: d.color }} />{d.name}</span>
                    <span className="font-medium">{d.value} <span className="text-gray-400 font-normal">({pct(d.value, k.executedTests)}%)</span></span>
                  </div>
                ))}
              </div>
            </Card>
            <Card title="Bug Tracking entries by status">
              <Donut data={bugData} total={bugTotal} label="Bugs" />
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
                {bugData.map(d => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2"><span className="w-2 h-2 rounded" style={{ backgroundColor: d.color }} />{d.name}</span>
                    <span className="font-medium">{d.value}</span>
                  </div>
                ))}
              </div>
              {b.boardBugs > 0 && <p className="text-[11px] text-gray-500 mt-2">Plus {b.boardBugs} open Bug ticket{b.boardBugs === 1 ? '' : 's'} on the task board.</p>}
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Card title="Recent test runs" action={<Link to={`${base}/test-cases`} className="text-indigo-600 text-xs font-medium hover:underline flex items-center gap-1">Test Cases <ExternalLink size={12} /></Link>}>
              {data.recentTestRuns.length ? (
                <table className="w-full text-left text-xs">
                  <thead className="text-gray-500 border-b border-gray-100"><tr><th className="pb-2 font-medium">Test case</th><th className="pb-2 font-medium">Env</th><th className="pb-2 font-medium">Result</th></tr></thead>
                  <tbody>
                    {data.recentTestRuns.slice(0, 8).map(run => (
                      <tr key={run.id} className="border-b border-gray-50 last:border-0">
                        <td className="py-2 text-gray-800 truncate max-w-[180px]" title={run.title}>{run.title}</td>
                        <td className="py-2 text-gray-500">{run.environment}</td>
                        <td className="py-2"><span className={`px-2 py-0.5 rounded text-xs font-medium border ${run.status === 'Passed' ? 'bg-green-50 text-green-700 border-green-200' : run.status === 'Failed' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{run.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <Empty>No test runs in this period.</Empty>}
            </Card>
            <Card title="Test cases by priority">
              {k.totalTestCases ? (
                <div className="space-y-3">
                  {[['High', data.testsByPriority.high, 'bg-red-500'], ['Medium', data.testsByPriority.medium, 'bg-amber-500'], ['Low', data.testsByPriority.low, 'bg-green-500']].map(([label, v, bar]) => (
                    <div key={label}>
                      <div className="flex justify-between text-sm mb-1"><span className="text-gray-600">{label}</span><span className="font-medium text-gray-900">{v}</span></div>
                      <div className="w-full bg-gray-100 rounded h-1.5"><div className={`${bar} h-1.5 rounded`} style={{ width: `${pct(v, k.totalTestCases)}%` }} /></div>
                    </div>
                  ))}
                  <p className="text-xs text-gray-500">{data.testCaseCoverage.coveredCount} automated · {data.testCaseCoverage.notCoveredCount} manual</p>
                </div>
              ) : <Empty>No test cases yet.</Empty>}
            </Card>
            <Card title="Automation scripts">
              {data.automationSummary.totalScripts ? (
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 bg-indigo-100 rounded flex items-center justify-center shrink-0"><Settings size={22} className="text-indigo-600" /></div>
                  <div className="flex-1 space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Scripts</span><span>{data.automationSummary.totalScripts}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Passed</span><span className="text-green-600">{data.automationSummary.passedScripts}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Failed / broken</span><span className="text-red-600">{data.automationSummary.failedScripts}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Success rate</span><span>{data.automationSummary.successRate}%</span></div>
                  </div>
                </div>
              ) : <Empty>No automation scripts recorded.</Empty>}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Users, UserPlus, Inbox, CalendarClock, ListChecks, CalendarOff, AlertTriangle, Award, ChevronRight, ClipboardCheck, RefreshCw, Loader2, CheckCircle2, Info } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { API_BASE_URL } from '../../config/environment';
import useLiveRefresh from '../../hooks/useLiveRefresh';
import LeavesPanel from './HRLeaveRequests';

const TONE = {
  red: 'border-red-200 bg-red-50 text-red-800',
  amber: 'border-amber-200 bg-amber-50 text-amber-900',
  blue: 'border-blue-200 bg-blue-50 text-blue-900'
};
const GRADE_COLOR = { Excellent: 'bg-emerald-500', Good: 'bg-blue-500', Fair: 'bg-amber-400', 'Needs attention': 'bg-red-500' };
const initials = (n) => String(n || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
const ago = (d) => {
  const days = Math.floor((Date.now() - new Date(d)) / 86400000);
  return days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
};

const Card = ({ title, action, onAction, children, className = '' }) => (
  <section className={`bg-white border border-gray-200 rounded-lg ${className}`}>
    <header className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      {action && <button onClick={onAction} className="text-xs text-blue-600 hover:underline inline-flex items-center gap-0.5 cursor-pointer">{action}<ChevronRight size={12} /></button>}
    </header>
    <div className="p-4">{children}</div>
  </section>
);

const Stat = ({ icon: Icon, label, value, hint, tone = 'text-gray-900', onClick }) => (
  <button type="button" onClick={onClick} disabled={!onClick}
    className={`text-left bg-white border border-gray-200 rounded-lg p-4 ${onClick ? 'hover:border-blue-300 hover:shadow-sm cursor-pointer' : 'cursor-default'} transition`}>
    <div className="flex items-center gap-2 text-xs text-gray-500"><Icon size={14} />{label}</div>
    <div className={`text-2xl font-semibold mt-1.5 tabular-nums ${tone}`}>{value}</div>
    {hint && <div className="text-[11px] text-gray-500 mt-0.5 truncate">{hint}</div>}
  </button>
);

const Empty = ({ children }) => <p className="text-xs text-gray-500 py-2">{children}</p>;

const HRDashboard = () => {
  const { user } = useAuth();
  const { designation, username } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const go = (page) => {
    if (page === 'leaves') { const el = document.getElementById('hr-leaves'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    navigate(`/hr/${designation}/${username}/${page}`);
  };

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/hr/dashboard/overview`, { credentials: 'include' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not load the dashboard');
      setData(json); setError('');
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useLiveRefresh(['*'], () => load(), { wait: 1500, maxWait: 15000 });

  const name = user?.first_name || user?.name || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (loading) return <div className="p-10 flex items-center justify-center gap-2 text-sm text-gray-500"><Loader2 size={16} className="animate-spin" /> Loading the HR dashboard…</div>;
  if (error && !data) return <div className="p-6"><div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">{error}</div></div>;

  const { headcount, requests, dataIssues, work, meetings, performance, attention, leaves } = data;
  const maxDept = Math.max(1, ...headcount.byDepartment.map(d => d.count));
  const maxWork = Math.max(1, ...work.byDepartment.map(d => d.open));
  const gradeTotal = performance ? Object.values(performance.grades).reduce((a, b) => a + b, 0) : 0;
  const waiting = requests.registrations.length + requests.deletes + requests.approvals;

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{greeting}, {name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · live from your own records</p>
        </div>
        <button onClick={load} className="h-8 px-3 text-xs border border-gray-300 rounded bg-white hover:bg-gray-50 inline-flex items-center gap-1.5 cursor-pointer"><RefreshCw size={13} /> Refresh</button>
      </div>

      {/* Needs attention */}
      {attention.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {attention.map((a, i) => (
            <button key={i} type="button" onClick={a.link ? () => go(a.link) : undefined} disabled={!a.link}
              className={`text-left border rounded-lg px-3 py-2.5 text-sm flex items-center gap-2 ${TONE[a.tone] || TONE.blue} ${a.link ? 'cursor-pointer hover:brightness-95' : 'cursor-default'}`}>
              <AlertTriangle size={14} className="shrink-0" /><span className="flex-1">{a.text}</span>{a.link && <ChevronRight size={14} className="shrink-0" />}
            </button>
          ))}
        </div>
      ) : (
        <div className="border border-emerald-200 bg-emerald-50 text-emerald-800 rounded-lg px-3 py-2.5 text-sm flex items-center gap-2"><CheckCircle2 size={15} /> Nothing needs your attention right now.</div>
      )}

      {/* Key numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <Stat icon={Users} label="Active employees" value={headcount.total} hint={`${headcount.byDepartment.length} departments`} onClick={() => go('employees')} />
        <Stat icon={UserPlus} label="Joined in 30 days" value={headcount.newJoiners.length} hint="New accounts" onClick={() => go('employees')} />
        <Stat icon={CalendarOff} label="On leave today" value={leaves.awayToday} hint={leaves.pending ? `${leaves.pending} request${leaves.pending > 1 ? 's' : ''} to approve` : 'No requests waiting'} tone={leaves.pending ? 'text-amber-600' : 'text-gray-900'} onClick={() => go('leaves')} />
        <Stat icon={Inbox} label="Waiting on HR" value={waiting} tone={waiting ? 'text-amber-600' : 'text-gray-900'} hint="Registrations, deletions, approvals" onClick={() => go('registration-requests')} />
        <Stat icon={ListChecks} label="Open tasks" value={work.open} hint={work.overdue ? `${work.overdue} overdue` : 'None overdue'} tone={work.overdue ? 'text-red-600' : 'text-gray-900'} onClick={() => go('performance')} />
        <Stat icon={CalendarClock} label="Meetings today" value={meetings.today} hint={`${meetings.week} in the next 7 days`} onClick={() => go('meetings')} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Headcount */}
        <Card title="Team by department" action="Employees" onAction={() => go('employees')}>
          {headcount.byDepartment.length === 0 ? <Empty>No active employees.</Empty> : (
            <ul className="space-y-2.5">
              {headcount.byDepartment.map(d => (
                <li key={d.department}>
                  <div className="flex justify-between text-xs mb-1"><span className="text-gray-700">{d.department}</span><span className="tabular-nums text-gray-500">{d.count}</span></div>
                  <div className="h-2 bg-gray-100 rounded overflow-hidden"><div className="h-full bg-blue-500 rounded" style={{ width: `${(d.count / maxDept) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Work by department */}
        <Card title="Open work by department" action="Performance" onAction={() => go('performance')}>
          {work.byDepartment.length === 0 ? <Empty>No open tasks.</Empty> : (
            <ul className="space-y-2.5">
              {work.byDepartment.map(d => (
                <li key={d.department}>
                  <div className="flex justify-between text-xs mb-1"><span className="text-gray-700">{d.department}</span>
                    <span className="tabular-nums text-gray-500">{d.open} open{d.overdue ? <span className="text-red-600"> · {d.overdue} overdue</span> : null}</span></div>
                  <div className="h-2 bg-gray-100 rounded overflow-hidden relative">
                    <div className="h-full bg-slate-400 rounded" style={{ width: `${(d.open / maxWork) * 100}%` }} />
                    <div className="h-full bg-red-500 rounded absolute top-0 left-0" style={{ width: `${(d.overdue / maxWork) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Performance */}
        <Card title={`Performance${performance && performance.period ? ` · ${performance.period}` : ''}`} action="Open report" onAction={() => go('performance')}>
          {!performance || performance.scored === 0 ? <Empty>Not enough recorded work yet to score anyone this month.</Empty> : (
            <div className="space-y-3">
              <div className="flex items-end gap-2"><span className="text-3xl font-semibold tabular-nums">{performance.avgScore}</span><span className="text-xs text-gray-500 pb-1">average score · {performance.scored} people</span></div>
              <div className="flex h-2.5 rounded overflow-hidden bg-gray-100">
                {Object.entries(performance.grades).map(([g, n]) => <div key={g} className={GRADE_COLOR[g] || 'bg-gray-400'} style={{ width: `${(n / gradeTotal) * 100}%` }} title={`${g}: ${n}`} />)}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-600">
                {Object.entries(performance.grades).map(([g, n]) => <span key={g} className="inline-flex items-center gap-1"><i className={`w-2 h-2 rounded-sm ${GRADE_COLOR[g] || 'bg-gray-400'}`} />{g} {n}</span>)}
              </div>
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Requests */}
        <Card title="Waiting for a decision" action="Registrations" onAction={() => go('registration-requests')}>
          {waiting === 0 ? <Empty>No pending requests.</Empty> : (
            <ul className="divide-y divide-gray-100">
              {requests.registrations.map(r => (
                <li key={r.id} className="py-2 flex items-center gap-2.5 text-sm">
                  <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 text-xs font-medium flex items-center justify-center">{initials(`${r.first_name} ${r.last_name}`)}</span>
                  <div className="min-w-0 flex-1"><div className="truncate text-gray-900">{r.first_name} {r.last_name}</div><div className="text-[11px] text-gray-500 truncate">{[r.role_name, r.department].filter(Boolean).join(' · ')} · {ago(r.created_at)}</div></div>
                </li>
              ))}
              {requests.deletes > 0 && <li className="py-2 text-sm text-gray-700">{requests.deletes} account deletion request{requests.deletes > 1 ? 's' : ''}</li>}
              {requests.approvals > 0 && <li className="py-2 text-sm text-gray-700">{requests.approvals} approval{requests.approvals > 1 ? 's' : ''} pending</li>}
            </ul>
          )}
        </Card>

        {/* New joiners */}
        <Card title="New joiners" action="Employees" onAction={() => go('employees')}>
          {headcount.newJoiners.length === 0 ? <Empty>No new accounts in the last 30 days.</Empty> : (
            <ul className="divide-y divide-gray-100">
              {headcount.newJoiners.map(p => (
                <li key={p.id} className="py-2 flex items-center gap-2.5 text-sm">
                  <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 text-xs font-medium flex items-center justify-center">{initials(p.name)}</span>
                  <div className="min-w-0 flex-1"><div className="truncate text-gray-900">{p.name}</div><div className="text-[11px] text-gray-500 truncate">{[p.role, p.department].filter(Boolean).join(' · ')}</div></div>
                  <span className="text-[11px] text-gray-400 shrink-0">{ago(p.joined)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Top and low performers */}
        <Card title="People to recognise and support" action="Reviews" onAction={() => go('performance')}>
          {!performance || performance.scored === 0 ? <Empty>No scores yet this month.</Empty> : (
            <div className="space-y-3">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-emerald-700 mb-1 flex items-center gap-1"><Award size={12} /> Top this month</div>
                {performance.top.map(p => <div key={p.id} className="flex justify-between text-sm py-0.5"><span className="truncate text-gray-800">{p.name} <span className="text-[11px] text-gray-400">{p.department}</span></span><span className="tabular-nums text-gray-600">{p.score}</span></div>)}
              </div>
              {performance.needsAttention.length > 0 && (
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-red-700 mb-1 flex items-center gap-1"><ClipboardCheck size={12} /> Needs a conversation</div>
                  {performance.needsAttention.map(p => <div key={p.id} className="flex justify-between text-sm py-0.5"><span className="truncate text-gray-800">{p.name} <span className="text-[11px] text-gray-400">{p.department}</span></span><span className="tabular-nums text-gray-600">{p.score}</span></div>)}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      <div id="hr-leaves"><LeavesPanel onChanged={load} /></div>

      {/* Records to clean up */}
      {dataIssues.length > 0 && (
        <Card title={`Employee records to clean up (${dataIssues.length})`} action="Employees" onAction={() => go('employees')}>
          <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
            {dataIssues.map((d, i) => (
              <li key={`${d.id}-${i}`} className="text-sm flex items-start gap-1.5"><Info size={13} className="mt-1 text-blue-500 shrink-0" /><span><span className="text-gray-900">{d.name || `Account ${d.id}`}</span> <span className="text-gray-500">· {d.issue}</span></span></li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
};

export default HRDashboard;

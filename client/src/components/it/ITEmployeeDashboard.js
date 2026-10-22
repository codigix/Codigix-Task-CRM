import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ClipboardCheck, FileText, CheckCircle, AlertCircle, Calendar,
  Layers, ArrowRight, Video, MapPin, Phone, ChevronLeft, ChevronRight
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import BoardTabs from '../common/BoardTabs';
import { useAuth } from '../../hooks/useAuth';
import { projectAPI, itKanbanAPI } from '../../services/api';
import { API_BASE_URL } from '../../config/environment';
import useLiveRefresh from '../../hooks/useLiveRefresh';

/**
 * The IT dashboard for employees (managers, admins and HR keep ITManagerDashboard).
 * Everything here is the signed-in person's own work: tickets and subtasks assigned to them,
 * and the meetings they host or attend today.
 */

const DONE = ['DONE', 'COMPLETED', 'CLOSED'];
const norm = (s) => String(s || '').trim().toUpperCase();
const isDone = (t) => DONE.includes(norm(t.status));
const isInProgress = (t) => ['IN PROGRESS', 'IN-PROGRESS', 'IN_PROGRESS'].includes(norm(t.status));
const isInReview = (t) => norm(t.status) === 'IN REVIEW';
const isTodo = (t) => !isDone(t) && !isInProgress(t) && !isInReview(t);

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dayOf = (v) => {
  if (!v) return '';
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v).slice(0, 10) : ymd(d);
};
const fmtDay = (v) => {
  const d = dayOf(v);
  return d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'No due date';
};

const fmtTime = (v) => new Date(v).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const MEETING_ICON = { online: Video, offline: MapPin, call: Phone };

const PRIORITY_STYLE = {
  High: 'text-rose-600 bg-rose-50',
  Highest: 'text-rose-700 bg-rose-100',
  Medium: 'text-amber-600 bg-amber-50',
  Low: 'text-green-600 bg-green-50'
};
const statusStyle = (t) => (isDone(t) ? 'text-emerald-600 bg-emerald-50'
  : isInProgress(t) ? 'text-blue-600 bg-blue-50'
    : isInReview(t) ? 'text-purple-600 bg-purple-50'
      : 'text-gray-600 bg-gray-100');

const ITEmployeeDashboard = () => {
  const { user } = useAuth();
  const { username, designation } = useParams();
  const navigate = useNavigate();
  const urlPrefix = `/it/${designation || 'employee'}/${username || 'user'}`;
  const firstName = String(user?.first_name || user?.name || 'there').split(' ')[0];

  const [projects, setProjects] = useState([]);
  const [issues, setIssues] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => ymd(new Date()).slice(0, 7)); // 'YYYY-MM' the KPI cards cover
  const [liveTick, setLiveTick] = useState(0);
  const loadedOnce = useRef(false);
  useLiveRefresh(['work', 'meetings'], () => setLiveTick(t => t + 1));

  useEffect(() => {
    const load = async () => {
      try {
        if (!loadedOnce.current) setLoading(true);
        loadedOnce.current = true;
        const [projRes, issueRes] = await Promise.all([
          projectAPI.getAll({ department: 'IT' }),
          itKanbanAPI.getIssues()
        ]);
        setProjects(Array.isArray(projRes) ? projRes : []);
        setIssues(Array.isArray(issueRes) ? issueRes : []);
        // Today's meetings I host or attend. A failure here never blanks the rest of the dashboard.
        try {
          const res = await fetch(`${API_BASE_URL}/meetings?scope=mine&when=today`);
          const data = await res.json().catch(() => ({}));
          setMeetings(res.ok && Array.isArray(data.meetings) ? data.meetings : []);
        } catch { setMeetings([]); }
      } catch (err) {
        console.error('Error loading my dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [liveTick]);

  // Names this person can appear under on a ticket (tickets store people by name).
  const me = useMemo(() => new Set([
    user?.name,
    `${user?.first_name || ''} ${user?.last_name || ''}`,
    user?.username,
    user?.email
  ].map(v => String(v || '').trim().toLowerCase()).filter(Boolean)), [user]);
  const isMe = (name) => me.has(String(name || '').trim().toLowerCase());

  // My work: tickets assigned to me, plus subtasks assigned to me (shown as their own items).
  const myTasks = useMemo(() => {
    const out = [];
    issues.forEach(issue => {
      const key = issue.issue_key || issue.key;
      if (isMe(issue.assignee)) out.push({ ...issue, key, boardKey: key });
      let subs = issue.subtasks;
      if (typeof subs === 'string') { try { subs = JSON.parse(subs); } catch { subs = []; } }
      (Array.isArray(subs) ? subs : []).forEach((st, idx) => {
        if (!st || !isMe(st.assignee)) return;
        out.push({
          ...issue,
          id: `subtask-${st.id || idx}`,
          key: st.subtaskKey || `${key}-${idx + 1}`,
          boardKey: key,
          title: st.title || 'Untitled subtask',
          type: 'Sub-task',
          assignee: st.assignee,
          status: st.completed ? 'DONE' : (st.status || 'TO DO'),
          priority: st.priority || issue.priority || 'Medium',
          due_date: st.due_date || issue.due_date,
          time_spent: st.time_spent || '',
          isSubtask: true
        });
      });
    });
    return out;
  }, [issues, me]); // eslint-disable-line react-hooks/exhaustive-deps

  const today = ymd(new Date());

  // The cards, the to-do list and the status chart cover one month: a task belongs to the month
  // of its due date (else start date, else when it was created). Today's meetings stay today.
  const monthOf = (t) => (dayOf(t.due_date) || dayOf(t.start_date) || dayOf(t.created_at)).slice(0, 7);
  const monthTasks = myTasks.filter(t => monthOf(t) === month);
  const monthOverdue = monthTasks.filter(t => !isDone(t) && dayOf(t.due_date) && dayOf(t.due_date) < today);
  const monthLabel = new Date(`${month}-01T00:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const monthName = monthLabel.split(' ')[0];
  const thisMonth = today.slice(0, 7);
  const shiftMonth = (delta) => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
  };

  const counts = {
    todo: monthTasks.filter(isTodo).length,
    inProgress: monthTasks.filter(isInProgress).length,
    inReview: monthTasks.filter(isInReview).length,
    done: monthTasks.filter(isDone).length
  };
  const todaysMeetings = meetings
    .filter(m => m.status !== 'Cancelled')
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));

  const projectName = (id) => projects.find(p => Number(p.id) === Number(id))?.name || 'General IT';

  // Open work, most urgent first: overdue, then by due date, undated last; High before others.
  const byUrgency = (a, b) => {
    const da = dayOf(a.due_date) || '9999-12-31';
    const db = dayOf(b.due_date) || '9999-12-31';
    if (da !== db) return da < db ? -1 : 1;
    const rank = (p) => ({ Highest: 0, High: 1, Medium: 2, Low: 3 }[p] ?? 2);
    return rank(a.priority) - rank(b.priority);
  };
  const myTodoTasks = monthTasks.filter(isTodo).sort(byUrgency);

  const statusData = [
    { name: 'To Do', value: counts.todo, color: '#94a3b8' },
    { name: 'In Progress', value: counts.inProgress, color: '#3b82f6' },
    { name: 'In Review', value: counts.inReview, color: '#8b5cf6' },
    { name: 'Done', value: counts.done, color: '#22c55e' }
  ];
  const statusChart = monthTasks.length ? statusData.filter(s => s.value > 0) : [{ name: 'No tasks', value: 1, color: '#e5e7eb' }];

  const openTask = (t) => navigate(`${urlPrefix}/kanban?ticketKey=${encodeURIComponent(t.boardKey || t.key)}`);

  const kpis = [
    { title: 'To Do', value: monthTasks.filter(isTodo).length, note: `${monthTasks.length} assigned in ${monthLabel.split(' ')[0]}`, icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { title: 'In Progress', value: monthTasks.filter(isInProgress).length, note: 'Being worked on', icon: ClipboardCheck, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'In Review', value: monthTasks.filter(isInReview).length, note: 'Waiting for approval', icon: Layers, color: 'text-purple-600', bg: 'bg-purple-50' },
    { title: 'Completed', value: monthTasks.filter(isDone).length, note: `Due in ${monthLabel.split(' ')[0]}`, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'Overdue', value: monthOverdue.length, note: monthOverdue.length ? 'Needs attention' : 'Nothing late', icon: AlertCircle, color: monthOverdue.length ? 'text-rose-600' : 'text-gray-500', bg: monthOverdue.length ? 'bg-rose-50' : 'bg-gray-50' }
  ];

  const TaskRow = ({ t }) => {
    const late = dayOf(t.due_date) && dayOf(t.due_date) < today && !isDone(t);
    return (
      <button onClick={() => openTask(t)} className="w-full text-left flex items-center gap-3 px-2 py-2 rounded hover:bg-gray-50 cursor-pointer group">
        <div className="flex-1 min-w-0">
          <div className="text-xs text-gray-900 truncate group-hover:text-indigo-600">{t.title || 'Untitled'}</div>
          <div className="text-[11px] text-gray-400 truncate">{t.key}{t.isSubtask ? ' · subtask' : ''} · {projectName(t.project_id)}</div>
        </div>
        <span className={`px-2 py-0.5 rounded text-[10px] whitespace-nowrap ${statusStyle(t)}`}>{t.status || 'TO DO'}</span>
        <span className={`px-2 py-0.5 rounded text-[10px] whitespace-nowrap ${PRIORITY_STYLE[t.priority] || 'text-gray-600 bg-gray-50'}`}>{t.priority || 'Medium'}</span>
        <span className={`text-[11px] w-16 text-right whitespace-nowrap ${late ? 'text-rose-600' : 'text-gray-500'}`}>{fmtDay(t.due_date)}</span>
      </button>
    );
  };

  return (
    <div className="flex w-full min-h-screen bg-[#F8FAFC] font-sans">
      <div className="flex-1 flex flex-col min-w-0">
        <BoardTabs department="IT" spaceName="IT Workspace" />
        <div className="p-4 flex-1">
          {/* HEADER */}
          <div className="flex flex-wrap justify-between items-start gap-3 mb-6">
            <div>
              <h1 className="text-xl text-gray-900">My Dashboard</h1>
              <p className="text-gray-500 text-sm mt-1">Welcome back, {firstName}! Here's your work for today.</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(`${urlPrefix}/kanban`)} className="p-2 bg-red-600 text-white rounded text-sm font-medium flex items-center gap-2 hover:bg-red-700 transition-colors cursor-pointer">
                Open my board <ArrowRight size={16} />
              </button>
              <div className="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded">
                <Calendar size={14} className="text-gray-500" />
                <span className="text-xs font-medium text-gray-700">Today, {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-sm text-gray-500 py-16 text-center">Loading your work…</div>
          ) : (
            <>
              {/* KPI CARDS (month-wise) */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">My work for <strong className="text-gray-800">{monthLabel}</strong></span>
                <div className="flex items-center gap-1">
                  <button onClick={() => shiftMonth(-1)} className="h-7 w-7 inline-flex items-center justify-center rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 cursor-pointer" title="Previous month"><ChevronLeft size={14} /></button>
                  {/* Click to pick any month from the calendar; the arrows step one month. */}
                  <label className="relative h-7 px-2 inline-flex items-center gap-1.5 rounded border border-gray-200 bg-white text-xs text-gray-800 hover:bg-gray-50 cursor-pointer" title="Choose a month">
                    <Calendar size={12} className="text-gray-500" />
                    <span className="w-24 text-center">{monthLabel}</span>
                    <input
                      type="month"
                      value={month}
                      onChange={(e) => { if (/^\d{4}-\d{2}$/.test(e.target.value)) setMonth(e.target.value); }}
                      onClick={(e) => { try { e.currentTarget.showPicker(); } catch { /* older browsers open it on focus */ } }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      aria-label="Choose a month"
                    />
                  </label>
                  <button onClick={() => shiftMonth(1)} className="h-7 w-7 inline-flex items-center justify-center rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 cursor-pointer" title="Next month"><ChevronRight size={14} /></button>
                  {month !== thisMonth && (
                    <button onClick={() => setMonth(thisMonth)} className="ml-1 h-7 px-2 rounded border border-gray-200 bg-white text-xs text-indigo-600 hover:bg-gray-50 cursor-pointer">This month</button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2 mb-6">
                {kpis.map((k) => (
                  <div key={k.title} className="bg-white p-4 rounded border border-gray-100">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2 rounded ${k.bg} ${k.color}`}><k.icon size={20} /></div>
                      <div className="text-xs font-medium text-gray-500">{k.title}</div>
                    </div>
                    <div className="text-2xl text-gray-900 mb-1">{k.value}</div>
                    <div className="text-xs font-medium text-gray-500">{k.note}</div>
                  </div>
                ))}
              </div>

              {/* TODAY'S MEETINGS */}
              <div className="mb-6 bg-white p-3 rounded border border-gray-100">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm text-gray-900">Today's meetings <span className="text-xs text-gray-400">({todaysMeetings.length})</span></h3>
                  <span onClick={() => navigate('/meetings')} className="text-xs text-indigo-600 font-medium hover:underline cursor-pointer">All meetings</span>
                </div>
                {todaysMeetings.length === 0 ? (
                  <div className="text-xs text-gray-400 py-2">No meetings scheduled for you today.</div>
                ) : (
                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {todaysMeetings.map(m => {
                      const start = new Date(m.scheduled_at);
                      const end = new Date(start.getTime() + (m.duration_min || 60) * 60000);
                      const now = Date.now();
                      const live = start.getTime() <= now && now < end.getTime();
                      const over = end.getTime() <= now;
                      const Icon = MEETING_ICON[m.kind] || Video;
                      return (
                        <div key={m.id} className={`flex items-start gap-3 p-2 rounded border ${live ? 'border-emerald-200 bg-emerald-50/50' : 'border-gray-100'} ${over ? 'opacity-60' : ''}`}>
                          <div className="shrink-0 w-8 h-8 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center"><Icon size={14} /></div>
                          <div className="flex-1 min-w-0">
                            <button onClick={() => navigate(`/meetings?open=${m.id}`)} className="text-xs text-gray-900 truncate block max-w-full text-left hover:text-indigo-600 cursor-pointer">{m.title}</button>
                            <div className="text-[11px] text-gray-500">
                              {fmtTime(start)} – {fmtTime(end)}{m.host_name ? ` · ${m.host_name}` : ''}
                              {live && <span className="ml-1 text-emerald-600">· Live now</span>}
                              {over && <span className="ml-1">· Ended</span>}
                            </div>
                          </div>
                          {m.kind === 'online' && m.meet_link && !over && (
                            <a href={m.meet_link} target="_blank" rel="noreferrer" className="shrink-0 px-2 py-1 rounded bg-red-600 text-white text-[11px] hover:bg-red-700">Join</a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* MY TASKS + STATUS */}
              <div className="grid grid-cols-12 gap-6 mb-6">
                <div className="col-span-12 lg:col-span-8 bg-white p-3 rounded border border-gray-100">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm text-gray-900">My to-do tasks · {monthName} <span className="text-xs text-gray-400">(most urgent first)</span></h3>
                    <span onClick={() => navigate(`${urlPrefix}/kanban`)} className="text-xs text-indigo-600 font-medium hover:underline cursor-pointer">View board</span>
                  </div>
                  <div className="divide-y divide-gray-50 max-h-[360px] overflow-y-auto">
                    {myTodoTasks.slice(0, 12).map(t => <TaskRow key={`${t.key}-${t.id}`} t={t} />)}
                    {myTodoTasks.length === 0 && <div className="text-xs text-gray-500 text-center py-8">Nothing in To Do for {monthLabel}.</div>}
                  </div>
                </div>

                <div className="col-span-12 lg:col-span-4 bg-white p-3 rounded border border-gray-100 flex flex-col">
                  <h3 className="text-sm text-gray-900 mb-2">My tasks by status · {monthName}</h3>
                  <div className="relative h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusChart} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={3} dataKey="value" stroke="none">
                          {statusChart.map((s) => <Cell key={s.name} fill={s.color} />)}
                        </Pie>
                        {monthTasks.length > 0 && <Tooltip />}
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl text-gray-900">{monthTasks.length}</span>
                      <span className="text-xs text-gray-500">Tasks in {monthName}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-y-2 mt-3 px-2">
                    {statusData.map(s => (
                      <div key={s.name} className="flex items-center justify-between pr-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded" style={{ backgroundColor: s.color }} />
                          <span className="text-xs text-gray-600">{s.name}</span>
                        </div>
                        <span className="text-xs text-gray-900">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ITEmployeeDashboard;

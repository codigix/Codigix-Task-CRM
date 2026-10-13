import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  Users, Plus, Search, X, Loader2, Pencil, Trash2, Folder, Clock, AlertTriangle, Eye, CheckCircle2,
  Timer, Activity, UserX, ChevronUp, ChevronDown, Crown, Briefcase, PlayCircle
} from 'lucide-react';
import { API_BASE_URL } from '../../config/environment';
import { showSuccessToast, showErrorToast } from '../../utils/toast';
import useLiveRefresh from '../../hooks/useLiveRefresh';

/**
 * Team: who is carrying what right now, from real ticket and time data
 * (GET /api/team-overview), plus team set-up (teams, managers, members, projects).
 */

const api = async (path, opts = {}) => {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...opts,
    headers: { ...(opts.body ? { 'Content-Type': 'application/json' } : {}), ...(opts.headers || {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
};

const LEVELS = {
  overloaded: { label: 'Overloaded', bar: 'bg-red-500', chip: 'bg-red-50 text-red-700 ring-red-200', hint: 'More planned work this week than working hours' },
  busy: { label: 'Busy', bar: 'bg-amber-500', chip: 'bg-amber-50 text-amber-800 ring-amber-200', hint: '80–100% of the week planned' },
  balanced: { label: 'Balanced', bar: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200', hint: '40–80% of the week planned' },
  light: { label: 'Light', bar: 'bg-sky-500', chip: 'bg-sky-50 text-sky-700 ring-sky-200', hint: 'Under 40% of the week planned' },
  idle: { label: 'No open work', bar: 'bg-gray-300', chip: 'bg-gray-100 text-gray-600 ring-gray-200', hint: 'Nothing open assigned' }
};
const TONES = ['bg-red-600', 'bg-emerald-600', 'bg-violet-600', 'bg-amber-600', 'bg-rose-600', 'bg-cyan-700', 'bg-fuchsia-600', 'bg-teal-600'];
const initials = (n) => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');
const Avatar = ({ name, id, size = 'w-8 h-8', text = 'text-[11px]' }) => (
  <span className={`${size} ${text} rounded ${TONES[Math.abs(Number(id) || 0) % TONES.length]} text-white font-semibold flex items-center justify-center shrink-0`} title={name}>{initials(name)}</span>
);
const fmtDue = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'No date');
const sinceText = (v) => { if (!v) return ''; const m = Math.round((Date.now() - new Date(v)) / 60000); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`; };

const LoadBar = ({ pct, level, hours, capacity }) => (
  <div className="flex items-center gap-2 min-w-[130px]" title={`${hours} h planned of ${capacity} h this week · ${LEVELS[level]?.hint || ''}`}>
    <div className="h-2 flex-1 bg-gray-100 rounded overflow-hidden"><div className={`h-full rounded ${LEVELS[level]?.bar || 'bg-gray-300'}`} style={{ width: `${Math.min(100, pct)}%` }} /></div>
    <span className="text-[12px] tabular-nums text-gray-700 w-10 text-right">{pct}%</span>
  </div>
);

const Tile = ({ icon: Icon, label, value, hint, tone = 'text-gray-500', onClick, active }) => (
  <button type="button" onClick={onClick} disabled={!onClick}
    className={`text-left bg-white border rounded p-3 transition ${onClick ? 'cursor-pointer hover:border-gray-300' : 'cursor-default'} ${active ? 'border-blue-400 ring-1 ring-blue-200' : 'border-gray-200'}`}>
    <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium"><Icon size={13} className={tone} /> {label}</div>
    <div className="text-2xl font-semibold text-gray-900 tabular-nums mt-1">{value}</div>
    {hint && <div className="text-[11px] text-gray-500 mt-0.5 truncate">{hint}</div>}
  </button>
);

// ── Team editor ──────────────────────────────────────────────────────────
function TeamModal({ team, data, onClose, onSaved }) {
  const isNew = !team;
  const [form, setForm] = useState(() => ({
    name: team?.name || '', description: team?.description || '', departmentId: team?.departmentId || '',
    managerId: team?.manager?.id || '', managerRole: team?.managerRole || 'Team Lead',
    members: (team?.members || []).map(m => ({ userId: m.userId, role: m.role || '' })),
    projectIds: (team?.projects || []).map(p => p.id)
  }));
  const [memberSearch, setMemberSearch] = useState('');
  const [projectSearch, setProjectSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setError(''); };
  const personById = new Map(data.people.map(p => [p.id, p]));

  const toggleMember = (p) => setForm(f => (f.members.some(m => m.userId === p.id)
    ? { ...f, members: f.members.filter(m => m.userId !== p.id) }
    : { ...f, members: [...f.members, { userId: p.id, role: p.title || '' }] }));
  const toggleProject = (id) => setForm(f => ({ ...f, projectIds: f.projectIds.includes(id) ? f.projectIds.filter(x => x !== id) : [...f.projectIds, id] }));

  const save = async () => {
    if (!form.name.trim()) { setError('Give the team a name.'); return; }
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), description: form.description, department_id: form.departmentId || null, manager_id: form.managerId || null, manager_role: form.managerRole || null };
      let id = team?.id;
      if (isNew) id = (await api('/teams', { method: 'POST', body: payload })).id;
      else await api(`/teams/${id}`, { method: 'PUT', body: payload });
      // Members: remove those taken out, add / update the rest.
      const before = new Set((team?.members || []).map(m => m.userId));
      const after = new Set(form.members.map(m => m.userId));
      for (const uid of before) if (!after.has(uid)) await api(`/teams/${id}/members/${uid}`, { method: 'DELETE' });
      for (const m of form.members) await api(`/teams/${id}/members`, { method: 'POST', body: { user_id: m.userId, role: m.role || null } });
      // Projects.
      const prevProjects = new Set((team?.projects || []).map(p => p.id));
      for (const pid of form.projectIds) if (!prevProjects.has(pid)) await api(`/projects/${pid}/assign-team`, { method: 'POST', body: { team_id: id } });
      for (const pid of prevProjects) if (!form.projectIds.includes(pid)) await api(`/team-overview/projects/${pid}/clear-team`, { method: 'POST' });
      showSuccessToast(isNew ? 'Team created' : 'Team saved');
      onSaved();
    } catch (e) { setError(e.message); setSaving(false); }
  };

  const label = 'block text-xs font-semibold text-gray-700 mb-1';
  const input = 'w-full h-9 text-[13px] border border-gray-300 rounded px-2.5 outline-none focus:border-blue-500 bg-white';
  const peopleList = data.people.filter(p => !memberSearch || `${p.name} ${p.title} ${p.department}`.toLowerCase().includes(memberSearch.toLowerCase()));
  const projectList = data.projects.filter(p => !projectSearch || p.name.toLowerCase().includes(projectSearch.toLowerCase()));

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-white rounded-xl shadow-2xl">
        <div className="px-5 py-3.5 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">{isNew ? 'New team' : `Edit ${team.name}`}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-500 cursor-pointer" aria-label="Close"><X size={17} /></button>
        </div>
        <div className="p-5 overflow-y-auto grid md:grid-cols-2 gap-5">
          <div className="space-y-3">
            <div><label className={label}>Team name <span className="text-red-600">*</span></label><input autoFocus value={form.name} onChange={e => set('name', e.target.value)} className={input} placeholder="e.g. SEO & GMB" /></div>
            <div><label className={label}>Description</label><textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} className="w-full text-[13px] border border-gray-300 rounded p-2.5 outline-none focus:border-blue-500" /></div>
            <div><label className={label}>Department</label>
              <select value={form.departmentId} onChange={e => set('departmentId', e.target.value)} className={input}>
                <option value="">—</option>
                {data.departmentList.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className={label}>Team lead</label>
                <select value={form.managerId} onChange={e => set('managerId', e.target.value)} className={input}>
                  <option value="">No lead</option>
                  {data.people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div><label className={label}>Lead's title</label><input value={form.managerRole} onChange={e => set('managerRole', e.target.value)} className={input} /></div>
            </div>
            <div>
              <label className={label}>Projects <span className="font-normal text-gray-400">{form.projectIds.length ? `· ${form.projectIds.length} selected` : ''}</span></label>
              <input value={projectSearch} onChange={e => setProjectSearch(e.target.value)} placeholder="Search projects" className={`${input} mb-1.5`} />
              <div className="max-h-44 overflow-y-auto border border-gray-200 rounded divide-y divide-gray-100">
                {projectList.map(p => (
                  <label key={p.id} className="flex items-center gap-2 px-2.5 py-1.5 text-[13px] cursor-pointer hover:bg-gray-50">
                    <input type="checkbox" checked={form.projectIds.includes(p.id)} onChange={() => toggleProject(p.id)} />
                    <span className="truncate flex-1">{p.name}</span>
                    {p.teamId && Number(p.teamId) !== Number(team?.id) && <span className="text-[10px] text-amber-700" title="Choosing it moves the project to this team">other team</span>}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className={label}>Members <span className="font-normal text-gray-400">{form.members.length ? `· ${form.members.length} selected` : ''}</span></label>
            <input value={memberSearch} onChange={e => setMemberSearch(e.target.value)} placeholder="Search people" className={`${input} mb-1.5`} />
            <div className="max-h-[340px] overflow-y-auto border border-gray-200 rounded divide-y divide-gray-100">
              {peopleList.map(p => {
                const m = form.members.find(x => x.userId === p.id);
                return (
                  <div key={p.id} className={`flex items-center gap-2 px-2.5 py-1.5 ${m ? 'bg-blue-50/40' : ''}`}>
                    <input type="checkbox" checked={Boolean(m)} onChange={() => toggleMember(p)} aria-label={`Add ${p.name}`} />
                    <Avatar name={p.name} id={p.id} size="w-6 h-6" text="text-[9px]" />
                    <span className="min-w-0 flex-1"><span className="block text-[13px] truncate">{p.name}</span><span className="block text-[11px] text-gray-500 truncate">{p.department}</span></span>
                    {m && <input value={m.role} onChange={e => setForm(f => ({ ...f, members: f.members.map(x => (x.userId === p.id ? { ...x, role: e.target.value } : x)) }))}
                      placeholder="Role in team" className="w-32 h-7 text-[12px] border border-gray-300 rounded px-2 outline-none focus:border-blue-500" />}
                  </div>
                );
              })}
            </div>
            {form.managerId && !form.members.some(m => Number(m.userId) === Number(form.managerId)) && (
              <p className="text-[11px] text-gray-500 mt-1.5">The lead ({personById.get(Number(form.managerId))?.name}) counts as part of the team.</p>
            )}
          </div>
        </div>
        {error && <div className="mx-5 mb-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2.5 py-1.5">{error}</div>}
        <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button onClick={onClose} disabled={saving} className="h-9 px-4 text-sm rounded border border-gray-300 hover:bg-gray-50 cursor-pointer">Cancel</button>
          <button onClick={save} disabled={saving} className="h-9 px-4 text-sm font-medium rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 flex items-center gap-1.5 cursor-pointer">{saving && <Loader2 size={14} className="animate-spin" />} {isNew ? 'Create team' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Person drawer ────────────────────────────────────────────────────────
function PersonPanel({ person, capacity, onClose, onTicket }) {
  const L = LEVELS[person.level] || LEVELS.idle;
  return (
    <div className="fixed inset-0 z-[1100] flex justify-end" role="dialog" aria-label={person.name}>
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-[480px] h-full bg-white shadow-2xl flex flex-col">
        <div className="px-5 py-4 border-b border-gray-200 flex items-start gap-3">
          <Avatar name={person.name} id={person.id} size="w-12 h-12" text="text-[15px]" />
          <div className="min-w-0 flex-1">
            <div className="text-[16px] font-semibold text-gray-900 truncate">{person.name}</div>
            <div className="text-xs text-gray-500 truncate">{[person.title, person.department, person.email].filter(Boolean).join(' · ')}</div>
            <div className="flex flex-wrap gap-1 mt-1.5">
              <span className={`text-[11px] px-1.5 py-0.5 rounded ring-1 ring-inset ${L.chip}`}>{L.label}</span>
              {person.teams.map(t => <span key={t.id} className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">{t.name}</span>)}
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-500 cursor-pointer" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {person.working && (
            <button onClick={() => onTicket(person.working.key)} className="w-full text-left p-3 rounded border border-emerald-200 bg-emerald-50/60 cursor-pointer">
              <div className="text-[11px] font-semibold text-emerald-800 flex items-center gap-1"><PlayCircle size={12} /> Working now · {sinceText(person.working.since)}</div>
              <div className="text-[13px] text-gray-800 truncate mt-0.5"><span className="font-mono text-[11px] text-gray-500">{person.working.key}</span> {person.working.title}</div>
            </button>
          )}
          <div>
            <div className="text-xs font-semibold text-gray-700 mb-1.5">This week's workload</div>
            <LoadBar pct={person.loadPct} level={person.level} hours={person.loadHours} capacity={capacity} />
            <div className="text-[11px] text-gray-500 mt-1">{person.loadHours} h of planned work overdue or due in the next 7 days, against {capacity} working hours.</div>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[['Open', person.open], ['In progress', person.inProgress], ['In review', person.review], ['Overdue', person.overdue], ['Due 7 days', person.dueWeek], ['To review', person.toReview], ['Done 7 days', person.doneWeek], ['Hours 7 days', person.hoursWeek]].map(([l, v]) => (
              <div key={l} className="rounded border border-gray-200 p-2">
                <div className={`text-[17px] font-semibold tabular-nums ${l === 'Overdue' && v ? 'text-red-700' : 'text-gray-900'}`}>{v}</div>
                <div className="text-[10px] text-gray-500">{l}</div>
              </div>
            ))}
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-700 mb-1.5">Open tasks ({person.tasks.length})</div>
            {person.tasks.length === 0 ? <div className="text-xs text-gray-500">Nothing open.</div> : (
              <div className="border border-gray-200 rounded divide-y divide-gray-100">
                {person.tasks.map(t => (
                  <button key={t.key} onClick={() => onTicket(t.key)} className="w-full text-left px-3 py-2 hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-gray-500 shrink-0">{t.key}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 shrink-0">{t.status}</span>
                      <span className={`ml-auto text-[11px] tabular-nums shrink-0 ${t.overdue ? 'text-red-700 font-medium' : 'text-gray-500'}`}>{fmtDue(t.due)}</span>
                    </div>
                    <div className="text-[13px] text-gray-800 truncate">{t.title}</div>
                    {t.project && <div className="text-[11px] text-gray-500 truncate">{t.project} · {t.hours} h</div>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────
const COLS = [
  ['name', 'Person'], ['loadPct', 'Workload this week'], ['open', 'Open'], ['inProgress', 'In progress'], ['review', 'In review'],
  ['overdue', 'Overdue'], ['dueWeek', 'Due 7 days'], ['toReview', 'To review'], ['doneWeek', 'Done 7 days'], ['hoursWeek', 'Hours 7 days']
];

const ITTeamsPage = ({ department }) => {
  const navigate = useNavigate();
  const { designation, username } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('people');
  const [dept, setDept] = useState('All');
  const [teamFilter, setTeamFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState({ key: 'loadPct', dir: 'desc' });
  const [person, setPerson] = useState(null);
  const [editing, setEditing] = useState(null); // team | 'new'
  const [quick, setQuick] = useState('');       // working | overdue | review

  const load = useCallback(() => {
    api('/team-overview').then(d => { setData(d); setError(''); }).catch(e => setError(e.message));
  }, []);
  useEffect(() => { load(); }, [load]);
  useLiveRefresh(['work'], () => load());
  // Keep "working now" and counts fresh.
  useEffect(() => { const t = setInterval(load, 60000); return () => clearInterval(t); }, [load]);
  useEffect(() => {
    if (department && data?.departments?.includes(department)) setDept(department);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [department, data?.departments?.length]);

  const openTicket = (key) => navigate(`/${['it', 'marketing'].includes(window.location.pathname.split('/')[1]) ? window.location.pathname.split('/')[1] : 'it'}/${designation || 'user'}/${username || 'me'}/kanban?ticketKey=${encodeURIComponent(key)}`);

  const people = useMemo(() => {
    if (!data) return [];
    let list = data.people;
    if (dept !== 'All') list = list.filter(p => p.department === dept);
    if (teamFilter) list = list.filter(p => p.teams.some(t => String(t.id) === String(teamFilter)));
    if (levelFilter) list = list.filter(p => p.level === levelFilter);
    if (quick === 'working') list = list.filter(p => p.working);
    if (quick === 'overdue') list = list.filter(p => p.overdue > 0);
    if (quick === 'review') list = list.filter(p => p.toReview > 0);
    const term = search.trim().toLowerCase();
    if (term) list = list.filter(p => `${p.name} ${p.title} ${p.email} ${p.department} ${p.teams.map(t => t.name).join(' ')}`.toLowerCase().includes(term));
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => (sort.key === 'name' ? a.name.localeCompare(b.name) * dir : ((a[sort.key] || 0) - (b[sort.key] || 0)) * dir || a.name.localeCompare(b.name)));
  }, [data, dept, teamFilter, levelFilter, quick, search, sort]);

  const scope = useMemo(() => (data ? (dept === 'All' ? data.people : data.people.filter(p => p.department === dept)) : []), [data, dept]);
  const sum = (k) => scope.reduce((s, p) => s + (p[k] || 0), 0);
  const levelCounts = useMemo(() => Object.fromEntries(Object.keys(LEVELS).map(l => [l, scope.filter(p => p.level === l).length])), [scope]);

  const removeTeam = async (t) => {
    const ok = await Swal.fire({ icon: 'warning', title: `Delete ${t.name}?`, text: 'Members stay in the system; only the team is removed.', showCancelButton: true, confirmButtonText: 'Delete', confirmButtonColor: '#dc2626' });
    if (!ok.isConfirmed) return;
    try { await api(`/teams/${t.id}`, { method: 'DELETE' }); showSuccessToast('Team deleted'); load(); } catch (e) { showErrorToast(e.message); }
  };

  if (!data) {
    return <div className="min-h-[60vh] flex items-center justify-center text-sm text-gray-500 gap-2">{error ? <span className="text-red-700">{error}</span> : <><Loader2 size={16} className="animate-spin" /> Loading team…</>}</div>;
  }

  const teams = data.teams.filter(t => dept === 'All' || t.department === dept || t.members.some(m => scope.some(p => p.id === m.userId)));
  const SortHead = ({ k, children }) => (
    <th className={`py-2.5 px-3 font-medium whitespace-nowrap ${k === 'name' || k === 'loadPct' ? 'text-left' : 'text-right'}`}>
      <button onClick={() => setSort(s => ({ key: k, dir: s.key === k && s.dir === 'desc' ? 'asc' : 'desc' }))} className="inline-flex items-center gap-0.5 hover:text-gray-900 cursor-pointer">
        {children}{sort.key === k && (sort.dir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />)}
      </button>
    </th>
  );

  return (
    <div className="p-5 bg-[#F8FAFC] min-h-screen font-sans text-gray-900">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h1 className="text-[20px] font-semibold">Team</h1>
          <p className="text-[12px] text-gray-500 mt-0.5">Who is working on what, how full each person's week is, and how teams are set up. A working week here is {data.capacity} h.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded p-0.5">
            {['All', ...data.departments].map(d => (
              <button key={d} onClick={() => setDept(d)} className={`px-2.5 h-7 text-xs font-medium rounded cursor-pointer ${dept === d ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{d === 'All' ? 'Everyone' : d}</button>
            ))}
          </div>
          {data.canManage && <button onClick={() => setEditing('new')} className="h-8 px-3 rounded bg-red-600 text-white text-[13px] font-medium hover:bg-red-700 flex items-center gap-1.5 cursor-pointer"><Plus size={14} /> New team</button>}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3 mb-4">
        <Tile icon={Users} label="People" value={scope.length} hint={`${data.teams.length} team${data.teams.length === 1 ? '' : 's'}`} />
        <Tile icon={PlayCircle} tone="text-emerald-600" label="Working now" value={scope.filter(p => p.working).length} hint="Timer running" onClick={() => setQuick(q => (q === 'working' ? '' : 'working'))} active={quick === 'working'} />
        <Tile icon={Briefcase} tone="text-blue-600" label="Open tasks" value={sum('open')} hint={`${sum('inProgress')} in progress`} />
        <Tile icon={AlertTriangle} tone="text-red-600" label="Overdue" value={sum('overdue')} hint={`${scope.filter(p => p.overdue).length} people`} onClick={() => setQuick(q => (q === 'overdue' ? '' : 'overdue'))} active={quick === 'overdue'} />
        <Tile icon={Eye} tone="text-purple-600" label="Waiting for review" value={sum('toReview')} hint="With reporting managers" onClick={() => setQuick(q => (q === 'review' ? '' : 'review'))} active={quick === 'review'} />
        <Tile icon={CheckCircle2} tone="text-emerald-600" label="Done 7 days" value={sum('doneWeek')} />
        <Tile icon={Timer} label="Hours 7 days" value={Math.round(sum('hoursWeek') * 10) / 10} hint="Time logged" />
        <Tile icon={UserX} tone="text-amber-600" label="Unassigned" value={data.unassigned.open} hint={`${data.unassigned.overdue} overdue · nobody picked up`} />
      </div>

      {/* Workload distribution */}
      <div className="bg-white border border-gray-200 rounded p-3 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5"><Activity size={13} /> Workload this week</span>
          {levelFilter && <button onClick={() => setLevelFilter('')} className="text-[11px] text-blue-600 hover:underline cursor-pointer">Show everyone</button>}
        </div>
        <div className="flex h-3 rounded overflow-hidden bg-gray-100">
          {Object.entries(LEVELS).map(([k, L]) => levelCounts[k] ? <div key={k} className={`${L.bar} border-r-2 border-white last:border-r-0`} style={{ width: `${(levelCounts[k] / Math.max(1, scope.length)) * 100}%` }} title={`${L.label}: ${levelCounts[k]}`} /> : null)}
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {Object.entries(LEVELS).map(([k, L]) => (
            <button key={k} onClick={() => { setLevelFilter(levelFilter === k ? '' : k); setTab('people'); }} title={L.hint}
              className={`text-[11px] px-2 py-1 rounded ring-1 ring-inset flex items-center gap-1.5 cursor-pointer ${levelFilter === k ? 'ring-2 ring-blue-400' : ''} ${L.chip}`}>
              <span className={`w-2 h-2 rounded ${L.bar}`} /> {L.label} <strong className="tabular-nums">{levelCounts[k]}</strong>
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex gap-1 border-b border-gray-200">
          {[['people', `People (${people.length})`], ['teams', `Teams (${teams.length})`]].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`px-3 py-2 text-[13px] font-medium -mb-px border-b-2 cursor-pointer ${tab === k ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>{l}</button>
          ))}
        </div>
        {tab === 'people' && (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {data.teams.length > 0 && (
              <select value={teamFilter} onChange={e => setTeamFilter(e.target.value)} className="h-8 text-xs border border-gray-300 rounded px-2 bg-white">
                <option value="">All teams</option>
                {data.teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            )}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search people" className="h-8 w-56 pl-8 pr-2 text-xs border border-gray-300 rounded outline-none focus:border-blue-500 bg-white" />
            </div>
          </div>
        )}
      </div>

      {tab === 'people' ? (
        <div className="bg-white border border-gray-200 rounded overflow-x-auto">
          <table className="w-full text-[13px] min-w-[1100px]">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 text-xs">
              <tr>{COLS.map(([k, l]) => <SortHead key={k} k={k}>{l}</SortHead>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {people.length === 0 && <tr><td colSpan={COLS.length} className="py-10 text-center text-sm text-gray-500">No one matches these filters.</td></tr>}
              {people.map(p => (
                <tr key={p.id} onClick={() => setPerson(p)} className="hover:bg-blue-50/40 cursor-pointer">
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2.5">
                      <span className="relative">
                        <Avatar name={p.name} id={p.id} />
                        {p.working && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded bg-emerald-500 border-2 border-white" title={`Working on ${p.working.key}`} />}
                      </span>
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 truncate flex items-center gap-1">{p.name}{p.isManager && <Crown size={11} className="text-amber-500" title="Manager" />}</div>
                        <div className="text-[11px] text-gray-500 truncate max-w-[240px]">
                          {p.working ? <span className="text-emerald-700">Working on {p.working.key} · {sinceText(p.working.since)}</span> : [p.title, p.department, ...p.teams.map(t => t.name)].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3"><LoadBar pct={p.loadPct} level={p.level} hours={p.loadHours} capacity={data.capacity} /></td>
                  {['open', 'inProgress', 'review', 'overdue', 'dueWeek', 'toReview', 'doneWeek', 'hoursWeek'].map(k => (
                    <td key={k} className={`py-2.5 px-3 text-right tabular-nums ${!p[k] ? 'text-gray-300' : k === 'overdue' ? 'text-red-700 font-semibold' : k === 'toReview' ? 'text-purple-700 font-medium' : 'text-gray-800'}`}>{p[k] || 0}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        teams.length === 0 ? (
          <div className="py-14 text-center bg-white border border-gray-200 rounded">
            <div className="text-sm text-gray-600">No teams yet.</div>
            {data.canManage && <button onClick={() => setEditing('new')} className="mt-3 h-8 px-3 text-xs font-medium rounded bg-red-600 text-white hover:bg-red-700 cursor-pointer">Create the first team</button>}
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-3">
            {teams.map(t => (
              <div key={t.id} className="bg-white border border-gray-200 rounded p-4 flex flex-col">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-semibold text-gray-900 truncate">{t.name}</div>
                    <div className="text-[11px] text-gray-500 truncate">{[t.department, t.description].filter(Boolean).join(' · ') || 'No description'}</div>
                  </div>
                  {data.canManage && (
                    <div className="flex gap-1">
                      <button onClick={() => setEditing(t)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 cursor-pointer" title="Edit team"><Pencil size={14} /></button>
                      <button onClick={() => removeTeam(t)} className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600 cursor-pointer" title="Delete team"><Trash2 size={14} /></button>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-2 text-[12px]">
                  {t.manager ? <><Avatar name={t.manager.name} id={t.manager.id} size="w-6 h-6" text="text-[9px]" /><span className="text-gray-800">{t.manager.name}</span><span className="text-gray-400">· {t.managerRole || 'Lead'}</span></>
                    : <span className="text-gray-400">No team lead</span>}
                </div>
                <div className="mt-3">
                  <div className="text-[11px] text-gray-500 mb-1">Team workload</div>
                  <LoadBar pct={t.stats.loadPct} level={t.stats.loadPct > 100 ? 'overloaded' : t.stats.loadPct >= 80 ? 'busy' : t.stats.loadPct >= 40 ? 'balanced' : t.stats.people ? 'light' : 'idle'} hours={Math.round(t.stats.loadPct * data.capacity * t.stats.people / 100)} capacity={data.capacity * t.stats.people} />
                </div>
                <div className="grid grid-cols-4 gap-1.5 mt-3 text-center">
                  {[['Open', t.stats.open], ['Overdue', t.stats.overdue], ['Review', t.stats.review], ['Done 7d', t.stats.doneWeek]].map(([l, v]) => (
                    <div key={l} className="rounded bg-gray-50 py-1.5"><div className={`text-[14px] font-semibold tabular-nums ${l === 'Overdue' && v ? 'text-red-700' : ''}`}>{v}</div><div className="text-[10px] text-gray-500">{l}</div></div>
                  ))}
                </div>
                <div className="mt-3">
                  <div className="text-[11px] text-gray-500 mb-1">Members ({t.members.length})</div>
                  {t.members.length === 0 ? <div className="text-[12px] text-gray-400">No members yet{data.canManage ? ' — use Edit to add people' : ''}.</div> : (
                    <div className="space-y-1">
                      {t.members.map(m => (
                        <button key={m.userId} onClick={() => setPerson(data.people.find(p => p.id === m.userId))} className="w-full flex items-center gap-2 text-left hover:bg-gray-50 rounded px-1 py-0.5 cursor-pointer">
                          <Avatar name={m.name} id={m.userId} size="w-6 h-6" text="text-[9px]" />
                          <span className="text-[12px] text-gray-800 truncate flex-1">{m.name}<span className="text-gray-400"> · {m.role || 'Member'}</span></span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ring-1 ring-inset ${LEVELS[m.level]?.chip}`}>{m.loadPct}%</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="text-[11px] text-gray-500 mb-1 flex items-center gap-1"><Folder size={11} /> Projects ({t.projects.length})</div>
                  <div className="flex flex-wrap gap-1">
                    {t.projects.length === 0 ? <span className="text-[12px] text-gray-400">None</span> : t.projects.map(p => <span key={p.id} className="text-[11px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">{p.name}</span>)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      <p className="text-[11px] text-gray-500 mt-3 flex items-center gap-1"><Clock size={11} /> Workload = planned hours of open work that is overdue or due in the next 7 days (tasks without a plan count at their standard size), against a {data.capacity} h week. Work in review or on hold is not counted.</p>

      {person && <PersonPanel person={person} capacity={data.capacity} onClose={() => setPerson(null)} onTicket={openTicket} />}
      {editing && <TeamModal team={editing === 'new' ? null : editing} data={data} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
};

export default ITTeamsPage;

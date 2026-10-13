import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Search, Users, UserCheck, UserX, CalendarOff, AlertTriangle, Download, X, Loader2, Mail, Phone, MapPin, Briefcase, TrendingUp, ChevronUp, ChevronDown } from 'lucide-react';
import { API_BASE_URL } from '../../config/environment';
import useLiveRefresh from '../../hooks/useLiveRefresh';

const api = async (path, opts = {}) => {
  const res = await fetch(`${API_BASE_URL}/hr/employees${path}`, {
    credentials: 'include', ...opts,
    headers: { ...(opts.body ? { 'Content-Type': 'application/json' } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
};
const initials = (n) => String(n || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
const PALETTE = ['bg-blue-100 text-blue-800', 'bg-emerald-100 text-emerald-800', 'bg-violet-100 text-violet-800', 'bg-amber-100 text-amber-800', 'bg-rose-100 text-rose-800', 'bg-cyan-100 text-cyan-800'];
const tint = (id) => PALETTE[Number(id) % PALETTE.length];
const date = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const seen = (d) => {
  if (!d) return 'Never';
  const m = Math.floor((Date.now() - new Date(d)) / 60000);
  if (m < 2) return 'Online now';
  if (m < 60) return `${m} min ago`;
  if (m < 1440) return `${Math.floor(m / 60)} h ago`;
  const days = Math.floor(m / 1440);
  return days === 1 ? 'Yesterday' : days < 30 ? `${days} days ago` : date(d);
};
const field = 'w-full h-9 border border-gray-300 rounded px-3 text-sm outline-none focus:border-blue-500 bg-white';

const Avatar = ({ e, size = 'w-9 h-9 text-xs' }) => (e.avatar && /^https?:|^\//.test(e.avatar)
  ? <img src={e.avatar} alt="" className={`${size} rounded-full object-cover`} />
  : <span className={`${size} rounded-full flex items-center justify-center font-medium shrink-0 ${tint(e.id)}`}>{initials(e.name)}</span>);

const Tile = ({ icon: Icon, label, value, tone = 'text-gray-900', active, onClick }) => (
  <button type="button" onClick={onClick} className={`text-left bg-white border rounded-lg p-3.5 cursor-pointer transition ${active ? 'border-blue-500 ring-1 ring-blue-200' : 'border-gray-200 hover:border-gray-300'}`}>
    <div className="flex items-center gap-1.5 text-xs text-gray-500"><Icon size={13} />{label}</div>
    <div className={`text-2xl font-semibold mt-1 tabular-nums ${tone}`}>{value}</div>
  </button>
);

function Drawer({ emp, meta, onClose, onSaved, goPerformance }) {
  const [f, setF] = useState({ department: emp.rawDepartment || '', role_id: emp.role_id || '', job_title: emp.job_title || '', department_role: emp.department_role || 'Executive', phone: emp.phone || '', location: emp.location || '', status: emp.status });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const save = async () => {
    setBusy(true); setErr('');
    try { await api(`/${emp.id}`, { method: 'PUT', body: { ...f, role_id: f.role_id ? Number(f.role_id) : undefined } }); onSaved(); }
    catch (e) { setErr(e.message); setBusy(false); }
  };
  const row = (Icon, v) => v ? <div className="flex items-center gap-2 text-sm text-gray-700"><Icon size={14} className="text-gray-400 shrink-0" /><span className="truncate">{v}</span></div> : null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={e => e.target === e.currentTarget && onClose()}>
      <aside className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
        <div className="px-5 py-4 border-b border-gray-200 flex items-start gap-3">
          <Avatar e={emp} size="w-12 h-12 text-sm" />
          <div className="min-w-0 flex-1"><h2 className="font-semibold text-gray-900 truncate">{emp.name}</h2><p className="text-xs text-gray-500 truncate">{[emp.job_title || emp.role, emp.department].filter(Boolean).join(' · ')}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <span className={`text-[11px] px-2 py-0.5 rounded border ${emp.status === 'Active' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>{emp.status}</span>
              {emp.onLeave && <span className="text-[11px] px-2 py-0.5 rounded border bg-orange-50 text-orange-800 border-orange-200">On {emp.onLeave.type.toLowerCase()} leave until {date(emp.onLeave.until)}</span>}
            </div></div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 cursor-pointer"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-5 flex-1">
          <div className="space-y-1.5">{row(Mail, emp.email)}{row(Phone, emp.phone)}{row(MapPin, emp.location)}{row(Briefcase, `Joined ${date(emp.joined)} · last seen ${seen(emp.lastSeen)}`)}</div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="border border-gray-200 rounded p-2"><div className="text-lg font-semibold tabular-nums">{emp.work.open}</div><div className="text-[11px] text-gray-500">Open tasks</div></div>
            <div className="border border-gray-200 rounded p-2"><div className={`text-lg font-semibold tabular-nums ${emp.work.overdue ? 'text-red-600' : ''}`}>{emp.work.overdue}</div><div className="text-[11px] text-gray-500">Overdue</div></div>
            <button onClick={goPerformance} className="border border-gray-200 rounded p-2 hover:border-blue-300 cursor-pointer"><TrendingUp size={18} className="mx-auto text-blue-600" /><div className="text-[11px] text-gray-500 mt-0.5">Performance</div></button>
          </div>
          {emp.issues.length > 0 && <div className="text-xs bg-amber-50 border border-amber-200 text-amber-900 rounded p-2.5 space-y-0.5">{emp.issues.map(i => <div key={i} className="flex gap-1.5"><AlertTriangle size={12} className="mt-0.5 shrink-0" />{i}</div>)}</div>}

          <div className="space-y-3 border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-gray-900">Edit details</h3>
            {err && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{err}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Department</label>
                <select className={field} value={f.department} onChange={e => set('department', e.target.value)}><option value="">None</option>{meta.departments.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
                <select className={field} value={f.role_id} onChange={e => set('role_id', e.target.value)}><option value="">—</option>{meta.roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Level</label>
                <select className={field} value={f.department_role} onChange={e => set('department_role', e.target.value)}>{meta.departmentRoles.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Job title</label><input className={field} value={f.job_title} onChange={e => set('job_title', e.target.value)} /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Phone</label><input className={field} value={f.phone} onChange={e => set('phone', e.target.value)} /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Location</label><input className={field} value={f.location} onChange={e => set('location', e.target.value)} /></div>
            </div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Account</label>
              <div className="flex gap-2">{['Active', 'Inactive'].map(s => <button key={s} type="button" onClick={() => set('status', s)} className={`h-9 px-4 text-sm rounded border cursor-pointer ${f.status === s ? (s === 'Active' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-gray-700 text-white border-gray-700') : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}>{s}</button>)}</div>
              {f.status === 'Inactive' && emp.status === 'Active' && <p className="text-[11px] text-gray-500 mt-1">An inactive person cannot sign in. Their tasks and history stay.</p>}</div>
          </div>
        </div>
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
          <button onClick={onClose} className="h-9 px-3 text-sm border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-pointer">Close</button>
          <button onClick={save} disabled={busy} className="h-9 px-4 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer">{busy && <Loader2 size={14} className="animate-spin" />}Save changes</button>
        </div>
      </aside>
    </div>
  );
}

export default function HREmployees() {
  const { designation, username } = useParams();
  const navigate = useNavigate();
  const [list, setList] = useState(null);
  const [meta, setMeta] = useState({ roles: [], departments: [], departmentRoles: [] });
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [dept, setDept] = useState('');
  const [role, setRole] = useState('');
  const [quick, setQuick] = useState('');
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' });
  const [openId, setOpenId] = useState(null);
  const [flash, setFlash] = useState('');

  const load = useCallback(async () => {
    try { const d = await api(''); setList(d.employees); setError(''); } catch (e) { setError(e.message); }
  }, []);
  useEffect(() => { load(); api('/meta').then(setMeta).catch(() => { }); }, [load]);
  useLiveRefresh(['users', 'leaves', 'hr'], () => load());
  useEffect(() => { if (!flash) return undefined; const t = setTimeout(() => setFlash(''), 4000); return () => clearTimeout(t); }, [flash]);

  const all = useMemo(() => list || [], [list]);
  const depts = useMemo(() => [...new Set(all.map(e => e.department))].sort(), [all]);
  const roles = useMemo(() => [...new Set(all.map(e => e.role).filter(Boolean))].sort(), [all]);
  const counts = useMemo(() => ({
    total: all.length, active: all.filter(e => e.status === 'Active').length, inactive: all.filter(e => e.status !== 'Active').length,
    leave: all.filter(e => e.onLeave).length, issues: all.filter(e => e.issues.length).length
  }), [all]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = all.filter(e =>
      (!dept || e.department === dept) && (!role || e.role === role) &&
      (quick === '' || (quick === 'active' && e.status === 'Active') || (quick === 'inactive' && e.status !== 'Active') || (quick === 'leave' && e.onLeave) || (quick === 'issues' && e.issues.length)) &&
      (!needle || `${e.name} ${e.email} ${e.department} ${e.role} ${e.job_title || ''}`.toLowerCase().includes(needle)));
    const val = { name: e => e.name.toLowerCase(), department: e => e.department.toLowerCase(), role: e => e.role.toLowerCase(), joined: e => new Date(e.joined || 0).getTime(), seen: e => new Date(e.lastSeen || 0).getTime(), tasks: e => e.work.open }[sort.key];
    out.sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * (sort.dir === 'asc' ? 1 : -1));
    return out;
  }, [all, q, dept, role, quick, sort]);

  const head = (key, label, cls = '') => (
    <th className={`py-2.5 px-3 font-medium ${cls}`}>
      <button onClick={() => setSort(s => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))} className="inline-flex items-center gap-1 cursor-pointer hover:text-gray-900">
        {label}{sort.key === key && (sort.dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
      </button>
    </th>
  );
  const exportCsv = () => {
    const esc = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
    const csv = [['Name', 'Email', 'Phone', 'Department', 'Role', 'Job title', 'Status', 'Joined', 'Open tasks'], ...rows.map(e => [e.name, e.email, e.phone, e.department, e.role, e.job_title, e.status, date(e.joined), e.work.open])].map(r => r.map(esc).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'employees.csv'; a.click();
  };
  const emp = all.find(e => e.id === openId);

  if (!list && !error) return <div className="p-10 flex justify-center gap-2 text-sm text-gray-500"><Loader2 size={16} className="animate-spin" /> Loading employees…</div>;
  if (error && !list) return <div className="p-6"><div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">{error}</div></div>;

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2"><Users size={20} /> Employees</h1><p className="text-sm text-gray-500 mt-0.5">Everyone in the company, with their role, department and what they are working on.</p></div>
        <button onClick={exportCsv} className="h-9 px-3 text-sm border border-gray-300 rounded bg-white hover:bg-gray-50 inline-flex items-center gap-1.5 cursor-pointer"><Download size={14} /> Export {rows.length}</button>
      </div>
      {flash && <div className="text-sm bg-emerald-50 border border-emerald-200 text-emerald-800 rounded px-3 py-2">{flash}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Tile icon={Users} label="All" value={counts.total} active={quick === ''} onClick={() => setQuick('')} />
        <Tile icon={UserCheck} label="Active" value={counts.active} tone="text-emerald-700" active={quick === 'active'} onClick={() => setQuick(quick === 'active' ? '' : 'active')} />
        <Tile icon={UserX} label="Inactive" value={counts.inactive} active={quick === 'inactive'} onClick={() => setQuick(quick === 'inactive' ? '' : 'inactive')} />
        <Tile icon={CalendarOff} label="On leave today" value={counts.leave} tone="text-orange-600" active={quick === 'leave'} onClick={() => setQuick(quick === 'leave' ? '' : 'leave')} />
        <Tile icon={AlertTriangle} label="Records to fix" value={counts.issues} tone={counts.issues ? 'text-amber-600' : 'text-gray-900'} active={quick === 'issues'} onClick={() => setQuick(quick === 'issues' ? '' : 'issues')} />
      </div>

      <div className="flex  gap-2">
        <div className="relative flex-1 min-w-[220px]"><Search size={14} className="absolute left-3 top-2.5 text-gray-400" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name, email, department or role" className={`${field} pl-9`} /></div>
        <select className={`${field} w-48`} value={dept} onChange={e => setDept(e.target.value)}><option value="">All departments</option>{depts.map(d => <option key={d}>{d}</option>)}</select>
        <select className={`${field} w-48`} value={role} onChange={e => setRole(e.target.value)}><option value="">All roles</option>{roles.map(r => <option key={r}>{r}</option>)}</select>
        {(q || dept || role || quick) && <button onClick={() => { setQ(''); setDept(''); setRole(''); setQuick(''); }} className="h-9 px-3 text-sm text-blue-600 hover:underline cursor-pointer">Clear</button>}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-[860px]">
          <thead className="bg-gray-50 text-xs text-gray-500 text-left"><tr>
            {head('name', 'Employee')}{head('department', 'Department')}{head('role', 'Role')}
            <th className="py-2.5 px-3 font-medium">Status</th>{head('tasks', 'Open tasks', 'text-right')}{head('joined', 'Joined')}{head('seen', 'Last seen')}
          </tr></thead>
          <tbody>
            {rows.map(e => (
              <tr key={e.id} onClick={() => setOpenId(e.id)} className="border-t border-gray-100 hover:bg-blue-50/40 cursor-pointer">
                <td className="py-2.5 px-3"><div className="flex items-center gap-2.5"><Avatar e={e} /><div className="min-w-0"><div className="text-gray-900 truncate flex items-center gap-1.5">{e.name}{e.issues.length > 0 && <AlertTriangle size={12} className="text-amber-500 shrink-0" title={e.issues.join(', ')} />}</div><div className="text-[11px] text-gray-500 truncate">{e.email}</div></div></div></td>
                <td className="py-2.5 px-3 text-gray-700">{e.department}</td>
                <td className="py-2.5 px-3 text-gray-700"><div>{e.role || '—'}</div>{e.job_title && <div className="text-[11px] text-gray-400">{e.job_title}</div>}</td>
                <td className="py-2.5 px-3">{e.onLeave ? <span className="text-[11px] px-2 py-0.5 rounded border bg-orange-50 text-orange-800 border-orange-200">On leave</span> : <span className={`text-[11px] px-2 py-0.5 rounded border ${e.status === 'Active' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>{e.status}</span>}</td>
                <td className="py-2.5 px-3 text-right tabular-nums">{e.work.open}{e.work.overdue > 0 && <span className="text-red-600 text-xs"> · {e.work.overdue} late</span>}</td>
                <td className="py-2.5 px-3 text-gray-600 whitespace-nowrap">{date(e.joined)}</td>
                <td className="py-2.5 px-3 text-gray-600 whitespace-nowrap">{seen(e.lastSeen)}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="py-12 text-center text-sm text-gray-500">No employee matches these filters.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-gray-500">{rows.length} of {all.length} shown · click a person to see details and edit. Email and password are not changed here.</p>

      {emp && <Drawer key={emp.id} emp={emp} meta={meta} onClose={() => setOpenId(null)} onSaved={() => { setOpenId(null); setFlash('Saved.'); load(); }} goPerformance={() => navigate(`/hr/${designation}/${username}/performance`)} />}
    </div>
  );
}

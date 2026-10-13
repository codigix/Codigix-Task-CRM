import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarOff, Plus, Check, X, Loader2, Users, Clock, CheckCircle2, AlertCircle, Ban } from 'lucide-react';
import { API_BASE_URL } from '../../config/environment';
import useLiveRefresh from '../../hooks/useLiveRefresh';

const api = async (path, opts = {}) => {
  const res = await fetch(`${API_BASE_URL}/leaves${path}`, {
    credentials: 'include', ...opts,
    headers: { ...(opts.body ? { 'Content-Type': 'application/json' } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
};
const STATUS = {
  Pending: 'bg-amber-50 text-amber-800 border-amber-200',
  Approved: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  Rejected: 'bg-red-50 text-red-700 border-red-200',
  Cancelled: 'bg-gray-100 text-gray-500 border-gray-200'
};
const TYPE_DOT = { Casual: 'bg-blue-500', Sick: 'bg-rose-500', Earned: 'bg-emerald-500', Unpaid: 'bg-gray-400' };
const fmt = (d) => new Date(`${d}T12:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
const span = (l) => (l.start_date === l.end_date ? fmt(l.start_date) : `${fmt(l.start_date)} – ${fmt(l.end_date)}`);
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const initials = (n) => String(n || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
const input = 'w-full h-9 border border-gray-300 rounded px-3 text-sm outline-none focus:border-blue-500 bg-white';

function ApplyModal({ types, people, isHr, onClose, onDone }) {
  const [f, setF] = useState({ leave_type: 'Casual', start_date: todayStr(), end_date: todayStr(), half_day: false, reason: '', user_id: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const save = async () => {
    if (!f.user_id) { setErr('Choose the employee this leave is for.'); return; }
    setBusy(true); setErr('');
    try { await api('', { method: 'POST', body: { ...f, user_id: f.user_id ? Number(f.user_id) : undefined } }); onDone(); }
    catch (e) { setErr(e.message); setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center"><h2 className="font-semibold text-gray-900">Record leave for an employee</h2><button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none cursor-pointer">×</button></div>
        <div className="p-5 space-y-3">
          {err && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{err}</p>}
          {isHr && (
            <div><label className="block text-xs font-medium text-gray-700 mb-1">For</label>
              <select className={input} value={f.user_id} onChange={e => set('user_id', e.target.value)}>
                <option value="">Choose an employee…</option>{people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {f.user_id && <p className="text-[11px] text-gray-500 mt-1">Leave recorded by HR is approved straight away and the employee is told.</p>}
            </div>
          )}
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
            <div className="grid grid-cols-4 gap-1.5">{types.map(t => <button key={t} type="button" onClick={() => set('leave_type', t)} className={`h-9 text-xs rounded border cursor-pointer ${f.leave_type === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}>{t}</button>)}</div></div>
          <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={f.half_day} onChange={e => set('half_day', e.target.checked)} /> Half day</label>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-gray-700 mb-1">{f.half_day ? 'Date' : 'From'}</label><input type="date" className={input} value={f.start_date} onChange={e => { set('start_date', e.target.value); if (f.end_date < e.target.value) set('end_date', e.target.value); }} /></div>
            {!f.half_day && <div><label className="block text-xs font-medium text-gray-700 mb-1">To</label><input type="date" className={input} min={f.start_date} value={f.end_date} onChange={e => set('end_date', e.target.value)} /></div>}
          </div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Reason{f.user_id ? ' (optional)' : ''}</label><textarea rows={3} className={`${input} h-auto py-2`} value={f.reason} onChange={e => set('reason', e.target.value)} placeholder="A short reason" /></div>
        </div>
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end gap-2">
          <button onClick={onClose} className="h-9 px-3 text-sm border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-pointer">Cancel</button>
          <button onClick={save} disabled={busy} className="h-9 px-4 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer">{busy && <Loader2 size={14} className="animate-spin" />}{f.user_id ? 'Record leave' : 'Send request'}</button>
        </div>
      </div>
    </div>
  );
}

function DecideModal({ leave, onClose, onDone }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const go = async (decision) => {
    setBusy(decision); setErr('');
    try { await api(`/${leave.id}/decision`, { method: 'POST', body: { decision, note } }); onDone(); }
    catch (e) { setErr(e.message); setBusy(''); }
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="px-5 py-4 border-b border-gray-200 flex justify-between"><h2 className="font-semibold text-gray-900">{leave.employee}</h2><button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none cursor-pointer">×</button></div>
        <div className="p-5 space-y-3 text-sm">
          {err && <p className="text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{err}</p>}
          <p className="text-gray-700"><strong>{leave.leave_type}</strong> leave · {span(leave)} · {leave.days} day{leave.days === 1 ? '' : 's'}{leave.half_day ? ' (half day)' : ''}</p>
          {leave.reason && <p className="bg-gray-50 border border-gray-200 rounded p-3 text-gray-700">{leave.reason}</p>}
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Note to the employee (required to reject)</label><textarea rows={2} className={`${input} h-auto py-2`} value={note} onChange={e => setNote(e.target.value)} /></div>
        </div>
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end gap-2">
          <button onClick={() => go('reject')} disabled={!!busy} className="h-9 px-4 text-sm rounded border border-red-300 text-red-700 bg-white hover:bg-red-50 disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer">{busy === 'reject' ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}Reject</button>
          <button onClick={() => go('approve')} disabled={!!busy} className="h-9 px-4 text-sm rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer">{busy === 'approve' ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}Approve</button>
        </div>
      </div>
    </div>
  );
}

// Embedded in the HR dashboard (there is no separate Leaves page). HR and admins only.
export default function LeavesPanel({ onChanged }) {
  const [summary, setSummary] = useState(null);
  const [leaves, setLeaves] = useState(null);
  const [people, setPeople] = useState([]);
  const [apply, setApply] = useState(false);
  const [deciding, setDeciding] = useState(null);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');

  const load = useCallback(async () => {
    try {
      const s = await api('/summary'); setSummary(s);
      const l = await api('?scope=all'); setLeaves(l.leaves); setError('');
    } catch (e) { setError(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useLiveRefresh(['leaves'], () => load());
  useEffect(() => {
    fetch(`${API_BASE_URL}/meetings/users`, { credentials: 'include' }).then(r => r.json()).then(d => setPeople((d.users || []).map(u => ({ id: u.id, name: u.name })))).catch(() => { });
  }, []);
  useEffect(() => { if (!flash) return undefined; const t = setTimeout(() => setFlash(''), 5000); return () => clearTimeout(t); }, [flash]);

  const shown = useMemo(() => { const today = todayStr(); return (leaves || []).filter(l => ['Pending', 'Approved'].includes(l.status) && String(l.end_date).slice(0, 10) >= today).sort((a, b) => String(a.start_date).localeCompare(String(b.start_date))); }, [leaves]);
  const changed = () => { load(); if (onChanged) onChanged(); };
  const cancel = async (l) => {
    if (!window.confirm('Cancel this leave?')) return;
    try { await api(`/${l.id}/cancel`, { method: 'POST' }); setFlash('Leave cancelled.'); changed(); } catch (e) { setError(e.message); }
  };

  if (!summary && !error) return <div className="p-6 flex justify-center text-gray-500 gap-2 text-sm bg-white border border-gray-200 rounded-lg"><Loader2 size={16} className="animate-spin" /> Loading leaves…</div>;
  if (error && !summary) return null;

  return (
    <section className="bg-white border border-gray-200 rounded-lg">
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><CalendarOff size={15} /> Employee leaves</h2>
        <button onClick={() => setApply(true)} className="h-8 px-3 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 inline-flex items-center gap-1.5 cursor-pointer"><Plus size={13} /> Record leave</button>
      </header>
      <div className="p-4 space-y-4">
        {flash && <div className="text-sm bg-emerald-50 border border-emerald-200 text-emerald-800 rounded px-3 py-2 flex items-center gap-2"><CheckCircle2 size={14} />{flash}</div>}
        {error && <div className="text-sm bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2 flex items-center gap-2"><AlertCircle size={14} />{error}</div>}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="border border-gray-100 rounded-lg p-3">
            <div className="text-xs font-semibold text-gray-700 flex items-center gap-1.5 mb-2"><Users size={13} /> Away today ({summary.awayToday.length})</div>
            {summary.awayToday.length === 0 ? <p className="text-xs text-gray-500">Everyone is in today.</p> : (
              <ul className="space-y-1.5">{summary.awayToday.map(a => <li key={a.id} className="flex items-center gap-2 text-sm"><span className="w-7 h-7 rounded-full bg-orange-100 text-orange-800 text-[11px] font-medium flex items-center justify-center">{initials(a.employee)}</span><span className="flex-1 truncate">{a.employee} <span className="text-[11px] text-gray-400">{a.department}</span></span><span className="text-xs text-gray-500">{a.leave_type} · back after {fmt(a.end_date)}</span></li>)}</ul>
            )}
          </div>
          <div className="border border-gray-100 rounded-lg p-3">
            <div className="text-xs font-semibold text-gray-700 flex items-center gap-1.5 mb-2"><Clock size={13} /> Coming up (14 days)</div>
            {summary.upcoming.length === 0 ? <p className="text-xs text-gray-500">No approved leave coming up.</p> : (
              <ul className="space-y-1.5">{summary.upcoming.map(a => <li key={a.id} className="flex items-center gap-2 text-sm"><span className="w-7 h-7 rounded-full bg-blue-100 text-blue-800 text-[11px] font-medium flex items-center justify-center">{initials(a.employee)}</span><span className="flex-1 truncate">{a.employee} <span className="text-[11px] text-gray-400">{a.department}</span></span><span className="text-xs text-gray-500">{a.leave_type} · {span(a)}</span></li>)}</ul>
            )}
          </div>
        </div>


        {!leaves ? <div className="p-6 flex justify-center"><Loader2 className="animate-spin text-gray-400" size={18} /></div> : shown.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500"><Ban size={24} className="mx-auto mb-2 opacity-40" />No leaves today or coming up.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead><tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="py-2 px-3 font-medium">Employee</th><th className="py-2 px-3 font-medium">Type</th><th className="py-2 px-3 font-medium">Dates</th><th className="py-2 px-3 font-medium text-right">Days</th><th className="py-2 px-3 font-medium">Reason</th><th className="py-2 px-3 font-medium">Status</th><th className="py-2 px-3 font-medium text-right">Action</th>
              </tr></thead>
              <tbody>
                {shown.map(l => {
                  const own = Number(l.user_id) === Number(summary.me);
                  return (
                    <tr key={l.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                      <td className="py-2.5 px-3"><div className="flex items-center gap-2"><span className="w-7 h-7 rounded-full bg-gray-100 text-gray-700 text-[11px] font-medium flex items-center justify-center">{initials(l.employee)}</span><div><div className="text-gray-900">{l.employee}</div><div className="text-[11px] text-gray-400">{l.department}</div></div></div></td>
                      <td className="py-2.5 px-3"><span className="inline-flex items-center gap-1.5"><i className={`w-2 h-2 rounded-full ${TYPE_DOT[l.leave_type]}`} />{l.leave_type}</span></td>
                      <td className="py-2.5 px-3 whitespace-nowrap">{span(l)}{l.half_day ? <span className="text-[11px] text-gray-500"> · half day</span> : null}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{l.days}</td>
                      <td className="py-2.5 px-3 text-gray-600 max-w-[240px]"><div className="truncate" title={l.reason || ''}>{l.reason || '—'}</div>{l.decision_note && <div className="text-[11px] text-gray-500 truncate" title={l.decision_note}>{l.decided_by_name}: {l.decision_note}</div>}</td>
                      <td className="py-2.5 px-3"><span className={`inline-block text-[11px] px-2 py-0.5 rounded border ${STATUS[l.status]}`}>{l.status}</span>{l.status !== 'Pending' && l.decided_by_name && <div className="text-[10px] text-gray-400 mt-0.5">by {l.decided_by_name}</div>}</td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        {l.status === 'Pending' && !own && <button onClick={() => setDeciding(l)} className="h-7 px-3 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 cursor-pointer">Review</button>}
                        {l.status === 'Pending' && own && <span className="text-[11px] text-gray-400">needs another approver</span>}
                        {['Pending', 'Approved'].includes(l.status) && <button onClick={() => cancel(l)} className="h-7 px-2.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 ml-1.5 cursor-pointer">Cancel</button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {apply && <ApplyModal types={summary.types} people={people} isHr onClose={() => setApply(false)} onDone={() => { setApply(false); setFlash('Leave recorded and the employee has been told.'); changed(); }} />}
      {deciding && <DecideModal leave={deciding} onClose={() => setDeciding(null)} onDone={() => { setDeciding(null); setFlash('Decision saved. The employee has been told.'); changed(); }} />}
    </section>
  );
}

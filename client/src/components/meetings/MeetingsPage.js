import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { API_BASE_URL } from '../../config/environment';
import {
  Plus, Search, Loader2, Calendar, Video, MapPin, Phone, Clock, Users, CheckCircle2,
  XCircle, FileText, ChevronRight, AlertCircle, Filter
} from 'lucide-react';

// ── helpers ───────────────────────────────────────────────────────────────────
const mApi = async (path, opts = {}) => {
  const res = await fetch(`${API_BASE_URL}/meetings${path}`, {
    ...opts,
    headers: { ...(opts.body ? { 'Content-Type': 'application/json' } : {}), ...(opts.headers || {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
};
const fmtDt = (dt) => {
  if (!dt) return '—';
  const d = new Date(dt);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const inputCls = 'w-full h-9 border border-gray-300 rounded-lg px-3 text-sm outline-none focus:border-blue-500 bg-white';
const labelCls = 'block text-xs font-medium text-gray-700 mb-1';
const btn = {
  primary: 'h-9 px-4 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5',
  ghost: 'h-9 px-3 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer inline-flex items-center gap-1.5',
  danger: 'h-9 px-4 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5',
};
const KIND_ICON = { online: Video, offline: MapPin, call: Phone };
const KIND_LABEL = { online: 'Online', offline: 'In-person', call: 'Call' };
const STATUS_STYLE = {
  Scheduled: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  Completed: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  Cancelled: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200',
};

// ── Modal skeleton ────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, footer, width = 'max-w-lg' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`bg-white rounded-xl shadow-xl w-full ${width} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none cursor-pointer">×</button>
        </div>
        <div className="overflow-y-auto px-5 py-4 flex-1">{children}</div>
        {footer && <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50 rounded-b-xl">{footer}</div>}
      </div>
    </div>
  );
}

// ── Schedule meeting modal ────────────────────────────────────────────────────
function ScheduleModal({ onClose, onCreated }) {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ title: '', kind: 'offline', scheduled_at: '', duration_min: 60, location: '', meet_link: '', agenda: '' });
  const [selected, setSelected] = useState([]); // attendee user objects
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { mApi('/users').then(d => setUsers(d.users || [])).catch(() => {}); }, []);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleAtt = (u) => setSelected(s => s.some(x => x.id === u.id) ? s.filter(x => x.id !== u.id) : [...s, u]);
  const filtered = users.filter(u => !search || `${u.name} ${u.email} ${u.department}`.toLowerCase().includes(search.toLowerCase()));

  const save = async () => {
    if (!form.title.trim()) { setError('Title is required.'); return; }
    if (!form.scheduled_at)  { setError('Date and time are required.'); return; }
    setSaving(true); setError('');
    try {
      const r = await mApi('', { method: 'POST', body: { ...form, duration_min: Number(form.duration_min) || 60, attendees: selected.map(u => ({ id: u.id, name: u.name, email: u.email })) } });
      onCreated(r.id);
    } catch (e) { setError(e.message); setSaving(false); }
  };

  return (
    <Modal title="Schedule meeting" onClose={onClose} width="max-w-2xl"
      footer={<><button onClick={onClose} className={btn.ghost}>Cancel</button><button onClick={save} disabled={saving} className={btn.primary}>{saving && <Loader2 size={14} className="animate-spin" />} Schedule</button></>}>
      <div className="space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div><label className={labelCls}>Meeting title *</label><input value={form.title} onChange={e => set('title', e.target.value)} className={inputCls} placeholder="e.g. Weekly sync, Client review, Project kickoff" /></div>
        <div className="grid grid-cols-3 gap-2">
          {['offline', 'online', 'call'].map(k => {
            const Icon = KIND_ICON[k];
            return (
              <button key={k} type="button" onClick={() => set('kind', k)} className={`flex items-center gap-2 border rounded-lg px-3 py-2.5 text-sm cursor-pointer ${form.kind === k ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200 text-blue-700 font-medium' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                <Icon size={15} /> {KIND_LABEL[k]}
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Date & time *</label><input type="datetime-local" value={form.scheduled_at} onChange={e => set('scheduled_at', e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Duration (minutes)</label><input type="number" value={form.duration_min} onChange={e => set('duration_min', e.target.value)} min={5} max={480} className={inputCls} /></div>
        </div>
        {form.kind === 'online' && <div><label className={labelCls}>Google Meet / Zoom link</label><input value={form.meet_link} onChange={e => set('meet_link', e.target.value)} className={inputCls} placeholder="https://meet.google.com/..." /></div>}
        {form.kind !== 'online' && <div><label className={labelCls}>Location</label><input value={form.location} onChange={e => set('location', e.target.value)} className={inputCls} placeholder="e.g. Conference room 1, Client office, Café" /></div>}
        <div><label className={labelCls}>Agenda (optional)</label><textarea value={form.agenda} onChange={e => set('agenda', e.target.value)} rows={3} className={`${inputCls} h-auto`} placeholder="Points to discuss in this meeting…" /></div>
        <div>
          <label className={labelCls}>Attendees</label>
          {selected.length > 0 && <div className="flex flex-wrap gap-1.5 mb-2">{selected.map(u => <span key={u.id} className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5">{u.name} <button type="button" onClick={() => toggleAtt(u)} className="hover:text-red-600 cursor-pointer">×</button></span>)}</div>}
          <div className="relative mb-1"><Search size={13} className="absolute left-2.5 top-2.5 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} className={`${inputCls} pl-8`} placeholder="Search by name or department" /></div>
          <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto divide-y divide-gray-100">
            {filtered.slice(0, 30).map(u => (
              <button key={u.id} type="button" onClick={() => toggleAtt(u)} className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-gray-50 cursor-pointer ${selected.some(x => x.id === u.id) ? 'bg-blue-50' : ''}`}>
                <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${selected.some(x => x.id === u.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>{selected.some(x => x.id === u.id) && <svg viewBox="0 0 10 8" className="w-2.5 h-2 fill-white"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" fill="none"/></svg>}</div>
                <div className="min-w-0"><div className="font-medium text-gray-900 truncate">{u.name}</div><div className="text-xs text-gray-500 truncate">{u.department}{u.designation ? ` · ${u.designation}` : ''}</div></div>
              </button>
            ))}
            {!filtered.length && <p className="text-xs text-gray-500 p-3 text-center">No users found.</p>}
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ── MOM modal ─────────────────────────────────────────────────────────────────
function MomModal({ meeting, attendees, onClose, onDone }) {
  const [form, setForm] = useState({ mom: '', decisions: '', attended: attendees.map(a => a.user_id), actionItems: [] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleAttended = (uid) => setForm(f => ({
    ...f, attended: f.attended.includes(uid) ? f.attended.filter(x => x !== uid) : [...f.attended, uid]
  }));
  const addAction = () => setForm(f => ({ ...f, actionItems: [...f.actionItems, { title: '', assignedTo: '', dueDate: '' }] }));
  const setAction = (i, k, v) => setForm(f => { const a = [...f.actionItems]; a[i] = { ...a[i], [k]: v }; return { ...f, actionItems: a }; });
  const removeAction = (i) => setForm(f => ({ ...f, actionItems: f.actionItems.filter((_, j) => j !== i) }));

  const save = async () => {
    if (!form.mom.trim()) { setError('Discussion summary (MOM) is required.'); return; }
    setSaving(true); setError('');
    try {
      await mApi(`/${meeting.id}/mom`, { method: 'POST', body: { mom: form.mom, decisions: form.decisions, attended: form.attended, actionItems: form.actionItems.filter(a => a.title.trim()) } });
      onDone();
    } catch (e) { setError(e.message); setSaving(false); }
  };

  return (
    <Modal title="Add Minutes of Meeting (MOM)" onClose={onClose} width="max-w-2xl"
      footer={<><button onClick={onClose} className={btn.ghost}>Cancel</button><button onClick={save} disabled={saving} className={btn.primary}>{saving && <Loader2 size={14} className="animate-spin" />} Submit MOM &amp; Complete</button></>}>
      <div className="space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800 flex items-start gap-2"><AlertCircle size={13} className="flex-shrink-0 mt-0.5" /> Submitting MOM will mark this meeting as <strong>Completed</strong> and close the linked task.</div>
        <div><label className={labelCls}>Discussion summary *</label><textarea value={form.mom} onChange={e => set('mom', e.target.value)} rows={5} className={`${inputCls} h-auto`} placeholder="What was discussed? Key points from the meeting…" /></div>
        <div><label className={labelCls}>Decisions taken</label><textarea value={form.decisions} onChange={e => set('decisions', e.target.value)} rows={3} className={`${inputCls} h-auto`} placeholder="What was decided? Any approvals, agreements, conclusions…" /></div>
        {attendees.length > 0 && (
          <div>
            <label className={labelCls}>Who attended?</label>
            <div className="flex flex-wrap gap-2">
              {attendees.map(a => (
                <button key={a.user_id} type="button" onClick={() => toggleAttended(a.user_id)} className={`flex items-center gap-1.5 text-xs rounded-full px-3 py-1 border cursor-pointer ${form.attended.includes(a.user_id) ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                  {form.attended.includes(a.user_id) && <CheckCircle2 size={11} />}{a.name}
                </button>
              ))}
            </div>
          </div>
        )}
        <div>
          <div className="flex items-center justify-between mb-2"><label className={labelCls + ' mb-0'}>Action items</label><button type="button" onClick={addAction} className="text-xs text-blue-600 hover:underline cursor-pointer">+ Add item</button></div>
          {form.actionItems.length === 0 && <p className="text-xs text-gray-400 mb-1">No action items yet. Add tasks that came out of this meeting.</p>}
          <div className="space-y-2">
            {form.actionItems.map((a, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-start bg-gray-50 rounded-lg p-2">
                <input value={a.title} onChange={e => setAction(i, 'title', e.target.value)} placeholder="What needs to be done" className={`${inputCls} col-span-5`} />
                <select value={a.assignedTo} onChange={e => setAction(i, 'assignedTo', e.target.value)} className={`${inputCls} col-span-4`}>
                  <option value="">Assign to…</option>
                  {attendees.map(u => <option key={u.user_id} value={u.user_id}>{u.name}</option>)}
                </select>
                <input type="date" value={a.dueDate} onChange={e => setAction(i, 'dueDate', e.target.value)} className={`${inputCls} col-span-2`} />
                <button type="button" onClick={() => removeAction(i)} className="col-span-1 text-gray-400 hover:text-red-600 cursor-pointer mt-1.5 flex justify-center"><XCircle size={15} /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ── Meeting card ──────────────────────────────────────────────────────────────
function MeetingCard({ m, onClick }) {
  const Icon = KIND_ICON[m.kind] || Calendar;
  const now = new Date();
  const dt  = new Date(m.scheduled_at);
  const isPast = dt < now;
  const needsMom = m.status === 'Scheduled' && isPast;
  return (
    <div onClick={onClick} className={`bg-white border rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow ${needsMom ? 'border-amber-300' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${m.kind === 'online' ? 'bg-blue-100 text-blue-600' : m.kind === 'call' ? 'bg-violet-100 text-violet-600' : 'bg-emerald-100 text-emerald-600'}`}><Icon size={15} /></div>
          <div className="min-w-0"><h3 className="font-semibold text-gray-900 text-sm truncate">{m.title}</h3><p className="text-xs text-gray-500">{KIND_LABEL[m.kind]}{m.location ? ` · ${m.location}` : ''}{m.meet_link ? ` · ${m.meet_link.replace(/^https?:\/\//, '')}` : ''}</p></div>
        </div>
        <span className={`text-[11px] font-medium rounded-full px-2 py-0.5 flex-shrink-0 ${STATUS_STYLE[m.status] || 'bg-gray-100 text-gray-600'}`}>{m.status}</span>
      </div>
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1"><Calendar size={11} /> {fmtDt(m.scheduled_at)}</span>
        <span className="flex items-center gap-1"><Clock size={11} /> {m.duration_min} min</span>
      </div>
      {needsMom && (
        <div className="mt-2.5 flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
          <AlertCircle size={12} /> This meeting is done — add MOM to close the task
        </div>
      )}
      {m.status === 'Completed' && m.mom_submitted_at && (
        <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 size={11} /> MOM submitted {fmtDate(m.mom_submitted_at)}</div>
      )}
    </div>
  );
}

// ── Meeting detail modal ──────────────────────────────────────────────────────
function MeetingDetail({ meetingId, currentUserId, onClose, onRefresh }) {
  const [data, setData] = useState(null);
  const [showMom, setShowMom] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => { mApi(`/${meetingId}`).then(setData).catch(e => setError(e.message)); }, [meetingId]);
  useEffect(() => { load(); }, [load]);

  if (!data) return <Modal title="Meeting" onClose={onClose}><div className="flex justify-center py-10"><Loader2 className="animate-spin text-gray-400" size={20} />{error && <span className="text-red-600 ml-2">{error}</span>}</div></Modal>;
  const { meeting: m, attendees, task, actionItems } = data;
  const now = new Date();
  const isPast = new Date(m.scheduled_at) < now;
  const isHost = Number(m.host_id) === Number(currentUserId);
  const needsMom = m.status === 'Scheduled' && isPast;
  const Icon = KIND_ICON[m.kind] || Calendar;

  const cancel = async () => {
    if (!window.confirm('Cancel this meeting?')) return;
    setCancelling(true);
    try { await mApi(`/${m.id}/cancel`, { method: 'POST' }); onClose(); onRefresh(); } catch (e) { setError(e.message); setCancelling(false); }
  };

  return (
    <>
      <Modal title={m.title} onClose={onClose} width="max-w-xl"
        footer={<>
          {isHost && m.status === 'Scheduled' && !isPast && <button onClick={cancel} disabled={cancelling} className={btn.danger}><XCircle size={14} /> Cancel meeting</button>}
          {(isHost) && needsMom && <button onClick={() => setShowMom(true)} className={btn.primary}><FileText size={14} /> Add MOM</button>}
          <button onClick={onClose} className={btn.ghost}>Close</button>
        </>}>
        <div className="space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {needsMom && <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800 flex items-start gap-2"><AlertCircle size={13} className="mt-0.5" />Meeting is done. Add MOM to complete the linked task.</div>}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-gray-600"><Icon size={14} className="flex-shrink-0" /><span>{KIND_LABEL[m.kind]}</span></div>
            <div className="flex items-center gap-2 text-gray-600"><span className={`text-[11px] font-medium rounded-full px-2 py-0.5 ${STATUS_STYLE[m.status] || 'bg-gray-100'}`}>{m.status}</span></div>
            <div className="flex items-center gap-2 text-gray-600"><Calendar size={14} /><span>{fmtDt(m.scheduled_at)}</span></div>
            <div className="flex items-center gap-2 text-gray-600"><Clock size={14} /><span>{m.duration_min} minutes</span></div>
            {m.location && <div className="flex items-center gap-2 text-gray-600 col-span-2"><MapPin size={14} /><span>{m.location}</span></div>}
            {m.meet_link && <div className="flex items-center gap-2 col-span-2"><Video size={14} className="text-blue-500" /><a href={m.meet_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm truncate">{m.meet_link}</a></div>}
          </div>
          {m.agenda && <div><p className="text-xs font-medium text-gray-500 mb-1">Agenda</p><p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">{m.agenda}</p></div>}
          {attendees.length > 0 && (
            <div><p className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1"><Users size={11} /> Attendees ({attendees.length})</p>
              <div className="flex flex-wrap gap-1.5">
                {attendees.map(a => (
                  <span key={a.user_id} className={`inline-flex items-center gap-1 text-xs rounded-full px-2.5 py-1 ${a.attended === 1 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : a.attended === 0 ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-gray-100 text-gray-600'}`}>
                    {a.attended === 1 && <CheckCircle2 size={10} />}{a.name || `User ${a.user_id}`}
                    {Number(a.user_id) === Number(m.host_id) && <span className="text-[10px] opacity-60">host</span>}
                  </span>
                ))}
              </div>
            </div>
          )}
          {task && (
            <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs font-medium text-gray-500 mb-1">Linked task</p>
              <div className="flex items-center gap-2"><span className={`text-[11px] rounded-full px-2 py-0.5 font-medium ${task.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{task.status}</span><span className="text-sm text-gray-700">{task.title}</span></div>
            </div>
          )}
          {m.mom && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1"><FileText size={11} /> Minutes of Meeting</p>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-2">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{m.mom}</p>
                {m.mom_decisions && <><hr className="border-emerald-200" /><p className="text-xs font-medium text-gray-600">Decisions</p><p className="text-sm text-gray-700 whitespace-pre-wrap">{m.mom_decisions}</p></>}
              </div>
            </div>
          )}
          {actionItems.length > 0 && (
            <div><p className="text-xs font-medium text-gray-500 mb-1.5">Action items ({actionItems.length})</p>
              <div className="space-y-1.5">
                {actionItems.map(a => (
                  <div key={a.id} className="flex items-center gap-2 text-sm bg-gray-50 rounded-lg px-3 py-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${a.status === 'Completed' ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                    <span className={`flex-1 ${a.status === 'Completed' ? 'line-through text-gray-400' : 'text-gray-700'}`}>{a.title}</span>
                    {a.due_date && <span className="text-xs text-gray-400">{fmtDate(a.due_date)}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>
      {showMom && <MomModal meeting={m} attendees={attendees} onClose={() => setShowMom(false)} onDone={() => { setShowMom(false); load(); onRefresh(); }} />}
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MeetingsPage() {
  const { username, designation } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [scope, setScope] = useState('mine');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [scheduling, setScheduling] = useState(false);
  const [detail, setDetail] = useState(null); // meeting id
  const [error, setError] = useState('');

  // detect current user from local storage / session (same pattern as other pages)
  const [currentUserId, setCurrentUserId] = useState(null);
  useEffect(() => {
    try { const u = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || 'null'); if (u?.id) setCurrentUserId(u.id); } catch {}
  }, []);

  const load = useCallback(() => {
    const p = new URLSearchParams({ scope });
    if (status) p.set('status', status);
    mApi(`?${p}`).then(d => { setData(d); setError(''); }).catch(e => setError(e.message));
  }, [scope, status]);

  useEffect(() => { load(); }, [load]);

  const meetings = (data?.meetings || []).filter(m => !search || m.title.toLowerCase().includes(search.toLowerCase()) || (m.location || '').toLowerCase().includes(search.toLowerCase()));
  const counts = { all: meetings.length, Scheduled: meetings.filter(m => m.status === 'Scheduled').length, Completed: meetings.filter(m => m.status === 'Completed').length, Cancelled: meetings.filter(m => m.status === 'Cancelled').length };
  const needMom = meetings.filter(m => m.status === 'Scheduled' && new Date(m.scheduled_at) < new Date());

  return (
    <div className="p-5 bg-[#F8FAFC] min-h-screen font-sans text-gray-900">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900">Meetings</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">Schedule, track and document meetings. MOM required to complete.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-white border border-gray-200 rounded-lg p-0.5">
            {[['mine', 'My meetings'], ['all', 'All meetings']].map(([v, l]) => (
              <button key={v} onClick={() => setScope(v)} className={`h-8 px-3 text-xs font-medium rounded-md cursor-pointer ${scope === v ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>{l}</button>
            ))}
          </div>
          <button onClick={() => setScheduling(true)} className={btn.primary}><Plus size={14} /> Schedule meeting</button>
        </div>
      </div>

      {/* MOM alert banner */}
      {needMom.length > 0 && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2.5">
          <AlertCircle size={16} className="text-amber-600 flex-shrink-0" />
          <span className="text-sm text-amber-800">{needMom.length} meeting{needMom.length > 1 ? 's are' : ' is'} done but MOM hasn't been submitted — tasks can't be closed until MOM is added.</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex flex-wrap gap-1.5">
          {[['', 'All', counts.all], ['Scheduled', 'Scheduled', counts.Scheduled], ['Completed', 'Completed', counts.Completed], ['Cancelled', 'Cancelled', counts.Cancelled]].map(([v, l, c]) => (
            <button key={v} onClick={() => setStatus(v)} className={`h-7 px-3 text-xs rounded-full border cursor-pointer ${status === v ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'}`}>{l} <span className="opacity-60 tabular-nums">{c}</span></button>
          ))}
        </div>
        <div className="relative ml-auto"><Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search meetings…" className="h-8 w-52 pl-8 pr-2 text-xs border border-gray-300 rounded-lg outline-none focus:border-blue-500 bg-white" /></div>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {!data ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-400" size={20} /></div>
      ) : meetings.length === 0 ? (
        <div className="text-center py-16 text-gray-400"><Calendar size={36} className="mx-auto mb-3 opacity-40" /><p className="text-sm">No meetings {status ? `with status "${status}"` : 'yet'}.</p><p className="text-xs mt-1">Click "Schedule meeting" to create one.</p></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {meetings.map(m => <MeetingCard key={m.id} m={m} onClick={() => setDetail(m.id)} />)}
        </div>
      )}

      {scheduling && <ScheduleModal onClose={() => setScheduling(false)} onCreated={(id) => { setScheduling(false); load(); setDetail(id); }} />}
      {detail && <MeetingDetail meetingId={detail} currentUserId={currentUserId} onClose={() => setDetail(null)} onRefresh={load} />}
    </div>
  );
}

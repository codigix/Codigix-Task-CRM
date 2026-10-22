import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API_BASE_URL } from '../../config/environment';
import {
  Plus, Search, Loader2, Calendar, Video, MapPin, Phone, Clock, Users, CheckCircle2, XCircle,
  FileText, AlertCircle, FolderKanban, Layers, ChevronDown, RefreshCw, Mail, Pencil, CalendarClock,
  Trash2, ExternalLink, ListChecks, History, Link2, Check, X, HelpCircle
} from 'lucide-react';
import useLiveRefresh from '../../hooks/useLiveRefresh';

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
const pad = (n) => String(n).padStart(2, '0');
const toLocalInput = (v) => {
  if (!v) return '';
  const d = new Date(v);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fmtDt = (dt) => {
  if (!dt) return '—';
  const d = new Date(dt);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e).trim());
const inputCls = 'w-full h-9 border border-gray-300 rounded px-3 text-sm outline-none focus:border-blue-500 bg-white';
const labelCls = 'block text-xs font-medium text-gray-700 mb-1';
const btn = {
  primary: 'h-9 px-4 text-sm font-medium rounded bg-red-600 text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5',
  ghost: 'h-9 px-3 text-sm font-medium rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5',
  danger: 'h-9 px-4 text-sm font-medium rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5',
  small: 'h-8 px-2.5 text-xs font-medium rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 cursor-pointer inline-flex items-center gap-1',
};
const KIND_ICON = { online: Video, offline: MapPin, call: Phone };
const KIND_LABEL = { online: 'Online (Google Meet)', offline: 'In-person', call: 'Phone call' };
const STATUS_STYLE = {
  Scheduled: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  Completed: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  Cancelled: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200',
};
const providerLabel = (m) => (m.meet_provider === 'google' ? 'Google Meet' : m.meet_provider === 'jitsi' ? 'Jitsi Meet' : 'Meeting link');
const RSVP_STYLE = {
  accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  declined: 'bg-red-50 text-red-600 border-red-200',
  tentative: 'bg-amber-50 text-amber-700 border-amber-200',
  pending: 'bg-gray-100 text-gray-600 border-gray-200',
};
const LOG_LABEL = {
  scheduled: 'Scheduled', edited: 'Edited', rescheduled: 'Rescheduled', cancelled: 'Cancelled', mom_submitted: 'MOM submitted',
  mom_updated: 'MOM updated', meet_link: 'Meet link', rsvp_accepted: 'Accepted', rsvp_declined: 'Declined', rsvp_tentative: 'Tentative'
};

// ── Modal skeleton ────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, footer, width = 'max-w-lg', z = 'z-50' }) {
  return (
    <div className={`fixed inset-0 ${z} flex items-center justify-center bg-black/40 p-4`} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`bg-white rounded-xl shadow-xl w-full ${width} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900 truncate pr-3">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none cursor-pointer">×</button>
        </div>
        <div className="overflow-y-auto px-5 py-4 flex-1">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50 rounded-b-xl">{footer}</div>}
      </div>
    </div>
  );
}

function SectionLabel({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{Icon && <Icon size={11} />}{label}</div>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  );
}

const ErrorNote = ({ text }) => text ? <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{text}</p> : null;

// ── Schedule / edit meeting ───────────────────────────────────────────────────
function ScheduleModal({ onClose, onSaved, me, edit }) {
  const editing = !!edit;
  const m = edit?.meeting;
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [form, setForm] = useState({
    title: m?.title || '', kind: m?.kind || 'offline', scheduled_at: m ? toLocalInput(m.scheduled_at) : '', duration_min: m?.duration_min || 60,
    location: m?.location || '', meet_link: m?.meet_link || '', agenda: m?.agenda || '', project_id: m?.project_id || '', sprint_id: m?.sprint_id || ''
  });
  const [selected, setSelected] = useState(() => (edit?.attendees || []).filter(a => Number(a.user_id) !== Number(m.host_id)).map(a => ({ id: a.user_id, name: a.name, email: a.email })));
  const [guestEmails, setGuestEmails] = useState(m?.guest_emails || []);
  const [guestInput, setGuestInput] = useState('');
  const [search, setSearch] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [teamAdded, setTeamAdded] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    mApi('/users').then(d => setUsers(d.users || [])).catch(() => { });
    mApi('/projects').then(d => setProjects(d.projects || [])).catch(() => { });
    if (m?.project_id) mApi(`/sprints/${m.project_id}`).then(d => setSprints(d.sprints || [])).catch(() => { });
  }, [m?.project_id]);

  const addProjectTeam = async (projectId) => {
    if (!projectId) return;
    setLoadingTeam(true);
    try {
      const d = await mApi(`/project-team/${projectId}`);
      const have = new Set(selected.map(s => Number(s.id)));
      const fresh = (d.members || []).filter(x => !have.has(Number(x.id)) && Number(x.id) !== Number(me));
      setSelected(s => [...s, ...fresh.map(x => ({ id: x.id, name: x.name, email: x.email }))]);
      setTeamAdded(fresh.length);
    } catch { }
    setLoadingTeam(false);
  };

  const onProjectChange = async (projectId) => {
    set('project_id', projectId); set('sprint_id', ''); setSprints([]); setTeamAdded(0);
    if (!projectId) return;
    mApi(`/sprints/${projectId}`).then(d => setSprints(d.sprints || [])).catch(() => { });
    if (!editing) await addProjectTeam(projectId);
  };

  const toggleAtt = (u) => setSelected(s => s.some(x => Number(x.id) === Number(u.id)) ? s.filter(x => Number(x.id) !== Number(u.id)) : [...s, u]);
  const available = users.filter(u => !selected.some(x => Number(x.id) === Number(u.id)) && Number(u.id) !== Number(me));
  const filtered = available.filter(u => !search || `${u.name} ${u.email} ${u.department} ${u.designation || ''}`.toLowerCase().includes(search.toLowerCase()));

  const addGuest = () => {
    const parts = guestInput.split(/[\s,;]+/).map(e => e.trim().toLowerCase()).filter(Boolean);
    const good = parts.filter(isValidEmail);
    if (parts.length && good.length !== parts.length) setError('One of the guest emails is not valid.'); else setError('');
    if (good.length) { setGuestEmails(g => [...new Set([...g, ...good])]); setGuestInput(''); }
  };

  const save = async () => {
    if (!form.title.trim()) { setError('Title is required.'); return; }
    if (!form.scheduled_at) { setError('Date and time are required.'); return; }
    if (guestInput.trim() && !isValidEmail(guestInput.trim())) { setError('Finish adding the guest email (press Add) or clear it.'); return; }
    const pendingGuest = guestInput.trim() && isValidEmail(guestInput.trim()) ? [guestInput.trim().toLowerCase()] : [];
    setSaving(true); setError('');
    try {
      const body = {
        ...form,
        project_id: form.project_id ? Number(form.project_id) : null,
        sprint_id: form.sprint_id ? Number(form.sprint_id) : null,
        duration_min: Number(form.duration_min) || 60,
        attendees: selected.map(u => ({ id: u.id })),
        guestEmails: [...new Set([...guestEmails, ...pendingGuest])]
      };
      const r = editing ? await mApi(`/${m.id}`, { method: 'PUT', body }) : await mApi('', { method: 'POST', body });
      onSaved(editing ? m.id : r.id, r.warning);
    } catch (e) { setError(e.message); setSaving(false); }
  };

  const chosenProject = projects.find(p => String(p.id) === String(form.project_id));

  return (
    <Modal title={editing ? 'Edit meeting' : 'Schedule meeting'} onClose={onClose} width="max-w-2xl"
      footer={<><button onClick={onClose} className={btn.ghost}>Cancel</button><button onClick={save} disabled={saving} className={btn.primary}>{saving && <Loader2 size={14} className="animate-spin" />} {editing ? 'Save changes' : 'Schedule meeting'}</button></>}>
      <div className="space-y-4">
        <ErrorNote text={error} />
        <SectionLabel icon={Calendar} label="Meeting details" />
        <div>
          <label className={labelCls}>Meeting title *</label>
          <input value={form.title} onChange={e => set('title', e.target.value)} className={inputCls} placeholder="e.g. Sprint planning, Client review, Project kickoff" />
        </div>

        <div>
          <label className={labelCls}>Meeting type</label>
          <div className="grid grid-cols-3 gap-2">
            {['offline', 'online', 'call'].map(k => {
              const Icon = KIND_ICON[k];
              return (
                <button key={k} type="button" onClick={() => set('kind', k)}
                  className={`flex items-center gap-2 border rounded px-3 py-2.5 text-sm cursor-pointer transition-colors ${form.kind === k ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200 text-blue-700 font-medium' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  <Icon size={15} />{k === 'online' ? 'Online' : k === 'offline' ? 'In-person' : 'Call'}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Date &amp; time *</label>
            <input type="datetime-local" value={form.scheduled_at} onChange={e => set('scheduled_at', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Duration (minutes)</label>
            <input type="number" value={form.duration_min} onChange={e => set('duration_min', e.target.value)} min={5} max={720} step={15} className={inputCls} />
          </div>
        </div>

        {form.kind === 'online' ? (
          <div>
            <label className={labelCls}>Meeting link (optional)</label>
            <input value={form.meet_link} onChange={e => set('meet_link', e.target.value)} className={inputCls} placeholder="Leave empty to auto-generate a Google Meet link" />
            <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1"><Video size={11} /> Leave empty and a Google Meet link is created automatically (from your Google account when connected, otherwise from the main account). Paste a Zoom/Teams link to use that instead.</p>
          </div>
        ) : (
          <div>
            <label className={labelCls}>{form.kind === 'call' ? 'Phone number / call notes' : 'Location'}</label>
            <input value={form.location} onChange={e => set('location', e.target.value)} className={inputCls} placeholder={form.kind === 'call' ? 'e.g. +91-98765-43210' : 'e.g. Conference room 1, Client office, Café'} />
          </div>
        )}

        <div>
          <label className={labelCls}>Agenda</label>
          <textarea value={form.agenda} onChange={e => set('agenda', e.target.value)} rows={3} className={`${inputCls} h-auto py-2`} placeholder="Points to discuss in this meeting…" />
        </div>

        <SectionLabel icon={FolderKanban} label="Project & sprint" />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Project (optional)</label>
            <div className="relative">
              <select value={form.project_id} onChange={e => onProjectChange(e.target.value)} className={`${inputCls} pr-8 appearance-none`}>
                <option value="">Not linked to a project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-3 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Sprint (optional)</label>
            <div className="relative">
              <select value={form.sprint_id} onChange={e => set('sprint_id', e.target.value)} className={`${inputCls} pr-8 appearance-none`} disabled={!form.project_id || !sprints.length}>
                <option value="">{!form.project_id ? 'Select a project first' : !sprints.length ? 'No planned/active sprints' : 'Not in a sprint (backlog)'}</option>
                {sprints.map(s => <option key={s.id} value={s.id}>{s.name}{s.status === 'Active' ? ' (active)' : ''}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-3 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
        <div className="text-xs text-gray-500 bg-gray-50 rounded px-3 py-2">
          {chosenProject
            ? <>The meeting becomes a task in <strong>{chosenProject.name}</strong>{form.sprint_id ? ', placed in the selected sprint' : ' (backlog)'}, and shows on every attendee's calendar and task list.</>
            : <>Without a project the meeting still becomes a task for the host and shows on every attendee's calendar.</>}
        </div>

        <SectionLabel icon={Users} label="Attendees" />
        {loadingTeam && <div className="flex items-center gap-2 text-xs text-blue-600"><Loader2 size={12} className="animate-spin" /> Loading project team…</div>}
        {teamAdded > 0 && !loadingTeam && (
          <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-3 py-1.5 flex items-center gap-1.5">
            <CheckCircle2 size={12} /> {teamAdded} project team member{teamAdded > 1 ? 's' : ''} added. Remove anyone below if they are not needed.
          </div>
        )}
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selected.map(u => (
              <span key={u.id} className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded px-2 py-0.5">
                {u.name}<button type="button" onClick={() => toggleAtt(u)} className="hover:text-red-600 cursor-pointer leading-none">×</button>
              </span>
            ))}
          </div>
        )}
        <div>
          <div className="flex items-center justify-between">
            <label className={labelCls}>Team members (employees)</label>
            {form.project_id && editing && <button type="button" onClick={() => addProjectTeam(form.project_id)} className="text-[11px] text-blue-600 hover:underline cursor-pointer mb-1">+ Add whole project team</button>}
          </div>
          <div className="relative">
            <button type="button" onClick={() => setPickerOpen(o => !o)} className={`${inputCls} flex items-center justify-between text-left cursor-pointer ${pickerOpen ? 'border-blue-500' : ''}`}>
              <span className="text-gray-500">{users.length ? `Select employees to invite (${available.length} available)` : 'Loading employees…'}</span>
              <ChevronDown size={14} className={`text-gray-400 transition-transform ${pickerOpen ? 'rotate-180' : ''}`} />
            </button>
            {pickerOpen && (
              <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
                <div className="relative p-2 border-b border-gray-100">
                  <Search size={13} className="absolute left-4 top-4 text-gray-400" />
                  <input autoFocus value={search} onChange={e => setSearch(e.target.value)} className={`${inputCls} pl-8`} placeholder="Filter by name, department or email" />
                </div>
                <div className="max-h-56 overflow-y-auto divide-y divide-gray-50">
                  {filtered.map(u => (
                    <button key={u.id} type="button" onClick={() => { toggleAtt(u); setSearch(''); }} className="w-full flex items-center justify-between gap-3 px-3 py-2 text-sm text-left hover:bg-blue-50 cursor-pointer">
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 truncate">{u.name}</div>
                        <div className="text-xs text-gray-500 truncate">{[u.department, u.designation].filter(Boolean).join(' · ') || u.email}</div>
                      </div>
                      <span className="text-[11px] text-gray-400 truncate max-w-[40%]">{u.email}</span>
                    </button>
                  ))}
                  {!filtered.length && <p className="text-xs text-gray-500 p-3 text-center">{available.length ? 'No employee matches.' : 'All employees already added.'}</p>}
                </div>
                <div className="px-3 py-2 border-t border-gray-100 text-right">
                  <button type="button" onClick={() => setPickerOpen(false)} className="text-xs text-blue-600 hover:underline cursor-pointer">Done</button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className={labelCls + ' flex items-center gap-1'}><Mail size={11} /> External guests (not in the system) — type email</label>
          {guestEmails.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {guestEmails.map(e => (
                <span key={e} className="inline-flex items-center gap-1 text-xs bg-violet-50 text-violet-700 border border-violet-200 rounded px-2 py-0.5">
                  <Mail size={10} />{e}<button type="button" onClick={() => setGuestEmails(g => g.filter(x => x !== e))} className="hover:text-red-600 cursor-pointer leading-none">×</button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input value={guestInput} onChange={e => setGuestInput(e.target.value)} onKeyDown={e => (e.key === 'Enter' || e.key === ',') && (e.preventDefault(), addGuest())}
              className={`${inputCls} flex-1`} placeholder="client@company.com (Enter or comma to add)" />
            <button type="button" onClick={addGuest} className="h-9 px-3 text-sm border border-gray-300 rounded hover:bg-gray-50 cursor-pointer text-gray-700">Add</button>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Guests get the Google Calendar invite. They do not need an account here.</p>
        </div>
      </div>
    </Modal>
  );
}

// ── Reschedule ────────────────────────────────────────────────────────────────
function RescheduleModal({ meeting, onClose, onDone }) {
  const [when, setWhen] = useState(toLocalInput(meeting.scheduled_at));
  const [duration, setDuration] = useState(meeting.duration_min);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    if (!when) { setError('Choose the new date and time.'); return; }
    if (!reason.trim()) { setError('Please give a short reason.'); return; }
    setSaving(true); setError('');
    try { const r = await mApi(`/${meeting.id}/reschedule`, { method: 'POST', body: { scheduled_at: when, duration_min: Number(duration) || meeting.duration_min, reason } }); onDone(r.warning); }
    catch (e) { setError(e.message); setSaving(false); }
  };
  return (
    <Modal title="Reschedule meeting" onClose={onClose} z="z-[60]"
      footer={<><button onClick={onClose} className={btn.ghost}>Back</button><button onClick={save} disabled={saving} className={btn.primary}>{saving && <Loader2 size={14} className="animate-spin" />} Reschedule &amp; notify</button></>}>
      <div className="space-y-3">
        <ErrorNote text={error} />
        <p className="text-xs text-gray-500">Currently <strong>{fmtDt(meeting.scheduled_at)}</strong>. Attendees are notified, the calendar event, task and sprint item all move with it, and everyone is asked to confirm again.</p>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>New date &amp; time *</label><input type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Duration (min)</label><input type="number" min={5} max={720} step={15} value={duration} onChange={e => setDuration(e.target.value)} className={inputCls} /></div>
        </div>
        <div><label className={labelCls}>Reason *</label><textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} className={`${inputCls} h-auto py-2`} placeholder="e.g. Client asked to move to next week" /></div>
      </div>
    </Modal>
  );
}

// ── Cancel ────────────────────────────────────────────────────────────────────
function CancelModal({ meeting, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    if (!reason.trim()) { setError('Please give a short reason.'); return; }
    setSaving(true); setError('');
    try { await mApi(`/${meeting.id}/cancel`, { method: 'POST', body: { reason } }); onDone(); }
    catch (e) { setError(e.message); setSaving(false); }
  };
  return (
    <Modal title="Cancel meeting" onClose={onClose} z="z-[60]"
      footer={<><button onClick={onClose} className={btn.ghost}>Keep meeting</button><button onClick={save} disabled={saving} className={btn.danger}>{saving && <Loader2 size={14} className="animate-spin" />} Cancel meeting</button></>}>
      <div className="space-y-3">
        <ErrorNote text={error} />
        <p className="text-xs text-gray-500">The Google Calendar event is removed, the task is taken off the sprint/task list and attendees are told why.</p>
        <div><label className={labelCls}>Reason *</label><textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} className={`${inputCls} h-auto py-2`} placeholder="e.g. Agenda covered in yesterday's call" /></div>
      </div>
    </Modal>
  );
}

// ── MOM ───────────────────────────────────────────────────────────────────────
function MomModal({ meeting, attendees, onClose, onDone }) {
  const completed = meeting.status === 'Completed';
  const [form, setForm] = useState({
    mom: meeting.mom || '', decisions: meeting.mom_decisions || '',
    attended: completed ? attendees.filter(a => a.attended === 1).map(a => a.user_id) : attendees.map(a => a.user_id),
    actionItems: []
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleAttended = (uid) => setForm(f => ({ ...f, attended: f.attended.includes(uid) ? f.attended.filter(x => x !== uid) : [...f.attended, uid] }));
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
    <Modal title={completed ? 'Edit Minutes of Meeting' : 'Add Minutes of Meeting (MOM)'} onClose={onClose} width="max-w-2xl" z="z-[60]"
      footer={<><button onClick={onClose} className={btn.ghost}>Cancel</button><button onClick={save} disabled={saving} className={btn.primary}>{saving && <Loader2 size={14} className="animate-spin" />} {completed ? 'Save MOM' : 'Submit MOM & complete'}</button></>}>
      <div className="space-y-4">
        <ErrorNote text={error} />
        {!completed && <div className="bg-amber-50 border border-amber-200 rounded px-3 py-2 text-xs text-amber-800 flex items-start gap-2"><AlertCircle size={13} className="flex-shrink-0 mt-0.5" /> Submitting MOM completes this meeting: the task and sprint item are marked Done and attendance is recorded.</div>}
        <div><label className={labelCls}>Discussion summary *</label><textarea value={form.mom} onChange={e => set('mom', e.target.value)} rows={5} className={`${inputCls} h-auto py-2`} placeholder="What was discussed? Key points from the meeting…" /></div>
        <div><label className={labelCls}>Decisions taken</label><textarea value={form.decisions} onChange={e => set('decisions', e.target.value)} rows={3} className={`${inputCls} h-auto py-2`} placeholder="Approvals, agreements, conclusions…" /></div>
        {attendees.length > 0 && (
          <div>
            <label className={labelCls}>Who attended?</label>
            <div className="flex flex-wrap gap-2">
              {attendees.map(a => (
                <button key={a.user_id} type="button" onClick={() => toggleAttended(a.user_id)}
                  className={`flex items-center gap-1.5 text-xs rounded px-3 py-1 border cursor-pointer ${form.attended.includes(a.user_id) ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                  {form.attended.includes(a.user_id) && <CheckCircle2 size={11} />}{a.name}
                </button>
              ))}
            </div>
          </div>
        )}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className={labelCls + ' mb-0'}>{completed ? 'Add more action items' : 'Action items'} <span className="text-gray-400 font-normal">(become tasks in task management)</span></label>
            <button type="button" onClick={addAction} className="text-xs text-blue-600 hover:underline cursor-pointer">+ Add item</button>
          </div>
          <div className="space-y-2">
            {form.actionItems.map((a, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-start bg-gray-50 rounded p-2">
                <input value={a.title} onChange={e => setAction(i, 'title', e.target.value)} placeholder="What needs to be done" className={`${inputCls} col-span-5`} />
                <select value={a.assignedTo} onChange={e => setAction(i, 'assignedTo', e.target.value)} className={`${inputCls} col-span-4`}>
                  <option value="">Assign to…</option>
                  {attendees.map(u => <option key={u.user_id} value={u.user_id}>{u.name}</option>)}
                </select>
                <input type="date" value={a.dueDate} onChange={e => setAction(i, 'dueDate', e.target.value)} className={`${inputCls} col-span-2 px-1`} />
                <button type="button" onClick={() => removeAction(i)} className="col-span-1 text-gray-400 hover:text-red-600 cursor-pointer mt-2 flex justify-center"><XCircle size={15} /></button>
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
  const needsMom = m.status === 'Scheduled' && new Date(m.scheduled_at) < new Date();
  const kindColor = m.kind === 'online' ? 'bg-blue-100 text-blue-600' : m.kind === 'call' ? 'bg-violet-100 text-violet-600' : 'bg-emerald-100 text-emerald-600';
  return (
    <div onClick={onClick} className={`bg-white border rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow ${needsMom ? 'border-amber-300' : 'border-gray-200'} ${m.status === 'Cancelled' ? 'opacity-70' : ''}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${kindColor}`}><Icon size={15} /></div>
          <div className="min-w-0">
            <h3 className={`font-semibold text-gray-900 text-sm truncate ${m.status === 'Cancelled' ? 'line-through' : ''}`}>{m.title}</h3>
            <p className="text-xs text-gray-500 truncate">{m.kind === 'online' ? (m.meet_link ? providerLabel(m) : 'Online · link pending') : m.location || KIND_LABEL[m.kind]}</p>
          </div>
        </div>
        <span className={`text-[11px] font-medium rounded px-2 py-0.5 flex-shrink-0 ${STATUS_STYLE[m.status] || 'bg-gray-100 text-gray-600'}`}>{m.status}</span>
      </div>
      <div className="flex items-center gap-3 text-xs text-gray-500 mb-1.5">
        <span className="flex items-center gap-1"><Calendar size={11} /> {fmtDt(m.scheduled_at)}</span>
        <span className="flex items-center gap-1"><Clock size={11} /> {m.duration_min} min</span>
        <span className="flex items-center gap-1"><Users size={11} /> {m.attendee_count + (m.guest_emails?.length || 0)}</span>
      </div>
      {(m.project_name || m.issue_key) && (
        <div className="flex items-center gap-2 text-[11px] text-gray-400 flex-wrap">
          {m.project_name && <span className="flex items-center gap-1"><FolderKanban size={10} />{m.project_name}</span>}
          {m.sprint_name && <span className="flex items-center gap-1"><Layers size={10} />{m.sprint_name}</span>}
          {m.issue_key && <span className="font-mono text-blue-500">{m.issue_key}</span>}
        </div>
      )}
      {m.reschedule_count > 0 && m.status === 'Scheduled' && <div className="mt-1 text-[11px] text-amber-600 flex items-center gap-1"><CalendarClock size={10} /> Rescheduled {m.reschedule_count}×</div>}
      {m.my_rsvp === 'pending' && m.status === 'Scheduled' && <div className="mt-1.5 text-[11px] text-blue-600 flex items-center gap-1"><HelpCircle size={10} /> Awaiting your response</div>}
      {needsMom && <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5"><AlertCircle size={12} /> Meeting started — add MOM to close the task</div>}
      {m.status === 'Completed' && m.mom_submitted_at && <div className="mt-1.5 flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 size={11} /> MOM {fmtDate(m.mom_submitted_at)}</div>}
      {m.status === 'Cancelled' && m.cancel_reason && <div className="mt-1.5 text-[11px] text-gray-500 truncate">Cancelled: {m.cancel_reason}</div>}
    </div>
  );
}

// ── Meeting detail ────────────────────────────────────────────────────────────
function MeetingDetail({ meetingId, me, onClose, onRefresh, onFlash }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [panel, setPanel] = useState(null); // 'mom' | 'reschedule' | 'cancel' | 'edit' | 'link'
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [linkInput, setLinkInput] = useState('');
  const [inviteCopied, setInviteCopied] = useState(false);

  const load = useCallback(() => mApi(`/${meetingId}`).then(d => { setData(d); setError(''); }).catch(e => setError(e.message)), [meetingId]);
  useEffect(() => { load(); }, [load]);
  useLiveRefresh(['meetings'], () => load());

  if (!data) return (
    <Modal title="Meeting" onClose={onClose}>
      <div className="flex justify-center py-10 items-center gap-2">
        {error ? <span className="text-red-600 text-sm">{error}</span> : <Loader2 className="animate-spin text-gray-400" size={20} />}
      </div>
    </Modal>
  );

  const { meeting: m, attendees, task, issue, actionItems, log, canManage, myRsvp } = data;
  const now = new Date();
  const started = new Date(m.scheduled_at) <= now;
  const Icon = KIND_ICON[m.kind] || Calendar;
  const scheduled = m.status === 'Scheduled';
  const refresh = async () => { await load(); onRefresh(); };

  const act = async (name, fn) => {
    setBusy(name); setError('');
    try { await fn(); } catch (e) { setError(e.message); }
    setBusy('');
  };
  const respond = (response) => act('rsvp', async () => { await mApi(`/${m.id}/respond`, { method: 'POST', body: { response } }); await refresh(); });
  const del = () => {
    if (!window.confirm(scheduled ? 'Delete this meeting? Attendees will be told it was removed.' : 'Delete this meeting permanently?')) return;
    act('delete', async () => { await mApi(`/${m.id}`, { method: 'DELETE' }); onRefresh(); onClose(); });
  };
  const genLink = () => act('link', async () => {
    const r = await mApi(`/${m.id}/meet-link`, { method: 'POST', body: linkInput.trim() ? { meet_link: linkInput.trim() } : {} });
    if (r.warning) onFlash({ type: 'warn', text: r.warning }); else onFlash({ type: 'ok', text: 'Meeting link updated.' });
    setLinkInput(''); setPanel(null); await refresh();
  });
  const copyInvite = async () => {
    const start = new Date(m.scheduled_at);
    const end = new Date(start.getTime() + (m.duration_min || 60) * 60000);
    const time = (d) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const text = [
      m.title,
      `Host: ${m.host_name || '—'}`,
      `Date: ${start.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}`,
      `Time: ${time(start)} – ${time(end)} (${m.duration_min} min)`,
      m.location ? `Location: ${m.location}` : '',
      m.agenda ? `\nAgenda / Description:\n${m.agenda}` : '',
      m.meet_link ? `\nJoin: ${m.meet_link}` : ''
    ].filter(Boolean).join('\n');
    try { await navigator.clipboard.writeText(text); setInviteCopied(true); setTimeout(() => setInviteCopied(false), 1800); }
    catch { window.prompt('Copy the invite:', text); }
  };
  const openTasks = () => navigate(`/tasks?issue=${encodeURIComponent(m.issue_key)}`);

  return (
    <>
      <Modal title={m.title} onClose={onClose} width="max-w-2xl"
        footer={<>
          {canManage && (scheduled || m.status === 'Cancelled' || m.status === 'Completed') && (
            <button onClick={del} disabled={busy === 'delete'} className={`${btn.ghost} text-red-600 border-red-200 hover:bg-red-50 mr-auto`}><Trash2 size={14} /> Delete</button>
          )}
          {canManage && scheduled && <button onClick={() => setPanel('cancel')} className={btn.ghost}><XCircle size={14} /> Cancel meeting</button>}
          {canManage && scheduled && <button onClick={() => setPanel('reschedule')} className={btn.ghost}><CalendarClock size={14} /> Reschedule</button>}
          {canManage && scheduled && <button onClick={() => setPanel('edit')} className={btn.ghost}><Pencil size={14} /> Edit</button>}
          {canManage && scheduled && started && <button onClick={() => setPanel('mom')} className={btn.primary}><FileText size={14} /> Add MOM</button>}
          {canManage && m.status === 'Completed' && <button onClick={() => setPanel('mom')} className={btn.ghost}><Pencil size={14} /> Edit MOM</button>}
          <button onClick={onClose} className={btn.ghost}>Close</button>
        </>}>
        <div className="space-y-4">
          <ErrorNote text={error} />

          {scheduled && started && (
            <div className="bg-amber-50 border border-amber-200 rounded px-3 py-2 text-xs text-amber-800 flex items-start gap-2">
              <AlertCircle size={13} className="mt-0.5 flex-shrink-0" /> The meeting has started. {canManage ? 'Add the MOM to complete the linked task.' : 'The host will add the MOM to close it.'}
            </div>
          )}
          {m.status === 'Cancelled' && <div className="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-xs text-gray-600">Cancelled{m.cancel_reason ? `: ${m.cancel_reason}` : ''}</div>}

          {scheduled && myRsvp && Number(m.host_id) !== Number(me) && (
            <div className="flex flex-wrap items-center gap-2 bg-blue-50 border border-blue-100 rounded px-3 py-2">
              <span className="text-xs text-blue-800 font-medium">Will you attend?</span>
              {[['accepted', 'Yes', Check], ['tentative', 'Maybe', HelpCircle], ['declined', 'No', X]].map(([v, l, I]) => (
                <button key={v} disabled={busy === 'rsvp'} onClick={() => respond(v)}
                  className={`h-7 px-2.5 text-xs rounded border inline-flex items-center gap-1 cursor-pointer ${myRsvp === v ? RSVP_STYLE[v] + ' font-semibold ring-1 ring-offset-0' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}><I size={11} />{l}</button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-gray-600"><Icon size={14} />{KIND_LABEL[m.kind] || m.kind}</div>
            <div><span className={`text-[11px] font-medium rounded px-2 py-0.5 ${STATUS_STYLE[m.status] || 'bg-gray-100'}`}>{m.status}</span>{m.reschedule_count > 0 && <span className="ml-2 text-[11px] text-amber-600">rescheduled {m.reschedule_count}×</span>}</div>
            <div className="flex items-center gap-2 text-gray-600"><Calendar size={14} />{fmtDt(m.scheduled_at)}</div>
            <div className="flex items-center gap-2 text-gray-600"><Clock size={14} />{m.duration_min} minutes · host {m.host_name}</div>
            {m.location && <div className="flex items-center gap-2 text-gray-600 col-span-2"><MapPin size={14} />{m.location}</div>}
            {m.kind === 'online' && (
              <div className="col-span-2">
                {m.meet_link ? (
                  <div className="flex items-center gap-2">
                    <Video size={14} className="text-blue-500 flex-shrink-0" />
                    <span className="text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5 flex-shrink-0">{providerLabel(m)}</span>
                    <a href={m.meet_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm truncate">{m.meet_link}</a>
                    <button onClick={copyInvite} className={`${btn.ghost} !h-7 !px-2.5 text-xs ml-auto`}>{inviteCopied ? 'Copied' : 'Copy invite'}</button>
                    {scheduled && <a href={m.meet_link} target="_blank" rel="noopener noreferrer" className={`${btn.primary} !h-7 !px-2.5 text-xs`}>Join</a>}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2"><Link2 size={13} /> No meeting link yet.</div>
                )}
                {canManage && scheduled && (
                  panel === 'link' ? (
                    <div className="flex gap-2 mt-2">
                      <input value={linkInput} onChange={e => setLinkInput(e.target.value)} className={`${inputCls} flex-1`} placeholder="Paste a link, or leave empty to generate Google Meet" />
                      <button onClick={genLink} disabled={busy === 'link'} className={btn.primary}>{busy === 'link' && <Loader2 size={13} className="animate-spin" />} Apply</button>
                      <button onClick={() => setPanel(null)} className={btn.ghost}>Cancel</button>
                    </div>
                  ) : <button onClick={() => setPanel('link')} className="text-xs text-blue-600 hover:underline cursor-pointer mt-1.5">{m.meet_link ? 'Change / regenerate link' : 'Generate meeting link'}</button>
                )}
              </div>
            )}
          </div>

          {(m.project_name || m.sprint_name) && (
            <div className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 rounded px-3 py-2">
              {m.project_name && <span className="flex items-center gap-1.5"><FolderKanban size={13} /> {m.project_name}</span>}
              {m.sprint_name && <span className="flex items-center gap-1.5 text-violet-600"><Layers size={13} /> {m.sprint_name}</span>}
            </div>
          )}

          {m.agenda && <div><p className="text-xs font-medium text-gray-500 mb-1">Agenda</p><p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded p-3">{m.agenda}</p></div>}

          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1"><Users size={11} /> Attendees ({attendees.length + (m.guest_emails?.length || 0)})</p>
            <div className="flex flex-wrap gap-1.5">
              {attendees.map(a => {
                const done = m.status === 'Completed';
                const cls = done ? (a.attended === 1 ? RSVP_STYLE.accepted : 'bg-red-50 text-red-600 border-red-200') : (RSVP_STYLE[a.responded] || RSVP_STYLE.pending);
                return (
                  <span key={a.user_id} title={done ? (a.attended === 1 ? 'Attended' : 'Did not attend') : a.responded} className={`inline-flex items-center gap-1 text-xs rounded px-2.5 py-1 border ${cls}`}>
                    {done ? (a.attended === 1 ? <Check size={10} /> : <X size={10} />) : a.responded === 'accepted' ? <Check size={10} /> : a.responded === 'declined' ? <X size={10} /> : a.responded === 'tentative' ? <HelpCircle size={10} /> : null}
                    {a.name}{Number(a.user_id) === Number(m.host_id) && <span className="text-[10px] opacity-60">host</span>}
                  </span>
                );
              })}
              {(m.guest_emails || []).map(email => <span key={email} className="inline-flex items-center gap-1 text-xs bg-violet-50 text-violet-700 border border-violet-200 rounded px-2.5 py-1"><Mail size={10} />{email}</span>)}
            </div>
          </div>

          {(issue || task) && (
            <div className="bg-gray-50 rounded p-3 space-y-2">
              <p className="text-xs font-medium text-gray-500 flex items-center gap-1"><ListChecks size={11} /> Linked work</p>
              {issue && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-mono text-xs text-blue-600">{issue.issue_key}</span>
                  <span className={`text-[11px] rounded px-2 py-0.5 font-medium ${String(issue.status).toUpperCase() === 'DONE' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{issue.status}</span>
                  <span className="text-gray-600 text-xs">{m.sprint_name ? `in ${m.sprint_name}` : m.project_name ? 'in project backlog' : 'task management'}</span>
                  <button onClick={openTasks} className="ml-auto text-xs text-blue-600 hover:underline cursor-pointer inline-flex items-center gap-1">Open in tasks <ExternalLink size={11} /></button>
                </div>
              )}
              {task && <div className="flex items-center gap-2 text-sm"><span className="text-xs text-gray-500 w-14">To-do</span><span className={`text-[11px] rounded px-2 py-0.5 font-medium ${task.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : task.status === 'Cancelled' ? 'bg-gray-200 text-gray-600' : 'bg-amber-50 text-amber-700'}`}>{task.status}</span></div>}
            </div>
          )}

          {m.mom && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1"><FileText size={11} /> Minutes of Meeting</p>
              <div className="bg-emerald-50 border border-emerald-200 rounded p-3 space-y-2">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{m.mom}</p>
                {m.mom_decisions && <><hr className="border-emerald-200" /><p className="text-xs font-medium text-gray-600">Decisions</p><p className="text-sm text-gray-700 whitespace-pre-wrap">{m.mom_decisions}</p></>}
              </div>
            </div>
          )}

          {actionItems.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1.5">Action items ({actionItems.length})</p>
              <div className="space-y-1.5">
                {actionItems.map((a, i) => {
                  const done = ['DONE', 'COMPLETED', 'CLOSED'].includes(String(a.status).toUpperCase());
                  return (
                    <div key={a.issue_key || a.id || i} className="flex items-center gap-2 text-sm bg-gray-50 rounded px-3 py-2">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${done ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                      {a.issue_key && <span className="font-mono text-[11px] text-blue-600">{a.issue_key}</span>}
                      <span className={`flex-1 ${done ? 'line-through text-gray-400' : 'text-gray-700'}`}>{a.title}</span>
                      {a.assignee && <span className="text-xs text-gray-500">{a.assignee}</span>}
                      {a.due_date && <span className="text-xs text-gray-400">{fmtDate(a.due_date)}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {log.length > 0 && (
            <details className="group">
              <summary className="text-xs font-medium text-gray-500 flex items-center gap-1 cursor-pointer select-none"><History size={11} /> Activity ({log.length})</summary>
              <ul className="mt-2 space-y-1.5 border-l-2 border-gray-100 pl-3">
                {log.map((l, i) => (
                  <li key={i} className="text-xs text-gray-600">
                    <span className="font-medium text-gray-800">{LOG_LABEL[l.action] || l.action}</span>{l.user_name ? ` · ${l.user_name}` : ''} <span className="text-gray-400">{fmtDt(l.created_at)}</span>
                    {l.detail && <div className="text-gray-500">{l.detail}</div>}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </Modal>

      {panel === 'mom' && <MomModal meeting={m} attendees={attendees} onClose={() => setPanel(null)} onDone={async () => { setPanel(null); onFlash({ type: 'ok', text: 'MOM saved. The task and sprint item are updated.' }); await refresh(); }} />}
      {panel === 'reschedule' && <RescheduleModal meeting={m} onClose={() => setPanel(null)} onDone={async (w) => { setPanel(null); onFlash(w ? { type: 'warn', text: `Rescheduled. ${w}` } : { type: 'ok', text: 'Meeting rescheduled and attendees notified.' }); await refresh(); }} />}
      {panel === 'cancel' && <CancelModal meeting={m} onClose={() => setPanel(null)} onDone={async () => { setPanel(null); onFlash({ type: 'ok', text: 'Meeting cancelled and attendees notified.' }); await refresh(); }} />}
      {panel === 'edit' && <ScheduleModal me={me} edit={{ meeting: m, attendees }} onClose={() => setPanel(null)} onSaved={async (id, w) => { setPanel(null); onFlash(w ? { type: 'warn', text: `Saved. ${w}` } : { type: 'ok', text: 'Meeting updated everywhere (calendar, task, sprint).' }); await refresh(); }} />}
    </>
  );
}

// ── Google connection ─────────────────────────────────────────────────────────
// The "?" for employees: what connecting Google does and how, without the administrator setup steps.
function GoogleConnectHelpModal({ status, onClose }) {
  return (
    <Modal title="Connect your Google account" onClose={onClose} width="max-w-lg" z="z-[60]" footer={<button onClick={onClose} className={btn.primary}>Got it</button>}>
      <div className="space-y-3 text-sm text-gray-700">
        <p>Connecting is optional. Once connected:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Online meetings <strong>you schedule</strong> are created in your own Google Calendar with a Google Meet link, and <strong>you are the host</strong>: you admit people into the call.</li>
          <li>Emails you send from the CRM (such as task updates) go <strong>from your own Gmail</strong>, so replies come back to you.</li>
        </ul>
        <p>Not connected? Your meetings still get a Google Meet link, created from the company's main account, which is then the host.</p>
        <p className="font-medium text-gray-900">How to connect</p>
        <ol className="list-decimal pl-5 space-y-1.5">
          <li>Click <strong>Connect my Google account</strong> and choose your Google account.</li>
          <li>If Google says the app isn't verified yet, click <strong>Advanced → Go to Codigix CRM</strong>.</li>
          <li>Tick <strong>every</strong> permission, including Calendar and "Send email on your behalf", then click <strong>Continue</strong>.</li>
        </ol>
        <p className="text-xs text-gray-500">You can disconnect at any time from this page, or remove access at myaccount.google.com/permissions.</p>
        {!status?.configured && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">Google sign-in isn't set up on the server yet. Ask an administrator.</p>}
      </div>
    </Modal>
  );
}

function GoogleSetupModal({ status, onClose }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { try { navigator.clipboard.writeText(status?.redirectUri || ''); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { } };
  return (
    <Modal title="Set up Google Meet" onClose={onClose} width="max-w-xl" z="z-[60]" footer={<button onClick={onClose} className={btn.primary}>Got it</button>}>
      <div className="space-y-3 text-sm text-gray-700">
        <p>Google only creates Meet links for a real Google account, so an administrator needs to do this <strong>once</strong>, then connect the main account and click <strong>Use as fallback</strong>. Until a Google account is available, online meetings cannot be scheduled without pasting a link.</p>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Open <strong>Google Cloud Console</strong> for the project that has the Calendar API, go to <em>APIs &amp; Services → Library</em> and make sure <strong>Google Calendar API</strong> is enabled.</li>
          <li><em>OAuth consent screen</em> (Google Auth Platform → Audience): either add the connecting account under <strong>Test users</strong>, or click <strong>Publish app</strong> so the link does not expire after 7 days. Only the one organiser account signs in; employees never do.</li>
          <li><em>Credentials → Create credentials → OAuth client ID → Web application</em>. Under <strong>Authorized redirect URIs</strong> add exactly:
            <div className="mt-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded px-2 py-1.5">
              <code className="text-xs break-all flex-1">{status?.redirectUri}</code>
              <button onClick={copy} className={btn.small}>{copied ? 'Copied' : 'Copy'}</button>
            </div>
          </li>
          <li>Put the client ID and secret in the server <code className="text-xs bg-gray-100 px-1 rounded">.env</code> as <code className="text-xs bg-gray-100 px-1 rounded">GOOGLE_OAUTH_CLIENT_ID</code> and <code className="text-xs bg-gray-100 px-1 rounded">GOOGLE_OAUTH_CLIENT_SECRET</code>, then restart the server.</li>
          <li>Come back here and click <strong>Connect Google</strong> and sign in with the organiser account (for example a shared company Gmail). <strong>On Google's permission screen, tick the Google Calendar checkbox</strong> ("View and edit events on all your calendars"); if it is left unticked, Google refuses calendar access and the connection is rejected. From then on every online meeting gets a Google Meet link, is created on that calendar, and Google invites every attendee, so it appears in their own calendar automatically.</li>
        </ol>
        <p className="text-xs text-gray-500">Alternative for Google Workspace: let the existing service account impersonate a Workspace user with domain-wide delegation, and set <code className="bg-gray-100 px-1 rounded">GOOGLE_IMPERSONATE_EMAIL</code> in the server <code className="bg-gray-100 px-1 rounded">.env</code>.</p>
      </div>
    </Modal>
  );
}

function GoogleConnect({ onFlash, refreshKey }) {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [help, setHelp] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const load = useCallback(() => mApi('/google/status').then(setStatus).catch(() => setStatus(null)), []);
  useEffect(() => { load(); }, [load, refreshKey]);
  if (!status) return null;

  const connect = async (org) => {
    if (!status.configured) { setHelp(true); return; }
    setBusy(true);
    try { const r = await mApi(`/google/connect${org ? '?org=1' : ''}`); window.location.href = r.url; }
    catch (e) { onFlash({ type: 'warn', text: e.message }); setBusy(false); }
  };
  const share = async (on) => {
    setBusy(true);
    try { await mApi('/google/share', { method: 'POST', body: { share: on } }); await load(); onFlash({ type: 'ok', text: on ? 'Online meetings for every employee now use this Google account: the Meet link and calendar invites are automatic.' : 'No longer used for everyone.' }); }
    catch (e) { onFlash({ type: 'warn', text: e.message }); }
    setBusy(false);
  };
  const disconnect = async () => {
    if (!window.confirm('Disconnect your Google account? Until you reconnect, your meetings and the emails you send from the CRM go from the shared account.')) return;
    setBusy(true);
    try { await mApi('/google/disconnect', { method: 'POST', body: {} }); await load(); onFlash({ type: 'ok', text: 'Google disconnected.' }); }
    catch (e) { onFlash({ type: 'warn', text: e.message }); }
    setBusy(false);
  };

  // Everyone connects their own Google account: meetings they schedule are hosted from it (they admit people)
  // and the emails they send from the CRM go from their Gmail. A manager can still share theirs as the
  // fallback for people who have not connected yet.
  const fallback = status.orgEmail || (status.delegation ? 'workspace account' : null);
  return (
    <>
      {/* Fully set up: nothing left to do, so only a small muted icon remains to manage it. A manager keeps the
          full bar while there is no main account, since people who have not connected need one for Google Meet. */}
      {status.connected && status.gmail && !(status.canConnectOrg && !status.orgEmail) && !showManage ? (
        <button onClick={() => setShowManage(true)} className="h-9 w-9 inline-flex items-center justify-center text-gray-300 hover:text-gray-600 cursor-pointer" title={`Your Google account is connected (${status.email}): you host your meetings and your emails go from your Gmail. Click to manage.`}><Link2 size={15} /></button>
      ) : status.connected ? (
        <div className="inline-flex items-center gap-2 h-9 pl-3 pr-2 rounded border border-emerald-200 bg-emerald-50 text-xs text-emerald-800" title="Your meetings are created on your Google Calendar with you as the Meet host">
          <CheckCircle2 size={13} /> Google connected · {status.email}
          {!status.gmail && <button onClick={() => connect(false)} disabled={busy} className="ml-1 px-2 py-0.5 rounded bg-amber-500 text-white hover:bg-amber-600 cursor-pointer" title="Reconnect and tick the Gmail permission so the emails you send from the CRM go from your own address">Allow Gmail</button>}
          {status.canConnectOrg && !status.shared && <button onClick={() => share(true)} disabled={busy} className="ml-1 px-2 py-0.5 rounded bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer" title="Use this Google account for the meetings of people who have not connected their own">Use as fallback</button>}
          {status.shared && <span className="ml-1 text-emerald-700">· fallback for everyone</span>}
          <button onClick={disconnect} disabled={busy} className="ml-1 text-emerald-700 hover:underline cursor-pointer">Disconnect</button>
          {showManage && <button onClick={() => setShowManage(false)} className="ml-1 text-emerald-700/70 hover:text-emerald-900 cursor-pointer" title="Hide">×</button>}
        </div>
      ) : (
        <div className="inline-flex items-center gap-1">
          <button onClick={() => connect(false)} disabled={busy} className={`${btn.ghost} !border-amber-300 !text-amber-800 bg-amber-50 hover:!bg-amber-100`} title={`Host your own Google Meet meetings and send CRM emails from your Gmail.${fallback ? ` Until you connect, your meetings are created from ${fallback}.` : ''}`}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />} Connect my Google account
          </button>
          <button onClick={() => setHelp(true)} className="h-9 w-9 inline-flex items-center justify-center text-gray-400 hover:text-gray-700 cursor-pointer" title={status.canConnectOrg ? 'How to set this up' : 'What does connecting Google do?'}><HelpCircle size={15} /></button>
        </div>
      )}
      {help && (status.canConnectOrg
        ? <GoogleSetupModal status={status} onClose={() => setHelp(false)} />
        : <GoogleConnectHelpModal status={status} onClose={() => setHelp(false)} />)}
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
const TABS = [
  ['upcoming', 'Upcoming'], ['today', 'Today'], ['needs_mom', 'Needs MOM'], ['completed', 'Completed'], ['cancelled', 'Cancelled'], ['all', 'All']
];

export default function MeetingsPage() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  // Managers and admins open on everyone's meetings; for anyone else the server answers with only
  // the meetings they host or attend, whatever is asked (data.canSeeAll says which applies).
  const [scope, setScope] = useState('all');
  const [tab, setTab] = useState('upcoming');
  const [projectFilter, setProjectFilter] = useState('');
  const [search, setSearch] = useState('');
  const [scheduling, setScheduling] = useState(false);
  const [flash, setFlash] = useState(null);
  const [error, setError] = useState('');
  const [googleKey, setGoogleKey] = useState(0);

  // Coming back from Google's consent screen: ?google=connected | ?google=error&msg=...
  const googleParam = params.get('google');
  useEffect(() => {
    if (!googleParam) return;
    const msg = params.get('msg');
    setFlash(googleParam !== 'connected'
      ? { type: 'warn', text: msg || 'Google could not be connected.' }
      : params.get('gmail') === '0'
        ? { type: 'warn', text: 'Google connected for meetings, but the Gmail permission was not ticked, so your emails still go from the shared account. Click "Allow Gmail" to add it.' }
        : { type: 'ok', text: 'Google connected. You now host the meetings you schedule, and emails you send from the CRM go from your Gmail.' });
    setGoogleKey(k => k + 1);
    const p = new URLSearchParams(params); p.delete('google'); p.delete('msg'); p.delete('gmail'); setParams(p, { replace: true });
  }, [googleParam]); // eslint-disable-line react-hooks/exhaustive-deps

  const detail = params.get('open') ? Number(params.get('open')) : null;
  const openDetail = (id) => { const p = new URLSearchParams(params); if (id) p.set('open', id); else p.delete('open'); setParams(p, { replace: true }); };

  const load = useCallback(() => {
    mApi(`?scope=${scope}`).then(d => { setData(d); setError(''); }).catch(e => setError(e.message));
  }, [scope]);
  useEffect(() => { load(); }, [load]);
  useLiveRefresh(['meetings', 'work'], () => load());
  useEffect(() => { if (!flash) return undefined; const t = setTimeout(() => setFlash(null), 9000); return () => clearTimeout(t); }, [flash]);

  const all = useMemo(() => data?.meetings || [], [data]);
  const now = new Date();
  const isToday = (m) => new Date(m.scheduled_at).toDateString() === now.toDateString();
  const needsMom = (m) => m.status === 'Scheduled' && new Date(m.scheduled_at) < now;
  const matchTab = (m, t) => ({
    upcoming: m.status === 'Scheduled' && new Date(m.scheduled_at) >= now,
    today: isToday(m) && m.status !== 'Cancelled',
    needs_mom: needsMom(m),
    completed: m.status === 'Completed',
    cancelled: m.status === 'Cancelled',
    all: true
  }[t]);
  const base = all.filter(m =>
    (!projectFilter || String(m.project_id) === String(projectFilter)) &&
    (!search || `${m.title} ${m.location || ''} ${m.project_name || ''} ${m.issue_key || ''} ${m.host_name || ''}`.toLowerCase().includes(search.toLowerCase())));
  const counts = Object.fromEntries(TABS.map(([t]) => [t, base.filter(m => matchTab(m, t)).length]));
  const shown = base.filter(m => matchTab(m, tab)).sort((a, b) => (tab === 'upcoming' || tab === 'today') ? new Date(a.scheduled_at) - new Date(b.scheduled_at) : new Date(b.scheduled_at) - new Date(a.scheduled_at));
  const projects = useMemo(() => { const map = new Map(); all.forEach(m => m.project_id && map.set(m.project_id, m.project_name)); return [...map.entries()]; }, [all]);
  const pendingMom = all.filter(needsMom).length;

  return (
    <div className="p-5 bg-[#F8FAFC] min-h-screen font-sans text-gray-900">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900">Meetings</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">Every meeting is a task: it lands in your project and sprint, on every attendee's calendar, and is completed by its MOM.</p>
        </div>
        <div className="flex items-center gap-2">
          {data?.canSeeAll && (
            <div className="flex bg-white border border-gray-200 rounded p-0.5">
              {[['all', 'All meetings'], ['mine', 'My meetings']].map(([v, l]) => (
                <button key={v} onClick={() => setScope(v)} className={`h-8 px-3 text-xs font-medium rounded cursor-pointer ${scope === v ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>{l}</button>
              ))}
            </div>
          )}
          <GoogleConnect onFlash={setFlash} refreshKey={googleKey} />
          <button onClick={load} className={btn.ghost} title="Refresh"><RefreshCw size={14} /></button>
          <button onClick={() => setScheduling(true)} className={btn.primary}><Plus size={14} /> Schedule meeting</button>
        </div>
      </div>

      {flash && (
        <div className={`mb-4 rounded-xl px-4 py-3 flex items-start gap-2.5 text-sm border ${flash.type === 'warn' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
          {flash.type === 'warn' ? <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> : <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" />}
          <span className="flex-1">{flash.text}</span>
          <button onClick={() => setFlash(null)} className="text-current opacity-60 hover:opacity-100 cursor-pointer"><X size={14} /></button>
        </div>
      )}

      {pendingMom > 0 && tab !== 'needs_mom' && (
        <button onClick={() => setTab('needs_mom')} className="mb-4 w-full text-left bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2.5 cursor-pointer hover:bg-amber-100/60">
          <AlertCircle size={16} className="text-amber-600 flex-shrink-0" />
          <span className="text-sm text-amber-800"><strong>{pendingMom} meeting{pendingMom > 1 ? 's have' : ' has'}</strong> started but no MOM yet — the linked tasks stay open until it is added. Click to review.</span>
        </button>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex flex-wrap gap-1.5">
          {TABS.map(([v, l]) => (
            <button key={v} onClick={() => setTab(v)} className={`h-7 px-3 text-xs rounded border cursor-pointer ${tab === v ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'}`}>
              {l} <span className="opacity-60 tabular-nums">{counts[v]}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {projects.length > 0 && (
            <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)} className="h-8 text-xs border border-gray-300 rounded px-2 bg-white outline-none focus:border-blue-500">
              <option value="">All projects</option>
              {projects.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          )}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search meetings…" className="h-8 w-52 pl-8 pr-2 text-xs border border-gray-300 rounded outline-none focus:border-blue-500 bg-white" />
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {!data ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-400" size={20} /></div>
      ) : shown.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Calendar size={36} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">Nothing here{tab !== 'all' ? ` under "${TABS.find(t => t[0] === tab)[1]}"` : ''}.</p>
          <p className="text-xs mt-1">Click "Schedule meeting" to create one.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map(m => <MeetingCard key={m.id} m={m} onClick={() => openDetail(m.id)} />)}
        </div>
      )}

      {scheduling && (
        <ScheduleModal
          me={data?.me}
          onClose={() => setScheduling(false)}
          onSaved={(id, warning) => {
            setScheduling(false); load(); openDetail(id);
            setFlash(warning ? { type: 'warn', text: `Meeting scheduled. ${warning}` } : { type: 'ok', text: 'Meeting scheduled. It is now a task, on the calendar, and attendees are notified.' });
          }}
        />
      )}
      {detail && <MeetingDetail key={detail} meetingId={detail} me={data?.me} onClose={() => openDetail(null)} onRefresh={load} onFlash={setFlash} />}
    </div>
  );
}

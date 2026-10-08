import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Plus, X, Calendar as CalendarIcon, Clock, MapPin, Users, AlignLeft,
  Video, ExternalLink, Trash2, Pencil, Ban, CheckSquare, Flag, Search, Link2, RefreshCw, AlertTriangle
} from 'lucide-react';
import { API_BASE_URL } from '../../config/environment';
import { useAuth } from '../../hooks/useAuth';
import { showSuccessToast, showErrorToast } from '../../utils/toast';

/* ───────────────────────── constants & date helpers ───────────────────────── */

const CATEGORY_STYLE = {
  'Meeting': { dot: '#2563eb', chip: 'bg-blue-50 text-blue-800 border-blue-200' },
  'Online meeting': { dot: '#0891b2', chip: 'bg-cyan-50 text-cyan-800 border-cyan-200' },
  'Client call': { dot: '#7c3aed', chip: 'bg-violet-50 text-violet-800 border-violet-200' },
  'Review': { dot: '#db2777', chip: 'bg-pink-50 text-pink-800 border-pink-200' },
  'Training': { dot: '#059669', chip: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  'Deadline': { dot: '#dc2626', chip: 'bg-red-50 text-red-800 border-red-200' },
  'Reminder': { dot: '#d97706', chip: 'bg-amber-50 text-amber-800 border-amber-200' },
  'Holiday': { dot: '#65a30d', chip: 'bg-lime-50 text-lime-800 border-lime-200' },
  'Other': { dot: '#6b7280', chip: 'bg-gray-50 text-gray-800 border-gray-200' }
};
const LAYER_STYLE = {
  ticket: { dot: '#ea580c', chip: 'bg-orange-50 text-orange-800 border-orange-200' },
  ticketDone: { dot: '#9ca3af', chip: 'bg-gray-50 text-gray-500 border-gray-200 line-through' },
  sprint: { dot: '#4f46e5', chip: 'bg-indigo-50 text-indigo-800 border-indigo-200' }
};
const CATEGORIES = Object.keys(CATEGORY_STYLE);
const VIEWS = ['Month', 'Week', 'Day', 'List'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 07:00 – 20:00
const HOUR_PX = 48;

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const sameDay = (a, b) => ymd(a) === ymd(b);
const startOfWeek = (d) => addDays(startOfDay(d), -startOfDay(d).getDay());
const fmtTime = (d) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const fmtDay = (d) => d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
const fmtLong = (d) => d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

const styleOf = (e) => e.source === 'ticket' ? (e.done ? LAYER_STYLE.ticketDone : LAYER_STYLE.ticket)
  : e.source === 'sprint' ? LAYER_STYLE.sprint
    : (CATEGORY_STYLE[e.category] || CATEGORY_STYLE.Other);

// Visible range for the current view (padded to whole weeks for the month grid).
const rangeFor = (view, cursor) => {
  if (view === 'Day') return [startOfDay(cursor), addDays(startOfDay(cursor), 1)];
  if (view === 'Week') { const s = startOfWeek(cursor); return [s, addDays(s, 7)]; }
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const s = startOfWeek(first);
  const lastOfMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
  const e = addDays(startOfWeek(lastOfMonth), 7);
  return [s, e];
};

// Does an item touch the given day?
const onDay = (item, day) => {
  const s = startOfDay(item.startDate); const e = item.endDate;
  const d0 = startOfDay(day); const d1 = addDays(d0, 1);
  if (item.allDay) return s <= d0 && startOfDay(e) >= d0;
  return item.startDate < d1 && e > d0;
};

const googleCalendarUrl = (ev) => {
  const f = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title,
    dates: `${f(ev.startDate)}/${f(ev.endDate)}`,
    details: `${ev.description || ''}${ev.meetingLink ? `\n\nJoin: ${ev.meetingLink}` : ''}`,
    location: ev.meetingLink || ev.location || '',
    add: (ev.guestEmails || []).join(',')
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

const workspaceBase = () => {
  const segs = window.location.pathname.split('/').filter(Boolean);
  return segs.length >= 3 ? `/${segs.slice(0, 3).join('/')}` : '';
};

/* ───────────────────────── event form ───────────────────────── */

const blankForm = (date, startHour = 10) => ({
  title: '', category: 'Meeting', date: ymd(date), endDate: ymd(date),
  startTime: `${pad(startHour)}:00`, endTime: `${pad(Math.min(startHour + 1, 23))}:00`,
  allDay: false, mode: 'offline', meetingLink: '', location: '', description: '',
  attendeeIds: [], guestEmails: [], status: 'Scheduled'
});

const formFromEvent = (ev) => ({
  title: ev.title, category: ev.category, date: ymd(ev.startDate), endDate: ymd(ev.allDay ? addDays(ev.endDate, -1) : ev.endDate),
  startTime: hm(ev.startDate), endTime: hm(ev.endDate), allDay: ev.allDay, mode: ev.mode || 'offline',
  meetingLink: ev.meetingLink || '', location: ev.location || '', description: ev.description || '',
  attendeeIds: ev.attendeeIds || [], guestEmails: ev.guestEmails || [], status: ev.status
});

function AttendeePicker({ users, selected, onChange, meId }) {
  const [q, setQ] = useState('');
  const chosen = users.filter(u => selected.includes(u.id));
  const options = users.filter(u => u.id !== meId && !selected.includes(u.id) &&
    (!q.trim() || u.name.toLowerCase().includes(q.trim().toLowerCase()) || (u.department || '').toLowerCase().includes(q.trim().toLowerCase())))
    .slice(0, 8);
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {chosen.map(u => (
          <span key={u.id} className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-800 border border-blue-200 rounded-full pl-2 pr-1 py-0.5">
            {u.name}
            <button type="button" onClick={() => onChange(selected.filter(id => id !== u.id))} className="hover:bg-blue-100 rounded-full p-0.5 cursor-pointer" aria-label={`Remove ${u.name}`}><X size={11} /></button>
          </span>
        ))}
      </div>
      <div className="relative">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search staff to invite"
          className="w-full border border-gray-300 rounded pl-8 pr-2 py-2 text-sm focus:outline-none focus:border-blue-500" />
      </div>
      {q.trim() && (
        <div className="border border-gray-200 rounded mt-1 max-h-40 overflow-y-auto bg-white shadow-sm">
          {options.length === 0 ? <div className="px-3 py-2 text-xs text-gray-500">No matching staff</div> : options.map(u => (
            <button type="button" key={u.id} onClick={() => { onChange([...selected, u.id]); setQ(''); }}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 flex justify-between cursor-pointer">
              <span>{u.name}</span><span className="text-xs text-gray-500">{u.department}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function GuestEmails({ emails, onChange }) {
  const [v, setV] = useState('');
  const add = () => {
    const clean = v.trim().replace(/,$/, '').toLowerCase();
    if (!clean) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) { showErrorToast('That email address is not valid'); return; }
    if (!emails.includes(clean)) onChange([...emails, clean]);
    setV('');
  };
  return (
    <div className="flex flex-wrap gap-1.5 p-1.5 border border-gray-300 rounded min-h-[40px] focus-within:border-blue-500">
      {emails.map(e => (
        <span key={e} className="inline-flex items-center gap-1 text-xs bg-gray-100 rounded-full pl-2 pr-1 py-0.5">
          {e}<button type="button" onClick={() => onChange(emails.filter(x => x !== e))} className="hover:bg-gray-200 rounded-full p-0.5 cursor-pointer" aria-label={`Remove ${e}`}><X size={11} /></button>
        </span>
      ))}
      <input value={v} onChange={e => setV(e.target.value)} onBlur={add}
        onKeyDown={e => { if (['Enter', ','].includes(e.key)) { e.preventDefault(); add(); } }}
        placeholder={emails.length ? '' : 'client@example.com, press Enter'}
        className="flex-1 min-w-[160px] text-sm outline-none px-1" />
    </div>
  );
}

function EventModal({ initial, editing, users, meId, onClose, onSaved }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [linkBusy, setLinkBusy] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const generateLink = async () => {
    setLinkBusy(true);
    try {
      const res = await fetch(`${API_BASE_URL}/create-meeting`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const data = await res.json();
      if (!res.ok || !data.meetingLink) throw new Error('Could not create a meeting room');
      set('meetingLink', data.meetingLink);
    } catch (e) {
      showErrorToast(e.message);
    } finally {
      setLinkBusy(false);
    }
  };

  const save = async () => {
    if (!form.title.trim()) { showErrorToast('Add a title'); return; }
    const start = form.allDay ? new Date(`${form.date}T00:00:00`) : new Date(`${form.date}T${form.startTime}:00`);
    const end = form.allDay ? addDays(new Date(`${form.endDate || form.date}T00:00:00`), 1) : new Date(`${form.date}T${form.endTime}:00`);
    if (isNaN(start) || isNaN(end)) { showErrorToast('Check the date and times'); return; }
    if (end <= start) { showErrorToast(form.allDay ? 'The end date must be on or after the start date' : 'The end time must be after the start time'); return; }
    if (form.mode === 'online' && form.meetingLink && !/^https?:\/\//i.test(form.meetingLink)) { showErrorToast('The meeting link must start with https://'); return; }

    setSaving(true);
    try {
      const payload = {
        title: form.title, category: form.category, start: start.toISOString(), end: end.toISOString(), allDay: form.allDay,
        mode: form.mode, meetingLink: form.mode === 'online' ? form.meetingLink : '', location: form.mode === 'offline' ? form.location : '',
        description: form.description, attendeeIds: form.attendeeIds, guestEmails: form.guestEmails
      };
      const res = await fetch(`${API_BASE_URL}/calendar/events${editing ? `/${editing.id}` : ''}`, {
        method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not save the event');
      showSuccessToast(editing ? 'Event updated' : (form.attendeeIds.length ? `Event saved and ${form.attendeeIds.length} invited` : 'Event saved'));
      onSaved();
    } catch (e) {
      showErrorToast(e.message);
    } finally {
      setSaving(false);
    }
  };

  const label = 'text-xs font-medium text-gray-700 block mb-1';
  const input = 'w-full border border-gray-300 rounded px-2.5 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white';
  return (
    <div className="fixed inset-0 z-[1000] bg-black/40 flex items-center justify-center p-4" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded shadow-xl w-full max-w-xl max-h-[92vh] flex flex-col" role="dialog" aria-label={editing ? 'Edit event' : 'New event'}>
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base  text-gray-900">{editing ? 'Edit event' : 'New event'}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-500 cursor-pointer" aria-label="Close"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto">
          <div>
            <label className={label} htmlFor="ev-title">Title</label>
            <input id="ev-title" autoFocus className={input} value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Sprint planning" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label} htmlFor="ev-cat">Category</label>
              <select id="ev-cat" className={input} value={form.category} onChange={e => set('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <label className="flex items-end gap-2 text-sm text-gray-700 pb-2 cursor-pointer select-none">
              <input type="checkbox" checked={form.allDay} onChange={e => set('allDay', e.target.checked)} /> All day
            </label>
          </div>
          {form.allDay ? (
            <div className="grid grid-cols-2 gap-3">
              <div><label className={label} htmlFor="ev-d1">From</label><input id="ev-d1" type="date" className={input} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value, endDate: f.endDate < e.target.value ? e.target.value : f.endDate }))} /></div>
              <div><label className={label} htmlFor="ev-d2">To</label><input id="ev-d2" type="date" className={input} min={form.date} value={form.endDate} onChange={e => set('endDate', e.target.value)} /></div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <div><label className={label} htmlFor="ev-d">Date</label><input id="ev-d" type="date" className={input} value={form.date} onChange={e => set('date', e.target.value)} /></div>
              <div><label className={label} htmlFor="ev-s">Start</label><input id="ev-s" type="time" className={input} value={form.startTime} onChange={e => set('startTime', e.target.value)} /></div>
              <div><label className={label} htmlFor="ev-e">End</label><input id="ev-e" type="time" className={input} value={form.endTime} onChange={e => set('endTime', e.target.value)} /></div>
            </div>
          )}

          <div>
            <span className={label}>Where</span>
            <div className="inline-flex rounded border border-gray-300 overflow-hidden mb-2">
              {[['offline', 'In person'], ['online', 'Online']].map(([v, l]) => (
                <button type="button" key={v} onClick={() => set('mode', v)}
                  className={`px-3 py-1.5 text-xs font-medium cursor-pointer ${form.mode === v ? 'bg-red-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>{l}</button>
              ))}
            </div>
            {form.mode === 'online' ? (
              <div className="flex gap-2">
                <input className={`${input} font-mono text-xs`} value={form.meetingLink} onChange={e => set('meetingLink', e.target.value)}
                  placeholder="Paste a Google Meet / Zoom link, or generate one" aria-label="Meeting link" />
                <button type="button" onClick={generateLink} disabled={linkBusy}
                  className="shrink-0 inline-flex items-center gap-1 px-3 text-xs font-medium border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 cursor-pointer">
                  <Link2 size={13} /> {linkBusy ? 'Creating…' : 'Generate'}
                </button>
              </div>
            ) : (
              <input className={input} value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Conference room 2" aria-label="Location" />
            )}
            {form.mode === 'online' && <p className="text-[11px] text-gray-500 mt-1">“Generate” creates a free Jitsi meeting room anyone can join. For Google Meet or Zoom, create the meeting there and paste its link.</p>}
          </div>

          <div>
            <span className={label}>Invite staff</span>
            <AttendeePicker users={users} selected={form.attendeeIds} onChange={v => set('attendeeIds', v)} meId={meId} />
            <p className="text-[11px] text-gray-500 mt-1">They get a notification and see the event on their calendar.</p>
          </div>
          <div>
            <span className={label}>Guest emails (outside the company)</span>
            <GuestEmails emails={form.guestEmails} onChange={v => set('guestEmails', v)} />
            <p className="text-[11px] text-gray-500 mt-1">Guests are added to the invite when you use “Add to Google Calendar”.</p>
          </div>
          {!editing && new Date(`${form.date}T${form.allDay ? '00:00' : form.startTime}:00`) < new Date(Date.now() - 15 * 60 * 1000) && ['Meeting', 'Online meeting', 'Client call', 'Review', 'Training'].includes(form.category) && (
            <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">
              This meeting is in the past. Meetings added after they happened only count in performance reports when a manager adds them.
            </p>
          )}
          <div>
            <label className={label} htmlFor="ev-desc">Notes / agenda</label>
            <textarea id="ev-desc" rows={3} className={`${input} resize-none`} value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
        </div>
        <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer">Cancel</button>
          <button onClick={save} disabled={saving} className="px-4 py-1.5 text-sm font-medium bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 cursor-pointer">
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Save event'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── event details ───────────────────────── */

function EventDetails({ ev, users, onClose, onEdit, onChanged }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const st = styleOf(ev);
  const nameOf = (id) => users.find(u => u.id === id)?.name || `User #${id}`;

  const update = async (body, msg) => {
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE_URL}/calendar/events/${ev.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Update failed');
      showSuccessToast(msg); onChanged();
    } catch (e) { showErrorToast(e.message); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!window.confirm(`Delete "${ev.title}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE_URL}/calendar/events/${ev.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      showSuccessToast('Event deleted'); onChanged();
    } catch (e) { showErrorToast(e.message); } finally { setBusy(false); }
  };

  const when = ev.allDay
    ? (sameDay(ev.startDate, addDays(ev.endDate, -1)) || ev.source !== 'event' ? fmtLong(ev.startDate) : `${fmtLong(ev.startDate)} – ${fmtLong(addDays(ev.endDate, -1))}`)
    : `${fmtLong(ev.startDate)}, ${fmtTime(ev.startDate)} – ${fmtTime(ev.endDate)}`;

  return (
    <div className="fixed inset-0 z-[1000] bg-black/30 flex items-center justify-center p-4" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto" role="dialog" aria-label={ev.title}>
        <div className="px-5 py-4 border-b border-gray-200 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded border ${st.chip}`}>
              {ev.source === 'ticket' ? 'Ticket due' : ev.source === 'sprint' ? 'Sprint' : ev.category}
            </span>
            {ev.status === 'Cancelled' && <span className="ml-1.5 inline-block text-[11px]  px-2 py-0.5 rounded bg-red-100 text-red-800">Cancelled</span>}
            <h3 className={`text-base  text-gray-900 mt-1.5 break-words ${ev.status === 'Cancelled' ? 'line-through' : ''}`}>{ev.title}</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-500 cursor-pointer shrink-0" aria-label="Close"><X size={16} /></button>
        </div>
        <div className="px-5 py-4 space-y-3 text-sm text-gray-700">
          <div className="flex gap-2"><Clock size={15} className="text-gray-400 shrink-0 mt-0.5" />{when}</div>
          {ev.source === 'ticket' && (
            <>
              <div className="flex gap-2"><Users size={15} className="text-gray-400 shrink-0 mt-0.5" />Assignee: {ev.assignee || 'Unassigned'} · Status: {ev.status}</div>
              <button onClick={() => navigate(`${workspaceBase()}/kanban?ticketKey=${encodeURIComponent(ev.ticketKey)}`)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:underline cursor-pointer"><ExternalLink size={14} /> Open ticket</button>
            </>
          )}
          {ev.source === 'event' && (
            <>
              {ev.meetingLink && (
                <a href={ev.meetingLink} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2 bg-red-700 hover:bg-blue-700 text-white rounded font-medium">
                  <Video size={15} /> Join meeting
                </a>
              )}
              {ev.location && <div className="flex gap-2"><MapPin size={15} className="text-gray-400 shrink-0 mt-0.5" />{ev.location}</div>}
              {ev.meetingLink && <div className="text-xs text-gray-500 break-all pl-6">{ev.meetingLink}</div>}
              {(ev.attendeeIds.length > 0 || ev.guestEmails.length > 0) && (
                <div className="flex gap-2">
                  <Users size={15} className="text-gray-400 shrink-0 mt-0.5" />
                  <div className="flex flex-wrap gap-1">
                    {ev.attendeeIds.map(id => <span key={id} className="text-xs bg-blue-50 text-blue-800 rounded-full px-2 py-0.5">{nameOf(id)}</span>)}
                    {ev.guestEmails.map(e => <span key={e} className="text-xs bg-gray-100 rounded-full px-2 py-0.5">{e}</span>)}
                  </div>
                </div>
              )}
              {ev.description && <div className="flex gap-2"><AlignLeft size={15} className="text-gray-400 shrink-0 mt-0.5" /><span className="whitespace-pre-wrap break-words">{ev.description}</span></div>}
              <div className="text-xs text-gray-500">Organised by {ev.createdByName || 'unknown'}{ev.department ? ` · ${ev.department}` : ''}</div>
              <a href={googleCalendarUrl(ev)} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm font-medium">
                <CalendarIcon size={14} /> Add to Google Calendar{ev.guestEmails.length ? ' (invites guests)' : ''}
              </a>
              {ev.canEdit && (
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <button disabled={busy} onClick={() => onEdit(ev)} className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 cursor-pointer disabled:opacity-50"><Pencil size={13} /> Edit</button>
                  {ev.status !== 'Cancelled' ? (
                    <button disabled={busy} onClick={() => update({ status: 'Cancelled' }, 'Event cancelled; attendees notified')} className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 cursor-pointer disabled:opacity-50"><Ban size={13} /> Cancel event</button>
                  ) : (
                    <button disabled={busy} onClick={() => update({ status: 'Scheduled' }, 'Event restored')} className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 cursor-pointer disabled:opacity-50"><RefreshCw size={13} /> Restore</button>
                  )}
                  <button disabled={busy} onClick={remove} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-red-700 border border-red-200 rounded hover:bg-red-50 cursor-pointer disabled:opacity-50" aria-label="Delete event"><Trash2 size={13} /></button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── views ───────────────────────── */

const Chip = ({ item, onOpen, showTime = true }) => {
  const st = styleOf(item);
  const Icon = item.source === 'ticket' ? CheckSquare : item.source === 'sprint' ? Flag : null;
  return (
    <button type="button" onClick={e => { e.stopPropagation(); onOpen(item); }} title={item.title}
      className={`w-full text-left text-[11px] leading-tight px-1.5 py-0.5 rounded border truncate cursor-pointer hover:brightness-95 ${st.chip} ${item.status === 'Cancelled' ? 'line-through opacity-60' : ''}`}>
      {Icon && <Icon size={10} className="inline mr-1 -mt-0.5" aria-hidden="true" />}
      {showTime && !item.allDay && <span className=" mr-1">{fmtTime(item.startDate)}</span>}
      {item.title}
    </button>
  );
};

function MonthView({ cursor, items, today, onOpen, onCreate }) {
  const [start, end] = rangeFor('Month', cursor);
  const count = Math.round((end - start) / 86400000);
  const days = Array.from({ length: count }, (_, i) => addDays(start, i));
  const rows = Math.ceil(days.length / 7);
  return (
    <div className="bg-white border border-gray-200 rounded overflow-hidden">
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
        {DAY_NAMES.map(d => <div key={d} className="py-2 text-center text-xs  text-gray-600">{d}</div>)}
      </div>
      <div className="grid grid-cols-7" style={{ gridTemplateRows: `repeat(${rows}, minmax(110px, 1fr))` }}>
        {days.map(day => {
          const inMonth = day.getMonth() === cursor.getMonth();
          const isToday = sameDay(day, today);
          const list = items.filter(it => onDay(it, day)).sort((a, b) => (b.allDay - a.allDay) || (a.startDate - b.startDate));
          return (
            <div key={ymd(day)} onClick={() => onCreate(day)}
              className={`border-b border-r border-gray-100 p-1.5 min-w-0 cursor-pointer hover:bg-blue-50/30 ${inMonth ? 'bg-white' : 'bg-gray-50/70'}`}>
              <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs mb-1 ${isToday ? 'bg-red-600 text-white ' : inMonth ? 'text-gray-800' : 'text-gray-400'}`}>{day.getDate()}</div>
              <div className="space-y-0.5">
                {list.slice(0, 3).map(it => <Chip key={it.id} item={it} onOpen={onOpen} />)}
                {list.length > 3 && <div className="text-[11px] text-gray-500 pl-1">+{list.length - 3} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimeGridView({ days, items, today, onOpen, onCreate }) {
  return (
    <div className="bg-white border border-gray-200 rounded overflow-hidden">
      <div className="grid border-b border-gray-200 bg-gray-50" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))` }}>
        <div />
        {days.map(d => (
          <div key={ymd(d)} className={`py-2 text-center text-xs  ${sameDay(d, today) ? 'text-red-600' : 'text-gray-600'}`}>{fmtDay(d)}</div>
        ))}
      </div>
      {/* all-day row */}
      <div className="grid border-b border-gray-200" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))` }}>
        <div className="text-[10px] text-gray-500 p-1 text-right">All day</div>
        {days.map(d => (
          <div key={ymd(d)} className="p-1 space-y-0.5 border-l border-gray-100 min-h-[32px]">
            {items.filter(it => it.allDay && onDay(it, d)).map(it => <Chip key={it.id} item={it} onOpen={onOpen} showTime={false} />)}
          </div>
        ))}
      </div>
      <div className="grid relative" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))` }}>
        <div>{HOURS.map(h => <div key={h} style={{ height: HOUR_PX }} className="text-[10px] text-gray-500 text-right pr-1.5 -mt-1.5">{pad(h)}:00</div>)}</div>
        {days.map(d => {
          const dayItems = items.filter(it => !it.allDay && onDay(it, d));
          const base = new Date(d.getFullYear(), d.getMonth(), d.getDate(), HOURS[0]);
          return (
            <div key={ymd(d)} className="relative border-l border-gray-100">
              {HOURS.map(h => (
                <div key={h} style={{ height: HOUR_PX }} className="border-b border-gray-100 hover:bg-blue-50/30 cursor-pointer"
                  onClick={() => onCreate(d, h)} aria-label={`New event ${fmtDay(d)} ${pad(h)}:00`} />
              ))}
              {sameDay(d, today) && (() => {
                const mins = (today - base) / 60000;
                return mins >= 0 && mins <= HOURS.length * 60 ? <div className="absolute left-0 right-0 border-t-2 border-red-500 z-10 pointer-events-none" style={{ top: (mins / 60) * HOUR_PX }} /> : null;
              })()}
              {dayItems.map((it) => {
                const s = Math.max(0, (Math.max(it.startDate, base) - base) / 60000);
                const e = Math.min(HOURS.length * 60, (it.endDate - base) / 60000);
                if (e <= 0 || s >= HOURS.length * 60) return null;
                const st = styleOf(it);
                const overlap = dayItems.filter(o => o.startDate < it.endDate && o.endDate > it.startDate);
                const col = overlap.indexOf(it);
                const width = 100 / overlap.length;
                return (
                  <button key={it.id} type="button" onClick={() => onOpen(it)} title={it.title}
                    className={`absolute rounded border px-1.5 py-0.5 text-left overflow-hidden cursor-pointer hover:brightness-95 z-20 ${st.chip} ${it.status === 'Cancelled' ? 'line-through opacity-60' : ''}`}
                    style={{ top: (s / 60) * HOUR_PX + 1, height: Math.max(20, ((e - s) / 60) * HOUR_PX - 2), left: `calc(${col * width}% + 2px)`, width: `calc(${width}% - 4px)` }}>
                    <div className="text-[11px]  truncate">{it.title}</div>
                    <div className="text-[10px] truncate">{fmtTime(it.startDate)} – {fmtTime(it.endDate)}</div>
                  </button>
                );
              })}
              {hiddenNote(dayItems, base)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
// Events entirely outside the visible hours still need to be reachable.
const hiddenNote = (dayItems, base) => {
  const hidden = dayItems.filter(it => (it.endDate - base) / 60000 <= 0 || (it.startDate - base) / 60000 >= HOURS.length * 60);
  return hidden.length ? <div className="absolute bottom-0 left-0 right-0 text-[10px] text-gray-500 bg-white/90 px-1">+{hidden.length} outside 07:00–21:00 (see List)</div> : null;
};

function ListView({ items, onOpen, from }) {
  const groups = useMemo(() => {
    const map = new Map();
    items.slice().sort((a, b) => a.startDate - b.startDate).forEach(it => {
      const key = ymd(it.startDate < from ? from : it.startDate);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(it);
    });
    return [...map.entries()];
  }, [items, from]);
  if (!groups.length) return <div className="bg-white border border-dashed border-gray-300 rounded p-10 text-center text-sm text-gray-500">Nothing scheduled in this month.</div>;
  return (
    <div className="bg-white border border-gray-200 rounded overflow-hidden">
      {groups.map(([day, list]) => (
        <div key={day}>
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs  text-gray-600">{fmtLong(new Date(`${day}T00:00:00`))}</div>
          {list.map(it => {
            const st = styleOf(it);
            return (
              <button key={it.id} type="button" onClick={() => onOpen(it)} className="w-full text-left px-4 py-2.5 border-b border-gray-100 hover:bg-gray-50 flex items-center gap-3 cursor-pointer">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: st.dot }} aria-hidden="true" />
                <span className="w-28 shrink-0 text-xs text-gray-600 tabular-nums">{it.allDay ? 'All day' : `${fmtTime(it.startDate)} – ${fmtTime(it.endDate)}`}</span>
                <span className={`flex-1 min-w-0 truncate text-sm text-gray-900 ${it.status === 'Cancelled' || it.done ? 'line-through text-gray-500' : ''}`}>{it.title}</span>
                <span className={`text-[11px] px-2 py-0.5 rounded border shrink-0 ${st.chip}`}>{it.source === 'ticket' ? 'Ticket due' : it.source === 'sprint' ? 'Sprint' : it.category}</span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/* ───────────────────────── page ───────────────────────── */

export default function TeamCalendar({ department }) {
  const { user } = useAuth();
  const path = window.location.pathname.toLowerCase();
  const dept = department || (path.includes('/marketing') || path.includes('/seo-gmb') ? 'Marketing' : path.startsWith('/it/') ? 'IT' : (user?.department || '').replace(/\s*department\s*$/i, '') || 'Team');

  const [now, setNow] = useState(() => new Date());
  const [view, setView] = useState(() => { try { return localStorage.getItem('calendarView') || 'Month'; } catch (e) { return 'Month'; } });
  const [cursor, setCursor] = useState(() => new Date());
  const [data, setData] = useState({ events: [], items: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  // Team tickets can number in the dozens a month, so that layer starts switched off.
  const [hidden, setHidden] = useState(() => new Set(['teamTicket']));
  const [modal, setModal] = useState(null); // { initial, editing }
  const [openItem, setOpenItem] = useState(null);

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t); }, []);
  useEffect(() => { try { localStorage.setItem('calendarView', view); } catch (e) { /* ignore */ } }, [view]);

  const [from, to] = useMemo(() => rangeFor(view === 'List' ? 'Month' : view, cursor), [view, cursor]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/calendar/events?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not load the calendar');
      setData({ events: json.events || [], items: json.items || [] });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [from, to]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/users?limit=300&excludeSystem=true`).then(r => r.json()).then(list => {
      const arr = Array.isArray(list) ? list : (list?.value || []);
      setUsers(arr.filter(u => String(u.status || 'Active') === 'Active')
        .map(u => ({ id: u.id, name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username, department: (u.department || '').replace(/\s*department\s*$/i, '') }))
        .sort((a, b) => a.name.localeCompare(b.name)));
    }).catch(() => { });
  }, []);

  const allItems = useMemo(() => [
    ...data.events.map(e => ({ ...e, startDate: new Date(e.start), endDate: new Date(e.end) })),
    ...data.items.map(i => { const s = new Date(i.start); return { ...i, startDate: startOfDay(s), endDate: addDays(startOfDay(s), 1) }; })
  ], [data]);

  const layerKey = (it) => it.source === 'event' ? it.category : it.source === 'ticket' ? (it.mine ? 'ticket' : 'teamTicket') : it.source;
  const visible = allItems.filter(it => !hidden.has(layerKey(it)));
  const toggle = (k) => setHidden(h => { const n = new Set(h); n.has(k) ? n.delete(k) : n.add(k); return n; });

  const step = (dir) => setCursor(c => view === 'Day' ? addDays(c, dir) : view === 'Week' ? addDays(c, 7 * dir) : new Date(c.getFullYear(), c.getMonth() + dir, 1));
  const title = view === 'Day' ? fmtLong(cursor)
    : view === 'Week' ? `${fmtDay(from)} – ${fmtDay(addDays(to, -1))} ${addDays(to, -1).getFullYear()}`
      : cursor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  const openCreate = (day = now, hour) => {
    const h = hour ?? (sameDay(day, now) ? Math.min(Math.max(now.getHours() + 1, 7), 20) : 10);
    setModal({ initial: blankForm(day, h), editing: null });
  };

  const upcoming = allItems.filter(it => it.endDate > now && it.startDate < addDays(now, 8) && it.status !== 'Cancelled' && !it.done)
    .sort((a, b) => a.startDate - b.startDate).slice(0, 8);
  const todayCount = allItems.filter(it => onDay(it, now) && it.status !== 'Cancelled').length;

  const days = view === 'Day' ? [startOfDay(cursor)] : Array.from({ length: 7 }, (_, i) => addDays(from, i));

  const layers = [
    ...CATEGORIES.map(c => ({ key: c, label: c, dot: CATEGORY_STYLE[c].dot })),
    { key: 'ticket', label: 'My ticket due dates', dot: LAYER_STYLE.ticket.dot },
    ...(data.items.some(i => i.source === 'ticket' && !i.mine) ? [{ key: 'teamTicket', label: 'Team ticket due dates', dot: LAYER_STYLE.ticket.dot }] : []),
    { key: 'sprint', label: 'Running sprint start / end', dot: LAYER_STYLE.sprint.dot }
  ];

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="w-full lg:w-64 shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-gray-200 p-4 space-y-6">
        <button onClick={() => openCreate()} className="w-full inline-flex items-center justify-center gap-2 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded cursor-pointer">
          <Plus size={16} /> New event
        </button>
        <div>
          <h3 className="text-xs  text-gray-700 mb-2">Next 7 days</h3>
          {upcoming.length === 0 ? <p className="text-xs text-gray-500">Nothing coming up.</p> : (
            <ul className="space-y-2">
              {upcoming.map(it => (
                <li key={it.id}>
                  <button onClick={() => setOpenItem(it)} className="w-full text-left flex gap-2 hover:bg-gray-50 rounded p-1 -m-1 cursor-pointer">
                    <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: styleOf(it).dot }} aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block text-xs font-medium text-gray-900 truncate">{it.title}</span>
                      <span className="block text-[11px] text-gray-500">{fmtDay(it.startDate)}{it.allDay ? '' : ` · ${fmtTime(it.startDate)}`}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="text-xs  text-gray-700 mb-2">Show</h3>
          <ul className="space-y-1">
            {layers.map(l => (
              <li key={l.key}>
                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer select-none">
                  <input type="checkbox" checked={!hidden.has(l.key)} onChange={() => toggle(l.key)} />
                  <span className="w-2.5 h-2.5 rounded" style={{ background: l.dot }} aria-hidden="true" /> {l.label}
                </label>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 p-4 md:p-6 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl  text-gray-900">{dept} calendar</h1>
            <p className="text-sm text-gray-600">Meetings and events for your team, plus ticket due dates and sprints. Today: {fmtLong(now)} · {todayCount} item{todayCount === 1 ? '' : 's'}</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button onClick={() => setCursor(new Date())} className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-pointer">Today</button>
            <button onClick={() => step(-1)} className="p-1.5 border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-pointer" aria-label="Previous"><ChevronLeft size={15} /></button>
            <button onClick={() => step(1)} className="p-1.5 border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-pointer" aria-label="Next"><ChevronRight size={15} /></button>
            <h2 className="text-base  text-gray-900 ml-1">{title}</h2>
            {loading && <span className="text-xs text-gray-500 ml-2">Loading…</span>}
          </div>
          <div className="inline-flex rounded border border-gray-300 overflow-hidden" role="tablist" aria-label="Calendar view">
            {VIEWS.map(v => (
              <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)}
                className={`px-3 py-1.5 text-xs font-medium border-r border-gray-300 last:border-r-0 cursor-pointer ${view === v ? 'bg-red-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>{v}</button>
            ))}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm bg-red-50 border border-red-200 text-red-800 rounded p-3">
            <AlertTriangle size={15} /> {error}
            <button onClick={load} className="ml-auto text-xs font-medium underline cursor-pointer">Retry</button>
          </div>
        )}

        <div className="overflow-x-auto">
          <div className={view === 'Week' ? 'min-w-[760px]' : view === 'Month' ? 'min-w-[680px]' : ''}>
            {view === 'Month' && <MonthView cursor={cursor} items={visible} today={now} onOpen={setOpenItem} onCreate={(d) => openCreate(d)} />}
            {(view === 'Week' || view === 'Day') && <TimeGridView days={days} items={visible} today={now} onOpen={setOpenItem} onCreate={openCreate} />}
            {view === 'List' && (() => {
              const mStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
              const mEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
              return <ListView items={visible.filter(it => it.startDate < mEnd && it.endDate > mStart)} onOpen={setOpenItem} from={mStart} />;
            })()}
          </div>
        </div>
        <p className="text-[11px] text-gray-500">Click an empty day or time slot to add an event. Meetings that have taken place count towards each attendee's performance report.</p>
      </main>

      {modal && (
        <EventModal initial={modal.initial} editing={modal.editing} users={users} meId={user?.id}
          onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />
      )}
      {openItem && (
        <EventDetails ev={openItem} users={users} onClose={() => setOpenItem(null)}
          onEdit={(ev) => { setOpenItem(null); setModal({ initial: formFromEvent(ev), editing: ev }); }}
          onChanged={() => { setOpenItem(null); load(); }} />
      )}
    </div>
  );
}

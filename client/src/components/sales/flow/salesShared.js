import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  X, Loader2, Phone, Mail, MessageCircle, Users, MapPin, StickyNote, CalendarClock, CheckCircle2, XCircle, PauseCircle,
  ArrowRightLeft, FileText, Send, Receipt, Wallet, Trophy, ThumbsDown, RotateCcw, UserCheck, Clock, Video, AlertTriangle, PlusCircle, RefreshCw
} from 'lucide-react';
import { API_BASE_URL } from '../../../config/environment';

/**
 * Shared pieces for the sales flow pages (pipeline, lead / deal workspaces, quotations,
 * agenda). Server: server/routes/sales-flow-routes.js.
 */

export const api = async (path, opts = {}) => {
  const res = await fetch(`${API_BASE_URL}/sales-flow${path}`, {
    ...opts,
    headers: { ...(opts.body ? { 'Content-Type': 'application/json' } : {}), ...(opts.headers || {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
};
export const pdfUrl = (id, download) => `${API_BASE_URL}/sales-flow/quotations/${id}/pdf${download ? '?download=1' : ''}`;

/** "/sales/<designation>/<username>" for links between the sales pages. */
export const useSalesBase = () => {
  const { designation, username } = useParams();
  const seg = window.location.pathname.split('/')[1] || 'sales';
  return `/${seg}/${designation}/${username}`;
};

export const money = (n, cur = 'INR') => `${cur === 'INR' ? '₹' : `${cur} `}${(Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
export const money2 = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const ymd = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
/** A date from the API (a DATE column arrives as local midnight in UTC) as the local YYYY-MM-DD, never a day early. */
export const dayOf = (v) => { if (!v) return ''; const s = String(v); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : ymd(new Date(v)); };
export const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d); };
export const fmtDate = (v) => (v ? new Date(String(v).length === 10 ? `${v}T12:00:00` : v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
export const fmtWhen = (v) => (v ? new Date(v).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
export const relDay = (v) => {
  if (!v) return '';
  const d = new Date(String(v).replace(' ', 'T'));
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dd = new Date(d); dd.setHours(0, 0, 0, 0);
  const diff = Math.round((dd - today) / 86400000);
  if (diff === 0) return `Today ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff < 0) return `${-diff} days overdue`;
  if (diff < 7) return d.toLocaleDateString('en-GB', { weekday: 'long' });
  return fmtDate(d);
};
/** "today", "3 days ago", "2 months ago" for something that already happened. */
export const ago = (v) => {
  if (!v) return '';
  const d = new Date(String(v).replace(' ', 'T'));
  const days = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.round(days / 30)} month${Math.round(days / 30) === 1 ? '' : 's'} ago`;
  return fmtDate(d);
};
export const isOverdue = (v) => v && new Date(String(v).replace(' ', 'T')) < new Date();

export const LEAD_STATUS_STYLE = {
  New: 'bg-sky-50 text-sky-800 ring-sky-200', Contacted: 'bg-blue-50 text-blue-800 ring-blue-200', Qualified: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  Unqualified: 'bg-gray-100 text-gray-700 ring-gray-300', Lost: 'bg-red-50 text-red-700 ring-red-200', 'On Hold': 'bg-amber-50 text-amber-800 ring-amber-200',
  'Converted to Deal': 'bg-violet-50 text-violet-800 ring-violet-200'
};
export const QUOTE_STATUS_STYLE = {
  Draft: 'bg-gray-100 text-gray-700 ring-gray-300', 'Pending Approval': 'bg-amber-50 text-amber-800 ring-amber-200', Approved: 'bg-sky-50 text-sky-800 ring-sky-200',
  Sent: 'bg-blue-50 text-blue-800 ring-blue-200', Accepted: 'bg-emerald-50 text-emerald-800 ring-emerald-200', Declined: 'bg-red-50 text-red-700 ring-red-200',
  Revised: 'bg-gray-50 text-gray-500 ring-gray-200', Expired: 'bg-orange-50 text-orange-800 ring-orange-200', Finalized: 'bg-emerald-50 text-emerald-800 ring-emerald-200'
};
export const Badge = ({ text, tone }) => <span className={`inline-flex items-center text-[11px] font-medium px-1.5 py-0.5 rounded ring-1 ring-inset whitespace-nowrap ${tone || 'bg-gray-100 text-gray-700 ring-gray-200'}`}>{text}</span>;
export const stageTone = (name, status) => {
  if (status === 'On Hold') return 'bg-amber-50 text-amber-800 ring-amber-200';
  if (/won/i.test(name) || status === 'Won') return 'bg-emerald-50 text-emerald-800 ring-emerald-200';
  if (/lost/i.test(name) || status === 'Lost') return 'bg-red-50 text-red-700 ring-red-200';
  return 'bg-indigo-50 text-indigo-800 ring-indigo-200';
};

export const inputCls = 'w-full h-9 text-[13px] border border-gray-300 rounded px-2.5 outline-none focus:border-blue-500 bg-white';
export const labelCls = 'block text-xs font-semibold text-gray-700 mb-1';
export const btn = {
  primary: 'h-8 px-3 text-xs font-medium rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 cursor-pointer inline-flex items-center gap-1.5',
  blue: 'h-8 px-3 text-xs font-medium rounded bg-red-600 text-white hover:bg-blue-700 disabled:opacity-60 cursor-pointer inline-flex items-center gap-1.5',
  green: 'h-8 px-3 text-xs font-medium rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 cursor-pointer inline-flex items-center gap-1.5',
  ghost: 'h-8 px-3 text-xs rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-60 cursor-pointer inline-flex items-center gap-1.5',
  danger: 'h-8 px-3 text-xs rounded border border-red-200 text-red-700 bg-white hover:bg-red-50 disabled:opacity-60 cursor-pointer inline-flex items-center gap-1.5'
};

export function Modal({ title, onClose, children, width = 'max-w-lg', footer }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className={`relative w-full ${width} max-h-[90vh] flex flex-col bg-white rounded-xl shadow-2xl`}>
        <div className="px-5 py-3.5 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-500 cursor-pointer" aria-label="Close"><X size={17} /></button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export const ErrorNote = ({ text }) => (text ? <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2.5 py-1.5">{text}</div> : null);

/** Next follow-up fields, reused by "log communication", "complete follow-up" and new leads. */
export function NextStepFields({ value, onChange, types, people, compact }) {
  const v = value || {};
  const set = (k, x) => onChange({ ...v, [k]: x });
  return (
    <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'} gap-2`}>
      <div><label className={labelCls}>Type</label>
        <select value={v.type || 'Call'} onChange={e => set('type', e.target.value)} className={inputCls}>{types.map(t => <option key={t}>{t}</option>)}</select></div>
      <div><label className={labelCls}>Date</label><input type="date" value={v.date || ''} min={ymd()} onChange={e => set('date', e.target.value)} className={inputCls} /></div>
      <div><label className={labelCls}>Time</label><input type="time" value={v.time || '11:00'} onChange={e => set('time', e.target.value)} className={inputCls} /></div>
      <div><label className={labelCls}>Assign to</label>
        <select value={v.assignedTo || ''} onChange={e => set('assignedTo', e.target.value)} className={inputCls}>
          <option value="">Me</option>{people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select></div>
      <div className={compact ? 'col-span-2' : 'col-span-2 md:col-span-4'}><label className={labelCls}>Purpose</label>
        <input value={v.subject || ''} onChange={e => set('subject', e.target.value)} placeholder="e.g. Share revised quotation, demo of the website" className={inputCls} /></div>
      {/meet|visit|demo/i.test(v.type || '') && (
        <div className={compact ? 'col-span-2' : 'col-span-2 md:col-span-4'}><label className={labelCls}>{/google meet/i.test(v.type) ? 'Meeting link' : 'Location / link'}</label>
          <input value={v.location || v.meetingLink || ''} onChange={e => onChange({ ...v, [/google meet/i.test(v.type) ? 'meetingLink' : 'location']: e.target.value })} className={inputCls} placeholder={/google meet/i.test(v.type) ? 'https://meet.google.com/…' : 'Client office, Baner'} /></div>
      )}
    </div>
  );
}

const QUICK_OUTCOMES = {
  Call: ['Interested', 'Call back later', 'Not reachable', 'Needs quotation', 'Negotiating price', 'Not interested'],
  WhatsApp: ['Replied', 'No reply yet', 'Shared details', 'Needs quotation'],
  Email: ['Replied', 'No reply yet', 'Shared details', 'Needs quotation'],
  Meeting: ['Requirement understood', 'Demo done', 'Price discussed', 'Decision pending', 'Not a fit'],
  Visit: ['Requirement understood', 'Price discussed', 'Decision pending'],
  Note: [], SMS: ['Replied', 'No reply yet']
};

/** Log a call / email / WhatsApp / meeting / visit / note, with an optional next step. */
export function LogCommunicationModal({ meta, leadId, dealId, defaultChannel = 'Call', onClose, onSaved }) {
  const [channel, setChannel] = useState(defaultChannel);
  const [direction, setDirection] = useState('out');
  const [outcome, setOutcome] = useState('');
  const [summary, setSummary] = useState('');
  const [duration, setDuration] = useState('');
  const [planNext, setPlanNext] = useState(true);
  const [next, setNext] = useState({ type: 'Call', date: addDays(2), time: '11:00' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const icons = { Call: Phone, Email: Mail, WhatsApp: MessageCircle, Meeting: Users, Visit: MapPin, Note: StickyNote, SMS: MessageCircle };
  const save = async () => {
    setSaving(true); setError('');
    try {
      await api('/communications', { method: 'POST', body: { leadId, dealId, channel, direction, outcome, summary, durationMin: duration, next: planNext && channel !== 'Note' ? next : null } });
      onSaved();
    } catch (e) { setError(e.message); setSaving(false); }
  };
  return (
    <Modal title="Log communication" onClose={onClose} width="max-w-2xl"
      footer={<><button onClick={onClose} className={btn.ghost}>Cancel</button><button onClick={save} disabled={saving} className={btn.primary}>{saving && <Loader2 size={13} className="animate-spin" />} Save</button></>}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {meta.channels.map(c => {
            const I = icons[c] || StickyNote; return (
              <button key={c} type="button" onClick={() => { setChannel(c); setOutcome(''); }}
                className={`h-8 px-3 text-xs rounded border inline-flex items-center gap-1.5 cursor-pointer ${channel === c ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}><I size={13} /> {c}</button>
            );
          })}
        </div>
        {channel !== 'Note' && (
          <div className="flex flex-wrap items-center gap-3 text-[13px]">
            <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" checked={direction === 'out'} onChange={() => setDirection('out')} /> We contacted the client</label>
            <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" checked={direction === 'in'} onChange={() => setDirection('in')} /> Client contacted us</label>
            {['Call', 'Meeting', 'Visit'].includes(channel) && <label className="flex items-center gap-1.5">Minutes <input value={duration} onChange={e => setDuration(e.target.value.replace(/\D/g, ''))} className="w-16 h-7 border border-gray-300 rounded px-2" /></label>}
          </div>
        )}
        {(QUICK_OUTCOMES[channel] || []).length > 0 && (
          <div>
            <label className={labelCls}>Outcome</label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_OUTCOMES[channel].map(o => <button key={o} type="button" onClick={() => setOutcome(outcome === o ? '' : o)} className={`h-7 px-2.5 text-xs rounded border cursor-pointer ${outcome === o ? 'bg-red-600 text-white border-blue-600' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}>{o}</button>)}
            </div>
          </div>
        )}
        <div>
          <label className={labelCls}>{channel === 'Note' ? 'Note' : 'What was discussed'} <span className="text-red-600">*</span></label>
          <textarea autoFocus value={summary} onChange={e => setSummary(e.target.value)} rows={4} className="w-full text-[13px] border border-gray-300 rounded p-2.5 outline-none focus:border-blue-500"
            placeholder={channel === 'Note' ? 'Anything the team should know' : 'Requirements, budget, objections, decision maker, what they asked for…'} />
        </div>
        {channel !== 'Note' && (
          <div className="border border-gray-200 rounded p-3 bg-gray-50/60">
            <label className="flex items-center gap-2 text-[13px] font-medium text-gray-800 cursor-pointer mb-2"><input type="checkbox" checked={planNext} onChange={e => setPlanNext(e.target.checked)} /> Plan the next step</label>
            {planNext && <NextStepFields value={next} onChange={setNext} types={meta.followupTypes} people={meta.people} />}
          </div>
        )}
        <ErrorNote text={error} />
      </div>
    </Modal>
  );
}

export function ScheduleModal({ meta, leadId, dealId, onClose, onSaved, initial }) {
  const [v, setV] = useState(initial || { type: 'Call', date: addDays(1), time: '11:00' });
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    setSaving(true); setError('');
    try { await api('/followups', { method: 'POST', body: { leadId, dealId, ...v, notes } }); onSaved(); } catch (e) { setError(e.message); setSaving(false); }
  };
  return (
    <Modal title="Schedule follow-up or meeting" onClose={onClose} width="max-w-2xl"
      footer={<><button onClick={onClose} className={btn.ghost}>Cancel</button><button onClick={save} disabled={saving} className={btn.primary}>{saving && <Loader2 size={13} className="animate-spin" />} Schedule</button></>}>
      <div className="space-y-3">
        <NextStepFields value={v} onChange={setV} types={meta.followupTypes} people={meta.people} />
        <div><label className={labelCls}>Notes for whoever does it</label><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full text-[13px] border border-gray-300 rounded p-2.5 outline-none focus:border-blue-500" /></div>
        <ErrorNote text={error} />
      </div>
    </Modal>
  );
}

/** Close a follow-up with how it went, and plan the next one. */
export function CompleteFollowupModal({ meta, followup, onClose, onSaved }) {
  const [outcome, setOutcome] = useState('');
  const [notes, setNotes] = useState('');
  const [planNext, setPlanNext] = useState(true);
  const [next, setNext] = useState({ type: 'Call', date: addDays(3), time: '11:00' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const channel = /meet|visit|demo/i.test(followup.type) ? 'Meeting' : /whatsapp/i.test(followup.type) ? 'WhatsApp' : /email/i.test(followup.type) ? 'Email' : 'Call';
  const save = async () => {
    setSaving(true); setError('');
    try { await api(`/followups/${followup.id}/complete`, { method: 'POST', body: { outcome, notes, next: planNext ? next : null } }); onSaved(); } catch (e) { setError(e.message); setSaving(false); }
  };
  return (
    <Modal title={`Done: ${followup.type}${followup.subject ? ` · ${followup.subject}` : ''}`} onClose={onClose} width="max-w-2xl"
      footer={<><button onClick={onClose} className={btn.ghost}>Cancel</button><button onClick={save} disabled={saving} className={btn.green}>{saving && <Loader2 size={13} className="animate-spin" />} Mark done</button></>}>
      <div className="space-y-4">
        <div>
          <label className={labelCls}>Outcome</label>
          <div className="flex flex-wrap gap-1.5">
            {(QUICK_OUTCOMES[channel] || []).map(o => <button key={o} type="button" onClick={() => setOutcome(outcome === o ? '' : o)} className={`h-7 px-2.5 text-xs rounded border cursor-pointer ${outcome === o ? 'bg-red-600 text-white border-blue-600' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}>{o}</button>)}
          </div>
        </div>
        <div><label className={labelCls}>How it went</label><textarea autoFocus value={notes} onChange={e => setNotes(e.target.value)} rows={4} className="w-full text-[13px] border border-gray-300 rounded p-2.5 outline-none focus:border-blue-500" placeholder="What was discussed and agreed" /></div>
        <div className="border border-gray-200 rounded p-3 bg-gray-50/60">
          <label className="flex items-center gap-2 text-[13px] font-medium text-gray-800 cursor-pointer mb-2"><input type="checkbox" checked={planNext} onChange={e => setPlanNext(e.target.checked)} /> Plan the next step</label>
          {planNext && <NextStepFields value={next} onChange={setNext} types={meta.followupTypes} people={meta.people} />}
        </div>
        <ErrorNote text={error} />
      </div>
    </Modal>
  );
}

export function RescheduleModal({ followup, onClose, onSaved }) {
  const [date, setDate] = useState(addDays(1));
  const [time, setTime] = useState(followup.time || '11:00');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const save = async () => {
    try { await api(`/followups/${followup.id}/reschedule`, { method: 'POST', body: { date, time, reason } }); onSaved(); } catch (e) { setError(e.message); }
  };
  return (
    <Modal title={`Reschedule ${followup.type}`} onClose={onClose} width="max-w-md"
      footer={<><button onClick={onClose} className={btn.ghost}>Cancel</button><button onClick={save} className={btn.primary}>Reschedule</button></>}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div><label className={labelCls}>New date</label><input type="date" value={date} min={ymd()} onChange={e => setDate(e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Time</label><input type="time" value={time} onChange={e => setTime(e.target.value)} className={inputCls} /></div>
        </div>
        <div><label className={labelCls}>Why</label><input value={reason} onChange={e => setReason(e.target.value)} placeholder="Client asked to call next week" className={inputCls} /></div>
        <ErrorNote text={error} />
      </div>
    </Modal>
  );
}

/** Follow-ups and meetings list with done / reschedule / cancel. */
export function FollowupList({ items, meta, onChanged, emptyText = 'Nothing scheduled.' }) {
  const [completing, setCompleting] = useState(null);
  const [moving, setMoving] = useState(null);
  const open = items.filter(f => ['Scheduled', 'Pending', 'Overdue'].includes(f.status));
  const cancel = async (f) => {
    const reason = window.prompt(`Cancel this ${f.type.toLowerCase()}? Reason (optional):`, '');
    if (reason === null) return;
    await api(`/followups/${f.id}/cancel`, { method: 'POST', body: { reason } }).catch(() => { });
    onChanged();
  };
  if (!open.length) return <div className="text-xs text-gray-500 py-2">{emptyText}</div>;
  return (
    <div className="space-y-2">
      {open.map(f => (
        <div key={f.id} className={`p-3 rounded border ${f.overdue ? 'border-red-200 bg-red-50/40' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-start gap-2">
            <span className={`w-7 h-7 rounded flex items-center justify-center shrink-0 ${f.overdue ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
              {/meet/i.test(f.type) ? <Video size={13} /> : /visit|demo/i.test(f.type) ? <MapPin size={13} /> : /mail/i.test(f.type) ? <Mail size={13} /> : /whats/i.test(f.type) ? <MessageCircle size={13} /> : <Phone size={13} />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium text-gray-900">{f.type}{f.subject ? ` · ${f.subject}` : ''}</div>
              <div className={`text-[11px] ${f.overdue ? 'text-red-700 font-medium' : 'text-gray-500'}`}>
                {f.overdue && <AlertTriangle size={11} className="inline -mt-0.5 mr-0.5" />}{fmtDate(f.date)} {f.time} · {f.assignedName || 'Unassigned'}
                {f.meetingLink && <> · <a href={f.meetingLink} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">Join</a></>}{f.location ? ` · ${f.location}` : ''}
              </div>
              {f.notes && <div className="text-[12px] text-gray-600 mt-0.5">{f.notes}</div>}
            </div>
          </div>
          <div className="flex gap-1.5 mt-2 pl-9">
            <button onClick={() => setCompleting(f)} className={btn.green}><CheckCircle2 size={13} /> Done</button>
            <button onClick={() => setMoving(f)} className={btn.ghost}><CalendarClock size={13} /> Reschedule</button>
            <button onClick={() => cancel(f)} className={btn.ghost}><XCircle size={13} /> Cancel</button>
          </div>
        </div>
      ))}
      {completing && <CompleteFollowupModal meta={meta} followup={completing} onClose={() => setCompleting(null)} onSaved={() => { setCompleting(null); onChanged(); }} />}
      {moving && <RescheduleModal followup={moving} onClose={() => setMoving(null)} onSaved={() => { setMoving(null); onChanged(); }} />}
    </div>
  );
}

const EVENT_ICON = {
  communication: MessageCircle, created: PlusCircle, status: ArrowRightLeft, stage: ArrowRightLeft, converted: RefreshCw, scheduled: CalendarClock,
  rescheduled: CalendarClock, cancelled: XCircle, followup_done: CheckCircle2, quotation: FileText, revision: RotateCcw, approval: UserCheck,
  invoice: Receipt, payment: Wallet, accepted: CheckCircle2, declined: ThumbsDown, won: Trophy, lost: XCircle, hold: PauseCircle, resume: Clock, assigned: UserCheck
};
const EVENT_TONE = {
  payment: 'bg-emerald-100 text-emerald-700', invoice: 'bg-indigo-50 text-indigo-700', won: 'bg-emerald-100 text-emerald-700', accepted: 'bg-emerald-100 text-emerald-700', followup_done: 'bg-emerald-50 text-emerald-700',
  lost: 'bg-red-100 text-red-700', declined: 'bg-red-50 text-red-700', cancelled: 'bg-gray-100 text-gray-500', hold: 'bg-amber-100 text-amber-800',
  communication: 'bg-blue-50 text-blue-700', quotation: 'bg-violet-50 text-violet-700', revision: 'bg-orange-50 text-orange-700', approval: 'bg-amber-50 text-amber-800'
};
const CHANNEL_ICON = { Call: Phone, Email: Mail, WhatsApp: MessageCircle, Meeting: Users, Visit: MapPin, Note: StickyNote, SMS: MessageCircle };

export function Timeline({ items, filter = 'all' }) {
  const list = items.filter(i => filter === 'all' || (filter === 'communication' ? ['communication', 'followup_done'].includes(i.kind) : filter === 'quotation' ? ['quotation', 'revision', 'approval', 'accepted', 'declined'].includes(i.kind) || i.quotationId : !['communication', 'followup_done'].includes(i.kind)));
  if (!list.length) return <div className="text-xs text-gray-500 py-6 text-center">Nothing here yet.</div>;
  return (
    <ol className="relative border-l border-gray-200 ml-3.5 space-y-4">
      {list.map(i => {
        const Icon = i.kind === 'communication' ? (CHANNEL_ICON[i.meta?.channel] || MessageCircle) : (EVENT_ICON[i.kind] || ArrowRightLeft);
        return (
          <li key={i.id} className="ml-5">
            <span className={`absolute -left-3.5 w-7 h-7 rounded flex items-center justify-center ring-4 ring-white ${EVENT_TONE[i.kind] || 'bg-gray-100 text-gray-600'}`}><Icon size={13} /></span>
            <div className="text-[13px] text-gray-900 font-medium">{i.title}</div>
            <div className="text-[11px] text-gray-500">{fmtWhen(i.at)}{i.by ? ` · ${i.by}` : ''}{i.meta?.durationMin ? ` · ${i.meta.durationMin} min` : ''}</div>
            {i.body && <div className="mt-1 text-[12.5px] text-gray-700 whitespace-pre-wrap bg-gray-50 border border-gray-100 rounded p-2">{i.body}</div>}
          </li>
        );
      })}
    </ol>
  );
}

/** Ask for a reason (and a date for "on hold"). */
export function ReasonModal({ title, needDate, dateLabel = 'On hold until', reasonLabel = 'Reason', presets = [], confirmText = 'Save', tone = 'primary', onClose, onConfirm, extra }) {
  const [reason, setReason] = useState('');
  const [date, setDate] = useState(addDays(14));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const go = async () => {
    setSaving(true); setError('');
    try { await onConfirm({ reason, date }); } catch (e) { setError(e.message); setSaving(false); }
  };
  return (
    <Modal title={title} onClose={onClose} width="max-w-md"
      footer={<><button onClick={onClose} className={btn.ghost}>Cancel</button><button onClick={go} disabled={saving} className={btn[tone] || btn.primary}>{saving && <Loader2 size={13} className="animate-spin" />} {confirmText}</button></>}>
      <div className="space-y-3">
        {extra}
        {needDate && <div><label className={labelCls}>{dateLabel}</label><input type="date" value={date} min={ymd()} onChange={e => setDate(e.target.value)} className={inputCls} /></div>}
        {presets.length > 0 && <div className="flex flex-wrap gap-1.5">{presets.map(p => <button key={p} type="button" onClick={() => setReason(p)} className={`h-7 px-2.5 text-xs rounded border cursor-pointer ${reason === p ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}>{p}</button>)}</div>}
        <div><label className={labelCls}>{reasonLabel}</label><textarea autoFocus value={reason} onChange={e => setReason(e.target.value)} rows={3} className="w-full text-[13px] border border-gray-300 rounded p-2.5 outline-none focus:border-blue-500" /></div>
        <ErrorNote text={error} />
      </div>
    </Modal>
  );
}

export const LOST_REASONS = ['Price too high', 'Chose a competitor', 'No budget', 'No response', 'Requirement changed', 'Not a fit'];
export const HOLD_REASONS = ['Client busy / travelling', 'Budget next quarter', 'Waiting for internal approval', 'Project postponed'];

export function useSalesMeta() {
  const [meta, setMeta] = useState(null);
  useEffect(() => { api('/meta').then(setMeta).catch(() => setMeta({ stages: [], leadStatuses: [], channels: ['Call', 'Email', 'WhatsApp', 'Meeting', 'Note'], followupTypes: ['Call', 'Meeting', 'Email', 'WhatsApp'], people: [], me: {}, quotation: { defaultTaxPct: 18, discountApprovalPct: 10, validityDays: 15 } })); }, []);
  return meta;
}
export { Send };

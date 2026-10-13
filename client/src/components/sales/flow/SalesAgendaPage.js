import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Phone, Video, MapPin, Mail, MessageCircle, CheckCircle2, CalendarClock, XCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import { api, useSalesBase, useSalesMeta, fmtDate, Badge, btn, CompleteFollowupModal, RescheduleModal } from './salesShared';

/** Follow-ups and meetings across all enquiries and deals: overdue, today, upcoming, done. */
const GROUPS = [
  ['overdue', 'Overdue', 'text-red-700'], ['today', 'Today', 'text-blue-700'], ['upcoming', 'Upcoming', 'text-gray-800'], ['done', 'Done (last 7 days)', 'text-emerald-700']
];

export default function SalesAgendaPage() {
  const navigate = useNavigate();
  const base = useSalesBase();
  const meta = useSalesMeta();
  const [scope, setScope] = useState('mine');
  const [type, setType] = useState('');
  const [data, setData] = useState(null);
  const [completing, setCompleting] = useState(null);
  const [moving, setMoving] = useState(null);

  const load = useCallback(() => { api(`/agenda?scope=${scope}`).then(setData).catch(() => setData({ items: [], counts: {} })); }, [scope]);
  useEffect(() => { load(); }, [load]);

  const items = (data?.items || []).filter(i => !type || (type === 'meetings' ? /meet|visit|demo/i.test(i.type) : !/meet|visit|demo/i.test(i.type)));
  const open = (i) => navigate(i.dealId ? `${base}/opportunity/${i.dealId}` : `${base}/enquiry/${i.leadId}`);
  const cancel = async (i) => {
    const reason = window.prompt(`Cancel this ${i.type.toLowerCase()}? Reason (optional):`, '');
    if (reason === null) return;
    await api(`/followups/${i.id}/cancel`, { method: 'POST', body: { reason } }).catch(() => {});
    load();
  };
  const Icon = (t) => (/meet/i.test(t) ? Video : /visit|demo/i.test(t) ? MapPin : /mail/i.test(t) ? Mail : /whats/i.test(t) ? MessageCircle : Phone);

  return (
    <div className="p-5 bg-[#F8FAFC] min-h-screen font-sans text-gray-900">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h1 className="text-[20px] font-semibold">Follow-ups & meetings</h1>
          <p className="text-[12px] text-gray-500 mt-0.5">Mark each one done with how it went and plan the next step, so no enquiry goes cold.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-lg p-0.5">
            {[['', 'All'], ['calls', 'Calls & messages'], ['meetings', 'Meetings']].map(([k, l]) => <button key={k} onClick={() => setType(k)} className={`px-2.5 h-7 text-xs font-medium rounded-md cursor-pointer ${type === k ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{l}</button>)}
          </div>
          <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-lg p-0.5">
            {[['mine', 'Mine'], ['all', 'Team']].map(([k, l]) => <button key={k} onClick={() => setScope(k)} className={`px-2.5 h-7 text-xs font-medium rounded-md cursor-pointer ${scope === k ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{l}</button>)}
          </div>
        </div>
      </div>

      {!data || !meta ? <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-gray-400" size={18} /></div> : (
        <div className="space-y-5">
          {GROUPS.map(([key, label, tone]) => {
            const list = items.filter(i => i.bucket === key);
            if (!list.length && key === 'done') return null;
            return (
              <section key={key}>
                <h2 className={`text-[13px] font-semibold mb-2 flex items-center gap-1.5 ${tone}`}>{key === 'overdue' && <AlertTriangle size={14} />}{label} <span className="text-gray-400 font-normal">{list.length}</span></h2>
                {list.length === 0 ? <div className="text-xs text-gray-500 bg-white border border-dashed border-gray-200 rounded-lg px-3 py-4">Nothing {key === 'today' ? 'for today' : key}.</div> : (
                  <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
                    {list.map(i => { const I = Icon(i.type); return (
                      <div key={i.id} className={`flex flex-wrap items-center gap-3 px-3 py-2.5 ${key === 'done' ? 'opacity-70' : ''}`}>
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${key === 'overdue' ? 'bg-red-50 text-red-700' : key === 'done' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}><I size={14} /></span>
                        <div className="w-24 shrink-0 text-[12px]"><div className="font-medium text-gray-900">{i.time}</div><div className="text-gray-500">{fmtDate(i.date)}</div></div>
                        <button onClick={() => open(i)} className="min-w-0 flex-1 text-left cursor-pointer">
                          <div className="text-[13px] font-medium text-gray-900 truncate">{i.type}{i.subject ? ` · ${i.subject}` : ''}</div>
                          <div className="text-[12px] text-gray-500 truncate">{i.name}{i.company ? ` · ${i.company}` : ''} · <Badge text={i.dealId ? i.stage || 'Deal' : i.stage || 'Enquiry'} /> {scope === 'all' && `· ${i.assignedName}`}</div>
                          {key === 'done' && (i.outcome || i.remarks) && <div className="text-[12px] text-gray-600 truncate">{[i.outcome, i.remarks].filter(Boolean).join(' — ')}</div>}
                        </button>
                        <div className="flex items-center gap-1.5">
                          {i.phone && key !== 'done' && <a href={`tel:${i.phone}`} className={btn.ghost} title={i.phone}><Phone size={13} /></a>}
                          {i.meetingLink && key !== 'done' && <a href={i.meetingLink} target="_blank" rel="noopener noreferrer" className={btn.ghost}><ExternalLink size={13} /> Join</a>}
                          {key !== 'done' && <>
                            <button onClick={() => setCompleting(i)} className={btn.green}><CheckCircle2 size={13} /> Done</button>
                            <button onClick={() => setMoving(i)} className={btn.ghost} title="Reschedule"><CalendarClock size={13} /></button>
                            <button onClick={() => cancel(i)} className={btn.ghost} title="Cancel"><XCircle size={13} /></button>
                          </>}
                        </div>
                      </div>
                    ); })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
      {completing && <CompleteFollowupModal meta={meta} followup={completing} onClose={() => setCompleting(null)} onSaved={() => { setCompleting(null); load(); }} />}
      {moving && <RescheduleModal followup={moving} onClose={() => setMoving(null)} onSaved={() => { setMoving(null); load(); }} />}
    </div>
  );
}

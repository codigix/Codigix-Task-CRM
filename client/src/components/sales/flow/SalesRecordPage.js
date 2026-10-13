import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Loader2, MessageSquarePlus, CalendarPlus, PauseCircle, PlayCircle, XCircle, CheckCircle2, ArrowRightCircle, Trophy, Phone, Mail,
  FilePlus2, FileText, Download, Pencil, ChevronRight, AlertTriangle, Building2, User, Presentation
} from 'lucide-react';
import {
  api, pdfUrl, useSalesBase, useSalesMeta, money, fmtDate, Badge, LEAD_STATUS_STYLE, QUOTE_STATUS_STYLE, stageTone, Modal, inputCls, labelCls,
  btn, ErrorNote, ReasonModal, LOST_REASONS, HOLD_REASONS, LogCommunicationModal, ScheduleModal, FollowupList, Timeline, addDays
} from './salesShared';
import { proposalPdfUrl } from './deskShared';
import NewQuotationModal from './NewQuotationModal';
import { WonModal } from './SalesPipelinePage';

/**
 * One enquiry (kind="lead") or deal (kind="deal"): status / stage, communications, follow-ups
 * and meetings, quotations (deals) and the full timeline in one place.
 */

function ConvertModal({ lead, meta, onClose, onDone }) {
  const [f, setF] = useState({ deal_name: lead.project_name ? `${lead.company || lead.lead_name} – ${lead.project_name}` : (lead.company || lead.lead_name), deal_value: String(Math.round(Number(lead.value) || 0)), expected_close_date: addDays(30), assignee_id: lead.owner_id || '', stage: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const go = async () => {
    setSaving(true); setError('');
    try { const d = await api(`/leads/${lead.id}/convert`, { method: 'POST', body: f }); onDone(d.dealId); } catch (e) { setError(e.message); setSaving(false); }
  };
  return (
    <Modal title="Convert enquiry to deal" onClose={onClose} width="max-w-lg"
      footer={<><button onClick={onClose} className={btn.ghost}>Cancel</button><button onClick={go} disabled={saving} className={btn.blue}>{saving && <Loader2 size={13} className="animate-spin" />} Create deal</button></>}>
      <div className="space-y-3">
        <p className="text-[12px] text-gray-600">The company is created (or matched) as a customer, and open follow-ups move to the deal. Quotations are made on the deal.</p>
        <div><label className={labelCls}>Deal name</label><input value={f.deal_name} onChange={e => set('deal_name', e.target.value)} className={inputCls} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className={labelCls}>Deal value (₹)</label><input value={f.deal_value} onChange={e => set('deal_value', e.target.value.replace(/[^\d.]/g, ''))} className={inputCls} /></div>
          <div><label className={labelCls}>Expected close</label><input type="date" value={f.expected_close_date} onChange={e => set('expected_close_date', e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Owner</label><select value={f.assignee_id} onChange={e => set('assignee_id', e.target.value)} className={inputCls}><option value="">Me</option>{meta.people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <div><label className={labelCls}>Start at stage</label><select value={f.stage} onChange={e => set('stage', e.target.value)} className={inputCls}><option value="">{meta.stages[0]?.name || 'First stage'}</option>{meta.stages.filter(s => !/^(won|lost)$/i.test(s.name)).slice(1).map(s => <option key={s.id}>{s.name}</option>)}</select></div>
        </div>
        <ErrorNote text={error} />
      </div>
    </Modal>
  );
}

function DetailsCard({ kind, record, meta, onSaved }) {
  const [edit, setEdit] = useState(false);
  const fields = kind === 'lead'
    ? [['lead_name', 'Contact name'], ['company', 'Company'], ['phone', 'Phone'], ['email', 'Email'], ['lead_source', 'Source'], ['project_name', 'Requirement'], ['value', 'Expected value (₹)'], ['owner_id', 'Owner'], ['notes', 'Details']]
    : [['deal_name', 'Deal name'], ['deal_value', 'Deal value (₹)'], ['expected_close_date', 'Expected close'], ['assignee_id', 'Owner'], ['priority', 'Priority'], ['source', 'Source'], ['description', 'Details']];
  const [f, setF] = useState({});
  const [error, setError] = useState('');
  useEffect(() => { setF(Object.fromEntries(fields.map(([k]) => [k, k === 'expected_close_date' && record[k] ? fmtYmd(record[k]) : record[k] ?? '']))); }, [record, edit]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = async () => {
    try { await api(`/${kind === 'lead' ? 'leads' : 'deals'}/${record.id}`, { method: 'PUT', body: f }); setEdit(false); onSaved(); } catch (e) { setError(e.message); }
  };
  const ownerName = (id) => meta.people.find(p => Number(p.id) === Number(id))?.name || '—';
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-700">Details</span>
        {!edit ? <button onClick={() => setEdit(true)} className="text-xs text-blue-700 hover:underline cursor-pointer inline-flex items-center gap-1"><Pencil size={11} /> Edit</button>
          : <span className="flex gap-1.5"><button onClick={() => setEdit(false)} className={btn.ghost}>Cancel</button><button onClick={save} className={btn.primary}>Save</button></span>}
      </div>
      <dl className="grid grid-cols-[110px_1fr] gap-y-2 text-[13px]">
        {fields.map(([k, l]) => (
          <React.Fragment key={k}>
            <dt className="text-gray-500 text-xs pt-1.5">{l}</dt>
            <dd className="min-w-0">
              {!edit ? (
                <span className="block py-1 text-gray-900 break-words whitespace-pre-wrap">
                  {k === 'owner_id' || k === 'assignee_id' ? ownerName(record[k]) : /value/.test(k) ? money(record[k]) : k === 'expected_close_date' ? fmtDate(record[k]) : k === 'phone' && record[k] ? <a href={`tel:${record[k]}`} className="text-blue-700">{record[k]}</a> : k === 'email' && record[k] ? <a href={`mailto:${record[k]}`} className="text-blue-700">{record[k]}</a> : (record[k] || '—')}
                </span>
              ) : k === 'owner_id' || k === 'assignee_id' ? (
                <select value={f[k] || ''} onChange={e => setF(x => ({ ...x, [k]: e.target.value }))} className={inputCls}>{meta.people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
              ) : k === 'priority' ? (
                <select value={f[k] || 'Medium'} onChange={e => setF(x => ({ ...x, [k]: e.target.value }))} className={inputCls}>{['Low', 'Medium', 'High'].map(p => <option key={p}>{p}</option>)}</select>
              ) : ['notes', 'description'].includes(k) ? (
                <textarea value={f[k] || ''} onChange={e => setF(x => ({ ...x, [k]: e.target.value }))} rows={3} className="w-full text-[13px] border border-gray-300 rounded p-2 outline-none focus:border-blue-500" />
              ) : (
                <input type={k === 'expected_close_date' ? 'date' : 'text'} value={f[k] || ''} onChange={e => setF(x => ({ ...x, [k]: e.target.value }))} className={inputCls} />
              )}
            </dd>
          </React.Fragment>
        ))}
      </dl>
      <ErrorNote text={error} />
    </div>
  );
}
const fmtYmd = (v) => { const d = new Date(v); return isNaN(d) ? '' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

export default function SalesRecordPage({ kind }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const base = useSalesBase();
  const meta = useSalesMeta();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [filter, setFilter] = useState('all');

  const load = useCallback(() => {
    api(`/${kind === 'lead' ? 'leads' : 'deals'}/${id}`).then(d => { setData(d); setError(''); }).catch(e => setError(e.message));
  }, [kind, id]);
  useEffect(() => { setData(null); load(); }, [load]);

  if (error && !data) return <div className="p-8 text-sm text-red-700">{error}</div>;
  if (!data || !meta) return <div className="min-h-[60vh] flex items-center justify-center gap-2 text-sm text-gray-500"><Loader2 size={16} className="animate-spin" /> Loading…</div>;

  const isLead = kind === 'lead';
  const rec = isLead ? data.lead : data.deal;
  const status = isLead ? rec.status : rec.status;
  const closed = isLead ? ['Lost', 'Unqualified', 'Converted to Deal'].includes(status) : ['Won', 'Lost'].includes(status);
  const onHold = status === 'On Hold';
  const openFollowups = data.followups.filter(f => ['Scheduled', 'Pending', 'Overdue'].includes(f.status));

  const setLeadStatus = async (s) => { try { await api(`/leads/${id}/status`, { method: 'POST', body: { status: s } }); load(); } catch (e) { setError(e.message); } };
  const moveStage = async (s) => {
    if (/^won$/i.test(s.name)) { setModal({ kind: 'won', target: s.name }); return; }
    if (/^lost$/i.test(s.name)) { setModal({ kind: 'lost', target: s.name }); return; }
    try { await api(`/deals/${id}/stage`, { method: 'POST', body: { stage: s.name } }); load(); } catch (e) { setError(e.message); }
  };
  const newQuote = () => navigate(`${base}/quotation/new?deal=${rec.id}`);

  // Group quotation versions by number.
  const quoteGroups = {};
  (data.quotations || []).forEach(q => { (quoteGroups[q.base] = quoteGroups[q.base] || []).push(q); });
  const decks = data.decks || [];

  return (
    <div className="p-5 bg-[#F8FAFC] min-h-screen font-sans text-gray-900">
      <button onClick={() => navigate(`${base}/pipeline${isLead ? '?tab=leads' : ''}`)} className="text-xs text-gray-500 hover:text-gray-800 inline-flex items-center gap-1 mb-2 cursor-pointer"><ArrowLeft size={13} /> Sales pipeline</button>

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <div className="flex flex-wrap items-start gap-3">
          <span className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${isLead ? 'bg-sky-50 text-sky-700' : 'bg-indigo-50 text-indigo-700'}`}>{isLead ? <User size={20} /> : <Building2 size={20} />}</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[18px] font-semibold text-gray-900">{isLead ? rec.lead_name : rec.deal_name}</h1>
              {isLead ? <Badge text={status} tone={LEAD_STATUS_STYLE[status]} /> : <Badge text={onHold ? 'On Hold' : rec.deal_stage || 'New'} tone={stageTone(rec.deal_stage, status)} />}
              {!isLead && status === 'Won' && <Badge text={`Won ${money(rec.won_value || rec.deal_value)}`} tone="bg-emerald-50 text-emerald-800 ring-emerald-200" />}
            </div>
            <div className="text-[12px] text-gray-500 mt-0.5 flex flex-wrap gap-x-3">
              {isLead ? <>
                {rec.company && <span>{rec.company}</span>}{rec.phone && <a href={`tel:${rec.phone}`} className="inline-flex items-center gap-1 text-blue-700"><Phone size={11} />{rec.phone}</a>}
                {rec.email && <a href={`mailto:${rec.email}`} className="inline-flex items-center gap-1 text-blue-700"><Mail size={11} />{rec.email}</a>}
                {rec.lead_source && <span>Source: {rec.lead_source}</span>}<span>Owner: {rec.owner || '—'}</span>
              </> : <>
                <span>{rec.company_name || '—'}</span><span>{money(rec.deal_value)}</span>{rec.expected_close_date && <span>Close by {fmtDate(rec.expected_close_date)}</span>}<span>Owner: {rec.owner || '—'}</span>
                {data.lead && <button onClick={() => navigate(`${base}/enquiry/${data.lead.id}`)} className="text-blue-700 hover:underline cursor-pointer">From enquiry: {data.lead.name}</button>}
              </>}
            </div>
            {onHold && <div className="mt-2 text-[12px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5 inline-flex items-center gap-1.5"><PauseCircle size={13} /> On hold until {fmtDate(rec.hold_until)} — {rec.hold_reason}</div>}
            {(status === 'Lost' || status === 'Unqualified') && (rec.lost_reason) && <div className="mt-2 text-[12px] text-red-700 bg-red-50 border border-red-200 rounded px-2.5 py-1.5 inline-block">{status}: {rec.lost_reason}</div>}
            {isLead && data.deal && <button onClick={() => navigate(`${base}/opportunity/${data.deal.id}`)} className="mt-2 text-[12px] text-violet-800 bg-violet-50 border border-violet-200 rounded px-2.5 py-1.5 inline-flex items-center gap-1.5 cursor-pointer">Converted to deal: {data.deal.deal_name} <ChevronRight size={13} /></button>}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {!closed && <button onClick={() => setModal({ kind: 'log' })} className={btn.primary}><MessageSquarePlus size={13} /> Log communication</button>}
            {!closed && <button onClick={() => setModal({ kind: 'schedule' })} className={btn.ghost}><CalendarPlus size={13} /> Schedule</button>}
            {!isLead && !closed && <button onClick={() => setModal({ kind: 'newquote' })} className={btn.blue}><FilePlus2 size={13} /> New quotation</button>}
            {isLead && !closed && <button onClick={() => setModal({ kind: 'convert' })} className={btn.blue}><ArrowRightCircle size={13} /> Convert to deal</button>}
            {!closed && (onHold
              ? <button onClick={async () => { await api(`/${isLead ? 'leads' : 'deals'}/${id}/resume`, { method: 'POST' }); load(); }} className={btn.ghost}><PlayCircle size={13} /> Resume</button>
              : <button onClick={() => setModal({ kind: 'hold' })} className={btn.ghost}><PauseCircle size={13} /> On hold</button>)}
          </div>
        </div>

        {/* Status / stage control */}
        <div className="mt-4 pt-3 border-t border-gray-100">
          {isLead ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-gray-500 mr-1">Status:</span>
              {['New', 'Contacted', 'Qualified'].map(s => (
                <button key={s} disabled={closed} onClick={() => setLeadStatus(s)} className={`h-7 px-3 text-xs rounded-full border cursor-pointer disabled:cursor-default ${status === s ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50'}`}>{s}</button>
              ))}
              {!closed && <>
                <button onClick={() => setModal({ kind: 'leadReason', target: 'Unqualified' })} className="h-7 px-3 text-xs rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50 cursor-pointer">Unqualified</button>
                <button onClick={() => setModal({ kind: 'leadReason', target: 'Lost' })} className="h-7 px-3 text-xs rounded-full border border-red-200 text-red-700 hover:bg-red-50 cursor-pointer inline-flex items-center gap-1"><XCircle size={12} /> Lost</button>
              </>}
              {(status === 'Lost' || status === 'Unqualified') && <button onClick={() => setLeadStatus('Contacted')} className="h-7 px-3 text-xs rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer">Re-open</button>}
            </div>
          ) : (
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {data.stages.map((s, i) => {
                const curIdx = data.stages.findIndex(x => x.name === rec.deal_stage);
                const done = i < curIdx; const current = s.name === rec.deal_stage;
                const special = /^(won|lost)$/i.test(s.name);
                return (
                  <button key={s.id} onClick={() => moveStage(s)} title={`${s.name} · ${s.probability}%`}
                    className={`shrink-0 h-8 px-3 text-[11.5px] font-medium rounded-md border cursor-pointer flex items-center gap-1 ${current ? (special ? stageTone(s.name, status).replace('ring-', 'border-') : 'bg-indigo-600 text-white border-indigo-600') : done && !special ? 'bg-indigo-50 text-indigo-800 border-indigo-100' : special ? (/won/i.test(s.name) ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50' : 'border-red-200 text-red-700 hover:bg-red-50') : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    {/won/i.test(s.name) && <Trophy size={12} />}{done && !special && <CheckCircle2 size={12} />}{s.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <ErrorNote text={error} />

      <div className="grid lg:grid-cols-[1fr_380px] gap-4">
        <div className="space-y-4 min-w-0">
          {!isLead && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] font-semibold text-gray-900 flex items-center gap-1.5"><FileText size={14} /> Quotations</span>
                {!closed && <button onClick={() => setModal({ kind: 'newquote' })} className={btn.ghost}><FilePlus2 size={13} /> New quotation</button>}
              </div>
              {Object.keys(quoteGroups).length === 0 && decks.length === 0 ? <div className="text-xs text-gray-500">No quotation yet. Create one when the requirement is clear.</div> : (
                <div className="space-y-2">
                  {Object.entries(quoteGroups).map(([num, versions]) => {
                    const latest = versions[0];
                    return (
                      <div key={num} className="border border-gray-200 rounded-lg">
                        <button onClick={() => navigate(`${base}/quotation/${latest.id}`)} className="w-full text-left p-3 flex flex-wrap items-center gap-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                          <span className="font-mono text-[12px] text-gray-700">{num}</span>
                          <span className="text-[11px] text-gray-500">v{latest.version}</span>
                          <Badge text={latest.status} tone={QUOTE_STATUS_STYLE[latest.status]} />
                          <span className="text-[12px] text-gray-600 truncate flex-1 min-w-[120px]">{latest.subject}</span>
                          <span className="text-[13px] font-semibold tabular-nums">{money(latest.total)}</span>
                          <a href={pdfUrl(latest.id, true)} onClick={e => e.stopPropagation()} className="p-1 text-gray-500 hover:text-gray-900" title="Download PDF"><Download size={14} /></a>
                        </button>
                        {versions.length > 1 && (
                          <div className="px-3 pb-2 flex flex-wrap gap-1.5">
                            {versions.slice(1).map(v => <button key={v.id} onClick={() => navigate(`${base}/quotation/${v.id}`)} className="text-[11px] text-gray-500 hover:text-gray-900 cursor-pointer">v{v.version} · {v.status} · {money(v.total)}</button>)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {decks.map(dk => (
                <div key={`dk${dk.id}`} className="border border-gray-200 rounded-lg">
                  <button onClick={() => navigate(`${base}/proposal/${dk.id}`)} className="w-full text-left p-3 flex flex-wrap items-center gap-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                    <span className="font-mono text-[12px] text-gray-700">{dk.number}</span>
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-violet-700 bg-violet-50 ring-1 ring-violet-200 rounded px-1"><Presentation size={9} /> {dk.kind === 'marketing' ? 'DM' : 'IT'}</span>
                    <Badge text={dk.status} tone={QUOTE_STATUS_STYLE[dk.status]} />
                    <span className="text-[12px] text-gray-600 truncate flex-1 min-w-[120px]">{dk.title || '—'}</span>
                    {dk.total > 0 && <span className="text-[13px] font-semibold tabular-nums">{money(dk.total)}</span>}
                    <a href={proposalPdfUrl(dk.id)} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="p-1 text-gray-500 hover:text-gray-900" title="Open deck PDF"><Download size={14} /></a>
                  </button>
                </div>
              ))}
)}
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <span className="text-[13px] font-semibold text-gray-900">Timeline</span>
              <div className="flex gap-1">
                {[['all', 'All'], ['communication', 'Communications'], ...(isLead ? [] : [['quotation', 'Quotations']]), ['status', 'Status & schedule']].map(([kk, l]) => (
                  <button key={kk} onClick={() => setFilter(kk)} className={`h-7 px-2.5 text-xs rounded-full border cursor-pointer ${filter === kk ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}>{l}</button>
                ))}
              </div>
            </div>
            <Timeline items={data.timeline} filter={filter} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-700">Next steps ({openFollowups.length})</span>
              {!closed && <button onClick={() => setModal({ kind: 'schedule' })} className="text-xs text-blue-700 hover:underline cursor-pointer">+ Schedule</button>}
            </div>
            {!closed && openFollowups.length === 0 && <div className="mb-2 text-[12px] text-orange-800 bg-orange-50 border border-orange-200 rounded px-2.5 py-1.5 flex items-center gap-1.5"><AlertTriangle size={13} /> No next step planned.</div>}
            <FollowupList items={data.followups} meta={meta} onChanged={load} emptyText={closed ? 'Closed.' : ''} />
          </div>
          <DetailsCard kind={kind} record={rec} meta={meta} onSaved={load} />
        </div>
      </div>

      {modal?.kind === 'log' && <LogCommunicationModal meta={meta} leadId={isLead ? rec.id : null} dealId={isLead ? null : rec.id} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
      {modal?.kind === 'schedule' && <ScheduleModal meta={meta} leadId={isLead ? rec.id : null} dealId={isLead ? null : rec.id} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
      {modal?.kind === 'convert' && <ConvertModal lead={rec} meta={meta} onClose={() => setModal(null)} onDone={(dealId) => navigate(`${base}/opportunity/${dealId}`)} />}
      {modal?.kind === 'hold' && (
        <ReasonModal title="Put on hold" needDate presets={HOLD_REASONS} confirmText="Put on hold" onClose={() => setModal(null)}
          onConfirm={async ({ reason, date }) => {
            if (isLead) await api(`/leads/${id}/status`, { method: 'POST', body: { status: 'On Hold', reason, holdUntil: date } });
            else await api(`/deals/${id}/hold`, { method: 'POST', body: { reason, until: date } });
            setModal(null); load();
          }} />
      )}
      {modal?.kind === 'leadReason' && (
        <ReasonModal title={`Mark as ${modal.target}`} presets={modal.target === 'Lost' ? LOST_REASONS : ['Not our service', 'Budget far too low', 'Spam / wrong number', 'Just exploring']} confirmText={`Mark ${modal.target}`} tone="danger"
          onClose={() => setModal(null)} onConfirm={async ({ reason }) => { await api(`/leads/${id}/status`, { method: 'POST', body: { status: modal.target, reason } }); setModal(null); load(); }} />
      )}
      {modal?.kind === 'lost' && (
        <ReasonModal title="Deal lost" presets={LOST_REASONS} confirmText="Mark lost" tone="danger" reasonLabel="Why was it lost?"
          onClose={() => setModal(null)} onConfirm={async ({ reason }) => { await api(`/deals/${id}/stage`, { method: 'POST', body: { stage: modal.target, reason } }); setModal(null); load(); }} />
      )}
      {modal?.kind === 'newquote' && <NewQuotationModal preset={{ deal: rec.id }} onClose={() => setModal(null)} />}
      {modal?.kind === 'won' && (
        <WonModal card={{ id: rec.id, name: rec.deal_name, value: Number(rec.deal_value) || 0, quotation: (data.quotations || []).find(q => q.status === 'Accepted') || (data.decks || []).find(d => d.status === 'Accepted') || null }} target={modal.target}
          onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} />
      )}
    </div>
  );
}

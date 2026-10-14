import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Loader2, MessageSquarePlus, CalendarPlus, PauseCircle, PlayCircle, XCircle, CheckCircle2, ArrowRightCircle, Trophy, Phone, Mail,
  FilePlus2, FileText, Download, Pencil, ChevronRight, AlertTriangle, Building2, User, Presentation, RotateCcw, Sparkles, Code2, Megaphone, ArrowRight
} from 'lucide-react';
import {
  api, pdfUrl, useSalesBase, useSalesMeta, money, fmtDate, Badge, LEAD_STATUS_STYLE, QUOTE_STATUS_STYLE, stageTone, Modal, inputCls, labelCls,
  btn, ErrorNote, ReasonModal, LOST_REASONS, HOLD_REASONS, LogCommunicationModal, ScheduleModal, FollowupList, Timeline, addDays, asksForQuote
} from './salesShared';
import { proposalApi, proposalPdfUrl } from './deskShared';
import {
  SourceFields, ClientIntakeFields, ServicePicker, originText, suggestFormat, FORMAT_INFO, estimateOf, expectedValueOf, FlowSteps, flowStepsFor
} from './enquiryShared';
import NewQuotationModal from './NewQuotationModal';
import { WonModal } from './SalesPipelinePage';

/**
 * One enquiry (kind="lead") or deal (kind="deal"): where it is in the sales flow and what to do
 * next, communications, follow-ups and meetings, quotations (made right here, from the enquiry's
 * details) with their revisions, and the full timeline in one place.
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
        <p className="text-[12px] text-gray-600">The company is created (or matched) as a customer with the enquiry's billing details, and open follow-ups move to the deal.</p>
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

/**
 * Create the quotation straight from the enquiry. Shows what the quotation will be filled with
 * (bill-to, services) and the format the requirement calls for; on confirm the enquiry becomes a
 * deal (quotations belong to deals) and the editor opens pre-filled.
 */
function QuoteFromEnquiryModal({ lead, meta, onClose }) {
  const navigate = useNavigate();
  const base = useSalesBase();
  const services = meta.services || [];
  const suggested = suggestFormat(lead.services, services);
  const [format, setFormat] = useState(suggested);
  const [value, setValue] = useState(String(Math.round(Number(lead.value) || expectedValueOf(lead.services, services) || 0)));
  const [closeBy, setCloseBy] = useState(addDays(30));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const picked = (lead.services || []).map(s => ({ ...s, sv: services.find(x => x.id === s.id) })).filter(s => s.sv);
  const missing = [
    !lead.company && 'company name (the contact name is used)',
    !lead.state && 'state (GST will be CGST + SGST)',
    !lead.address && 'billing address',
    !lead.email && 'email (needed to email the quotation)'
  ].filter(Boolean);
  const est = estimateOf(lead.services, services);
  const go = async () => {
    setSaving(true); setError('');
    try {
      let dealId = lead.converted_deal_id;
      if (!dealId) {
        const name = lead.project_name ? `${lead.company || lead.lead_name} – ${lead.project_name}` : (lead.company || lead.lead_name);
        dealId = (await api(`/leads/${lead.id}/convert`, { method: 'POST', body: { deal_name: name, deal_value: value, expected_close_date: closeBy } })).dealId;
      }
      if (['retainer', 'project', 'general'].includes(format)) { navigate(`${base}/quotation/new?deal=${dealId}&type=${format}`); return; }
      const r = await proposalApi('', { method: 'POST', body: { dealId, kind: format, title: lead.project_name || '' } });
      navigate(`${base}/proposal/${r.id}`);
    } catch (e) { setError(e.message); setSaving(false); }
  };
  const Choice = ({ v, label, desc, Icon }) => (
    <button type="button" onClick={() => setFormat(v)} className={`text-left border rounded p-2.5 cursor-pointer ${format === v ? 'border-red-400 bg-red-50/50 ring-1 ring-red-200' : 'border-gray-200 hover:bg-gray-50'}`}>
      <div className="flex items-center gap-1.5 text-[12.5px] font-semibold"><Icon size={13} /> {label}{v === suggested && <span className="ml-auto inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200 rounded px-1"><Sparkles size={9} /> Suggested</span>}</div>
      <div className="text-[11px] text-gray-600 mt-0.5 leading-snug">{desc}</div>
    </button>
  );
  return (
    <Modal title="Create quotation" onClose={onClose} width="max-w-2xl"
      footer={<><button onClick={onClose} className={btn.ghost}>Cancel</button><button onClick={go} disabled={saving} className={btn.primary}>{saving ? <Loader2 size={13} className="animate-spin" /> : <FilePlus2 size={13} />} Create and edit</button></>}>
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="border border-gray-200 rounded p-3 text-[12.5px]">
            <div className="text-xs font-semibold text-gray-700 mb-1.5">Bill to (from the enquiry)</div>
            <div className="font-medium text-gray-900">{lead.company || lead.lead_name}</div>
            <div className="text-gray-600">{lead.lead_name}{lead.contact_designation ? `, ${lead.contact_designation}` : ''}</div>
            <div className="text-gray-600">{[lead.phone, lead.email].filter(Boolean).join(' · ')}</div>
            <div className="text-gray-600">{[lead.address, lead.city, lead.state].filter(Boolean).join(', ')}</div>
            {lead.gstin && <div className="text-gray-600">GSTIN {lead.gstin}</div>}
            {missing.length > 0 && <div className="mt-2 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1">Missing: {missing.join('; ')}. You can fill it in the quotation.</div>}
          </div>
          <div className="border border-gray-200 rounded p-3 text-[12.5px]">
            <div className="text-xs font-semibold text-gray-700 mb-1.5">Lines (from the requirement)</div>
            {picked.length ? (
              <ul className="space-y-0.5">{picked.map(s => <li key={s.id} className="flex justify-between gap-2"><span className="truncate">{s.sv.name}</span><span className="text-gray-500 shrink-0">× {s.qty}{s.sv.billing === 'monthly' ? '/mo' : ''}</span></li>)}</ul>
            ) : <div className="text-[11.5px] text-gray-500">No services picked on the enquiry. Add lines in the editor, or pick services in Details first.</div>}
            {(est.oneTime > 0 || est.monthly > 0) && <div className="mt-1.5 pt-1.5 border-t border-gray-100 text-[11px] text-gray-600">{est.oneTime > 0 && <>One-time ≈ {money(est.oneTime)} </>}{est.monthly > 0 && <>· Monthly ≈ {money(est.monthly)}</>} (before GST)</div>}
            {lead.timeline && <div className="text-[11px] text-gray-600 mt-1">Needed: {lead.timeline}</div>}
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold text-gray-700 mb-1.5">Format</div>
          <div className="grid sm:grid-cols-3 gap-2">
            {['retainer', 'project', 'general'].map(v => <Choice key={v} v={v} label={FORMAT_INFO[v].label} desc={FORMAT_INFO[v].why} Icon={FORMAT_INFO[v].icon} />)}
          </div>
          <div className="grid sm:grid-cols-2 gap-2 mt-2">
            <Choice v="it" label="Presentation · Software / IT" desc="Slide-style: modules per option, fixed price, milestones, AMC." Icon={Code2} />
            <Choice v="marketing" label="Presentation · Digital marketing" desc="Slide-style: services with plan choices, 3-month plan, commitments." Icon={Megaphone} />
          </div>
        </div>
        {!lead.converted_deal_id && (
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Deal value (₹)</label><input value={value} onChange={e => setValue(e.target.value.replace(/[^\d.]/g, ''))} className={inputCls} /></div>
            <div><label className={labelCls}>Expected close</label><input type="date" value={closeBy} onChange={e => setCloseBy(e.target.value)} className={inputCls} /></div>
            <p className="col-span-2 text-[11.5px] text-gray-500">The enquiry moves into the deals pipeline (quotations, revisions and billing live on the deal). Its follow-ups move with it.</p>
          </div>
        )}
        <ErrorNote text={error} />
      </div>
    </Modal>
  );
}

/** A sales employee passes the enquiry to an executive / manager, who makes the quotation. */
function HandoverModal({ lead, meta, onClose, onDone }) {
  const people = meta.people.filter(p => p.canQuote && Number(p.id) !== Number(lead.owner_id));
  const [to, setTo] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const go = async () => {
    if (!to) { setError('Choose who will make the quotation.'); return; }
    setSaving(true); setError('');
    try { await api(`/leads/${lead.id}/handover`, { method: 'POST', body: { to, note } }); onDone(); } catch (e) { setError(e.message); setSaving(false); }
  };
  return (
    <Modal title="Pass to a sales executive" onClose={onClose} width="max-w-md"
      footer={<><button onClick={onClose} className={btn.ghost}>Cancel</button><button onClick={go} disabled={saving} className={btn.primary}>{saving && <Loader2 size={13} className="animate-spin" />} Hand over</button></>}>
      <div className="space-y-3">
        <p className="text-[12px] text-gray-600">They become the owner of this enquiry and its open follow-ups, and get a notification. Everything logged so far stays on the timeline.</p>
        <div><label className={labelCls}>Hand to</label>
          <select value={to} onChange={e => setTo(e.target.value)} className={inputCls}><option value="">Choose…</option>{people.map(p => <option key={p.id} value={p.id}>{p.name}{p.department ? ` · ${p.department}` : ''}</option>)}</select></div>
        <div><label className={labelCls}>Note for them</label><textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="What the client wants, budget, when they expect the quotation" className="w-full text-[13px] border border-gray-300 rounded p-2.5 outline-none focus:border-blue-500" /></div>
        <ErrorNote text={error} />
      </div>
    </Modal>
  );
}

const fmtYmd = (v) => { const d = new Date(v); return isNaN(d) ? '' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const LEAD_EDIT_KEYS = ['lead_name', 'contact_designation', 'company', 'phone', 'email', 'gstin', 'address', 'city', 'state', 'lead_source', 'source_detail', 'referral_name', 'referral_contact', 'project_name', 'timeline', 'value', 'owner_id', 'notes'];

/** Enquiry details grouped the way the intake form asks for them; edited in place. */
function LeadDetailsCard({ record, meta, onSaved }) {
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const services = meta.services || [];
  useEffect(() => { setF({ ...Object.fromEntries(LEAD_EDIT_KEYS.map(k => [k, record[k] ?? ''])), services: record.services || [] }); setError(''); }, [record, edit]);
  const save = async () => {
    setSaving(true); setError('');
    try { await api(`/leads/${record.id}`, { method: 'PUT', body: f }); setEdit(false); onSaved(); } catch (e) { setError(e.message); } finally { setSaving(false); }
  };
  const ownerName = (id) => meta.people.find(p => Number(p.id) === Number(id))?.name || '—';
  const Row = ({ label, children }) => <><dt className="text-gray-500 text-xs pt-0.5">{label}</dt><dd className="min-w-0 text-gray-900 break-words whitespace-pre-wrap">{children || '—'}</dd></>;
  const Group = ({ title, children }) => <div className="pt-2.5 first:pt-0"><div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">{title}</div><dl className="grid grid-cols-[100px_1fr] gap-y-1 text-[13px]">{children}</dl></div>;
  const picked = (record.services || []).map(s => ({ ...s, sv: services.find(x => x.id === s.id) })).filter(s => s.sv);

  if (edit) {
    return (
      <div className="bg-white border border-gray-200 rounded p-4 space-y-4">
        <div className="flex items-center justify-between"><span className="text-xs font-semibold text-gray-700">Edit enquiry</span>
          <span className="flex gap-1.5"><button onClick={() => setEdit(false)} className={btn.ghost}>Cancel</button><button onClick={save} disabled={saving} className={btn.primary}>{saving && <Loader2 size={13} className="animate-spin" />} Save</button></span></div>
        <div><div className="text-[11px] font-semibold text-gray-500 uppercase mb-1.5">Where it came from</div><SourceFields value={f} onChange={setF} compact /></div>
        <div><div className="text-[11px] font-semibold text-gray-500 uppercase mb-1.5">Contact and billing</div><ClientIntakeFields value={f} onChange={setF} /></div>
        <div><div className="text-[11px] font-semibold text-gray-500 uppercase mb-1.5">Requirement</div>
          <ServicePicker services={services} value={f.services} onChange={(list) => setF(x => ({ ...x, services: list }))} />
          <div className="grid grid-cols-1 gap-2 mt-2">
            <div><label className={labelCls}>Requirement in one line</label><input value={f.project_name || ''} onChange={e => setF(x => ({ ...x, project_name: e.target.value }))} className={inputCls} /></div>
            <div><label className={labelCls}>When do they need it?</label><input value={f.timeline || ''} onChange={e => setF(x => ({ ...x, timeline: e.target.value }))} className={inputCls} /></div>
            <div><label className={labelCls}>Expected value (₹)</label><div className="flex gap-1.5"><input value={f.value || ''} onChange={e => setF(x => ({ ...x, value: e.target.value.replace(/[^\d.]/g, '') }))} className={inputCls} />
              {f.services?.length > 0 && <button type="button" onClick={() => setF(x => ({ ...x, value: String(expectedValueOf(x.services, services)) }))} className={`${btn.ghost} shrink-0`} title="Use list prices of the services picked">From services</button>}</div></div>
            <div><label className={labelCls}>Budget, scope, anything else</label><textarea value={f.notes || ''} onChange={e => setF(x => ({ ...x, notes: e.target.value }))} rows={3} className="w-full text-[13px] border border-gray-300 rounded p-2 outline-none focus:border-blue-500" /></div>
            <div><label className={labelCls}>Owner</label><select value={f.owner_id || ''} onChange={e => setF(x => ({ ...x, owner_id: e.target.value }))} className={inputCls}>{meta.people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          </div>
        </div>
        <ErrorNote text={error} />
      </div>
    );
  }
  return (
    <div className="bg-white border border-gray-200 rounded p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-700">Enquiry details</span>
        <button onClick={() => setEdit(true)} className="text-xs text-blue-700 hover:underline cursor-pointer inline-flex items-center gap-1"><Pencil size={11} /> Edit</button>
      </div>
      <div className="divide-y divide-gray-100 [&>*]:pb-2.5">
        <Group title="Where it came from"><Row label="Source">{originText(record)}</Row></Group>
        <Group title="Contact">
          <Row label="Name">{[record.lead_name, record.contact_designation].filter(Boolean).join(', ')}</Row>
          <Row label="Phone">{record.phone && <a href={`tel:${record.phone}`} className="text-blue-700">{record.phone}</a>}</Row>
          <Row label="Email">{record.email && <a href={`mailto:${record.email}`} className="text-blue-700">{record.email}</a>}</Row>
        </Group>
        <Group title="Billing">
          <Row label="Company">{record.company}</Row>
          <Row label="Address">{[record.address, record.city, record.state].filter(Boolean).join(', ')}</Row>
          <Row label="GSTIN">{record.gstin}</Row>
        </Group>
        <Group title="Requirement">
          <Row label="Services">{picked.length ? <span className="flex flex-wrap gap-1">{picked.map(s => <span key={s.id} className="text-[11px] bg-gray-100 rounded px-1.5 py-0.5">{s.sv.name} × {s.qty}</span>)}</span> : <span className="text-orange-700">Not picked yet</span>}</Row>
          <Row label="In one line">{record.project_name}</Row>
          <Row label="Needed by">{record.timeline}</Row>
          <Row label="Expected">{Number(record.value) ? money(record.value) : ''}</Row>
          <Row label="Notes">{record.notes}</Row>
        </Group>
        <Group title="Owner"><Row label="Owner">{ownerName(record.owner_id)}</Row></Group>
      </div>
    </div>
  );
}

function DealDetailsCard({ record, meta, onSaved }) {
  const [edit, setEdit] = useState(false);
  const fields = [['deal_name', 'Deal name'], ['deal_value', 'Deal value (₹)'], ['expected_close_date', 'Expected close'], ['assignee_id', 'Owner'], ['priority', 'Priority'], ['source', 'Source'], ['description', 'Details']];
  const [f, setF] = useState({});
  const [error, setError] = useState('');
  useEffect(() => { setF(Object.fromEntries(fields.map(([k]) => [k, k === 'expected_close_date' && record[k] ? fmtYmd(record[k]) : record[k] ?? '']))); }, [record, edit]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = async () => {
    try { await api(`/deals/${record.id}`, { method: 'PUT', body: f }); setEdit(false); onSaved(); } catch (e) { setError(e.message); }
  };
  const ownerName = (id) => meta.people.find(p => Number(p.id) === Number(id))?.name || '—';
  return (
    <div className="bg-white border border-gray-200 rounded p-4">
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
                  {k === 'assignee_id' ? ownerName(record[k]) : /value/.test(k) ? money(record[k]) : k === 'expected_close_date' ? fmtDate(record[k]) : (record[k] || '—')}
                </span>
              ) : k === 'assignee_id' ? (
                <select value={f[k] || ''} onChange={e => setF(x => ({ ...x, [k]: e.target.value }))} className={inputCls}>{meta.people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
              ) : k === 'priority' ? (
                <select value={f[k] || 'Medium'} onChange={e => setF(x => ({ ...x, [k]: e.target.value }))} className={inputCls}>{['Low', 'Medium', 'High'].map(p => <option key={p}>{p}</option>)}</select>
              ) : k === 'description' ? (
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

export default function SalesRecordPage({ kind }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const base = useSalesBase();
  const meta = useSalesMeta();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [filter, setFilter] = useState('all');

  // Going from an enquiry to its opportunity reuses this page, so the previous record's data is
  // still here for one render, and a slow earlier request can land late. Only data loaded for
  // the record on screen is used.
  const recordKey = `${kind}:${id}`;
  const keyRef = useRef(recordKey);
  keyRef.current = recordKey;
  const load = useCallback(() => {
    const key = `${kind}:${id}`;
    api(`/${kind === 'lead' ? 'leads' : 'deals'}/${id}`)
      .then(d => { if (keyRef.current === key) { setData({ ...d, _key: key }); setError(''); } })
      .catch(e => { if (keyRef.current === key) setError(e.message); });
  }, [kind, id]);
  useEffect(() => { setData(null); setError(''); setModal(null); load(); }, [load]);

  const current = data && data._key === recordKey ? data : null;
  if (error && !current) return <div className="p-8 text-sm text-red-700">{error}</div>;
  if (!current || !meta) return <div className="min-h-[60vh] flex items-center justify-center gap-2 text-sm text-gray-500"><Loader2 size={16} className="animate-spin" /> Loading…</div>;

  const isLead = kind === 'lead';
  const rec = isLead ? current.lead : current.deal;
  if (!rec) return <div className="p-8 text-sm text-red-700">{isLead ? 'Enquiry' : 'Opportunity'} not found.</div>;
  const status = rec.status;
  const closed = isLead ? ['Lost', 'Unqualified', 'Converted to Deal'].includes(status) : ['Won', 'Lost'].includes(status);
  const onHold = status === 'On Hold';
  const openFollowups = data.followups.filter(f => ['Scheduled', 'Pending', 'Overdue'].includes(f.status));
  const canQuote = Boolean(meta.me?.canQuote);
  const quotations = data.quotations || [];
  const decks = data.decks || [];

  const setLeadStatus = async (s) => { try { await api(`/leads/${id}/status`, { method: 'POST', body: { status: s } }); load(); } catch (e) { setError(e.message); } };
  const moveStage = async (s) => {
    if (/^won$/i.test(s.name)) { setModal({ kind: 'won', target: s.name }); return; }
    if (/^lost$/i.test(s.name)) { setModal({ kind: 'lost', target: s.name }); return; }
    try { await api(`/deals/${id}/stage`, { method: 'POST', body: { stage: s.name } }); load(); } catch (e) { setError(e.message); }
  };
  // One "create quotation" entry point: from an enquiry it carries the intake over; on a deal it picks the format.
  const startQuote = () => setModal(isLead ? { kind: 'quoteFromLead' } : { kind: 'newquote' });
  // A call / meeting where the client asked for a quotation leads straight to making one.
  const afterContact = (r) => {
    load();
    if (asksForQuote(r?.outcome) && canQuote && !closed) setModal({ kind: 'askQuote' });
    else setModal(null);
  };

  // Group quotation versions by number (newest version first); the most recently created number is "the" quotation.
  const quoteGroups = {};
  quotations.forEach(q => { (quoteGroups[q.base] = quoteGroups[q.base] || []).push(q); });
  const latestQuote = Object.values(quoteGroups).map(v => v[0]).sort((a, b) => b.id - a.id)[0] || null;

  // Where this record is in the flow, and the one thing to do next.
  const steps = flowStepsFor({ isLead, rec, timeline: data.timeline, quotations, decks, lead: data.lead });
  const step = steps.find(s => s.current)?.label;
  const wonStage = (data.stages || []).find(s => /^won$/i.test(s.name));
  const openQuote = latestQuote && <button onClick={() => navigate(`${base}/quotation/${latestQuote.id}`)} className={btn.primary}><ArrowRight size={13} /> Open {latestQuote.base}{latestQuote.version > 1 ? ` v${latestQuote.version}` : ''}</button>;
  const reviseQuote = latestQuote && canQuote && <button onClick={() => setModal({ kind: 'revise', quote: latestQuote })} className={btn.ghost}><RotateCcw size={13} /> Revise</button>;
  const qName = latestQuote ? `${latestQuote.base}${latestQuote.version > 1 ? ` v${latestQuote.version}` : ''}` : '';
  // Once a quotation exists, the next step follows the status of its latest version.
  const quoteAction = !latestQuote ? null : {
    Draft: { text: `${qName} is a draft: finish it and click “Ready to send”.`, button: openQuote },
    'Pending Approval': { text: `${qName} is waiting for a manager to approve the discount.`, button: openQuote },
    Approved: { text: `${qName} is approved: email it to the client or mark it as sent.`, button: openQuote },
    Sent: { text: `Waiting for the client on ${qName}: follow up, then record accepted / declined, or revise if they want changes.`, button: <>{openQuote}{reviseQuote}</> },
    Declined: { text: `The client declined ${qName}: revise it with their changes, or mark the deal lost.`, button: <>{reviseQuote}{openQuote}</> },
    Accepted: { text: `${qName} was accepted: mark the deal won with the final value.`, button: wonStage && <button onClick={() => moveStage(wonStage)} className={btn.green}><Trophy size={13} /> Mark won</button> }
  }[latestQuote.status] || null;
  const latestDeck = !latestQuote && decks.length ? decks[0] : null;
  const nextAction = closed || onHold ? null
    : step === 'First contact' ? { text: 'Call the client and log what they need.', button: <button onClick={() => setModal({ kind: 'log' })} className={btn.primary}><Phone size={13} /> Log call</button> }
      : step === 'Requirement clear' ? { text: 'Pick the services they asked for in the enquiry details, then mark it Qualified.', button: <button onClick={() => setLeadStatus('Qualified')} className={btn.ghost}><CheckCircle2 size={13} /> Mark qualified</button> }
        : step === 'Quotation' ? (canQuote
          ? { text: 'The requirement is clear: make the quotation. It is pre-filled from this enquiry.', button: <button onClick={startQuote} className={btn.primary}><FilePlus2 size={13} /> Create quotation</button> }
          : { text: 'The requirement is clear. Quotations are made by a sales executive: pass the enquiry on with a note.', button: isLead && <button onClick={() => setModal({ kind: 'handover' })} className={btn.primary}><ArrowRightCircle size={13} /> Pass to executive</button> })
          : quoteAction ? quoteAction
            : latestDeck ? { text: `Proposal ${latestDeck.number} is ${String(latestDeck.status).toLowerCase()}.`, button: <button onClick={() => navigate(`${base}/proposal/${latestDeck.id}`)} className={btn.primary}><ArrowRight size={13} /> Open {latestDeck.number}</button> }
              : null;

  return (
    <div className="p-5 bg-[#F8FAFC] min-h-screen font-sans text-gray-900">
      <button onClick={() => navigate(`${base}/pipeline${isLead ? '?tab=leads' : ''}`)} className="text-xs text-gray-500 hover:text-gray-800 inline-flex items-center gap-1 mb-2 cursor-pointer"><ArrowLeft size={13} /> Sales pipeline</button>

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded p-4 mb-4">
        <div className="flex flex-wrap items-start gap-3">
          <span className={`w-11 h-11 rounded flex items-center justify-center shrink-0 ${isLead ? 'bg-sky-50 text-sky-700' : 'bg-indigo-50 text-indigo-700'}`}>{isLead ? <User size={20} /> : <Building2 size={20} />}</span>
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
                {originText(rec) && <span>From: {originText(rec)}</span>}<span>Owner: {rec.owner || '—'}</span>
              </> : <>
                <span>{rec.company_name || '—'}</span><span>{money(rec.deal_value)}</span>{rec.expected_close_date && <span>Close by {fmtDate(rec.expected_close_date)}</span>}<span>Owner: {rec.owner || '—'}</span>
                {data.lead && originText(data.lead) && <span>From: {originText(data.lead)}</span>}
                {data.lead && <button onClick={() => navigate(`${base}/enquiry/${data.lead.id}`)} className="text-blue-700 hover:underline cursor-pointer">Enquiry: {data.lead.name}</button>}
              </>}
            </div>
            {onHold && <div className="mt-2 text-[12px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5 inline-flex items-center gap-1.5"><PauseCircle size={13} /> On hold until {fmtDate(rec.hold_until)} — {rec.hold_reason}</div>}
            {(status === 'Lost' || status === 'Unqualified') && (rec.lost_reason) && <div className="mt-2 text-[12px] text-red-700 bg-red-50 border border-red-200 rounded px-2.5 py-1.5 inline-block">{status}: {rec.lost_reason}</div>}
            {isLead && data.deal && <button onClick={() => navigate(`${base}/opportunity/${data.deal.id}`)} className="mt-2 text-[12px] text-violet-800 bg-violet-50 border border-violet-200 rounded px-2.5 py-1.5 inline-flex items-center gap-1.5 cursor-pointer">Quotations and the deal are here: {data.deal.deal_name} <ChevronRight size={13} /></button>}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {!closed && <button onClick={() => setModal({ kind: 'log' })} className={btn.primary}><MessageSquarePlus size={13} /> Log communication</button>}
            {!closed && <button onClick={() => setModal({ kind: 'schedule' })} className={btn.ghost}><CalendarPlus size={13} /> Schedule</button>}
            {!closed && canQuote && <button onClick={startQuote} className={btn.blue}><FilePlus2 size={13} /> {isLead ? 'Create quotation' : 'New quotation'}</button>}
            {isLead && !closed && canQuote && <button onClick={() => setModal({ kind: 'convert' })} className={btn.ghost}><ArrowRightCircle size={13} /> Convert to deal</button>}
            {isLead && !closed && !canQuote && <button onClick={() => setModal({ kind: 'handover' })} className={btn.ghost}><ArrowRightCircle size={13} /> Pass to executive</button>}
            {!closed && (onHold
              ? <button onClick={async () => { try { await api(`/${isLead ? 'leads' : 'deals'}/${id}/resume`, { method: 'POST' }); } catch (e) { setError(e.message); } load(); }} className={btn.ghost}><PlayCircle size={13} /> Resume</button>
              : <button onClick={() => setModal({ kind: 'hold' })} className={btn.ghost}><PauseCircle size={13} /> On hold</button>)}
          </div>
        </div>

        {/* Where it is in the flow + what to do next */}
        <div className="mt-4 pt-3 border-t border-gray-100">
          <FlowSteps steps={steps} />
          {nextAction && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[12.5px] bg-red-50/40 border border-red-100 rounded px-3 py-2">
              <span className="font-semibold text-red-700">Next:</span><span className="text-gray-800 flex-1 min-w-[200px]">{nextAction.text}</span>{nextAction.button}
            </div>
          )}
        </div>

        {/* Status / stage control */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          {isLead ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-gray-500 mr-1">Status:</span>
              {['New', 'Contacted', 'Qualified'].map(s => (
                <button key={s} disabled={closed} onClick={() => setLeadStatus(s)} className={`h-7 px-3 text-xs rounded border cursor-pointer disabled:cursor-default ${status === s ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50'}`}>{s}</button>
              ))}
              {!closed && <>
                <button onClick={() => setModal({ kind: 'leadReason', target: 'Unqualified' })} className="h-7 px-3 text-xs rounded border border-gray-300 text-gray-600 hover:bg-gray-50 cursor-pointer">Unqualified</button>
                <button onClick={() => setModal({ kind: 'leadReason', target: 'Lost' })} className="h-7 px-3 text-xs rounded border border-red-200 text-red-700 hover:bg-red-50 cursor-pointer inline-flex items-center gap-1"><XCircle size={12} /> Lost</button>
              </>}
              {(status === 'Lost' || status === 'Unqualified') && <button onClick={() => setLeadStatus('Contacted')} className="h-7 px-3 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer">Re-open</button>}
            </div>
          ) : (
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {data.stages.map((s, i) => {
                const curIdx = data.stages.findIndex(x => x.name === rec.deal_stage);
                const done = i < curIdx; const isCurrent = s.name === rec.deal_stage;
                const special = /^(won|lost)$/i.test(s.name);
                return (
                  <button key={s.id} onClick={() => moveStage(s)} title={`${s.name} · ${s.probability}%`}
                    className={`shrink-0 h-8 px-3 text-[11.5px] font-medium rounded border cursor-pointer flex items-center gap-1 ${isCurrent ? (special ? stageTone(s.name, status).replace('ring-', 'border-') : 'bg-indigo-600 text-white border-indigo-600') : done && !special ? 'bg-indigo-50 text-indigo-800 border-indigo-100' : special ? (/won/i.test(s.name) ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50' : 'border-red-200 text-red-700 hover:bg-red-50') : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
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
            <div className="bg-white border border-gray-200 rounded p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] font-semibold text-gray-900 flex items-center gap-1.5"><FileText size={14} /> Quotations</span>
                {!closed && canQuote && <button onClick={startQuote} className={btn.ghost}><FilePlus2 size={13} /> New quotation</button>}
              </div>
              {Object.keys(quoteGroups).length === 0 && decks.length === 0 ? <div className="text-xs text-gray-500">No quotation yet. Create one when the requirement is clear; it starts from the enquiry's details.</div> : (
                <div className="space-y-2">
                  {Object.entries(quoteGroups).map(([num, versions]) => {
                    const latest = versions[0];
                    const canRevise = !closed && canQuote && ['Sent', 'Declined', 'Approved', 'Accepted'].includes(latest.status);
                    return (
                      <div key={num} className="border border-gray-200 rounded">
                        <div className="p-3 flex flex-wrap items-center gap-2">
                          <button onClick={() => navigate(`${base}/quotation/${latest.id}`)} className="flex flex-wrap items-center gap-2 flex-1 min-w-0 text-left cursor-pointer hover:opacity-80">
                            <span className="font-mono text-[12px] text-gray-700">{num}</span>
                            <span className="text-[11px] text-gray-500">v{latest.version}</span>
                            <Badge text={latest.status} tone={QUOTE_STATUS_STYLE[latest.status]} />
                            <span className="text-[12px] text-gray-600 truncate flex-1 min-w-[120px]">{latest.subject}</span>
                            <span className="text-[13px] font-semibold tabular-nums">{money(latest.total)}</span>
                          </button>
                          {canRevise && <button onClick={() => setModal({ kind: 'revise', quote: latest })} className="h-7 px-2 text-[11px] rounded border border-gray-300 hover:bg-gray-50 cursor-pointer inline-flex items-center gap-1" title="Make a new version with the changes the client asked for"><RotateCcw size={11} /> Revise</button>}
                          <a href={pdfUrl(latest.id, true)} className="p-1 text-gray-500 hover:text-gray-900" title="Download PDF"><Download size={14} /></a>
                        </div>
                        {versions.length > 1 && (
                          <div className="px-3 pb-2 space-y-0.5 border-t border-gray-100 pt-1.5">
                            {versions.slice(1).map((v, i) => {
                              const newer = versions[i];
                              const delta = newer.total - v.total;
                              return (
                                <button key={v.id} onClick={() => navigate(`${base}/quotation/${v.id}`)} className="w-full text-left text-[11px] text-gray-500 hover:text-gray-900 cursor-pointer flex flex-wrap gap-x-2">
                                  <span>v{v.version} · {v.status} · {money(v.total)}</span>
                                  {delta !== 0 && <span className={delta < 0 ? 'text-emerald-700' : 'text-orange-700'}>→ v{newer.version} {delta < 0 ? '−' : '+'}{money(Math.abs(delta))}</span>}
                                  {newer.revisionNote && <span className="text-gray-600 truncate">“{newer.revisionNote}”</span>}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {decks.length > 0 && <div className="space-y-2 mt-2">
                {decks.map(dk => (
                  <div key={`dk${dk.id}`} className="border border-gray-200 rounded">
                    <button onClick={() => navigate(`${base}/proposal/${dk.id}`)} className="w-full text-left p-3 flex flex-wrap items-center gap-2 hover:bg-gray-50 rounded cursor-pointer">
                      <span className="font-mono text-[12px] text-gray-700">{dk.number}</span>
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-violet-700 bg-violet-50 ring-1 ring-violet-200 rounded px-1"><Presentation size={9} /> {dk.kind === 'marketing' ? 'DM' : 'IT'}</span>
                      <Badge text={dk.status} tone={QUOTE_STATUS_STYLE[dk.status]} />
                      <span className="text-[12px] text-gray-600 truncate flex-1 min-w-[120px]">{dk.title || '—'}</span>
                      {dk.total > 0 && <span className="text-[13px] font-semibold tabular-nums">{money(dk.total)}</span>}
                      <a href={proposalPdfUrl(dk.id)} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="p-1 text-gray-500 hover:text-gray-900" title="Open deck PDF"><Download size={14} /></a>
                    </button>
                  </div>
                ))}
              </div>}
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <span className="text-[13px] font-semibold text-gray-900">Timeline</span>
              <div className="flex gap-1">
                {[['all', 'All'], ['communication', 'Calls & messages'], ...(isLead ? [] : [['quotation', 'Quotations']]), ['status', 'Status & schedule']].map(([kk, l]) => (
                  <button key={kk} onClick={() => setFilter(kk)} className={`h-7 px-2.5 text-xs rounded border cursor-pointer ${filter === kk ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}>{l}</button>
                ))}
              </div>
            </div>
            <Timeline items={data.timeline} filter={filter} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-700">Follow-ups ({openFollowups.length})</span>
              {!closed && <button onClick={() => setModal({ kind: 'schedule' })} className="text-xs text-blue-700 hover:underline cursor-pointer">+ Schedule</button>}
            </div>
            {!closed && openFollowups.length === 0 && <div className="mb-2 text-[12px] text-orange-800 bg-orange-50 border border-orange-200 rounded px-2.5 py-1.5 flex items-center gap-1.5"><AlertTriangle size={13} /> No next step planned.</div>}
            <FollowupList items={data.followups} meta={meta} onChanged={afterContact} emptyText={closed ? 'Closed.' : ''} />
          </div>
          {isLead ? <LeadDetailsCard record={rec} meta={meta} onSaved={load} /> : <DealDetailsCard record={rec} meta={meta} onSaved={load} />}
        </div>
      </div>

      {modal?.kind === 'log' && <LogCommunicationModal meta={meta} leadId={isLead ? rec.id : null} dealId={isLead ? null : rec.id} onClose={() => setModal(null)} onSaved={afterContact} />}
      {modal?.kind === 'schedule' && <ScheduleModal meta={meta} leadId={isLead ? rec.id : null} dealId={isLead ? null : rec.id} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
      {modal?.kind === 'askQuote' && (
        <Modal title="The client asked for a quotation" onClose={() => setModal(null)} width="max-w-md"
          footer={<><button onClick={() => setModal(null)} className={btn.ghost}>Later</button><button onClick={startQuote} className={btn.primary}><FilePlus2 size={13} /> Create quotation now</button></>}>
          <p className="text-[13px] text-gray-700">Make it while the conversation is fresh. {isLead ? 'It starts from this enquiry: bill-to details, the services asked for and the matching format.' : 'Pick the format and it opens pre-filled from the deal.'}</p>
          {isLead && !(rec.services || []).length && <p className="mt-2 text-[12px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5">Tip: pick the services they asked for in “Enquiry details” first, so the lines and format are filled for you.</p>}
        </Modal>
      )}
      {modal?.kind === 'quoteFromLead' && <QuoteFromEnquiryModal lead={rec} meta={meta} onClose={() => setModal(null)} />}
      {modal?.kind === 'handover' && <HandoverModal lead={rec} meta={meta} onClose={() => setModal(null)} onDone={() => navigate(`${base}/pipeline?tab=leads`)} />}
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
      {modal?.kind === 'revise' && (
        <ReasonModal title={`Revise ${modal.quote.base} (v${modal.quote.version} → v${modal.quote.version + 1})`} reasonLabel="What changes in this revision?"
          presets={['Price revised after negotiation', 'Scope changed by client', 'Added services', 'Removed services', 'Quantities changed']} confirmText="Create new version"
          extra={<p className="text-[12px] text-gray-600">v{modal.quote.version} is kept as it is for reference. The new version starts as a copy you can edit, then goes through approval and sending again.</p>}
          onClose={() => setModal(null)} onConfirm={async ({ reason }) => { const r = await api(`/quotations/${modal.quote.id}/revise`, { method: 'POST', body: { note: reason } }); navigate(`${base}/quotation/${r.id}`); }} />
      )}
      {modal?.kind === 'newquote' && <NewQuotationModal preset={{ deal: rec.id }} onClose={() => setModal(null)} />}
      {modal?.kind === 'won' && (
        <WonModal card={{ id: rec.id, name: rec.deal_name, value: Number(rec.deal_value) || 0, quotation: quotations.find(q => q.status === 'Accepted') || decks.find(d => d.status === 'Accepted') || null }} target={modal.target}
          onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} />
      )}
    </div>
  );
}

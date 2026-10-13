import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Loader2, Trash2, Save, SendHorizontal, Download, Eye, CheckCircle2, XCircle, RotateCcw, Mail, MessageCircle, ShieldCheck,
  AlertTriangle, FileText, Receipt, Trophy, History
} from 'lucide-react';
import { api, pdfUrl, useSalesBase, useSalesMeta, money2, fmtDate, fmtWhen, Badge, QUOTE_STATUS_STYLE, Modal, inputCls, labelCls, btn, ErrorNote, ReasonModal, addDays, dayOf } from './salesShared';
import { ItemsTable, TotalsCard, ClientFields, totalsOf, blankItem } from './LineItems';
import { RetainerPanel, ProjectPanel, SectionsEditor, ScopePreview, BillingCard } from './PlanPanels';

const TYPES = [
  ['retainer', 'Monthly retainer', 'Digital marketing: SEO, GMB, AEO, GEO, social media, Meta and Google Ads. Billed every month for the quota you set.'],
  ['project', 'Project', 'Software, ERP, CRM, IoT, websites. Scope of work, payment milestones and rules.'],
  ['general', 'Simple quotation', 'A plain list of items and prices.']
];
const nextMonth = () => { const d = new Date(); const n = new Date(d.getFullYear(), d.getMonth() + 1, 1); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`; };
const clone = (x) => JSON.parse(JSON.stringify(x));
const planFor = (type, meta) => {
  const d = meta.planDefaults || { sections: {}, milestones: [] };
  if (type === 'retainer') return { months: 6, startMonth: nextMonth(), adSpendNote: '', sections: clone(d.sections.retainer || []) };
  if (type === 'project') return { timeline: '', milestones: clone(d.milestones), sections: clone(d.sections.project || []) };
  return null;
};
const termsFor = (type, meta) => (type === 'retainer' ? meta.quotation.termsRetainer : type === 'project' ? meta.quotation.termsProject : meta.quotation.terms) || '';

/**
 * Quotation editor and its whole life: draft -> (discount approval) -> send by email / mark
 * sent -> accepted / declined -> revise (new version) -> invoice.
 */

function SendModal({ quote, onClose, onDone }) {
  const [to, setTo] = useState(quote.client.email || '');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const send = async () => {
    setSending(true); setError('');
    try { await api(`/quotations/${quote.id}/send`, { method: 'POST', body: { to, cc, subject: subject || undefined, message: message || undefined } }); onDone(); } catch (e) { setError(e.message); setSending(false); }
  };
  return (
    <Modal title={`Email ${quote.base}${quote.version > 1 ? ` (Rev. ${quote.version})` : ''}`} onClose={onClose} width="max-w-xl"
      footer={<><button onClick={onClose} className={btn.ghost}>Cancel</button><button onClick={send} disabled={sending} className={btn.blue}>{sending ? <Loader2 size={13} className="animate-spin" /> : <SendHorizontal size={13} />} Send with PDF</button></>}>
      <div className="space-y-3">
        <div><label className={labelCls}>To <span className="text-red-600">*</span></label><input value={to} onChange={e => setTo(e.target.value)} placeholder="client@example.com" className={inputCls} /></div>
        <div><label className={labelCls}>Cc</label><input value={cc} onChange={e => setCc(e.target.value)} placeholder="Separate with commas" className={inputCls} /></div>
        <div><label className={labelCls}>Subject</label><input value={subject} onChange={e => setSubject(e.target.value)} placeholder={`Quotation ${quote.base} from Codigix (default)`} className={inputCls} /></div>
        <div><label className={labelCls}>Message</label><textarea value={message} onChange={e => setMessage(e.target.value)} rows={6} className="w-full text-[13px] border border-gray-300 rounded p-2.5 outline-none focus:border-blue-500" placeholder="Leave empty to use the standard message from Sales Settings (greeting, total, validity, your name)." /></div>
        <div className="text-[11px] text-gray-500 flex items-center gap-1"><FileText size={12} /> The quotation PDF is attached. Replies come to your email address.</div>
        <ErrorNote text={error} />
      </div>
    </Modal>
  );
}

export default function QuotationEditorPage() {
  const { id } = useParams();
  const isNew = id === 'new';
  const dealParam = new URLSearchParams(window.location.search).get('deal');
  const typeParam = new URLSearchParams(window.location.search).get('type');
  const navigate = useNavigate();
  const base = useSalesBase();
  const meta = useSalesMeta();
  const [quote, setQuote] = useState(null);
  const [events, setEvents] = useState([]);
  const [limit, setLimit] = useState(10);
  const [canApprove, setCanApprove] = useState(false);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [modal, setModal] = useState(null);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    if (isNew) return;
    try {
      const d = await api(`/quotations/${id}`);
      setQuote(d.quotation); setEvents(d.events); setLimit(d.approvalLimit); setCanApprove(d.canApprove);
      setForm({ quoteType: d.quotation.quoteType || 'general', plan: d.quotation.plan || null, subject: d.quotation.subject, date: d.quotation.date ? dayOf(d.quotation.date) : '', validUntil: d.quotation.validUntil ? dayOf(d.quotation.validUntil) : '', gstMode: d.quotation.gstMode, terms: d.quotation.terms || '', notes: d.quotation.notes || '', client: d.quotation.client, items: d.quotation.items.map(i => ({ ...i, key: i.id })) });
      setDirty(false);
    } catch (e) { setError(e.message); }
  }, [id, isNew]);
  useEffect(() => { load(); }, [load]);

  // New quotation: start from the deal's client details.
  useEffect(() => {
    if (!isNew || !meta || form) return;
    (async () => {
      let client = {};
      if (dealParam) {
        try {
          const d = await api(`/deals/${dealParam}`);
          client = { name: d.deal.company_name || d.lead?.company || d.deal.deal_name, contact: d.lead?.name || d.deal.contact?.name || '', email: d.deal.company_email || d.lead?.email || '', phone: d.deal.company_phone || d.lead?.phone || '', address: [d.deal.company_address, d.deal.city].filter(Boolean).join(', '), state: d.deal.company_state || '' };
        } catch (e) { /* fill by hand */ }
      }
      const type = ['retainer', 'project', 'general'].includes(typeParam) ? typeParam : 'retainer';
      setForm({ quoteType: type, plan: planFor(type, meta), subject: '', date: addDays(0), validUntil: addDays(meta.quotation.validityDays || 15), gstMode: client.state && meta.companyState && client.state.toLowerCase() !== meta.companyState.toLowerCase() ? 'inter' : 'intra', terms: termsFor(type, meta), notes: '', client, items: [blankItem(meta.quotation.defaultTaxPct)] });
    })();
  }, [isNew, meta, dealParam, form]);

  const editable = isNew || (quote && ['Draft', 'Approved'].includes(quote.status));
  const t = useMemo(() => (form ? totalsOf(form.items, form.gstMode) : null), [form]);
  const overLimit = t && Math.max(t.discountPct, t.maxLine) > limit;

  const setF = (k, v) => { setForm(f => ({ ...f, [k]: v })); setDirty(true); };
  const setItems = (items) => { setForm(f => ({ ...f, items })); setDirty(true); };
  const setPlan = (plan) => { setForm(f => ({ ...f, plan })); setDirty(true); };
  // Changing the type swaps in that type's notes and rules, unless the terms were edited by hand.
  const changeType = (type) => setForm(f => ({ ...f, quoteType: type, plan: planFor(type, meta), terms: !f.terms || f.terms === termsFor(f.quoteType, meta) ? termsFor(type, meta) : f.terms })) || setDirty(true);

  const payload = () => ({ ...form, items: form.items.map(({ key, id: _id, total, ...rest }) => rest) });
  const save = async () => {
    setBusy('save'); setError('');
    try {
      if (isNew) {
        if (!dealParam) throw new Error('Open the deal and use “New quotation”.');
        const d = await api(`/deals/${dealParam}/quotations`, { method: 'POST', body: payload() });
        navigate(`${base}/quotation/${d.id}`, { replace: true });
      } else { await api(`/quotations/${id}`, { method: 'PUT', body: payload() }); await load(); }
      return true;
    } catch (e) { setError(e.message); return false; } finally { setBusy(''); }
  };
  const act = async (name, path, body, after) => {
    setBusy(name); setError('');
    try { const r = await api(path, { method: 'POST', body }); if (after) after(r); else await load(); } catch (e) { setError(e.message); } finally { setBusy(''); }
  };
  const submit = async () => { if (dirty && !(await save())) return; act('submit', `/quotations/${id}/submit`, {}); };
  const removeDraft = async () => {
    if (!window.confirm('Delete this draft?')) return;
    setBusy('delete');
    try { await apiDelete(`/quotations/${id}`); navigate(quote?.dealId ? `${base}/opportunity/${quote.dealId}` : `${base}/quotes`); } catch (e) { setError(e.message); setBusy(''); }
  };

  if (!meta || !form || (!isNew && !quote)) return <div className="min-h-[60vh] flex items-center justify-center gap-2 text-sm text-gray-500">{error ? <span className="text-red-700">{error}</span> : <><Loader2 size={16} className="animate-spin" /> Loading…</>}</div>;

  const status = isNew ? 'Draft' : quote.status;
  const latestVersion = quote?.versions?.length ? quote.versions[quote.versions.length - 1] : null;

  return (
    <div className="p-5 bg-[#F8FAFC] min-h-screen font-sans text-gray-900">
      <button onClick={() => navigate(quote?.dealId || dealParam ? `${base}/opportunity/${quote?.dealId || dealParam}` : `${base}/quotes`)} className="text-xs text-gray-500 hover:text-gray-800 inline-flex items-center gap-1 mb-2 cursor-pointer"><ArrowLeft size={13} /> {quote?.deal?.name || 'Back'}</button>

      {/* Header + actions */}
      <div className="bg-white border border-gray-200 rounded p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[18px] font-semibold">{isNew ? 'New quotation' : quote.base}</h1>
            {!isNew && <span className="text-[12px] text-gray-500">Version {quote.version}</span>}
            <Badge text={status} tone={QUOTE_STATUS_STYLE[status]} />
            {form.quoteType !== 'general' && <Badge text={form.quoteType === 'retainer' ? 'Monthly retainer' : 'Project'} tone="bg-indigo-50 text-indigo-800 ring-indigo-200" />}
            {dirty && editable && <span className="text-[11px] text-orange-700">Unsaved changes</span>}
          </div>
          <div className="text-[12px] text-gray-500 mt-0.5">
            {quote?.deal ? `${quote.deal.name}${quote.deal.company ? ` · ${quote.deal.company}` : ''}` : form.client.name}
            {quote?.sentAt && ` · Sent ${fmtWhen(quote.sentAt)}${quote.sentTo ? ` to ${quote.sentTo}` : ''}`}
            {quote?.createdBy && ` · By ${quote.createdBy}`}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {editable && <button onClick={save} disabled={!!busy} className={btn.ghost}>{busy === 'save' ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save draft</button>}
          {!isNew && status === 'Draft' && <button onClick={submit} disabled={!!busy} className={overLimit && !canApprove ? btn.primary : btn.blue}>{busy === 'submit' ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />} {overLimit && !canApprove ? 'Send for approval' : 'Ready to send'}</button>}
          {!isNew && status === 'Pending Approval' && canApprove && <>
            <button onClick={() => setModal('approve')} className={btn.green}><CheckCircle2 size={13} /> Approve discount</button>
            <button onClick={() => setModal('reject')} className={btn.danger}><XCircle size={13} /> Send back</button>
          </>}
          {!isNew && ['Approved', 'Sent'].includes(status) && <>
            <button onClick={() => setModal('send')} className={btn.blue}><Mail size={13} /> {status === 'Sent' ? 'Email again' : 'Email to client'}</button>
            <button onClick={() => setModal('marksent')} className={btn.ghost}><MessageCircle size={13} /> Mark as sent</button>
          </>}
          {!isNew && status === 'Sent' && <>
            <button onClick={() => act('accept', `/quotations/${id}/accept`, {})} disabled={!!busy} className={btn.green}><CheckCircle2 size={13} /> Client accepted</button>
            <button onClick={() => setModal('decline')} className={btn.danger}><XCircle size={13} /> Client declined</button>
          </>}
          {!isNew && ['Sent', 'Declined', 'Approved', 'Accepted'].includes(status) && <button onClick={() => setModal('revise')} className={btn.ghost}><RotateCcw size={13} /> Revise</button>}
          {!isNew && status === 'Accepted' && <>
            {form.quoteType === 'general' && <button onClick={() => act('invoice', `/quotations/${id}/invoice`, {}, (r) => navigate(`${base}/invoice/${r.id}`))} disabled={!!busy} className={btn.ghost}><Receipt size={13} /> Create invoice</button>}
            {quote.dealId && <button onClick={() => navigate(`${base}/opportunity/${quote.dealId}`)} className={btn.green}><Trophy size={13} /> Mark deal won</button>}
          </>}
          {!isNew && <>
            <a href={pdfUrl(id)} target="_blank" rel="noopener noreferrer" className={btn.ghost}><Eye size={13} /> Preview</a>
            <a href={pdfUrl(id, true)} className={btn.ghost}><Download size={13} /> PDF</a>
          </>}
          {!isNew && status === 'Draft' && <button onClick={removeDraft} disabled={!!busy} className={btn.danger}><Trash2 size={13} /></button>}
        </div>
      </div>

      {status === 'Revised' && latestVersion && latestVersion.id !== quote.id && (
        <div className="mb-4 text-[13px] bg-gray-50 border border-gray-200 rounded px-3 py-2">This version was replaced. <button onClick={() => navigate(`${base}/quotation/${latestVersion.id}`)} className="text-blue-700 hover:underline cursor-pointer">Open version {latestVersion.version}</button>.</div>
      )}
      {status === 'Pending Approval' && (
        <div className="mb-4 text-[13px] bg-amber-50 border border-amber-200 rounded px-3 py-2 flex items-center gap-2"><AlertTriangle size={14} className="text-amber-700" /> Waiting for a manager to approve the {quote.maxDiscountPct}% discount (limit {limit}%). Requested by {quote.approvalRequestedBy}.</div>
      )}
      {quote?.approvalStatus === 'rejected' && status === 'Draft' && (
        <div className="mb-4 text-[13px] bg-red-50 border border-red-200 rounded px-3 py-2">Sent back by {quote.approvedBy}: {quote.approvalNote}</div>
      )}
      {quote?.declineReason && status === 'Declined' && <div className="mb-4 text-[13px] bg-red-50 border border-red-200 rounded px-3 py-2">Declined: {quote.declineReason}</div>}
      {quote?.revisionNote && quote.version > 1 && <div className="mb-4 text-[13px] bg-orange-50 border border-orange-200 rounded px-3 py-2">Revision {quote.version}: {quote.revisionNote}</div>}
      <ErrorNote text={error} />

      <div className="grid xl:grid-cols-[1fr_320px] gap-4 mt-2">
        <div className="space-y-4 min-w-0">
          {!isNew && status === 'Accepted' && form.quoteType !== 'general' && <BillingCard quoteId={quote.id} base={base} />}
          {editable && (
            <div className="grid md:grid-cols-3 gap-2">
              {TYPES.map(([v, l, d]) => (
                <button key={v} type="button" onClick={() => form.quoteType !== v && (!dirty || isNew || window.confirm('Switching the type replaces the notes and rules below with that type\'s standard ones. Continue?')) && changeType(v)}
                  className={`text-left border rounded p-3 cursor-pointer ${form.quoteType === v ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-200' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                  <div className="text-[13px] font-semibold text-gray-900">{l}</div><div className="text-[11.5px] text-gray-600 mt-0.5 leading-snug">{d}</div>
                </button>
              ))}
            </div>
          )}
          {/* Client + terms of the quotation */}
          <div className="bg-white border border-gray-200 rounded p-4 grid md:grid-cols-2 gap-4">
            <ClientFields client={form.client} editable={editable} companyState={meta.companyState}
              onChange={(client) => { setForm(f => ({ ...f, client })); setDirty(true); }} onGstMode={(m) => setF('gstMode', m)} />
            <div className="space-y-2">
              <div className="text-xs font-semibold text-gray-700">Quotation</div>
              <div className="grid grid-cols-[110px_1fr] items-center gap-2"><label className="text-[12px] text-gray-500">Subject</label><input disabled={!editable} value={form.subject} onChange={e => setF('subject', e.target.value)} placeholder="e.g. Website + GMB for Bakul Caterings" className={`${inputCls} disabled:bg-gray-50`} /></div>
              <div className="grid grid-cols-[110px_1fr] items-center gap-2"><label className="text-[12px] text-gray-500">Date</label><input type="date" disabled={!editable} value={form.date} onChange={e => setF('date', e.target.value)} className={`${inputCls} disabled:bg-gray-50`} /></div>
              <div className="grid grid-cols-[110px_1fr] items-center gap-2"><label className="text-[12px] text-gray-500">Valid until</label><input type="date" disabled={!editable} value={form.validUntil} onChange={e => setF('validUntil', e.target.value)} className={`${inputCls} disabled:bg-gray-50`} /></div>
              <div className="grid grid-cols-[110px_1fr] items-center gap-2"><label className="text-[12px] text-gray-500">GST</label>
                <select disabled={!editable} value={form.gstMode} onChange={e => setF('gstMode', e.target.value)} className={`${inputCls} disabled:bg-gray-50`}>
                  <option value="intra">CGST + SGST (same state)</option><option value="inter">IGST (other state)</option>
                </select></div>
            </div>
          </div>

          <ItemsTable items={form.items} onChange={setItems} editable={editable} defaultTax={meta.quotation.defaultTaxPct} discountLimit={limit} services={meta.services || []} allowCredit={false} />
          {form.quoteType === 'retainer' && form.plan && <RetainerPanel plan={form.plan} onChange={setPlan} editable={editable} monthly={t.total} />}
          {form.quoteType === 'project' && form.plan && <ProjectPanel plan={form.plan} onChange={setPlan} editable={editable} total={t.total} />}
          {form.quoteType !== 'general' && form.plan && <ScopePreview items={form.items} services={meta.services || []} />}
          {form.quoteType !== 'general' && form.plan && <SectionsEditor sections={form.plan.sections || []} onChange={(sections) => setPlan({ ...form.plan, sections })} editable={editable} title={form.quoteType === 'retainer' ? 'Reporting, what we need from you, what is not included' : 'Deliverables, assumptions, exclusions, support and warranty'} />}

          <div className="bg-white border border-gray-200 rounded p-4 grid md:grid-cols-2 gap-4">
            <div><label className={labelCls}>Terms & conditions</label><textarea disabled={!editable} value={form.terms} onChange={e => setF('terms', e.target.value)} rows={6} className="w-full text-[12.5px] border border-gray-300 rounded p-2.5 outline-none focus:border-blue-500 disabled:bg-gray-50" /></div>
            <div><label className={labelCls}>Notes on the quotation</label><textarea disabled={!editable} value={form.notes} onChange={e => setF('notes', e.target.value)} rows={6} placeholder="Timeline, deliverables, anything else printed on the PDF" className="w-full text-[12.5px] border border-gray-300 rounded p-2.5 outline-none focus:border-blue-500 disabled:bg-gray-50" /></div>
          </div>
        </div>

        {/* Totals + versions + history */}
        <div className="space-y-4">
          <TotalsCard t={t} gstMode={form.gstMode}>
            {form.quoteType === 'retainer' && form.plan && <div className="mt-3 pt-3 border-t border-gray-100 text-[12.5px] space-y-1"><div className="flex justify-between"><span className="text-gray-500">Every month</span><span className="tabular-nums font-medium">{money2(t.total)}</span></div><div className="flex justify-between"><span className="text-gray-500">× {form.plan.months || 0} months</span><span className="tabular-nums font-semibold">{money2(t.total * (Number(form.plan.months) || 0))}</span></div></div>}
            {overLimit && <div className="mt-3 text-[12px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5 flex gap-1.5"><AlertTriangle size={13} className="shrink-0 mt-0.5" /> Discount above {limit}%{canApprove ? ' (you can approve it yourself).' : ': a manager must approve before it can be sent.'}</div>}
          </TotalsCard>

          {!isNew && quote.versions.length > 0 && (
            <div className="bg-white border border-gray-200 rounded p-4">
              <div className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1"><History size={12} /> Versions</div>
              <div className="space-y-1.5">
                {[...quote.versions].reverse().map(v => (
                  <button key={v.id} onClick={() => navigate(`${base}/quotation/${v.id}`)} className={`w-full text-left px-2.5 py-2 rounded border cursor-pointer ${v.id === quote.id ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <div className="flex items-center justify-between gap-2"><span className="text-[12px] font-medium">v{v.version}</span><Badge text={v.status} tone={QUOTE_STATUS_STYLE[v.status]} /></div>
                    <div className="text-[11px] text-gray-500 flex justify-between"><span>{fmtDate(v.createdAt)}</span><span className="tabular-nums">{money2(v.total)}</span></div>
                    {v.revisionNote && <div className="text-[11px] text-gray-600 mt-0.5 line-clamp-2">{v.revisionNote}</div>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isNew && events.length > 0 && (
            <div className="bg-white border border-gray-200 rounded p-4">
              <div className="text-xs font-semibold text-gray-700 mb-2">History</div>
              <ul className="space-y-2">
                {events.map(e => <li key={e.id} className="text-[12px]"><div className="text-gray-800">{e.title}</div><div className="text-[11px] text-gray-500">{fmtWhen(e.at)} · {e.by}</div>{e.body && <div className="text-[11px] text-gray-600 mt-0.5 whitespace-pre-wrap">{e.body}</div>}</li>)}
              </ul>
            </div>
          )}
        </div>
      </div>

      {modal === 'send' && <SendModal quote={quote} onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} />}
      {modal === 'marksent' && (
        <Modal title="Mark as sent" onClose={() => setModal(null)} width="max-w-sm">
          <p className="text-[12px] text-gray-600 mb-3">Shared the PDF another way? Download it, send it, then record how.</p>
          <div className="grid grid-cols-2 gap-2">
            {['WhatsApp', 'Email', 'In person', 'Courier'].map(v => <button key={v} onClick={() => { setModal(null); act('mark', `/quotations/${id}/mark-sent`, { via: v }); }} className={btn.ghost}>{v}</button>)}
          </div>
        </Modal>
      )}
      {modal === 'approve' && <ReasonModal title="Approve discount" reasonLabel="Note (optional)" confirmText="Approve" tone="green" onClose={() => setModal(null)} onConfirm={async ({ reason }) => { await api(`/quotations/${id}/approve`, { method: 'POST', body: { note: reason } }); setModal(null); load(); }} />}
      {modal === 'reject' && <ReasonModal title="Send back for changes" reasonLabel="What should change?" confirmText="Send back" tone="danger" onClose={() => setModal(null)} onConfirm={async ({ reason }) => { await api(`/quotations/${id}/reject`, { method: 'POST', body: { note: reason } }); setModal(null); load(); }} />}
      {modal === 'decline' && <ReasonModal title="Client declined" presets={['Price too high', 'Chose a competitor', 'Scope changed', 'Postponed']} reasonLabel="Why?" confirmText="Save" tone="danger" onClose={() => setModal(null)} onConfirm={async ({ reason }) => { await api(`/quotations/${id}/decline`, { method: 'POST', body: { reason } }); setModal(null); load(); }} />}
      {modal === 'revise' && <ReasonModal title={`Revise ${quote.base}`} reasonLabel="What changes in this revision?" presets={['Price revised after negotiation', 'Scope changed by client', 'Added services', 'Removed services']} confirmText="Create new version"
        onClose={() => setModal(null)} onConfirm={async ({ reason }) => { const r = await api(`/quotations/${id}/revise`, { method: 'POST', body: { note: reason } }); setModal(null); navigate(`${base}/quotation/${r.id}`); }} />}
    </div>
  );
}

const apiDelete = (path) => api(path, { method: 'DELETE' });

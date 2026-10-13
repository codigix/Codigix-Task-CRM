import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Save, Download, Eye, Mail, MessageCircle, Wallet, Trash2, SendHorizontal, FileText, AlertTriangle, History } from 'lucide-react';
import { useSalesBase, useSalesMeta, money2, fmtDate, fmtWhen, Badge, Modal, inputCls, labelCls, btn, ErrorNote, ymd, addDays, dayOf } from './salesShared';
import { ItemsTable, TotalsCard, ClientFields, totalsOf, blankItem } from './LineItems';
import { desk, Loading, Card, INVOICE_STATUS_STYLE, invoicePdfUrl, receiptPdfUrl, monthLabel } from './deskShared';

/**
 * Invoice: edit while Draft, then send (email with PDF, or mark as sent) and record payments.
 * The status follows the money: Sent -> Partially Paid -> Paid, Overdue after the due date.
 */

function SendModal({ invoice, onClose, onDone }) {
  const [to, setTo] = useState(invoice.client.email || '');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const send = async () => {
    setSending(true); setError('');
    try { await desk(`/invoices/${invoice.id}/send`, { method: 'POST', body: { to, cc, subject: subject || undefined, message: message || undefined } }); onDone(); } catch (e) { setError(e.message); setSending(false); }
  };
  return (
    <Modal title={`Email ${invoice.number}`} onClose={onClose} width="max-w-xl" footer={<><button onClick={onClose} className={btn.ghost}>Cancel</button><button onClick={send} disabled={sending} className={btn.blue}>{sending ? <Loader2 size={13} className="animate-spin" /> : <SendHorizontal size={13} />} Send with PDF</button></>}>
      <div className="space-y-3">
        <div><label className={labelCls}>To <span className="text-red-600">*</span></label><input value={to} onChange={e => setTo(e.target.value)} placeholder="client@example.com" className={inputCls} /></div>
        <div><label className={labelCls}>Cc</label><input value={cc} onChange={e => setCc(e.target.value)} placeholder="Separate with commas" className={inputCls} /></div>
        <div><label className={labelCls}>Subject</label><input value={subject} onChange={e => setSubject(e.target.value)} placeholder={`Invoice ${invoice.number} from Codigix (default)`} className={inputCls} /></div>
        <div><label className={labelCls}>Message</label><textarea value={message} onChange={e => setMessage(e.target.value)} rows={6} className="w-full text-[13px] border border-gray-300 rounded p-2.5 outline-none focus:border-blue-500" placeholder="Leave empty to use the standard invoice message from Sales Settings (amount due, due date, your name)." /></div>
        <div className="text-[11px] text-gray-500 flex items-center gap-1"><FileText size={12} /> The invoice PDF is attached. Sending an invoice issues it: it can no longer be edited.</div>
        <ErrorNote text={error} />
      </div>
    </Modal>
  );
}

function PaymentModal({ invoice, modes, onClose, onDone }) {
  const [f, setF] = useState({ amount: String(invoice.balance), date: ymd(), mode: 'Bank transfer', reference: '', notes: '', excessAsAdvance: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const needRef = ['Bank transfer', 'UPI', 'Cheque'].includes(f.mode);
  const save = async () => {
    setSaving(true); setError('');
    try { await desk(`/invoices/${invoice.id}/payments`, { method: 'POST', body: f }); onDone(); } catch (e) { setError(e.message); setSaving(false); }
  };
  return (
    <Modal title={`Record payment · ${invoice.number}`} onClose={onClose} width="max-w-md" footer={<><button onClick={onClose} className={btn.ghost}>Cancel</button><button onClick={save} disabled={saving} className={btn.green}>{saving && <Loader2 size={13} className="animate-spin" />} Save payment</button></>}>
      <div className="space-y-3">
        <div className="text-[12px] text-gray-600">Balance due <span className="font-semibold text-gray-900">{money2(invoice.balance)}</span>. A part payment is fine: the invoice becomes “Partly paid”.</div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Amount received (₹) <span className="text-red-600">*</span></label><input autoFocus value={f.amount} onChange={e => set('amount', e.target.value.replace(/[^\d.]/g, ''))} className={inputCls} /></div>
          <div><label className={labelCls}>Received on</label><input type="date" max={ymd()} value={f.date} onChange={e => set('date', e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Mode</label><select value={f.mode} onChange={e => set('mode', e.target.value)} className={inputCls}>{modes.map(m => <option key={m}>{m}</option>)}</select></div>
          <div><label className={labelCls}>{f.mode === 'Cheque' ? 'Cheque number' : 'Reference / UTR'}{needRef && <span className="text-red-600"> *</span>}</label><input value={f.reference} onChange={e => set('reference', e.target.value)} className={inputCls} /></div>
        </div>
        <div><label className={labelCls}>Notes</label><input value={f.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional" className={inputCls} /></div>
        {Number(f.amount) > invoice.balance + 0.01 && (
          <label className="flex items-start gap-2 text-[12.5px] text-gray-800 bg-blue-50 border border-blue-200 rounded px-2.5 py-2 cursor-pointer"><input type="checkbox" className="mt-0.5" checked={f.excessAsAdvance} onChange={e => set('excessAsAdvance', e.target.checked)} /><span>Keep the extra {money2(Number(f.amount) - invoice.balance)} as advance for this customer and adjust it on the next invoice.</span></label>
        )}
        <ErrorNote text={error} />
      </div>
    </Modal>
  );
}

export default function InvoicePage() {
  const { id } = useParams();
  const isNew = id === 'new';
  const customerParam = new URLSearchParams(window.location.search).get('customer');
  const navigate = useNavigate();
  const base = useSalesBase();
  const meta = useSalesMeta();
  const [inv, setInv] = useState(null);
  const [events, setEvents] = useState([]);
  const [modes, setModes] = useState([]);
  const [canDeletePay, setCanDeletePay] = useState(false);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [modal, setModal] = useState(null);
  const [dirty, setDirty] = useState(false);

  const fillForm = (i) => setForm({ subject: i.subject, date: i.date ? dayOf(i.date) : ymd(), dueDate: i.dueDate ? dayOf(i.dueDate) : '', gstMode: i.gstMode, terms: i.terms || '', notes: i.notes || '', client: i.client, items: i.items.map(x => ({ ...x, key: x.id })) });
  const load = useCallback(async () => {
    if (isNew) return;
    try {
      const d = await desk(`/invoices/${id}`);
      setInv(d.invoice); setEvents(d.events); setModes(d.payModes); setCanDeletePay(d.canDeletePayments); fillForm(d.invoice); setDirty(false);
    } catch (e) { setError(e.message); }
  }, [id, isNew]);
  useEffect(() => { load(); }, [load]);
  // ?pay=1 (from the Payments page) opens the payment form once the invoice has loaded.
  useEffect(() => { if (inv && new URLSearchParams(window.location.search).get('pay') === '1' && inv.balance > 0 && inv.status !== 'Draft') setModal('pay'); }, [inv?.id]); // eslint-disable-line

  // New invoice for a customer: start from their details.
  useEffect(() => {
    if (!isNew || !meta || form || !customerParam) return;
    desk(`/customers/${customerParam}`).then(d => {
      const c = d.customer;
      const client = { name: c.name.trim(), email: c.email, phone: c.phone, address: [c.address, c.city].filter(Boolean).join(', '), gstin: c.gstin, state: c.state };
      setForm({ subject: '', date: ymd(), dueDate: addDays(15), gstMode: client.state && meta.companyState && client.state.toLowerCase() !== meta.companyState.toLowerCase() ? 'inter' : 'intra', terms: '', notes: '', client, items: [blankItem(meta.quotation.defaultTaxPct)], companyId: c.id });
    }).catch(e => setError(e.message));
  }, [isNew, meta, form, customerParam]);

  const draft = isNew || inv?.status === 'Draft';
  const t = useMemo(() => (form ? totalsOf(form.items, form.gstMode) : null), [form]);
  const setF = (k, v) => { setForm(f => ({ ...f, [k]: v })); setDirty(true); };
  const payload = () => ({ ...form, items: form.items.map(({ key, id: _id, total, ...rest }) => rest) });

  const save = async () => {
    setBusy('save'); setError('');
    try {
      if (isNew) { const d = await desk('/invoices', { method: 'POST', body: { ...payload(), companyId: form.companyId } }); navigate(`${base}/invoice/${d.id}`, { replace: true }); }
      else { await desk(`/invoices/${id}`, { method: 'PUT', body: payload() }); await load(); }
      return true;
    } catch (e) { setError(e.message); return false; } finally { setBusy(''); }
  };
  const act = async (name, fn) => { setBusy(name); setError(''); try { await fn(); await load(); } catch (e) { setError(e.message); } finally { setBusy(''); } };
  const markSent = (via) => act('mark', async () => { if (dirty && !(await save())) throw new Error('Save the changes first.'); await desk(`/invoices/${id}/mark-sent`, { method: 'POST', body: { via } }); });
  const openSend = async () => { if (dirty && !(await save())) return; setModal('send'); };
  const removeDraft = async () => {
    if (!window.confirm('Delete this draft invoice?')) return;
    setBusy('delete');
    try { await desk(`/invoices/${id}`, { method: 'DELETE' }); navigate(`${base}/invoices`); } catch (e) { setError(e.message); setBusy(''); }
  };
  const removePayment = async (p) => {
    const reason = window.prompt(`Why is payment ${p.receipt} of ${money2(p.amount)} being removed?`);
    if (!reason) return;
    act('unpay', () => desk(`/payments/${p.id}`, { method: 'DELETE', body: { reason } }));
  };

  if (!meta || !form || (!isNew && !inv)) return <Loading error={error} />;
  const status = isNew ? 'Draft' : inv.status;

  return (
    <div className="p-5 bg-[#F8FAFC] min-h-screen font-sans text-gray-900">
      <button onClick={() => navigate(`${base}/invoices`)} className="text-xs text-gray-500 hover:text-gray-800 inline-flex items-center gap-1 mb-2 cursor-pointer"><ArrowLeft size={13} /> Invoices</button>

      <div className="bg-white border border-gray-200 rounded p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[18px] font-semibold">{isNew ? 'New invoice' : inv.number}</h1>
            <Badge text={status} tone={INVOICE_STATUS_STYLE[status]} />
            {!isNew && inv.serviceMonth && <Badge text={monthLabel(inv.serviceMonth)} tone="bg-indigo-50 text-indigo-800 ring-indigo-200" />}
            {!isNew && inv.milestoneName && <Badge text={`Milestone ${inv.milestoneNo}: ${inv.milestoneName}`} tone="bg-indigo-50 text-indigo-800 ring-indigo-200" />}
            {!isNew && inv.daysLate > 0 && <span className="text-[12px] text-red-700 font-medium">{inv.daysLate} days overdue</span>}
            {dirty && draft && <span className="text-[11px] text-orange-700">Unsaved changes</span>}
          </div>
          <div className="text-[12px] text-gray-500 mt-0.5">
            {form.client.name}
            {!isNew && inv.quotationNumber && <> · from <button onClick={() => navigate(`${base}/quotation/${inv.quotationId}`)} className="text-blue-700 hover:underline cursor-pointer">{inv.quotationNumber}</button></>}
            {!isNew && inv.dealName && <> · <button onClick={() => navigate(`${base}/opportunity/${inv.dealId}`)} className="text-blue-700 hover:underline cursor-pointer">{inv.dealName}</button></>}
            {!isNew && inv.sentAt && ` · Sent ${fmtWhen(inv.sentAt)}${inv.sentTo ? ` to ${inv.sentTo}` : ''}`}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {draft && <button onClick={save} disabled={!!busy} className={btn.ghost}>{busy === 'save' ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} {isNew ? 'Create draft' : 'Save draft'}</button>}
          {!isNew && status === 'Draft' && <>
            <button onClick={openSend} disabled={!!busy} className={btn.blue}><Mail size={13} /> Email to client</button>
            <button onClick={() => setModal('marksent')} disabled={!!busy} className={btn.ghost}><MessageCircle size={13} /> Mark as sent</button>
          </>}
          {!isNew && ['Sent', 'Partially Paid', 'Overdue'].includes(status) && <>
            <button onClick={() => setModal('pay')} className={btn.green}><Wallet size={13} /> Record payment</button>
            <button onClick={() => setModal('send')} className={btn.ghost}><Mail size={13} /> Email again</button>
          </>}
          {!isNew && <>
            <a href={invoicePdfUrl(id)} target="_blank" rel="noopener noreferrer" className={btn.ghost}><Eye size={13} /> Preview</a>
            <a href={invoicePdfUrl(id, true)} className={btn.ghost}><Download size={13} /> PDF</a>
          </>}
          {!isNew && status === 'Draft' && <button onClick={removeDraft} disabled={!!busy} className={btn.danger}><Trash2 size={13} /></button>}
        </div>
      </div>
      <ErrorNote text={error} />

      <div className="grid xl:grid-cols-[1fr_320px] gap-4 mt-2">
        <div className="space-y-4 min-w-0">
          <div className="bg-white border border-gray-200 rounded p-4 grid md:grid-cols-2 gap-4">
            <ClientFields client={form.client} editable={draft} withContact={false} companyState={meta.companyState} onChange={(client) => { setForm(f => ({ ...f, client })); setDirty(true); }} onGstMode={(m) => setF('gstMode', m)} />
            <div className="space-y-2">
              <div className="text-xs font-semibold text-gray-700">Invoice</div>
              <div className="grid grid-cols-[110px_1fr] items-center gap-2"><label className="text-[12px] text-gray-500">Subject</label><input disabled={!draft} value={form.subject} onChange={e => setF('subject', e.target.value)} placeholder="e.g. Website development, 50% advance" className={`${inputCls} disabled:bg-gray-50`} /></div>
              <div className="grid grid-cols-[110px_1fr] items-center gap-2"><label className="text-[12px] text-gray-500">Invoice date</label><input type="date" disabled={!draft} value={form.date} onChange={e => setF('date', e.target.value)} className={`${inputCls} disabled:bg-gray-50`} /></div>
              <div className="grid grid-cols-[110px_1fr] items-center gap-2"><label className="text-[12px] text-gray-500">Due date</label><input type="date" disabled={status === 'Paid'} value={form.dueDate} onChange={e => setF('dueDate', e.target.value)} className={`${inputCls} disabled:bg-gray-50`} /></div>
              <div className="grid grid-cols-[110px_1fr] items-center gap-2"><label className="text-[12px] text-gray-500">GST</label>
                <select disabled={!draft} value={form.gstMode} onChange={e => setF('gstMode', e.target.value)} className={`${inputCls} disabled:bg-gray-50`}><option value="intra">CGST + SGST (same state)</option><option value="inter">IGST (other state)</option></select></div>
              {!draft && dirty && <button onClick={save} className={btn.ghost}><Save size={13} /> Save due date</button>}
            </div>
          </div>

          <ItemsTable items={form.items} onChange={(items) => { setForm(f => ({ ...f, items })); setDirty(true); }} editable={draft} defaultTax={meta.quotation.defaultTaxPct} services={meta.services || []} />

          <div className="bg-white border border-gray-200 rounded p-4 grid md:grid-cols-2 gap-4">
            <div><label className={labelCls}>Terms & conditions</label><textarea disabled={!draft} value={form.terms} onChange={e => setF('terms', e.target.value)} rows={5} placeholder="Leave empty to use the standard invoice terms from Sales Settings" className="w-full text-[12.5px] border border-gray-300 rounded p-2.5 outline-none focus:border-blue-500 disabled:bg-gray-50" /></div>
            <div><label className={labelCls}>Notes on the invoice</label><textarea disabled={status === 'Paid'} value={form.notes} onChange={e => setF('notes', e.target.value)} rows={5} placeholder="Printed on the PDF" className="w-full text-[12.5px] border border-gray-300 rounded p-2.5 outline-none focus:border-blue-500 disabled:bg-gray-50" /></div>
          </div>
        </div>

        <div className="space-y-4">
          <TotalsCard t={t} gstMode={form.gstMode}>
            {!isNew && status !== 'Draft' && (
              <dl className="text-[13px] space-y-1.5 mt-3 pt-3 border-t border-gray-200">
                <div className="flex justify-between"><dt className="text-gray-500">Received</dt><dd className="tabular-nums text-emerald-700">{money2(inv.paid)}</dd></div>
                <div className="flex justify-between font-semibold"><dt>Balance due</dt><dd className={`tabular-nums ${inv.balance > 0 ? (status === 'Overdue' ? 'text-red-700' : '') : 'text-emerald-700'}`}>{money2(inv.balance)}</dd></div>
              </dl>
            )}
            {status === 'Draft' && !isNew && <div className="mt-3 text-[12px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5 flex gap-1.5"><AlertTriangle size={13} className="shrink-0 mt-0.5" /> Draft: the client has not received it. Email it or mark it as sent to issue it.</div>}
          </TotalsCard>

          {!isNew && inv.previousDues?.length > 0 && (
            <Card title="Earlier invoices still unpaid" pad={false}>
              <ul className="divide-y divide-gray-100">{inv.previousDues.map(d => (
                <li key={d.id}><button onClick={() => navigate(`${base}/invoice/${d.id}`)} className="w-full text-left px-4 py-2 hover:bg-gray-50 cursor-pointer flex items-center justify-between gap-2 text-[12.5px]"><span><span className="font-medium text-blue-700">{d.number}</span>{d.daysLate > 0 && <span className="text-red-700"> · {d.daysLate} days late</span>}</span><span className="tabular-nums font-medium">{money2(d.balance)}</span></button></li>
              ))}</ul>
              <div className="px-4 py-2 border-t border-gray-100 text-[12px] flex justify-between"><span className="text-gray-600">Outstanding with this invoice</span><span className="tabular-nums font-semibold">{money2(inv.previousDues.reduce((x, d) => x + d.balance, 0) + (status === 'Draft' ? inv.total : inv.balance))}</span></div>
              <div className="px-4 pb-2.5 text-[11px] text-gray-500">These are listed on the invoice PDF. Ask the client to clear them with this payment, or record a part payment on each.</div>
            </Card>
          )}

          {!isNew && inv.advance > 0 && status !== 'Draft' && inv.balance > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded p-3 text-[12.5px]">
              <div className="font-semibold text-blue-900">Advance held for this customer: {money2(inv.advance)}</div>
              <div className="text-blue-800 mt-0.5">Adjust it against this invoice instead of asking for payment again.</div>
              <button onClick={() => act('adv', () => desk(`/invoices/${id}/apply-advance`, { method: 'POST', body: {} }))} disabled={!!busy} className={`${btn.blue} mt-2`}><Wallet size={13} /> Adjust {money2(Math.min(inv.advance, inv.balance))}</button>
            </div>
          )}

          {!isNew && (
            <Card title={`Payments (${inv.payments.length})`} action={['Sent', 'Partially Paid', 'Overdue'].includes(status) && <button onClick={() => setModal('pay')} className="text-xs text-blue-700 hover:underline cursor-pointer">+ Record</button>} pad={false}>
              {inv.payments.length === 0 ? <div className="text-[12.5px] text-gray-500 py-5 text-center px-4">{status === 'Draft' ? 'Payments can be recorded once the invoice is sent.' : 'No payment received yet.'}</div> : (
                <ul className="divide-y divide-gray-100">{inv.payments.map(p => (
                  <li key={p.id} className="px-4 py-2.5 text-[12.5px]">
                    <div className="flex items-center justify-between gap-2"><span className="font-semibold tabular-nums">{money2(p.amount)}</span><span className="text-gray-500">{fmtDate(p.date)}</span></div>
                    <div className="text-gray-600">{p.mode}{p.reference ? ` · ${p.reference}` : ''}</div>
                    <div className="flex items-center gap-3 mt-0.5 text-[11.5px]">
                      <a href={receiptPdfUrl(p.id)} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">Receipt {p.receipt}</a>
                      {canDeletePay && <button onClick={() => removePayment(p)} className="text-gray-400 hover:text-red-600 cursor-pointer">Remove</button>}
                      <span className="text-gray-400 ml-auto">{p.by}</span>
                    </div>
                  </li>
                ))}</ul>
              )}
            </Card>
          )}

          {!isNew && events.length > 0 && (
            <Card title="History"><div className="text-[11px] text-gray-400 -mt-1 mb-2 flex items-center gap-1"><History size={11} /> newest first</div>
              <ul className="space-y-2">{events.map(e => <li key={e.id} className="text-[12px]"><div className="text-gray-800">{e.title}</div><div className="text-[11px] text-gray-500">{fmtWhen(e.at)} · {e.by}</div>{e.body && <div className="text-[11px] text-gray-600 mt-0.5 whitespace-pre-wrap">{e.body}</div>}</li>)}</ul>
            </Card>
          )}
        </div>
      </div>

      {modal === 'send' && <SendModal invoice={inv} onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} />}
      {modal === 'pay' && <PaymentModal invoice={inv} modes={modes} onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} />}
      {modal === 'marksent' && (
        <Modal title="Mark as sent" onClose={() => setModal(null)} width="max-w-sm">
          <p className="text-[12px] text-gray-600 mb-3">Shared the PDF another way? Download it, send it, then record how. This issues the invoice.</p>
          <div className="grid grid-cols-2 gap-2">{['WhatsApp', 'Email', 'In person', 'Courier'].map(v => <button key={v} onClick={() => { setModal(null); markSent(v); }} className={btn.ghost}>{v}</button>)}</div>
        </Modal>
      )}
    </div>
  );
}

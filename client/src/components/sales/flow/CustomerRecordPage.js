import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Wallet, ArrowLeft, Phone, Mail, MapPin, Plus, Pencil, Trash2, Download, Receipt, Building2, CalendarClock, FileText, Briefcase, Inbox } from 'lucide-react';
import { ymd, useSalesBase, useSalesMeta, money, money2, fmtDate, Badge, QUOTE_STATUS_STYLE, LEAD_STATUS_STYLE, stageTone, Timeline, Modal, inputCls, labelCls, btn, ErrorNote, addDays } from './salesShared';
import { desk, Loading, Kpi, Card, EmptyNote, Chips, INVOICE_STATUS_STYLE, CUSTOMER_TYPE_STYLE, statementPdfUrl, invoicePdfUrl, receiptPdfUrl } from './deskShared';

/**
 * One customer: contacts, enquiries, deals, quotations, invoices, payments and the whole
 * conversation history, with the statement of account.
 */

const TABS = [['overview', 'Overview'], ['deals', 'Deals & enquiries'], ['quotes', 'Quotations'], ['billing', 'Invoices & payments'], ['history', 'History']];

function ContactModal({ customerId, contact, onClose, onSaved }) {
  const [f, setF] = useState(contact || { name: '', phone: '', email: '', position: '', notes: '' });
  const [error, setError] = useState('');
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const save = async () => {
    try {
      if (contact) await desk(`/contacts/${contact.id}`, { method: 'PUT', body: f });
      else await desk(`/customers/${customerId}/contacts`, { method: 'POST', body: f });
      onSaved();
    } catch (e) { setError(e.message); }
  };
  return (
    <Modal title={contact ? 'Edit contact' : 'New contact'} onClose={onClose} width="max-w-md" footer={<><button onClick={onClose} className={btn.ghost}>Cancel</button><button onClick={save} className={btn.primary}>Save</button></>}>
      <div className="space-y-3">
        <div><label className={labelCls}>Name <span className="text-red-600">*</span></label><input autoFocus value={f.name} onChange={e => set('name', e.target.value)} className={inputCls} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Phone</label><input value={f.phone} onChange={e => set('phone', e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Email</label><input value={f.email} onChange={e => set('email', e.target.value)} className={inputCls} /></div>
        </div>
        <div><label className={labelCls}>Role</label><input value={f.position} onChange={e => set('position', e.target.value)} placeholder="Owner, Marketing head…" className={inputCls} /></div>
        <ErrorNote text={error} />
      </div>
    </Modal>
  );
}

function AdvanceModal({ customer, onClose, onSaved }) {
  const [f, setF] = useState({ amount: '', date: ymd(), mode: 'Bank transfer', reference: '', notes: '' });
  const [error, setError] = useState('');
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const save = async () => { try { await desk(`/customers/${customer.id}/advance`, { method: 'POST', body: f }); onSaved(); } catch (e) { setError(e.message); } };
  return (
    <Modal title={`Advance from ${customer.name.trim()}`} onClose={onClose} width="max-w-md" footer={<><button onClick={onClose} className={btn.ghost}>Cancel</button><button onClick={save} className={btn.green}>Save advance</button></>}>
      <div className="space-y-3">
        <p className="text-[12px] text-gray-600">Money received before an invoice exists, or more than was due. It is held for this customer and adjusted against the next invoice with one click.</p>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Amount (₹) <span className="text-red-600">*</span></label><input autoFocus value={f.amount} onChange={e => set('amount', e.target.value.replace(/[^\d.]/g, ''))} className={inputCls} /></div>
          <div><label className={labelCls}>Received on</label><input type="date" max={ymd()} value={f.date} onChange={e => set('date', e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Mode</label><select value={f.mode} onChange={e => set('mode', e.target.value)} className={inputCls}>{['Bank transfer', 'UPI', 'Cheque', 'Cash', 'Card', 'Other'].map(m => <option key={m}>{m}</option>)}</select></div>
          <div><label className={labelCls}>Reference / UTR</label><input value={f.reference} onChange={e => set('reference', e.target.value)} className={inputCls} /></div>
        </div>
        <ErrorNote text={error} />
      </div>
    </Modal>
  );
}

function EditCustomerModal({ customer, onClose, onSaved }) {
  const [f, setF] = useState({ ...customer });
  const [error, setError] = useState('');
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const save = async () => {
    try { await desk(`/customers/${customer.id}`, { method: 'PUT', body: { name: f.name, email: f.email, phone: f.phone, website: f.website, industry: f.industry, address: f.address, city: f.city, state: f.state, zipcode: f.zipcode, gstin: f.gstin, notes: f.notes, status: f.status === 'Prospect' ? 'Prospect' : f.status } }); onSaved(); } catch (e) { setError(e.message); }
  };
  return (
    <Modal title="Edit customer" onClose={onClose} width="max-w-2xl" footer={<><button onClick={onClose} className={btn.ghost}>Cancel</button><button onClick={save} className={btn.primary}>Save</button></>}>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><label className={labelCls}>Name</label><input value={f.name} onChange={e => set('name', e.target.value)} className={inputCls} /></div>
        {[['phone', 'Phone'], ['email', 'Email'], ['website', 'Website'], ['industry', 'Industry'], ['city', 'City'], ['state', 'State'], ['zipcode', 'PIN code'], ['gstin', 'GSTIN']].map(([k, l]) => (
          <div key={k}><label className={labelCls}>{l}</label><input value={f[k] || ''} onChange={e => set(k, k === 'gstin' ? e.target.value.toUpperCase() : e.target.value)} className={inputCls} /></div>
        ))}
        <div className="col-span-2"><label className={labelCls}>Address</label><input value={f.address || ''} onChange={e => set('address', e.target.value)} className={inputCls} /></div>
        <div className="col-span-2"><label className={labelCls}>Notes</label><textarea value={f.notes || ''} onChange={e => set('notes', e.target.value)} rows={3} className="w-full text-[13px] border border-gray-300 rounded p-2.5 outline-none focus:border-blue-500" /></div>
        <div><label className={labelCls}>Status</label><select value={f.status} onChange={e => set('status', e.target.value)} className={inputCls}><option>Active</option><option>Inactive</option><option>Prospect</option></select></div>
        <div className="col-span-2"><ErrorNote text={error} /></div>
      </div>
    </Modal>
  );
}

function NewDealModal({ customer, meta, onClose, onSaved }) {
  const [f, setF] = useState({ deal_name: '', deal_value: '', description: '', stage: meta.stages[0]?.name, expected_close_date: addDays(30), assignee_id: '' });
  const [error, setError] = useState('');
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const save = async () => { try { const d = await desk(`/customers/${customer.id}/deals`, { method: 'POST', body: { ...f, assignee_id: f.assignee_id || meta.me.id } }); onSaved(d.dealId); } catch (e) { setError(e.message); } };
  return (
    <Modal title={`New deal for ${customer.name.trim()}`} onClose={onClose} width="max-w-lg" footer={<><button onClick={onClose} className={btn.ghost}>Cancel</button><button onClick={save} className={btn.primary}>Create deal</button></>}>
      <div className="space-y-3">
        <p className="text-[12px] text-gray-600">For repeat business: renewals, add-on services, a new project. It goes straight into the pipeline.</p>
        <div><label className={labelCls}>Deal name <span className="text-red-600">*</span></label><input autoFocus value={f.deal_name} onChange={e => set('deal_name', e.target.value)} placeholder="e.g. Website redesign, AMC renewal 2027" className={inputCls} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Expected value (₹)</label><input value={f.deal_value} onChange={e => set('deal_value', e.target.value.replace(/[^\d.]/g, ''))} className={inputCls} /></div>
          <div><label className={labelCls}>Expected close</label><input type="date" value={f.expected_close_date} onChange={e => set('expected_close_date', e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Stage</label><select value={f.stage} onChange={e => set('stage', e.target.value)} className={inputCls}>{meta.stages.filter(s => !/^(won|lost)$/i.test(s.name)).map(s => <option key={s.id}>{s.name}</option>)}</select></div>
          <div><label className={labelCls}>Owner</label><select value={f.assignee_id} onChange={e => set('assignee_id', e.target.value)} className={inputCls}><option value="">Me</option>{meta.people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
        </div>
        <div><label className={labelCls}>What is it about</label><textarea value={f.description} onChange={e => set('description', e.target.value)} rows={3} className="w-full text-[13px] border border-gray-300 rounded p-2.5 outline-none focus:border-blue-500" /></div>
        <ErrorNote text={error} />
      </div>
    </Modal>
  );
}

export default function CustomerRecordPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const base = useSalesBase();
  const meta = useSalesMeta();
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('overview');
  const [modal, setModal] = useState(null);
  const [filter, setFilter] = useState('all');

  const load = useCallback(() => { desk(`/customers/${id}`).then(x => { setD(x); setError(''); }).catch(e => setError(e.message)); }, [id]);
  useEffect(() => { load(); }, [load]);
  if (!d || !meta) return <Loading error={error} />;
  const { customer: c, summary: s } = d;
  const removeContact = async (x) => { if (window.confirm(`Remove ${x.name}?`)) { await desk(`/contacts/${x.id}`, { method: 'DELETE' }); load(); } };
  const jump = (e) => (e.invoiceId ? `${base}/invoice/${e.invoiceId}` : e.quotationId ? `${base}/quotation/${e.quotationId}` : e.dealId ? `${base}/opportunity/${e.dealId}` : e.leadId ? `${base}/enquiry/${e.leadId}` : null);

  return (
    <div className="p-5 bg-[#F8FAFC] min-h-screen font-sans text-gray-900">
      <button onClick={() => navigate(`${base}/customers`)} className="text-xs text-gray-500 hover:text-gray-800 inline-flex items-center gap-1 mb-2 cursor-pointer"><ArrowLeft size={13} /> Customers</button>

      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <div className="flex flex-wrap items-start gap-3">
          <span className="w-11 h-11 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center shrink-0"><Building2 size={20} /></span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><h1 className="text-[18px] font-semibold">{c.name.trim()}</h1><Badge text={c.type} tone={CUSTOMER_TYPE_STYLE[c.type]} /></div>
            <div className="text-[12.5px] text-gray-600 mt-1 flex flex-wrap gap-x-4 gap-y-1">
              {c.phone && <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1 hover:text-blue-700"><Phone size={12} />{c.phone}</a>}
              {c.email && <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 hover:text-blue-700"><Mail size={12} />{c.email}</a>}
              {(c.city || c.state) && <span className="inline-flex items-center gap-1"><MapPin size={12} />{[c.city, c.state].filter(Boolean).join(', ')}</span>}
              {c.gstin && <span>GSTIN {c.gstin}</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setModal('deal')} className={btn.primary}><Plus size={13} /> New deal</button>
            <button onClick={() => setModal('advance')} className={btn.ghost}><Wallet size={13} /> Receive advance</button>
            <a href={statementPdfUrl(c.id)} target="_blank" rel="noopener noreferrer" className={btn.ghost}><Download size={13} /> Statement</a>
            <button onClick={() => setModal('edit')} className={btn.ghost}><Pencil size={13} /> Edit</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <Kpi label="Open deals" value={s.openDeals} hint={money(s.pipelineValue)} />
        <Kpi label="Won" value={money(s.wonValue)} hint={`${s.wonDeals} deal${s.wonDeals === 1 ? '' : 's'}`} />
        <Kpi label="Invoiced" value={money(s.invoiced)} hint={`${money(s.paid)} paid`} />
        <Kpi label="Owes" value={money(s.outstanding)} warn={s.overdue > 0} hint={s.advance > 0 ? `${money(s.advance)} advance held` : s.overdue > 0 ? `${money(s.overdue)} overdue` : s.lastPayment ? `Last paid ${fmtDate(s.lastPayment.date)}` : ''} />
        <Kpi label="Customer since" value={fmtDate(c.createdAt)} hint={c.createdBy ? `Added by ${c.createdBy}` : ''} />
      </div>

      <div className="mb-4"><Chips value={tab} onChange={setTab} options={TABS.map(([v, l]) => [v, l])} /></div>

      {tab === 'overview' && (
        <div className="grid xl:grid-cols-[1fr_380px] gap-4">
          <div className="space-y-4 min-w-0">
            <Card title="Next up" pad={false}>
              {d.followups.length === 0 ? <EmptyNote>Nothing scheduled with this customer.</EmptyNote> : (
                <ul className="divide-y divide-gray-100">{d.followups.slice(0, 6).map(f => (
                  <li key={f.id}><button onClick={() => navigate(f.dealId ? `${base}/opportunity/${f.dealId}` : `${base}/enquiry/${f.leadId}`)} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 cursor-pointer flex items-center gap-3">
                    <CalendarClock size={14} className="text-blue-600 shrink-0" /><span className="min-w-0 flex-1"><span className="block text-[13px] truncate">{f.type} · {f.name}{f.subject ? ` · ${f.subject}` : ''}</span><span className="block text-[11.5px] text-gray-500">{fmtDate(f.date)} {f.time} · {f.assignedName}</span></span>
                  </button></li>
                ))}</ul>
              )}
            </Card>
            <Card title="Latest activity" pad={false}>
              {d.timeline.length === 0 ? <EmptyNote>No activity yet.</EmptyNote> : <div className="p-4"><Timeline items={d.timeline.slice(0, 8)} /></div>}
            </Card>
          </div>
          <div className="space-y-4">
            <Card title="Contacts" action={<button onClick={() => setModal({ contact: null })} className="text-xs text-blue-700 hover:underline cursor-pointer inline-flex items-center gap-1"><Plus size={12} /> Add</button>} pad={false}>
              {d.contacts.length === 0 ? <EmptyNote>No contact person yet.</EmptyNote> : (
                <ul className="divide-y divide-gray-100">{d.contacts.map(x => (
                  <li key={x.id} className="px-4 py-2.5 flex items-start gap-2">
                    <div className="min-w-0 flex-1"><div className="text-[13px] font-medium truncate">{x.name}{x.position && <span className="text-gray-500 font-normal"> · {x.position}</span>}</div>
                      <div className="text-[12px] text-gray-600 flex flex-wrap gap-x-3">{x.phone && <a href={`tel:${x.phone}`} className="hover:text-blue-700">{x.phone}</a>}{x.email && <a href={`mailto:${x.email}`} className="hover:text-blue-700 truncate">{x.email}</a>}</div></div>
                    <button onClick={() => setModal({ contact: x })} className="text-gray-400 hover:text-gray-700 cursor-pointer" aria-label="Edit contact"><Pencil size={13} /></button>
                    <button onClick={() => removeContact(x)} className="text-gray-400 hover:text-red-600 cursor-pointer" aria-label="Remove contact"><Trash2 size={13} /></button>
                  </li>
                ))}</ul>
              )}
            </Card>
            <Card title="Details">
              <dl className="text-[12.5px] space-y-1.5">
                {[['Address', [c.address, c.city, c.state, c.zipcode].filter(Boolean).join(', ')], ['Industry', c.industry], ['Website', c.website], ['Source', c.source]].filter(([, v]) => v).map(([k, v]) => <div key={k} className="grid grid-cols-[80px_1fr] gap-2"><dt className="text-gray-500">{k}</dt><dd className="text-gray-900 break-words">{v}</dd></div>)}
                {c.notes && <div className="pt-1 text-gray-700 whitespace-pre-wrap border-t border-gray-100 mt-2">{c.notes}</div>}
              </dl>
            </Card>
          </div>
        </div>
      )}

      {tab === 'deals' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card title={`Deals (${d.deals.length})`} pad={false}>
            {d.deals.length === 0 ? <EmptyNote>No deals yet. Use “New deal”.</EmptyNote> : <ul className="divide-y divide-gray-100">{d.deals.map(x => (
              <li key={x.id}><button onClick={() => navigate(`${base}/opportunity/${x.id}`)} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 cursor-pointer flex items-center gap-3">
                <Briefcase size={14} className="text-gray-400 shrink-0" /><span className="min-w-0 flex-1"><span className="block text-[13px] font-medium truncate">{x.name}</span><span className="block text-[11.5px] text-gray-500">{x.owner}{x.lostReason ? ` · ${x.lostReason}` : ''}</span></span>
                <span className="text-right shrink-0"><Badge text={x.status === 'Open' ? x.stage : x.status} tone={stageTone(x.stage, x.status)} /><span className="block text-[12px] tabular-nums mt-0.5">{money(x.wonValue || x.value)}</span></span>
              </button></li>
            ))}</ul>}
          </Card>
          <Card title={`Enquiries (${d.leads.length})`} pad={false}>
            {d.leads.length === 0 ? <EmptyNote>No enquiries linked to this customer.</EmptyNote> : <ul className="divide-y divide-gray-100">{d.leads.map(x => (
              <li key={x.id}><button onClick={() => navigate(`${base}/enquiry/${x.id}`)} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 cursor-pointer flex items-center gap-3">
                <Inbox size={14} className="text-gray-400 shrink-0" /><span className="min-w-0 flex-1"><span className="block text-[13px] font-medium truncate">{x.name}{x.project ? ` · ${x.project}` : ''}</span><span className="block text-[11.5px] text-gray-500">{fmtDate(x.createdAt)}{x.source ? ` · ${x.source}` : ''}</span></span>
                <Badge text={x.status} tone={LEAD_STATUS_STYLE[x.status]} />
              </button></li>
            ))}</ul>}
          </Card>
        </div>
      )}

      {tab === 'quotes' && (
        <Card title={`Quotations (${d.quotations.length})`} pad={false}>
          {d.quotations.length === 0 ? <EmptyNote>No quotations yet. Open a deal and choose “New quotation”.</EmptyNote> : <ul className="divide-y divide-gray-100">{d.quotations.map(x => (
            <li key={x.id}><button onClick={() => navigate(`${base}/quotation/${x.id}`)} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 cursor-pointer flex items-center gap-3">
              <FileText size={14} className="text-gray-400 shrink-0" /><span className="min-w-0 flex-1"><span className="block text-[13px] font-medium truncate">{x.number}{x.subject ? ` · ${x.subject}` : ''}</span><span className="block text-[11.5px] text-gray-500">{fmtDate(x.date)}{x.validUntil ? ` · valid until ${fmtDate(x.validUntil)}` : ''}</span></span>
              <span className="text-right shrink-0"><Badge text={x.status} tone={QUOTE_STATUS_STYLE[x.status]} /><span className="block text-[12px] tabular-nums mt-0.5">{money2(x.total)}</span></span>
            </button></li>
          ))}</ul>}
        </Card>
      )}

      {tab === 'billing' && (
        <div className="space-y-4">
          <Card title={`Invoices (${d.invoices.length})`} action={<a href={statementPdfUrl(c.id)} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-700 hover:underline inline-flex items-center gap-1"><Download size={12} /> Statement of account</a>} pad={false}>
            {d.invoices.length === 0 ? <EmptyNote>No invoices yet. Accept a quotation and create the invoice from it.</EmptyNote> : <ul className="divide-y divide-gray-100">{d.invoices.map(x => (
              <li key={x.id}><div className="px-4 py-2.5 flex items-center gap-3">
                <button onClick={() => navigate(`${base}/invoice/${x.id}`)} className="min-w-0 flex-1 text-left cursor-pointer flex items-center gap-3"><Receipt size={14} className="text-gray-400 shrink-0" /><span className="min-w-0"><span className="block text-[13px] font-medium truncate">{x.number}{x.subject ? ` · ${x.subject}` : ''}</span><span className="block text-[11.5px] text-gray-500">{fmtDate(x.date)}{x.dueDate ? ` · due ${fmtDate(x.dueDate)}` : ''}{x.daysLate ? ` · ${x.daysLate} days late` : ''}</span></span></button>
                <span className="text-right shrink-0"><Badge text={x.status} tone={INVOICE_STATUS_STYLE[x.status]} /><span className="block text-[12px] tabular-nums mt-0.5">{money2(x.total)}{x.balance > 0 && x.paid > 0 ? ` · due ${money2(x.balance)}` : ''}</span></span>
                <a href={invoicePdfUrl(x.id)} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-800" aria-label="Open PDF"><Download size={14} /></a>
              </div></li>
            ))}</ul>}
          </Card>
          <Card title={`Payments (${d.payments.length})`} pad={false}>
            {d.payments.length === 0 ? <EmptyNote>No payments received yet.</EmptyNote> : <ul className="divide-y divide-gray-100">{d.payments.map(x => (
              <li key={x.id} className="px-4 py-2.5 flex items-center gap-3"><span className="min-w-0 flex-1"><span className="block text-[13px] font-medium">{money2(x.amount)} <span className="text-gray-500 font-normal">· {x.mode}{x.reference ? ` · ${x.reference}` : ''}</span></span><span className="block text-[11.5px] text-gray-500">{fmtDate(x.date)} · {x.advance ? 'Advance, not yet adjusted' : x.invoice} · {x.receipt}</span></span>
                <a href={receiptPdfUrl(x.id)} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-700 hover:underline">Receipt</a></li>
            ))}</ul>}
          </Card>
        </div>
      )}

      {tab === 'history' && (
        <Card title="Everything with this customer">
          <div className="mb-3"><Chips value={filter} onChange={setFilter} options={[['all', 'All'], ['communication', 'Calls & messages'], ['money', 'Quotes & money']]} /></div>
          {d.timeline.length === 0 ? <EmptyNote>No history yet.</EmptyNote> : (
            <ul className="space-y-0">
              {d.timeline.filter(e => filter === 'all' || (filter === 'communication' ? e.kind === 'communication' : /quotation|revision|approval|accepted|declined|invoice|payment|won/.test(e.kind))).map(e => {
                const link = jump(e);
                return (
                  <li key={e.id} className="border-l-2 border-gray-200 pl-3 pb-3 ml-1.5 relative">
                    <span className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-gray-400" />
                    <div className="text-[13px] text-gray-900">{link ? <button onClick={() => navigate(link)} className="hover:text-blue-700 text-left cursor-pointer">{e.title}</button> : e.title}</div>
                    {e.body && <div className="text-[12px] text-gray-600 whitespace-pre-wrap mt-0.5">{e.body}</div>}
                    <div className="text-[11px] text-gray-500 mt-0.5">{new Date(e.at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}{e.by ? ` · ${e.by}` : ''}</div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}

      {modal === 'advance' && <AdvanceModal customer={c} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
      {modal === 'edit' && <EditCustomerModal customer={c} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
      {modal === 'deal' && <NewDealModal customer={c} meta={meta} onClose={() => setModal(null)} onSaved={(dealId) => navigate(`${base}/opportunity/${dealId}`)} />}
      {modal && typeof modal === 'object' && 'contact' in modal && <ContactModal customerId={c.id} contact={modal.contact} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
    </div>
  );
}

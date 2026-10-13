import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Receipt, Wallet, AlertTriangle, FileText, Download } from 'lucide-react';
import { useSalesBase, money, money2, fmtDate, Badge, Modal, inputCls, labelCls, btn, ErrorNote, dayOf } from './salesShared';
import { desk, Loading, PageHead, Segmented, Kpi, Chips, INVOICE_STATUS_STYLE, downloadCsv, invoicePdfUrl } from './deskShared';

/**
 * Invoices: Draft -> Sent -> Partially Paid -> Paid, Overdue after the due date. Invoices are
 * normally created from an accepted quotation; "New invoice" is for work billed without one.
 */

function NewInvoiceModal({ onClose, onCreated }) {
  const [customers, setCustomers] = useState([]);
  const [companyId, setCompanyId] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { desk('/customers').then(d => setCustomers(d.customers)).catch(e => setError(e.message)); }, []);
  const create = async () => {
    if (!companyId) { setError('Choose the customer.'); return; }
    onCreated(companyId);
  };
  return (
    <Modal title="New invoice" onClose={onClose} width="max-w-md" footer={<><button onClick={onClose} className={btn.ghost}>Cancel</button><button onClick={create} className={btn.primary}>Continue</button></>}>
      <div className="space-y-3">
        <p className="text-[12px] text-gray-600">Billing an accepted quotation? Open it and use “Create invoice”: the lines and GST carry over. Use this for work with no quotation.</p>
        <div><label className={labelCls}>Customer</label>
          <select value={companyId} onChange={e => setCompanyId(e.target.value)} className={inputCls}><option value="">Choose…</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name.trim()}</option>)}</select></div>
        <ErrorNote text={error} />
      </div>
    </Modal>
  );
}

export default function InvoiceListPage() {
  const navigate = useNavigate();
  const base = useSalesBase();
  const [scope, setScope] = useState('all');
  const [status, setStatus] = useState(() => new URLSearchParams(window.location.search).get('status') || '');
  const [search, setSearch] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    const p = new URLSearchParams({ scope }); if (status) p.set('status', status); if (search.trim()) p.set('q', search.trim());
    desk(`/invoices?${p}`).then(d => { setData(d); setError(''); }).catch(e => setError(e.message));
  }, [scope, status, search]);
  useEffect(() => { const t = setTimeout(load, search ? 300 : 0); return () => clearTimeout(t); }, [load, search]);

  if (!data) return <Loading error={error} text="Loading invoices…" />;
  const c = data.counts; const t = data.totals;
  const exportCsv = () => downloadCsv('invoices.csv', [['Invoice', 'Date', 'Due', 'Customer', 'Status', 'Total', 'Paid', 'Balance', 'Quotation'],
  ...data.invoices.map(i => [i.number, i.date && dayOf(i.date), i.dueDate && dayOf(i.dueDate), i.company, i.status, i.total, i.paid, i.balance, i.quotationNumber])]);

  return (
    <div className="p-5 bg-[#F8FAFC] min-h-screen font-sans text-gray-900">
      <PageHead title="Invoices" sub="Tax invoices with GST, email to the client, and payments recorded against each one.">
        <Segmented value={scope} onChange={setScope} options={[['all', 'Everyone'], ['mine', 'Mine']]} />
        <button onClick={exportCsv} className={btn.ghost}><Download size={13} /> Export</button>
        <button onClick={() => setAdding(true)} className={btn.primary}><Plus size={13} /> New invoice</button>
      </PageHead>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Kpi icon={Receipt} label="Invoiced" value={money(t.invoiced)} hint={`${c.Sent + c['Partially Paid'] + c.Overdue + c.Paid} issued`} />
        <Kpi icon={Wallet} tone="text-emerald-600" label="Collected" value={money(t.collected)} hint={t.collectedMonth != null ? `${money(t.collectedMonth)} this month` : ''} />
        <Kpi icon={FileText} tone="text-blue-600" label="Still to collect" value={money(t.outstanding)} hint={`${c.Outstanding} invoice${c.Outstanding === 1 ? '' : 's'}`} onClick={() => setStatus('Outstanding')} />
        <Kpi icon={AlertTriangle} tone="text-red-600" label="Overdue" value={money(t.overdue)} hint={`${c.Overdue} invoice${c.Overdue === 1 ? '' : 's'}`} warn={t.overdue > 0} onClick={() => setStatus('Overdue')} />
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-3">
        <Chips value={status} onChange={setStatus} options={[['', 'All'], ['Draft', 'Draft', c.Draft], ['Sent', 'Sent', c.Sent], ['Partially Paid', 'Partly paid', c['Partially Paid']], ['Overdue', 'Overdue', c.Overdue], ['Paid', 'Paid', c.Paid]]} />
        <div className="relative ml-auto"><Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Number, customer, subject" className="h-9 w-64 text-[13px] border border-gray-300 rounded pl-8 pr-2 outline-none focus:border-blue-500 bg-white" /></div>
      </div>

      <div className="bg-white border border-gray-200 rounded overflow-x-auto">
        <table className="w-full text-[13px] min-w-[860px]">
          <thead className="text-xs text-gray-500 bg-gray-50"><tr>
            <th className="text-left font-medium px-4 py-2.5">Invoice</th><th className="text-left font-medium px-2 py-2.5">Customer</th><th className="text-left font-medium px-2 py-2.5">Status</th>
            <th className="text-left font-medium px-2 py-2.5">Date</th><th className="text-left font-medium px-2 py-2.5">Due</th><th className="text-right font-medium px-2 py-2.5">Total</th><th className="text-right font-medium px-2 py-2.5">Balance</th><th className="w-10" />
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {data.invoices.map(i => (
              <tr key={i.id} onClick={() => navigate(`${base}/invoice/${i.id}`)} className="hover:bg-gray-50 cursor-pointer">
                <td className="px-4 py-2.5"><div className="font-medium">{i.number}</div>{i.quotationNumber && <div className="text-[11px] text-gray-500">from {i.quotationNumber}</div>}</td>
                <td className="px-2 py-2.5"><div className="truncate max-w-[220px]">{i.company}</div>{i.subject && <div className="text-[11px] text-gray-500 truncate max-w-[220px]">{i.subject}</div>}</td>
                <td className="px-2 py-2.5"><Badge text={i.status} tone={INVOICE_STATUS_STYLE[i.status]} />{i.daysLate > 0 && <div className="text-[11px] text-red-700 mt-0.5">{i.daysLate} days late</div>}</td>
                <td className="px-2 py-2.5 text-[12px] text-gray-600">{fmtDate(i.date)}</td>
                <td className="px-2 py-2.5 text-[12px] text-gray-600">{i.status === 'Paid' ? '—' : fmtDate(i.dueDate)}</td>
                <td className="px-2 py-2.5 text-right tabular-nums">{money2(i.total)}</td>
                <td className={`px-2 py-2.5 text-right tabular-nums ${i.status === 'Overdue' ? 'text-red-700 font-medium' : ''}`}>{i.status === 'Draft' ? <span className="text-gray-300">—</span> : i.balance > 0 ? money2(i.balance) : <span className="text-gray-300">—</span>}</td>
                <td className="px-2" onClick={e => e.stopPropagation()}><a href={invoicePdfUrl(i.id)} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-800" aria-label="Open PDF"><Download size={14} /></a></td>
              </tr>
            ))}
            {data.invoices.length === 0 && <tr><td colSpan={8} className="text-center text-[12.5px] text-gray-500 py-10">{status || search ? 'No invoices match.' : 'No invoices yet. Accept a quotation and choose “Create invoice”.'}</td></tr>}
          </tbody>
        </table>
      </div>
      {adding && <NewInvoiceModal onClose={() => setAdding(false)} onCreated={(companyId) => navigate(`${base}/invoice/new?customer=${companyId}`)} />}
    </div>
  );
}

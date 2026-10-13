import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Wallet, Download, Trash2, Plus } from 'lucide-react';
import { useSalesBase, money, money2, fmtDate, ymd, Modal, inputCls, labelCls, btn, ErrorNote, dayOf } from './salesShared';
import { desk, Loading, PageHead, Segmented, Kpi, Card, HBars, downloadCsv, receiptPdfUrl, Chips } from './deskShared';

/**
 * Payments received, newest first, with the receipt for each. Payments are recorded on the
 * invoice (so the balance and status stay right); "Record payment" here picks the invoice first.
 */

const firstOfMonth = () => { const d = new Date(); return ymd(new Date(d.getFullYear(), d.getMonth(), 1)); };
const RANGES = [['month', 'This month'], ['last', 'Last month'], ['quarter', 'Last 90 days'], ['year', 'This year']];
const rangeFor = (k) => {
  const d = new Date();
  if (k === 'last') return { from: ymd(new Date(d.getFullYear(), d.getMonth() - 1, 1)), to: ymd(new Date(d.getFullYear(), d.getMonth(), 0)) };
  if (k === 'quarter') return { from: ymd(new Date(Date.now() - 90 * 86400000)), to: ymd() };
  if (k === 'year') return { from: `${d.getFullYear()}-01-01`, to: ymd() };
  return { from: firstOfMonth(), to: ymd() };
};

function PickInvoiceModal({ onClose, onPicked }) {
  const [list, setList] = useState(null);
  const [id, setId] = useState('');
  useEffect(() => { desk('/invoices?status=Outstanding').then(d => setList(d.invoices)); }, []);
  return (
    <Modal title="Record payment" onClose={onClose} width="max-w-md" footer={<><button onClick={onClose} className={btn.ghost}>Cancel</button><button disabled={!id} onClick={() => onPicked(id)} className={btn.primary}>Continue</button></>}>
      {!list ? <div className="text-sm text-gray-500">Loading…</div> : list.length === 0 ? <div className="text-[13px] text-gray-600">No invoice is waiting for payment. Issue an invoice first (send it or mark it as sent).</div> : (
        <div><label className={labelCls}>Which invoice was paid?</label>
          <select value={id} onChange={e => setId(e.target.value)} className={inputCls}><option value="">Choose…</option>{list.map(i => <option key={i.id} value={i.id}>{i.number} · {i.company} · due {money2(i.balance)}</option>)}</select></div>
      )}
    </Modal>
  );
}

export default function PaymentsPage() {
  const navigate = useNavigate();
  const base = useSalesBase();
  const [scope, setScope] = useState('all');
  const [range, setRange] = useState('month');
  const [mode, setMode] = useState('');
  const [search, setSearch] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [picking, setPicking] = useState(false);

  const load = useCallback(() => {
    const r = rangeFor(range);
    const p = new URLSearchParams({ scope, from: r.from, to: r.to }); if (mode) p.set('mode', mode); if (search.trim()) p.set('q', search.trim());
    desk(`/payments?${p}`).then(d => { setData(d); setError(''); }).catch(e => setError(e.message));
  }, [scope, range, mode, search]);
  useEffect(() => { const t = setTimeout(load, search ? 300 : 0); return () => clearTimeout(t); }, [load, search]);

  if (!data) return <Loading error={error} text="Loading payments…" />;
  const remove = async (p) => {
    const reason = window.prompt(`Why is payment ${p.receipt} of ${money2(p.amount)} being removed?`);
    if (!reason) return;
    try { await desk(`/payments/${p.id}`, { method: 'DELETE', body: { reason } }); load(); } catch (e) { setError(e.message); }
  };
  const exportCsv = () => downloadCsv('payments.csv', [['Receipt', 'Date', 'Customer', 'Invoice', 'Amount', 'Mode', 'Reference', 'Received by'], ...data.payments.map(p => [p.receipt, dayOf(p.date), p.company, p.invoice, p.amount, p.mode, p.reference, p.by])]);

  return (
    <div className="p-5 bg-[#F8FAFC] min-h-screen font-sans text-gray-900">
      <PageHead title="Payments" sub="Money received against invoices. Every payment has a numbered receipt.">
        <Segmented value={scope} onChange={setScope} options={[['all', 'Everyone'], ['mine', 'Mine']]} />
        <button onClick={exportCsv} className={btn.ghost}><Download size={13} /> Export</button>
        <button onClick={() => setPicking(true)} className={btn.green}><Plus size={13} /> Record payment</button>
      </PageHead>

      <div className="flex flex-wrap items-center gap-3 mb-3">
        <Chips value={range} onChange={setRange} options={RANGES} />
        <div className="relative ml-auto"><Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Receipt, invoice, customer, reference" className="h-9 w-72 text-[13px] border border-gray-300 rounded pl-8 pr-2 outline-none focus:border-blue-500 bg-white" /></div>
      </div>

      <div className="grid xl:grid-cols-[1fr_300px] gap-4">
        <div className="bg-white border border-gray-200 rounded overflow-x-auto min-w-0">
          <table className="w-full text-[13px] min-w-[760px]">
            <thead className="text-xs text-gray-500 bg-gray-50"><tr>
              <th className="text-left font-medium px-4 py-2.5">Receipt</th><th className="text-left font-medium px-2 py-2.5">Date</th><th className="text-left font-medium px-2 py-2.5">Customer</th>
              <th className="text-left font-medium px-2 py-2.5">Invoice</th><th className="text-left font-medium px-2 py-2.5">Mode</th><th className="text-right font-medium px-2 py-2.5">Amount</th><th className="w-16" />
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {data.payments.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium">{p.receipt}<div className="text-[11px] text-gray-500 font-normal">{p.by}</div></td>
                  <td className="px-2 py-2.5 text-[12px] text-gray-600">{fmtDate(p.date)}</td>
                  <td className="px-2 py-2.5"><button onClick={() => p.companyId && navigate(`${base}/customer/${p.companyId}`)} className="text-left hover:text-blue-700 cursor-pointer truncate max-w-[200px]">{p.company || '—'}</button></td>
                  <td className="px-2 py-2.5">{p.invoiceId ? <><button onClick={() => navigate(`${base}/invoice/${p.invoiceId}`)} className="text-blue-700 hover:underline cursor-pointer">{p.invoice}</button>{p.invoiceBalance > 0 && <div className="text-[11px] text-gray-500">{money2(p.invoiceBalance)} still due</div>}</> : <span className="text-[12px] text-blue-800 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">Advance</span>}</td>
                  <td className="px-2 py-2.5 text-[12px] text-gray-600">{p.mode}{p.reference && <div className="text-[11px] text-gray-500 truncate max-w-[150px]">{p.reference}</div>}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums font-semibold">{money2(p.amount)}</td>
                  <td className="px-2 py-2.5"><div className="flex items-center gap-2 justify-end"><a href={receiptPdfUrl(p.id)} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-800" aria-label="Receipt PDF"><Download size={14} /></a>{data.canDelete && <button onClick={() => remove(p)} className="text-gray-300 hover:text-red-600 cursor-pointer" aria-label="Remove payment"><Trash2 size={14} /></button>}</div></td>
                </tr>
              ))}
              {data.payments.length === 0 && <tr><td colSpan={7} className="text-center text-[12.5px] text-gray-500 py-10">No payments in this period.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="space-y-4">
          <Kpi icon={Wallet} tone="text-emerald-600" label="Received" value={money(data.totals.amount)} hint={`${data.totals.count} payment${data.totals.count === 1 ? '' : 's'}`} />
          <Card title="By mode"><HBars rows={data.totals.byMode} labelKey="mode" valueKey="amount" format={money} sub={(r) => `${r.count}`} empty="No payments yet." />
            {data.totals.byMode.length > 1 && <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-1.5">{[['', 'All'], ...data.totals.byMode.map(m => [m.mode, m.mode])].map(([v, l]) => <button key={v} onClick={() => setMode(v)} className={`h-6 px-2 text-[11px] rounded border cursor-pointer ${mode === v ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-300 text-gray-600'}`}>{l}</button>)}</div>}
          </Card>
          <ErrorNote text={error} />
        </div>
      </div>
      {picking && <PickInvoiceModal onClose={() => setPicking(false)} onPicked={(id) => navigate(`${base}/invoice/${id}?pay=1`)} />}
    </div>
  );
}

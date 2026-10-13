import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Loader2, Building2, Wallet, Briefcase, Trophy, Phone, Mail, Download } from 'lucide-react';
import { useSalesBase, money, ago, Badge, Modal, inputCls, labelCls, btn, ErrorNote } from './salesShared';
import { desk, Loading, PageHead, Segmented, Kpi, Chips, CUSTOMER_TYPE_STYLE, downloadCsv } from './deskShared';

/**
 * Customers: every company with what matters about the relationship (open deals, won value,
 * money owed) in one row. Opens the customer record.
 */

export function NewCustomerModal({ onClose, onSaved }) {
  const [f, setF] = useState({ name: '', phone: '', email: '', city: '', state: '', gstin: '', address: '', industry: '', contact: { name: '', phone: '', email: '', position: '' } });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const setC = (k, v) => setF(x => ({ ...x, contact: { ...x.contact, [k]: v } }));
  const save = async () => {
    setSaving(true); setError('');
    try { const d = await desk('/customers', { method: 'POST', body: f }); onSaved(d.id); } catch (e) { setError(e.message); setSaving(false); }
  };
  return (
    <Modal title="New customer" onClose={onClose} width="max-w-2xl"
      footer={<><button onClick={onClose} className={btn.ghost}>Cancel</button><button onClick={save} disabled={saving} className={btn.primary}>{saving && <Loader2 size={13} className="animate-spin" />} Save customer</button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><label className={labelCls}>Company / customer name <span className="text-red-600">*</span></label><input autoFocus value={f.name} onChange={e => set('name', e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Phone</label><input value={f.phone} onChange={e => set('phone', e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Email</label><input type="email" value={f.email} onChange={e => set('email', e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>City</label><input value={f.city} onChange={e => set('city', e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>State (decides CGST+SGST or IGST)</label><input value={f.state} onChange={e => set('state', e.target.value)} placeholder="Maharashtra" className={inputCls} /></div>
          <div><label className={labelCls}>GSTIN</label><input value={f.gstin} onChange={e => set('gstin', e.target.value.toUpperCase())} className={inputCls} /></div>
          <div><label className={labelCls}>Industry</label><input value={f.industry} onChange={e => set('industry', e.target.value)} className={inputCls} /></div>
          <div className="col-span-2"><label className={labelCls}>Address</label><input value={f.address} onChange={e => set('address', e.target.value)} className={inputCls} /></div>
        </div>
        <div className="border border-gray-200 rounded-lg p-3 bg-gray-50/60">
          <div className="text-[13px] font-medium text-gray-800 mb-2">Main contact person (optional)</div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Name</label><input value={f.contact.name} onChange={e => setC('name', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Role</label><input value={f.contact.position} onChange={e => setC('position', e.target.value)} placeholder="Owner, Manager…" className={inputCls} /></div>
            <div><label className={labelCls}>Phone</label><input value={f.contact.phone} onChange={e => setC('phone', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Email</label><input value={f.contact.email} onChange={e => setC('email', e.target.value)} className={inputCls} /></div>
          </div>
        </div>
        <ErrorNote text={error} />
      </div>
    </Modal>
  );
}

export default function CustomersPage() {
  const navigate = useNavigate();
  const base = useSalesBase();
  const [scope, setScope] = useState('all');
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    const p = new URLSearchParams({ scope }); if (type) p.set('type', type); if (search.trim()) p.set('q', search.trim());
    desk(`/customers?${p}`).then(d => { setData(d); setError(''); }).catch(e => setError(e.message));
  }, [scope, type, search]);
  useEffect(() => { const t = setTimeout(load, search ? 300 : 0); return () => clearTimeout(t); }, [load, search]);

  if (!data) return <Loading error={error} text="Loading customers…" />;
  const c = data.counts;
  const exportCsv = () => downloadCsv('customers.csv', [['Customer', 'Type', 'Contact', 'Phone', 'Email', 'City', 'GSTIN', 'Owner', 'Open deals', 'Won deals', 'Won value', 'Invoiced', 'Paid', 'Outstanding'],
    ...data.customers.map(x => [x.name, x.type, x.contact?.name, x.contact?.phone || x.phone, x.contact?.email || x.email, x.city, x.gstin, x.owner, x.openDeals, x.wonDeals, x.wonValue, x.invoiced, x.paid, x.outstanding])]);

  return (
    <div className="p-5 bg-[#F8FAFC] min-h-screen font-sans text-gray-900">
      <PageHead title="Customers" sub="Everyone you sell to: deals, quotations, invoices and what is owed, in one place.">
        <Segmented value={scope} onChange={setScope} options={[['all', 'Everyone'], ['mine', 'Mine']]} />
        <button onClick={exportCsv} className={btn.ghost}><Download size={13} /> Export</button>
        <button onClick={() => setAdding(true)} className={btn.primary}><Plus size={13} /> New customer</button>
      </PageHead>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Kpi icon={Building2} label="Customers & prospects" value={c.all} hint={`${c.Customer} paying · ${c.Prospect} prospects`} />
        <Kpi icon={Briefcase} tone="text-indigo-600" label="Open pipeline" value={money(data.totals.pipelineValue)} />
        <Kpi icon={Trophy} tone="text-emerald-600" label="Won to date" value={money(data.totals.wonValue)} />
        <Kpi icon={Wallet} tone="text-red-600" label="To collect" value={money(data.totals.outstanding)} hint={`${c.dues} customer${c.dues === 1 ? ' owes' : 's owe'} money`} warn={data.totals.outstanding > 0} onClick={() => setType('dues')} />
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-3">
        <Chips value={type} onChange={setType} options={[['', 'All', c.all], ['Customer', 'Customers', c.Customer], ['Prospect', 'Prospects', c.Prospect], ['dues', 'Owes money', c.dues], ['Inactive', 'Inactive', c.Inactive]]} />
        <div className="relative ml-auto"><Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, phone, GSTIN, city" className="h-9 w-64 text-[13px] border border-gray-300 rounded pl-8 pr-2 outline-none focus:border-blue-500 bg-white" /></div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
        <table className="w-full text-[13px] min-w-[960px]">
          <thead className="text-xs text-gray-500 bg-gray-50"><tr>
            <th className="text-left font-medium px-4 py-2.5">Customer</th><th className="text-left font-medium px-2 py-2.5">Contact</th><th className="text-left font-medium px-2 py-2.5">Owner</th>
            <th className="text-right font-medium px-2 py-2.5">Open deals</th><th className="text-right font-medium px-2 py-2.5">Won</th><th className="text-right font-medium px-2 py-2.5">Invoiced</th>
            <th className="text-right font-medium px-2 py-2.5">Owes</th><th className="text-left font-medium px-4 py-2.5">Last activity</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {data.customers.map(x => (
              <tr key={x.id} onClick={() => navigate(`${base}/customer/${x.id}`)} className="hover:bg-gray-50 cursor-pointer">
                <td className="px-4 py-2.5"><div className="font-medium text-gray-900 truncate max-w-[260px]">{x.name.trim()}</div><div className="flex items-center gap-1.5 mt-0.5"><Badge text={x.type} tone={CUSTOMER_TYPE_STYLE[x.type]} />{x.city && <span className="text-[11px] text-gray-500">{x.city}</span>}</div></td>
                <td className="px-2 py-2.5 text-[12px] text-gray-700">{x.contact ? <><div className="truncate max-w-[180px]">{x.contact.name}</div><div className="text-gray-500 flex items-center gap-2">{(x.contact.phone || x.phone) && <span className="inline-flex items-center gap-0.5"><Phone size={10} />{x.contact.phone || x.phone}</span>}{x.contact.email && <Mail size={10} />}</div></> : <span className="text-gray-400">{x.phone || '—'}</span>}</td>
                <td className="px-2 py-2.5 text-[12px] text-gray-600">{x.owner || '—'}</td>
                <td className="px-2 py-2.5 text-right tabular-nums">{x.openDeals ? <>{x.openDeals}<div className="text-[11px] text-gray-500">{money(x.pipelineValue)}</div></> : <span className="text-gray-300">—</span>}</td>
                <td className="px-2 py-2.5 text-right tabular-nums">{x.wonDeals ? <>{money(x.wonValue)}<div className="text-[11px] text-gray-500">{x.wonDeals} deal{x.wonDeals === 1 ? '' : 's'}</div></> : <span className="text-gray-300">—</span>}</td>
                <td className="px-2 py-2.5 text-right tabular-nums">{x.invoiced ? money(x.invoiced) : <span className="text-gray-300">—</span>}</td>
                <td className={`px-2 py-2.5 text-right tabular-nums ${x.overdue ? 'text-red-700 font-medium' : ''}`}>{x.outstanding > 0 ? <>{money(x.outstanding)}{x.overdue > 0 && <div className="text-[11px]">{money(x.overdue)} overdue</div>}</> : <span className="text-gray-300">—</span>}</td>
                <td className="px-4 py-2.5 text-[12px] text-gray-500">{x.lastActivity ? ago(x.lastActivity) : '—'}</td>
              </tr>
            ))}
            {data.customers.length === 0 && <tr><td colSpan={8} className="text-center text-[12.5px] text-gray-500 py-10">No customers match. {c.all === 0 && 'Add your first customer, or convert an enquiry into a deal and it appears here.'}</td></tr>}
          </tbody>
        </table>
      </div>
      {adding && <NewCustomerModal onClose={() => setAdding(false)} onSaved={(id) => navigate(`${base}/customer/${id}`)} />}
    </div>
  );
}

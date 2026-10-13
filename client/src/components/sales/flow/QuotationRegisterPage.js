import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, Download, FileText, AlertTriangle, Plus, Presentation } from 'lucide-react';
import { api, pdfUrl, useSalesBase, money, fmtDate, Badge, QUOTE_STATUS_STYLE, btn } from './salesShared';
import { proposalPdfUrl } from './deskShared';
import NewQuotationModal from './NewQuotationModal';

/**
 * Every quotation (latest version of each), by status, with the approvals queue first. Standard
 * quotations and presentation quotations (decks) are the same thing in two formats, so they share
 * this list, one number series and the same statuses.
 */
const STATUSES = ['Pending Approval', 'Draft', 'Approved', 'Sent', 'Accepted', 'Declined'];

export default function QuotationRegisterPage() {
  const navigate = useNavigate();
  const base = useSalesBase();
  const [status, setStatus] = useState('');
  const [scope, setScope] = useState('all');
  const [search, setSearch] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const params = new URLSearchParams(window.location.search);
  const [adding, setAdding] = useState(params.get('new') === '1');

  const load = useCallback(() => {
    const p = new URLSearchParams({ scope }); if (status) p.set('status', status); if (search.trim()) p.set('q', search.trim());
    api(`/quotations?${p}`).then(setData).catch(e => setError(e.message));
  }, [scope, status, search]);
  useEffect(() => { const t = setTimeout(load, search ? 300 : 0); return () => clearTimeout(t); }, [load, search]);

  const counts = data?.counts || {};
  const rows = data ? [
    ...data.quotations.map(q => ({ key: `q${q.id}`, deck: false, id: q.id, number: q.base, sub: `v${q.version}${q.versionCount > 1 ? ` of ${q.versionCount}` : ''} · ${q.subject || '—'}`, client: q.client.name || q.company || '—', deal: q.dealName, status: q.expired ? 'Expired' : q.status, total: q.total, validUntil: q.validUntil, updatedAt: q.updatedAt })),
    ...(data.decks || []).map(d => ({ key: `d${d.id}`, deck: true, id: d.id, number: d.number, sub: `${d.kind === 'marketing' ? 'Digital marketing' : 'Software / IT'} · ${d.title || '—'}`, client: d.client || '—', deal: d.dealName, status: d.status, total: d.total, validUntil: null, updatedAt: d.updatedAt }))
  ].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)) : [];
  return (
    <div className="p-5 bg-[#F8FAFC] min-h-screen font-sans text-gray-900">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h1 className="text-[20px] font-semibold">Quotations</h1>
          <p className="text-[12px] text-gray-500 mt-0.5">Standard and presentation quotations in one list. Revisions are kept as versions; only the latest is shown.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setAdding(true)} className={btn.primary}><Plus size={13} /> New quotation</button>
          <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-lg p-0.5">
            {[['all', 'Team'], ['mine', 'Mine']].map(([k, l]) => <button key={k} onClick={() => setScope(k)} className={`px-2.5 h-7 text-xs font-medium rounded-md cursor-pointer ${scope === k ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{l}</button>)}
          </div>
          <div className="relative"><Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Number, client, subject" className="h-8 w-56 pl-8 pr-2 text-xs border border-gray-300 rounded-lg outline-none focus:border-blue-500 bg-white" /></div>
        </div>
      </div>

      {counts['Pending Approval'] > 0 && status !== 'Pending Approval' && (
        <button onClick={() => setStatus('Pending Approval')} className="mb-3 w-full text-left text-[13px] bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-2 cursor-pointer">
          <AlertTriangle size={14} className="text-amber-700" /> {counts['Pending Approval']} quotation{counts['Pending Approval'] === 1 ? '' : 's'} waiting for discount approval.
        </button>
      )}

      <div className="flex flex-wrap gap-1.5 mb-3">
        <button onClick={() => setStatus('')} className={`h-7 px-3 text-xs rounded-full border cursor-pointer ${!status ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-300 text-gray-700'}`}>All</button>
        {STATUSES.map(s => <button key={s} onClick={() => setStatus(status === s ? '' : s)} className={`h-7 px-3 text-xs rounded-full border cursor-pointer ${status === s ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-300 text-gray-700'}`}>{s} <span className="opacity-60 tabular-nums">{counts[s] || 0}</span></button>)}
      </div>

      {error && <div className="text-sm text-red-700 mb-3">{error}</div>}
      {!data ? <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-gray-400" size={18} /></div> : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
          <table className="w-full text-[13px] min-w-[900px]">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-600"><tr>
              <th className="text-left font-medium px-3 py-2.5">Quotation</th><th className="text-left font-medium px-3 py-2.5">Client / deal</th><th className="text-left font-medium px-3 py-2.5">Status</th>
              <th className="text-right font-medium px-3 py-2.5">Total</th><th className="text-left font-medium px-3 py-2.5">Valid until</th><th className="text-left font-medium px-3 py-2.5">Updated</th><th className="w-10"></th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 && <tr><td colSpan={7} className="py-12 text-center text-sm text-gray-500"><FileText className="mx-auto mb-2 text-gray-300" size={28} />No quotations here. Choose “New quotation” to make one for a deal.</td></tr>}
              {rows.map(q => (
                <tr key={q.key} onClick={() => navigate(`${base}/${q.deck ? 'proposal' : 'quotation'}/${q.id}`)} className="hover:bg-blue-50/40 cursor-pointer">
                  <td className="px-3 py-2.5"><div className="flex items-center gap-1.5 font-mono text-[12px] text-gray-800">{q.number}{q.deck && <span title="Presentation format" className="inline-flex items-center gap-0.5 font-sans text-[10px] text-violet-700 bg-violet-50 ring-1 ring-violet-200 rounded px-1"><Presentation size={9} /> Deck</span>}</div><div className="text-[11px] text-gray-500 truncate max-w-[280px]">{q.sub}</div></td>
                  <td className="px-3 py-2.5"><div className="text-gray-900">{q.client}</div><div className="text-[11px] text-gray-500">{q.deal}</div></td>
                  <td className="px-3 py-2.5"><Badge text={q.status} tone={QUOTE_STATUS_STYLE[q.status]} /></td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-medium">{q.total > 0 ? money(q.total) : '—'}</td>
                  <td className={`px-3 py-2.5 text-[12px] ${q.status === 'Expired' ? 'text-orange-700' : 'text-gray-600'}`}>{q.validUntil ? fmtDate(q.validUntil) : '—'}</td>
                  <td className="px-3 py-2.5 text-[12px] text-gray-600">{fmtDate(q.updatedAt)}</td>
                  <td className="px-2"><a href={q.deck ? proposalPdfUrl(q.id) : pdfUrl(q.id, true)} target={q.deck ? '_blank' : undefined} rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="p-1 text-gray-500 hover:text-gray-900 inline-block" title="Download PDF"><Download size={14} /></a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {adding && <NewQuotationModal preset={{ deal: params.get('deal'), format: params.get('format') }} onClose={() => setAdding(false)} />}
    </div>
  );
}

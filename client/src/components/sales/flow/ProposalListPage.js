import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Loader2, FileText, Code2, Megaphone, Download } from 'lucide-react';
import { api, useSalesBase, money, fmtDate, Badge, Modal, inputCls, labelCls, btn, ErrorNote } from './salesShared';
import { proposalApi, proposalPdfUrl, Loading, PageHead, Segmented, Chips, PROPOSAL_STATUS_STYLE } from './deskShared';

/**
 * Proposals: slide-style decks for a client (cover, about, summary, modules or services, priced
 * options, budget and timeline, support, AMC, notes). A deck is edited per client, sent, and once
 * the client picks an option it becomes a GST quotation.
 */

const KINDS = [
  ['it', 'Software / IT project', 'ERP, CRM, IoT, apps, websites: modules per option, fixed price, payment milestones, support and AMC.', Code2],
  ['marketing', 'Digital marketing plan', 'SEO, GMB, AEO, GEO, social media, Meta and Google Ads: plans priced from keywords, reels and creatives per month.', Megaphone]
];

function NewProposalModal({ onClose, onCreated, preset }) {
  const [deals, setDeals] = useState(null);
  const [kind, setKind] = useState('it');
  const [dealId, setDealId] = useState(preset?.deal || '');
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { api('/board?scope=all').then(d => setDeals(d.deals.filter(x => !['Won', 'Lost'].includes(x.status)))).catch(e => setError(e.message)); }, []);
  const save = async () => {
    if (!dealId) { setError('Choose the deal this proposal is for.'); return; }
    setSaving(true); setError('');
    try { const r = await proposalApi('', { method: 'POST', body: { dealId, kind, title } }); onCreated(r.id); } catch (e) { setError(e.message); setSaving(false); }
  };
  return (
    <Modal title="New proposal" onClose={onClose} width="max-w-xl" footer={<><button onClick={onClose} className={btn.ghost}>Cancel</button><button onClick={save} disabled={saving} className={btn.primary}>{saving && <Loader2 size={13} className="animate-spin" />} Create and edit</button></>}>
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-2">
          {KINDS.map(([v, l, d, Icon]) => (
            <button key={v} type="button" onClick={() => setKind(v)} className={`text-left border rounded-lg p-3 cursor-pointer ${kind === v ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-200' : 'border-gray-200 hover:bg-gray-50'}`}>
              <div className="flex items-center gap-1.5 text-[13px] font-semibold"><Icon size={14} /> {l}</div><div className="text-[11.5px] text-gray-600 mt-1 leading-snug">{d}</div>
            </button>
          ))}
        </div>
        <div><label className={labelCls}>Deal</label>
          <select value={dealId} onChange={e => setDealId(e.target.value)} className={inputCls}><option value="">{deals ? 'Choose…' : 'Loading…'}</option>{(deals || []).map(d => <option key={d.id} value={d.id}>{d.name}{d.company ? ` · ${d.company}` : ''}</option>)}</select>
          <p className="text-[11px] text-gray-500 mt-1">Create the deal first from an enquiry (Convert to deal) or from the customer's page.</p></div>
        <div><label className={labelCls}>Title (optional)</label><input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. ERP proposal for Upase Process Equipments" className={inputCls} /></div>
        <ErrorNote text={error} />
      </div>
    </Modal>
  );
}

export default function ProposalListPage() {
  const navigate = useNavigate();
  const base = useSalesBase();
  const params = new URLSearchParams(window.location.search);
  const [scope, setScope] = useState('all');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(params.get('new') === '1');

  const load = useCallback(() => {
    const p = new URLSearchParams({ scope }); if (status) p.set('status', status); if (search.trim()) p.set('q', search.trim());
    proposalApi(`?${p}`).then(d => { setData(d); setError(''); }).catch(e => setError(e.message));
  }, [scope, status, search]);
  useEffect(() => { const t = setTimeout(load, search ? 300 : 0); return () => clearTimeout(t); }, [load, search]);
  if (!data) return <Loading error={error} text="Loading proposals…" />;
  const c = data.counts;

  return (
    <div className="p-5 bg-[#F8FAFC] min-h-screen font-sans text-gray-900">
      <PageHead title="Proposals" sub="Presentation-style proposals for clients: modules or services, options with prices, budget and timeline, support and AMC.">
        <Segmented value={scope} onChange={setScope} options={[['all', 'Everyone'], ['mine', 'Mine']]} />
        <button onClick={() => setAdding(true)} className={btn.primary}><Plus size={13} /> New proposal</button>
      </PageHead>
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <Chips value={status} onChange={setStatus} options={[['', 'All'], ['Draft', 'Draft', c.Draft], ['Sent', 'Sent', c.Sent], ['Accepted', 'Accepted', c.Accepted], ['Declined', 'Declined', c.Declined]]} />
        <div className="relative ml-auto"><Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Number, client, title" className="h-9 w-64 text-[13px] border border-gray-300 rounded pl-8 pr-2 outline-none focus:border-blue-500 bg-white" /></div>
      </div>
      <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
        <table className="w-full text-[13px] min-w-[860px]">
          <thead className="text-xs text-gray-500 bg-gray-50"><tr>
            <th className="text-left font-medium px-4 py-2.5">Proposal</th><th className="text-left font-medium px-2 py-2.5">Client</th><th className="text-left font-medium px-2 py-2.5">Status</th>
            <th className="text-left font-medium px-2 py-2.5">Options</th><th className="text-left font-medium px-2 py-2.5">Updated</th><th className="w-10" />
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {data.proposals.map(p => (
              <tr key={p.id} onClick={() => navigate(`${base}/proposal/${p.id}`)} className="hover:bg-gray-50 cursor-pointer">
                <td className="px-4 py-2.5"><div className="font-medium">{p.number}</div><div className="text-[11.5px] text-gray-500 truncate max-w-[300px]">{p.title}</div></td>
                <td className="px-2 py-2.5"><div className="truncate max-w-[200px]">{p.client}</div><div className="text-[11px] text-gray-500 inline-flex items-center gap-1">{p.kind === 'marketing' ? <><Megaphone size={10} /> Digital marketing</> : <><Code2 size={10} /> Software / IT</>}</div></td>
                <td className="px-2 py-2.5"><Badge text={p.status} tone={PROPOSAL_STATUS_STYLE[p.status]} />{p.chosenOption && <div className="text-[11px] text-gray-500 mt-0.5">Option {p.chosenOption}</div>}</td>
                <td className="px-2 py-2.5 text-[12px] text-gray-700">{p.options.length} option{p.options.length === 1 ? '' : 's'}{p.maxTotal > 0 && <div className="text-gray-500 tabular-nums">{p.minTotal === p.maxTotal ? money(p.minTotal) : `${money(p.minTotal)} – ${money(p.maxTotal)}`} <span className="text-[10.5px]">incl. GST</span></div>}</td>
                <td className="px-2 py-2.5 text-[12px] text-gray-500">{fmtDate(p.updatedAt)}<div className="text-[11px]">{p.createdBy}</div></td>
                <td className="px-2" onClick={e => e.stopPropagation()}><a href={proposalPdfUrl(p.id)} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-800" aria-label="Open PDF"><Download size={14} /></a></td>
              </tr>
            ))}
            {data.proposals.length === 0 && <tr><td colSpan={6} className="text-center text-[12.5px] text-gray-500 py-10"><FileText size={18} className="mx-auto mb-1 text-gray-300" />No proposals yet. Create one from a deal.</td></tr>}
          </tbody>
        </table>
      </div>
      {adding && <NewProposalModal preset={{ deal: params.get('deal') }} onClose={() => setAdding(false)} onCreated={(id) => navigate(`${base}/proposal/${id}`)} />}
    </div>
  );
}

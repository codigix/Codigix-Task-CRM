import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Shuffle, UserPlus } from 'lucide-react';
import { useSalesBase, ago, Badge, LEAD_STATUS_STYLE, btn, ErrorNote } from './salesShared';
import { desk, Loading, PageHead, Card, Chips, EmptyNote } from './deskShared';

/**
 * Lead distribution (managers): see each person's load, then hand enquiries to one person or
 * share them evenly. People and their open follow-ups move with the enquiry and are notified.
 */

export default function LeadDistributionPage() {
  const navigate = useNavigate();
  const base = useSalesBase();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [sel, setSel] = useState(new Set());
  const [filter, setFilter] = useState('new');
  const [to, setTo] = useState([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');

  const load = useCallback(() => { desk('/distribution').then(d => { setData(d); setError(''); }).catch(e => setError(e.message)); }, []);
  useEffect(() => { load(); }, [load]);
  const leads = useMemo(() => {
    if (!data) return [];
    return data.leads.filter(l => (filter === 'new' ? l.status === 'New' : filter === 'unassigned' ? !l.ownerId : filter === 'hold' ? l.status === 'On Hold' : true));
  }, [data, filter]);
  if (!data) return <Loading error={error} />;

  const toggle = (id) => setSel(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allOn = leads.length > 0 && leads.every(l => sel.has(l.id));
  const assign = async () => {
    setBusy(true); setError(''); setDone('');
    try {
      const r = await desk('/distribution/assign', { method: 'POST', body: { leadIds: [...sel], ownerIds: to } });
      setDone(r.assigned.length ? r.assigned.map(a => `${a.count} to ${a.name}`).join(', ') : 'Already with the chosen people.');
      setSel(new Set()); load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const count = (k) => data.leads.filter(l => (k === 'new' ? l.status === 'New' : k === 'unassigned' ? !l.ownerId : k === 'hold' ? l.status === 'On Hold' : true)).length;

  return (
    <div className="p-5 bg-[#F8FAFC] min-h-screen font-sans text-gray-900">
      <PageHead title="Lead distribution" sub="Give open enquiries to the right person. With several people chosen, each enquiry goes to whoever has the fewest open ones." />

      <div className="grid xl:grid-cols-[1fr_320px] gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <Chips value={filter} onChange={(v) => { setFilter(v); setSel(new Set()); }} options={[['new', 'Not yet contacted', count('new')], ['unassigned', 'No owner', count('unassigned')], ['hold', 'On hold', count('hold')], ['all', 'All open', count('all')]]} />
          </div>
          <div className="bg-white border border-gray-200 rounded overflow-x-auto">
            <table className="w-full text-[13px] min-w-[640px]">
              <thead className="text-xs text-gray-500 bg-gray-50"><tr>
                <th className="w-10 px-4"><input type="checkbox" checked={allOn} onChange={() => setSel(allOn ? new Set() : new Set(leads.map(l => l.id)))} aria-label="Select all" /></th>
                <th className="text-left font-medium px-2 py-2.5">Enquiry</th><th className="text-left font-medium px-2 py-2.5">Source</th><th className="text-left font-medium px-2 py-2.5">Status</th><th className="text-left font-medium px-2 py-2.5">Owner</th><th className="text-left font-medium px-4 py-2.5">Received</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {leads.map(l => (
                  <tr key={l.id} className={sel.has(l.id) ? 'bg-blue-50/40' : 'hover:bg-gray-50'}>
                    <td className="px-4"><input type="checkbox" checked={sel.has(l.id)} onChange={() => toggle(l.id)} aria-label={`Select ${l.name}`} /></td>
                    <td className="px-2 py-2.5"><button onClick={() => navigate(`${base}/enquiry/${l.id}`)} className="text-left cursor-pointer hover:text-blue-700"><span className="font-medium">{l.name}</span><span className="block text-[11.5px] text-gray-500">{[l.company, l.phone].filter(Boolean).join(' · ')}</span></button></td>
                    <td className="px-2 py-2.5 text-[12px] text-gray-600">{l.source || '—'}</td>
                    <td className="px-2 py-2.5"><Badge text={l.status} tone={LEAD_STATUS_STYLE[l.status]} /></td>
                    <td className="px-2 py-2.5 text-[12px]">{l.owner || <span className="text-orange-700">Nobody</span>}</td>
                    <td className="px-4 py-2.5 text-[12px] text-gray-500">{ago(l.createdAt)}</td>
                  </tr>
                ))}
                {leads.length === 0 && <tr><td colSpan={6}><EmptyNote>Nothing here.</EmptyNote></td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <Card title="Give to">
            {!data.canAssign ? <EmptyNote>Only managers distribute enquiries.</EmptyNote> : (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  {data.people.map(p => (
                    <label key={p.id} className={`flex items-center gap-2.5 border rounded px-2.5 py-2 cursor-pointer ${to.includes(p.id) ? 'border-blue-400 bg-blue-50/40' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <input type="checkbox" checked={to.includes(p.id)} onChange={() => setTo(t => (t.includes(p.id) ? t.filter(x => x !== p.id) : [...t, p.id]))} />
                      <span className="min-w-0 flex-1"><span className="block text-[13px] font-medium truncate">{p.name}</span><span className="block text-[11px] text-gray-500">{p.openLeads} enquiries · {p.openDeals} deals{p.newLeads ? ` · ${p.newLeads} uncontacted` : ''}{p.overdue ? ` · ${p.overdue} overdue` : ''}</span></span>
                    </label>
                  ))}
                </div>
                <button onClick={assign} disabled={busy || !sel.size || !to.length} className={`${btn.primary} w-full justify-center`}>
                  {busy ? <Loader2 size={13} className="animate-spin" /> : to.length > 1 ? <Shuffle size={13} /> : <UserPlus size={13} />} {to.length > 1 ? 'Share evenly' : 'Assign'} {sel.size ? `${sel.size} enquir${sel.size === 1 ? 'y' : 'ies'}` : ''}
                </button>
                {!sel.size && <div className="text-[11.5px] text-gray-500">Tick the enquiries on the left first.</div>}
                {done && <div className="text-[12px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2.5 py-1.5">Assigned {done}.</div>}
                <ErrorNote text={error} />
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

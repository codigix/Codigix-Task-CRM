import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, FileText, Code2, Megaphone } from 'lucide-react';
import { api, useSalesBase, Modal, inputCls, labelCls, btn, ErrorNote } from './salesShared';
import { proposalApi } from './deskShared';

/**
 * One way to start any quotation. A quotation is one document with two formats: a standard
 * priced table (monthly retainer or project), or a presentation (slide deck) for IT projects
 * or digital marketing plans. Both are sent, accepted and billed the same way.
 */
const FORMATS = [
  ['standard', 'Standard quotation', 'A priced table: monthly services (keywords, reels, graphics, ads) or a project with milestones, GST, discount approval and versions.', FileText],
  ['it', 'Presentation · Software / IT', 'A slide-style quotation for ERP, CRM, IoT or apps: modules per option, fixed price, payment milestones, support and AMC.', Code2],
  ['marketing', 'Presentation · Digital marketing', 'A slide-style quotation for SEO, GMB, AEO, GEO, social media and ads: services with plan choices, roles, 3-month plan and commitments.', Megaphone]
];

export default function NewQuotationModal({ preset, onClose }) {
  const navigate = useNavigate();
  const base = useSalesBase();
  const [deals, setDeals] = useState(null);
  const [format, setFormat] = useState(preset?.format || 'standard');
  const [dealId, setDealId] = useState(preset?.deal || '');
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { api('/board?scope=all').then(d => setDeals(d.deals.filter(x => !['Won', 'Lost'].includes(x.status)))).catch(e => setError(e.message)); }, []);

  const go = async () => {
    if (!dealId) { setError('Choose the deal this quotation is for.'); return; }
    if (format === 'standard') { navigate(`${base}/quotation/new?deal=${dealId}`); return; }
    setSaving(true); setError('');
    try { const r = await proposalApi('', { method: 'POST', body: { dealId, kind: format, title } }); navigate(`${base}/proposal/${r.id}`); } catch (e) { setError(e.message); setSaving(false); }
  };
  return (
    <Modal title="New quotation" onClose={onClose} width="max-w-2xl" footer={<><button onClick={onClose} className={btn.ghost}>Cancel</button><button onClick={go} disabled={saving} className={btn.primary}>{saving && <Loader2 size={13} className="animate-spin" />} Create and edit</button></>}>
      <div className="space-y-4">
        <div className="grid sm:grid-cols-3 gap-2">
          {FORMATS.map(([v, l, d, Icon]) => (
            <button key={v} type="button" onClick={() => setFormat(v)} className={`text-left border rounded p-3 cursor-pointer ${format === v ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-200' : 'border-gray-200 hover:bg-gray-50'}`}>
              <div className="flex items-center gap-1.5 text-[13px] font-semibold"><Icon size={14} /> {l}</div><div className="text-[11.5px] text-gray-600 mt-1 leading-snug">{d}</div>
            </button>
          ))}
        </div>
        <div><label className={labelCls}>Deal</label>
          <select value={dealId} onChange={e => setDealId(e.target.value)} className={inputCls}><option value="">{deals ? 'Choose…' : 'Loading…'}</option>{(deals || []).map(d => <option key={d.id} value={d.id}>{d.name}{d.company ? ` · ${d.company}` : ''}</option>)}</select>
          <p className="text-[11px] text-gray-500 mt-1">Create the deal first from an enquiry (Convert to deal) or from the customer's page.</p></div>
        {format !== 'standard' && <div><label className={labelCls}>Title (optional)</label><input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. ERP quotation for Upase Process Equipments" className={inputCls} /></div>}
        <ErrorNote text={error} />
      </div>
    </Modal>
  );
}

import React from 'react';
import { inputCls, labelCls } from './salesShared';

/** Company text, figures and contact details used on every proposal deck (About slide, Thank You slide). */
export default function ProposalSettings({ s, setS, canEdit }) {
  const p = s.proposal || { about: { stats: [], services: [] }, contact: {} };
  const about = p.about || {}; const contact = p.contact || {};
  const setAbout = (patch) => setS(x => ({ ...x, proposal: { ...x.proposal, about: { ...x.proposal?.about, ...patch } } }));
  const setContact = (patch) => setS(x => ({ ...x, proposal: { ...x.proposal, contact: { ...x.proposal?.contact, ...patch } } }));
  const stats = [...(about.stats || [])]; while (stats.length < 3) stats.push({ value: '', label: '' });
  const setStat = (i, patch) => setAbout({ stats: stats.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  const area = 'w-full text-[13px] border border-gray-300 rounded p-2.5 outline-none focus:border-blue-500 disabled:bg-gray-50';
  return (
    <div className="bg-white border border-gray-200 rounded p-4">
      <div className="text-[13px] font-semibold">Proposal deck: about us and contact</div>
      <p className="text-[11.5px] text-gray-500 mb-3">Used on the About and Thank You slides of every proposal. A salesperson can still write different text in a single proposal.</p>
      <div className="grid md:grid-cols-2 gap-3">
        <div><label className={labelCls}>About text: software / IT proposals</label><textarea disabled={!canEdit} value={about.text || ''} onChange={e => setAbout({ text: e.target.value })} rows={7} className={area} /></div>
        <div><label className={labelCls}>About text: digital marketing proposals</label><textarea disabled={!canEdit} value={about.textMarketing || ''} onChange={e => setAbout({ textMarketing: e.target.value })} rows={7} className={area} /></div>
        <div className="md:col-span-2"><label className={labelCls}>Figures on the About slide</label>
          <div className="grid grid-cols-3 gap-2">{stats.slice(0, 3).map((st, i) => (
            <div key={i} className="grid grid-cols-[80px_1fr] gap-1.5"><input disabled={!canEdit} value={st.value} onChange={e => setStat(i, { value: e.target.value })} placeholder="2021" className={inputCls} /><input disabled={!canEdit} value={st.label} onChange={e => setStat(i, { label: e.target.value })} placeholder="Team Members" className={inputCls} /></div>
          ))}</div></div>
        <div className="md:col-span-2"><label className={labelCls}>"What we do" list (one per line)</label><textarea disabled={!canEdit} value={Array.isArray(about.services) ? about.services.join('\n') : (about.services || '')} onChange={e => setAbout({ services: e.target.value.split('\n') })} rows={5} className={area} /></div>
        <div><label className={labelCls}>Phone numbers</label><input disabled={!canEdit} value={contact.phones || ''} onChange={e => setContact({ phones: e.target.value })} className={inputCls} /></div>
        <div><label className={labelCls}>Email</label><input disabled={!canEdit} value={contact.email || ''} onChange={e => setContact({ email: e.target.value })} className={inputCls} /></div>
        <div><label className={labelCls}>Website</label><input disabled={!canEdit} value={contact.website || ''} onChange={e => setContact({ website: e.target.value })} className={inputCls} /></div>
        <div><label className={labelCls}>Address</label><input disabled={!canEdit} value={contact.address || ''} onChange={e => setContact({ address: e.target.value })} className={inputCls} /></div>
      </div>
    </div>
  );
}

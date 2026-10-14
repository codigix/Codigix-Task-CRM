import React from 'react';
import { CheckCircle2, Circle, Repeat, Hammer, ListChecks } from 'lucide-react';
import { money, inputCls, labelCls } from './salesShared';
import { slabRate, itemFromService } from './LineItems';

/**
 * Enquiry intake shared by the "New enquiry" form, the enquiry page and the quotation editor:
 * where the enquiry came from, the billing details a quotation needs, the services asked for,
 * and the format of quotation those services call for.
 */

export const SOURCES = ['Website', 'Phone call', 'WhatsApp', 'Referral', 'Walk-in', 'Social media', 'Google Ads', 'IndiaMART', 'JustDial', 'Email', 'Event', 'Other'];

/** What to ask for each source, so "where it came from" is specific enough to act on. */
const SOURCE_DETAIL = {
  Website: ['Page or form', 'e.g. Contact page, ERP landing page'],
  'Phone call': ['Number called / where they saw us', 'e.g. Office line, saw our Google listing'],
  WhatsApp: ['Number or campaign', 'e.g. Business WhatsApp, Diwali broadcast'],
  'Walk-in': ['How they heard of us', 'e.g. Passing by, newspaper ad'],
  'Social media': ['Platform and post / campaign', 'e.g. Instagram reel, LinkedIn post'],
  'Google Ads': ['Campaign / keyword', 'e.g. "ERP software Pune" search campaign'],
  IndiaMART: ['IndiaMART enquiry ID', 'e.g. 1234567890'],
  JustDial: ['JustDial lead ID', 'e.g. JD-998877'],
  Email: ['Sent to / subject', 'e.g. info@ mailbox, "Need website quote"'],
  Event: ['Event name', 'e.g. Pune IT Expo 2026'],
  Referral: ['Relationship (optional)', 'e.g. Existing client, friend of owner'],
  Other: ['Details', 'Where exactly did it come from?']
};

/** Source + its specific details. value uses the lead's column names. */
export function SourceFields({ value, onChange, compact }) {
  const v = value || {};
  const set = (k, x) => onChange({ ...v, [k]: x });
  const [detailLabel, detailHint] = SOURCE_DETAIL[v.lead_source] || SOURCE_DETAIL.Other;
  return (
    <div className={`grid ${compact ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
      <div><label className={labelCls}>Source <span className="text-red-600">*</span></label>
        <select value={v.lead_source || 'Website'} onChange={e => set('lead_source', e.target.value)} className={inputCls}>{SOURCES.map(s => <option key={s}>{s}</option>)}</select></div>
      <div><label className={labelCls}>{detailLabel}</label><input value={v.source_detail || ''} onChange={e => set('source_detail', e.target.value)} placeholder={detailHint} className={inputCls} /></div>
      {v.lead_source === 'Referral' && <>
        <div><label className={labelCls}>Referred by <span className="text-red-600">*</span></label><input value={v.referral_name || ''} onChange={e => set('referral_name', e.target.value)} placeholder="Name of the person or company" className={inputCls} /></div>
        <div><label className={labelCls}>Referrer's phone / email</label><input value={v.referral_contact || ''} onChange={e => set('referral_contact', e.target.value)} placeholder="To thank them or ask for context" className={inputCls} /></div>
      </>}
    </div>
  );
}

/** One line for "where it came from", e.g. "Referral · referred by Amit Shah (98220…) · existing client". */
export const originText = (l) => [
  l.lead_source || l.source,
  (l.lead_source || l.source) === 'Referral' && (l.referral_name || l.referralName) ? `referred by ${l.referral_name || l.referralName}${(l.referral_contact || l.referralContact) ? ` (${l.referral_contact || l.referralContact})` : ''}` : '',
  l.source_detail || l.sourceDetail
].filter(Boolean).join(' · ');

// GST state codes: the first two digits of a GSTIN name the state.
const GST_STATES = {
  '01': 'Jammu and Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan',
  '09': 'Uttar Pradesh', 10: 'Bihar', 11: 'Sikkim', 12: 'Arunachal Pradesh', 13: 'Nagaland', 14: 'Manipur', 15: 'Mizoram', 16: 'Tripura', 17: 'Meghalaya', 18: 'Assam',
  19: 'West Bengal', 20: 'Jharkhand', 21: 'Odisha', 22: 'Chhattisgarh', 23: 'Madhya Pradesh', 24: 'Gujarat', 26: 'Dadra and Nagar Haveli and Daman and Diu',
  27: 'Maharashtra', 29: 'Karnataka', 30: 'Goa', 31: 'Lakshadweep', 32: 'Kerala', 33: 'Tamil Nadu', 34: 'Puducherry', 35: 'Andaman and Nicobar Islands',
  36: 'Telangana', 37: 'Andhra Pradesh', 38: 'Ladakh'
};
export const STATES = [...new Set(Object.values(GST_STATES))].sort();
export const stateFromGstin = (g) => GST_STATES[String(g || '').slice(0, 2)] || '';

/** Contact, company and billing details: what the quotation's "Bill to" is filled from. */
export function ClientIntakeFields({ value, onChange }) {
  const v = value || {};
  const set = (k, x) => onChange({ ...v, [k]: x });
  const setGstin = (g) => {
    const gstin = g.toUpperCase().replace(/\s/g, '').slice(0, 15);
    const st = stateFromGstin(gstin);
    onChange({ ...v, gstin, ...(st && !v.state ? { state: st } : {}) });
  };
  return (
    <div className="grid grid-cols-2 gap-3">
      <div><label className={labelCls}>Contact name <span className="text-red-600">*</span></label><input autoFocus value={v.lead_name || ''} onChange={e => set('lead_name', e.target.value)} className={inputCls} /></div>
      <div><label className={labelCls}>Designation</label><input value={v.contact_designation || ''} onChange={e => set('contact_designation', e.target.value)} placeholder="e.g. Owner, Purchase manager" className={inputCls} /></div>
      <div><label className={labelCls}>Phone</label><input value={v.phone || ''} onChange={e => set('phone', e.target.value)} className={inputCls} /></div>
      <div><label className={labelCls}>Email</label><input type="email" value={v.email || ''} onChange={e => set('email', e.target.value)} className={inputCls} /></div>
      <div><label className={labelCls}>Company / business</label><input value={v.company || ''} onChange={e => set('company', e.target.value)} className={inputCls} /></div>
      <div><label className={labelCls}>GSTIN</label><input value={v.gstin || ''} onChange={e => setGstin(e.target.value)} placeholder="27ABCDE1234F1Z5 (fills the state)" className={inputCls} /></div>
      <div className="col-span-2"><label className={labelCls}>Billing address</label><input value={v.address || ''} onChange={e => set('address', e.target.value)} placeholder="Building, street, area" className={inputCls} /></div>
      <div><label className={labelCls}>City</label><input value={v.city || ''} onChange={e => set('city', e.target.value)} className={inputCls} /></div>
      <div><label className={labelCls}>State</label>
        <input list="crm-in-states" value={v.state || ''} onChange={e => set('state', e.target.value)} placeholder="Decides CGST+SGST or IGST" className={inputCls} />
        <datalist id="crm-in-states">{STATES.map(s => <option key={s} value={s} />)}</datalist></div>
    </div>
  );
}

const lineAmount = (sv, qty) => slabRate(sv, qty) * qty;
/** One-time and monthly totals (before GST) of the services asked for. */
export const estimateOf = (selected, services) => (selected || []).reduce((acc, s) => {
  const sv = services.find(x => x.id === s.id);
  if (!sv) return acc;
  acc[sv.billing === 'monthly' ? 'monthly' : 'oneTime'] += lineAmount(sv, s.qty);
  return acc;
}, { oneTime: 0, monthly: 0 });
/** Expected value of the enquiry: one-time work plus a 6-month retainer (the quotation's default period). */
export const RETAINER_MONTHS = 6;
export const expectedValueOf = (selected, services) => { const e = estimateOf(selected, services); return Math.round(e.oneTime + e.monthly * RETAINER_MONTHS); };

/** Pick the services the client asked for, with quantities; grouped like Sales Settings. */
export function ServicePicker({ services, value, onChange }) {
  const selected = value || [];
  const byCat = services.reduce((m, s) => { (m[s.category] = m[s.category] || []).push(s); return m; }, {});
  const has = (id) => selected.some(x => x.id === id);
  const toggle = (sv) => onChange(has(sv.id) ? selected.filter(x => x.id !== sv.id) : [...selected, { id: sv.id, qty: sv.defaultQty || 1 }]);
  const setQty = (id, qty) => onChange(selected.map(x => (x.id === id ? { ...x, qty: Math.max(1, parseInt(qty, 10) || 1) } : x)));
  const est = estimateOf(selected, services);
  if (!services.length) return <div className="text-[12px] text-gray-500">No services in Sales Settings yet. Describe the requirement below.</div>;
  return (
    <div className="space-y-2.5">
      {Object.entries(byCat).map(([cat, list]) => (
        <div key={cat}>
          <div className="text-[11px] font-semibold text-gray-500 mb-1">{cat}</div>
          <div className="flex flex-wrap gap-1.5">
            {list.map(sv => (
              <button key={sv.id} type="button" onClick={() => toggle(sv)}
                className={`h-7 px-2.5 text-xs rounded border cursor-pointer ${has(sv.id) ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}>{sv.name}</button>
            ))}
          </div>
        </div>
      ))}
      {selected.length > 0 && (
        <div className="border border-gray-200 rounded divide-y divide-gray-100 bg-white">
          {selected.map(s => {
            const sv = services.find(x => x.id === s.id);
            if (!sv) return null;
            return (
              <div key={s.id} className="flex items-center gap-2 px-2.5 py-1.5 text-[12.5px]">
                <span className="flex-1 min-w-0 truncate">{sv.name}</span>
                <input value={s.qty} onChange={e => setQty(s.id, e.target.value.replace(/\D/g, ''))} className="w-14 h-7 border border-gray-300 rounded px-2 text-right" aria-label={`Quantity of ${sv.name}`} />
                <span className="w-24 text-[11px] text-gray-500 truncate">{sv.unit ? `${sv.unit}${s.qty === 1 ? '' : 's'}` : 'job'}{sv.billing === 'monthly' ? ' / month' : ''}</span>
                <span className="w-24 text-right tabular-nums text-gray-700">{money(lineAmount(sv, s.qty))}</span>
              </div>
            );
          })}
          <div className="px-2.5 py-1.5 text-[11.5px] text-gray-600 flex flex-wrap justify-end gap-x-3 bg-gray-50">
            {est.oneTime > 0 && <span>One-time ≈ <b className="tabular-nums">{money(est.oneTime)}</b></span>}
            {est.monthly > 0 && <span>Monthly ≈ <b className="tabular-nums">{money(est.monthly)}</b></span>}
            <span className="text-gray-400">list prices, before GST</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * The quotation format the requirement calls for: monthly services only -> monthly retainer,
 * any one-time IT / web work -> project (scope + payment milestones), otherwise a simple list.
 */
export const FORMAT_INFO = {
  retainer: { label: 'Monthly retainer', icon: Repeat, why: 'Only monthly services were asked for, so the quotation bills every month for the agreed quota.' },
  project: { label: 'Project', icon: Hammer, why: 'One-time work was asked for, so the quotation has scope of work and payment milestones.' },
  general: { label: 'Simple quotation', icon: ListChecks, why: 'No catalog services picked yet: a plain list of items and prices.' }
};
export const suggestFormat = (selected, services) => {
  const picked = (selected || []).map(s => services.find(x => x.id === s.id)).filter(Boolean);
  if (!picked.length) return 'general';
  if (picked.every(sv => sv.billing === 'monthly')) return 'retainer';
  return 'project';
};
/** Quotation lines for the services asked for, at the volume rate for each quantity. */
export const itemsFromServices = (selected, services) => (selected || []).map(s => {
  const sv = services.find(x => x.id === s.id);
  if (!sv) return null;
  return { ...itemFromService(sv), qty: s.qty, rate: slabRate(sv, s.qty) };
}).filter(Boolean);

/**
 * Where an enquiry / deal is in the sales flow, as a row of steps. `steps` is
 * [{ label, done, current, hint }]; the current step says what to do next.
 */
export function FlowSteps({ steps }) {
  return (
    <ol className="flex items-stretch gap-1 overflow-x-auto pb-1" aria-label="Sales flow">
      {steps.map((s, i) => (
        <li key={s.label} className={`shrink-0 min-w-[120px] flex-1 rounded border px-2.5 py-1.5 ${s.current ? 'border-red-300 bg-red-50/60' : s.done ? 'border-emerald-200 bg-emerald-50/50' : 'border-gray-200 bg-white'}`}
          aria-current={s.current ? 'step' : undefined}>
          <div className={`text-[11.5px] font-semibold flex items-center gap-1 ${s.current ? 'text-red-700' : s.done ? 'text-emerald-800' : 'text-gray-500'}`}>
            {s.done ? <CheckCircle2 size={12} /> : <Circle size={12} />}<span className="text-gray-400 font-normal">{i + 1}.</span> {s.label}
          </div>
          {s.hint && <div className="text-[10.5px] text-gray-500 leading-snug mt-0.5 line-clamp-2">{s.hint}</div>}
        </li>
      ))}
    </ol>
  );
}

/** Steps for an enquiry (and the deal it becomes): enquiry -> contact -> requirement -> quotation -> sent -> negotiation -> won. */
export const flowStepsFor = ({ isLead, rec, timeline = [], quotations = [], decks = [], lead }) => {
  const contacted = timeline.some(i => i.kind === 'communication' && i.meta?.channel !== 'Note') || (isLead ? ['Contacted', 'Qualified', 'Converted to Deal'].includes(rec.status) : true);
  const services = isLead ? (rec.services || []) : (lead?.services || []);
  const requirement = isLead ? (rec.status === 'Qualified' || services.length > 0 || rec.status === 'Converted to Deal') : true;
  const docs = [...quotations, ...decks];
  const quoted = docs.length > 0;
  const sent = docs.some(d => ['Sent', 'Accepted', 'Declined'].includes(d.status) || d.sentAt);
  const revised = quotations.some(q => q.version > 1) || /negotiation/i.test(rec.deal_stage || '');
  const won = !isLead && rec.status === 'Won';
  const accepted = docs.some(d => d.status === 'Accepted');
  const steps = [
    { label: 'Enquiry received', done: true, hint: originText(isLead ? rec : (lead || {})) || '' },
    { label: 'First contact', done: contacted, hint: contacted ? '' : 'Call the client and log how it went' },
    { label: 'Requirement clear', done: requirement, hint: requirement ? '' : 'Pick the services asked for, mark Qualified' },
    { label: 'Quotation', done: quoted, hint: quoted ? '' : 'Create the quotation from this page' },
    { label: 'Sent to client', done: sent, hint: sent ? '' : 'Approve, then email or mark as sent' },
    { label: 'Negotiation', done: accepted || won, hint: revised ? 'Revised version: send it and get the answer' : 'Revise the quotation if they ask for changes' },
    { label: 'Won', done: won, hint: accepted && !won ? 'Quotation accepted: mark the deal won' : '' }
  ];
  const cur = steps.findIndex(s => !s.done);
  if (cur >= 0) steps[cur].current = true;
  return steps;
};

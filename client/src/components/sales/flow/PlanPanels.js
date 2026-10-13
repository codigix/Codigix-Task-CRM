import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ChevronDown, ChevronRight, CalendarCheck, Loader2, ExternalLink } from 'lucide-react';
import { money2, Badge, inputCls, labelCls, btn, ErrorNote } from './salesShared';
import { findService } from './LineItems';
import { desk, INVOICE_STATUS_STYLE } from './deskShared';

/**
 * The part of a quotation that is not price lines:
 *   retainer (digital marketing): duration, start month, ad-spend note, what is delivered each month
 *   project (software / IT):      timeline, payment milestones, scope of work per service, rules
 * plus the billing schedule that appears once the client accepts.
 */

const card = 'bg-white border border-gray-200 rounded-lg';

/** Sections ("Assumptions", "Exclusions"...) with one point per line. */
export function SectionsEditor({ sections, onChange, editable, title = 'Notes and rules' }) {
  const set = (i, patch) => onChange(sections.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  return (
    <div className={`${card} p-4`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[13px] font-semibold">{title}</div>
        {editable && <button onClick={() => onChange([...sections, { title: '', items: [] }])} className={btn.ghost}><Plus size={13} /> Add a section</button>}
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {sections.map((s, i) => (
          <div key={i} className="border border-gray-200 rounded-lg p-2.5 bg-gray-50/50">
            <div className="flex items-center gap-2 mb-1.5">
              <input disabled={!editable} value={s.title} onChange={e => set(i, { title: e.target.value })} placeholder="Heading, e.g. Exclusions" className={`${inputCls} font-medium disabled:bg-white`} />
              {editable && <button onClick={() => onChange(sections.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-600 cursor-pointer" aria-label="Remove section"><Trash2 size={14} /></button>}
            </div>
            <textarea disabled={!editable} value={Array.isArray(s.items) ? s.items.join('\n') : s.items} onChange={e => set(i, { items: e.target.value.split('\n') })} rows={4} placeholder="One point per line" className="w-full text-[12.5px] border border-gray-300 rounded p-2 outline-none focus:border-blue-500 disabled:bg-white" />
          </div>
        ))}
        {!sections.length && <div className="text-[12.5px] text-gray-500 md:col-span-2">No notes. Add what the client can expect, what you need from them and what is not included.</div>}
      </div>
    </div>
  );
}

/** The scope of work each chosen service brings (from Sales Settings), shown as it will print. */
export function ScopePreview({ items, services }) {
  const [open, setOpen] = useState(true);
  const rows = items.map(it => ({ it, sv: findService(services, it.name) })).filter(x => x.sv?.scope?.length && Number(x.it.qty) > 0);
  return (
    <div className={`${card} p-4`}>
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1.5 text-[13px] font-semibold cursor-pointer">{open ? <ChevronDown size={14} /> : <ChevronRight size={14} />} Scope of work, from the services you chose</button>
      <p className="text-[11.5px] text-gray-500 mt-0.5 mb-2">Printed on the quotation under each service. Edit the wording for a service in Sales Settings → Services.</p>
      {open && (rows.length === 0 ? <div className="text-[12.5px] text-gray-500">Add services from the list above and their scope appears here.</div> : (
        <div className="grid md:grid-cols-2 gap-3">
          {rows.map(({ it, sv }) => (
            <div key={it.key} className="border border-gray-200 rounded-lg p-2.5">
              <div className="text-[12.5px] font-semibold text-gray-900">{sv.name}{Number(it.qty) > 1 && sv.unit ? ` · ${it.qty} ${sv.unit}s` : ''}</div>
              <ul className="mt-1 space-y-0.5 text-[12px] text-gray-700 list-disc pl-4">{sv.scope.map((t, i) => <li key={i}>{t}</li>)}</ul>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function RetainerPanel({ plan, onChange, editable, monthly }) {
  const set = (k, v) => onChange({ ...plan, [k]: v });
  return (
    <div className={`${card} p-4`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[13px] font-semibold">Monthly retainer</div>
        <div className="text-[12px] text-gray-600">{money2(monthly)} / month × {plan.months || 0} = <span className="font-semibold text-gray-900">{money2(monthly * (plan.months || 0))}</span></div>
      </div>
      <p className="text-[11.5px] text-gray-500 mb-3">The lines above are the monthly quota: for example 20 keywords, 8 reels and 12 creatives each month. One invoice is raised every month from this quotation.</p>
      <div className="grid md:grid-cols-4 gap-3">
        <div><label className={labelCls}>Number of months</label><input disabled={!editable} value={plan.months ?? ''} onChange={e => set('months', e.target.value.replace(/\D/g, ''))} className={`${inputCls} disabled:bg-gray-50`} /></div>
        <div><label className={labelCls}>Starts in</label><input type="month" disabled={!editable} value={plan.startMonth || ''} onChange={e => set('startMonth', e.target.value)} className={`${inputCls} disabled:bg-gray-50`} /></div>
        <div className="md:col-span-2"><label className={labelCls}>Ad spend and platform costs</label><input disabled={!editable} value={plan.adSpendNote || ''} onChange={e => set('adSpendNote', e.target.value)} placeholder="e.g. Meta and Google ad spend (about ₹30,000 a month) is paid by the client directly" className={`${inputCls} disabled:bg-gray-50`} /></div>
      </div>
    </div>
  );
}

export function ProjectPanel({ plan, onChange, editable, total }) {
  const set = (k, v) => onChange({ ...plan, [k]: v });
  const ms = plan.milestones || [];
  const sum = ms.reduce((s, m) => s + (Number(m.pct) || 0), 0);
  const setMs = (i, patch) => set('milestones', ms.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  const amount = (i) => (i === ms.length - 1 ? total - ms.slice(0, i).reduce((s, m) => s + Math.round(total * (Number(m.pct) || 0)) / 100, 0) : Math.round(total * (Number(ms[i].pct) || 0)) / 100);
  return (
    <div className={`${card} p-4`}>
      <div className="text-[13px] font-semibold mb-2">Project payments and timeline</div>
      <div className="grid md:grid-cols-[1fr_2fr] gap-4">
        <div><label className={labelCls}>Timeline</label><input disabled={!editable} value={plan.timeline || ''} onChange={e => set('timeline', e.target.value)} placeholder="e.g. 16–20 weeks from the advance" className={`${inputCls} disabled:bg-gray-50`} /></div>
        <div>
          <div className="flex items-center justify-between mb-1"><label className="text-xs font-semibold text-gray-700">Payment milestones</label>
            {editable && <div className="flex gap-1.5">
              <button onClick={() => set('milestones', [{ name: 'Advance with the order', pct: 30 }, { name: 'On delivery for testing (UAT)', pct: 40 }, { name: 'On go-live', pct: 30 }])} className="text-[11px] text-blue-700 hover:underline cursor-pointer">30 / 40 / 30</button>
              <button onClick={() => set('milestones', [{ name: 'Advance with the order', pct: 50 }, { name: 'On go-live', pct: 50 }])} className="text-[11px] text-blue-700 hover:underline cursor-pointer">50 / 50</button>
              <button onClick={() => set('milestones', [...ms, { name: '', pct: 0 }])} className="text-[11px] text-blue-700 hover:underline cursor-pointer inline-flex items-center gap-0.5"><Plus size={11} /> Add</button>
            </div>}
          </div>
          <table className="w-full text-[13px]">
            <tbody>
              {ms.map((m, i) => (
                <tr key={i}>
                  <td className="py-1 pr-2 w-6 text-gray-500">{i + 1}</td>
                  <td className="py-1 pr-2"><input disabled={!editable} value={m.name} onChange={e => setMs(i, { name: e.target.value })} placeholder="e.g. On delivery for testing" className={`${inputCls} disabled:bg-gray-50`} /></td>
                  <td className="py-1 pr-2 w-24"><div className="relative"><input disabled={!editable} value={m.pct} onChange={e => setMs(i, { pct: e.target.value.replace(/[^\d.]/g, '') })} className={`${inputCls} text-right pr-6 disabled:bg-gray-50`} /><span className="absolute right-2 top-2 text-gray-400 text-xs">%</span></div></td>
                  <td className="py-1 w-32 text-right tabular-nums text-gray-700">{money2(amount(i))}</td>
                  <td className="py-1 pl-2 w-6">{editable && <button onClick={() => set('milestones', ms.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-600 cursor-pointer" aria-label="Remove milestone"><Trash2 size={14} /></button>}</td>
                </tr>
              ))}
              <tr><td /><td className="pt-1 text-[11.5px] text-gray-500">Total (including GST: {money2(total)})</td><td className={`pt-1 text-right text-[12px] font-semibold ${Math.abs(sum - 100) > 0.01 ? 'text-red-700' : 'text-emerald-700'}`}>{sum}%</td><td /><td /></tr>
            </tbody>
          </table>
          {Math.abs(sum - 100) > 0.01 && <div className="text-[11.5px] text-red-700 mt-1">The milestones must add up to 100%.</div>}
        </div>
      </div>
    </div>
  );
}

/** After the client accepts: one invoice per month (retainer) or per milestone (project). */
export function BillingCard({ quoteId, base, onChanged }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const load = () => desk(`/quotations/${quoteId}/billing`).then(setData).catch(e => setError(e.message));
  useEffect(() => { load(); }, [quoteId]); // eslint-disable-line
  if (!data) return error ? <ErrorNote text={error} /> : null;
  if (!data.rows.length) return null;
  const retainer = data.quote.quoteType === 'retainer';
  const bill = async (r) => {
    setBusy(r.key); setError('');
    try { const d = await desk(`/quotations/${quoteId}/bill`, { method: 'POST', body: retainer ? { month: r.month } : { milestone: r.milestone } }); navigate(`${base}/invoice/${d.id}`); if (onChanged) onChanged(); } catch (e) { setError(e.message); setBusy(''); }
  };
  const due = data.rows.filter(r => !r.invoice && r.status === 'Due').length;
  return (
    <div className={`${card}`}>
      <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[13px] font-semibold inline-flex items-center gap-1.5"><CalendarCheck size={14} className="text-emerald-600" /> {retainer ? 'Monthly billing' : 'Payment milestones'}</span>
        <span className="text-[12px] text-gray-600">{data.rows.filter(r => r.invoice).length} of {data.rows.length} invoiced{due ? <span className="text-orange-700 font-medium"> · {due} due now</span> : ''}</span>
      </div>
      <ul className="divide-y divide-gray-100">
        {data.rows.map(r => (
          <li key={r.key} className="px-4 py-2.5 flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium truncate">{retainer ? r.label : `${r.milestone}. ${r.label}`}{!retainer && <span className="text-gray-500 font-normal"> · {r.pct}%</span>}</div>
              {r.invoice ? <div className="text-[11.5px] text-gray-500">{r.invoice.number}{r.invoice.balance > 0 && r.invoice.status !== 'Draft' ? ` · ${money2(r.invoice.balance)} still due` : ''}</div> : <div className="text-[11.5px] text-gray-500">Not invoiced yet</div>}
            </div>
            <span className="tabular-nums text-[13px]">{money2(r.invoice ? r.invoice.total : r.amount)}</span>
            {r.invoice ? <Badge text={r.invoice.status} tone={INVOICE_STATUS_STYLE[r.invoice.status]} /> : <Badge text={r.status} tone={r.status === 'Due' ? 'bg-orange-50 text-orange-800 ring-orange-200' : 'bg-gray-100 text-gray-600 ring-gray-200'} />}
            {r.invoice
              ? <button onClick={() => navigate(`${base}/invoice/${r.invoice.id}`)} className={btn.ghost}><ExternalLink size={13} /> Open</button>
              : <button onClick={() => bill(r)} disabled={!!busy} className={r.status === 'Due' ? btn.primary : btn.ghost}>{busy === r.key ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Create invoice</button>}
          </li>
        ))}
      </ul>
      <div className="px-4 py-2 text-[11.5px] text-gray-500 border-t border-gray-100">Each invoice is created as a draft with the lines of this quotation; change quantities, add a credit line or an adjustment before sending. {retainer ? 'Months can be billed ahead of time.' : ''}</div>
      <ErrorNote text={error} />
    </div>
  );
}

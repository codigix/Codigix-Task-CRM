import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { inputCls, labelCls, btn } from './salesShared';

/**
 * The service catalogue managers keep in Sales Settings: what we sell, per unit rate, volume slabs
 * ("1-10 keywords at 1,500, 11-25 at 1,200 ...") and the scope of work printed on quotations.
 */

const CATEGORIES = ['Digital Marketing', 'Web & Hosting', 'IT & Software', 'Other'];
export const slabsToText = (slabs) => (slabs || []).map(b => `${b.upTo == null ? '*' : b.upTo}:${b.rate}`).join(', ');
export const textToSlabs = (text) => String(text || '').split(',').map(p => p.trim()).filter(Boolean).map(p => {
  const [u, r] = p.split(':').map(x => x.trim());
  return { upTo: u === '*' || u === '' || u === undefined ? null : Number(u), rate: Number(r) };
}).filter(b => b.rate > 0 && (b.upTo == null || b.upTo > 0));

function Row({ sv, onChange, onRemove, canEdit }) {
  const [open, setOpen] = useState(false);
  const set = (patch) => onChange({ ...sv, ...patch });
  const cell = `${inputCls} disabled:bg-gray-50`;
  return (
    <>
      <tr className={sv.active === false ? 'opacity-50' : ''}>
        <td className="pl-3 py-1.5 w-6"><button onClick={() => setOpen(o => !o)} className="text-gray-400 hover:text-gray-800 cursor-pointer" aria-label="Details">{open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</button></td>
        <td className="px-1.5 py-1.5"><input disabled={!canEdit} value={sv.name} onChange={e => set({ name: e.target.value })} className={`${cell} font-medium`} /></td>
        <td className="px-1.5 py-1.5 w-36"><select disabled={!canEdit} value={sv.category} onChange={e => set({ category: e.target.value })} className={cell}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></td>
        <td className="px-1.5 py-1.5 w-28"><select disabled={!canEdit} value={sv.billing} onChange={e => set({ billing: e.target.value })} className={cell}><option value="monthly">Monthly</option><option value="one-time">One-time</option></select></td>
        <td className="px-1.5 py-1.5 w-24"><input disabled={!canEdit} value={sv.unit} onChange={e => set({ unit: e.target.value })} placeholder="keyword" className={cell} /></td>
        <td className="px-1.5 py-1.5 w-24"><input disabled={!canEdit} value={sv.rate} onChange={e => set({ rate: e.target.value.replace(/[^\d.]/g, '') })} className={`${cell} text-right`} /></td>
        <td className="px-1.5 py-1.5 w-16"><input disabled={!canEdit} value={sv.defaultQty} onChange={e => set({ defaultQty: e.target.value.replace(/[^\d.]/g, '') })} className={`${cell} text-right`} /></td>
        <td className="px-1.5 py-1.5 w-14 text-center"><input type="checkbox" disabled={!canEdit} checked={sv.active !== false} onChange={e => set({ active: e.target.checked })} aria-label="In use" /></td>
        <td className="pr-3 w-8">{canEdit && <button onClick={onRemove} className="text-gray-300 hover:text-red-600 cursor-pointer" aria-label="Remove service"><Trash2 size={14} /></button>}</td>
      </tr>
      {open && (
        <tr className="bg-gray-50/60"><td /><td colSpan={8} className="px-1.5 pb-3 pt-1">
          <div className="grid md:grid-cols-4 gap-3">
            <div className="md:col-span-2"><label className={labelCls}>One line description</label><input disabled={!canEdit} value={sv.description || ''} onChange={e => set({ description: e.target.value })} className={cell} /></div>
            <div><label className={labelCls}>HSN / SAC</label><input disabled={!canEdit} value={sv.hsn || ''} onChange={e => set({ hsn: e.target.value })} className={cell} /></div>
            <div><label className={labelCls}>GST %</label><input disabled={!canEdit} value={sv.taxPct ?? 18} onChange={e => set({ taxPct: e.target.value.replace(/[^\d.]/g, '') })} className={cell} /></div>
            <div className="md:col-span-4"><label className={labelCls}>Volume rates</label>
              <input disabled={!canEdit} value={sv._slabs ?? slabsToText(sv.slabs)} onChange={e => set({ _slabs: e.target.value, slabs: textToSlabs(e.target.value) })} placeholder="10:1500, 25:1200, 50:1000, *:850" className={cell} />
              <p className="text-[11px] text-gray-500 mt-1">Up to this many units : price per unit. The first row that fits the quantity prices every unit. “*” means more than the last number. Leave empty for one flat rate.</p></div>
            <div className="md:col-span-4"><label className={labelCls}>Scope of work (one point per line; printed under this service on the quotation)</label>
              <textarea disabled={!canEdit} value={sv._scope ?? (sv.scope || []).join('\n')} onChange={e => set({ _scope: e.target.value, scope: e.target.value.split('\n') })} rows={6} className="w-full text-[12.5px] border border-gray-300 rounded p-2 outline-none focus:border-blue-500 disabled:bg-gray-50" /></div>
          </div>
        </td></tr>
      )}
    </>
  );
}

export default function ServicesEditor({ services, onChange, canEdit }) {
  const [filter, setFilter] = useState('');
  const add = (category) => onChange([...services, { id: `svc-${Date.now()}`, name: 'New service', category, billing: category === 'Digital Marketing' ? 'monthly' : 'one-time', unit: '', rate: 0, defaultQty: 1, hsn: '998361', taxPct: 18, slabs: [], scope: [], description: '', active: true }]);
  const cats = [...new Set([...CATEGORIES, ...services.map(s => s.category)])];
  return (
    <div className="bg-white border border-gray-200 rounded">
      <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
        <div><div className="text-[13px] font-semibold">Services and rates</div><div className="text-[11.5px] text-gray-500">What the salesperson picks in a quotation. Monthly services (SEO per keyword, reels, creatives) repeat every month; one-time services are projects.</div></div>
        {canEdit && <div className="flex gap-1.5">{['Digital Marketing', 'IT & Software'].map(c => <button key={c} onClick={() => add(c)} className={btn.ghost}><Plus size={13} /> {c}</button>)}</div>}
      </div>
      <div className="px-4 py-2 border-b border-gray-100"><input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Find a service" className={`${inputCls} max-w-xs`} /></div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px] min-w-[900px]">
          <thead className="text-xs text-gray-500 bg-gray-50"><tr><th /><th className="text-left font-medium px-2 py-2">Service</th><th className="text-left font-medium px-2 py-2">Category</th><th className="text-left font-medium px-2 py-2">Billing</th><th className="text-left font-medium px-2 py-2">Unit</th><th className="text-right font-medium px-2 py-2">Rate (₹)</th><th className="text-right font-medium px-2 py-2">Qty</th><th className="font-medium px-2 py-2">In use</th><th /></tr></thead>
          {cats.map(cat => {
            const rows = services.map((sv, i) => ({ sv, i })).filter(x => x.sv.category === cat && (!filter || x.sv.name.toLowerCase().includes(filter.toLowerCase())));
            if (!rows.length) return null;
            return (
              <tbody key={cat} className="divide-y divide-gray-100 border-t border-gray-100">
                <tr><td colSpan={9} className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 bg-gray-50/70">{cat}</td></tr>
                {rows.map(({ sv, i }) => <Row key={sv.id} sv={sv} canEdit={canEdit} onChange={(n) => onChange(services.map((x, j) => (j === i ? n : x)))} onRemove={() => onChange(services.filter((_, j) => j !== i))} />)}
              </tbody>
            );
          })}
        </table>
      </div>
    </div>
  );
}

import React from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, MinusCircle } from 'lucide-react';
import { money, money2, inputCls, btn } from './salesShared';

/**
 * GST line items, shared by the quotation and invoice editors: the services catalogue (from Sales
 * Settings), volume rates (e.g. 20 keywords are cheaper per keyword than 5), credit lines and totals
 * (same arithmetic as server/services/salesPdf.js).
 */

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/** Rate for a quantity: the first slab whose upTo covers it applies to every unit. */
export const slabRate = (sv, qty) => {
  const q = Math.abs(Number(qty) || 0);
  if (!sv?.slabs?.length) return Number(sv?.rate) || 0;
  const slab = sv.slabs.find(b => b.upTo == null || q <= Number(b.upTo));
  return Number((slab || sv.slabs[sv.slabs.length - 1]).rate) || 0;
};
export const slabText = (sv) => (sv?.slabs || []).map((b, i, all) => {
  const from = i === 0 ? 1 : Number(all[i - 1].upTo) + 1;
  return b.upTo == null ? `${from}+ @ ₹${b.rate}` : `${from}–${b.upTo} @ ₹${b.rate}`;
}).join('  ·  ');
export const findService = (services, name) => (services || []).find(x => x.name.trim().toLowerCase() === String(name || '').trim().toLowerCase());

export const totalsOf = (items, gstMode) => {
  const lines = items.map(it => {
    const qty = Number(it.qty) || 0; const rate = Number(it.rate) || 0;
    const discountPct = Math.min(100, Math.max(0, Number(it.discountPct) || 0)); const taxPct = Math.max(0, Number(it.taxPct) || 0);
    const gross = qty * rate; const discount = round2((gross * discountPct) / 100); const taxable = round2(gross - discount); const tax = round2((taxable * taxPct) / 100);
    return { gross, discount, taxable, tax, total: round2(taxable + tax), discountPct };
  });
  const sum = (k) => round2(lines.reduce((s, l) => s + l[k], 0));
  const tax = sum('tax'); const gross = sum('gross'); const discount = sum('discount');
  return { lines, gross, discount, taxable: sum('taxable'), tax, cgst: gstMode === 'inter' ? 0 : round2(tax / 2), sgst: gstMode === 'inter' ? 0 : round2(tax - round2(tax / 2)), igst: gstMode === 'inter' ? tax : 0, total: sum('total'), discountPct: gross ? round2((discount / gross) * 100) : 0, maxLine: lines.reduce((m, l) => Math.max(m, l.discountPct), 0) };
};
export const blankItem = (tax) => ({ key: Math.random(), name: '', description: '', hsn: '', unit: '', qty: 1, rate: 0, discountPct: 0, taxPct: tax });
export const itemFromService = (sv) => {
  const qty = sv.defaultQty || 1;
  return { key: Math.random(), name: sv.name, description: '', hsn: sv.hsn || '', unit: sv.unit || '', qty, rate: slabRate(sv, qty), discountPct: 0, taxPct: sv.taxPct ?? 18, autoRate: true };
};

/** items: [{ key, name, description, hsn, unit, qty, rate, discountPct, taxPct }]; onChange(nextItems). */
export function ItemsTable({ items, onChange, editable, defaultTax = 18, discountLimit = null, title = 'Items', services = [], allowCredit = true }) {
  const t = totalsOf(items, 'intra');
  const setItem = (key, patch) => onChange(items.map(i => (i.key === key ? { ...i, ...patch } : i)));
  const changeQty = (it, v) => {
    const sv = it.autoRate === false ? null : findService(services, it.name);
    setItem(it.key, { qty: v, ...(sv && sv.slabs?.length && v !== '' && v !== '-' ? { rate: slabRate(sv, v), autoRate: true } : {}) });
  };
  const move = (idx, dir) => { const next = [...items]; const j = idx + dir; if (j < 0 || j >= next.length) return;[next[idx], next[j]] = [next[j], next[idx]]; onChange(next); };
  const cell = `${inputCls} disabled:bg-white disabled:border-transparent`;
  const mini = 'w-full h-9 text-[12.5px] border border-gray-300 rounded px-1.5 outline-none focus:border-blue-500 bg-white disabled:bg-white disabled:border-transparent';
  const groups = services.reduce((m, s) => { (m[s.category] = m[s.category] || []).push(s); return m; }, {});
  return (
    <div className="bg-white border border-gray-200 rounded">
      <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[13px] font-semibold">{title}</span>
        {editable && (
          <div className="flex flex-wrap gap-1.5">
            <select value="" onChange={e => { const sv = services.find(x => x.id === e.target.value); if (sv) onChange([...items.filter(i => i.name || Number(i.rate)), itemFromService(sv)]); }} className="h-8 text-xs border border-gray-300 rounded px-2 bg-white max-w-[260px]">
              <option value="">+ Add a service…</option>
              {Object.entries(groups).map(([cat, list]) => (
                <optgroup key={cat} label={cat}>{list.map(sv => <option key={sv.id} value={sv.id}>{sv.name} · {money(sv.rate)}{sv.unit ? `/${sv.unit}` : ''}{sv.billing === 'monthly' ? ' · monthly' : ''}</option>)}</optgroup>
              ))}
            </select>
            <button onClick={() => onChange([...items, blankItem(defaultTax)])} className={btn.ghost}><Plus size={13} /> Blank line</button>
            {allowCredit && <button onClick={() => onChange([...items, { ...blankItem(defaultTax), name: 'Credit: ', qty: -1 }])} className={btn.ghost} title="Reduces the invoice, e.g. work not delivered last month"><MinusCircle size={13} /> Credit line</button>}
          </div>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px] min-w-[760px]">
          <thead className="text-xs text-gray-500 bg-gray-50"><tr>
            <th className="w-8 py-2"></th><th className="text-left font-medium px-2 py-2">Service / description</th><th className="text-left font-medium px-1 py-2 w-[76px]">HSN/SAC</th>
            <th className="text-right font-medium px-1 py-2 w-[54px]">Qty</th><th className="text-left font-medium px-1 py-2 w-[72px]">Unit</th><th className="text-right font-medium px-1 py-2 w-[88px]">Rate (₹)</th>
            <th className="text-right font-medium px-1 py-2 w-[56px]">Disc.%</th><th className="text-right font-medium px-1 py-2 w-[68px]">GST</th><th className="text-right font-medium px-2 py-2 w-[92px]">Amount</th><th className="w-8"></th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((it, idx) => {
              const over = discountLimit != null && (Number(it.discountPct) || 0) > discountLimit;
              const sv = findService(services, it.name);
              const credit = Number(it.qty) < 0;
              const slabs = sv?.slabs?.length > 1 ? slabText(sv) : '';
              return (
                <tr key={it.key} className={`align-top ${credit ? 'bg-red-50/40' : ''}`}>
                  <td className="py-2 pl-2">{editable && <div className="flex flex-col"><button onClick={() => move(idx, -1)} className="text-gray-400 hover:text-gray-700 cursor-pointer" aria-label="Move up"><ChevronUp size={13} /></button><button onClick={() => move(idx, 1)} className="text-gray-400 hover:text-gray-700 cursor-pointer" aria-label="Move down"><ChevronDown size={13} /></button></div>}</td>
                  <td className="px-2 py-2 space-y-1">
                    <input disabled={!editable} value={it.name} onChange={e => setItem(it.key, { name: e.target.value, autoRate: true })} list="sales-service-names" placeholder="Service name" className={`${cell} font-medium`} />
                    <textarea disabled={!editable} value={it.description} onChange={e => setItem(it.key, { description: e.target.value })} rows={editable ? 2 : 1} placeholder="What is included" className="w-full text-[12px] border border-gray-200 rounded px-2 py-1 outline-none focus:border-blue-500 disabled:border-transparent disabled:bg-white resize-y" />
                    {editable && slabs && <div className="text-[10.5px] text-gray-500 leading-snug">Volume rate per {sv.unit || 'unit'}: {slabs}</div>}
                  </td>
                  <td className="px-1 py-2"><input disabled={!editable} value={it.hsn} onChange={e => setItem(it.key, { hsn: e.target.value })} className={mini} /></td>
                  <td className="px-1 py-2"><input disabled={!editable} value={it.qty} onChange={e => changeQty(it, e.target.value.replace(/[^\d.-]/g, ''))} className={`${mini} text-right`} /></td>
                  <td className="px-1 py-2"><input disabled={!editable} value={it.unit} onChange={e => setItem(it.key, { unit: e.target.value })} placeholder="month" className={mini} /></td>
                  <td className="px-1 py-2"><input disabled={!editable} value={it.rate} onChange={e => setItem(it.key, { rate: e.target.value.replace(/[^\d.]/g, ''), autoRate: false })} className={`${mini} text-right`} /></td>
                  <td className="px-1 py-2"><input disabled={!editable} value={it.discountPct} onChange={e => setItem(it.key, { discountPct: e.target.value.replace(/[^\d.]/g, '') })} className={`${mini} text-right ${over ? 'border-amber-400 bg-amber-50' : ''}`} title={over ? `Above ${discountLimit}%: needs a manager's approval` : ''} /></td>
                  <td className="px-1 py-2">
                    <select disabled={!editable} value={it.taxPct} onChange={e => setItem(it.key, { taxPct: e.target.value })} className={`${mini} text-right pr-0`}>{[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}</select>
                  </td>
                  <td className={`px-2 py-2 text-right font-medium tabular-nums pt-4 ${credit ? 'text-red-700' : ''}`}>{money2(t.lines[idx]?.total)}</td>
                  <td className="py-2 pr-2 pt-3">{editable && items.length > 1 && <button onClick={() => onChange(items.filter(i => i.key !== it.key))} className="text-gray-400 hover:text-red-600 cursor-pointer" aria-label="Remove line"><Trash2 size={14} /></button>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <datalist id="sales-service-names">{services.map(s => <option key={s.id} value={s.name} />)}</datalist>
      </div>
    </div>
  );
}

/** Sub-total, discount, GST split and total; extra rows (paid / balance) go in children. */
export function TotalsCard({ t, gstMode, children, sticky = true }) {
  return (
    <div className={`bg-white border border-gray-200 rounded p-4 ${sticky ? 'xl:sticky xl:top-4' : ''}`}>
      <div className="text-xs font-semibold text-gray-700 mb-2">Totals</div>
      <dl className="text-[13px] space-y-1.5">
        <div className="flex justify-between"><dt className="text-gray-500">Sub-total</dt><dd className="tabular-nums">{money2(t.gross)}</dd></div>
        {t.discount > 0 && <div className="flex justify-between"><dt className="text-gray-500">Discount ({t.discountPct}%)</dt><dd className="tabular-nums text-red-700">− {money2(t.discount)}</dd></div>}
        <div className="flex justify-between"><dt className="text-gray-500">Taxable value</dt><dd className="tabular-nums">{money2(t.taxable)}</dd></div>
        {gstMode === 'inter' ? <div className="flex justify-between"><dt className="text-gray-500">IGST</dt><dd className="tabular-nums">{money2(t.igst)}</dd></div>
          : <><div className="flex justify-between"><dt className="text-gray-500">CGST</dt><dd className="tabular-nums">{money2(t.cgst)}</dd></div><div className="flex justify-between"><dt className="text-gray-500">SGST</dt><dd className="tabular-nums">{money2(t.sgst)}</dd></div></>}
        <div className="flex justify-between pt-2 mt-1 border-t border-gray-200 text-[15px] font-semibold"><dt>Total</dt><dd className="tabular-nums">{money2(t.total)}</dd></div>
      </dl>
      {children}
    </div>
  );
}

/** Bill-to fields (client name, contact, email, phone, address, GSTIN, state). */
export function ClientFields({ client, onChange, editable, companyState, onGstMode, withContact = true }) {
  const fields = [['name', 'Client / company'], ...(withContact ? [['contact', 'Contact person']] : []), ['email', 'Email'], ['phone', 'Phone'], ['address', 'Address'], ['gstin', 'GSTIN'], ['state', 'State']];
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-gray-700">Bill to</div>
      {fields.map(([k, l]) => (
        <div key={k} className="grid grid-cols-[110px_1fr] items-center gap-2">
          <label className="text-[12px] text-gray-500">{l}</label>
          <input disabled={!editable} value={client[k] || ''} onChange={e => {
            const v = k === 'gstin' ? e.target.value.toUpperCase() : e.target.value;
            onChange({ ...client, [k]: v });
            if (k === 'state' && companyState && onGstMode) onGstMode(v.trim() && v.trim().toLowerCase() !== companyState.toLowerCase() ? 'inter' : 'intra');
          }} className={`${inputCls} disabled:bg-gray-50`} />
        </div>
      ))}
    </div>
  );
}

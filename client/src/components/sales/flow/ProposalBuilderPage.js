import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Loader2, Save, Eye, Download, Mail, MessageCircle, CheckCircle2, XCircle, Trash2, Plus, FileText, ChevronDown, ChevronRight, SendHorizontal, Receipt
} from 'lucide-react';
import { api, useSalesBase, useSalesMeta, money, money2, fmtWhen, Badge, Modal, ReasonModal, inputCls, labelCls, btn, ErrorNote } from './salesShared';
import { proposalApi, proposalPdfUrl, Loading, Card, PROPOSAL_STATUS_STYLE } from './deskShared';
import { findService, slabRate, slabText } from './LineItems';

/**
 * Proposal builder: every slide of the deck is edited here per client, then previewed as the PDF.
 * Left: the slides' content. Right: status, actions (email, client's answer, create the quotation).
 */

const area = 'w-full text-[13px] border border-gray-300 rounded p-2.5 outline-none focus:border-blue-500 disabled:bg-gray-50';
const asText = (v) => (Array.isArray(v) ? v.join('\n') : (v || ''));

/** One point per line, stored as an array. */
const Lines = ({ value, onChange, rows = 4, placeholder = 'One point per line', disabled }) => (
  <textarea disabled={disabled} value={asText(value)} onChange={e => onChange(e.target.value.split('\n'))} rows={rows} placeholder={placeholder} className={area} />
);

function Slide({ title, hint, on, onToggle, children, defaultOpen = false, canEdit }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`bg-white border rounded-lg ${on === false ? 'border-gray-200 opacity-70' : 'border-gray-200'}`}>
      <div className="px-4 py-3 flex items-center gap-2">
        <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1.5 text-[13px] font-semibold cursor-pointer text-left flex-1 min-w-0">{open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}<span className="truncate">{title}</span>{hint && <span className="text-[11.5px] text-gray-500 font-normal truncate">· {hint}</span>}</button>
        {onToggle && <label className="text-[11.5px] text-gray-600 inline-flex items-center gap-1.5 cursor-pointer shrink-0"><input type="checkbox" disabled={!canEdit} checked={on !== false} onChange={e => onToggle(e.target.checked)} /> In the deck</label>}
      </div>
      {open && <div className="px-4 pb-4 pt-1 border-t border-gray-100 space-y-3">{children}</div>}
    </div>
  );
}

function GroupsEditor({ groups, onChange, services, disabled }) {
  const set = (i, patch) => onChange(groups.map((g, j) => (j === i ? { ...g, ...patch } : g)));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-700">Headings and their points</span>
        {!disabled && <div className="flex gap-1.5">
          <select value="" onChange={e => { const sv = services.find(x => x.id === e.target.value); if (sv) onChange([...groups, { title: sv.name, items: [...sv.scope] }]); }} className="h-7 text-[11.5px] border border-gray-300 rounded px-1.5 bg-white max-w-[190px]"><option value="">+ From a service…</option>{services.map(sv => <option key={sv.id} value={sv.id}>{sv.name}</option>)}</select>
          <button onClick={() => onChange([...groups, { title: '', items: [''] }])} className="h-7 px-2 text-[11.5px] border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-pointer inline-flex items-center gap-1"><Plus size={11} /> Heading</button>
        </div>}
      </div>
      <div className="grid md:grid-cols-2 gap-2">
        {groups.map((g, i) => (
          <div key={i} className="border border-gray-200 rounded-lg p-2 bg-gray-50/50">
            <div className="flex items-center gap-1.5 mb-1.5"><input disabled={disabled} value={g.title} onChange={e => set(i, { title: e.target.value })} placeholder="Heading, e.g. Sales & CRM Module" className={`${inputCls} font-medium`} />
              {!disabled && <button onClick={() => onChange(groups.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-600 cursor-pointer" aria-label="Remove heading"><Trash2 size={14} /></button>}</div>
            <Lines disabled={disabled} value={g.items} onChange={(items) => set(i, { items })} rows={5} />
          </div>
        ))}
        {!groups.length && <div className="text-[12px] text-gray-500 md:col-span-2">No headings. Add the modules or features this option includes.</div>}
      </div>
    </div>
  );
}

function OptionCard({ option, onChange, onRemove, services, disabled }) {
  const set = (patch) => onChange({ ...option, ...patch });
  const lines = option.lines || [];
  const setLine = (i, patch) => set({ lines: lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) });
  const changeQty = (i, v) => {
    const l = lines[i]; const sv = l.autoRate === false ? null : findService(services, l.name);
    setLine(i, { qty: v, ...(sv && sv.slabs?.length && v !== '' ? { rate: slabRate(sv, v), autoRate: true } : {}) });
  };
  const lineAmt = (l) => (Number(l.qty) || 0) * (Number(l.rate) || 0) * (1 - (Number(l.discountPct) || 0) / 100);
  const base = option.priceMode === 'lines' && lines.length ? lines.reduce((s, l) => s + lineAmt(l), 0) : Number(option.price) || 0;
  const gst = (base * (Number(option.gstPct) || 0)) / 100;
  const monthly = option.billing === 'monthly';
  return (
    <div className="border border-blue-200 rounded-lg bg-blue-50/20 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <span className="w-7 h-7 rounded bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">{option.key}</span>
        <input disabled={disabled} value={option.name} onChange={e => set({ name: e.target.value })} placeholder="e.g. Partial Modules (Option A) or Growth Plan" className={`${inputCls} font-semibold`} />
        {!disabled && <button onClick={onRemove} className="text-gray-400 hover:text-red-600 cursor-pointer" aria-label="Remove option"><Trash2 size={15} /></button>}
      </div>
      <textarea disabled={disabled} value={option.intro || ''} onChange={e => set({ intro: e.target.value })} rows={2} placeholder="Line under the heading (optional), e.g. what this option adds to the previous one" className={area} />

      <div className="grid md:grid-cols-4 gap-3">
        <div><label className={labelCls}>Billing</label><select disabled={disabled} value={option.billing} onChange={e => set({ billing: e.target.value })} className={inputCls}><option value="one-time">One-time project</option><option value="monthly">Monthly (retainer)</option></select></div>
        <div><label className={labelCls}>Price from</label><select disabled={disabled} value={option.priceMode} onChange={e => set({ priceMode: e.target.value })} className={inputCls}><option value="lines">Quantities × rates</option><option value="fixed">One fixed price</option></select></div>
        <div><label className={labelCls}>GST %</label><input disabled={disabled} value={option.gstPct} onChange={e => set({ gstPct: e.target.value.replace(/[^\d.]/g, '') })} className={inputCls} /></div>
        {monthly ? <div className="grid grid-cols-2 gap-2"><div><label className={labelCls}>Months</label><input disabled={disabled} value={option.months || ''} onChange={e => set({ months: e.target.value.replace(/\D/g, '') })} className={inputCls} /></div><div><label className={labelCls}>From</label><input type="month" disabled={disabled} value={option.startMonth || ''} onChange={e => set({ startMonth: e.target.value })} className={inputCls} /></div></div>
          : <div><label className={labelCls}>Deadline</label><input disabled={disabled} value={option.deadline || ''} onChange={e => set({ deadline: e.target.value })} placeholder="15th January 2027" className={inputCls} /></div>}
      </div>

      {option.priceMode === 'fixed' ? (
        <div className="max-w-xs"><label className={labelCls}>Price {monthly ? 'per month' : ''} before GST (₹)</label><input disabled={disabled} value={option.price || ''} onChange={e => set({ price: e.target.value.replace(/[^\d.]/g, '') })} className={inputCls} /></div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-gray-700">What is delivered{monthly ? ' every month' : ''}, and the price</span>
            {!disabled && <select value="" onChange={e => { const sv = services.find(x => x.id === e.target.value); if (sv) set({ lines: [...lines, { name: sv.name, unit: sv.unit, qty: sv.defaultQty || 1, rate: slabRate(sv, sv.defaultQty || 1), discountPct: 0, autoRate: true }] }); }} className="h-7 text-[11.5px] border border-gray-300 rounded px-1.5 bg-white max-w-[230px]"><option value="">+ Add a service…</option>{services.map(sv => <option key={sv.id} value={sv.id}>{sv.category} · {sv.name}</option>)}</select>}
          </div>
          <table className="w-full text-[12.5px]">
            <thead className="text-[11px] text-gray-500 bg-gray-50"><tr><th className="text-left font-medium px-2 py-1.5">Service</th><th className="w-16 text-right font-medium px-1">Qty</th><th className="w-20 text-left font-medium px-1">Unit</th><th className="w-24 text-right font-medium px-1">Rate ₹</th><th className="w-14 text-right font-medium px-1">Disc %</th><th className="w-24 text-right font-medium px-2">Amount</th><th className="w-7" /></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {lines.map((l, i) => {
                const sv = findService(services, l.name); const slabs = sv?.slabs?.length > 1 ? slabText(sv) : '';
                return (
                  <tr key={i} className="align-top">
                    <td className="px-2 py-1"><input disabled={disabled} value={l.name} onChange={e => setLine(i, { name: e.target.value, autoRate: true })} list="proposal-service-names" className={`${inputCls} h-8`} />{!disabled && slabs && <div className="text-[10.5px] text-gray-500 mt-0.5 leading-snug">Volume rate per {sv.unit}: {slabs}</div>}</td>
                    <td className="px-1 py-1"><input disabled={disabled} value={l.qty} onChange={e => changeQty(i, e.target.value.replace(/[^\d.]/g, ''))} className={`${inputCls} h-8 text-right px-1.5`} /></td>
                    <td className="px-1 py-1"><input disabled={disabled} value={l.unit} onChange={e => setLine(i, { unit: e.target.value })} className={`${inputCls} h-8 px-1.5`} /></td>
                    <td className="px-1 py-1"><input disabled={disabled} value={l.rate} onChange={e => setLine(i, { rate: e.target.value.replace(/[^\d.]/g, ''), autoRate: false })} className={`${inputCls} h-8 text-right px-1.5`} /></td>
                    <td className="px-1 py-1"><input disabled={disabled} value={l.discountPct || 0} onChange={e => setLine(i, { discountPct: e.target.value.replace(/[^\d.]/g, '') })} className={`${inputCls} h-8 text-right px-1.5`} /></td>
                    <td className="px-2 py-1 text-right tabular-nums pt-2.5">{money2(lineAmt(l))}</td>
                    <td className="py-1 pt-2.5">{!disabled && <button onClick={() => set({ lines: lines.filter((_, j) => j !== i) })} className="text-gray-400 hover:text-red-600 cursor-pointer" aria-label="Remove line"><Trash2 size={13} /></button>}</td>
                  </tr>
                );
              })}
              {!lines.length && <tr><td colSpan={7} className="text-center text-[12px] text-gray-500 py-3">Add services with their quantity. The rate follows the volume rates in Sales Settings.</td></tr>}
            </tbody>
          </table>
          <datalist id="proposal-service-names">{services.map(s => <option key={s.id} value={s.name} />)}</datalist>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[12.5px] bg-white border border-gray-200 rounded-lg px-3 py-2">
        <span className="text-gray-600">Before GST <b className="text-gray-900 tabular-nums">{money2(base)}</b> · GST {option.gstPct}% <span className="tabular-nums">{money2(gst)}</span></span>
        <span className="font-semibold">Total {monthly ? 'per month ' : ''}<span className="tabular-nums">{money2(base + gst)}</span>{monthly && Number(option.months) > 0 && <span className="text-gray-500 font-normal"> · {option.months} months = {money(Math.round((base + gst) * option.months))}</span>}</span>
      </div>
      {option.priceMode === 'lines' && <label className="text-[12px] text-gray-700 inline-flex items-center gap-1.5 cursor-pointer"><input type="checkbox" disabled={disabled} checked={option.showScope !== false} onChange={e => set({ showScope: e.target.checked })} /> Print the scope of work of each service on the option page</label>}
      <GroupsEditor groups={option.groups || []} onChange={(groups) => set({ groups })} services={services} disabled={disabled} />
    </div>
  );
}


/* ═══ Digital marketing proposal (priced service pages, roles, plan of action) ═══ */
const variantBase = (v) => (v.priceMode === 'lines' && (v.rows || []).some(r => Number(r.qty) && Number(r.rate)) ? (v.rows || []).reduce((t, r) => t + (Number(r.qty) || 0) * (Number(r.rate) || 0), 0) : Number(v.price) || 0);

function MkGroups({ groups, onChange, services, disabled }) {
  const set = (i, patch) => onChange(groups.map((g, j) => (j === i ? { ...g, ...patch } : g)));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-700">What is delivered (printed in two columns under the table)</span>
        {!disabled && <div className="flex gap-1.5">
          <select value="" onChange={e => { const sv = services.find(x => x.id === e.target.value); if (sv) onChange([...groups, { title: sv.name, text: '', items: [...sv.scope] }]); }} className="h-7 text-[11.5px] border border-gray-300 rounded px-1.5 bg-white max-w-[190px]"><option value="">+ From a service…</option>{services.map(sv => <option key={sv.id} value={sv.id}>{sv.name}</option>)}</select>
          <button onClick={() => onChange([...groups, { title: '', text: '', items: [] }])} className="h-7 px-2 text-[11.5px] border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-pointer inline-flex items-center gap-1"><Plus size={11} /> Heading</button>
        </div>}
      </div>
      <div className="grid md:grid-cols-2 gap-2">
        {groups.map((g, i) => (
          <div key={i} className="border border-gray-200 rounded-lg p-2 bg-gray-50/50 space-y-1.5">
            <div className="flex items-center gap-1.5"><input disabled={disabled} value={g.title} onChange={e => set(i, { title: e.target.value })} placeholder="Heading, e.g. On-Page SEO" className={`${inputCls} font-medium`} />{!disabled && <button onClick={() => onChange(groups.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-600 cursor-pointer" aria-label="Remove heading"><Trash2 size={14} /></button>}</div>
            <textarea disabled={disabled} value={g.text || ''} onChange={e => set(i, { text: e.target.value })} rows={2} placeholder="A short paragraph (optional)" className={area} />
            <Lines disabled={disabled} value={g.items} onChange={(items) => set(i, { items })} rows={5} placeholder="Points, one per line. Start a line with “- ” for a sub-point." />
          </div>
        ))}
      </div>
    </div>
  );
}

function MkVariant({ v, onChange, onRemove, canRemove, services, disabled }) {
  const set = (patch) => onChange({ ...v, ...patch });
  const rows = v.rows || [];
  const setRow = (i, patch) => set({ rows: rows.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  const lines = v.priceMode === 'lines';
  const changeQty = (i, val) => {
    const r = rows[i]; const sv = r.autoRate === false ? null : findService(services, r.description);
    setRow(i, { qty: val, activities: String(val), ...(sv && sv.slabs?.length && val !== '' ? { rate: slabRate(sv, val), autoRate: true } : {}) });
  };
  const base = variantBase(v);
  return (
    <div className="border border-blue-200 rounded-lg bg-blue-50/20 p-3 space-y-2.5">
      <div className="grid md:grid-cols-[1fr_130px_150px_auto] gap-2 items-end">
        <div><label className={labelCls}>Name of this price (optional)</label><input disabled={disabled} value={v.label || ''} onChange={e => set({ label: e.target.value })} placeholder="e.g. Basic" className={inputCls} /></div>
        <div><label className={labelCls}>Price from</label><select disabled={disabled} value={v.priceMode} onChange={e => set({ priceMode: e.target.value })} className={inputCls}><option value="fixed">Typed price</option><option value="lines">Quantity × rate</option></select></div>
        <div><label className={labelCls}>Price per month (₹)</label><input disabled={disabled || lines} value={lines ? Math.round(base) : (v.price || '')} onChange={e => set({ price: e.target.value.replace(/[^\d.]/g, '') })} className={`${inputCls} disabled:bg-gray-100`} /></div>
        <div><label className={labelCls}>Shown as</label><input disabled={disabled} value={v.priceLabel || ''} onChange={e => set({ priceLabel: e.target.value })} placeholder="Per Month" className={`${inputCls} w-28`} /></div>
      </div>
      <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
        <table className="w-full text-[12.5px] min-w-[620px]">
          <thead className="text-[11px] text-gray-500 bg-gray-50"><tr><th className="text-left font-medium px-2 py-1.5">Description</th><th className="text-left font-medium px-1 w-44">Activities</th><th className="text-left font-medium px-1 w-52">Platform</th>{lines && <><th className="text-right font-medium px-1 w-14">Qty</th><th className="text-right font-medium px-1 w-20">Rate ₹</th></>}<th className="w-7" /></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r, i) => {
              const sv = findService(services, r.description); const slabs = lines && sv?.slabs?.length > 1 ? slabText(sv) : '';
              return (
                <tr key={i} className="align-top">
                  <td className="px-2 py-1"><input disabled={disabled} value={r.description} onChange={e => setRow(i, { description: e.target.value, autoRate: true })} list="mk-service-names" className={`${inputCls} h-8`} />{!disabled && slabs && <div className="text-[10.5px] text-gray-500 mt-0.5 leading-snug">Volume rate per {sv.unit}: {slabs}</div>}</td>
                  <td className="px-1 py-1"><input disabled={disabled} value={r.activities} onChange={e => setRow(i, { activities: e.target.value })} className={`${inputCls} h-8`} /></td>
                  <td className="px-1 py-1"><input disabled={disabled} value={r.platform} onChange={e => setRow(i, { platform: e.target.value })} className={`${inputCls} h-8`} /></td>
                  {lines && <><td className="px-1 py-1"><input disabled={disabled} value={r.qty || ''} onChange={e => changeQty(i, e.target.value.replace(/[^\d.]/g, ''))} className={`${inputCls} h-8 text-right px-1.5`} /></td><td className="px-1 py-1"><input disabled={disabled} value={r.rate || ''} onChange={e => setRow(i, { rate: e.target.value.replace(/[^\d.]/g, ''), autoRate: false })} className={`${inputCls} h-8 text-right px-1.5`} /></td></>}
                  <td className="py-1 pt-2">{!disabled && <button onClick={() => set({ rows: rows.filter((_, j) => j !== i) })} className="text-gray-400 hover:text-red-600 cursor-pointer" aria-label="Remove row"><Trash2 size={13} /></button>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <datalist id="mk-service-names">{services.map(sv => <option key={sv.id} value={sv.name} />)}</datalist>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {!disabled && <button onClick={() => set({ rows: [...rows, { description: '', activities: '', platform: '', qty: 0, rate: 0 }] })} className="h-7 px-2 text-[11.5px] border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-pointer inline-flex items-center gap-1"><Plus size={11} /> Row</button>}
        <span className="text-[12px] text-gray-600">{base > 0 ? `${money2(base)} per month before GST` : 'No price set'}</span>
        {!disabled && canRemove && <button onClick={onRemove} className="ml-auto text-[11.5px] text-red-600 hover:underline cursor-pointer">Remove this price</button>}
      </div>
      <div><label className={labelCls}>Note under the table (optional)</label><input disabled={disabled} value={v.note || ''} onChange={e => set({ note: e.target.value })} className={inputCls} /></div>
    </div>
  );
}

function MkBlock({ block, onChange, onRemove, onMove, services, disabled }) {
  const set = (patch) => onChange({ ...block, ...patch });
  const paid = block.type === 'paid';
  return (
    <div className="border border-gray-300 rounded-lg p-3 space-y-3 bg-white">
      <div className="flex items-center gap-2">
        <span className={`text-[10.5px] font-semibold px-1.5 py-0.5 rounded ${paid ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'}`}>{paid ? 'PAID CAMPAIGN PAGE' : 'SERVICE PAGE'}</span>
        <input disabled={disabled} value={block.title} onChange={e => set({ title: e.target.value })} placeholder={paid ? 'Paid Campaign:' : 'e.g. SEO, GEO & GMB Optimization'} className={`${inputCls} font-semibold`} />
        {!disabled && <><button onClick={() => onMove(-1)} className="text-gray-400 hover:text-gray-800 cursor-pointer text-xs" aria-label="Move up">▲</button><button onClick={() => onMove(1)} className="text-gray-400 hover:text-gray-800 cursor-pointer text-xs" aria-label="Move down">▼</button><button onClick={onRemove} className="text-gray-400 hover:text-red-600 cursor-pointer" aria-label="Remove page"><Trash2 size={15} /></button></>}
      </div>
      {paid ? (
        <div className="grid md:grid-cols-2 gap-3">
          <div><label className={labelCls}>Platforms (one per line)</label><Lines disabled={disabled} value={block.platforms} onChange={(platforms) => set({ platforms })} rows={5} /></div>
          <div className="space-y-3"><div><label className={labelCls}>Fee line</label><input disabled={disabled} value={block.fee || ''} onChange={e => set({ fee: e.target.value })} placeholder="Professional Fees: 25% of Total Ads Budget" className={inputCls} /></div>
            <div><label className={labelCls}>Note</label><textarea disabled={disabled} value={block.note || ''} onChange={e => set({ note: e.target.value })} rows={3} className={area} /></div></div>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {(block.variants || []).map((v, i) => (
              <React.Fragment key={i}>
                {i > 0 && <div className="text-center text-[12px] font-bold text-red-600">OR</div>}
                <MkVariant v={v} services={services} disabled={disabled} canRemove={block.variants.length > 1} onChange={(n) => set({ variants: block.variants.map((x, j) => (j === i ? n : x)) })} onRemove={() => set({ variants: block.variants.filter((_, j) => j !== i) })} />
              </React.Fragment>
            ))}
            {!disabled && (block.variants || []).length < 4 && <button onClick={() => set({ variants: [...(block.variants || []), { label: '', price: 0, priceLabel: 'Per Month', priceMode: 'fixed', note: '', rows: [{ description: '', activities: '', platform: '', qty: 0, rate: 0 }] }] })} className={btn.ghost}><Plus size={13} /> Add an alternative price (shown after “OR”)</button>}
          </div>
          <MkGroups groups={block.groups || []} onChange={(groups) => set({ groups })} services={services} disabled={disabled} />
          <div><label className={labelCls}>Note at the bottom of the page (optional)</label><input disabled={disabled} value={block.note || ''} onChange={e => set({ note: e.target.value })} className={inputCls} /></div>
        </>
      )}
    </div>
  );
}

function MarketingSlides({ c, edit, disabled, services }) {
  const editIn = (key, patch) => edit({ [key]: { ...c[key], ...patch } });
  const toggle = (k) => (v) => edit({ sections: { ...c.sections, [k]: v } });
  const blocks = c.blocks || [];
  const setBlock = (i, n) => edit({ blocks: blocks.map((b, j) => (j === i ? n : b)) });
  const move = (i, d) => { const j = i + d; if (j < 0 || j >= blocks.length) return; const nb = [...blocks]; [nb[i], nb[j]] = [nb[j], nb[i]]; edit({ blocks: nb }); };
  return (
    <>
      <Slide title="Cover" hint={`${c.cover.title || ''} · ${c.cover.preparedFor || ''}`} defaultOpen canEdit={!disabled}>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="md:col-span-2"><label className={labelCls}>Heading</label><input disabled={disabled} value={c.cover.title || ''} onChange={e => editIn('cover', { title: e.target.value })} className={inputCls} /></div>
          <div><label className={labelCls}>Prepared for</label><input disabled={disabled} value={c.cover.preparedFor || ''} onChange={e => editIn('cover', { preparedFor: e.target.value })} className={inputCls} /></div>
          <div><label className={labelCls}>Date on the cover (optional)</label><input type="date" disabled={disabled} value={c.cover.date || ''} onChange={e => editIn('cover', { date: e.target.value })} className={inputCls} /></div>
        </div>
      </Slide>
      <Slide title="About and our clients" on={c.sections.about} onToggle={toggle('about')} canEdit={!disabled}>
        <div className="grid md:grid-cols-2 gap-3"><div><label className={labelCls}>Second heading (in red)</label><input disabled={disabled} value={c.about.heading || ''} onChange={e => editIn('about', { heading: e.target.value })} className={inputCls} /></div></div>
        <div><label className={labelCls}>Text</label><textarea disabled={disabled} value={c.about.text || ''} onChange={e => editIn('about', { text: e.target.value })} rows={5} placeholder="Leave empty to use the standard text (Sales Settings → Proposal deck). Mention the client's industry here if you like." className={area} /></div>
        <div><label className={labelCls}>Our clients (one name per line)</label><Lines disabled={disabled} value={c.about.clients} onChange={(clients) => editIn('about', { clients })} rows={5} placeholder="Leave empty to use the clients listed in Sales Settings" /></div>
      </Slide>
      <Slide title={c.agenda.title || 'Agenda'} hint="what this proposal is about" on={c.sections.agenda} onToggle={toggle('agenda')} canEdit={!disabled}>
        <div><label className={labelCls}>Heading</label><input disabled={disabled} value={c.agenda.title || ''} onChange={e => editIn('agenda', { title: e.target.value })} className={inputCls} /></div>
        <div><label className={labelCls}>Text (leave a blank line between paragraphs)</label><textarea disabled={disabled} value={c.agenda.text || ''} onChange={e => editIn('agenda', { text: e.target.value })} rows={9} className={area} /></div>
      </Slide>
      <Slide title={`Services and prices (${blocks.length} pages)`} hint="one framed page each" on={c.sections.services} onToggle={toggle('services')} canEdit={!disabled} defaultOpen>
        <p className="text-[12px] text-gray-600">Each service page has its price, a table of what is delivered, the full list of work, and an optional note. A page can show two prices with “OR” between them. Price from “Quantity × rate” uses the volume rates in Sales Settings (for example 20 keywords, 8 reels, 12 creatives).</p>
        {blocks.map((b, i) => <MkBlock key={i} block={b} services={services} disabled={disabled} onChange={(n) => setBlock(i, n)} onRemove={() => edit({ blocks: blocks.filter((_, j) => j !== i) })} onMove={(d) => move(i, d)} />)}
        {!disabled && blocks.length < 10 && <div className="flex flex-wrap gap-2">
          <button onClick={() => edit({ blocks: [...blocks, { type: 'service', title: '', note: '', variants: [{ label: '', price: 0, priceLabel: 'Per Month', priceMode: 'fixed', note: '', rows: [{ description: '', activities: '', platform: '', qty: 0, rate: 0 }] }], groups: [], platforms: [], fee: '' }] })} className={btn.ghost}><Plus size={13} /> Add a service page</button>
          <button onClick={() => edit({ blocks: [...blocks, { type: 'paid', title: 'Paid Campaign:', note: 'Above cost is only professional fees paid to the Agency. Your Ads budget will be extra based on your requirement.', variants: [], groups: [], platforms: ['Google (Search & Display)', 'Facebook', 'Instagram', 'Linkedin'], fee: 'Professional Fees: 25% of Total Ads Budget' }] })} className={btn.ghost}><Plus size={13} /> Add a paid campaign page</button>
        </div>}
      </Slide>
      <Slide title="Roles and responsibility" on={c.sections.roles} onToggle={toggle('roles')} canEdit={!disabled}>
        <div className="grid md:grid-cols-2 gap-3">
          <div><label className={labelCls}>Agency heading</label><input disabled={disabled} value={c.roles.agencyTitle || ''} onChange={e => editIn('roles', { agencyTitle: e.target.value })} className={inputCls} /><div className="mt-2"><Lines disabled={disabled} value={c.roles.agency} onChange={(agency) => editIn('roles', { agency })} rows={9} /></div></div>
          <div><label className={labelCls}>Client heading</label><input disabled={disabled} value={c.roles.clientTitle || ''} onChange={e => editIn('roles', { clientTitle: e.target.value })} className={inputCls} /><div className="mt-2"><Lines disabled={disabled} value={c.roles.client} onChange={(client) => editIn('roles', { client })} rows={9} /></div></div>
        </div>
      </Slide>
      <Slide title="Plan of action and commitments" on={c.sections.plan} onToggle={toggle('plan')} canEdit={!disabled}>
        <div className="flex items-center justify-between"><label className="text-xs font-semibold text-gray-700">Month by month</label>{!disabled && <button onClick={() => editIn('plan', { rows: [...c.plan.rows, { month: `Month ${c.plan.rows.length + 1}`, focus: '', deliverables: '' }] })} className="text-[11.5px] text-blue-700 hover:underline cursor-pointer inline-flex items-center gap-0.5"><Plus size={11} /> Add a month</button>}</div>
        {c.plan.rows.map((r, i) => (
          <div key={i} className="grid md:grid-cols-[110px_190px_1fr_26px] gap-2 items-start">
            <input disabled={disabled} value={r.month} onChange={e => editIn('plan', { rows: c.plan.rows.map((x, j) => (j === i ? { ...x, month: e.target.value } : x)) })} className={inputCls} placeholder="Month 1" />
            <input disabled={disabled} value={r.focus} onChange={e => editIn('plan', { rows: c.plan.rows.map((x, j) => (j === i ? { ...x, focus: e.target.value } : x)) })} className={inputCls} placeholder="Focus" />
            <textarea disabled={disabled} value={r.deliverables} onChange={e => editIn('plan', { rows: c.plan.rows.map((x, j) => (j === i ? { ...x, deliverables: e.target.value } : x)) })} rows={3} className={area} placeholder="Deliverables" />
            {!disabled && <button onClick={() => editIn('plan', { rows: c.plan.rows.filter((_, j) => j !== i) })} className="text-gray-400 hover:text-red-600 cursor-pointer mt-2" aria-label="Remove month"><Trash2 size={14} /></button>}
          </div>
        ))}
        <div><label className={labelCls}>Commitments</label><Lines disabled={disabled} value={c.plan.commitments} onChange={(commitments) => editIn('plan', { commitments })} rows={5} /></div>
      </Slide>
      <Slide title="Wrap up" hint="terms and the Thank You page" on={c.sections.wrapup} onToggle={toggle('wrapup')} canEdit={!disabled}>
        <div><label className={labelCls}>Points (start a line with “- ” for a sub-point)</label><Lines disabled={disabled} value={c.wrapup.points} onChange={(points) => editIn('wrapup', { points })} rows={8} /></div>
        <div className="max-w-[160px]"><label className={labelCls}>GST % (used for prices and the quotation)</label><input disabled={disabled} value={c.gstPct ?? 18} onChange={e => edit({ gstPct: e.target.value.replace(/[^\d.]/g, '') })} className={inputCls} /></div>
      </Slide>
      <Slide title="Contact details on the last page" hint="empty = from Sales Settings" canEdit={!disabled}>
        <div className="grid md:grid-cols-2 gap-3">
          {[['name', 'Company name'], ['phones', 'Phone'], ['email', 'Email'], ['website', 'Website']].map(([k, l]) => <div key={k}><label className={labelCls}>{l}</label><input disabled={disabled} value={c.contact?.[k] || ''} onChange={e => editIn('contact', { [k]: e.target.value })} className={inputCls} /></div>)}
          <div className="md:col-span-2"><label className={labelCls}>Address</label><input disabled={disabled} value={c.contact?.address || ''} onChange={e => editIn('contact', { address: e.target.value })} className={inputCls} /></div>
        </div>
      </Slide>
    </>
  );
}

export default function ProposalBuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const base = useSalesBase();
  const meta = useSalesMeta();
  const [data, setData] = useState(null);
  const [c, setC] = useState(null);
  const [title, setTitle] = useState('');
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try { const d = await proposalApi(`/${id}`); setData(d); setC(d.proposal.content); setTitle(d.proposal.title || ''); setDirty(false); setError(''); } catch (e) { setError(e.message); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const services = useMemo(() => meta?.services || [], [meta]);
  const p = data?.proposal;
  const locked = p && p.status === 'Accepted';
  const edit = (patch) => { setC(x => ({ ...x, ...patch })); setDirty(true); };
  const editIn = (key, patch) => edit({ [key]: { ...c[key], ...patch } });
  const toggle = (k) => (v) => edit({ sections: { ...c.sections, [k]: v } });

  const save = async () => {
    setBusy('save'); setError('');
    try { await proposalApi(`/${id}`, { method: 'PUT', body: { title, content: c } }); setDirty(false); setNotice('Saved'); setTimeout(() => setNotice(''), 1800); return true; } catch (e) { setError(e.message); return false; } finally { setBusy(''); }
  };
  const ensureSaved = async () => (dirty ? save() : true);
  const preview = async (download) => { if (await ensureSaved()) window.open(`${proposalPdfUrl(id, download)}${download ? '&' : '?'}t=${Date.now()}`, '_blank', 'noopener'); };
  const act = async (name, fn) => { setBusy(name); setError(''); try { await fn(); await load(); } catch (e) { setError(e.message); } finally { setBusy(''); } };

  // The chosen option becomes a quotation: GST lines, milestones or monthly billing, scope of work.
  const createQuotation = async (opt) => {
    if (!p.dealId) { setError('This proposal is not linked to a deal.'); return; }
    await act('quote', async () => {
      if (!(await ensureSaved())) throw new Error('Could not save the proposal first.');
      const tax = Number(opt.gstPct) || meta.quotation.defaultTaxPct;
      const monthly = opt.billing === 'monthly';
      const items = opt.priceMode === 'lines' && (opt.lines || []).length
        ? opt.lines.filter(l => Number(l.qty) > 0).map(l => ({ name: l.name, unit: l.unit, hsn: findService(services, l.name)?.hsn || '998361', qty: Number(l.qty), rate: Number(l.rate), discountPct: Number(l.discountPct) || 0, taxPct: tax }))
        : [{ name: opt.name, description: title || p.title, hsn: '998314', unit: '', qty: 1, rate: Number(opt.price) || 0, discountPct: 0, taxPct: tax }];
      const now = new Date(); const nm = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const sections = (opt.groups || []).filter(g => g.title && (g.items || []).some(Boolean)).slice(0, 18).map(g => ({ title: `Scope: ${g.title}`, items: g.items.filter(Boolean).slice(0, 60) }));
      const plan = monthly
        ? { months: Number(opt.months) || 6, startMonth: opt.startMonth || `${nm.getFullYear()}-${String(nm.getMonth() + 1).padStart(2, '0')}`, adSpendNote: 'Ad spend on Google, Meta and other platforms is paid by the client directly to the platform.', sections }
        : { timeline: opt.deadline || '', milestones: (c.payment?.milestones || []).filter(m => m.name && Number(m.pct) > 0), sections };
      const r = await api(`/deals/${p.dealId}/quotations`, { method: 'POST', body: { subject: `${title || p.title} · ${opt.name}`, quoteType: monthly ? 'retainer' : 'project', plan, items } });
      await proposalApi(`/${id}/link`, { method: 'POST', body: { quotationId: r.id, option: opt.key } });
      navigate(`${base}/quotation/${r.id}`);
    });
  };

  const createQuotationMk = async () => {
    if (!p.dealId) { setError('This proposal is not linked to a deal.'); return; }
    await act('quote', async () => {
      if (!(await ensureSaved())) throw new Error('Could not save the proposal first.');
      const tax = Number(c.gstPct) || meta.quotation.defaultTaxPct;
      const items = (c.chosen || []).map(key => {
        const [, bi, vi] = key.match(/^b(\d+)v(\d+)$/) || []; const b = c.blocks[Number(bi)]; const v = b?.variants?.[Number(vi)];
        if (!v) return null;
        return { name: `${b.title}${v.label ? ` (${v.label})` : ''}`, description: (v.rows || []).map(r => `${r.description}: ${r.activities}${r.platform ? ` (${r.platform})` : ''}`).join('\n'), hsn: '998361', unit: 'month', qty: 1, rate: Math.round(variantBase(v) * 100) / 100, discountPct: 0, taxPct: tax };
      }).filter(Boolean);
      if (!items.length) throw new Error('No service was chosen.');
      const paid = (c.blocks || []).find(b => b.type === 'paid');
      const now = new Date(); const nm = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const sections = (c.blocks || []).filter(b => b.type === 'service').flatMap(b => (b.groups || []).map(g => ({ title: `${b.title}: ${g.title}`, items: [g.text, ...(g.items || [])].filter(Boolean).slice(0, 60) }))).filter(g => g.items.length).slice(0, 18);
      const plan = { months: 6, startMonth: `${nm.getFullYear()}-${String(nm.getMonth() + 1).padStart(2, '0')}`, adSpendNote: paid ? [paid.fee, paid.note].filter(Boolean).join('. ') : '', sections };
      const r = await api(`/deals/${p.dealId}/quotations`, { method: 'POST', body: { subject: title || p.title, quoteType: 'retainer', plan, items } });
      await proposalApi(`/${id}/link`, { method: 'POST', body: { quotationId: r.id, option: 'Selected' } });
      navigate(`${base}/quotation/${r.id}`);
    });
  };

  if (!c || !p || !meta) return <Loading error={error} />;
  const disabled = !!locked;
  const optionsTotals = p.options;
  const sendable = ['Draft', 'Sent'].includes(p.status);

  return (
    <div className="p-5 bg-[#F8FAFC] min-h-screen font-sans text-gray-900">
      <button onClick={() => navigate(`${base}/proposals`)} className="text-xs text-gray-500 hover:text-gray-800 inline-flex items-center gap-1 mb-2 cursor-pointer"><ArrowLeft size={13} /> Proposals</button>
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><h1 className="text-[18px] font-semibold">{p.number}</h1><Badge text={p.status} tone={PROPOSAL_STATUS_STYLE[p.status]} /><Badge text={p.kind === 'marketing' ? 'Digital marketing' : 'Software / IT'} tone="bg-indigo-50 text-indigo-800 ring-indigo-200" />{dirty && <span className="text-[11px] text-orange-700">Unsaved changes</span>}{notice && <span className="text-[11px] text-emerald-700">{notice}</span>}</div>
          <input disabled={disabled} value={title} onChange={e => { setTitle(e.target.value); setDirty(true); }} className="mt-1 w-full max-w-xl text-[13px] border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none bg-transparent" placeholder="Proposal title" />
          <div className="text-[12px] text-gray-500">{p.client}{data.deal && <> · <button onClick={() => navigate(`${base}/opportunity/${data.deal.id}`)} className="text-blue-700 hover:underline cursor-pointer">{data.deal.name}</button></>}{p.sentAt && ` · Sent ${fmtWhen(p.sentAt)}${p.sentTo ? ` to ${p.sentTo}` : ''}`}</div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {!disabled && <button onClick={save} disabled={!!busy} className={btn.ghost}>{busy === 'save' ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save</button>}
          <button onClick={() => preview(false)} disabled={!!busy} className={btn.ghost}><Eye size={13} /> Preview deck</button>
          <button onClick={() => preview(true)} disabled={!!busy} className={btn.ghost}><Download size={13} /> PDF</button>
          {sendable && <><button onClick={async () => { if (await ensureSaved()) setModal('send'); }} className={btn.blue}><Mail size={13} /> Email to client</button><button onClick={async () => { if (await ensureSaved()) setModal('marksent'); }} className={btn.ghost}><MessageCircle size={13} /> Mark as sent</button></>}
        </div>
      </div>
      <ErrorNote text={error} />

      <div className="grid xl:grid-cols-[1fr_320px] gap-4 mt-2">
        <div className="space-y-3 min-w-0">
          {p.kind === 'marketing' ? <MarketingSlides c={c} edit={edit} disabled={disabled} services={services} /> : <>
          <Slide title="Cover" hint={`${c.cover.title || ''} · ${c.cover.preparedFor || ''}`} defaultOpen canEdit={!disabled}>
            <div className="grid md:grid-cols-2 gap-3">
              <div><label className={labelCls}>Heading</label><input disabled={disabled} value={c.cover.title || ''} onChange={e => editIn('cover', { title: e.target.value })} className={inputCls} /></div>
              <div><label className={labelCls}>Under the heading</label><input disabled={disabled} value={c.cover.subtitle || ''} onChange={e => editIn('cover', { subtitle: e.target.value })} placeholder="Custom ERP Development" className={inputCls} /></div>
              <div><label className={labelCls}>Prepared for</label><input disabled={disabled} value={c.cover.preparedFor || ''} onChange={e => editIn('cover', { preparedFor: e.target.value })} className={inputCls} /></div>
              <div><label className={labelCls}>Date on the cover</label><input type="date" disabled={disabled} value={c.cover.date || ''} onChange={e => editIn('cover', { date: e.target.value })} className={inputCls} /></div>
            </div>
          </Slide>

          <Slide title="About the company" hint="standard text from Sales Settings unless you write your own" on={c.sections.about} onToggle={toggle('about')} canEdit={!disabled}>
            <textarea disabled={disabled} value={c.about.text || ''} onChange={e => editIn('about', { text: e.target.value })} rows={5} placeholder="Leave empty to use the standard company text (Sales Settings → Proposal deck)." className={area} />
          </Slide>

          <Slide title="Executive summary" on={c.sections.summary} onToggle={toggle('summary')} canEdit={!disabled} defaultOpen>
            <div><label className={labelCls}>Opening</label><textarea disabled={disabled} value={c.summary.text || ''} onChange={e => editIn('summary', { text: e.target.value })} rows={5} className={area} /></div>
            <div><label className={labelCls}>Key points</label><Lines disabled={disabled} value={c.summary.points} onChange={(points) => editIn('summary', { points })} rows={5} /></div>
            <div><label className={labelCls}>Closing</label><textarea disabled={disabled} value={c.summary.closing || ''} onChange={e => editIn('summary', { closing: e.target.value })} rows={3} className={area} /></div>
          </Slide>

          <Slide title={c.overview.title || 'Modules / services'} hint="the list slide" on={c.sections.overview} onToggle={toggle('overview')} canEdit={!disabled}>
            <div className="grid md:grid-cols-2 gap-3">
              <div><label className={labelCls}>Heading</label><input disabled={disabled} value={c.overview.title || ''} onChange={e => editIn('overview', { title: e.target.value })} placeholder="ERP Modules" className={inputCls} /></div>
              <div><label className={labelCls}>Line under it</label><input disabled={disabled} value={c.overview.intro || ''} onChange={e => editIn('overview', { intro: e.target.value })} className={inputCls} /></div>
            </div>
            <div><label className={labelCls}>Items</label><Lines disabled={disabled} value={c.overview.items} onChange={(items) => editIn('overview', { items })} rows={8} /></div>
          </Slide>

          <Slide title={`Options and prices (${c.options.length})`} hint="one page per option" on={c.sections.options} onToggle={toggle('options')} canEdit={!disabled} defaultOpen>
            <p className="text-[12px] text-gray-600">Give the client a choice: for example a partial and a full system, or Starter, Growth and Premium plans. Each option has its own price, GST and deadline or monthly period.</p>
            {c.options.map((o, i) => <OptionCard key={i} option={o} disabled={disabled} services={services} onChange={(n) => edit({ options: c.options.map((x, j) => (j === i ? n : x)) })} onRemove={() => edit({ options: c.options.filter((_, j) => j !== i) })} />)}
            {!disabled && c.options.length < 6 && <button onClick={() => edit({ options: [...c.options, { key: String.fromCharCode(65 + c.options.length), name: '', intro: '', groups: [], lines: [], priceMode: p.kind === 'marketing' ? 'lines' : 'fixed', price: 0, gstPct: meta.quotation.defaultTaxPct, billing: p.kind === 'marketing' ? 'monthly' : 'one-time', months: p.kind === 'marketing' ? 6 : 0, startMonth: '', deadline: '', showScope: true }] })} className={btn.ghost}><Plus size={13} /> Add an option</button>}
          </Slide>

          <Slide title="Budget, timeline and payment terms" on={c.sections.budget} onToggle={toggle('budget')} canEdit={!disabled}>
            <div>
              <div className="flex items-center justify-between mb-1"><label className="text-xs font-semibold text-gray-700">Payment milestones (used when you create the quotation)</label>
                {!disabled && <button onClick={() => edit({ payment: { ...c.payment, milestones: [...c.payment.milestones, { name: '', pct: 0 }] } })} className="text-[11.5px] text-blue-700 hover:underline cursor-pointer inline-flex items-center gap-0.5"><Plus size={11} /> Add</button>}</div>
              {c.payment.milestones.map((m, i) => (
                <div key={i} className="grid grid-cols-[28px_1fr_90px_28px] gap-2 items-center mb-1.5">
                  <span className="text-gray-500 text-[12.5px] text-center">{i + 1}</span>
                  <input disabled={disabled} value={m.name} onChange={e => editIn('payment', { milestones: c.payment.milestones.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} className={inputCls} placeholder="e.g. Advance against PO" />
                  <div className="relative"><input disabled={disabled} value={m.pct} onChange={e => editIn('payment', { milestones: c.payment.milestones.map((x, j) => (j === i ? { ...x, pct: e.target.value.replace(/[^\d.]/g, '') } : x)) })} className={`${inputCls} text-right pr-6`} /><span className="absolute right-2 top-2 text-gray-400 text-xs">%</span></div>
                  {!disabled && <button onClick={() => editIn('payment', { milestones: c.payment.milestones.filter((_, j) => j !== i) })} className="text-gray-400 hover:text-red-600 cursor-pointer" aria-label="Remove"><Trash2 size={14} /></button>}
                </div>
              ))}
              {c.payment.milestones.length > 0 && <div className={`text-[11.5px] ${Math.abs(c.payment.milestones.reduce((s, m) => s + (Number(m.pct) || 0), 0) - 100) > 0.01 ? 'text-red-700' : 'text-emerald-700'}`}>Total {c.payment.milestones.reduce((s, m) => s + (Number(m.pct) || 0), 0)}%</div>}
            </div>
            <div><label className={labelCls}>Other payment terms</label><Lines disabled={disabled} value={c.payment.notes} onChange={(notes) => editIn('payment', { notes })} rows={3} /></div>
          </Slide>

          <Slide title={c.tech.title || 'Technology'} hint="up to 4 boxes" on={c.sections.tech} onToggle={toggle('tech')} canEdit={!disabled}>
            <div><label className={labelCls}>Heading</label><input disabled={disabled} value={c.tech.title || ''} onChange={e => editIn('tech', { title: e.target.value })} className={inputCls} /></div>
            <div className="grid md:grid-cols-2 gap-2">
              {c.tech.blocks.map((b, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-2 bg-gray-50/50">
                  <div className="flex items-center gap-1.5 mb-1.5"><input disabled={disabled} value={b.title} onChange={e => editIn('tech', { blocks: c.tech.blocks.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} className={`${inputCls} font-medium`} />{!disabled && <button onClick={() => editIn('tech', { blocks: c.tech.blocks.filter((_, j) => j !== i) })} className="text-gray-400 hover:text-red-600 cursor-pointer" aria-label="Remove box"><Trash2 size={14} /></button>}</div>
                  <Lines disabled={disabled} value={b.items} onChange={(items) => editIn('tech', { blocks: c.tech.blocks.map((x, j) => (j === i ? { ...x, items } : x)) })} rows={4} />
                </div>
              ))}
            </div>
            {!disabled && c.tech.blocks.length < 4 && <button onClick={() => editIn('tech', { blocks: [...c.tech.blocks, { title: '', items: [''] }] })} className={btn.ghost}><Plus size={13} /> Add a box</button>}
          </Slide>

          <Slide title={c.support.title || 'Support'} on={c.sections.support} onToggle={toggle('support')} canEdit={!disabled}>
            <div><label className={labelCls}>Heading</label><input disabled={disabled} value={c.support.title || ''} onChange={e => editIn('support', { title: e.target.value })} className={inputCls} /></div>
            <div><label className={labelCls}>Introduction</label><textarea disabled={disabled} value={c.support.intro || ''} onChange={e => editIn('support', { intro: e.target.value })} rows={2} className={area} /></div>
            <div><label className={labelCls}>Points</label><Lines disabled={disabled} value={c.support.items} onChange={(items) => editIn('support', { items })} rows={5} /></div>
            <div><label className={labelCls}>Closing line</label><textarea disabled={disabled} value={c.support.footer || ''} onChange={e => editIn('support', { footer: e.target.value })} rows={2} className={area} /></div>
          </Slide>

          <Slide title="Annual maintenance (AMC)" on={c.sections.amc} onToggle={toggle('amc')} canEdit={!disabled}>
            <div><label className={labelCls}>Headline</label><textarea disabled={disabled} value={c.amc.headline || ''} onChange={e => editIn('amc', { headline: e.target.value })} rows={2} className={area} /></div>
            <div className="grid md:grid-cols-2 gap-3">
              <div><label className={labelCls}>AMC includes</label><Lines disabled={disabled} value={c.amc.includes} onChange={(includes) => editIn('amc', { includes })} rows={8} /></div>
              <div><label className={labelCls}>AMC does not include</label><Lines disabled={disabled} value={c.amc.excludes} onChange={(excludes) => editIn('amc', { excludes })} rows={8} /></div>
            </div>
            <div><label className={labelCls}>Closing line</label><input disabled={disabled} value={c.amc.footer || ''} onChange={e => editIn('amc', { footer: e.target.value })} className={inputCls} /></div>
          </Slide>

          <Slide title="Notes and conditions" hint="numbered, on the last page" on={c.sections.notes} onToggle={toggle('notes')} canEdit={!disabled}>
            <Lines disabled={disabled} value={c.notes} onChange={(notes) => edit({ notes })} rows={10} />
          </Slide>
          </>}
        </div>

        <div className="space-y-4">
          <Card title="Options at a glance" pad={false}>
            {optionsTotals.length === 0 ? <div className="text-[12.5px] text-gray-500 p-4">No options yet.</div> : (
              <ul className="divide-y divide-gray-100">{optionsTotals.map(o => (
                <li key={o.key} className="px-4 py-2.5 text-[12.5px]">
                  <div className="flex items-center justify-between gap-2"><span className="font-medium truncate">{p.kind === 'marketing' ? '' : `${o.key}. `}{o.name || 'Untitled option'}</span>{(p.kind === 'marketing' ? (c.chosen || []).includes(o.key) : p.chosenOption === o.key) && <Badge text="Chosen" tone="bg-emerald-50 text-emerald-800 ring-emerald-200" />}</div>
                  <div className="text-gray-600 tabular-nums">{o.base > 0 ? `${money(o.base)}${o.monthly ? ' / month' : ''} + ${o.gstPct}% GST` : 'Price not set'}</div>
                  {p.kind !== 'marketing' && p.status === 'Accepted' && p.chosenOption === o.key && !p.quotationId && <button onClick={() => createQuotation(c.options.find(x => x.key === o.key))} disabled={!!busy} className={`${btn.green} mt-1.5`}>{busy === 'quote' ? <Loader2 size={13} className="animate-spin" /> : <Receipt size={13} />} Create quotation</button>}
                </li>
              ))}</ul>
            )}
          </Card>

          <Card title="Next steps">
            <div className="space-y-2 text-[12.5px]">
              {p.status === 'Draft' && <p className="text-gray-600">Fill in the slides, preview the deck, then email it or mark it as sent.</p>}
              {sendable && <div className="flex flex-wrap gap-1.5"><button onClick={() => setModal('accept')} className={btn.green}><CheckCircle2 size={13} /> Client accepted</button><button onClick={() => setModal('decline')} className={btn.danger}><XCircle size={13} /> Client declined</button></div>}
              {p.status === 'Accepted' && !p.quotationId && p.kind === 'marketing' && <><p className="text-gray-700">The client chose {(c.chosen || []).length} service{(c.chosen || []).length === 1 ? '' : 's'}. Create the monthly retainer quotation from them: GST lines, monthly billing and the scope of work carry over.</p><button onClick={createQuotationMk} disabled={!!busy} className={btn.green}>{busy === 'quote' ? <Loader2 size={13} className="animate-spin" /> : <Receipt size={13} />} Create quotation</button></>}
              {p.status === 'Accepted' && !p.quotationId && p.kind !== 'marketing' && <p className="text-gray-700">Option <b>{p.chosenOption}</b> was chosen. Create the quotation from it: GST lines, {(c.options || []).find(o => o.key === p.chosenOption)?.billing === 'monthly' ? 'monthly billing' : 'payment milestones'} and the scope of work carry over.</p>}
              {p.quotationId && <button onClick={() => navigate(`${base}/quotation/${p.quotationId}`)} className={btn.blue}><FileText size={13} /> Open the quotation</button>}
              {p.status === 'Declined' && <p className="text-red-700">Declined: {p.declineReason}</p>}
              {p.status === 'Draft' && <button onClick={async () => { if (window.confirm('Delete this draft proposal?')) { try { await proposalApi(`/${id}`, { method: 'DELETE' }); navigate(`${base}/proposals`); } catch (e) { setError(e.message); } } }} className={btn.danger}><Trash2 size={13} /> Delete draft</button>}
            </div>
          </Card>

          {data.events.length > 0 && <Card title="History"><ul className="space-y-2">{data.events.map(e => <li key={e.id} className="text-[12px]"><div className="text-gray-800">{e.title}</div><div className="text-[11px] text-gray-500">{fmtWhen(e.at)} · {e.by}</div></li>)}</ul></Card>}
        </div>
      </div>

      {modal === 'send' && <SendModal proposal={p} onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} />}
      {modal === 'marksent' && (
        <Modal title="Mark as sent" onClose={() => setModal(null)} width="max-w-sm">
          <p className="text-[12px] text-gray-600 mb-3">Shared the PDF another way? Download it, send it, then record how.</p>
          <div className="grid grid-cols-2 gap-2">{['WhatsApp', 'Email', 'In person', 'Courier'].map(v => <button key={v} onClick={() => { setModal(null); act('mark', () => proposalApi(`/${id}/mark-sent`, { method: 'POST', body: { via: v } })); }} className={btn.ghost}>{v}</button>)}</div>
        </Modal>
      )}
      {modal === 'accept' && <AcceptModal multi={p.kind === 'marketing'} options={p.kind === 'marketing' ? p.options : c.options} onClose={() => setModal(null)} onConfirm={async (option) => { await proposalApi(`/${id}/respond`, { method: 'POST', body: p.kind === 'marketing' ? { accepted: true, variants: option } : { accepted: true, option } }); setModal(null); load(); }} />}
      {modal === 'decline' && <ReasonModal title="Client declined" reasonLabel="Why?" presets={['Price too high', 'Chose another vendor', 'Scope changed', 'Postponed']} confirmText="Save" tone="danger" onClose={() => setModal(null)} onConfirm={async ({ reason }) => { await proposalApi(`/${id}/respond`, { method: 'POST', body: { accepted: false, reason } }); setModal(null); load(); }} />}
    </div>
  );
}

function AcceptModal({ options, onClose, onConfirm, multi }) {
  const [opt, setOpt] = useState(multi ? options.filter(o => o.first).map(o => o.key) : (options.length === 1 ? options[0].key : ''));
  const [error, setError] = useState('');
  return (
    <Modal title="Client accepted" onClose={onClose} width="max-w-md" footer={<><button onClick={onClose} className={btn.ghost}>Cancel</button><button onClick={async () => { try { await onConfirm(opt); } catch (e) { setError(e.message); } }} className={btn.green}>Save</button></>}>
      <div className="space-y-2">
        <label className={labelCls}>{multi ? 'Which services did the client agree to?' : 'Which option did they choose?'}</label>
        {multi ? options.map(o => <label key={o.key} className={`flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer text-[13px] ${opt.includes(o.key) ? 'border-blue-500 bg-blue-50/40' : 'border-gray-200'}`}><input type="checkbox" checked={opt.includes(o.key)} onChange={() => setOpt(x => (x.includes(o.key) ? x.filter(k => k !== o.key) : [...x, o.key]))} /> <span className="flex-1">{o.name}</span><span className="text-gray-500 tabular-nums text-[12px]">{money(o.base)} / month</span></label>)
          : options.map(o => <label key={o.key} className={`flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer text-[13px] ${opt === o.key ? 'border-blue-500 bg-blue-50/40' : 'border-gray-200'}`}><input type="radio" checked={opt === o.key} onChange={() => setOpt(o.key)} /> {o.key}. {o.name}</label>)}
        <ErrorNote text={error} />
      </div>
    </Modal>
  );
}

function SendModal({ proposal, onClose, onDone }) {
  const [to, setTo] = useState(proposal.clientEmail || '');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const send = async () => { setSending(true); setError(''); try { await proposalApi(`/${proposal.id}/send`, { method: 'POST', body: { to, cc, subject: subject || undefined, message: message || undefined } }); onDone(); } catch (e) { setError(e.message); setSending(false); } };
  return (
    <Modal title={`Email ${proposal.number}`} onClose={onClose} width="max-w-xl" footer={<><button onClick={onClose} className={btn.ghost}>Cancel</button><button onClick={send} disabled={sending} className={btn.blue}>{sending ? <Loader2 size={13} className="animate-spin" /> : <SendHorizontal size={13} />} Send with PDF</button></>}>
      <div className="space-y-3">
        <div><label className={labelCls}>To <span className="text-red-600">*</span></label><input value={to} onChange={e => setTo(e.target.value)} placeholder="client@example.com" className={inputCls} /></div>
        <div><label className={labelCls}>Cc</label><input value={cc} onChange={e => setCc(e.target.value)} placeholder="Separate with commas" className={inputCls} /></div>
        <div><label className={labelCls}>Subject</label><input value={subject} onChange={e => setSubject(e.target.value)} placeholder={`Proposal ${proposal.number} from Codigix (default)`} className={inputCls} /></div>
        <div><label className={labelCls}>Message</label><textarea value={message} onChange={e => setMessage(e.target.value)} rows={5} className={area} placeholder="Leave empty to use the standard message." /></div>
        <ErrorNote text={error} />
      </div>
    </Modal>
  );
}

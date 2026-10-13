import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../../../config/environment';
import { money } from './salesShared';

/**
 * Shared pieces for the sales desk pages: home, customers, invoices, payments, targets,
 * team performance, reports, distribution. Server: server/routes/sales-desk-routes.js.
 */

export const desk = async (path, opts = {}) => {
  const res = await fetch(`${API_BASE_URL}/sales-desk${path}`, {
    ...opts,
    headers: { ...(opts.body ? { 'Content-Type': 'application/json' } : {}), ...(opts.headers || {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
};
export const invoicePdfUrl = (id, download) => `${API_BASE_URL}/sales-pdf/invoice/${id}${download ? '?download=1' : ''}`;
export const receiptPdfUrl = (id, download) => `${API_BASE_URL}/sales-pdf/receipt/${id}${download ? '?download=1' : ''}`;
export const statementPdfUrl = (companyId, from) => `${API_BASE_URL}/sales-pdf/statement/${companyId}${from ? `?from=${from}` : ''}`;

export const INVOICE_STATUS_STYLE = {
  Draft: 'bg-gray-100 text-gray-700 ring-gray-300', Sent: 'bg-blue-50 text-blue-800 ring-blue-200', 'Partially Paid': 'bg-amber-50 text-amber-800 ring-amber-200',
  Overdue: 'bg-red-50 text-red-700 ring-red-200', Paid: 'bg-emerald-50 text-emerald-800 ring-emerald-200'
};
export const CUSTOMER_TYPE_STYLE = { Customer: 'bg-emerald-50 text-emerald-800 ring-emerald-200', Prospect: 'bg-sky-50 text-sky-800 ring-sky-200', Inactive: 'bg-gray-100 text-gray-600 ring-gray-300' };
export const monthLabel = (ym) => new Date(`${ym}-01T12:00:00`).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
export const shortMoney = (n) => {
  const v = Number(n) || 0; const a = Math.abs(v);
  if (a >= 10000000) return `₹${(v / 10000000).toFixed(a >= 100000000 ? 0 : 1)} Cr`;
  if (a >= 100000) return `₹${(v / 100000).toFixed(a >= 1000000 ? 0 : 1)} L`;
  if (a >= 1000) return `₹${(v / 1000).toFixed(a >= 10000 ? 0 : 1)}k`;
  return `₹${Math.round(v)}`;
};
/** CSV download of rows ([[header...], [cells...]]). */
export const downloadCsv = (name, rows) => {
  const esc = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const blob = new Blob([`﻿${rows.map(r => r.map(esc).join(',')).join('\n')}`], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};

export const Loading = ({ error, text = 'Loading…' }) => (
  <div className="min-h-[60vh] flex items-center justify-center gap-2 text-sm text-gray-500">
    {error ? <span className="text-red-700">{error}</span> : <><Loader2 size={16} className="animate-spin" /> {text}</>}
  </div>
);
export const PageHead = ({ title, sub, children }) => (
  <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
    <div className="min-w-0"><h1 className="text-[20px] font-semibold text-gray-900">{title}</h1>{sub && <p className="text-[12.5px] text-gray-500 mt-0.5">{sub}</p>}</div>
    <div className="flex flex-wrap items-center gap-2">{children}</div>
  </div>
);
export const Segmented = ({ value, onChange, options }) => (
  <div className="flex bg-white border border-gray-200 rounded-lg p-0.5">
    {options.map(([v, l]) => <button key={v} onClick={() => onChange(v)} className={`h-7 px-3 text-xs rounded-md cursor-pointer whitespace-nowrap ${value === v ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'}`}>{l}</button>)}
  </div>
);
export const Chips = ({ value, onChange, options }) => (
  <div className="flex flex-wrap gap-1.5">
    {options.map(([v, l, n]) => (
      <button key={v} onClick={() => onChange(v)} className={`h-7 px-3 text-xs rounded-full border cursor-pointer ${value === v ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
        {l}{n != null && <span className={`ml-1 ${value === v ? 'text-gray-300' : 'text-gray-400'}`}>{n}</span>}
      </button>
    ))}
  </div>
);
export const Kpi = ({ icon: Icon, label, value, hint, tone = 'text-gray-500', warn, onClick }) => (
  <button type="button" onClick={onClick} disabled={!onClick}
    className={`text-left bg-white border rounded-lg p-3 min-w-0 ${onClick ? 'hover:border-gray-300 cursor-pointer' : 'cursor-default'} ${warn ? 'border-red-200' : 'border-gray-200'}`}>
    <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium">{Icon && <Icon size={13} className={tone} />} <span className="truncate">{label}</span></div>
    <div className={`text-xl font-semibold tabular-nums mt-1 truncate ${warn ? 'text-red-700' : 'text-gray-900'}`}>{value}</div>
    {hint && <div className="text-[11px] text-gray-500 mt-0.5 truncate">{hint}</div>}
  </button>
);
export const Card = ({ title, action, children, className = '', pad = true }) => (
  <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
    {title && <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between gap-2"><span className="text-[13px] font-semibold text-gray-900">{title}</span>{action}</div>}
    <div className={pad ? 'p-4' : ''}>{children}</div>
  </div>
);
export const EmptyNote = ({ children }) => <div className="text-[12.5px] text-gray-500 py-6 text-center">{children}</div>;

/** Progress against a target; the tick marks where this month's pace says you should be. */
export function TargetBar({ label, achieved, target, format = (v) => v, expected }) {
  const pctDone = target ? Math.min(100, Math.round((achieved / target) * 100)) : 0;
  const behind = target > 0 && expected != null && achieved < target * expected;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-[12px]">
        <span className="text-gray-700 font-medium">{label}</span>
        <span className="tabular-nums text-gray-600"><span className="font-semibold text-gray-900">{format(achieved)}</span>{target ? ` of ${format(target)}` : ' · no target set'}</span>
      </div>
      <div className="relative h-2 mt-1 rounded-full bg-gray-100">
        {target > 0 && <div className={`absolute inset-y-0 left-0 rounded-full ${pctDone >= 100 ? 'bg-emerald-600' : behind ? 'bg-amber-500' : 'bg-blue-600'}`} style={{ width: `${pctDone}%` }} />}
        {target > 0 && expected != null && expected > 0 && expected < 1 && <div className="absolute -top-0.5 -bottom-0.5 w-0.5 bg-gray-500" style={{ left: `${Math.round(expected * 100)}%` }} title="Where you should be by today" />}
      </div>
      {target > 0 && <div className={`text-[11px] mt-0.5 ${pctDone >= 100 ? 'text-emerald-700' : behind ? 'text-amber-700' : 'text-gray-500'}`}>{pctDone}%{pctDone >= 100 ? ' · target reached' : behind ? ' · behind pace' : ' · on pace'}</div>}
    </div>
  );
}

// Validated pair (CVD-safe, both 3:1 on white): blue = first series, orange = second.
const SERIES_COLORS = ['#2563eb', '#ea580c'];

/** Monthly bars for one or two series (e.g. won value and collected), with a hover read-out. */
export function TrendBars({ data, series, height = 170, format = shortMoney }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...data.flatMap(d => series.map(s => Number(d[s.key]) || 0)));
  const W = 640; const H = height; const padL = 48; const padB = 22; const padT = 8;
  const plotW = W - padL - 8; const plotH = H - padB - padT;
  const group = plotW / Math.max(1, data.length);
  const barW = Math.max(6, Math.min(22, (group - 14) / series.length));
  const ticks = [0, 0.5, 1].map(f => max * f);
  const empty = data.every(d => series.every(s => !Number(d[s.key])));
  return (
    <div className="relative">
      {series.length > 1 && (
        <div className="flex flex-wrap gap-3 mb-2 text-[11px] text-gray-600">
          {series.map((s, i) => <span key={s.key} className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: SERIES_COLORS[i] }} />{s.label}</span>)}
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={series.map(s => s.label).join(' and ')} onMouseLeave={() => setHover(null)}>
        {ticks.map((v, i) => {
          const y = padT + plotH - (v / max) * plotH;
          return <g key={i}><line x1={padL} x2={W - 8} y1={y} y2={y} stroke="#e5e7eb" strokeWidth="1" /><text x={padL - 6} y={y + 3} textAnchor="end" fontSize="10" fill="#6b7280">{empty && i ? '' : format(v)}</text></g>;
        })}
        {data.map((d, gi) => {
          const gx = padL + gi * group;
          const inner = barW * series.length + 2 * (series.length - 1);
          return (
            <g key={d.month || gi} onMouseEnter={() => setHover(gi)}>
              <rect x={gx} y={padT} width={group} height={plotH} fill={hover === gi ? '#f3f4f6' : 'transparent'} />
              {series.map((s, si) => {
                const v = Number(d[s.key]) || 0; const h = (v / max) * plotH;
                if (h <= 0) return null;
                const x = gx + (group - inner) / 2 + si * (barW + 2); const r = Math.min(4, h, barW / 2);
                return <path key={s.key} d={`M${x},${padT + plotH} v${-(h - r)} q0,${-r} ${r},${-r} h${barW - 2 * r} q${r},0 ${r},${r} v${h - r} z`} fill={SERIES_COLORS[si]} />;
              })}
              <text x={gx + group / 2} y={H - 6} textAnchor="middle" fontSize="10.5" fill="#6b7280">{d.label || monthLabel(d.month)}</text>
            </g>
          );
        })}
      </svg>
      {empty && <div className="absolute inset-0 flex items-center justify-center text-[12px] text-gray-500 pointer-events-none">Nothing yet in these months</div>}
      {hover != null && data[hover] && !empty && (
        <div className="absolute top-0 right-0 bg-white border border-gray-200 shadow-md rounded-md px-2.5 py-1.5 text-[11.5px] pointer-events-none">
          <div className="font-semibold text-gray-900 mb-0.5">{data[hover].label || monthLabel(data[hover].month)}</div>
          {series.map((s, i) => <div key={s.key} className="flex items-center gap-1.5 text-gray-700"><span className="w-2 h-2 rounded-sm" style={{ background: SERIES_COLORS[i] }} />{s.label}: <span className="font-medium tabular-nums">{money(data[hover][s.key])}</span></div>)}
        </div>
      )}
    </div>
  );
}

/** Horizontal bars for a breakdown (stages, sources, reasons). */
export function HBars({ rows, valueKey, labelKey, format = (v) => v, sub, empty = 'Nothing to show yet.' }) {
  const max = Math.max(1, ...rows.map(r => Number(r[valueKey]) || 0));
  if (!rows.length) return <EmptyNote>{empty}</EmptyNote>;
  return (
    <div className="space-y-2.5">
      {rows.map((r, i) => (
        <div key={r[labelKey] || i}>
          <div className="flex justify-between gap-2 text-[12px]"><span className="text-gray-700 truncate">{r[labelKey]}</span><span className="tabular-nums text-gray-900 font-medium shrink-0">{format(r[valueKey])}{sub ? <span className="text-gray-500 font-normal"> · {sub(r)}</span> : null}</span></div>
          <div className="h-1.5 mt-1 rounded-full bg-gray-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${Number(r[valueKey]) ? Math.max(2, ((Number(r[valueKey]) || 0) / max) * 100) : 0}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

/** Proposal decks: server/routes/sales-proposal-routes.js */
export const proposalApi = async (path, opts = {}) => {
  const res = await fetch(`${API_BASE_URL}/sales-proposals${path}`, {
    ...opts,
    headers: { ...(opts.body ? { 'Content-Type': 'application/json' } : {}), ...(opts.headers || {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
};
export const proposalPdfUrl = (id, download) => `${API_BASE_URL}/sales-proposals/${id}/pdf${download ? '?download=1' : ''}`;
export const PROPOSAL_STATUS_STYLE = {
  Draft: 'bg-gray-100 text-gray-700 ring-gray-300', Sent: 'bg-blue-50 text-blue-800 ring-blue-200', Accepted: 'bg-emerald-50 text-emerald-800 ring-emerald-200', Declined: 'bg-red-50 text-red-700 ring-red-200'
};

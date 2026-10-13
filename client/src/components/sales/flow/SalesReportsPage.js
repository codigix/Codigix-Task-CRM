import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download } from 'lucide-react';
import { useSalesBase, money, money2, fmtDate, btn, inputCls, ymd, dayOf } from './salesShared';
import { desk, Loading, PageHead, Kpi, Card, Chips, HBars, TrendBars, EmptyNote, downloadCsv } from './deskShared';

/**
 * Sales reports from the records: the enquiry funnel, where enquiries come from and what they
 * are worth, why deals are lost, quotation acceptance, pipeline by stage, what is on hold and
 * receivables ageing. Managers can look at one person.
 */

const RANGES = [['month', 'This month'], ['last', 'Last month'], ['quarter', 'Last 90 days'], ['year', 'This year']];
const rangeFor = (k) => {
  const d = new Date();
  if (k === 'last') return { from: ymd(new Date(d.getFullYear(), d.getMonth() - 1, 1)), to: ymd(new Date(d.getFullYear(), d.getMonth(), 0)) };
  if (k === 'quarter') return { from: ymd(new Date(Date.now() - 90 * 86400000)), to: ymd() };
  if (k === 'year') return { from: `${d.getFullYear()}-01-01`, to: ymd() };
  return { from: ymd(new Date(d.getFullYear(), d.getMonth(), 1)), to: ymd() };
};
const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '—');

export default function SalesReportsPage() {
  const navigate = useNavigate();
  const base = useSalesBase();
  const [range, setRange] = useState('month');
  const [owner, setOwner] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(() => {
    const r = rangeFor(range);
    desk(`/reports?from=${r.from}&to=${r.to}${owner ? `&owner=${owner}` : ''}`).then(d => { setData(d); setError(''); }).catch(e => setError(e.message));
  }, [range, owner]);
  useEffect(() => { load(); }, [load]);
  if (!data) return <Loading error={error} text="Building the report…" />;

  const s = data.summary; const q = data.quotations;
  const first = data.funnel[0]?.count || 0;
  const exportCsv = () => downloadCsv('sales-report.csv', [
    ['Source', 'Enquiries', 'Became deals', 'Won', 'Won value', 'Lost'], ...data.sources.map(x => [x.source, x.enquiries, x.deals, x.won, x.wonValue, x.lost]),
    [], ['Month', 'Enquiries', 'Won value', 'Collected'], ...data.months.map(m => [m.month, m.enquiries, m.won, m.collected]),
    [], ['Stage', 'Open deals', 'Value', 'Average idle days'], ...data.stages.map(x => [x.stage, x.count, x.value, x.idleDays ?? ''])
  ]);

  return (
    <div className="p-5 bg-[#F8FAFC] min-h-screen font-sans text-gray-900">
      <PageHead title="Sales reports" sub={`${fmtDate(data.range.from)} – ${fmtDate(data.range.to)}${data.isManager ? (data.owner ? ` · ${data.people.find(p => p.id === data.owner)?.name || ''}` : ' · whole team') : ' · your numbers'}`}>
        <Chips value={range} onChange={setRange} options={RANGES} />
        {data.isManager && data.people.length > 1 && <select value={owner} onChange={e => setOwner(e.target.value)} className={`${inputCls} w-44`}><option value="">Whole team</option>{data.people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>}
        <button onClick={exportCsv} className={btn.ghost}><Download size={13} /> Export</button>
      </PageHead>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
        <Kpi label="Enquiries" value={s.enquiries} />
        <Kpi label="Won" value={money(s.wonValue)} hint={`${s.dealsWon} deals · ${s.dealsLost} lost`} tone="text-emerald-600" />
        <Kpi label="Quotations accepted" value={q.acceptanceRate == null ? '—' : `${q.acceptanceRate}%`} hint={`${q.accepted} of ${q.accepted + q.declined} answered`} />
        <Kpi label="Invoiced" value={money(s.invoiced)} />
        <Kpi label="Collected" value={money(s.collected)} tone="text-emerald-600" />
        <Kpi label="Outstanding now" value={money(s.outstanding)} warn={s.outstanding > 0} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <Card title="Enquiry funnel" action={<span className="text-[11.5px] text-gray-500">enquiries received in this period</span>}>
          <div className="space-y-2.5">
            {data.funnel.map((f, i) => (
              <div key={f.step}>
                <div className="flex justify-between text-[12px]"><span className="text-gray-700">{f.step}</span><span className="tabular-nums font-medium">{f.count}{i > 0 && first > 0 && <span className="text-gray-500 font-normal"> · {pct(f.count, first)} of enquiries{i > 1 ? `, ${pct(f.count, data.funnel[i - 1].count)} of previous` : ''}</span>}</span></div>
                <div className="h-2 mt-1 rounded-full bg-gray-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${first ? Math.max(f.count ? 2 : 0, (f.count / first) * 100) : 0}%` }} /></div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Enquiries, won value and collections by month"><TrendBars data={data.months.map(m => ({ ...m }))} series={[{ key: 'won', label: 'Won (deal value)' }, { key: 'collected', label: 'Collected (payments)' }]} /></Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <Card title="Where enquiries come from" pad={false}>
          {data.sources.length === 0 ? <EmptyNote>No enquiries in this period.</EmptyNote> : (
            <table className="w-full text-[12.5px]"><thead className="text-[11px] text-gray-500 bg-gray-50"><tr><th className="text-left font-medium px-4 py-2">Source</th><th className="text-right font-medium px-2 py-2">Enquiries</th><th className="text-right font-medium px-2 py-2">Deals</th><th className="text-right font-medium px-2 py-2">Won</th><th className="text-right font-medium px-4 py-2">Won value</th></tr></thead>
              <tbody className="divide-y divide-gray-100">{data.sources.map(x => <tr key={x.source}><td className="px-4 py-2">{x.source}</td><td className="px-2 py-2 text-right tabular-nums">{x.enquiries}</td><td className="px-2 py-2 text-right tabular-nums">{x.deals}</td><td className="px-2 py-2 text-right tabular-nums">{x.won}</td><td className="px-4 py-2 text-right tabular-nums">{x.wonValue ? money(x.wonValue) : '—'}</td></tr>)}</tbody></table>
          )}
        </Card>
        <Card title="Why we lose">
          <HBars rows={data.lostReasons.map(r => ({ ...r, total: r.enquiries + r.deals }))} labelKey="reason" valueKey="total" sub={(r) => `${r.deals} deals, ${r.enquiries} enquiries`} empty="Nothing lost in this period." />
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <Card title="Quotations">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-[13px]">
            {[['Created', q.created], ['Sent to clients', q.sent], ['Accepted', `${q.accepted} (${money(q.acceptedValue)})`], ['Declined', q.declined], ['Still open', q.open], ['Quoted value', money(q.quotedValue)], ['Average discount', `${q.avgDiscount}%`], ['Average time to answer', q.avgResponseDays == null ? '—' : `${q.avgResponseDays} days`]].map(([k, v]) => <div key={k} className="flex justify-between border-b border-gray-100 pb-1.5"><dt className="text-gray-500">{k}</dt><dd className="font-medium tabular-nums">{v}</dd></div>)}
          </dl>
        </Card>
        <Card title="Open pipeline by stage" action={<span className="text-[11.5px] text-gray-500">idle = days since last change</span>} pad={false}>
          <table className="w-full text-[12.5px]"><thead className="text-[11px] text-gray-500 bg-gray-50"><tr><th className="text-left font-medium px-4 py-2">Stage</th><th className="text-right font-medium px-2 py-2">Deals</th><th className="text-right font-medium px-2 py-2">Value</th><th className="text-right font-medium px-4 py-2">Idle</th></tr></thead>
            <tbody className="divide-y divide-gray-100">{data.stages.map(x => <tr key={x.stage}><td className="px-4 py-2">{x.stage}</td><td className="px-2 py-2 text-right tabular-nums">{x.count}</td><td className="px-2 py-2 text-right tabular-nums">{money(x.value)}</td><td className={`px-4 py-2 text-right tabular-nums ${x.idleDays > 14 ? 'text-red-700' : ''}`}>{x.idleDays == null ? '—' : `${x.idleDays}d`}</td></tr>)}</tbody></table>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title={`On hold (${data.holds.length})`} pad={false}>
          {data.holds.length === 0 ? <EmptyNote>Nothing on hold.</EmptyNote> : (
            <ul className="divide-y divide-gray-100">{data.holds.map(h => (
              <li key={`${h.kind}${h.id}`}><button onClick={() => navigate(`${base}/${h.kind === 'Deal' ? 'opportunity' : 'enquiry'}/${h.id}`)} className="w-full text-left px-4 py-2 hover:bg-gray-50 cursor-pointer">
                <div className="flex justify-between gap-2 text-[13px]"><span className="font-medium truncate">{h.name}</span><span className={`shrink-0 text-[12px] ${h.until && dayOf(h.until) < ymd() ? 'text-red-700 font-medium' : 'text-gray-600'}`}>{h.until ? `until ${fmtDate(h.until)}` : ''}</span></div>
                <div className="text-[11.5px] text-gray-500 truncate">{h.kind} · {h.reason}{h.owner ? ` · ${h.owner}` : ''}</div>
              </button></li>
            ))}</ul>
          )}
        </Card>
        <Card title="Money to collect, by age">
          <HBars rows={data.aging} labelKey="bucket" valueKey="amount" format={money2} empty="Nothing outstanding." />
          {data.payModes.length > 0 && <div className="mt-4 pt-3 border-t border-gray-100"><div className="text-[11.5px] text-gray-500 mb-1.5">Received this period, by mode</div><HBars rows={data.payModes} labelKey="mode" valueKey="amount" format={money} /></div>}
        </Card>
      </div>
    </div>
  );
}

import React, { useCallback, useEffect, useState } from 'react';
import { Trophy, Wallet, Inbox, Percent, Download, Phone } from 'lucide-react';
import { money, btn, ymd } from './salesShared';
import { desk, Loading, PageHead, Kpi, Card, Chips, TrendBars, EmptyNote, downloadCsv } from './deskShared';

/**
 * Team performance from real records: enquiries, calls and meetings logged, quotations sent,
 * deals won and lost, value won, money collected and commission (rate set in Sales Settings).
 * Executives see their own row; managers see everyone.
 */

const RANGES = [['month', 'This month'], ['last', 'Last month'], ['quarter', 'Last 90 days'], ['year', 'This year']];
const rangeFor = (k) => {
  const d = new Date();
  if (k === 'last') return { from: ymd(new Date(d.getFullYear(), d.getMonth() - 1, 1)), to: ymd(new Date(d.getFullYear(), d.getMonth(), 0)) };
  if (k === 'quarter') return { from: ymd(new Date(Date.now() - 90 * 86400000)), to: ymd() };
  if (k === 'year') return { from: `${d.getFullYear()}-01-01`, to: ymd() };
  return { from: ymd(new Date(d.getFullYear(), d.getMonth(), 1)), to: ymd() };
};

export default function SalesTeamPage({ mode = 'performance' }) {
  const [range, setRange] = useState(mode === 'commission' ? 'last' : 'month');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(() => {
    const r = rangeFor(range);
    desk(`/team?from=${r.from}&to=${r.to}`).then(d => { setData(d); setError(''); }).catch(e => setError(e.message));
  }, [range]);
  useEffect(() => { load(); }, [load]);
  if (!data) return <Loading error={error} text="Loading team performance…" />;

  const t = data.totals; const rows = data.rows; const comm = data.commission;
  const exportCsv = () => downloadCsv(`sales-${mode}.csv`, [['Name', 'Enquiries', 'Converted', 'Calls/meetings/messages', 'Quotes sent', 'Deals won', 'Deals lost', 'Win rate %', 'Won value', 'Collected', 'Open deals', 'Pipeline', 'Commission'],
  ...rows.map(r => [r.name, r.enquiries, r.converted, r.activities, r.quotesSent, r.dealsWon, r.dealsLost, r.winRate ?? '', r.wonValue, r.collected, r.openDeals, r.pipelineValue, r.commission ?? ''])]);
  const rangeLabel = `${new Date(`${data.range.from}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${new Date(`${data.range.to}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  if (mode === 'commission') {
    return (
      <div className="p-5 bg-[#F8FAFC] min-h-screen font-sans text-gray-900">
        <PageHead title="Commission" sub={`${rangeLabel}${comm.pct ? ` · ${comm.pct}% of ${comm.basis === 'won' ? 'deal value won' : 'payments collected'}` : ''}`}>
          <Chips value={range} onChange={setRange} options={RANGES} />
          <button onClick={exportCsv} className={btn.ghost}><Download size={13} /> Export</button>
        </PageHead>
        {!comm.pct ? <Card><EmptyNote>No commission rate is set. A manager sets the rate and basis (on collected payments, or on deals won) in Sales Settings.</EmptyNote></Card> : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <Kpi icon={Percent} label="Commission payable" value={money(t.commission)} hint={`${comm.pct}% on ${comm.basis === 'won' ? 'won value' : 'collections'}`} />
              <Kpi icon={Wallet} tone="text-emerald-600" label="Collected" value={money(t.collected)} />
              <Kpi icon={Trophy} tone="text-emerald-600" label="Won value" value={money(t.wonValue)} hint={`${t.dealsWon} deals`} />
            </div>
            <div className="bg-white border border-gray-200 rounded overflow-x-auto">
              <table className="w-full text-[13px]"><thead className="text-xs text-gray-500 bg-gray-50"><tr><th className="text-left font-medium px-4 py-2.5">Salesperson</th><th className="text-right font-medium px-2 py-2.5">Deals won</th><th className="text-right font-medium px-2 py-2.5">Won value</th><th className="text-right font-medium px-2 py-2.5">Collected</th><th className="text-right font-medium px-4 py-2.5">Commission</th></tr></thead>
                <tbody className="divide-y divide-gray-100">{rows.map(r => <tr key={r.userId}><td className="px-4 py-2.5 font-medium">{r.name}<div className="text-[11px] text-gray-500 font-normal">{r.title}</div></td><td className="px-2 py-2.5 text-right tabular-nums">{r.dealsWon}</td><td className="px-2 py-2.5 text-right tabular-nums">{money(r.wonValue)}</td><td className="px-2 py-2.5 text-right tabular-nums">{money(r.collected)}</td><td className="px-4 py-2.5 text-right tabular-nums font-semibold">{money(r.commission)}</td></tr>)}</tbody>
              </table>
            </div>
            <p className="text-[11.5px] text-gray-500 mt-2">Computed from recorded payments and won deals; it is a worksheet for payroll, not a payment.</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="p-5 bg-[#F8FAFC] min-h-screen font-sans text-gray-900">
      <PageHead title="Performance" sub={`${rangeLabel} · ${data.isManager ? 'whole sales team' : 'your numbers'}`}>
        <Chips value={range} onChange={setRange} options={RANGES} />
        <button onClick={exportCsv} className={btn.ghost}><Download size={13} /> Export</button>
      </PageHead>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
        <Kpi icon={Inbox} tone="text-sky-600" label="New enquiries" value={t.enquiries} hint={`${t.converted} became deals`} />
        <Kpi icon={Phone} tone="text-blue-600" label="Calls, meetings & messages" value={t.activities} />
        <Kpi label="Quotations sent" value={t.quotesSent} />
        <Kpi icon={Trophy} tone="text-emerald-600" label="Won" value={money(t.wonValue)} hint={`${t.dealsWon} won · ${t.dealsLost} lost`} />
        <Kpi icon={Percent} label="Win rate" value={t.winRate == null ? '—' : `${t.winRate}%`} hint="won ÷ (won + lost)" />
        <Kpi icon={Wallet} tone="text-emerald-600" label="Collected" value={money(t.collected)} />
      </div>

      <div className="grid xl:grid-cols-[1.6fr_1fr] gap-4">
        <div className="bg-white border border-gray-200 rounded overflow-x-auto min-w-0">
          <table className="w-full text-[13px] min-w-[780px]">
            <thead className="text-xs text-gray-500 bg-gray-50"><tr>
              <th className="text-left font-medium px-4 py-2.5">{data.isManager ? 'Salesperson' : 'You'}</th><th className="text-right font-medium px-2 py-2.5">Enquiries</th><th className="text-right font-medium px-2 py-2.5">Touches</th>
              <th className="text-right font-medium px-2 py-2.5">Quotes sent</th><th className="text-right font-medium px-2 py-2.5">Won / lost</th><th className="text-right font-medium px-2 py-2.5">Win rate</th>
              <th className="text-right font-medium px-2 py-2.5">Won value</th><th className="text-right font-medium px-2 py-2.5">Collected</th><th className="text-right font-medium px-4 py-2.5">Open pipeline</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r, i) => (
                <tr key={r.userId}>
                  <td className="px-4 py-2.5"><div className="flex items-center gap-2">{data.isManager && i === 0 && r.wonValue > 0 && <Trophy size={13} className="text-amber-500" />}<span className="font-medium">{r.name}</span></div><div className="text-[11px] text-gray-500">{r.title}{r.overdueFollowups ? <span className="text-red-700"> · {r.overdueFollowups} overdue follow-ups</span> : ''}</div></td>
                  <td className="px-2 py-2.5 text-right tabular-nums">{r.enquiries}<div className="text-[11px] text-gray-500">{r.converted} converted</div></td>
                  <td className="px-2 py-2.5 text-right tabular-nums">{r.activities}<div className="text-[11px] text-gray-500">{r.calls} calls · {r.meetings} meets</div></td>
                  <td className="px-2 py-2.5 text-right tabular-nums">{r.quotesSent}<div className="text-[11px] text-gray-500">{r.quotesAccepted} accepted</div></td>
                  <td className="px-2 py-2.5 text-right tabular-nums">{r.dealsWon} / {r.dealsLost}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums">{r.winRate == null ? '—' : `${r.winRate}%`}{r.cycleDays != null && <div className="text-[11px] text-gray-500">{r.cycleDays}d to close</div>}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums font-medium">{money(r.wonValue)}{r.dealsWon > 0 && <div className="text-[11px] text-gray-500 font-normal">avg {money(r.avgDeal)}</div>}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums">{money(r.collected)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{money(r.pipelineValue)}<div className="text-[11px] text-gray-500">{r.openDeals} deals</div></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={9} className="text-center text-[12.5px] text-gray-500 py-10">No salespeople yet.</td></tr>}
            </tbody>
          </table>
        </div>
        <Card title="Won and collected, last 6 months"><TrendBars data={data.trend} series={[{ key: 'won', label: 'Won (deal value)' }, { key: 'collected', label: 'Collected (payments)' }]} /></Card>
      </div>
      <p className="text-[11.5px] text-gray-500 mt-3">“Touches” are calls, meetings, visits, WhatsApp and emails logged on enquiries and deals. Won value is the accepted quotation total, or the value entered when the deal was marked won.</p>
    </div>
  );
}

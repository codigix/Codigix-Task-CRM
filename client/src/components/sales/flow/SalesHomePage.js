import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Inbox, Briefcase, Trophy, Wallet, AlertTriangle, CalendarClock, FileText, Plus, CheckCircle2, Phone, Video, Mail, MessageCircle, Clock,
  ArrowRight, Receipt, PauseCircle, Target
} from 'lucide-react';
import { useSalesBase, useSalesMeta, money, fmtDate, fmtWhen, btn, CompleteFollowupModal, ymd } from './salesShared';
import { desk, Loading, PageHead, Segmented, Kpi, Card, EmptyNote, TargetBar, TrendBars, HBars, shortMoney } from './deskShared';

/**
 * Sales home: what to do today (follow-ups due, things needing attention), this month's
 * numbers against the target, the pipeline by stage and recent activity. Executives see their
 * own work; managers can switch to the whole team.
 */

const TONE = { red: 'border-l-red-500', amber: 'border-l-amber-500', blue: 'border-l-blue-500', gray: 'border-l-gray-300' };
const TYPE_ICON = { Call: Phone, Meeting: Video, 'Google Meet': Video, Visit: Video, Demo: Video, Email: Mail, WhatsApp: MessageCircle };

export default function SalesHomePage() {
  const navigate = useNavigate();
  const base = useSalesBase();
  const meta = useSalesMeta();
  const [scope, setScope] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);

  const load = useCallback(() => {
    if (!scope) return;
    desk(`/home?scope=${scope}`).then(d => { setData(d); setError(''); }).catch(e => setError(e.message));
  }, [scope]);
  useEffect(() => { load(); }, [load]);
  // Managers start on the team view, everyone else on their own.
  useEffect(() => { if (meta && scope === null) setScope(meta.me?.isManager ? 'team' : 'mine'); }, [meta, scope]);

  if (!data) return <Loading error={error} text="Loading your sales day…" />;
  const k = data.kpis;
  const open = (link) => {
    if (link.lead) navigate(`${base}/enquiry/${link.lead}`);
    else if (link.deal) navigate(`${base}/opportunity/${link.deal}`);
    else if (link.quotation) navigate(`${base}/quotation/${link.quotation}`);
    else if (link.invoice) navigate(`${base}/invoice/${link.invoice}`);
  };
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const pace = now.getDate() / daysInMonth;
  const hello = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const first = String(data.me.name || '').split(' ')[0];

  return (
    <div className="p-5 bg-[#F8FAFC] min-h-screen font-sans text-gray-900">
      <PageHead title={`${hello}${first ? `, ${first}` : ''}`} sub={`${now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} · ${data.scope === 'team' ? 'whole sales team' : 'your enquiries, deals and billing'}`}>
        {data.isManager && <Segmented value={data.scope} onChange={setScope} options={[['mine', 'Mine'], ['team', 'Team']]} />}
        <button onClick={() => navigate(`${base}/pipeline?tab=leads&new=1`)} className={btn.primary}><Plus size={13} /> New enquiry</button>
      </PageHead>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
        <Kpi icon={Inbox} tone="text-sky-600" label="Open enquiries" value={k.openLeads} hint={`${k.newLeadsMonth} new this month`} onClick={() => navigate(`${base}/pipeline?tab=leads`)} />
        <Kpi icon={Briefcase} tone="text-indigo-600" label="Open deals" value={k.openDeals} hint={`${money(k.pipelineValue)} · weighted ${shortMoney(k.weightedValue)}`} onClick={() => navigate(`${base}/pipeline?tab=deals`)} />
        <Kpi icon={FileText} tone="text-blue-600" label="Quotations with client" value={k.quotesAwaitingClient} hint={`${k.quotesToSend} ready to send · ${k.quotesPendingApproval} for approval`} onClick={() => navigate(`${base}/quotes`)} />
        <Kpi icon={Trophy} tone="text-emerald-600" label="Won this month" value={money(k.wonMonthValue)} hint={`${k.wonMonth} won · ${k.lostMonth} lost`} />
        <Kpi icon={Wallet} tone="text-emerald-600" label="Collected this month" value={money(k.collectedMonth)} hint={`${money(k.outstanding)} still to collect`} onClick={() => navigate(`${base}/payments`)} />
        <Kpi icon={AlertTriangle} tone="text-red-600" label="Overdue invoices" value={money(k.overdue)} hint={`${k.overdueCount} invoice${k.overdueCount === 1 ? '' : 's'}`} warn={k.overdue > 0} onClick={() => navigate(`${base}/invoices?status=Overdue`)} />
      </div>

      <div className="grid xl:grid-cols-[1.25fr_1fr] gap-4">
        <div className="space-y-4 min-w-0">
          <Card title={`Today${k.followupsOverdue ? ` · ${k.followupsOverdue} overdue` : ''}`} action={<button onClick={() => navigate(`${base}/agenda`)} className="text-xs text-blue-700 hover:underline cursor-pointer inline-flex items-center gap-1">All follow-ups <ArrowRight size={12} /></button>} pad={false}>
            {data.agenda.length === 0 ? <EmptyNote>Nothing due today. {data.upcoming[0] ? `Next: ${data.upcoming[0].type} with ${data.upcoming[0].name} on ${fmtDate(data.upcoming[0].date)}.` : ''}</EmptyNote> : (
              <ul className="divide-y divide-gray-100">
                {data.agenda.map(a => {
                  const Icon = TYPE_ICON[a.type] || CalendarClock;
                  return (
                    <li key={a.id} className="px-4 py-2.5 flex items-center gap-3">
                      <span className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${a.overdue ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}><Icon size={14} /></span>
                      <button onClick={() => open(a.dealId ? { deal: a.dealId } : { lead: a.leadId })} className="min-w-0 flex-1 text-left cursor-pointer">
                        <div className="text-[13px] font-medium text-gray-900 truncate">{a.type} · {a.name}{a.company && a.company !== a.name ? <span className="text-gray-500 font-normal"> · {a.company}</span> : null}</div>
                        <div className={`text-[11.5px] truncate ${a.overdue ? 'text-red-700' : 'text-gray-500'}`}>{a.overdue ? (a.date < ymd() ? `Overdue since ${fmtDate(a.date)}` : `Was due at ${a.time}`) : `At ${a.time}`}{a.subject ? ` · ${a.subject}` : ''}{data.scope === 'team' && a.owner ? ` · ${a.owner}` : ''}</div>
                      </button>
                      <button onClick={() => setDone(a)} className={btn.ghost}><CheckCircle2 size={13} /> Done</button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card title={`Needs attention${data.attentionTotal > data.attention.length ? ` (${data.attentionTotal})` : ''}`} pad={false}>
            {data.attention.length === 0 ? <EmptyNote>All clear: every enquiry and deal has a next step.</EmptyNote> : (
              <ul className="divide-y divide-gray-100">
                {data.attention.map((a, i) => (
                  <li key={i}><button onClick={() => open(a.link)} className={`w-full text-left px-4 py-2.5 border-l-4 ${TONE[a.tone]} hover:bg-gray-50 cursor-pointer flex items-center gap-2`}>
                    <span className="min-w-0 flex-1"><span className="block text-[13px] text-gray-900 truncate">{a.text}</span>{a.sub && <span className="block text-[11.5px] text-gray-500 truncate">{a.sub}</span>}</span>
                    <ArrowRight size={13} className="text-gray-400 shrink-0" />
                  </button></li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Won and collected, last 6 months">
            <TrendBars data={data.trend} series={[{ key: 'won', label: 'Won (deal value)' }, { key: 'collected', label: 'Collected (payments)' }]} />
          </Card>
        </div>

        <div className="space-y-4 min-w-0">
          <Card title={`${data.scope === 'team' ? 'Team' : 'My'} target · ${now.toLocaleDateString('en-GB', { month: 'long' })}`} action={<Target size={14} className="text-gray-400" />}>
            {data.target ? (
              <div className="space-y-3">
                <TargetBar label="Won value" achieved={k.wonMonthValue} target={data.target.wonValue} format={money} expected={pace} />
                <TargetBar label="Collection" achieved={k.collectedMonth} target={data.target.collection} format={money} expected={pace} />
                <TargetBar label="Deals won" achieved={k.wonMonth} target={data.target.dealsWon} expected={pace} />
                <TargetBar label="New enquiries" achieved={k.newLeadsMonth} target={data.target.enquiries} expected={pace} />
                <TargetBar label="Calls, meetings & messages" achieved={k.activitiesMonth} target={data.target.activities} expected={pace} />
              </div>
            ) : <EmptyNote>No target set for this month.{data.isManager ? <> <button onClick={() => navigate(`${base}/targets`)} className="text-blue-700 hover:underline cursor-pointer">Set targets</button></> : ' Your manager sets it in Targets.'}</EmptyNote>}
          </Card>

          <Card title="Open pipeline by stage" action={<span className="text-[11.5px] text-gray-500">{money(k.pipelineValue)}{k.onHold ? ` · ${k.onHold} on hold` : ''}</span>}>
            <HBars rows={data.funnel} labelKey="stage" valueKey="value" format={money} sub={(r) => `${r.count} deal${r.count === 1 ? '' : 's'}`} empty="No open deals." />
          </Card>

          <Card title="Recent activity" pad={false}>
            {data.recent.length === 0 ? <EmptyNote>No activity yet.</EmptyNote> : (
              <ul className="divide-y divide-gray-100">
                {data.recent.map(e => {
                  const Icon = e.kind === 'payment' ? Wallet : e.kind === 'invoice' ? Receipt : e.kind === 'won' ? Trophy : e.kind === 'hold' ? PauseCircle : /quot|revision|approval/.test(e.kind) ? FileText : e.kind === 'communication' ? MessageCircle : Clock;
                  const link = e.invoiceId ? { invoice: e.invoiceId } : e.quotationId ? { quotation: e.quotationId } : e.dealId ? { deal: e.dealId } : e.leadId ? { lead: e.leadId } : null;
                  return (
                    <li key={e.id}><button disabled={!link} onClick={() => link && open(link)} className="w-full text-left px-4 py-2 flex gap-2.5 hover:bg-gray-50 cursor-pointer disabled:cursor-default">
                      <Icon size={14} className="text-gray-400 mt-0.5 shrink-0" />
                      <span className="min-w-0"><span className="block text-[12.5px] text-gray-900 truncate">{e.title}</span><span className="block text-[11px] text-gray-500 truncate">{[e.name, e.by, fmtWhen(e.at)].filter(Boolean).join(' · ')}</span></span>
                    </button></li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {done && meta && <CompleteFollowupModal meta={meta} followup={done} onClose={() => setDone(null)} onSaved={() => { setDone(null); load(); }} />}
    </div>
  );
}

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Plus, Search, Loader2, LayoutGrid, List, Inbox, Briefcase, CalendarClock, AlertTriangle, FileText, Trophy, Percent, PauseCircle,
  X, CircleDashed
} from 'lucide-react';
import {
  api, useSalesBase, useSalesMeta, money, fmtDate, relDay, isOverdue, Badge, LEAD_STATUS_STYLE, QUOTE_STATUS_STYLE, stageTone,
  Modal, inputCls, labelCls, btn, ErrorNote, ReasonModal, LOST_REASONS, HOLD_REASONS, NextStepFields, addDays
} from './salesShared';
import { SourceFields, ClientIntakeFields, ServicePicker, suggestFormat, FORMAT_INFO, estimateOf, expectedValueOf, RETAINER_MONTHS } from './enquiryShared';

/**
 * Sales pipeline: enquiries (leads) by status and deals by stage, with the figures that matter
 * today. Drag a card to move it; Lost / On Hold / Won ask for what they need.
 */

const LEAD_COLUMNS = ['New', 'Contacted', 'Qualified', 'On Hold', 'Lost'];

const Tile = ({ icon: Icon, label, value, hint, tone = 'text-gray-500', onClick, warn }) => (
  <button type="button" onClick={onClick} disabled={!onClick}
    className={`text-left bg-white border rounded p-3 ${onClick ? 'hover:border-gray-300 cursor-pointer' : 'cursor-default'} ${warn ? 'border-red-200' : 'border-gray-200'}`}>
    <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium"><Icon size={13} className={tone} /> {label}</div>
    <div className={`text-xl font-semibold tabular-nums mt-1 ${warn ? 'text-red-700' : 'text-gray-900'}`}>{value}</div>
    {hint && <div className="text-[11px] text-gray-500 mt-0.5 truncate">{hint}</div>}
  </button>
);

const Section = ({ n, title, hint, children }) => (
  <section className="border border-gray-200 rounded p-3">
    <div className="mb-2.5"><div className="text-[13px] font-semibold text-gray-900"><span className="text-gray-400 mr-1">{n}.</span>{title}</div>{hint && <div className="text-[11.5px] text-gray-500">{hint}</div>}</div>
    {children}
  </section>
);

function NewLeadModal({ meta, onClose, onSaved }) {
  const [f, setF] = useState({
    lead_name: '', contact_designation: '', company: '', phone: '', email: '', gstin: '', address: '', city: '', state: '',
    lead_source: 'Website', source_detail: '', referral_name: '', referral_contact: '',
    services: [], project_name: '', notes: '', timeline: '', value: '', owner_id: ''
  });
  const [valueTouched, setValueTouched] = useState(false);
  const [first, setFirst] = useState({ type: 'Call', date: addDays(0), time: '16:00', subject: 'First call' });
  const [planFirst, setPlanFirst] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const services = meta.services || [];
  // The expected value follows the services picked until it is typed by hand.
  const setServices = (list) => setF(x => ({ ...x, services: list, ...(valueTouched ? {} : { value: list.length ? String(expectedValueOf(list, services)) : '' }) }));
  const format = suggestFormat(f.services, services);
  const save = async () => {
    if (!f.lead_name.trim()) { setError('Enter the contact name.'); return; }
    if (!f.phone.trim() && !f.email.trim()) { setError('Enter a phone number or an email.'); return; }
    if (f.lead_source === 'Referral' && !f.referral_name.trim()) { setError('Who referred this enquiry? Enter the referrer\'s name.'); return; }
    setSaving(true); setError('');
    try {
      const d = await api('/leads', { method: 'POST', body: { ...f, owner_id: f.owner_id || meta.me.id, followup: planFirst ? first : null } });
      onSaved(d.id);
    } catch (e) { setError(e.message); setSaving(false); }
  };
  return (
    <Modal title="New enquiry" onClose={onClose} width="max-w-3xl"
      footer={<><button onClick={onClose} className={btn.ghost}>Cancel</button><button onClick={save} disabled={saving} className={btn.primary}>{saving && <Loader2 size={13} className="animate-spin" />} Save enquiry</button></>}>
      <div className="space-y-3">
        <Section n={1} title="Where did it come from?" hint="Be specific: a referral needs the referrer, an ad needs the campaign, a portal needs its enquiry ID.">
          <SourceFields value={f} onChange={setF} />
        </Section>
        <Section n={2} title="Contact and billing details" hint="These go straight into the quotation's “Bill to”, so the quotation needs no retyping.">
          <ClientIntakeFields value={f} onChange={setF} />
        </Section>
        <Section n={3} title="Requirement" hint="Pick the services asked for. They decide the quotation format and become its first lines.">
          <ServicePicker services={services} value={f.services} onChange={setServices} />
          {f.services.length > 0 && <div className="mt-2 text-[11.5px] text-gray-600">Quotation format: <b>{FORMAT_INFO[format].label}</b> — {FORMAT_INFO[format].why}</div>}
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div><label className={labelCls}>Requirement in one line</label><input value={f.project_name} onChange={e => set('project_name', e.target.value)} placeholder="e.g. Website + GMB for their bakery" className={inputCls} /></div>
            <div><label className={labelCls}>When do they need it?</label><input value={f.timeline} onChange={e => set('timeline', e.target.value)} placeholder="e.g. Live before 1 Dec, start next month" className={inputCls} /></div>
            <div><label className={labelCls}>Expected value (₹)</label><input value={f.value} onChange={e => { setValueTouched(true); set('value', e.target.value.replace(/[^\d.]/g, '')); }} className={inputCls} />
              {!valueTouched && f.services.length > 0 && <p className="text-[10.5px] text-gray-500 mt-0.5">From list prices{estimateOf(f.services, services).monthly > 0 ? ` (monthly × ${RETAINER_MONTHS})` : ''}. Type to change.</p>}</div>
            <div><label className={labelCls}>Budget, scope, anything else</label><input value={f.notes} onChange={e => set('notes', e.target.value)} placeholder="Budget, pages, modules, competitors…" className={inputCls} /></div>
          </div>
        </Section>
        <Section n={4} title="Owner and first contact">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div><label className={labelCls}>Owner</label><select value={f.owner_id} onChange={e => set('owner_id', e.target.value)} className={inputCls}><option value="">Me</option>{meta.people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          </div>
          <label className="flex items-center gap-2 text-[13px] font-medium text-gray-800 cursor-pointer mb-2"><input type="checkbox" checked={planFirst} onChange={e => setPlanFirst(e.target.checked)} /> Schedule the first contact</label>
          {planFirst && <NextStepFields value={first} onChange={setFirst} types={meta.followupTypes} people={meta.people} />}
        </Section>
        <ErrorNote text={error} />
      </div>
    </Modal>
  );
}

export default function SalesPipelinePage() {
  const navigate = useNavigate();
  const base = useSalesBase();
  const meta = useSalesMeta();
  const location = useLocation();
  const [tab, setTab] = useState(() => new URLSearchParams(window.location.search).get('tab') === 'leads' ? 'leads' : 'deals');
  // The sidebar's Enquiries / Deals links switch the tab while the page is open.
  useEffect(() => { const t = new URLSearchParams(location.search).get('tab'); if (t === 'leads' || t === 'deals') setTab(t); }, [location.search]);
  const [view, setView] = useState('board');
  const [scope, setScope] = useState('all');
  const [search, setSearch] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [newLead, setNewLead] = useState(() => new URLSearchParams(window.location.search).get('new') === '1');
  const [drag, setDrag] = useState(null);
  const [dialog, setDialog] = useState(null); // { kind, card, target }
  const [quick, setQuick] = useState('');

  const load = useCallback(() => {
    const p = new URLSearchParams({ scope }); if (search.trim()) p.set('q', search.trim());
    api(`/board?${p}`).then(d => { setData(d); setError(''); }).catch(e => setError(e.message));
  }, [scope, search]);
  useEffect(() => { const t = setTimeout(load, search ? 300 : 0); return () => clearTimeout(t); }, [load, search]);

  const k = data?.kpis;
  const stageNames = useMemo(() => (data?.stages || []).map(s => s.name), [data]);
  const dealColumns = useMemo(() => [...stageNames.filter(s => !/^(won|lost)$/i.test(s)), 'On Hold', ...stageNames.filter(s => /^(won|lost)$/i.test(s))], [stageNames]);

  const leads = useMemo(() => {
    let l = data?.leads || [];
    if (quick === 'noNext') l = l.filter(x => ['New', 'Contacted', 'Qualified'].includes(x.status) && !x.nextFollowup);
    if (quick === 'overdue') l = l.filter(x => x.nextFollowup && isOverdue(x.nextFollowup));
    return l;
  }, [data, quick]);
  const deals = useMemo(() => {
    let l = data?.deals || [];
    if (quick === 'noNext') l = l.filter(x => !x.onHold && !['Won', 'Lost'].includes(x.status) && !x.nextFollowup);
    if (quick === 'overdue') l = l.filter(x => x.nextFollowup && isOverdue(x.nextFollowup));
    return l;
  }, [data, quick]);

  const dealColumnOf = (d) => (d.onHold ? 'On Hold' : d.stage);

  const moveLead = async (card, status) => {
    if (card.status === status) return;
    if (card.dealId) { navigate(`${base}/opportunity/${card.dealId}`); return; }
    if (['Lost', 'On Hold', 'Unqualified'].includes(status)) { setDialog({ kind: 'lead', card, target: status }); return; }
    if (card.status === 'On Hold') await api(`/leads/${card.id}/resume`, { method: 'POST' }).catch(() => { });
    try { await api(`/leads/${card.id}/status`, { method: 'POST', body: { status } }); load(); } catch (e) { setError(e.message); }
  };
  const moveDeal = async (card, column) => {
    if (dealColumnOf(card) === column) return;
    if (column === 'On Hold') { setDialog({ kind: 'dealHold', card }); return; }
    if (/^lost$/i.test(column)) { setDialog({ kind: 'dealLost', card, target: column }); return; }
    if (/^won$/i.test(column)) { setDialog({ kind: 'dealWon', card, target: column }); return; }
    try { await api(`/deals/${card.id}/stage`, { method: 'POST', body: { stage: column } }); load(); } catch (e) { setError(e.message); }
  };

  if (!meta || (!data && !error)) return <div className="min-h-[60vh] flex items-center justify-center gap-2 text-sm text-gray-500"><Loader2 size={16} className="animate-spin" /> Loading pipeline…</div>;

  const LeadCard = ({ c }) => (
    <div draggable onDragStart={() => setDrag({ type: 'lead', card: c })} onDragEnd={() => setDrag(null)} onClick={() => navigate(`${base}/enquiry/${c.id}`)}
      className="bg-white border border-gray-200 rounded p-2.5 cursor-pointer hover:border-blue-300 hover:shadow-sm">
      <div className="text-[13px] font-semibold text-gray-900 truncate">{c.name}</div>
      <div className="text-[11px] text-gray-500 truncate">{[c.company, c.project].filter(Boolean).join(' · ') || c.source || '—'}</div>
      <div className="flex items-center justify-between mt-1.5 text-[11px]">
        <span className="text-gray-700 font-medium">{c.value ? money(c.value) : ''}</span>
        <span className="text-gray-400 truncate ml-2">{c.owner}</span>
      </div>
      {c.status === 'On Hold' ? <div className="mt-1.5 text-[11px] text-amber-800 flex items-center gap-1"><PauseCircle size={11} /> until {fmtDate(c.holdUntil)}</div>
        : c.status === 'Lost' ? <div className="mt-1.5 text-[11px] text-red-700 truncate">{c.lostReason}</div>
          : c.nextFollowup ? <div className={`mt-1.5 text-[11px] flex items-center gap-1 ${isOverdue(c.nextFollowup) ? 'text-red-700 font-medium' : 'text-gray-600'}`}><CalendarClock size={11} /> {relDay(c.nextFollowup)}</div>
            : <div className="mt-1.5 text-[11px] text-orange-700 flex items-center gap-1"><AlertTriangle size={11} /> No next step</div>}
    </div>
  );
  const DealCard = ({ c }) => (
    <div draggable onDragStart={() => setDrag({ type: 'deal', card: c })} onDragEnd={() => setDrag(null)} onClick={() => navigate(`${base}/opportunity/${c.id}`)}
      className="bg-white border border-gray-200 rounded p-2.5 cursor-pointer hover:border-blue-300 hover:shadow-sm">
      <div className="text-[13px] font-semibold text-gray-900 truncate">{c.name}</div>
      <div className="text-[11px] text-gray-500 truncate">{c.company || '—'}</div>
      <div className="flex items-center justify-between mt-1.5 text-[11px]">
        <span className="text-gray-900 font-semibold">{money(c.status === 'Won' && c.wonValue ? c.wonValue : c.value)}</span>
        <span className="text-gray-400 truncate ml-2">{c.owner}</span>
      </div>
      {c.quotation && <div className="mt-1.5 flex items-center gap-1 text-[11px]"><FileText size={11} className="text-gray-400" /><span className="text-gray-600 truncate">{c.quotation.number}</span><Badge text={c.quotation.status} tone={QUOTE_STATUS_STYLE[c.quotation.status]} /></div>}
      {c.onHold ? <div className="mt-1.5 text-[11px] text-amber-800 flex items-center gap-1"><PauseCircle size={11} /> until {fmtDate(c.holdUntil)}</div>
        : c.status === 'Lost' ? <div className="mt-1.5 text-[11px] text-red-700 truncate">{c.lostReason}</div>
          : c.status === 'Won' ? <div className="mt-1.5 text-[11px] text-emerald-700">Won {fmtDate(c.closedAt)}</div>
            : c.nextFollowup ? <div className={`mt-1.5 text-[11px] flex items-center gap-1 ${isOverdue(c.nextFollowup) ? 'text-red-700 font-medium' : 'text-gray-600'}`}><CalendarClock size={11} /> {relDay(c.nextFollowup)}</div>
              : <div className="mt-1.5 text-[11px] text-orange-700 flex items-center gap-1"><AlertTriangle size={11} /> No next step</div>}
    </div>
  );
  const Column = ({ title, count, value, tone, onDrop, children, wide }) => (
    <div onDragOver={e => { if (drag) e.preventDefault(); }} onDrop={e => { e.preventDefault(); onDrop(); setDrag(null); }}
      className={`${wide ? 'w-72' : 'w-64'} shrink-0 rounded-xl bg-gray-100/70 border border-gray-200 flex flex-col max-h-[calc(100vh-330px)] ${drag ? 'ring-1 ring-blue-200' : ''}`}>
      <div className="px-3 py-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 min-w-0"><Badge text={title} tone={tone} /><span className="text-[11px] text-gray-500 tabular-nums">{count}</span></span>
        {value != null && <span className="text-[11px] text-gray-600 font-medium tabular-nums">{money(value)}</span>}
      </div>
      <div className="px-2 pb-2 space-y-2 overflow-y-auto flex-1">{children}</div>
    </div>
  );

  return (
    <div className="p-5 bg-[#F8FAFC] min-h-screen font-sans text-gray-900">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h1 className="text-[20px] font-semibold">Sales pipeline</h1>
          <p className="text-[12px] text-gray-500 mt-0.5">Enquiry → contact → qualify → deal → quotation → negotiation → won, lost or on hold.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded p-0.5">
            {[['all', 'Team'], ['mine', 'Mine']].map(([kk, l]) => <button key={kk} onClick={() => setScope(kk)} className={`px-2.5 h-7 text-xs font-medium rounded cursor-pointer ${scope === kk ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{l}</button>)}
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, company, phone" className="h-8 w-56 pl-8 pr-2 text-xs border border-gray-300 rounded outline-none focus:border-blue-500 bg-white" />
          </div>
          <button onClick={() => setNewLead(true)} className={btn.primary}><Plus size={14} /> New enquiry</button>
        </div>
      </div>

      {k && (
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3 mb-4">
          <Tile icon={Inbox} tone="text-sky-600" label="Open enquiries" value={k.openLeads} hint={`${k.newLeadsWeek} new this week`} onClick={() => setTab('leads')} />
          <Tile icon={Briefcase} tone="text-indigo-600" label="Open deals" value={k.openDeals} hint={`${money(k.pipelineValue)} · weighted ${money(k.weightedValue)}`} onClick={() => setTab('deals')} />
          <Tile icon={CalendarClock} tone="text-blue-600" label="Follow-ups today" value={k.followupsToday} onClick={() => navigate(`${base}/agenda`)} />
          <Tile icon={AlertTriangle} tone="text-red-600" label="Overdue follow-ups" value={k.followupsOverdue} warn={k.followupsOverdue > 0} onClick={() => setQuick(q => (q === 'overdue' ? '' : 'overdue'))} />
          <Tile icon={CircleDashed} tone="text-orange-600" label="No next step" value={k.noNextStep} hint="Open, nothing scheduled" warn={k.noNextStep > 0} onClick={() => setQuick(q => (q === 'noNext' ? '' : 'noNext'))} />
          <Tile icon={FileText} tone="text-violet-600" label="Quotations" value={k.quotesAwaitingClient} hint={`awaiting client · ${k.quotesPendingApproval} need approval`} onClick={() => navigate(`${base}/quotes`)} />
          <Tile icon={Trophy} tone="text-emerald-600" label="Won this month" value={money(k.wonMonthValue)} hint={`${k.wonMonth} deal${k.wonMonth === 1 ? '' : 's'}`} />
          <Tile icon={Percent} tone="text-gray-600" label="Win rate (90 days)" value={k.winRate == null ? '—' : `${k.winRate}%`} hint={`${k.onHold} on hold`} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex gap-1 border-b border-gray-200">
          {[['leads', `Enquiries (${data?.leads?.length || 0})`], ['deals', `Deals (${data?.deals?.length || 0})`]].map(([kk, l]) => (
            <button key={kk} onClick={() => setTab(kk)} className={`px-3 py-2 text-[13px] font-medium -mb-px border-b-2 cursor-pointer ${tab === kk ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>{l}</button>
          ))}
        </div>
        {quick && <button onClick={() => setQuick('')} className="h-7 px-2.5 text-xs rounded bg-gray-900 text-white flex items-center gap-1 cursor-pointer">{quick === 'overdue' ? 'Overdue follow-ups' : 'No next step'} <X size={11} /></button>}
        <div className="ml-auto flex items-center gap-0.5 bg-white border border-gray-200 rounded p-0.5">
          <button onClick={() => setView('board')} className={`p-1.5 rounded cursor-pointer ${view === 'board' ? 'bg-gray-900 text-white' : 'text-gray-500'}`} title="Board"><LayoutGrid size={14} /></button>
          <button onClick={() => setView('list')} className={`p-1.5 rounded cursor-pointer ${view === 'list' ? 'bg-gray-900 text-white' : 'text-gray-500'}`} title="List"><List size={14} /></button>
        </div>
      </div>

      <ErrorNote text={error} />

      {tab === 'leads' && view === 'board' && (
        <div className="flex gap-3 overflow-x-auto pb-3">
          {LEAD_COLUMNS.map(col => {
            const cards = leads.filter(l => (col === 'Lost' ? ['Lost', 'Unqualified'].includes(l.status) : l.status === col));
            return (
              <Column key={col} title={col} count={cards.length} value={cards.reduce((s, c) => s + c.value, 0)} tone={LEAD_STATUS_STYLE[col]} onDrop={() => drag?.type === 'lead' && moveLead(drag.card, col)}>
                {cards.map(c => <LeadCard key={c.id} c={c} />)}
                {col === 'Qualified' && cards.length > 0 && <div className="text-[10px] text-gray-500 px-1">Open a qualified enquiry and use “Convert to deal”.</div>}
              </Column>
            );
          })}
          <Column title="Converted to deal" count={leads.filter(l => l.status === 'Converted to Deal').length} tone={LEAD_STATUS_STYLE['Converted to Deal']} onDrop={() => { }}>
            {leads.filter(l => l.status === 'Converted to Deal').slice(0, 30).map(c => (
              <button key={c.id} onClick={() => navigate(`${base}/opportunity/${c.dealId}`)} className="w-full text-left bg-white border border-gray-200 rounded p-2 hover:border-violet-300 cursor-pointer">
                <div className="text-[12px] font-medium text-gray-800 truncate">{c.name}</div><div className="text-[11px] text-violet-700">Open deal →</div>
              </button>
            ))}
          </Column>
        </div>
      )}

      {tab === 'deals' && view === 'board' && (
        <div className="flex gap-3 overflow-x-auto pb-3">
          {dealColumns.map(col => {
            const cards = deals.filter(d => dealColumnOf(d) === col);
            return (
              <Column key={col} title={col} count={cards.length} value={cards.reduce((s, c) => s + (c.status === 'Won' && c.wonValue ? Number(c.wonValue) : c.value), 0)} tone={stageTone(col, col === 'On Hold' ? 'On Hold' : null)} onDrop={() => drag?.type === 'deal' && moveDeal(drag.card, col)}>
                {cards.map(c => <DealCard key={c.id} c={c} />)}
              </Column>
            );
          })}
        </div>
      )}

      {view === 'list' && (
        <div className="bg-white border border-gray-200 rounded overflow-x-auto">
          <table className="w-full text-[13px] min-w-[900px]">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-600"><tr>
              <th className="text-left font-medium px-3 py-2.5">{tab === 'leads' ? 'Enquiry' : 'Deal'}</th>
              <th className="text-left font-medium px-3 py-2.5">{tab === 'leads' ? 'Status' : 'Stage'}</th>
              <th className="text-right font-medium px-3 py-2.5">Value</th>
              <th className="text-left font-medium px-3 py-2.5">Next step</th>
              <th className="text-left font-medium px-3 py-2.5">Last contact</th>
              {tab === 'deals' && <th className="text-left font-medium px-3 py-2.5">Quotation</th>}
              <th className="text-left font-medium px-3 py-2.5">Owner</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {(tab === 'leads' ? leads : deals).map(c => (
                <tr key={c.id} onClick={() => navigate(tab === 'leads' ? (c.dealId ? `${base}/opportunity/${c.dealId}` : `${base}/enquiry/${c.id}`) : `${base}/opportunity/${c.id}`)} className="hover:bg-blue-50/40 cursor-pointer">
                  <td className="px-3 py-2"><div className="font-medium text-gray-900">{c.name}</div><div className="text-[11px] text-gray-500">{c.company || c.source || ''}</div></td>
                  <td className="px-3 py-2">{tab === 'leads' ? <Badge text={c.status} tone={LEAD_STATUS_STYLE[c.status]} /> : <Badge text={c.onHold ? 'On Hold' : c.stage} tone={stageTone(c.stage, c.status)} />}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{money(c.wonValue || c.value)}</td>
                  <td className={`px-3 py-2 text-[12px] ${c.nextFollowup && isOverdue(c.nextFollowup) ? 'text-red-700 font-medium' : 'text-gray-700'}`}>{c.nextFollowup ? relDay(c.nextFollowup) : <span className="text-orange-700">—</span>}</td>
                  <td className="px-3 py-2 text-[12px] text-gray-600">{c.lastContact ? fmtDate(c.lastContact) : '—'}</td>
                  {tab === 'deals' && <td className="px-3 py-2">{c.quotation ? <Badge text={`${c.quotation.number} · ${c.quotation.status}`} tone={QUOTE_STATUS_STYLE[c.quotation.status]} /> : <span className="text-gray-300">—</span>}</td>}
                  <td className="px-3 py-2 text-[12px] text-gray-600">{c.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {newLead && <NewLeadModal meta={meta} onClose={() => setNewLead(false)} onSaved={(id) => { setNewLead(false); navigate(`${base}/enquiry/${id}`); }} />}
      {dialog?.kind === 'lead' && (
        <ReasonModal title={`${dialog.target === 'On Hold' ? 'Put on hold' : `Mark as ${dialog.target}`}: ${dialog.card.name}`} needDate={dialog.target === 'On Hold'}
          presets={dialog.target === 'On Hold' ? HOLD_REASONS : LOST_REASONS} confirmText={dialog.target === 'On Hold' ? 'Put on hold' : `Mark ${dialog.target}`} tone={dialog.target === 'On Hold' ? 'primary' : 'danger'}
          onClose={() => setDialog(null)} onConfirm={async ({ reason, date }) => { await api(`/leads/${dialog.card.id}/status`, { method: 'POST', body: { status: dialog.target, reason, holdUntil: date } }); setDialog(null); load(); }} />
      )}
      {dialog?.kind === 'dealHold' && (
        <ReasonModal title={`Put on hold: ${dialog.card.name}`} needDate presets={HOLD_REASONS} confirmText="Put on hold"
          onClose={() => setDialog(null)} onConfirm={async ({ reason, date }) => { await api(`/deals/${dialog.card.id}/hold`, { method: 'POST', body: { reason, until: date } }); setDialog(null); load(); }} />
      )}
      {dialog?.kind === 'dealLost' && (
        <ReasonModal title={`Deal lost: ${dialog.card.name}`} presets={LOST_REASONS} confirmText="Mark lost" tone="danger" reasonLabel="Why was it lost?"
          onClose={() => setDialog(null)} onConfirm={async ({ reason }) => { await api(`/deals/${dialog.card.id}/stage`, { method: 'POST', body: { stage: dialog.target, reason } }); setDialog(null); load(); }} />
      )}
      {dialog?.kind === 'dealWon' && <WonModal card={dialog.card} target={dialog.target} onClose={() => setDialog(null)} onDone={() => { setDialog(null); load(); }} />}
    </div>
  );
}

export function WonModal({ card, target = 'Won', onClose, onDone }) {
  const accepted = card.quotation && card.quotation.status === 'Accepted' ? card.quotation.total : null;
  const [value, setValue] = useState(String(Math.round(accepted || card.value || 0)));
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true); setError('');
    try { await api(`/deals/${card.id}/stage`, { method: 'POST', body: { stage: target, wonValue: Number(value), reason: note } }); onDone(); } catch (e) { setError(e.message); setSaving(false); }
  };
  return (
    <Modal title={`Deal won: ${card.name}`} onClose={onClose} width="max-w-md"
      footer={<><button onClick={onClose} className={btn.ghost}>Cancel</button><button onClick={save} disabled={saving} className={btn.green}><Trophy size={13} /> Mark won</button></>}>
      <div className="space-y-3">
        <div><label className={labelCls}>Final value (₹)</label><input value={value} onChange={e => setValue(e.target.value.replace(/[^\d.]/g, ''))} className={inputCls} />
          {accepted ? <p className="text-[11px] text-gray-500 mt-1">From the accepted quotation ({money(accepted)}).</p> : null}</div>
        <div><label className={labelCls}>Note</label><input value={note} onChange={e => setNote(e.target.value)} placeholder="PO received, advance paid…" className={inputCls} /></div>
        <ErrorNote text={error} />
      </div>
    </Modal>
  );
}


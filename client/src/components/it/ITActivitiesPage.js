import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Search, ChevronDown, ChevronLeft, ChevronRight, Activity, X, ExternalLink, Loader2,
  PlusCircle, ArrowRightLeft, UserCheck, CalendarClock, Timer, Pencil, MessageSquare, Hourglass
} from 'lucide-react';
import { API_BASE_URL } from '../../config/environment';

/**
 * Activity stream: who did what to which work item. Everything is filtered and paged on the
 * server (GET /it-kanban/activities); the KPIs compare the chosen range with the same-length
 * period just before it.
 */

const KIND_STYLE = {
  Created: { icon: PlusCircle, tone: 'text-emerald-700 bg-emerald-50', label: 'Created' },
  Status: { icon: ArrowRightLeft, tone: 'text-blue-700 bg-blue-50', label: 'Status' },
  Assignment: { icon: UserCheck, tone: 'text-violet-700 bg-violet-50', label: 'Assignment' },
  Dates: { icon: CalendarClock, tone: 'text-amber-800 bg-amber-50', label: 'Dates' },
  'Planned time': { icon: Hourglass, tone: 'text-orange-700 bg-orange-50', label: 'Planned time' },
  Edited: { icon: Pencil, tone: 'text-gray-700 bg-gray-100', label: 'Edited' },
  Comment: { icon: MessageSquare, tone: 'text-pink-700 bg-pink-50', label: 'Comment' },
  'Time logged': { icon: Timer, tone: 'text-teal-700 bg-teal-50', label: 'Time logged' }
};
const KPI_KINDS = ['Created', 'Status', 'Assignment', 'Dates', 'Time logged'];

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return ymd(d); };
const PRESETS = [
  { key: 'today', label: 'Today', range: () => [daysAgo(0), daysAgo(0)] },
  { key: 'yesterday', label: 'Yesterday', range: () => [daysAgo(1), daysAgo(1)] },
  { key: '7d', label: 'Last 7 days', range: () => [daysAgo(6), daysAgo(0)] },
  { key: '30d', label: 'Last 30 days', range: () => [daysAgo(29), daysAgo(0)] },
  { key: 'month', label: 'This month', range: () => { const d = new Date(); return [ymd(new Date(d.getFullYear(), d.getMonth(), 1)), daysAgo(0)]; } },
  { key: 'all', label: 'All time', range: () => [null, null] },
  { key: 'custom', label: 'Custom…', range: null }
];

const dayHeading = (iso) => {
  const k = ymd(new Date(iso));
  if (k === daysAgo(0)) return 'Today';
  if (k === daysAgo(1)) return 'Yesterday';
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};
const timeOf = (iso) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const fmtDate = (v) => (v ? new Date(`${String(v).slice(0, 10)}T12:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const initials = (n) => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');
const isDateValue = (v) => /^\d{4}-\d{2}-\d{2}/.test(String(v || ''));
const showValue = (v) => (v == null || v === '' ? 'none' : isDateValue(v) ? fmtDate(v) : v);

const Avatar = ({ name, size = 'w-7 h-7 text-[10px]' }) => (
  <span className={`${size} rounded bg-gray-200 text-gray-700 font-semibold flex items-center justify-center shrink-0`} title={name}>{initials(name)}</span>
);

const ValueChange = ({ from, to }) => (
  <span className="inline-flex items-center gap-1 flex-wrap">
    {from != null && <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 line-through decoration-gray-400 max-w-[220px] truncate" title={String(from)}>{showValue(from)}</span>}
    {from != null && <span className="text-gray-400">→</span>}
    <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 max-w-[220px] truncate" title={String(to ?? '')}>{showValue(to)}</span>
  </span>
);

export default function ITActivitiesPage() {
  const navigate = useNavigate();
  const { designation, username } = useParams();
  const [department, setDepartment] = useState('All');
  const [preset, setPreset] = useState('7d');
  const [custom, setCustom] = useState({ from: daysAgo(6), to: daysAgo(0) });
  const [kind, setKind] = useState('');
  const [person, setPerson] = useState('');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ loading: true, error: '', data: null });
  const [selected, setSelected] = useState(null);

  // Search waits for typing to pause.
  useEffect(() => { const t = setTimeout(() => setQ(search.trim()), 300); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [department, preset, custom, kind, person, q]);

  const [from, to] = useMemo(() => {
    if (preset === 'custom') return [custom.from, custom.to];
    return PRESETS.find(p => p.key === preset).range();
  }, [preset, custom]);

  const load = useCallback(() => {
    setState(s => ({ ...s, loading: true, error: '' }));
    const params = new URLSearchParams({ department, page: String(page), pageSize: '50' });
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (kind) params.set('kind', kind);
    if (person) params.set('user', person);
    if (q) params.set('q', q);
    fetch(`${API_BASE_URL}/it-kanban/activities?${params}`)
      .then(async r => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'Could not load the activity stream'); return d; })
      .then(d => setState({ loading: false, error: '', data: d }))
      .catch(e => setState({ loading: false, error: e.message, data: null }));
  }, [department, page, from, to, kind, person, q]);

  useEffect(() => { load(); }, [load]);

  const data = state.data;
  const k = data?.kpis;
  const rows = useMemo(() => data?.rows || [], [data]);
  const withHeadings = useMemo(() => {
    const out = []; let last = null;
    rows.forEach(r => { const h = dayHeading(r.at); if (h !== last) { out.push({ heading: h }); last = h; } out.push(r); });
    return out;
  }, [rows]);

  const boardBase = window.location.pathname.split('/')[1] || 'it';
  const openOnBoard = (key) => navigate(`/${boardBase}/${designation}/${username}/kanban?ticketKey=${encodeURIComponent(key)}`);

  const change = (cur, prev) => {
    if (prev == null) return null;
    if (prev === 0) return cur ? { text: 'new', up: true } : null;
    const p = Math.round(((cur - prev) / prev) * 100);
    return { text: `${p > 0 ? '+' : ''}${p}%`, up: p >= 0 };
  };

  return (
    <div className="bg-[#f8fafc] min-h-screen p-6 font-sans text-gray-900">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h1 className="text-[22px] font-semibold leading-tight">Activity Stream</h1>
          <p className="text-sm text-gray-500 mt-1">Who created, moved, reassigned, rescheduled or logged time on which work item.</p>
        </div>
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded p-0.5">
          {['All', ...(data?.departments?.length ? data.departments : ['IT', 'Marketing'])].map(d => (
            <button key={d} onClick={() => setDepartment(d)}
              className={`px-3 h-7 text-xs font-medium rounded cursor-pointer ${department === d ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
              {d === 'All' ? 'All departments' : d}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs: click one to show just that kind */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
        {[{ key: '', label: 'All activity', value: k?.total, prev: k?.previousTotal, icon: Activity, tone: 'text-gray-700 bg-gray-100' },
        ...KPI_KINDS.map(kk => ({ key: kk, label: kk === 'Created' ? 'Tasks created' : kk === 'Status' ? 'Status changes' : kk === 'Assignment' ? 'Assignments' : kk === 'Dates' ? 'Date changes' : 'Time logs', value: k?.byKind?.[kk], prev: k?.previousByKind?.[kk], icon: KIND_STYLE[kk].icon, tone: KIND_STYLE[kk].tone }))
        ].map(t => {
          const c = k ? change(t.value || 0, t.prev) : null;
          const Icon = t.icon;
          return (
            <button key={t.label} onClick={() => setKind(kind === t.key ? '' : t.key)}
              className={`text-left bg-white border rounded p-3 cursor-pointer transition ${kind === t.key && (t.key || !kind) ? 'border-blue-400 ring-1 ring-blue-200' : 'border-gray-200 hover:border-gray-300'}`}>
              <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium">
                <span className={`w-6 h-6 rounded flex items-center justify-center ${t.tone}`}><Icon size={13} /></span>{t.label}
              </div>
              <div className="text-2xl font-semibold tabular-nums mt-1.5">{k ? (t.value || 0).toLocaleString('en-IN') : '–'}</div>
              <div className="text-[11px] mt-0.5 h-4">
                {c ? <span className={c.up ? 'text-emerald-700' : 'text-red-700'}>{c.text} <span className="text-gray-400">vs previous {preset === 'today' || preset === 'yesterday' ? 'day' : 'period'}</span></span>
                  : <span className="text-gray-400">{k && t.key === '' ? `${k.people} people · ${k.tasksTouched} tasks` : ''}</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search person, task key, title, project…"
            className="w-full h-8 pl-9 pr-8 bg-white border border-gray-300 rounded text-xs outline-none focus:border-blue-500" />
          {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer" aria-label="Clear search"><X size={13} /></button>}
        </div>
        <div className="relative">
          <select value={preset} onChange={e => setPreset(e.target.value)} className="h-8 pl-2.5 pr-7 bg-white border border-gray-300 rounded text-xs appearance-none cursor-pointer outline-none focus:border-blue-500">
            {PRESETS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
          <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        {preset === 'custom' && (
          <div className="flex items-center gap-1 text-xs">
            <input type="date" value={custom.from} max={custom.to} onChange={e => e.target.value && setCustom(c => ({ ...c, from: e.target.value }))} className="h-8 px-2 bg-white border border-gray-300 rounded" />
            <span className="text-gray-400">to</span>
            <input type="date" value={custom.to} min={custom.from} max={daysAgo(0)} onChange={e => e.target.value && setCustom(c => ({ ...c, to: e.target.value }))} className="h-8 px-2 bg-white border border-gray-300 rounded" />
          </div>
        )}
        <div className="relative">
          <select value={kind} onChange={e => setKind(e.target.value)} className="h-8 pl-2.5 pr-7 bg-white border border-gray-300 rounded text-xs appearance-none cursor-pointer outline-none focus:border-blue-500">
            <option value="">All kinds</option>
            {(data?.kinds || Object.keys(KIND_STYLE)).map(x => <option key={x} value={x}>{x}</option>)}
          </select>
          <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select value={person} onChange={e => setPerson(e.target.value)} className="h-8 pl-2.5 pr-7 bg-white border border-gray-300 rounded text-xs appearance-none cursor-pointer outline-none focus:border-blue-500 max-w-[200px]">
            <option value="">Everyone</option>
            {(data?.users || []).map(u => <option key={u} value={u}>{u}</option>)}
            {person && !(data?.users || []).includes(person) && <option value={person}>{person}</option>}
          </select>
          <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        {(kind || person || search || preset !== '7d' || department !== 'All') && (
          <button onClick={() => { setKind(''); setPerson(''); setSearch(''); setPreset('7d'); setDepartment('All'); }} className="h-8 px-2.5 text-xs text-gray-600 hover:text-gray-900 cursor-pointer">Reset</button>
        )}
        {state.loading && <Loader2 size={15} className="animate-spin text-gray-400" />}
      </div>

      {state.error && <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">{state.error}</div>}

      <div className="flex gap-4 items-start">
        {/* Stream */}
        <div className={`flex-1 min-w-0 bg-white border border-gray-200 rounded ${state.loading && data ? 'opacity-60' : ''}`}>
          {!data && state.loading && <div className="py-20 flex items-center justify-center gap-2 text-sm text-gray-400"><Loader2 size={15} className="animate-spin" /> Loading…</div>}
          {data && rows.length === 0 && (
            <div className="py-16 text-center text-sm text-gray-500">No activity matches these filters.{preset !== 'all' && <> <button onClick={() => setPreset('all')} className="text-blue-600 hover:underline cursor-pointer">Look at all time</button></>}</div>
          )}
          {withHeadings.map((r, idx) => {
            if (r.heading) return <div key={`h-${r.heading}-${idx}`} className="px-4 py-1.5 text-[11px] font-semibold text-gray-500 bg-gray-50 border-b border-gray-100 sticky top-0">{r.heading}</div>;
            const style = KIND_STYLE[r.kind] || KIND_STYLE.Edited;
            const Icon = style.icon;
            const isSel = selected?.id === r.id;
            return (
              <div key={r.id} onClick={() => setSelected(r)}
                className={`flex gap-3 px-4 py-2.5 border-b border-gray-100 last:border-0 cursor-pointer ${isSel ? 'bg-blue-50/60' : 'hover:bg-gray-50'}`}>
                <span className={`w-7 h-7 rounded flex items-center justify-center shrink-0 ${style.tone}`}><Icon size={14} /></span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-gray-800 leading-snug">
                    <span className="font-semibold text-gray-900">{r.by}</span>{' '}{r.text}{' '}
                    {!r.group && <><span className="font-mono text-[11px] text-gray-500">{r.issueKey}</span>{r.issue?.title && <span className="text-gray-700"> · {r.issue.title}</span>}</>}
                  </div>
                  {(r.kind !== 'Created' && r.kind !== 'Time logged' && (r.from != null || r.to != null)) && (
                    <div className="text-[11px] mt-1"><ValueChange from={r.from} to={r.to} /></div>
                  )}
                  {r.kind === 'Time logged' && r.note && <div className="text-[11px] text-gray-500 mt-0.5 truncate">“{r.note}”</div>}
                  {r.issue?.project && !r.group && <div className="text-[11px] text-gray-500 mt-0.5 truncate">{r.issue.project}</div>}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[11px] text-gray-500 tabular-nums">{timeOf(r.at)}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${style.tone}`}>{style.label}</span>
                </div>
              </div>
            );
          })}
          {data && data.total > 0 && (
            <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-600">
              <span>Showing {((data.page - 1) * data.pageSize + 1).toLocaleString('en-IN')}–{Math.min(data.page * data.pageSize, data.total).toLocaleString('en-IN')} of {data.total.toLocaleString('en-IN')}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={data.page <= 1} className="h-7 w-7 flex items-center justify-center rounded border border-gray-300 bg-white disabled:opacity-40 cursor-pointer" aria-label="Previous page"><ChevronLeft size={14} /></button>
                <span className="px-2 tabular-nums">Page {data.page} of {data.pages}</span>
                <button onClick={() => setPage(p => Math.min(data.pages, p + 1))} disabled={data.page >= data.pages} className="h-7 w-7 flex items-center justify-center rounded border border-gray-300 bg-white disabled:opacity-40 cursor-pointer" aria-label="Next page"><ChevronRight size={14} /></button>
              </div>
            </div>
          )}
        </div>

        {/* Details */}
        {selected && (
          <aside className="w-[340px] shrink-0 bg-white border border-gray-200 rounded sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Activity details</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-700 cursor-pointer" aria-label="Close"><X size={16} /></button>
            </div>
            <div className="p-4 space-y-4 text-xs">
              <div className="flex items-center gap-2">
                <Avatar name={selected.by} />
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900 truncate">{selected.by}</div>
                  <div className="text-gray-500">{new Date(selected.at).toLocaleString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>

              <dl className="grid grid-cols-[96px_1fr] gap-y-2">
                <dt className="text-gray-500">What</dt><dd className="text-gray-900 capitalize">{selected.text}</dd>
                {selected.field && selected.kind !== 'Time logged' && <><dt className="text-gray-500">Change</dt><dd><ValueChange from={selected.from} to={selected.to} /></dd></>}
                {selected.kind === 'Time logged' && <><dt className="text-gray-500">Time</dt><dd className="text-gray-900">{selected.to}</dd></>}
                {selected.note && <><dt className="text-gray-500">Note</dt><dd className="text-gray-700">{selected.note}</dd></>}
              </dl>

              {selected.group ? (
                <div>
                  <div className="font-semibold text-gray-900 mb-2">{selected.count} tasks created</div>
                  <div className="border border-gray-200 rounded divide-y divide-gray-100 max-h-80 overflow-y-auto">
                    {selected.group.map(g => (
                      <button key={g.key} onClick={() => openOnBoard(g.key)} className="w-full text-left px-2.5 py-1.5 hover:bg-gray-50 cursor-pointer">
                        <div className="font-mono text-[10px] text-gray-500">{g.key}{g.project ? ` · ${g.project}` : ''}</div>
                        <div className="text-gray-800 truncate">{g.title}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="pt-3 border-t border-gray-100">
                  <div className="font-mono text-[11px] text-gray-500">{selected.issueKey}</div>
                  <div className="font-semibold text-gray-900 mt-0.5 mb-3 leading-snug">{selected.issue?.title || 'This work item no longer exists'}</div>
                  {selected.issue?.title && (
                    <dl className="grid grid-cols-[96px_1fr] gap-y-2">
                      <dt className="text-gray-500">Status now</dt><dd className="text-gray-900">{selected.issue.status || '—'}</dd>
                      <dt className="text-gray-500">Assignee</dt><dd className="text-gray-900">{selected.issue.assignee || 'Unassigned'}</dd>
                      <dt className="text-gray-500">Priority</dt><dd className="text-gray-900">{selected.issue.priority || '—'}</dd>
                      <dt className="text-gray-500">Due</dt><dd className="text-gray-900">{fmtDate(selected.issue.due)}</dd>
                      <dt className="text-gray-500">Project</dt><dd className="text-gray-900">{selected.issue.project || '—'}</dd>
                      <dt className="text-gray-500">Sprint</dt><dd className="text-gray-900">{selected.issue.sprint || 'Backlog'}</dd>
                      <dt className="text-gray-500">Department</dt><dd className="text-gray-900">{selected.issue.department || '—'}</dd>
                      {selected.issue.labels?.length > 0 && <><dt className="text-gray-500">Labels</dt><dd className="flex flex-wrap gap-1">{selected.issue.labels.map(l => <span key={l} className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px] uppercase tracking-wide">{l}</span>)}</dd></>}
                    </dl>
                  )}
                  <div className="flex gap-2 mt-4">
                    {selected.issue?.title && (
                      <button onClick={() => openOnBoard(selected.issueKey)} className="flex-1 h-8 flex items-center justify-center gap-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer">
                        Open on board <ExternalLink size={12} />
                      </button>
                    )}
                    <button onClick={() => { setSearch(selected.issueKey); setKind(''); setPerson(''); setPreset('all'); }} className="flex-1 h-8 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer">
                      Full history
                    </button>
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import { ChevronLeft, ChevronRight, ChevronDown, Download, Loader2, PauseCircle, AlertTriangle, CheckCircle2, Clock, ListTodo, Sparkles, Timer, CalendarClock, UserX, Eye } from 'lucide-react';
import { API_BASE_URL } from '../../config/environment';

/**
 * End-of-day report: for one day, each person's work due that day and where it stood when
 * the day ended. Past days are rebuilt from the status history on the server.
 */

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const shift = (day, n) => { const d = new Date(`${day}T12:00:00`); d.setDate(d.getDate() + n); return ymd(d); };
const longDay = (day) => new Date(`${day}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const shortDay = (day) => (day ? new Date(`${day}T12:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—');
const pct = (a, b) => (b ? Math.round((a / b) * 100) : null);

const BUCKETS = {
  remaining: { label: 'Remaining', chip: 'bg-blue-50 text-blue-800 ring-blue-200' },
  overdue: { label: 'Overdue', chip: 'bg-red-50 text-red-700 ring-red-200' },
  hold: { label: 'On hold', chip: 'bg-slate-100 text-slate-700 ring-slate-300' },
  upcoming: { label: 'Upcoming', chip: 'bg-amber-50 text-amber-800 ring-amber-200' },
  review: { label: 'In review', chip: 'bg-purple-50 text-purple-800 ring-purple-200' },
  done: { label: 'Done', chip: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  extraDone: { label: 'Extra done', chip: 'bg-violet-50 text-violet-800 ring-violet-200' },
  toReview: { label: 'To review', chip: 'bg-orange-50 text-orange-800 ring-orange-200' },
  approved: { label: 'Approved', chip: 'bg-teal-50 text-teal-800 ring-teal-200' }
};

// In Review means the assignee has finished and the reporting manager has to check it and
// move it to Done. So it counts as completed for the assignee and as "To review" for the
// reporter until they approve it.
const COLS = [
  { key: 'due', label: 'Due today', title: 'Work scheduled for this day' },
  { key: 'done', label: 'Done', title: 'Approved by the reporting manager (moved to Done)' },
  { key: 'review', label: 'In review', title: 'Finished by the assignee, waiting for the reporting manager to check it' },
  { key: 'remaining', label: 'Remaining', title: 'Due today, not finished and not on hold' },
  { key: 'hold', label: 'On hold', title: 'Due by today and sitting in On hold / Under discussion' },
  { key: 'overdue', label: 'Overdue', title: 'Due before today and still open at the end of the day' },
  { key: 'extraDone', label: 'Extra done', title: 'Other work finished today (early or late)' },
  { key: 'upcoming', label: 'Upcoming', title: 'Open work scheduled in the next 7 days' },
  { key: 'toReview', label: 'To review', title: 'As reporting manager: work in review waiting for their check' },
  { key: 'approved', label: 'Approved', title: 'As reporting manager: work they moved from review to Done that day' }
];

const Tile = ({ icon: Icon, label, value, hint, tone }) => (
  <div className="bg-white border border-gray-200 rounded p-3 min-w-0">
    <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium"><Icon size={13} className={tone || 'text-gray-400'} /> {label}</div>
    <div className="text-2xl font-semibold text-gray-900 tabular-nums mt-1">{value}</div>
    {hint && <div className="text-[11px] text-gray-500 mt-0.5 truncate">{hint}</div>}
  </div>
);

export default function DailyReport({ department: boardDepartment }) {
  // Work isn't always filed under the board's own department (e.g. all tickets may be
  // Marketing), so the report starts with every department and can be narrowed.
  const [department, setDepartment] = useState('All');
  const [day, setDay] = useState(ymd(new Date()));
  const [state, setState] = useState({ loading: true, error: '', data: null });
  const [open, setOpen] = useState({}); // person -> bucket filter ('' = all)

  const load = useCallback(() => {
    setState(s => ({ ...s, loading: true, error: '' }));
    fetch(`${API_BASE_URL}/it-kanban/reports/daily?date=${day}&department=${encodeURIComponent(department)}`)
      .then(async r => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'Could not load the report'); return d; })
      .then(d => setState({ loading: false, error: '', data: d }))
      .catch(e => setState({ loading: false, error: e.message, data: null }));
  }, [day, department]);

  useEffect(() => { load(); setOpen({}); }, [load]);

  const data = state.data;
  const t = data?.totals;
  const today = ymd(new Date());
  const maxTrend = useMemo(() => Math.max(1, ...(data?.trend || []).map(x => Math.max(x.due, (x.completed ?? x.done) + x.extraDone))), [data]);

  const toggle = (person, bucket = '') => setOpen(o => (o[person] === bucket ? { ...o, [person]: undefined } : { ...o, [person]: bucket }));

  const downloadPdf = () => {
    if (!data) return;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const mx = 36;
    let y = 46;
    const ensure = (need = 18) => { if (y > H - need - 30) { doc.addPage(); y = 46; } };
    doc.setFontSize(15); doc.setTextColor(17, 24, 39);
    doc.text(`${department === 'All' ? 'All departments' : department} — End-of-day report`, mx, y);
    y += 16; doc.setFontSize(10); doc.setTextColor(107, 114, 128);
    doc.text(`${longDay(data.date)} · generated ${new Date().toLocaleString('en-GB')}`, mx, y);
    y += 14;
    doc.text(`Upcoming (7 days) ${t.upcoming} · Unassigned open ${t.unassigned || 0} · Due ${t.due} · Completed ${t.completed}${pct(t.completed, t.due) != null ? ` (${pct(t.completed, t.due)}%)` : ''} (done ${t.done}, in review ${t.review}) · To review ${t.toReview} · Approved ${t.approved} · Remaining ${t.remaining} · On hold ${t.hold} · Overdue ${t.overdue} · Extra done ${t.extraDone} · Hours logged ${t.hours}`, mx, y);

    const headers = ['Person', ...COLS.map(c => c.label), 'Done %', 'Hours'];
    const nameW = 200; const cw = (W - mx * 2 - nameW) / (headers.length - 1);
    const x = (i) => (i === 0 ? mx + 4 : mx + nameW + cw * (i - 1) + cw / 2);
    y += 22;
    doc.setFillColor(243, 244, 246); doc.rect(mx, y - 12, W - mx * 2, 18, 'F');
    doc.setFontSize(9); doc.setTextColor(55, 65, 81);
    headers.forEach((h, i) => doc.text(h, x(i), y, { align: i === 0 ? 'left' : 'center' }));
    y += 18;
    data.rows.forEach(r => {
      ensure();
      const cells = [r.person, ...COLS.map(c => String(r[c.key])), pct(r.completed, r.due) != null ? `${pct(r.completed, r.due)}%` : '—', String(r.hours)];
      doc.setTextColor(31, 41, 55);
      cells.forEach((c, i) => doc.text(i === 0 ? String(c).slice(0, 36) : c, x(i), y, { align: i === 0 ? 'left' : 'center' }));
      doc.setDrawColor(229, 231, 235); doc.line(mx, y + 6, W - mx, y + 6);
      y += 17;
    });

    // What is still open at the end of the day, person by person.
    data.rows.forEach(r => {
      const open = r.tasks.filter(k => ['remaining', 'overdue', 'hold'].includes(k.bucket));
      if (!open.length) return;
      y += 10; ensure(40);
      doc.setFontSize(11); doc.setTextColor(17, 24, 39);
      doc.text(`${r.person} — still open (${open.length})`, mx, y);
      y += 14; doc.setFontSize(8.5);
      open.forEach(k => {
        ensure();
        doc.setTextColor(107, 114, 128);
        doc.text(`${BUCKETS[k.bucket].label}`, mx + 4, y);
        doc.text(shortDay(k.scheduled), mx + 70, y);
        doc.setTextColor(31, 41, 55);
        doc.text(`${k.key}  ${k.title}`.slice(0, 150), mx + 120, y);
        y += 12;
      });
    });
    doc.save(`end-of-day-${department.toLowerCase()}-${data.date}.pdf`);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-1.5">
          <button onClick={() => setDay(shift(day, -1))} className="h-8 w-8 flex items-center justify-center rounded border border-gray-300 bg-white hover:bg-gray-50 cursor-pointer" aria-label="Previous day"><ChevronLeft size={15} /></button>
          <input type="date" value={day} max={today} onChange={e => e.target.value && setDay(e.target.value)}
            className="h-8 border border-gray-300 rounded px-2 text-[13px] bg-white outline-none focus:border-blue-500" />
          <button onClick={() => setDay(shift(day, 1))} disabled={day >= today} className="h-8 w-8 flex items-center justify-center rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 cursor-pointer" aria-label="Next day"><ChevronRight size={15} /></button>
          {day !== today && <button onClick={() => setDay(today)} className="h-8 px-3 text-[13px] rounded border border-gray-300 bg-white hover:bg-gray-50 cursor-pointer">Today</button>}
          <span className="ml-2 text-[13px] text-gray-600">{longDay(day)}{day === today ? ' · so far today' : ' · at end of day'}</span>
        </div>
        <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded p-0.5">
          {[...new Set(['All', 'IT', 'Marketing', boardDepartment].filter(Boolean))].map(d => (
            <button key={d} onClick={() => setDepartment(d)}
              className={`px-2.5 h-7 text-xs font-medium rounded cursor-pointer ${department === d ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
              {d === 'All' ? 'All departments' : d}
            </button>
          ))}
        </div>
        <button onClick={downloadPdf} disabled={!data || !data.rows.length}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50 cursor-pointer">
          <Download size={14} /> Download PDF
        </button>
        </div>
      </div>

      {state.loading && !data && <div className="py-16 flex items-center justify-center gap-2 text-sm text-gray-400"><Loader2 size={15} className="animate-spin" /> Loading…</div>}
      {state.error && <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">{state.error}</div>}

      {data && (
        <div className={state.loading ? 'opacity-60 transition-opacity' : ''}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
            <Tile icon={ListTodo} label="Due today" value={t.due} hint="Scheduled for the day" />
            <Tile icon={CheckCircle2} tone="text-emerald-600" label="Completed" value={t.completed} hint={pct(t.completed, t.due) != null ? `${pct(t.completed, t.due)}% of due · ${t.done} done, ${t.review} in review` : 'Nothing was due'} />
            <Tile icon={Eye} tone="text-orange-600" label="Waiting for review" value={t.toReview} hint={`Reporting managers to check · ${t.approved} approved`} />
            <Tile icon={Clock} tone="text-blue-600" label="Remaining" value={t.remaining} hint="Due today, still open" />
            <Tile icon={PauseCircle} tone="text-slate-600" label="On hold" value={t.hold} hint="Under discussion / hold" />
            <Tile icon={AlertTriangle} tone="text-red-600" label="Overdue" value={t.overdue} hint="From earlier days" />
            <Tile icon={Sparkles} tone="text-violet-600" label="Extra done" value={t.extraDone} hint="Other work finished" />
            <Tile icon={CalendarClock} tone="text-amber-600" label="Upcoming" value={t.upcoming} hint="Due in the next 7 days" />
            <Tile icon={UserX} tone="text-gray-500" label="Unassigned" value={t.unassigned || 0} hint="Open work nobody has picked up" />
            <Tile icon={Timer} label="Hours logged" value={t.hours} hint="Time recorded that day" />
          </div>

          {/* Week leading up to the day */}
          <div className="bg-white border border-gray-200 rounded p-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-700">Last 7 days</span>
              <span className="flex items-center gap-3 text-[11px] text-gray-500">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-gray-300" /> Due</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#1baf7a]" /> Completed (incl. in review)</span>
              </span>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {data.trend.map(x => (
                <button key={x.date} onClick={() => setDay(x.date)} title={`${shortDay(x.date)}: ${x.completed ?? x.done} of ${x.due} due completed (${x.done} done), ${x.extraDone} extra`}
                  className={`flex flex-col items-center gap-1 rounded p-1 cursor-pointer ${x.date === day ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-gray-50'}`}>
                  <div className="h-16 w-full flex items-end justify-center gap-[2px]">
                    <div className="w-3 rounded-t bg-gray-300" style={{ height: `${(x.due / maxTrend) * 100}%`, minHeight: x.due ? 2 : 0 }} />
                    <div className="w-3 rounded-t bg-[#1baf7a]" style={{ height: `${(((x.completed ?? x.done) + x.extraDone) / maxTrend) * 100}%`, minHeight: (x.completed ?? x.done) + x.extraDone ? 2 : 0 }} />
                  </div>
                  <span className="text-[10px] text-gray-500 tabular-nums">{shortDay(x.date)}</span>
                  <span className="text-[10px] text-gray-700 tabular-nums">{(x.completed ?? x.done) + x.extraDone}/{x.due}</span>
                </button>
              ))}
            </div>
          </div>

          {data.rows.length === 0 ? (
            <div className="py-14 text-center text-sm text-gray-400 bg-white border border-gray-200 rounded">Nothing was due, open or finished on this day.</div>
          ) : (
            <div className="bg-white border border-gray-200 rounded overflow-x-auto">
              <table className="w-full text-[13px] whitespace-nowrap">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
                  <tr>
                    <th className="text-left font-medium p-2.5">Person</th>
                    {COLS.map(c => <th key={c.key} title={c.title} className="text-center font-medium px-3 py-2.5">{c.label}</th>)}
                    <th className="text-left font-medium px-3 py-2.5 min-w-[140px]" title="Done or in review, of the work due that day">Completed of due</th>
                    <th className="text-right font-medium px-3 py-2.5">Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map(r => {
                    const isOpen = open[r.person] !== undefined;
                    const filter = open[r.person] || '';
                    const p = pct(r.completed, r.due);
                    const tasks = filter ? r.tasks.filter(k => k.bucket === filter) : r.tasks;
                    return (
                      <React.Fragment key={r.person}>
                        <tr className={`border-b border-gray-100 cursor-pointer ${isOpen ? 'bg-blue-50/40' : 'hover:bg-gray-50'}`} onClick={() => toggle(r.person)}>
                          <td className="p-2.5 font-medium text-gray-900">
                            <span className="flex items-center gap-1.5">
                              <ChevronDown size={13} className={`text-gray-400 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
                              {r.person === 'Unassigned' ? <span className="text-gray-500">Unassigned</span> : r.person}
                            </span>
                          </td>
                          {COLS.map(c => {
                            const v = r[c.key];
                            const tone = !v ? 'text-gray-300' : c.key === 'overdue' ? 'text-red-700 font-semibold' : c.key === 'hold' ? 'text-slate-700 font-medium' : c.key === 'done' ? 'text-emerald-700 font-medium' : c.key === 'toReview' ? 'text-orange-700 font-semibold' : c.key === 'review' ? 'text-purple-700 font-medium' : 'text-gray-800';
                            return (
                              <td key={c.key} className="text-center px-3 py-2">
                                {v && c.key !== 'due' ? (
                                  <button onClick={(e) => { e.stopPropagation(); toggle(r.person, c.key); }} className={`tabular-nums px-1.5 rounded hover:underline cursor-pointer ${tone}`} title={`Show ${c.label.toLowerCase()}`}>{v}</button>
                                ) : <span className={`tabular-nums ${tone}`}>{v}</span>}
                              </td>
                            );
                          })}
                          <td className="px-3 py-2">
                            {p == null ? <span className="text-gray-300">—</span> : (
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${p >= 80 ? 'bg-[#1baf7a]' : p >= 50 ? 'bg-[#eda100]' : 'bg-[#eb6834]'}`} style={{ width: `${p}%` }} /></div>
                                <span className="text-xs tabular-nums text-gray-700 w-9 text-right">{p}%</span>
                              </div>
                            )}
                          </td>
                          <td className={`text-right px-3 py-2 tabular-nums ${r.hours ? 'text-gray-800' : 'text-gray-300'}`}>{r.hours || 0}</td>
                        </tr>
                        {isOpen && (
                          <tr className="bg-gray-50/60 border-b border-gray-200">
                            <td colSpan={COLS.length + 3} className="px-4 py-3 whitespace-normal">
                              <div className="flex flex-wrap gap-1.5 mb-2">
                                {['', ...Object.keys(BUCKETS)].filter(b => !b || r.tasks.some(k => k.bucket === b)).map(b => (
                                  <button key={b || 'all'} onClick={() => setOpen(o => ({ ...o, [r.person]: b }))}
                                    className={`h-7 px-2.5 text-xs rounded border cursor-pointer ${filter === b ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                                    {b ? BUCKETS[b].label : 'All'} <span className="opacity-70 tabular-nums">{b ? r.tasks.filter(k => k.bucket === b).length : r.tasks.length}</span>
                                  </button>
                                ))}
                              </div>
                              {tasks.length === 0 ? <div className="text-xs text-gray-500">No tasks.</div> : (
                                <div className="divide-y divide-gray-100 bg-white border border-gray-200 rounded">
                                  {tasks.map(k => (
                                    <div key={k.key} className="flex items-center gap-3 px-3 py-1.5 text-xs">
                                      <span className={`shrink-0 px-1.5 py-0.5 rounded ring-1 ring-inset text-[10px] font-medium ${BUCKETS[k.bucket].chip}`}>{BUCKETS[k.bucket].label}</span>
                                      <span className="shrink-0 font-mono text-[11px] text-gray-500 w-36 truncate">{k.key}</span>
                                      <span className="flex-1 min-w-0 truncate text-gray-800" title={k.title}>{k.title}</span>
                                      {k.workType && <span className="shrink-0 text-[10px] uppercase tracking-wide text-gray-500 max-w-[120px] truncate">{k.workType}</span>}
                                      {(k.bucket === 'toReview' || k.bucket === 'approved') && <span className="shrink-0 text-[11px] text-gray-500 max-w-[140px] truncate" title="Assignee">by {k.assignee}</span>}
                                      {k.bucket === 'review' && k.reporter && <span className="shrink-0 text-[11px] text-gray-500 max-w-[140px] truncate" title="Reporting manager who has to check it">with {k.reporter}</span>}
                                      <span className={`shrink-0 tabular-nums w-14 text-right ${k.bucket === 'overdue' ? 'text-red-700' : 'text-gray-500'}`} title="Scheduled day">{shortDay(k.scheduled)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
                {data.rows.length > 1 && (
                  <tfoot className="bg-gray-50 border-t border-gray-200 font-medium text-gray-800">
                    <tr>
                      <td className="p-2.5">All</td>
                      {COLS.map(c => <td key={c.key} className="text-center px-3 py-2.5 tabular-nums">{t[c.key]}</td>)}
                      <td className="px-3 py-2.5 text-xs tabular-nums">{pct(t.completed, t.due) != null ? `${pct(t.completed, t.due)}%` : '—'}</td>
                      <td className="text-right px-3 py-2.5 tabular-nums">{t.hours}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
          <p className="text-[11px] text-gray-500 mt-2">
            Click a person to see their tasks, or a number to see just those. {data.isManager ? '' : 'You see your own work only.'}
          </p>
        </div>
      )}
    </div>
  );
}

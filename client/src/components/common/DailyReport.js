import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import { ChevronLeft, ChevronRight, ChevronDown, Download, Loader2, PauseCircle, CheckCircle2, Clock, ListTodo, Timer, UserX, Eye, Users } from 'lucide-react';
import { API_BASE_URL } from '../../config/environment';

/**
 * Daily report: for one day, each person's own tickets and where they stood when the day
 * ended, plus the hours they worked that day (meetings included). Past days are rebuilt
 * from the status history on the server.
 */

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const shift = (day, n) => { const d = new Date(`${day}T12:00:00`); d.setDate(d.getDate() + n); return ymd(d); };
const longDay = (day) => new Date(`${day}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const shortDay = (day) => (day ? new Date(`${day}T12:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—');
const clock = (iso) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const pct = (a, b) => (b ? Math.round((a / b) * 100) : null);
// 1.5 -> "1h 30m"
const hm = (h) => {
  const mins = Math.round((Number(h) || 0) * 60);
  if (!mins) return '0h';
  const H = Math.floor(mins / 60); const M = mins % 60;
  return H && M ? `${H}h ${M}m` : H ? `${H}h` : `${M}m`;
};

const BUCKETS = {
  todo: { label: 'To do', chip: 'bg-blue-50 text-blue-800 ring-blue-200', tone: 'text-blue-700 font-medium', title: 'Scheduled for the day and not started yet' },
  pending: { label: 'Pending', chip: 'bg-amber-50 text-amber-800 ring-amber-200', tone: 'text-amber-700 font-semibold', title: 'Started but not finished, or scheduled earlier and still open' },
  hold: { label: 'Under discussion / Postponed', short: 'Discussion / Postponed', chip: 'bg-slate-100 text-slate-700 ring-slate-300', tone: 'text-slate-700 font-medium', title: 'Under discussion / on hold / postponed (scheduled that day, moved there that day, or worked on)' },
  review: { label: 'In review', chip: 'bg-purple-50 text-purple-800 ring-purple-200', tone: 'text-purple-700 font-medium', title: 'Their own tickets finished and waiting for the reporting manager to check' },
  done: { label: 'Done', chip: 'bg-emerald-50 text-emerald-800 ring-emerald-200', tone: 'text-emerald-700 font-medium', title: 'Scheduled for the day and done, or finished on the day' }
};
const COLS = Object.keys(BUCKETS);

const Tile = ({ icon: Icon, label, value, hint, tone }) => (
  <div className="bg-white border border-gray-200 rounded p-3 min-w-0">
    <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium"><Icon size={13} className={tone || 'text-gray-400'} /> {label}</div>
    <div className="text-2xl font-semibold text-gray-900 tabular-nums mt-1">{value}</div>
    {hint && <div className="text-[11px] text-gray-500 mt-0.5 truncate">{hint}</div>}
  </div>
);

const meetingState = (m) => (m.attended === 0 ? 'Did not attend' : !m.over ? 'Not over yet' : m.host ? 'Host' : 'Attended');

export default function DailyReport({ department: boardDepartment }) {
  // Work isn't always filed under the board's own department (e.g. all tickets may be
  // Marketing), so the report starts with every department and can be narrowed.
  const [department, setDepartment] = useState('All');
  const [day, setDay] = useState(ymd(new Date()));
  const [state, setState] = useState({ loading: true, error: '', data: null });
  const [open, setOpen] = useState({}); // person -> filter ('' = all, a bucket, or 'meetings')

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
  const maxTrend = useMemo(() => Math.max(1, ...(data?.trend || []).map(x => Math.max(x.planned, x.done))), [data]);

  const toggle = (person, filter = '') => setOpen(o => (o[person] === filter ? { ...o, [person]: undefined } : { ...o, [person]: filter }));

  const downloadPdf = () => {
    if (!data) return;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const mx = 36;
    let y = 46;
    const ensure = (need = 18) => { if (y > H - need - 30) { doc.addPage(); y = 46; } };
    doc.setFontSize(15); doc.setTextColor(17, 24, 39);
    doc.text(`${department === 'All' ? 'All departments' : department} — Daily report`, mx, y);
    y += 16; doc.setFontSize(10); doc.setTextColor(107, 114, 128);
    doc.text(`${longDay(data.date)} · generated ${new Date().toLocaleString('en-GB')}`, mx, y);
    y += 14;
    doc.text(`${COLS.map(c => `${BUCKETS[c].label} ${t[c]}`).join(' · ')} · Meetings ${t.meetings} · Hours ${hm(t.hours)} (tickets ${hm(t.taskHours)}, meetings ${hm(t.meetingHours)})`, mx, y);

    const headers = ['Person', ...COLS.map(c => BUCKETS[c].short || BUCKETS[c].label), 'Meetings', 'Ticket hrs', 'Meeting hrs', 'Total hrs'];
    const nameW = 170; const cw = (W - mx * 2 - nameW) / (headers.length - 1);
    const x = (i) => (i === 0 ? mx + 4 : mx + nameW + cw * (i - 1) + cw / 2);
    y += 22;
    doc.setFillColor(243, 244, 246); doc.rect(mx, y - 12, W - mx * 2, 18, 'F');
    doc.setFontSize(9); doc.setTextColor(55, 65, 81);
    headers.forEach((h, i) => doc.text(h, x(i), y, { align: i === 0 ? 'left' : 'center' }));
    y += 18;
    data.rows.forEach(r => {
      ensure();
      const cells = [r.person, ...COLS.map(c => String(r[c])), String(r.meetings), hm(r.taskHours), hm(r.meetingHours), hm(r.hours)];
      doc.setTextColor(31, 41, 55);
      cells.forEach((c, i) => doc.text(i === 0 ? String(c).slice(0, 30) : c, x(i), y, { align: i === 0 ? 'left' : 'center' }));
      doc.setDrawColor(229, 231, 235); doc.line(mx, y + 6, W - mx, y + 6);
      y += 17;
    });

    // Each person's tickets and meetings for the day.
    data.rows.forEach(r => {
      if (!r.tasks.length && !r.meetingList.length) return;
      y += 10; ensure(40);
      doc.setFontSize(11); doc.setTextColor(17, 24, 39);
      doc.text(`${r.person} — ${r.tasks.length} ticket${r.tasks.length === 1 ? '' : 's'}, ${r.meetings} meeting${r.meetings === 1 ? '' : 's'}, ${hm(r.hours)}`, mx, y);
      y += 14; doc.setFontSize(8.5);
      r.tasks.forEach(k => {
        ensure();
        doc.setTextColor(107, 114, 128);
        doc.text(BUCKETS[k.bucket].short || BUCKETS[k.bucket].label, mx + 4, y);
        doc.text(k.carried ? `from ${shortDay(k.scheduled)}` : shortDay(k.scheduled), mx + 90, y);
        doc.text(k.hours ? hm(k.hours) : '', mx + 150, y);
        doc.setTextColor(31, 41, 55);
        doc.text(`${k.key}  ${k.title}`.slice(0, 140), mx + 195, y);
        y += 12;
      });
      r.meetingList.forEach(m => {
        ensure();
        doc.setTextColor(107, 114, 128);
        doc.text('Meeting', mx + 4, y);
        doc.text(clock(m.at), mx + 90, y);
        doc.text(m.hours ? hm(m.hours) : '', mx + 150, y);
        doc.setTextColor(31, 41, 55);
        doc.text(`${m.title} (${meetingState(m)})`.slice(0, 140), mx + 195, y);
        y += 12;
      });
    });
    doc.save(`daily-report-${department.toLowerCase()}-${data.date}.pdf`);
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
            <Tile icon={ListTodo} tone="text-blue-600" label="To do" value={t.todo} hint={`${t.planned} ticket${t.planned === 1 ? '' : 's'} planned for the day`} />
            <Tile icon={Clock} tone="text-amber-600" label="Pending" value={t.pending} hint="Started or carried over, not finished" />
            <Tile icon={PauseCircle} tone="text-slate-600" label="Discussion / Postponed" value={t.hold} hint="Under discussion or on hold" />
            <Tile icon={Eye} tone="text-purple-600" label="In review" value={t.review} hint="Finished, waiting for the manager's check" />
            <Tile icon={CheckCircle2} tone="text-emerald-600" label="Done" value={t.done} hint={pct(t.completed, t.planned) != null ? `${pct(t.completed, t.planned)}% of the day's plan done or in review` : 'Nothing was planned'} />
            <Tile icon={Users} tone="text-indigo-600" label="Meetings" value={t.meetings} hint={`${hm(t.meetingHours)} in meetings`} />
            <Tile icon={Timer} label="Hours worked" value={hm(t.hours)} hint={`Tickets ${hm(t.taskHours)} · meetings ${hm(t.meetingHours)}`} />
            {data.isManager ? <Tile icon={UserX} tone="text-gray-500" label="Unassigned" value={t.unassigned || 0} hint="Open tickets for the day with no assignee" />
              : <Tile icon={CheckCircle2} tone="text-emerald-600" label="Day's plan" value={pct(t.completed, t.planned) != null ? `${pct(t.completed, t.planned)}%` : '—'} hint={`${t.completed} of ${t.planned} done or in review`} />}
          </div>

          {/* Week leading up to the day */}
          <div className="bg-white border border-gray-200 rounded p-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-700">Last 7 days</span>
              <span className="flex items-center gap-3 text-[11px] text-gray-500">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-gray-300" /> Planned</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#1baf7a]" /> Done</span>
              </span>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {data.trend.map(x => (
                <button key={x.date} onClick={() => setDay(x.date)} title={`${shortDay(x.date)}: ${x.planned} planned, ${x.done} done`}
                  className={`flex flex-col items-center gap-1 rounded p-1 cursor-pointer ${x.date === day ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-gray-50'}`}>
                  <div className="h-16 w-full flex items-end justify-center gap-[2px]">
                    <div className="w-3 rounded-t bg-gray-300" style={{ height: `${(x.planned / maxTrend) * 100}%`, minHeight: x.planned ? 2 : 0 }} />
                    <div className="w-3 rounded-t bg-[#1baf7a]" style={{ height: `${(x.done / maxTrend) * 100}%`, minHeight: x.done ? 2 : 0 }} />
                  </div>
                  <span className="text-[10px] text-gray-500 tabular-nums">{shortDay(x.date)}</span>
                  <span className="text-[10px] text-gray-700 tabular-nums">{x.done}/{x.planned}</span>
                </button>
              ))}
            </div>
          </div>

          {data.rows.length === 0 ? (
            <div className="py-14 text-center text-sm text-gray-400 bg-white border border-gray-200 rounded">No tickets, meetings or hours on this day.</div>
          ) : (
            <div className="bg-white border border-gray-200 rounded overflow-x-auto">
              <table className="w-full text-[13px] whitespace-nowrap">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
                  <tr>
                    <th className="text-left font-medium p-2.5">Person</th>
                    {COLS.map(c => <th key={c} title={BUCKETS[c].title} className="text-center font-medium px-3 py-2.5">{BUCKETS[c].short || BUCKETS[c].label}</th>)}
                    <th className="text-center font-medium px-3 py-2.5" title="Meetings they hosted or attended that day">Meetings</th>
                    <th className="text-right font-medium px-3 py-2.5" title="Time on tickets + time in meetings">Hours worked</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map(r => {
                    const isOpen = open[r.person] !== undefined;
                    const filter = open[r.person] || '';
                    const tasks = !filter ? r.tasks : filter === 'meetings' ? [] : r.tasks.filter(k => k.bucket === filter);
                    const showMeetings = (!filter || filter === 'meetings') && r.meetingList.length > 0;
                    return (
                      <React.Fragment key={r.person}>
                        <tr className={`border-b border-gray-100 cursor-pointer ${isOpen ? 'bg-blue-50/40' : 'hover:bg-gray-50'}`} onClick={() => toggle(r.person)}>
                          <td className="p-2.5 font-medium text-gray-900">
                            <span className="flex items-center gap-1.5">
                              <ChevronDown size={13} className={`text-gray-400 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
                              {r.person}
                            </span>
                          </td>
                          {[...COLS, 'meetings'].map(c => {
                            const v = r[c];
                            const tone = !v ? 'text-gray-300' : c === 'meetings' ? 'text-indigo-700 font-medium' : BUCKETS[c].tone;
                            return (
                              <td key={c} className="text-center px-3 py-2">
                                {v ? (
                                  <button onClick={(e) => { e.stopPropagation(); toggle(r.person, c); }} className={`tabular-nums px-1.5 rounded hover:underline cursor-pointer ${tone}`} title="Show these">{v}</button>
                                ) : <span className={`tabular-nums ${tone}`}>0</span>}
                              </td>
                            );
                          })}
                          <td className={`text-right px-3 py-2 tabular-nums ${r.hours ? 'text-gray-900 font-medium' : 'text-gray-300'}`}
                            title={`Tickets ${hm(r.taskHours)} · meetings ${hm(r.meetingHours)}`}>
                            {hm(r.hours)}
                            {r.meetingHours > 0 && <div className="text-[10px] font-normal text-gray-500">incl. {hm(r.meetingHours)} meetings</div>}
                          </td>
                        </tr>
                        {isOpen && (
                          <tr className="bg-gray-50/60 border-b border-gray-200">
                            <td colSpan={COLS.length + 3} className="px-4 py-3 whitespace-normal">
                              <div className="flex flex-wrap gap-1.5 mb-2">
                                {['', ...COLS, 'meetings'].filter(b => !b || r[b]).map(b => (
                                  <button key={b || 'all'} onClick={() => setOpen(o => ({ ...o, [r.person]: b }))}
                                    className={`h-7 px-2.5 text-xs rounded border cursor-pointer ${filter === b ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                                    {!b ? 'All' : b === 'meetings' ? 'Meetings' : BUCKETS[b].short || BUCKETS[b].label} <span className="opacity-70 tabular-nums">{!b ? r.tasks.length + r.meetingList.length : r[b]}</span>
                                  </button>
                                ))}
                              </div>
                              {tasks.length === 0 && !showMeetings ? <div className="text-xs text-gray-500">Nothing here for this day.</div> : (
                                <div className="divide-y divide-gray-100 bg-white border border-gray-200 rounded">
                                  {tasks.map(k => (
                                    <div key={k.key} className="flex items-center gap-3 px-3 py-1.5 text-xs">
                                      <span className={`shrink-0 w-28 truncate text-center px-1.5 py-0.5 rounded ring-1 ring-inset text-[10px] font-medium ${BUCKETS[k.bucket].chip}`} title={k.status}>{BUCKETS[k.bucket].short || BUCKETS[k.bucket].label}</span>
                                      <span className="shrink-0 font-mono text-[11px] text-gray-500 w-32 truncate">{k.key}</span>
                                      <span className="flex-1 min-w-0 truncate text-gray-800" title={k.title}>{k.title}</span>
                                      {k.carried && <span className="shrink-0 text-[10px] text-red-600" title="Scheduled earlier, still open">from {shortDay(k.scheduled)}</span>}
                                      {k.workType && <span className="shrink-0 text-[10px] uppercase tracking-wide text-gray-500 max-w-[110px] truncate">{k.workType}</span>}
                                      {k.bucket === 'review' && k.reporter && <span className="shrink-0 text-[11px] text-gray-500 max-w-[140px] truncate" title="Reporting manager who has to check it">with {k.reporter}</span>}
                                      <span className={`shrink-0 w-14 text-right tabular-nums ${k.hours ? 'text-gray-800' : 'text-gray-300'}`} title="Time worked on it this day">{k.hours ? hm(k.hours) : '—'}</span>
                                    </div>
                                  ))}
                                  {showMeetings && r.meetingList.map(m => (
                                    <div key={`m-${m.id}`} className="flex items-center gap-3 px-3 py-1.5 text-xs">
                                      <span className="shrink-0 w-28 text-center px-1.5 py-0.5 rounded ring-1 ring-inset text-[10px] font-medium bg-indigo-50 text-indigo-800 ring-indigo-200">Meeting</span>
                                      <span className="shrink-0 text-[11px] text-gray-500 w-32 tabular-nums">{clock(m.at)} · {m.durationMin} min</span>
                                      <span className="flex-1 min-w-0 truncate text-gray-800" title={m.title}>{m.title}</span>
                                      <span className={`shrink-0 text-[10px] ${m.attended === 0 ? 'text-red-600' : 'text-gray-500'}`}>{meetingState(m)}</span>
                                      <span className={`shrink-0 w-14 text-right tabular-nums ${m.hours ? 'text-gray-800' : 'text-gray-300'}`}>{m.hours ? hm(m.hours) : '—'}</span>
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
                      {COLS.map(c => <td key={c} className="text-center px-3 py-2.5 tabular-nums">{t[c]}</td>)}
                      <td className="text-center px-3 py-2.5 tabular-nums">{t.meetings}</td>
                      <td className="text-right px-3 py-2.5 tabular-nums">{hm(t.hours)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
          <p className="text-[11px] text-gray-500 mt-2">
            Each person's own tickets (as assignee). Click a person to see their tickets and meetings, or a number to see just those.
            Hours are time logged that day{data.isToday ? ', clocks still running' : ''} and meeting time. {data.isManager ? '' : 'You see your own work only.'}
          </p>
        </div>
      )}
    </div>
  );
}

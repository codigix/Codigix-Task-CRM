import React, { useState, useEffect } from 'react';
import { Trophy } from 'lucide-react';

const DONE_STATUSES = ['DONE', 'COMPLETED', 'CLOSED'];
const isDone = (status) => DONE_STATUSES.includes(String(status || '').toUpperCase().trim());

/**
 * Jira's Complete Sprint dialog.
 *
 * Because a board can run several sprints at once, the dialog opens with a sprint selector
 * rather than assuming which one you meant. It then explains what counts as completed
 * (anything in the Done column) versus open, and asks where the open work should go.
 *
 * With onCompleteAll, "Several sprints" lists every running sprint of every department,
 * grouped by department, with the ones whose end date has passed ticked. The ticked ones are
 * completed together. Sprints are one per project, so "New sprint" then gives each its own
 * new sprint (same name and project), started with the dates entered here.
 * Pass initialSprintId = 'ALL' to open the dialog on that choice.
 */
export const ALL_SPRINTS = 'ALL';
const ALL = ALL_SPRINTS;

/** The toast after completing several sprints, from the server's reply. */
export const completeAllSummary = (data) => {
  const n = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;
  let text = `${n(data.sprints.length, 'sprint')} completed · ${data.completedCount} done`;
  if (data.screenshotsDeleted) text += ` · ${n(data.screenshotsDeleted, 'screenshot')} deleted`;
  if (data.movedCount > 0) {
    text += data.created?.length
      ? `, ${data.movedCount} open moved to ${n(data.created.length, 'new sprint')}${data.started ? ' (started)' : ''}`
      : `, ${data.movedCount} open moved to ${data.movedTo || 'the chosen sprint'}`;
  }
  return text;
};

const ymdLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
// A DATE column can arrive as e.g. 2026-10-30T18:30:00Z (31 Oct in IST), so compare local days.
const dayOf = (v) => { if (!v) return null; const d = new Date(v); return isNaN(d.getTime()) ? null : ymdLocal(d); };
const fmtDay = (v) => { if (!v) return null; const d = new Date(v); return isNaN(d.getTime()) ? null : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }); };

/** A running sprint whose end date has passed: its time is over and it is due to be completed. */
export const isSprintEnded = (s, today = ymdLocal(new Date())) => s?.status === 'Active' && Boolean(dayOf(s.end_date)) && dayOf(s.end_date) < today;

// The Backlog loads each sprint's tickets; the board loads only per-sprint counts.
const tally = (s) => {
  if (Array.isArray(s?.issues)) {
    const done = s.issues.filter(i => isDone(i.status)).length;
    return { done, open: s.issues.length - done };
  }
  const c = s?.counts || {};
  return { done: Number(c.done) || 0, open: (Number(c.todo) || 0) + (Number(c.inProgress) || 0) };
};

const CompleteSprintModal = ({ isOpen, sprints, initialSprintId, onCancel, onComplete, onCompleteAll }) => {
  const active = sprints.filter(s => s.status === 'Active');

  const [sprintId, setSprintId] = useState('');
  const [moveTo, setMoveTo] = useState('new');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  // Several sprints: which are ticked (ended ones by default).
  const [picked, setPicked] = useState(() => new Set());
  // Dates for the new sprints: today to the end of this month.
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');

  const tickEnded = () => setPicked(new Set(active.filter(s => isSprintEnded(s)).map(s => String(s.id))));

  useEffect(() => {
    if (!isOpen) return;
    const fallback = active[0]?.id;
    setSprintId(String(initialSprintId || fallback || ''));
    setMoveTo(initialSprintId === ALL ? 'new' : 'stay');
    tickEnded();
    const today = new Date();
    setNewStart(ymdLocal(today));
    setNewEnd(ymdLocal(new Date(today.getFullYear(), today.getMonth() + 1, 0)));
    setError('');
  }, [isOpen, initialSprintId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  const canCompleteAll = Boolean(onCompleteAll) && active.length > 0;
  const isAll = canCompleteAll && sprintId === ALL;
  const sprint = isAll ? null : (sprints.find(s => String(s.id) === String(sprintId)) || null);
  const chosen = isAll ? active.filter(s => picked.has(String(s.id))) : [sprint].filter(Boolean);
  const totals = chosen.map(tally).reduce((a, t) => ({ done: a.done + t.done, open: a.open + t.open }), { done: 0, open: 0 });
  const doneCount = totals.done;
  const openCount = totals.open;
  const endedCount = active.filter(s => isSprintEnded(s)).length;

  // Every department's running sprints, grouped, ended ones first.
  const groups = Object.entries(active.reduce((acc, s) => {
    const d = s.department || 'Other';
    (acc[d] = acc[d] || []).push(s);
    return acc;
  }, {})).map(([dept, list]) => [dept, [...list].sort((a, b) => Number(isSprintEnded(b)) - Number(isSprintEnded(a)) || String(dayOf(a.end_date) || '').localeCompare(String(dayOf(b.end_date) || '')))]);

  // Anything still running or planned can receive the leftover work — except the sprints being completed.
  const otherSprints = sprints.filter(
    s => (isAll ? !picked.has(String(s.id)) : String(s.id) !== String(sprintId)) && s.status !== 'Completed'
  );

  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

  const chooseSprint = (value) => {
    setSprintId(value);
    // Ending a cycle: each sprint's leftovers go into its own new sprint unless chosen otherwise.
    if (value === ALL) setMoveTo('new');
  };

  const toggle = (id) => setPicked(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const setGroup = (list, on) => setPicked(prev => {
    const next = new Set(prev);
    list.forEach(s => (on ? next.add(String(s.id)) : next.delete(String(s.id))));
    return next;
  });

  const handleComplete = async () => {
    if (!isAll && !sprint) return setError('Choose a sprint to complete.');
    if (isAll && chosen.length === 0) return setError('Tick at least one sprint.');
    if (isAll && moveTo === 'new' && (!newStart || !newEnd)) return setError("Set the new sprints' start and end dates.");
    if (isAll && moveTo === 'new' && newEnd < newStart) return setError('The end date is before the start date.');
    setIsSaving(true);
    setError('');
    try {
      if (isAll) await onCompleteAll(chosen, moveTo, moveTo === 'new' ? { start_date: newStart, end_date: newEnd } : {});
      else await onComplete(sprint, moveTo);
    } catch (err) {
      setError(err.message || 'Could not complete the sprint.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded shadow-2xl w-full max-w-[640px] max-h-[90vh] overflow-y-auto">
        {/* Celebratory banner */}
        <div className="h-[150px] bg-gradient-to-b from-cyan-400 to-cyan-300 flex items-end justify-center relative">
          <div className="absolute -bottom-1 w-20 h-20 rounded bg-white/0 flex items-center justify-center">
            <Trophy size={56} className="text-amber-400 drop-shadow" fill="currentColor" />
          </div>
        </div>

        <div className="px-8 pt-8 pb-5">
          <h2 className="text-xl  text-gray-900 mb-5">{isAll ? 'Complete sprints' : 'Complete sprint'}</h2>

          {error && (
            <div className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 mb-4">
              {error}
            </div>
          )}

          <label className="block text-[13px]  text-gray-700 mb-1">Select a sprint</label>
          <select
            value={sprintId}
            onChange={(e) => chooseSprint(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] bg-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            {active.length === 0 && <option value="">No sprint is running</option>}
            {canCompleteAll && <option value={ALL}>Several sprints, all departments ({endedCount} ended)</option>}
            {active.map(s => (
              <option key={s.id} value={s.id}>
                {s.name}{s.department ? ` · ${s.department}` : ''}{isSprintEnded(s) ? ' · ended' : ''}
              </option>
            ))}
          </select>

          {isAll && (
            <div className="mt-4 border border-gray-200 rounded">
              <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200 text-[12px]">
                <span className="text-gray-700"><strong>{chosen.length}</strong> of {active.length} running sprints ticked</span>
                <span className="flex items-center gap-3">
                  <button type="button" onClick={tickEnded} className="text-blue-600 hover:underline">Ended only</button>
                  <button type="button" onClick={() => setGroup(active, true)} className="text-blue-600 hover:underline">All</button>
                  <button type="button" onClick={() => setPicked(new Set())} className="text-blue-600 hover:underline">None</button>
                </span>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {groups.map(([dept, list]) => {
                  const allOn = list.every(s => picked.has(String(s.id)));
                  return (
                    <div key={dept}>
                      <label className="sticky top-0 z-[1] flex items-center gap-2 px-3 py-1.5 bg-white border-b border-gray-100 text-[11px] font-semibold uppercase tracking-wide text-gray-500 cursor-pointer">
                        <input type="checkbox" checked={allOn} onChange={() => setGroup(list, !allOn)} />
                        {dept} ({list.filter(s => isSprintEnded(s)).length} ended of {list.length})
                      </label>
                      {list.map(s => {
                        const t = tally(s);
                        const ended = isSprintEnded(s);
                        return (
                          <label key={s.id} className="flex items-center gap-2.5 px-3 py-1.5 text-[13px] hover:bg-gray-50 cursor-pointer">
                            <input type="checkbox" checked={picked.has(String(s.id))} onChange={() => toggle(String(s.id))} />
                            <span className="flex-1 min-w-0 truncate text-gray-800">{s.name}</span>
                            <span className={`shrink-0 text-[11px] px-1.5 py-0.5 rounded ${ended ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                              {ended ? `Ended ${fmtDay(s.end_date)}` : s.end_date ? `Runs to ${fmtDay(s.end_date)}` : 'No end date'}
                            </span>
                            <span className="shrink-0 w-24 text-right text-[11px] text-gray-500">{t.done} done · {t.open} open</span>
                          </label>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {(sprint || (isAll && chosen.length > 0)) && (
            <>
              <p className="text-[14px] text-gray-800 mt-5">
                {isAll ? `These ${plural(chosen.length, 'sprint')} contain` : 'This sprint contains'} <strong>{plural(doneCount, 'completed work item')}</strong> and{' '}
                <strong>{plural(openCount, 'open work item')}</strong>.
              </p>

              <ul className="mt-3 space-y-2 text-[13px] text-gray-600 list-disc pl-5">
                <li>
                  Completed work items in <strong>Done</strong> stay recorded in the completed {isAll ? 'sprints' : 'sprint'}.
                </li>
                {doneCount > 0 && (
                  <li className="text-red-700">
                    Screenshots on the {plural(doneCount, 'completed work item')} are <strong>permanently deleted</strong> from the server. Other files (PDF, documents) are kept.
                  </li>
                )}
                <li>
                  Open work items moved to another sprint go to the <strong>Last month pending</strong> column on the board.
                </li>
              </ul>

              {openCount > 0 && (
                <div className="mt-5">
                  <label className="block text-[13px]  text-gray-700 mb-1">
                    Open work items action
                  </label>
                  <select
                    value={moveTo}
                    onChange={(e) => setMoveTo(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] bg-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="stay">{isAll ? 'Keep in each sprint (for renewal)' : 'Keep in this sprint (for renewal)'}</option>
                    <option value="backlog">Move to Backlog</option>
                    <option value="new">{isAll ? 'Move to a new sprint for each (same name & project)' : 'Move to New sprint'}</option>
                    {otherSprints.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name}{s.department ? ` · ${s.department}` : ''}{s.status === 'Active' ? ' (active)' : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-gray-500 mt-1">
                    {moveTo === 'stay'
                      ? `The ${isAll ? 'sprints' : 'sprint'} will stay in Backlog marked as Completed. You can click "Renew sprint" to assign new dates.`
                      : isAll && moveTo === 'new'
                        ? 'Each sprint with open work gets a new sprint of the same name and project, started with these dates. Sprints with nothing open just close.'
                        : `Open work items will be moved out of ${isAll ? 'these sprints' : 'this sprint'}.`}
                  </p>
                  {isAll && moveTo === 'new' && (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <label className="block text-[13px] text-gray-700">
                        New sprints start
                        <input type="date" value={newStart} onChange={(e) => setNewStart(e.target.value)}
                          className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-[14px] outline-none focus:border-blue-500" />
                      </label>
                      <label className="block text-[13px] text-gray-700">
                        New sprints end
                        <input type="date" value={newEnd} onChange={(e) => setNewEnd(e.target.value)}
                          className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-[14px] outline-none focus:border-blue-500" />
                      </label>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-8 pb-6">
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="p-2 text-[14px] font-medium text-gray-700 hover:bg-gray-100 rounded transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleComplete}
            disabled={isSaving || (isAll ? chosen.length === 0 : !sprint)}
            className="px-5 py-2 text-[14px] font-medium text-white bg-red-600 hover:bg-red-700 rounded transition disabled:opacity-50"
          >
            {isSaving ? 'Completing…' : isAll ? `Complete ${plural(chosen.length, 'sprint')}` : 'Complete sprint'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompleteSprintModal;

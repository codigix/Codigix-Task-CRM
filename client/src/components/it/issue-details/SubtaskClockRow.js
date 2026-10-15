import React, { useState } from 'react';
import { Play, Pause, Timer } from 'lucide-react';
import { useSubtaskTime, fmtDuration, fmtClock } from './subtaskTime';

/**
 * In a subtask's Details, in place of "Planned time": a subtask has none of its own. It shows
 * the main task's plan it draws from, this subtask's time with its live clock, and Start / Pause.
 */
export default function SubtaskClockRow({ parentKey, subtask, me, onStarted }) {
  const time = useSubtaskTime(parentKey, `${subtask?.id}:${subtask?.status}:${subtask?.assignee}`);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!subtask) return null;
  const run = time.runningOf(subtask.id);
  const used = time.usedBy(subtask.id);
  const done = subtask.completed || /^done$/i.test(subtask.status || '');
  const b = time.budget;

  const toggle = async () => {
    setBusy(true); setError('');
    try {
      if (run) await time.stop(subtask.id, me);
      else { await time.start(subtask.id, me); if (onStarted) onStarted(); }
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="flex items-start min-h-[32px] gap-2">
      <span className="w-24 shrink-0 text-gray-500 font-medium text-xs pt-1" title="Subtasks have no planned time of their own; their time comes off the main task's plan.">Time</span>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          {run
            ? <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 tabular-nums"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />{fmtClock(used)}</span>
            : <span className="text-xs font-medium text-gray-800 tabular-nums">{used ? fmtDuration(used) : 'Not started'}</span>}
          {!done && (
            <button type="button" onClick={toggle} disabled={busy}
              className={`ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-medium cursor-pointer disabled:opacity-50 ${run ? 'border-amber-300 text-amber-700 hover:bg-amber-50' : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'}`}>
              {run ? <><Pause size={11} /> Pause</> : <><Play size={11} /> Start</>}
            </button>
          )}
        </div>
        {run && <div className="text-[10px] text-gray-500">Clock running for {run.owner}</div>}
        {b && (
          <div className={`text-[10px] leading-snug flex items-start gap-1 ${b.planned && b.left < 0 ? 'text-red-700' : 'text-gray-500'}`}>
            <Timer size={10} className="mt-0.5 shrink-0" />
            {b.planned
              ? <span>No planned time needed: uses the main task's plan of {fmtDuration(b.planned)} ({b.left >= 0 ? `${fmtDuration(b.left)} left` : `over by ${fmtDuration(-b.left)}`})</span>
              : <span className="text-amber-700">Set the main task's planned time first; subtasks use it.</span>}
          </div>
        )}
        {error && <div className="text-[11px] text-red-700">{error}</div>}
      </div>
    </div>
  );
}

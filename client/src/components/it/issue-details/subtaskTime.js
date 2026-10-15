import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '../../../config/environment';

/**
 * Subtasks have no planned time of their own: they draw on the main task's plan. This loads
 * how much each subtask has used (server: GET /it-kanban/issues/:key/subtask-time), ticks the
 * running clocks every second, and starts / pauses a subtask's clock.
 */

export const SUBTASK_TIME_EVENT = 'crm-subtask-time';

/** 3725 -> "1h 02m", 540 -> "9m". */
export const fmtDuration = (seconds) => {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60);
  if (h) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m}m`;
};
/** Running counter: 3725 -> "1:02:05". */
export const fmtClock = (seconds) => {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export function useSubtaskTime(issueKey, refreshSignal) {
  const [data, setData] = useState(null);
  const [now, setNow] = useState(Date.now());
  const skew = useRef(0); // server clock minus browser clock, so counters match the server

  const reload = useCallback(async () => {
    if (!issueKey) return;
    try {
      const res = await fetch(`${API_BASE_URL}/it-kanban/issues/${encodeURIComponent(issueKey)}/subtask-time`, { cache: 'no-store' });
      if (!res.ok) return;
      const d = await res.json();
      if (d.now) skew.current = new Date(d.now).getTime() - Date.now();
      setData(d);
    } catch (e) { /* keep the last figures */ }
  }, [issueKey]);

  // Reload when the subtasks change (status / assignee), a little after the save lands.
  useEffect(() => { const t = setTimeout(reload, 700); return () => clearTimeout(t); }, [reload, refreshSignal]);
  useEffect(() => {
    const onChange = (e) => { if (!e.detail || e.detail === issueKey) reload(); };
    window.addEventListener(SUBTASK_TIME_EVENT, onChange);
    return () => window.removeEventListener(SUBTASK_TIME_EVENT, onChange);
  }, [issueKey, reload]);

  const anyRunning = Boolean(data && (data.mainTimer || Object.values(data.subtasks || {}).some(s => s.running)));
  useEffect(() => {
    if (!anyRunning) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [anyRunning]);

  const runningSeconds = (startedAt) => Math.max(0, Math.floor((now + skew.current - new Date(startedAt).getTime()) / 1000));
  /** Seconds a subtask has used, including its running clock. */
  const usedBy = (subtaskId) => {
    const s = data?.subtasks?.[String(subtaskId)];
    if (!s) return 0;
    return s.seconds + (s.running ? runningSeconds(s.running.startedAt) : 0);
  };
  const runningOf = (subtaskId) => data?.subtasks?.[String(subtaskId)]?.running || null;
  // The main task's plan, and what everything (main task + subtasks, running clocks included) has used.
  const live = data ? Object.values(data.subtasks || {}).reduce((sum, s) => sum + (s.running ? runningSeconds(s.running.startedAt) : 0), 0)
    + (data.mainTimer ? runningSeconds(data.mainTimer.startedAt) : 0) : 0;
  const budget = data ? { planned: data.plannedSeconds || 0, used: (data.spentSeconds || 0) + live, left: (data.plannedSeconds || 0) - (data.spentSeconds || 0) - live } : null;

  const act = async (subtaskId, action, userName) => {
    const res = await fetch(`${API_BASE_URL}/it-kanban/issues/${encodeURIComponent(issueKey)}/subtasks/${encodeURIComponent(subtaskId)}/timer/${action}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(userName ? { 'x-user-name': userName } : {}) }
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d.error || 'Could not change the clock');
    await reload();
    window.dispatchEvent(new CustomEvent(SUBTASK_TIME_EVENT, { detail: issueKey }));
    return d;
  };

  return { data, budget, usedBy, runningOf, runningSeconds, reload, start: (id, u) => act(id, 'start', u), stop: (id, u) => act(id, 'stop', u) };
}

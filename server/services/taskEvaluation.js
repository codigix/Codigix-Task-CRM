/**
 * Effort points are earned per finished task from nine parameters (the review framework HR uses).
 *
 *   points earned = base points (standard size x priority, see services/effort.js) x task score / 100
 *   task score    = weighted average of the parameters that have data for that task (weights below)
 *
 * Every parameter is estimated from what the system recorded; nothing here depends on a number the
 * employee types in. Parameters with no data for a task are left out and the rest re-weighted.
 */

const DAY = 24 * 60 * 60 * 1000;

// Weights total 100. Change them here and every report follows.
const PARAMETERS = [
  { key: 'timeEfficiency', label: 'Time efficiency', weight: 15, how: 'Actual time taken against the trusted estimate (a manager-approved plan, else the standard size for the work)' },
  { key: 'completion', label: 'Task completion', weight: 15, how: 'The task was finished' },
  { key: 'timely', label: 'Timely delivery', weight: 15, how: 'Handed in for review by the deadline' },
  { key: 'quality', label: 'Quality of work', weight: 15, how: 'Reviewer rating; otherwise how often the work had to be reopened' },
  { key: 'proof', label: 'Review & proof', weight: 10, how: 'Links, screenshots, files or notes submitted as evidence' },
  { key: 'rework', label: 'Rework / error rate', weight: 10, how: 'Times the task was reopened after being marked done' },
  { key: 'planning', label: 'Planning', weight: 5, how: 'A planned time and a due date were set, and the deadline was not pushed back by the assignee' },
  { key: 'initiative', label: 'Initiative', weight: 5, how: 'Raised the task themselves, or finished it ahead of the deadline' },
  { key: 'communication', label: 'Communication', weight: 10, how: 'Comments and updates written on the task' }
];
const WEIGHT = Object.fromEntries(PARAMETERS.map(p => [p.key, p.weight]));

const clamp = (n, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, n));
const eod = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
const RATING = { excellent: 100, good: 85, needs_work: 50 };

/**
 * Scores for one finished task. `t` is a task fact from performanceReport; `ctx.actualHours` is the time
 * its assignee recorded on it. Returns { score, parts: { key: 0-100 | null } } or null when nothing can be judged.
 */
const evaluate = (t, ctx = {}) => {
  const parts = {};

  // Time efficiency: actual vs the trusted plan. Up to 10% over is fine; beyond that it drops with the overrun.
  const plan = Number(t.planHours) || 0;
  const actual = Number(ctx.actualHours) || 0;
  parts.timeEfficiency = plan > 0 && actual > 0 ? Math.round(clamp(100 * Math.min(1, 1.1 / (actual / plan)))) : null;

  parts.completion = t.completedAt ? 100 : null;

  // Timely delivery: judged on when the assignee handed the work in for review, not when the reporter approved it.
  const handedIn = t.submittedAt || t.completedAt;
  if (t.dueAt && handedIn) {
    const late = (handedIn - eod(t.dueAt)) / DAY;
    parts.timely = late <= 0 ? 100 : late <= 1 ? 80 : late <= 2 ? 60 : late <= 5 ? 40 : 20;
  } else parts.timely = null;

  // Quality: the reviewer's rating when there is one; otherwise a neutral 90 reduced by rework.
  const rating = String(t.rating || '').toLowerCase();
  const reopened = (Number(t.reopened) || 0) + (Number(t.sentBack) || 0); // reopened after Done + sent back from review
  parts.quality = rating in RATING ? RATING[rating] : Math.max(40, 90 - 25 * reopened);

  // Review & proof: what was submitted when the task went to review. Tasks with no evidence record (older work) are not judged.
  const ev = t.evidence;
  parts.proof = ev ? ((ev.files > 0 || ev.links > 0) ? 100 : ev.note ? 70 : 40) : null;

  parts.rework = reopened === 0 ? 100 : reopened === 1 ? 60 : reopened === 2 ? 30 : 0;

  // Planning: planned time and due date set, deadline not pushed back by the assignee.
  let planning = 100;
  if (!(t.estimateHours > 0 || t.estimateApproved)) planning -= 30;
  if (!t.dueAt) planning -= 25;
  planning -= 20 * (Number(t.selfMoves) || 0);
  parts.planning = Math.max(0, planning);

  // Initiative: raised by themselves and/or finished ahead of the deadline, on top of a neutral 60.
  let initiative = 60;
  if (t.selfRaised) initiative += 25;
  if (t.dueAt && handedIn && (eod(t.dueAt) - handedIn) / DAY >= 1) initiative += 15;
  parts.initiative = Math.min(100, initiative);

  // Communication: comments the assignee wrote on the task.
  const n = t.ownComments;
  parts.communication = n == null ? null : n >= 2 ? 100 : n === 1 ? 80 : 50;

  let sum = 0; let w = 0;
  PARAMETERS.forEach(p => { const v = parts[p.key]; if (v != null) { sum += v * p.weight; w += p.weight; } });
  if (!w) return null;
  return { score: Math.round(sum / w), parts };
};

/**
 * Average of each parameter over many evaluated tasks, weighted by each task's base points (a 4-point video counts
 * for more than a 1-point post), plus the overall score. items: [{ ev, w }]
 */
const summarize = (items) => {
  const list = items.filter(i => i && i.ev);
  if (!list.length) return { score: null, parameters: PARAMETERS.map(p => ({ key: p.key, label: p.label, weight: p.weight, how: p.how, score: null, tasks: 0 })) };
  const parameters = PARAMETERS.map(p => {
    const vals = list.filter(i => i.ev.parts[p.key] != null);
    const wsum = vals.reduce((s, i) => s + i.w, 0);
    return {
      key: p.key, label: p.label, weight: p.weight, how: p.how,
      score: wsum ? Math.round(vals.reduce((s, i) => s + i.ev.parts[p.key] * i.w, 0) / wsum) : null, tasks: vals.length
    };
  });
  const avail = parameters.filter(p => p.score != null);
  const totalW = avail.reduce((s, p) => s + p.weight, 0);
  avail.forEach(p => { p.effectiveWeight = Math.round((p.weight / totalW) * 1000) / 10; p.weighted = Math.round((p.score * p.weight / totalW) * 10) / 10; });
  const totalTaskW = list.reduce((s, i) => s + i.w, 0);
  return { score: Math.round(list.reduce((s, i) => s + i.ev.score * i.w, 0) / totalTaskW), parameters };
};

module.exports = { PARAMETERS, WEIGHT, evaluate, summarize };

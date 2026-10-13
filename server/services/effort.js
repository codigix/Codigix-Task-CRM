/**
 * Effort credit: how much a finished task is worth, and who may see the numbers.
 *
 * Principle: nothing the assignee types in can raise their own credit.
 *   size     = the standard size of that kind of work (the work_type_sizes catalogue that HR and
 *              managers maintain; measured medians of the whole team are offered as suggestions)
 *   weight   = a priority weight
 *   credit   = size x weight x a quality factor (+/- 25%) built from facts the system recorded:
 *              finished by the deadline, deadline moved by the assignee, reopened, reviewer rating
 *
 * Planned time and logged time are never part of the credit. They are only checked for patterns
 * (see detectFlags) so a manager can look at them.
 */

const DAY = 24 * 60 * 60 * 1000;

const FALLBACK_SIZE = 1; // hours, for a kind of work that has no standard size yet
const PRIORITY_WEIGHT = { lowest: 1, low: 1, medium: 1, high: 1.25, highest: 1.5, critical: 1.5 };
const PRIORITY_RANK = { lowest: 1, low: 2, medium: 3, high: 4, highest: 5, critical: 6 };
const FACTOR_MIN = 0.75;
const FACTOR_MAX = 1.25;
// Reviewer's quality rating on a finished task (set when points are approved).
const RATING_DELTA = { excellent: 0.10, good: 0, needs_work: -0.15 };

const norm = (s) => String(s == null ? '' : s).toLowerCase().trim();
const weightFor = (priority) => PRIORITY_WEIGHT[norm(priority) || 'medium'] || 1;
const rankOf = (priority) => PRIORITY_RANK[norm(priority) || 'medium'] || PRIORITY_RANK.medium;
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const round = (n, dp = 2) => (n == null || !isFinite(n) ? null : Math.round(n * 10 ** dp) / 10 ** dp);

/** Points on a ticket: its standard size x priority, whole numbers, at least 1. */
const pointsFor = (sizeHours, priority) => Math.max(1, Math.round((Number(sizeHours) > 0 ? Number(sizeHours) : FALLBACK_SIZE) * weightFor(priority)));

/** Standard size in hours for a work type; falls back to FALLBACK_SIZE. `sizes` is a Map(lowercase type -> hours). */
const sizeOf = (sizes, workType) => {
  const hit = sizes && sizes.get(norm(workType));
  return Number(hit) > 0 ? Number(hit) : null;
};

/**
 * The deadline to hold someone to. Moves made by the assignee themselves do not count, so
 * pushing a date back never rescues a late task; moves made by someone else (a manager)
 * do. Returns { dueAt, selfMoves } given the ticket's current due date and its due_date history.
 * events: [{ old_value, new_value, changed_by, at }] oldest first. isAssignee(name) -> bool.
 */
const effectiveDue = (currentDue, events, isAssignee) => {
  const list = (events || []).filter((e) => e && e.new_value !== e.old_value);
  if (!list.length) return { dueAt: currentDue || null, selfMoves: 0 };
  // A date-only value ("2026-10-20") is that calendar day in local time, not midnight UTC.
  const parse = (v) => {
    if (!v) return null;
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v).trim());
    const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(v);
    return isNaN(d.getTime()) ? null : d;
  };
  // the deadline as first set: the old value of the first change, or (if it started blank) what it was first set to
  let due = parse(list[0].old_value) || parse(list[0].new_value);
  let selfMoves = 0;
  list.forEach((e, i) => {
    const to = parse(e.new_value);
    const first = i === 0 && !parse(e.old_value); // first time it was set
    if (first) return;
    if (isAssignee(e.changed_by)) { if (to && due && to > due) selfMoves += 1; return; }
    if (to) due = to;
  });
  return { dueAt: due || currentDue || null, selfMoves };
};

/**
 * Quality factor (0.75 - 1.25) and the reasons, from recorded facts only.
 * { dueAt, completedAt, selfMoves, reopened, rating }
 */
const qualityFactor = ({ dueAt, completedAt, selfMoves = 0, reopened = 0, rating = null } = {}) => {
  const parts = [];
  if (dueAt && completedAt) {
    const eod = new Date(dueAt.getFullYear(), dueAt.getMonth(), dueAt.getDate(), 23, 59, 59, 999);
    const lateDays = (completedAt - eod) / DAY;
    if (lateDays <= 0) parts.push({ key: 'on_time', label: 'Finished by the deadline', delta: 0.05 });
    else if (lateDays <= 2) parts.push({ key: 'late', label: 'Finished up to 2 days late', delta: -0.05 });
    else parts.push({ key: 'late', label: 'Finished more than 2 days late', delta: -0.10 });
  }
  if (selfMoves > 0) parts.push({ key: 'self_moved', label: `Moved own deadline ${selfMoves} time${selfMoves > 1 ? 's' : ''}`, delta: -Math.min(0.10, 0.03 * selfMoves) });
  if (reopened > 0) parts.push({ key: 'rework', label: `Reopened ${reopened} time${reopened > 1 ? 's' : ''}`, delta: -Math.min(0.20, 0.10 * reopened) });
  const r = norm(rating);
  if (r && r in RATING_DELTA) parts.push({ key: 'rating', label: { excellent: 'Reviewer: excellent', good: 'Reviewer: good', needs_work: 'Reviewer: needs improvement' }[r], delta: RATING_DELTA[r] });
  const sum = parts.reduce((s, p) => s + p.delta, 0);
  return { factor: round(clamp(1 + sum, FACTOR_MIN, FACTOR_MAX), 3), parts, capped: 1 + sum < FACTOR_MIN || 1 + sum > FACTOR_MAX };
};

/**
 * Patterns that suggest padded plans or padded time. Never changes anyone's credit; the
 * report shows them to HR so they can look. Input is a plain summary:
 *  { plannedVsActual: [{ plan, actual }], planRatios: [own plan / standard size], manualHours, timerHours,
 *    hoursLogged, availableHours, longestDayHours, daysWithTimeNoActivity, effortHours }
 */
const detectFlags = (x = {}) => {
  const flags = [];
  const pa = (x.plannedVsActual || []).filter((r) => r.plan > 0 && r.actual > 0);
  if (pa.length >= 5) {
    const spot = pa.filter((r) => Math.abs(r.actual / r.plan - 1) <= 0.05).length;
    if (spot / pa.length >= 0.6) flags.push({ code: 'plan_equals_actual', level: 'warn', text: `Logged time matched the plan within 5% on ${spot} of ${pa.length} tasks, which is unusually exact.` });
  }
  if (pa.length >= 5) {
    const fast = pa.filter((r) => r.actual < r.plan * 0.5).length;
    if (fast / pa.length >= 0.6) flags.push({ code: 'far_under_plan', level: 'warn', text: `Finished in under half of their own planned time on ${fast} of ${pa.length} tasks. That can mean the plans were set high on purpose.` });
  }
  const ratios = (x.planRatios || []).filter((r) => r > 0);
  if (ratios.length >= 3) {
    const high = ratios.filter((r) => r >= 1.5).length;
    if (high / ratios.length >= 0.4) flags.push({ code: 'padded_plans', level: 'warn', text: `Own plans were at least 1.5x the standard size on ${high} of ${ratios.length} tasks.` });
  }
  const total = (x.manualHours || 0) + (x.timerHours || 0);
  if (total >= 10 && (x.manualHours || 0) / total > 0.6) flags.push({ code: 'manual_time', level: 'info', text: `${Math.round(((x.manualHours || 0) / total) * 100)}% of logged hours were typed in by hand, not recorded by the timer.` });
  if (x.availableHours > 0 && x.hoursLogged > x.availableHours * 1.1) flags.push({ code: 'over_capacity', level: 'warn', text: `Logged ${round(x.hoursLogged, 1)}h against ${round(x.availableHours, 1)}h of working time.` });
  if (x.longestDayHours > 12) flags.push({ code: 'long_day', level: 'warn', text: `A single day with ${round(x.longestDayHours, 1)}h logged.` });
  if (x.daysWithTimeNoActivity >= 3) flags.push({ code: 'time_without_activity', level: 'info', text: `${x.daysWithTimeNoActivity} days with logged time but no status change, finished task or meeting.` });
  if (x.availableHours > 0 && x.effortHours > x.availableHours * 1.1) flags.push({ code: 'effort_over_capacity', level: 'warn', text: 'Credited effort is above the working time available; tasks may have been closed in bulk.' });
  return flags;
};

/** Who may see effort points and everything derived from them: admins and HR only. */
const HR_RE = /\bhr\b|human resource/;
const canSeeEffort = (user) => {
  if (!user) return false;
  if (user.isAdmin) return true;
  return HR_RE.test(norm(user.role)) || HR_RE.test(norm(user.department)) || HR_RE.test(norm(user.job_title));
};

// Fields that expose effort points or figures derived from them.
const EFFORT_KEYS = new Set([
  'effort_points', 'effortPoints', 'point_value', 'contribution_method', 'contribution_review_status',
  'effortHours', 'effortPerDay', 'avgEffortPerTask', 'effortByBasis', 'effortBasis', 'effortExceedsCapacity',
  'productivity', 'pointsEarned', 'pointsApproved', 'planVsStandard', 'ownPlansCount', 'qualityFactor', 'qualityParts', 'effortFlags'
]);

/** Remove effort fields from any JSON-like value (in place), at any depth. */
const stripEffort = (v) => {
  if (Array.isArray(v)) { v.forEach(stripEffort); return v; }
  if (v && typeof v === 'object' && !(v instanceof Date) && !Buffer.isBuffer(v)) {
    for (const k of Object.keys(v)) { if (EFFORT_KEYS.has(k)) delete v[k]; else stripEffort(v[k]); }
  }
  return v;
};

/** Standard sizes: built-in defaults, overridden by what HR / managers saved. Map(lowercase type -> hours). */
const loadSizes = async (pool, defaults) => {
  const sizes = new Map(Object.entries(defaults || {}).map(([k, v]) => [norm(k), Number(v)]));
  try {
    const [rows] = await pool.query('SELECT work_type, hours FROM work_type_sizes');
    rows.forEach((r) => { if (Number(r.hours) > 0) sizes.set(norm(r.work_type), Number(r.hours)); });
  } catch (e) { /* table not created yet: defaults only */ }
  return sizes;
};

module.exports = {
  FALLBACK_SIZE, PRIORITY_WEIGHT, FACTOR_MIN, FACTOR_MAX,
  weightFor, rankOf, pointsFor, sizeOf, effectiveDue, qualityFactor, detectFlags,
  canSeeEffort, stripEffort, EFFORT_KEYS, loadSizes
};

/**
 * Helpers shared by the on-screen performance report and its downloadable PDFs, so both
 * always agree on what is shown.
 */

const fmtD = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/** Week buckets inside the period (W1 = days 1-7 ... the last one runs to the end of a month). Null for long periods. */
export const weekBuckets = (range) => {
  if (!range || range.period === 'day' || range.period === 'week') return null;
  const from = new Date(range.from); from.setHours(0, 0, 0, 0);
  const end = new Date(range.to);
  const limit = new Date(Math.min(end.getTime(), Date.now()));
  const span = Math.round((end - from) / 86400000) + 1;
  if (span > 37 || limit < from) return null;
  const out = [];
  let start = new Date(from);
  for (let i = 1; start <= limit; i += 1) {
    let stop = new Date(start); stop.setDate(stop.getDate() + 6);
    if (range.period === 'month' && i === 4) stop = new Date(end);
    if (stop > end) stop = new Date(end);
    stop.setHours(23, 59, 59, 999);
    out.push({ key: `W${i}`, from: new Date(start), to: stop, label: `${fmtD(start)} – ${fmtD(stop)}` });
    if (range.period === 'month' && i === 4) break;
    start = new Date(stop); start.setDate(start.getDate() + 1); start.setHours(0, 0, 0, 0);
  }
  return out;
};

/** Per-week task counts and estimated / actual hours for the weekly charts. Null when the period is too long or too short. */
export const weeklyRows = (tasks, range) => {
  const weeks = weekBuckets(range);
  if (!weeks) return null;
  return weeks.map(w => {
    const inWeek = (tasks || []).filter(t => { const at = t.creditAt || t.completedAt; const d = at ? new Date(at) : null; return d && d >= w.from && d <= w.to; });
    const planned = inWeek.filter(t => t.planHours > 0 && t.hoursLogged > 0);
    return {
      week: w.key, label: w.label, Tasks: inWeek.length,
      Estimated: Math.round(planned.reduce((a, t) => a + t.planHours, 0) * 10) / 10,
      Actual: Math.round(planned.reduce((a, t) => a + t.hoursLogged, 0) * 10) / 10
    };
  });
};

/** Quality score = share of finished tasks that were not reopened after being marked done. */
export const qualityScoreOf = (m) => (m.tasksCompleted > 0
  ? Math.max(0, Math.round(((m.tasksCompleted - Math.min(m.reopened || 0, m.tasksCompleted)) / m.tasksCompleted) * 100))
  : null);

export const improvementAreasOf = (m) => {
  const out = [];
  const diff = m.plannedHours > 0 ? Math.round(((m.actualHoursOnPlanned - m.plannedHours) / m.plannedHours) * 100) : null;
  if (diff != null && diff > 10) out.push({ tone: 'amber', title: 'Improve estimation accuracy', text: `Actual time is ~${diff}% higher than estimated (${m.actualHoursOnPlanned} h vs ${m.plannedHours} h on ${m.tasksWithPlan} tasks).` });
  if (m.planCoverage != null && m.planCoverage < 60 && m.tasksCompleted > 0) out.push({ tone: 'amber', title: 'Add planned time to tasks', text: `Only ${m.planCoverage}% of finished tasks had a planned time, so estimation can't be measured properly.` });
  if ((m.reopened || 0) > 0) out.push({ tone: 'red', title: 'Reduce reopened tasks', text: `${m.reopened} task${m.reopened > 1 ? 's were' : ' was'} reopened after being marked done${m.tasksCompleted ? ` (${Math.round((Math.min(m.reopened, m.tasksCompleted) / m.tasksCompleted) * 100)}% of finished work)` : ''}.` });
  if (m.lateCompleted > 0 && m.onTimeRate != null && m.onTimeRate < 90) out.push({ tone: 'red', title: 'Deliver on time', text: `${m.lateCompleted} task${m.lateCompleted > 1 ? 's' : ''} finished after the due date (on-time ${m.onTimeRate}%).` });
  if (m.overdueOpen > 0) out.push({ tone: 'red', title: 'Clear overdue work', text: `${m.overdueOpen} open task${m.overdueOpen > 1 ? 's are' : ' is'} past the due date right now.` });
  if (m.reschedules >= 3) out.push({ tone: 'amber', title: 'Fewer deadline changes', text: `${m.reschedules} due-date moves on ${m.rescheduledTasks} task(s); ${m.postponedDays} days pushed back in total.` });
  if ((m.loggingRate != null && m.loggingRate < 70) || (m.tasksCompleted > 0 && m.updates + m.comments < m.tasksCompleted)) {
    out.push({ tone: 'purple', title: 'Update tickets consistently', text: `${m.loggingRate ?? 0}% of finished tasks have time logged and there are ${m.updates + m.comments} updates/comments in the period. Keep worklogs, status and comments up to date.` });
  }
  return out;
};

export const splitLines = (t) => String(t || '').split(/\r?\n/).map(x => x.replace(/^[\s\-•*]+/, '').trim()).filter(Boolean);

/** The review whose action plan the report shows: one written inside the period, else the latest with a plan. */
export const planReviewOf = (reviews, range) => {
  const inPeriod = (reviews || []).filter(r => r.at && new Date(r.at) >= new Date(range.from) && new Date(r.at) <= new Date(range.to));
  const withPlan = (list) => list.find(r => r.strengths || r.focusNextMonth || r.actions);
  return withPlan(inPeriod) || withPlan(reviews || []) || null;
};

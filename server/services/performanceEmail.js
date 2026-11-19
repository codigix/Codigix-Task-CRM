/**
 * Each employee's performance report as an email, built from their row of the team report
 * (services/performanceReport.js buildTeamReport) so it shows exactly the numbers HR sees.
 *
 * Effort figures are for HR and admins only (services/effort.js EFFORT_KEYS), so the email never
 * includes them, nor any sentence built from them or from the effort/padding checks.
 */
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const show = (v, unit = '') => (v == null ? '—' : `${v}${unit}`);

// Insight sentences built from effort figures or the plan/padding checks are HR-only.
const HR_ONLY_INSIGHT = /effort|plan|bulk|unusually exact/i;

const employeeInsights = (row) => {
  const flagTexts = new Set((row.metrics?.effortFlags || []).map(f => f.text));
  const keep = (list) => (list || []).filter(t => !flagTexts.has(t) && !HR_ONLY_INSIGHT.test(t));
  return { strengths: keep(row.insights?.strengths), attention: keep(row.insights?.attention) };
};

/** Has this person anything recorded in the period? People with nothing get no email. */
const hasActivity = (row) => {
  const m = row.metrics || {};
  return row.score != null || m.tasksCompleted > 0 || m.hoursLogged > 0 || m.meetings > 0 || m.tasksAssigned > 0;
};

const GRADE_COLOR = { Excellent: '#059669', Good: '#2563eb', Fair: '#d97706', 'Needs attention': '#dc2626', 'Not enough data': '#6b7280' };

/** The figures an employee is shown (email and PDF), as [label, value] pairs. */
const employeeStats = (row) => {
  const m = row.metrics || {};
  return [
    ['Tasks completed', show(m.tasksCompleted)],
    ['Finished on time', m.onTimeRate == null ? '—' : `${m.onTimeRate}% (${m.onTimeCompleted || 0} on time, ${m.lateCompleted || 0} late)`],
    ['Open tasks past due date', show(m.overdueOpen)],
    ['Hours recorded', m.hoursLogged == null ? '—' : `${m.hoursLogged} h of ${show(m.availableHours)} h available`],
    ['Average time per task', show(m.avgHoursPerTask, ' h')],
    ['Average start-to-finish', show(m.avgCycleDays, ' days')],
    ['Days with recorded activity', m.workingDays ? `${m.activeDays || 0} of ${m.workingDays} working days` : show(m.activeDays)],
    ['Meetings attended', m.meetings ? `${m.meetings}${m.meetingHours ? ` (${m.meetingHours} h)` : ''}` : '0'],
    ['Due dates moved', show(m.reschedules)]
  ];
};

const SCORE_NOTE = 'How the score is made: work delivered (40%), finished on time (20%), days with activity (15%), manager review (15%) and hours recorded (10%). Parts with no data are left out. Move tasks to In Progress while you work and keep due dates realistic so your report reflects your work fully.';

const buildEmployeeEmail = (row, range, { appUrl, senderName, hasPdf } = {}) => {
  const { strengths, attention } = employeeInsights(row);
  const first = String(row.name || '').split(' ')[0] || 'there';
  const period = range?.label || 'this period';
  const gradeColor = GRADE_COLOR[row.grade] || '#6b7280';
  const stats = employeeStats(row);

  const list = (items) => items.length
    ? `<ul style="margin:6px 0 0;padding-left:18px;color:#374151">${items.map(t => `<li style="margin:4px 0">${esc(t)}</li>`).join('')}</ul>`
    : `<p style="margin:6px 0 0;color:#9ca3af">Nothing to note.</p>`;

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
    <div style="background:#1e3a8a;padding:18px 22px;color:#fff">
      <div style="font-size:13px;opacity:.85">Codigix CRM · Performance report</div>
      <div style="font-size:20px;font-weight:bold;margin-top:4px">${esc(period)}</div>
    </div>
    <div style="padding:22px;color:#111827;line-height:1.55">
      <p style="margin:0 0 14px">Hello <strong>${esc(first)}</strong>,</p>
      <p style="margin:0 0 18px">Here is your performance summary for <strong>${esc(period)}</strong>, built from the work recorded in Codigix CRM.</p>

      <table style="width:100%;border-collapse:collapse;margin:0 0 18px">
        <tr>
          <td style="padding:14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;text-align:center;width:50%">
            <div style="font-size:12px;color:#6b7280">Score</div>
            <div style="font-size:28px;font-weight:bold;color:${gradeColor}">${row.score == null ? '—' : `${row.score}<span style="font-size:14px;color:#6b7280"> / 100</span>`}</div>
            <div style="font-size:13px;font-weight:bold;color:${gradeColor}">${esc(row.grade || 'Not enough data')}</div>
          </td>
          <td style="padding:14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;text-align:center;width:50%">
            <div style="font-size:12px;color:#6b7280">Team rank</div>
            <div style="font-size:28px;font-weight:bold;color:#111827">${row.rank ? `#${row.rank}` : '—'}</div>
            <div style="font-size:13px;color:#6b7280">${row.rank ? `of ${row.rankedOutOf} ranked` : 'Not ranked this period'}</div>
          </td>
        </tr>
      </table>

      <table style="width:100%;border-collapse:collapse;font-size:13px;margin:0 0 18px">
        ${stats.map(([k, v]) => `<tr><td style="padding:8px;border-bottom:1px solid #f3f4f6;color:#6b7280;width:48%">${esc(k)}</td><td style="padding:8px;border-bottom:1px solid #f3f4f6;font-weight:bold">${esc(v)}</td></tr>`).join('')}
      </table>

      <div style="margin:0 0 14px"><div style="font-weight:bold;color:#059669">What went well</div>${list(strengths)}</div>
      <div style="margin:0 0 18px"><div style="font-weight:bold;color:#d97706">To work on</div>${list(attention)}</div>

      <p style="font-size:12px;color:#6b7280;margin:0 0 14px">${esc(SCORE_NOTE)}</p>
      ${hasPdf ? '<p style="font-size:13px;margin:0 0 14px">📎 Your full report is attached as a PDF.</p>' : ''}

      ${appUrl ? `<div style="text-align:center;margin:20px 0 6px"><a href="${esc(appUrl)}" style="background:#2563eb;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;font-weight:bold;font-size:14px;display:inline-block">Open Codigix CRM</a></div>` : ''}
      <p style="font-size:12px;color:#6b7280;margin:14px 0 0">Questions about this report? Reply to this email${senderName ? ` or talk to ${esc(senderName)}` : ''}.</p>
    </div>
  </div>`;

  const text = [
    `Hello ${first},`, '', `Your performance summary for ${period}:`,
    `Score: ${row.score == null ? '—' : `${row.score}/100`} (${row.grade || 'Not enough data'})${row.rank ? `, rank #${row.rank} of ${row.rankedOutOf}` : ''}`,
    ...stats.map(([k, v]) => `${k}: ${v}`), '',
    'What went well:', ...(strengths.length ? strengths.map(t => `- ${t}`) : ['- Nothing to note.']), '',
    'To work on:', ...(attention.length ? attention.map(t => `- ${t}`) : ['- Nothing to note.']),
    appUrl ? `\nOpen Codigix CRM: ${appUrl}` : ''
  ].join('\n');

  return { subject: `Your performance report: ${period}`, html, text };
};

module.exports = { buildEmployeeEmail, hasActivity, employeeInsights, employeeStats, SCORE_NOTE, GRADE_COLOR };

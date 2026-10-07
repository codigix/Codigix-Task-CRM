/**
 * Working-hours arithmetic.
 *
 * Time tracked automatically (a ticket sitting In Progress) is clipped to working hours,
 * so a ticket left In Progress overnight or over a weekend doesn't record 48 hours of
 * "work". Configure in server/.env with one line listing each working day's hours:
 *
 *   WORK_SCHEDULE=MON-FRI 09:30-18:30; SAT 09:30-16:30
 *
 * Days not listed (here Sunday) are days off. Day names: SUN MON TUE WED THU FRI SAT;
 * ranges like MON-FRI and lists like MON,WED are both allowed.
 */

const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DEFAULT_SCHEDULE = 'MON-FRI 09:30-18:30; SAT 09:30-16:30';

const parseClock = (value) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(value || '').trim());
  if (!m) return null;
  const h = Number(m[1]); const min = Number(m[2]);
  return h >= 0 && h < 24 && min >= 0 && min < 60 ? h * 60 + min : null;
};

const parseDays = (spec) => {
  const days = new Set();
  String(spec).toUpperCase().split(',').forEach(part => {
    const [a, b] = part.trim().split('-').map(s => DAY_NAMES.indexOf(s.trim()));
    if (a < 0) return;
    if (b == null || b < 0) { days.add(a); return; }
    for (let d = a; ; d = (d + 1) % 7) { days.add(d); if (d === b) break; }
  });
  return days;
};

/** Map of weekday (0 = Sunday) -> { startMin, endMin }. Invalid entries are ignored. */
const parseSchedule = (text) => {
  const schedule = new Map();
  String(text || '').split(';').forEach(entry => {
    const m = /^\s*([A-Za-z,\-\s]+?)\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\s*$/.exec(entry);
    if (!m) return;
    const start = parseClock(m[2]); const end = parseClock(m[3]);
    if (start == null || end == null || end <= start) return;
    parseDays(m[1]).forEach(d => schedule.set(d, { startMin: start, endMin: end }));
  });
  return schedule;
};

let cached = { text: null, schedule: null };
const schedule = () => {
  const text = process.env.WORK_SCHEDULE || DEFAULT_SCHEDULE;
  if (cached.text !== text) {
    let parsed = parseSchedule(text);
    if (parsed.size === 0) {
      console.warn(`WORK_SCHEDULE "${text}" could not be read; using "${DEFAULT_SCHEDULE}".`);
      parsed = parseSchedule(DEFAULT_SCHEDULE);
    }
    cached = { text, schedule: parsed };
  }
  return cached.schedule;
};

/** Seconds between two instants that fall inside working hours. */
const workingSecondsBetween = (from, to) => {
  const a = from instanceof Date ? from : new Date(from);
  const b = to instanceof Date ? to : new Date(to);
  if (isNaN(a) || isNaN(b) || b <= a) return 0;
  const hours = schedule();

  let total = 0;
  const day = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  // Bounded loop: at most ~2 years of days, so a stuck timer can't spin forever.
  for (let i = 0; day <= b && i < 800; i++) {
    const win = hours.get(day.getDay());
    if (win) {
      const winStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, win.startMin);
      const winEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, win.endMin);
      const s = a > winStart ? a : winStart;
      const e = b < winEnd ? b : winEnd;
      if (e > s) total += (e - s) / 1000;
    }
    day.setDate(day.getDate() + 1);
  }
  return Math.round(total);
};

/** Total working hours in a normal week, e.g. for describing the schedule. */
const weeklyWorkingHours = () => {
  let mins = 0;
  schedule().forEach(w => { mins += w.endMin - w.startMin; });
  return mins / 60;
};

/** Hours in a normal (longest) working day, e.g. 9 for 09:30–18:30. Used for "1d" in estimates. */
const workingDayHours = () => {
  let max = 0;
  schedule().forEach(w => { max = Math.max(max, w.endMin - w.startMin); });
  return max / 60 || 8;
};

/**
 * "2h 30m", "1.5h", "45m", "1d" (one working day), "1w" (one working week), or a bare
 * number of minutes → seconds. Returns 0 when nothing can be read.
 */
const parseDurationToSeconds = (input) => {
  if (input === null || input === undefined) return 0;
  const str = String(input).trim().toLowerCase();
  if (!str) return 0;
  if (/^\d+(\.\d+)?$/.test(str)) return Math.round(parseFloat(str) * 60);
  const unit = { w: weeklyWorkingHours() * 3600, d: workingDayHours() * 3600, h: 3600, m: 60 };
  let total = 0; let matched = false;
  for (const m of str.matchAll(/(\d+(?:\.\d+)?)\s*(w|d|h|hr|hrs|hour|hours|m|min|mins|minute|minutes)\b/g)) {
    total += parseFloat(m[1]) * unit[m[2][0]];
    matched = true;
  }
  return matched ? Math.round(total) : 0;
};

/** Seconds → "12h 30m". Always hours and minutes, so planned and actual compare directly. */
const formatHours = (seconds) => {
  const s = Math.round(Math.abs(Number(seconds) || 0));
  if (s === 0) return '0h';
  if (s < 60) return '1m';
  const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60);
  return [h && `${h}h`, m && `${m}m`].filter(Boolean).join(' ');
};

module.exports = { workingSecondsBetween, weeklyWorkingHours, workingDayHours, parseDurationToSeconds, formatHours, parseSchedule };

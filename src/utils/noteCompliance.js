// ============================================================================
// noteCompliance.js - Weekly client-note compliance (notes required 2x/week)
// ============================================================================
// Weeks run Monday through Sunday. A week is:
//   - "complete"    : >= NOTES_PER_WEEK notes
//   - "in-progress" : the current week, still short of the requirement
//   - "partial"     : a past week with some notes, but fewer than required
//   - "missed"      : a past week with no notes
// ============================================================================

export const NOTES_PER_WEEK = 2;
export const DEFAULT_WEEKS_TO_SHOW = 8;

const DAY_MS = 24 * 60 * 60 * 1000;

// Parse a date as a LOCAL calendar day. 'YYYY-MM-DD' strings are parsed
// manually because `new Date('2024-03-10')` is UTC midnight, which shifts to
// the previous day in US timezones.
export const toLocalDay = (value) => {
  if (!value) return null;
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

// Monday of the week containing `date` (local time).
export const startOfWeek = (date) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (d.getDay() + 6) % 7; // Mon=0 ... Sun=6
  d.setDate(d.getDate() - offset);
  return d;
};

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const sameDay = (a, b) => a.getTime() === b.getTime();

/**
 * Build the weekly note-compliance summary for a client.
 *
 * @param {Array}  notes              encounter notes ({ careNoteDate, createdAt })
 * @param {Object} [options]
 * @param {Date}   [options.today]    reference date (defaults to now)
 * @param {number} [options.weeks]    how many weeks (incl. current) to show
 * @param {*}      [options.startDate] client admit date; earlier weeks are skipped
 */
export const getWeeklyNoteCompliance = (notes = [], options = {}) => {
  const today = toLocalDay(options.today || new Date());
  const weeksToShow = options.weeks || DEFAULT_WEEKS_TO_SHOW;
  const startDate = toLocalDay(options.startDate);
  const currentWeekStart = startOfWeek(today);

  const noteDays = (Array.isArray(notes) ? notes : [])
    .map(n => toLocalDay(n?.careNoteDate || n?.createdAt))
    .filter(Boolean);

  const weeks = [];
  for (let i = weeksToShow - 1; i >= 0; i--) {
    const weekStart = addDays(currentWeekStart, -7 * i);
    const weekEnd = addDays(weekStart, 6);

    // Skip weeks that ended before the client was admitted
    if (startDate && weekEnd < startOfWeek(startDate)) continue;

    const count = noteDays.filter(d => d >= weekStart && d <= weekEnd).length;
    const isCurrent = sameDay(weekStart, currentWeekStart);

    let status;
    if (count >= NOTES_PER_WEEK) status = 'complete';
    else if (isCurrent) status = 'in-progress';
    else if (count > 0) status = 'partial';
    else status = 'missed';

    weeks.push({ weekStart, weekEnd, count, required: NOTES_PER_WEEK, isCurrent, status });
  }

  const pastWeeks = weeks.filter(w => !w.isCurrent);
  const compliantWeeks = pastWeeks.filter(w => w.status === 'complete').length;
  const currentWeek = weeks.find(w => w.isCurrent) || null;

  const lastNoteDate = noteDays.length
    ? new Date(Math.max(...noteDays.map(d => d.getTime())))
    : null;
  const daysSinceLastNote = lastNoteDate
    ? Math.round((today - lastNoteDate) / DAY_MS)
    : null;

  // Overall status: driven by last completed week, plus current-week progress
  let overallStatus;
  const lastPastWeek = pastWeeks[pastWeeks.length - 1];
  if (noteDays.length === 0) overallStatus = 'none';
  else if (lastPastWeek && lastPastWeek.status !== 'complete') overallStatus = 'behind';
  else overallStatus = 'on-track';

  return {
    weeks,
    currentWeek,
    notesNeededThisWeek: currentWeek ? Math.max(0, NOTES_PER_WEEK - currentWeek.count) : 0,
    compliantWeeks,
    totalPastWeeks: pastWeeks.length,
    complianceRate: pastWeeks.length ? Math.round((compliantWeeks / pastWeeks.length) * 100) : null,
    lastNoteDate,
    daysSinceLastNote,
    overallStatus
  };
};

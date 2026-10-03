// ============================================================================
// dateOnly.js - Helpers for calendar dates (SQL DATE columns, <input type="date">)
// ============================================================================
// A DATE column like 2026-10-05 comes back from the API as
// "2026-10-05T00:00:00.000Z" (UTC midnight), and `new Date('2026-10-05')` is
// also UTC midnight. Formatting either with toLocaleDateString() converts to
// local time, which in US timezones is the previous evening - so the date
// shows one day early. These helpers treat the value as a calendar day and
// never shift it.
//
// Only use these for date-only values. Real timestamps (createdAt, updatedAt,
// upload times) should still be converted to local time as usual.
// ============================================================================

const YMD = /^(\d{4})-(\d{2})-(\d{2})/;

// 'YYYY-MM-DD' for a date-only value, suitable for <input type="date">.
export const toDateInputValue = (value) => {
  if (!value) return '';
  if (typeof value === 'string') {
    const match = value.match(YMD);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  // Date objects for DATE columns are UTC midnight, so read the UTC parts.
  return d.toISOString().slice(0, 10);
};

// Local Date at midnight of the calendar day, or null.
export const parseDateOnly = (value) => {
  const ymd = toDateInputValue(value);
  if (!ymd) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
};

// Display string for a date-only value, e.g. "10/5/2026".
export const formatDateOnly = (value, fallback = '', locales, options) => {
  const d = parseDateOnly(value);
  return d ? d.toLocaleDateString(locales, options) : fallback;
};

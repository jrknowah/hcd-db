// ============================================================================
// localDateTime.js - Show a timestamp in the viewer's own time zone
// ============================================================================
// The API returns timestamps (createdAt, updatedAt, submittedAt, ...) as UTC
// ISO strings. This formats them in the browser's local time zone with the
// zone shown, e.g. "Oct 4, 2026, 3:12 PM PDT".
//
// Not for date-only values (SQL DATE columns): use formatDateOnly from
// dateOnly.js, which never shifts the day.
// ============================================================================

const FORMAT = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short',
};

export const formatLocalDateTime = (value, fallback = '') => {
  if (!value) return fallback;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toLocaleString(undefined, FORMAT);
};

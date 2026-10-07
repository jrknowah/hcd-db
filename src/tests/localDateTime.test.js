import { describe, it, expect } from 'vitest';
import { formatLocalDateTime } from '../utils/localDateTime';

describe('formatLocalDateTime', () => {
  it('formats a UTC timestamp in the local time zone, with the zone shown', () => {
    const value = '2026-10-04T22:12:00Z';
    const expected = new Date(value).toLocaleString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
    });
    expect(formatLocalDateTime(value)).toBe(expected);
    expect(formatLocalDateTime(new Date(value))).toBe(expected);
  });

  it('returns the fallback for empty or invalid values', () => {
    expect(formatLocalDateTime(null)).toBe('');
    expect(formatLocalDateTime('not a date', '—')).toBe('—');
  });
});

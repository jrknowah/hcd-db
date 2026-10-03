import { describe, it, expect } from 'vitest';
import { toDateInputValue, parseDateOnly, formatDateOnly } from '../utils/dateOnly';

// These must hold in any timezone; run with e.g. TZ=America/Los_Angeles to
// reproduce the original "one day early" bug.
describe('dateOnly', () => {
  it('keeps the calendar day for a SQL DATE returned as UTC midnight', () => {
    expect(toDateInputValue('2026-10-05T00:00:00.000Z')).toBe('2026-10-05');
    expect(toDateInputValue(new Date('2026-10-05T00:00:00.000Z'))).toBe('2026-10-05');
  });

  it('passes plain YYYY-MM-DD strings through', () => {
    expect(toDateInputValue('2026-10-05')).toBe('2026-10-05');
  });

  it('returns empty string for empty or invalid input', () => {
    expect(toDateInputValue(null)).toBe('');
    expect(toDateInputValue('')).toBe('');
    expect(toDateInputValue('not a date')).toBe('');
  });

  it('parses to local midnight of the same day', () => {
    const d = parseDateOnly('2026-10-05T00:00:00.000Z');
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 9, 5]);
  });

  it('formats without shifting the day', () => {
    expect(formatDateOnly('2026-10-05T00:00:00.000Z', '', 'en-US')).toBe('10/5/2026');
    expect(formatDateOnly('2026-10-05', '', 'en-US')).toBe('10/5/2026');
  });

  it('uses the fallback when there is no date', () => {
    expect(formatDateOnly(null, 'Required')).toBe('Required');
  });
});

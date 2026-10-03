// src/tests/noteCompliance.test.js
import { describe, test, expect } from 'vitest';
import { getWeeklyNoteCompliance, startOfWeek, toLocalDay } from '../utils/noteCompliance';

// Thursday, Oct 1 2026 -> current week is Mon Sep 28 - Sun Oct 4
const today = new Date(2026, 9, 1);
const note = (careNoteDate) => ({ careNoteDate });

describe('noteCompliance', () => {
  test('parses YYYY-MM-DD as a local day', () => {
    const d = toLocalDay('2026-09-28');
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 8, 28]);
  });

  test('weeks start on Monday', () => {
    expect(startOfWeek(new Date(2026, 9, 4)).getDate()).toBe(28); // Sunday -> Mon 28th
    expect(startOfWeek(new Date(2026, 8, 28)).getDate()).toBe(28);
  });

  test('classifies weeks by note count', () => {
    const result = getWeeklyNoteCompliance(
      [
        note('2026-09-21'), note('2026-09-24'), // last week: complete
        note('2026-09-16'),                     // 2 weeks ago: partial
                                                // 3 weeks ago: missed
        note('2026-09-29')                      // current week: 1 of 2
      ],
      { today, weeks: 4 }
    );

    expect(result.weeks.map(w => w.status)).toEqual(['missed', 'partial', 'complete', 'in-progress']);
    expect(result.currentWeek.count).toBe(1);
    expect(result.notesNeededThisWeek).toBe(1);
    expect(result.compliantWeeks).toBe(1);
    expect(result.totalPastWeeks).toBe(3);
    expect(result.complianceRate).toBe(33);
    expect(result.daysSinceLastNote).toBe(2);
    expect(result.overallStatus).toBe('on-track');
  });

  test('is behind when last completed week was short', () => {
    const result = getWeeklyNoteCompliance([note('2026-09-22')], { today, weeks: 2 });
    expect(result.overallStatus).toBe('behind');
  });

  test('skips weeks before the admit date', () => {
    const result = getWeeklyNoteCompliance([], { today, weeks: 8, startDate: '2026-09-23' });
    expect(result.weeks).toHaveLength(2);
    expect(result.overallStatus).toBe('none');
  });
});

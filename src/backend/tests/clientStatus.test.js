// Program choices and active/discharged status (utils/clientStatus.js)
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { getClientStatus, programError, todayAtSites } = require('../utils/clientStatus.js');

// 2026-10-15 at 11pm in Los Angeles is already 2026-10-16 in UTC
const lateEvening = new Date('2026-10-16T06:00:00Z');

describe('getClientStatus', () => {
  it('uses the calendar date in Los Angeles, not UTC', () => {
    expect(todayAtSites(lateEvening)).toBe('2026-10-15');
  });

  it('is active with no discharge date', () => {
    expect(getClientStatus({}, lateEvening)).toBe('active');
    expect(getClientStatus({ clientDischargeDate: null }, lateEvening)).toBe('active');
  });

  it('is discharged on and after the exit date', () => {
    expect(getClientStatus({ clientDischargeDate: '2026-10-15' }, lateEvening)).toBe('discharged');
    // DATE columns come back from mssql as UTC midnight
    expect(getClientStatus({ clientDischargeDate: new Date('2026-10-01T00:00:00Z') }, lateEvening)).toBe('discharged');
  });

  it('stays active before a future exit date', () => {
    expect(getClientStatus({ clientDischargeDate: '2026-10-16' }, lateEvening)).toBe('active');
  });
});

describe('programError', () => {
  it('accepts the Referrals tab programs, or no program', () => {
    for (const program of ['LAHSA', 'ODR', 'DHS', 'DMH', '', null, undefined]) {
      expect(programError(program)).toBeNull();
    }
  });

  it('rejects anything else', () => {
    expect(programError('lahsa')).toMatch(/LAHSA, ODR, DHS, DMH/);
    expect(programError('Other')).not.toBeNull();
  });
});

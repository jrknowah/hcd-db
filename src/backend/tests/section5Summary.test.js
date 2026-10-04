// Section 5 Main tab: per-tab "has data / last updated / by whom" summary.
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);
const express = require('express');
const request = require('supertest');

// Fake DB: table name -> the one summary row it returns (none = no data)
let rows;
let failing;

const fakePool = {
  request() {
    const req = {
      input() { return req; },
      async query(q) {
        const table = q.match(/FROM\s+(?:dbo\.)?(\w+)/)[1];
        if (failing.has(table)) throw new Error(`Invalid object name '${table}'`);
        return { recordset: rows[table] ? [rows[table]] : [] };
      },
    };
    return req;
  },
};

const azureSqlPath = path.resolve(__dirname, '../store/azureSql.js');
require.cache[azureSqlPath] = {
  id: azureSqlPath, filename: azureSqlPath, loaded: true,
  exports: { getPool: async () => fakePool, connectToAzureSQL: async () => fakePool },
};

const summaryRouter = require('../routes/section5Summary.js');

const app = express();
app.use('/api/section5', summaryRouter);

const byKey = (body) => Object.fromEntries(body.sections.map(s => [s.key, s]));

describe('GET /api/section5/summary/:clientID', () => {
  beforeEach(() => {
    rows = {};
    failing = new Set();
  });

  it('reports no data for a client with nothing entered', async () => {
    const res = await request(app).get('/api/section5/summary/C1');
    expect(res.status).toBe(200);
    const s = byKey(res.body);
    expect(Object.keys(s)).toEqual([
      'faceSheet', 'nursingScreening', 'nursingAssessment', 'progressNotes',
      'observationRecord', 'nursingIdt', 'providerIdt',
    ]);
    for (const sec of res.body.sections) {
      expect(sec).toMatchObject({ hasData: false, total: 0, lastUpdatedAt: null, lastUpdatedBy: null, error: false });
    }
  });

  it('reports the latest entry and who made it', async () => {
    rows.progress_notes = { total: 3, lastAt: '2026-10-02T09:00:00Z', lastBy: 'nurse@hope.org' };
    rows.idt_provider_notes = { total: 1, lastAt: '2026-09-30T12:00:00Z', lastBy: 'dr@hope.org' };

    const s = byKey((await request(app).get('/api/section5/summary/C1')).body);
    expect(s.progressNotes).toMatchObject({ hasData: true, total: 3, lastUpdatedAt: '2026-10-02T09:00:00Z', lastUpdatedBy: 'nurse@hope.org' });
    expect(s.providerIdt).toMatchObject({ hasData: true, total: 1, lastUpdatedBy: 'dr@hope.org' });
    expect(s.nursingIdt.hasData).toBe(false);
  });

  it('combines the observation record tables, newest wins', async () => {
    rows.medication_administration_record = { total: 2, lastAt: '2026-10-01T08:00:00Z', lastBy: 'a@hope.org' };
    rows.vital_signs = { total: 4, lastAt: '2026-10-03T08:00:00Z', lastBy: 'b@hope.org' };
    rows.daily_observations = { total: 1, lastAt: '2026-09-01T08:00:00Z', lastBy: 'c@hope.org' };

    const { observationRecord } = byKey((await request(app).get('/api/section5/summary/C1')).body);
    expect(observationRecord).toMatchObject({ hasData: true, total: 7, lastUpdatedAt: '2026-10-03T08:00:00Z', lastUpdatedBy: 'b@hope.org' });
  });

  it('a failing table only affects its own tab', async () => {
    failing.add('nursing_admission');
    rows.medical_screening = { total: 1, lastAt: '2026-10-01T08:00:00Z', lastBy: 'n@hope.org' };

    const res = await request(app).get('/api/section5/summary/C1');
    expect(res.status).toBe(200);
    const s = byKey(res.body);
    expect(s.nursingAssessment).toMatchObject({ hasData: false, error: true });
    expect(s.nursingScreening).toMatchObject({ hasData: true, error: false });
  });

  it('does not count archived progress notes', async () => {
    let progressQuery = '';
    const original = fakePool.request;
    fakePool.request = () => {
      const req = original();
      const query = req.query;
      req.query = async (q) => { if (/progress_notes/.test(q)) progressQuery = q; return query(q); };
      return req;
    };
    try {
      await request(app).get('/api/section5/summary/C1');
    } finally {
      fakePool.request = original;
    }
    expect(progressQuery).toMatch(/<> 'Archived'/);
  });
});

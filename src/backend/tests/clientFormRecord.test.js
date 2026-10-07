// Exit Form / Discharge Plan: one saved form per client, stamped with who saved it.
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);
const express = require('express');
const request = require('supertest');
const sql = require('mssql');

let rows;      // clientID -> saved row
let auditRows;
let nextID;

function makeRequest() {
  const params = {};
  const req = {
    input(name, _type, value) { params[name] = value; return req; },
    async query(q) {
      if (/^\s*MERGE/.test(q)) {
        const existing = rows[params.clientID];
        const fields = Object.fromEntries(Object.entries(params).filter(([k]) => !['clientID', 'user', 'now'].includes(k)));
        if (existing) {
          Object.assign(existing, fields, { updatedBy: params.user, updatedAt: params.now });
          return { recordset: [{ mergeAction: 'UPDATE', id: existing.id }] };
        }
        const row = { id: nextID++, clientID: params.clientID, ...fields, createdBy: params.user, createdAt: params.now, updatedBy: null, updatedAt: null };
        rows[params.clientID] = row;
        return { recordset: [{ mergeAction: 'INSERT', id: row.id }] };
      }
      if (/INSERT INTO dbo\.AuditLog/.test(q)) {
        auditRows.push({ ...params });
        return { recordset: [] };
      }
      if (/FROM dbo\.exit_form/.test(q)) {
        return { recordset: rows[params.clientID] ? [rows[params.clientID]] : [] };
      }
      throw new Error(`Unexpected query: ${q}`);
    },
  };
  return req;
}

const fakePool = { request: makeRequest };

class FakeTransaction {
  async begin() {}
  async commit() {}
  async rollback() {}
  request() { return makeRequest(); }
}

const azureSqlPath = path.resolve(__dirname, '../store/azureSql.js');
require.cache[azureSqlPath] = {
  id: azureSqlPath, filename: azureSqlPath, loaded: true,
  exports: { getPool: async () => fakePool, connectToAzureSQL: async () => fakePool },
};
sql.Transaction = FakeTransaction;

const exitFormRouter = require('../routes/exitForm.js');

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  if (req.headers['x-test-user']) req.user = JSON.parse(req.headers['x-test-user']);
  next();
});
app.use('/api/exit-form', exitFormRouter);

const asUser = (email) => ({ 'x-test-user': JSON.stringify({ email, name: email }) });

describe('Exit Form API', () => {
  beforeEach(() => {
    rows = {};
    auditRows = [];
    nextID = 1;
  });

  it('returns no record for a client without an exit form', async () => {
    const res = await request(app).get('/api/exit-form/C1');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, record: null });
  });

  it('creates the form, then updates it, recording who did each', async () => {
    const first = await request(app).put('/api/exit-form/C1').set(asUser('a@hope.org')).send({
      exitDate: '2026-10-05',
      admitDate: '2026-09-01',
      lengthOfStay: 34,
      exitReason: 'Family Reunification',
      notificationMethods: ['Called', 'Emailed'],
    });
    expect(first.status).toBe(200);
    expect(first.body.record).toMatchObject({
      clientID: 'C1',
      exitDate: '2026-10-05',
      lengthOfStay: 34,
      exitReason: 'Family Reunification',
      notificationMethods: ['Called', 'Emailed'],
      createdBy: 'a@hope.org',
      updatedBy: null,
    });
    expect(rows.C1.notificationMethods).toBe('["Called","Emailed"]');
    expect(auditRows[0]).toMatchObject({ action: 'CREATE', tableName: 'exit_form', clientID: 'C1', userID: 'a@hope.org' });

    const second = await request(app).put('/api/exit-form/C1').set(asUser('b@hope.org')).send({
      exitReason: 'Deceased',
      notificationMethods: [],
    });
    expect(second.status).toBe(200);
    expect(second.body.record).toMatchObject({
      exitReason: 'Deceased',
      exitDate: null,
      notificationMethods: [],
      createdBy: 'a@hope.org',
      updatedBy: 'b@hope.org',
    });
    expect(auditRows[1]).toMatchObject({ action: 'UPDATE', userID: 'b@hope.org' });

    const loaded = await request(app).get('/api/exit-form/C1');
    expect(loaded.body.record.exitReason).toBe('Deceased');
  });

  it('rejects bad values without saving anything', async () => {
    const res = await request(app).put('/api/exit-form/C1').send({
      exitDate: 'next tuesday',
      lengthOfStay: -3,
      notificationMethods: 'Called',
      agency: 'x'.repeat(256),
    });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.errors).sort()).toEqual(['agency', 'exitDate', 'lengthOfStay', 'notificationMethods']);
    expect(rows).toEqual({});
  });

  it('rejects an over-long client ID', async () => {
    const res = await request(app).get(`/api/exit-form/${'9'.repeat(51)}`);
    expect(res.status).toBe(400);
  });
});

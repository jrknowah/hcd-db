// Section 5 Nursing Archive: the uploader is saved to the DB and the audit log.
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);
const express = require('express');
const request = require('supertest');
const sql = require('mssql');

let uploads;
let auditRows;
let failAudit;

function makeRequest(pending) {
  const params = {};
  const req = {
    input(name, _type, value) { params[name] = value; return req; },
    async query(q) {
      if (/INSERT INTO dbo\.NursingArchiveUploads/.test(q)) {
        const row = { uploadID: uploads.length + 1, ...params };
        (pending || uploads).push(row);
        return { recordset: [row] };
      }
      if (/INSERT INTO dbo\.AuditLog/.test(q)) {
        if (failAudit) throw new Error('audit insert failed');
        (pending ? pending.audit : auditRows).push({ ...params });
        return { recordset: [] };
      }
      if (/FROM dbo\.NursingArchiveUploads/.test(q)) {
        return { recordset: uploads.filter(u => u.clientID === params.clientID) };
      }
      return { recordset: [] };
    },
  };
  return req;
}

const fakePool = { request: () => makeRequest() };

// Rows only land if the transaction commits
class FakeTransaction {
  constructor() { this.pending = []; this.pending.audit = []; }
  async begin() {}
  async commit() { uploads.push(...this.pending); auditRows.push(...this.pending.audit); }
  async rollback() {}
  request() { return makeRequest(this.pending); }
}

const azureSqlPath = path.resolve(__dirname, '../store/azureSql.js');
require.cache[azureSqlPath] = {
  id: azureSqlPath, filename: azureSqlPath, loaded: true,
  exports: { getPool: async () => fakePool, connectToAzureSQL: async () => fakePool },
};
sql.Transaction = FakeTransaction;

const router = require('../routes/nursingArchiveUploads.js');

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  if (req.headers['x-test-user']) req.user = JSON.parse(req.headers['x-test-user']);
  next();
});
app.use('/api/section5', router);

const nurse = { 'x-test-user': JSON.stringify({ email: 'jane@hope.org', name: 'Jane Nurse' }) };
const upload = {
  clientID: 'C 1',
  blobName: 'C_1/S5__Lab_Results/2026-10-04_labs.pdf',
  fileName: 'labs.pdf',
  docType: 'Lab Results',
};

describe('Nursing Archive uploaders', () => {
  beforeEach(() => {
    uploads = [];
    auditRows = [];
    failAudit = false;
  });

  it('saves the uploader from the sign-in to the DB and the audit log', async () => {
    const res = await request(app).post('/api/section5/archive-uploads').set(nurse)
      .send({ ...upload, uploadedBy: 'someone-else@hope.org' });
    expect(res.status).toBe(201);

    expect(uploads).toHaveLength(1);
    expect(uploads[0]).toMatchObject({
      clientID: 'C 1', blobName: upload.blobName, uploadedBy: 'jane@hope.org', uploadedByName: 'Jane Nurse',
    });
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0]).toMatchObject({
      userID: 'jane@hope.org', userName: 'Jane Nurse', action: 'UPLOAD_NURSING_ARCHIVE',
      tableName: 'NursingArchiveUploads', clientID: 'C 1', recordID: '1',
    });
    // File names can hold PHI: keep them out of the audit row
    expect(auditRows[0].newValues).not.toContain('labs.pdf');
  });

  it('saves nothing if the audit row fails', async () => {
    failAudit = true;
    const res = await request(app).post('/api/section5/archive-uploads').set(nurse).send(upload);
    expect(res.status).toBe(500);
    expect(uploads).toHaveLength(0);
  });

  it('requires a signed-in user', async () => {
    const res = await request(app).post('/api/section5/archive-uploads').send(upload);
    expect(res.status).toBe(401);
    expect(uploads).toHaveLength(0);
  });

  it("rejects a file outside this client's Nursing Archive", async () => {
    for (const blobName of ['C_2/S5__Lab_Results/x.pdf', 'C_1/S6__Medical_Records/x.pdf']) {
      const res = await request(app).post('/api/section5/archive-uploads').set(nurse).send({ ...upload, blobName });
      expect(res.status).toBe(400);
    }
    expect(uploads).toHaveLength(0);
  });

  it('lists uploaders for a client', async () => {
    await request(app).post('/api/section5/archive-uploads').set(nurse).send(upload);
    const res = await request(app).get('/api/section5/archive-uploads/C%201').set(nurse);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([expect.objectContaining({ blobName: upload.blobName, uploadedByName: 'Jane Nurse' })]);
  });
});

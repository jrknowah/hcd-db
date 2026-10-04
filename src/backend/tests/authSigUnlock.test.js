// Section 2: signed forms lock, and only IT Admin / Level 1 can unlock them.
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);
const express = require('express');
const request = require('supertest');
const sql = require('mssql');

const IT_GROUP = '47e60a70-aeab-4f3e-80bd-940cc951622f';
const LEVEL1_GROUP = 'f47eca14-0206-4719-91c7-fba7b2be382c';
const CASE_GROUP = '59b40286-56c6-4b1e-8de2-854c7d91179b';

// ── Fake DB: one AuthorizationForms row per (clientID, formType) ───────────
let rows;
let versions;
let auditRows;
let queries;

function makeRequest() {
  const params = {};
  const req = {
    input(name, _type, value) { params[name] = value; return req; },
    async query(q) {
      queries.push(q);
      const key = `${params.clientID}:${params.formType}`;
      if (/INSERT INTO AuthorizationFormVersions/.test(q)) {
        versions.push({ ...params });
        return { recordset: [], rowsAffected: [1] };
      }
      if (/INSERT INTO dbo\.AuditLog/.test(q)) {
        auditRows.push({ ...params });
        return { recordset: [], rowsAffected: [1] };
      }
      if (/UPDATE AuthorizationForms[\s\S]*WHERE formID = @formID/.test(q)) {
        const row = Object.values(rows).find(r => r.formID === params.formID);
        Object.assign(row, {
          status: 'in_progress', signature: null, formData: params.formData,
          completedBy: null, completedAt: null,
          unlockedBy: params.updatedBy, unlockReason: params.unlockReason,
        });
        return { recordset: [], rowsAffected: [1] };
      }
      if (/^\s*SELECT/i.test(q) && /FROM AuthorizationForms/.test(q)) {
        return { recordset: rows[key] ? [rows[key]] : [] };
      }
      return { recordset: [], rowsAffected: [1] };
    },
  };
  return req;
}

const fakePool = { request: makeRequest };

class FakeTransaction {
  constructor() { this.state = 'new'; }
  async begin() { this.state = 'begun'; }
  async commit() { this.state = 'committed'; }
  async rollback() { this.state = 'rolledback'; }
  request() { return makeRequest(); }
}

// Swap in the fake pool before the router is loaded
const azureSqlPath = path.resolve(__dirname, '../store/azureSql.js');
require.cache[azureSqlPath] = {
  id: azureSqlPath, filename: azureSqlPath, loaded: true,
  exports: { poolPromise: Promise.resolve(fakePool), getPool: async () => fakePool },
};
sql.Transaction = FakeTransaction;

const authSigRouter = require('../routes/authSig.js');
const { isFormComplete, clearSignatureFields } = authSigRouter;

// Stand-in for middleware/auth.js: the test sets req.user via a header
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (req.headers['x-test-user']) req.user = JSON.parse(req.headers['x-test-user']);
    next();
  });
  app.use('/api/authorization', authSigRouter);
  return app;
}

const asUser = (user) => ({ 'x-test-user': JSON.stringify(user) });
const itAdmin = { email: 'it@hope.org', isAdmin: true, groups: [IT_GROUP] };
const level1 = { email: 'lead@hope.org', isAdmin: false, groups: [LEVEL1_GROUP] };
const caseManager = { email: 'cm@hope.org', isAdmin: false, groups: [CASE_GROUP] };

const signedRow = (overrides = {}) => ({
  formID: 7,
  clientID: 'C1',
  formType: 'grievances',
  formData: JSON.stringify({ clientGrievanceSign: 'Jane Client', readAll: true }),
  checkboxData: null,
  signature: null,
  status: 'completed',
  completionPercentage: 100,
  completedBy: 'cm@hope.org',
  completedAt: new Date('2026-09-01T17:00:00Z'),
  submissionID: null,
  ...overrides,
});

describe('Section 2 signed-form lock and unlock', () => {
  let app;

  beforeEach(() => {
    rows = {};
    versions = [];
    auditRows = [];
    queries = [];
    app = buildApp();
  });

  describe('completion', () => {
    it('requires a signature; completionPercentage alone does not complete a form', () => {
      expect(isFormComplete('orientation', { completionPercentage: 100 })).toBe(false);
      expect(isFormComplete('orientation', { signature: 'Jane Client' })).toBe(true);
    });

    it('uses the field each form actually sends', () => {
      expect(isFormComplete('grievances', { clientGrievanceSign: 'Jane Client' })).toBe(true);
      expect(isFormComplete('residencePolicy', { resPolicySignature: 'Jane Client' })).toBe(true);
      expect(isFormComplete('termination', { tppSign: 'Jane Client' })).toBe(true);
    });
  });

  describe('lock', () => {
    it('rejects saving a signed form with 409 FORM_LOCKED', async () => {
      rows['C1:grievances'] = signedRow();
      const res = await request(app)
        .post('/api/authorization/C1/form/grievances')
        .set(asUser(caseManager))
        .send({ clientGrievanceSign: 'Changed Name' });
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('FORM_LOCKED');
    });

    it('rejects autosave of a signed form', async () => {
      rows['C1:grievances'] = signedRow();
      const res = await request(app)
        .post('/api/authorization/C1/form/grievances/autosave')
        .set(asUser(caseManager))
        .send({ readAll: false });
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('FORM_LOCKED');
      expect(queries.some(q => /UPDATE AuthorizationForms/.test(q))).toBe(false);
    });

    it('rejects a bulk save that touches a signed form and saves nothing', async () => {
      rows['C1:grievances'] = signedRow();
      const res = await request(app)
        .post('/api/authorization/C1/forms/bulk')
        .set(asUser(caseManager))
        .send({ forms: [{ formType: 'grievances', readAll: false }] });
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('FORM_LOCKED');
      expect(queries.some(q => /UPDATE AuthorizationForms/.test(q))).toBe(false);
    });

    it('still allows saving an unsigned form', async () => {
      rows['C1:grievances'] = signedRow({ status: 'in_progress' });
      const res = await request(app)
        .post('/api/authorization/C1/form/grievances/autosave')
        .set(asUser(caseManager))
        .send({ readAll: true });
      expect(res.status).toBe(200);
    });

    it('reports lock state and unlock permission on GET', async () => {
      rows['C1:grievances'] = signedRow();
      const asCm = await request(app).get('/api/authorization/C1/form/grievances').set(asUser(caseManager));
      expect(asCm.body.locked).toBe(true);
      expect(asCm.body.canUnlock).toBe(false);

      const asLevel1 = await request(app).get('/api/authorization/C1/form/grievances').set(asUser(level1));
      expect(asLevel1.body.canUnlock).toBe(true);
    });
  });

  describe('unlock', () => {
    const unlock = (user, body = { reason: 'Client name was misspelled' }) => {
      const r = request(app).post('/api/authorization/C1/form/grievances/unlock');
      return (user ? r.set(asUser(user)) : r).send(body);
    };

    it('returns 401 without a user', async () => {
      rows['C1:grievances'] = signedRow();
      expect((await unlock(null)).status).toBe(401);
    });

    it('returns 403 for a case manager', async () => {
      rows['C1:grievances'] = signedRow();
      const res = await unlock(caseManager);
      expect(res.status).toBe(403);
      expect(rows['C1:grievances'].status).toBe('completed');
    });

    it.each([['IT Admin', itAdmin], ['Level 1', level1]])('lets %s unlock', async (_label, user) => {
      rows['C1:grievances'] = signedRow();
      const res = await unlock(user);
      expect(res.status).toBe(200);
      expect(res.body.unlockedBy).toBe(user.email);

      const row = rows['C1:grievances'];
      expect(row.status).toBe('in_progress');
      expect(row.completedBy).toBeNull();
      expect(row.unlockReason).toBe('Client name was misspelled');
      // Client must sign again; other answers are kept
      expect(JSON.parse(row.formData)).toEqual({ readAll: true });
    });

    it('archives the signed version before clearing it', async () => {
      rows['C1:grievances'] = signedRow();
      await unlock(level1);
      expect(versions).toHaveLength(1);
      expect(JSON.parse(versions[0].formData).clientGrievanceSign).toBe('Jane Client');
      expect(versions[0].status).toBe('completed');
      expect(versions[0].archivedBy).toBe('lead@hope.org');
      expect(versions[0].unlockReason).toBe('Client name was misspelled');
    });

    it('writes an audit row without the free-text reason', async () => {
      rows['C1:grievances'] = signedRow();
      await unlock(itAdmin);
      expect(auditRows).toHaveLength(1);
      expect(auditRows[0].action).toBe('UNLOCK_SIGNED_FORM');
      expect(auditRows[0].newValues).not.toMatch(/misspelled/);
    });

    it('can unlock a submitted form', async () => {
      rows['C1:grievances'] = signedRow({ status: 'submitted', submissionID: 3 });
      const res = await unlock(itAdmin);
      expect(res.status).toBe(200);
      expect(versions[0].submissionID).toBe(3);
    });

    it('requires a reason', async () => {
      rows['C1:grievances'] = signedRow();
      expect((await unlock(itAdmin, { reason: ' ' })).status).toBe(422);
      expect(versions).toHaveLength(0);
    });

    it('returns 409 when the form is not locked', async () => {
      rows['C1:grievances'] = signedRow({ status: 'in_progress' });
      const res = await unlock(itAdmin);
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('FORM_NOT_LOCKED');
    });

    it('returns 404 when the form does not exist', async () => {
      expect((await unlock(itAdmin)).status).toBe(404);
    });
  });

  describe('clearSignatureFields', () => {
    it('clears top-level and nested client signature fields only', () => {
      expect(clearSignatureFields('privacyPractice', {
        signature: 'A', staffName: 'S', formData: { clientSignature: 'A', ack: true },
      })).toEqual({ staffName: 'S', formData: { ack: true } });
    });
  });
});

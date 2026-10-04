// Section 4: encounter notes and care plans save as drafts, lock once
// submitted, and only IT Admin / Level 1 can unlock or delete them.
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

// ── Fake DB: EncounterNotes keyed by Id, CarePlans keyed by carePlanID ──────
let notes;
let plans;
let versions;
let auditRows;
let queries;
let nextNoteId;

const NOTE_ID = '11111111-1111-1111-1111-111111111111';
const PLAN_ID = 'CP-C1-1';

function makeRequest() {
  const params = {};
  const req = {
    input(name, _type, value) { params[name] = value; return req; },
    async query(q) {
      queries.push(q);

      if (/INSERT INTO dbo\.Section4RecordVersions/.test(q)) {
        versions.push({ ...params });
        return { recordset: [], rowsAffected: [1] };
      }
      if (/INSERT INTO dbo\.AuditLog/.test(q)) {
        auditRows.push({ ...params });
        return { recordset: [], rowsAffected: [1] };
      }

      // ── EncounterNotes ──
      if (/INSERT INTO EncounterNotes/.test(q)) {
        const row = {
          _id: `00000000-0000-0000-0000-00000000000${nextNoteId++}`,
          ClientID: params.clientID, CareNoteDate: params.careNoteDate,
          CareNoteType: params.careNoteType, CareNoteSite: params.careNoteSite,
          CareNote: params.careNote, CreatedBy: params.createdBy,
          SubmissionStatus: params.submissionStatus,
          SubmittedBy: params.submittedBy, SubmittedAt: params.submittedAt,
        };
        notes[row._id] = row;
        return { recordset: [row], rowsAffected: [1] };
      }
      if (/UPDATE EncounterNotes\s+SET\s+CareNoteDate/.test(q)) {
        const row = notes[params.noteId];
        let affected = 0;
        if (row && row.SubmissionStatus === 'draft') {
          Object.assign(row, {
            CareNoteDate: params.careNoteDate, CareNoteType: params.careNoteType,
            CareNoteSite: params.careNoteSite, CareNote: params.careNote,
            SubmissionStatus: params.submissionStatus,
            SubmittedBy: params.submittedBy, SubmittedAt: params.submittedAt,
            UpdatedBy: params.updatedBy,
          });
          affected = 1;
        }
        return { recordset: row ? [row] : [], rowsAffected: [affected, row ? 1 : 0] };
      }
      if (/UPDATE EncounterNotes\s+SET SubmissionStatus = 'draft'/.test(q)) {
        Object.assign(notes[params.noteId], {
          SubmissionStatus: 'draft', SubmittedBy: null, SubmittedAt: null,
          UnlockedBy: params.unlockedBy, UnlockReason: params.unlockReason,
        });
        return { recordset: [], rowsAffected: [1] };
      }
      if (/DELETE FROM EncounterNotes/.test(q)) {
        const existed = !!notes[params.noteId];
        delete notes[params.noteId];
        return { recordset: [], rowsAffected: [existed ? 1 : 0] };
      }
      if (/FROM EncounterNotes/.test(q) && params.noteId) {
        return { recordset: notes[params.noteId] ? [{ ...notes[params.noteId], Id: params.noteId }] : [] };
      }
      if (/FROM EncounterNotes/.test(q)) {
        return { recordset: Object.values(notes).filter(n => n.ClientID === params.clientID) };
      }

      // ── CarePlans ──
      if (/INSERT INTO CarePlans/.test(q)) {
        const row = {
          _id: params.carePlanID, carePlanID: params.carePlanID, clientID: params.clientID,
          careGoal: params.careGoal, careSteps: params.careSteps, status: params.status,
          priority: params.priority, createdBy: params.createdBy,
          submissionStatus: params.submissionStatus,
          submittedBy: params.submittedBy, submittedAt: params.submittedAt,
        };
        plans[row._id] = row;
        return { recordset: [row], rowsAffected: [1, 1] };
      }
      if (/UPDATE CarePlans\s+SET\s+careGoal/.test(q) || /UPDATE CarePlans\s+SET\s+status = @status/.test(q)) {
        const row = plans[params.carePlanID];
        let affected = 0;
        if (row && row.submissionStatus === 'draft') {
          if (params.careGoal !== undefined) {
            Object.assign(row, {
              careGoal: params.careGoal, careSteps: params.careSteps,
              submissionStatus: params.submissionStatus,
              submittedBy: params.submittedBy, submittedAt: params.submittedAt,
            });
          }
          row.status = params.status;
          row.updatedBy = params.updatedBy;
          affected = 1;
        }
        return { recordset: row ? [row] : [], rowsAffected: [affected, row ? 1 : 0] };
      }
      if (/UPDATE CarePlans\s+SET submissionStatus = 'draft'/.test(q)) {
        Object.assign(plans[params.carePlanID], {
          submissionStatus: 'draft', submittedBy: null, submittedAt: null,
          unlockedBy: params.unlockedBy, unlockReason: params.unlockReason,
        });
        return { recordset: [], rowsAffected: [1] };
      }
      if (/DELETE FROM CarePlans/.test(q)) {
        const existed = !!plans[params.carePlanID];
        delete plans[params.carePlanID];
        return { recordset: [], rowsAffected: [existed ? 1 : 0] };
      }
      if (/FROM CarePlans/.test(q) && params.carePlanID) {
        return { recordset: plans[params.carePlanID] ? [plans[params.carePlanID]] : [] };
      }
      if (/FROM CarePlans/.test(q)) {
        return { recordset: Object.values(plans).filter(p => p.clientID === params.clientID) };
      }

      return { recordset: [], rowsAffected: [1] };
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

// Swap in the fake pool and a header-driven stand-in for middleware/auth.js
// before the routers are loaded
const stubModule = (relPath, exports) => {
  const p = path.resolve(__dirname, relPath);
  require.cache[p] = { id: p, filename: p, loaded: true, exports };
};
stubModule('../store/azureSql.js', { poolPromise: Promise.resolve(fakePool), getPool: async () => fakePool });
stubModule('../middleware/auth.js', (req, res, next) => {
  if (!req.headers['x-test-user']) return res.status(401).json({ code: 'NO_AUTH_HEADER' });
  req.user = JSON.parse(req.headers['x-test-user']);
  next();
});
sql.Transaction = FakeTransaction;

const encounterNoteRouter = require('../routes/encounterNote.js');
const carePlanRouter = require('../routes/carePlan.js');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', carePlanRouter);
  app.use('/api', encounterNoteRouter);
  return app;
}

const asUser = (user) => ({ 'x-test-user': JSON.stringify(user) });
const itAdmin = { email: 'it@hope.org', isAdmin: true, groups: [IT_GROUP] };
const level1 = { email: 'lead@hope.org', isAdmin: false, groups: [LEVEL1_GROUP] };
const caseManager = { email: 'cm@hope.org', isAdmin: false, groups: [CASE_GROUP] };

const noteRow = (overrides = {}) => ({
  _id: NOTE_ID,
  ClientID: 'C1',
  CareNoteDate: '2026-10-01',
  CareNoteType: 'Individual',
  CareNoteSite: null,
  CareNote: 'Met with client about housing.',
  CreatedBy: 'cm@hope.org',
  SubmissionStatus: 'submitted',
  SubmittedBy: 'cm@hope.org',
  SubmittedAt: new Date('2026-10-01T17:00:00Z'),
  ...overrides,
});

const planRow = (overrides = {}) => ({
  _id: PLAN_ID,
  carePlanID: PLAN_ID,
  clientID: 'C1',
  careGoal: 'Stable housing',
  careSteps: 'Apply for housing',
  status: 'Active',
  priority: 'High',
  createdBy: 'cm@hope.org',
  submissionStatus: 'submitted',
  submittedBy: 'cm@hope.org',
  submittedAt: new Date('2026-10-01T17:00:00Z'),
  ...overrides,
});

const noteBody = (overrides = {}) => ({
  careNoteDate: '2026-10-02',
  careNoteType: 'Individual',
  careNote: 'Updated note',
  updatedBy: 'cm@hope.org',
  ...overrides,
});

describe('Section 4 draft / submit / unlock', () => {
  let app;

  beforeEach(() => {
    notes = {};
    plans = {};
    versions = [];
    auditRows = [];
    queries = [];
    nextNoteId = 1;
    app = buildApp();
  });

  describe('encounter notes', () => {
    it('requires a signed-in user to save', async () => {
      const res = await request(app)
        .post('/api/encounter-notes/C1')
        .send({ careNoteDate: '2026-10-02', careNoteType: 'Individual', careNote: 'x', submit: true });
      expect(res.status).toBe(401);
      expect(Object.keys(notes)).toHaveLength(0);
    });

    it('records the signed-in user as the submitter, not the request body', async () => {
      const res = await request(app)
        .post('/api/encounter-notes/C1').set(asUser(caseManager))
        .send({ careNoteDate: '2026-10-02', careNoteType: 'Individual', careNote: 'Done', createdBy: 'someone-else@hope.org', submit: true });
      expect(res.body.submittedBy).toBe('cm@hope.org');
      expect(res.body.createdBy).toBe('cm@hope.org');
      expect(res.body.submittedAt).toBeTruthy();
    });

    it('records who submitted a draft', async () => {
      notes[NOTE_ID] = noteRow({ SubmissionStatus: 'draft', SubmittedBy: null, SubmittedAt: null, CreatedBy: 'first@hope.org' });
      const res = await request(app).put(`/api/encounter-notes/${NOTE_ID}`).set(asUser(level1))
        .send(noteBody({ submit: true, updatedBy: 'spoofed@hope.org' }));
      expect(res.body.submittedBy).toBe('lead@hope.org');
      expect(notes[NOTE_ID].SubmittedBy).toBe('lead@hope.org');
    });

    it('saves progress as an unlocked draft, even without note content', async () => {
      const res = await request(app)
        .post('/api/encounter-notes/C1').set(asUser(caseManager))
        .send({ careNoteDate: '2026-10-02', careNoteType: 'Individual', careNote: '', createdBy: 'cm@hope.org' });
      expect(res.status).toBe(201);
      expect(res.body.submissionStatus).toBe('draft');
      expect(res.body.locked).toBe(false);
      expect(res.body.submittedBy).toBeNull();
    });

    it('requires note content to submit', async () => {
      const res = await request(app)
        .post('/api/encounter-notes/C1').set(asUser(caseManager))
        .send({ careNoteDate: '2026-10-02', careNoteType: 'Individual', careNote: ' ', submit: true });
      expect(res.status).toBe(400);
    });

    it('locks a note when it is submitted', async () => {
      const res = await request(app)
        .post('/api/encounter-notes/C1').set(asUser(caseManager))
        .send({ careNoteDate: '2026-10-02', careNoteType: 'Individual', careNote: 'Done', createdBy: 'cm@hope.org', submit: true });
      expect(res.status).toBe(201);
      expect(res.body.submissionStatus).toBe('submitted');
      expect(res.body.locked).toBe(true);
      expect(res.body.submittedBy).toBe('cm@hope.org');
    });

    it('lets a draft be edited and then submitted', async () => {
      notes[NOTE_ID] = noteRow({ SubmissionStatus: 'draft', SubmittedBy: null, SubmittedAt: null });
      const saved = await request(app).put(`/api/encounter-notes/${NOTE_ID}`).set(asUser(caseManager)).send(noteBody());
      expect(saved.status).toBe(200);
      expect(saved.body.locked).toBe(false);

      const submitted = await request(app).put(`/api/encounter-notes/${NOTE_ID}`).set(asUser(caseManager)).send(noteBody({ submit: true }));
      expect(submitted.status).toBe(200);
      expect(submitted.body.locked).toBe(true);
      expect(notes[NOTE_ID].SubmissionStatus).toBe('submitted');
    });

    it('rejects editing a submitted note with 409 RECORD_LOCKED', async () => {
      notes[NOTE_ID] = noteRow();
      const res = await request(app).put(`/api/encounter-notes/${NOTE_ID}`).set(asUser(caseManager)).send(noteBody());
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('RECORD_LOCKED');
      expect(notes[NOTE_ID].CareNote).toBe('Met with client about housing.');
    });

    describe('delete', () => {
      const del = (user, body) => {
        const r = request(app).delete(`/api/encounter-notes/${NOTE_ID}`);
        return (user ? r.set(asUser(user)) : r).send(body);
      };

      it('returns 401 without a user', async () => {
        notes[NOTE_ID] = noteRow();
        expect((await del(null, { reason: 'Duplicate entry' })).status).toBe(401);
        expect(notes[NOTE_ID]).toBeDefined();
      });

      it('does not let a case manager delete a submitted note', async () => {
        notes[NOTE_ID] = noteRow();
        const res = await del(caseManager, { reason: 'Duplicate entry' });
        expect(res.status).toBe(403);
        expect(res.body.code).toBe('DELETE_NOT_PERMITTED');
        expect(notes[NOTE_ID]).toBeDefined();
        expect(versions).toHaveLength(0);
      });

      it.each([['IT Admin', itAdmin], ['Level 1', level1]])('lets %s delete a submitted note', async (_label, user) => {
        notes[NOTE_ID] = noteRow();
        const res = await del(user, { reason: 'Duplicate entry' });
        expect(res.status).toBe(200);
        expect(notes[NOTE_ID]).toBeUndefined();
      });

      it('archives the note before deleting and audits without the reason', async () => {
        notes[NOTE_ID] = noteRow();
        await del(level1, { reason: 'Entered on the wrong client' });
        expect(versions).toHaveLength(1);
        expect(versions[0].archivedReason).toBe('delete');
        expect(versions[0].reason).toBe('Entered on the wrong client');
        expect(versions[0].archivedBy).toBe('lead@hope.org');
        expect(JSON.parse(versions[0].snapshot).careNote).toBe('Met with client about housing.');
        expect(auditRows).toHaveLength(1);
        expect(auditRows[0].action).toBe('DELETE_SECTION4_RECORD');
        expect(auditRows[0].newValues).not.toMatch(/wrong client/);
      });

      it('requires a reason to delete a submitted note', async () => {
        notes[NOTE_ID] = noteRow();
        expect((await del(itAdmin, { reason: '' })).status).toBe(422);
        expect(notes[NOTE_ID]).toBeDefined();
      });

      it('still lets staff delete a draft without a reason', async () => {
        notes[NOTE_ID] = noteRow({ SubmissionStatus: 'draft' });
        expect((await del(caseManager, {})).status).toBe(200);
        expect(notes[NOTE_ID]).toBeUndefined();
        expect(versions[0].archivedReason).toBe('delete');
      });

      it('returns 404 for a missing note', async () => {
        expect((await del(itAdmin, { reason: 'Duplicate entry' })).status).toBe(404);
      });
    });

    it('treats rows without a status as submitted', async () => {
      notes[NOTE_ID] = noteRow({ SubmissionStatus: null });
      const list = await request(app).get('/api/encounter-notes/C1');
      expect(list.body[0].locked).toBe(true);
      expect((await request(app).put(`/api/encounter-notes/${NOTE_ID}`).set(asUser(caseManager)).send(noteBody())).status).toBe(409);
    });

    describe('unlock', () => {
      const unlock = (user, body = { reason: 'Wrong note date entered' }) => {
        const r = request(app).post(`/api/encounter-notes/${NOTE_ID}/unlock`);
        return (user ? r.set(asUser(user)) : r).send(body);
      };

      it('returns 401 without a user', async () => {
        notes[NOTE_ID] = noteRow();
        expect((await unlock(null)).status).toBe(401);
      });

      it('returns 403 for a case manager', async () => {
        notes[NOTE_ID] = noteRow();
        const res = await unlock(caseManager);
        expect(res.status).toBe(403);
        expect(notes[NOTE_ID].SubmissionStatus).toBe('submitted');
      });

      it.each([['IT Admin', itAdmin], ['Level 1', level1]])('lets %s unlock', async (_label, user) => {
        notes[NOTE_ID] = noteRow();
        const res = await unlock(user);
        expect(res.status).toBe(200);
        expect(res.body.locked).toBe(false);
        expect(res.body.unlockedBy).toBe(user.email);
        expect(notes[NOTE_ID].SubmissionStatus).toBe('draft');
        expect(notes[NOTE_ID].UnlockReason).toBe('Wrong note date entered');

        // Editable again
        expect((await request(app).put(`/api/encounter-notes/${NOTE_ID}`).set(asUser(caseManager)).send(noteBody())).status).toBe(200);
      });

      it('archives the submitted version and audits without the reason', async () => {
        notes[NOTE_ID] = noteRow();
        await unlock(level1);
        expect(versions).toHaveLength(1);
        expect(versions[0].recordType).toBe('EncounterNote');
        expect(JSON.parse(versions[0].snapshot).careNote).toBe('Met with client about housing.');
        expect(versions[0].archivedBy).toBe('lead@hope.org');
        expect(versions[0].archivedReason).toBe('unlock');
        expect(versions[0].reason).toBe('Wrong note date entered');
        expect(auditRows).toHaveLength(1);
        expect(auditRows[0].action).toBe('UNLOCK_SUBMITTED_RECORD');
        expect(auditRows[0].newValues).not.toMatch(/Wrong note date/);
      });

      it('requires a reason', async () => {
        notes[NOTE_ID] = noteRow();
        expect((await unlock(itAdmin, { reason: 'no' })).status).toBe(422);
        expect(versions).toHaveLength(0);
      });

      it('returns 409 for a draft and 404 for a missing note', async () => {
        notes[NOTE_ID] = noteRow({ SubmissionStatus: 'draft' });
        expect((await unlock(itAdmin)).body.code).toBe('RECORD_NOT_LOCKED');
        delete notes[NOTE_ID];
        expect((await unlock(itAdmin)).status).toBe(404);
      });
    });
  });

  describe('care plans', () => {
    it('saves progress as a draft with only a goal', async () => {
      const res = await request(app)
        .post('/api/care-plans/C1').set(asUser(caseManager))
        .send({ careGoal: 'Stable housing', careSteps: '', createdBy: 'cm@hope.org' });
      expect(res.status).toBe(201);
      expect(res.body.submissionStatus).toBe('draft');
      expect(res.body.locked).toBe(false);
    });

    it('records the signed-in user as the submitter', async () => {
      const res = await request(app)
        .post('/api/care-plans/C1').set(asUser(level1))
        .send({ careGoal: 'Stable housing', careSteps: 'Apply', createdBy: 'spoofed@hope.org', submit: true });
      expect(res.body.submittedBy).toBe('lead@hope.org');
    });

    it('requires steps to submit', async () => {
      const res = await request(app)
        .post('/api/care-plans/C1').set(asUser(caseManager))
        .send({ careGoal: 'Stable housing', careSteps: '', submit: true });
      expect(res.status).toBe(400);
      expect(res.body.errors.careSteps).toBeDefined();
    });

    it('locks a plan when it is submitted', async () => {
      plans[PLAN_ID] = planRow({ submissionStatus: 'draft' });
      const res = await request(app)
        .put(`/api/care-plans/${PLAN_ID}`).set(asUser(caseManager))
        .send({ careGoal: 'Stable housing', careSteps: 'Apply', status: 'Active', priority: 'High', submit: true });
      expect(res.status).toBe(200);
      expect(res.body.locked).toBe(true);
    });

    it('rejects editing, status changes and deleting a submitted plan', async () => {
      plans[PLAN_ID] = planRow();
      const put = await request(app)
        .put(`/api/care-plans/${PLAN_ID}`).set(asUser(caseManager))
        .send({ careGoal: 'Changed', careSteps: 'Changed' });
      expect(put.status).toBe(409);
      expect(put.body.code).toBe('RECORD_LOCKED');

      const patch = await request(app).patch(`/api/care-plans/${PLAN_ID}/status`).set(asUser(caseManager)).send({ status: 'Completed' });
      expect(patch.status).toBe(409);
      expect(plans[PLAN_ID].status).toBe('Active');

      const del = await request(app).delete(`/api/care-plans/${PLAN_ID}`).set(asUser(caseManager)).send({ reason: 'Not needed' });
      expect(del.status).toBe(403);
      expect(del.body.code).toBe('DELETE_NOT_PERMITTED');
      expect(plans[PLAN_ID].careGoal).toBe('Stable housing');
    });

    it.each([['IT Admin', itAdmin], ['Level 1', level1]])('lets %s delete a submitted plan with a reason', async (_label, user) => {
      plans[PLAN_ID] = planRow();
      expect((await request(app).delete(`/api/care-plans/${PLAN_ID}`).set(asUser(user)).send({})).status).toBe(422);
      const res = await request(app).delete(`/api/care-plans/${PLAN_ID}`).set(asUser(user)).send({ reason: 'Goal was duplicated' });
      expect(res.status).toBe(200);
      expect(plans[PLAN_ID]).toBeUndefined();
      expect(versions[0]).toMatchObject({ recordType: 'CarePlan', archivedReason: 'delete', reason: 'Goal was duplicated' });
    });

    it('still deletes a draft plan', async () => {
      plans[PLAN_ID] = planRow({ submissionStatus: 'draft' });
      expect((await request(app).delete(`/api/care-plans/${PLAN_ID}`).set(asUser(caseManager))).status).toBe(200);
      expect(plans[PLAN_ID]).toBeUndefined();
    });

    describe('unlock', () => {
      const unlock = (user) => request(app)
        .post(`/api/care-plans/${PLAN_ID}/unlock`)
        .set(asUser(user))
        .send({ reason: 'Goal needs revising' });

      it('returns 403 for a case manager', async () => {
        plans[PLAN_ID] = planRow();
        expect((await unlock(caseManager)).status).toBe(403);
        expect(plans[PLAN_ID].submissionStatus).toBe('submitted');
      });

      it.each([['IT Admin', itAdmin], ['Level 1', level1]])('lets %s unlock', async (_label, user) => {
        plans[PLAN_ID] = planRow();
        const res = await unlock(user);
        expect(res.status).toBe(200);
        expect(res.body.locked).toBe(false);
        expect(plans[PLAN_ID].submissionStatus).toBe('draft');
        expect(versions[0].recordType).toBe('CarePlan');
        expect(JSON.parse(versions[0].snapshot).careGoal).toBe('Stable housing');
      });
    });
  });
});

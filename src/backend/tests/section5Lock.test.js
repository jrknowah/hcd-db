// Section 5: notes and observation records lock once submitted, and only
// IT Admin / Level 1 can unlock them.
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);
const express = require('express');
const request = require('supertest');
const sql = require('mssql');

const IT_GROUP = '47e60a70-aeab-4f3e-80bd-940cc951622f';
const LEVEL1_GROUP = 'f47eca14-0206-4719-91c7-fba7b2be382c';
const NURSING_GROUP = '51b04727-a548-4769-8227-4b055427a9ac';

// ── Fake DB: progress_notes and vital_signs rows keyed by id ───────────────
let tables;
let versions;
let auditRows;
let nextId;

const TABLES = [
  { re: /progress_notes/, name: 'progress_notes', idCol: 'id', idParam: ['noteID', 'id'] },
  { re: /vital_signs/, name: 'vital_signs', idCol: 'vitalSignID', idParam: ['vitalSignID', 'id'] },
];

const tableFor = (q) => TABLES.find(t => t.re.test(q));
const idFrom = (t, params) => Number(t.idParam.map(p => params[p]).find(v => v !== undefined));

// Apply "col = @param" assignments from an UPDATE ... SET clause
function applySet(q, row, params) {
  const set = q.match(/SET([\s\S]*?)(OUTPUT|WHERE)/)[1];
  for (const part of set.split(',')) {
    const m = part.match(/(\w+)\s*=\s*(@\w+|GETDATE\(\)|'[^']*'|\d+)/);
    if (!m) continue;
    const [, col, val] = m;
    if (val.startsWith('@')) row[col] = params[val.slice(1)];
    else if (val === 'GETDATE()') row[col] = new Date();
    else if (val.startsWith("'")) row[col] = val.slice(1, -1);
    else row[col] = Number(val);
  }
}

function makeRequest() {
  const params = {};
  const req = {
    input(name, _type, value) { params[name] = value; return req; },
    async query(q) {
      if (/INSERT INTO dbo\.Section5RecordVersions/.test(q)) {
        versions.push({ ...params });
        return { recordset: [], rowsAffected: [1] };
      }
      if (/INSERT INTO dbo\.AuditLog/.test(q)) {
        auditRows.push({ ...params });
        return { recordset: [], rowsAffected: [1] };
      }
      if (/FROM Clients/.test(q)) {
        return { recordset: [{ clientID: params.clientID }] };
      }

      const t = tableFor(q);
      if (!t) return { recordset: [], rowsAffected: [0] };
      const rows = tables[t.name];
      const guarded = /ISNULL\(isLocked, 0\) = 0/.test(q);

      if (/^\s*INSERT/i.test(q)) {
        const row = { [t.idCol]: nextId++, ...params, isLocked: !!params.isLocked };
        rows[row[t.idCol]] = row;
        return { recordset: [row], rowsAffected: [1] };
      }
      const id = idFrom(t, params);
      const row = rows[id];
      if (/^\s*UPDATE/i.test(q)) {
        if (!row || (guarded && row.isLocked)) return { recordset: [], rowsAffected: [0] };
        applySet(q, row, params);
        row.isLocked = !!row.isLocked;
        return { recordset: [row], rowsAffected: [1] };
      }
      if (/^\s*DELETE/i.test(q)) {
        if (!row || (guarded && row.isLocked)) return { recordset: [], rowsAffected: [0] };
        delete rows[id];
        return { recordset: [], rowsAffected: [1] };
      }
      if (/^\s*SELECT/i.test(q)) {
        return { recordset: row ? [row] : [] };
      }
      return { recordset: [], rowsAffected: [0] };
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

// Swap in the fake pool before the routers are loaded
const azureSqlPath = path.resolve(__dirname, '../store/azureSql.js');
require.cache[azureSqlPath] = {
  id: azureSqlPath, filename: azureSqlPath, loaded: true,
  exports: { getPool: async () => fakePool, connectToAzureSQL: async () => fakePool },
};
sql.Transaction = FakeTransaction;

const progressNoteRouter = require('../routes/progressNote.js');
const medObservationRouter = require('../routes/medObservation.js');
const section5LockRouter = require('../routes/section5Lock.js');

// Stand-in for middleware/auth.js: the test sets req.user via a header
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (req.headers['x-test-user']) req.user = JSON.parse(req.headers['x-test-user']);
    next();
  });
  app.use('/api', progressNoteRouter);
  app.use('/api', medObservationRouter);
  app.use('/api/section5', section5LockRouter);
  return app;
}

const asUser = (user) => ({ 'x-test-user': JSON.stringify(user) });
const itAdmin = { email: 'it@hope.org', isAdmin: true, groups: [IT_GROUP] };
const level1 = { email: 'lead@hope.org', isAdmin: false, groups: [LEVEL1_GROUP] };
const nurse = { email: 'nurse@hope.org', isAdmin: false, groups: [NURSING_GROUP] };

const note = {
  nurseNoteDate: '2026-10-01',
  nurseNoteSite: 'Main',
  nurseNote: 'Client seen today.',
  createdBy: 'nurse@hope.org',
};

const unlockReason = { reason: 'Correcting the note date' };

describe('Section 5 record lock and unlock', () => {
  let app;

  beforeEach(() => {
    tables = { progress_notes: {}, vital_signs: {} };
    versions = [];
    auditRows = [];
    nextId = 1;
    app = buildApp();
  });

  const createNote = (submit) =>
    request(app).post('/api/progress-notes/C1').set(asUser(nurse)).send({ ...note, submit });

  describe('save progress vs submit', () => {
    it('saves progress unlocked', async () => {
      const res = await createNote(false);
      expect(res.status).toBe(201);
      expect(res.body.data.isLocked).toBe(false);
      expect(res.body.data.submittedBy).toBeNull();
    });

    it('locks the note on submit and records who submitted it', async () => {
      const res = await createNote(true);
      expect(res.status).toBe(201);
      expect(res.body.data.isLocked).toBe(true);
      expect(res.body.data.submittedBy).toBe('nurse@hope.org');
    });

    it('lets a saved draft be edited again and then submitted', async () => {
      const { body } = await createNote(false);
      const id = body.data.id;

      const draft = await request(app).put(`/api/progress-notes/${id}`)
        .send({ nurseNote: 'More detail', updatedBy: 'nurse@hope.org' });
      expect(draft.status).toBe(200);
      expect(draft.body.data.isLocked).toBe(false);

      const submitted = await request(app).put(`/api/progress-notes/${id}`)
        .send({ nurseNote: 'Final', updatedBy: 'nurse@hope.org', submit: true });
      expect(submitted.status).toBe(200);
      expect(submitted.body.data.isLocked).toBe(true);
    });

    it('ignores a client-sent isLocked flag', async () => {
      const res = await request(app).post('/api/progress-notes/C1').send({ ...note, isLocked: true });
      expect(res.body.data.isLocked).toBe(false);
    });
  });

  describe('lock', () => {
    it('rejects updating a submitted note with 409 RECORD_LOCKED', async () => {
      const { body } = await createNote(true);
      const res = await request(app).put(`/api/progress-notes/${body.data.id}`)
        .send({ nurseNote: 'Changed', updatedBy: 'nurse@hope.org', submit: false });
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('RECORD_LOCKED');
      expect(tables.progress_notes[body.data.id].nurseNote).toBe('Client seen today.');
    });

    it('rejects deleting or archiving a submitted note', async () => {
      const { body } = await createNote(true);
      const archive = await request(app).delete(`/api/progress-notes/${body.data.id}`);
      const hard = await request(app).delete(`/api/progress-notes/${body.data.id}?permanent=true`);
      expect(archive.status).toBe(409);
      expect(hard.status).toBe(409);
      expect(tables.progress_notes[body.data.id]).toBeDefined();
    });

    it('locks observation records the same way', async () => {
      const created = await request(app).post('/api/vital-signs/C1')
        .send({ recordDate: '2026-10-01', pulse: 70, recordedBy: 'Nurse', submit: true });
      expect(created.status).toBe(201);
      expect(created.body.isLocked).toBe(true);

      const res = await request(app).put(`/api/vital-signs/${created.body.vitalSignID}`)
        .send({ recordDate: '2026-10-01', pulse: 90, recordedBy: 'Nurse' });
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('RECORD_LOCKED');
    });
  });

  describe('unlock', () => {
    const unlock = (id, user, body = unlockReason, type = 'progress-note') => {
      const r = request(app).post(`/api/section5/records/${type}/${id}/unlock`);
      if (user) r.set(asUser(user));
      return r.send(body);
    };

    it('requires authentication', async () => {
      const { body } = await createNote(true);
      const res = await unlock(body.data.id, null);
      expect(res.status).toBe(401);
    });

    it('refuses users outside IT Admin / Level 1', async () => {
      const { body } = await createNote(true);
      const res = await unlock(body.data.id, nurse);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('UNLOCK_NOT_PERMITTED');
      expect(tables.progress_notes[body.data.id].isLocked).toBe(true);
    });

    it('requires a reason', async () => {
      const { body } = await createNote(true);
      const res = await unlock(body.data.id, level1, { reason: 'no' });
      expect(res.status).toBe(422);
    });

    it('rejects an unknown record type', async () => {
      const res = await unlock(1, itAdmin, unlockReason, 'bogus');
      expect(res.status).toBe(400);
    });

    it('returns 409 when the record is not locked', async () => {
      const { body } = await createNote(false);
      const res = await unlock(body.data.id, itAdmin);
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('RECORD_NOT_LOCKED');
    });

    it.each([['Level 1', level1], ['IT Admin', itAdmin]])('lets %s unlock, keeping the submitted version', async (_label, user) => {
      const { body } = await createNote(true);
      const id = body.data.id;

      const res = await unlock(id, user);
      expect(res.status).toBe(200);
      expect(res.body.isLocked).toBe(false);

      const row = tables.progress_notes[id];
      expect(row.isLocked).toBe(false);
      expect(row.unlockedBy).toBe(user.email);
      expect(row.unlockReason).toBe(unlockReason.reason);

      expect(versions).toHaveLength(1);
      expect(versions[0].recordType).toBe('progress-note');
      expect(versions[0].archivedReason).toBe('unlock');
      expect(JSON.parse(versions[0].snapshot).nurseNote).toBe('Client seen today.');
      expect(auditRows[0].action).toBe('UNLOCK_SECTION5_RECORD');
      // The free-text reason may contain PHI and stays out of AuditLog
      expect(auditRows[0].newValues).not.toContain(unlockReason.reason);

      // Editable again
      const edit = await request(app).put(`/api/progress-notes/${id}`)
        .send({ nurseNote: 'Corrected', updatedBy: 'nurse@hope.org' });
      expect(edit.status).toBe(200);
    });
  });

  describe('admin delete of a submitted record', () => {
    const del = (id, user, body = { reason: 'Entered on the wrong client' }, type = 'progress-note') => {
      const r = request(app).delete(`/api/section5/records/${type}/${id}`);
      if (user) r.set(asUser(user));
      return r.send(body);
    };

    it('requires authentication', async () => {
      const { body } = await createNote(true);
      expect((await del(body.data.id, null)).status).toBe(401);
    });

    it('refuses users outside IT Admin / Level 1', async () => {
      const { body } = await createNote(true);
      const res = await del(body.data.id, nurse);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('DELETE_NOT_PERMITTED');
      expect(tables.progress_notes[body.data.id]).toBeDefined();
    });

    it('requires a reason', async () => {
      const { body } = await createNote(true);
      expect((await del(body.data.id, itAdmin, {})).status).toBe(422);
    });

    it('only handles submitted records; drafts use the normal delete', async () => {
      const { body } = await createNote(false);
      const res = await del(body.data.id, itAdmin);
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('RECORD_NOT_LOCKED');
    });

    it.each([['Level 1', level1], ['IT Admin', itAdmin]])('lets %s delete it, keeping a copy', async (_label, user) => {
      const { body } = await createNote(true);
      const id = body.data.id;

      const res = await del(id, user);
      expect(res.status).toBe(200);
      expect(tables.progress_notes[id]).toBeUndefined();

      expect(versions).toHaveLength(1);
      expect(versions[0].archivedReason).toBe('delete');
      expect(versions[0].archivedBy).toBe(user.email);
      expect(JSON.parse(versions[0].snapshot).nurseNote).toBe('Client seen today.');
      expect(auditRows[0].action).toBe('DELETE_SECTION5_RECORD');
      expect(auditRows[0].clientID).toBe('C1');
      expect(auditRows[0].newValues).not.toContain('wrong client');
    });

    it('deletes observation records too', async () => {
      const created = await request(app).post('/api/vital-signs/C1')
        .send({ recordDate: '2026-10-01', pulse: 70, recordedBy: 'Nurse', submit: true });
      const res = await del(created.body.vitalSignID, level1, undefined, 'vital-signs');
      expect(res.status).toBe(200);
      expect(tables.vital_signs[created.body.vitalSignID]).toBeUndefined();
    });
  });
});

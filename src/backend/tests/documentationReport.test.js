// Admin > Behavioral Health / Nursing documentation reports.
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);
const express = require('express');
const request = require('supertest');

// Fake DB: table name -> rows its grouped query returns
let rows;
let failing;
let audit;

const tableOf = (q) => {
  if (/INSERT INTO dbo\.AuditLog/.test(q)) return 'AuditLog';
  if (/FROM Clients c/.test(q)) return 'Clients';
  return q.match(/FROM\s+(?:dbo\.)?(\w+)/)[1];
};

const fakePool = {
  request() {
    const inputs = {};
    const req = {
      input(name, _type, value) { inputs[name] = value; return req; },
      async query(q) {
        const table = tableOf(q);
        if (table === 'AuditLog') { audit.push(inputs); return { recordset: [] }; }
        if (failing.has(table)) throw new Error(`Invalid object name '${table}'`);
        return { recordset: rows[table] || [] };
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

const router = require('../routes/admin/documentation.cjs');
const { AREA_GROUP_IDS } = require('../middleware/documentationAccess.js');

// The real Object Ids are filled in once known; use sample ones here
AREA_GROUP_IDS.nursing = 'nursing-admin-group';
AREA_GROUP_IDS.behavioral = 'behavioral-admin-group';
const LEVEL1_GROUP = 'f47eca14-0206-4719-91c7-fba7b2be382c';
const { buildReport } = router;

const app = express();
// Signed-in user for the next request (IT Admin unless a test says otherwise)
let user;
app.use((req, _res, next) => { req.user = user; next(); });
app.use('/api/admin/documentation', router);

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const client = (clientID, admittedDaysAgo, extra = {}) => ({
  clientID, firstName: 'First', lastName: `Last${clientID}`, site: 'Eubanks',
  admitDate: daysAgo(admittedDaysAgo), ...extra,
});

describe('GET /api/admin/documentation/:area', () => {
  beforeEach(() => {
    rows = {};
    failing = new Set();
    audit = [];
    user = { email: 'sup@hope.org', name: 'Supervisor', isAdmin: true, groups: [] };
  });

  describe('access', () => {
    beforeEach(() => { rows.Clients = []; });

    it('lets the nursing admin group open the nursing report only', async () => {
      user = { email: 'rn@hope.org', isAdmin: false, groups: ['nursing-admin-group'] };
      expect((await request(app).get('/api/admin/documentation/nursing')).status).toBe(200);
      expect((await request(app).get('/api/admin/documentation/behavioral')).status).toBe(403);
    });

    it('lets the behavioral admin group open the behavioral report only', async () => {
      user = { email: 'cm@hope.org', isAdmin: false, groups: ['behavioral-admin-group'] };
      expect((await request(app).get('/api/admin/documentation/behavioral')).status).toBe(200);
      expect((await request(app).get('/api/admin/documentation/nursing')).status).toBe(403);
    });

    it('keeps Level 1 and other staff out, without logging a view', async () => {
      user = { email: 'l1@hope.org', isAdmin: false, groups: [LEVEL1_GROUP] };
      const res = await request(app).get('/api/admin/documentation/nursing');
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('DOCUMENTATION_ACCESS_REQUIRED');
      expect(audit).toHaveLength(0);
    });

    it('matches nobody while a group Id is blank', async () => {
      AREA_GROUP_IDS.nursing = '';
      user = { email: 'x@hope.org', isAdmin: false, groups: [''] };
      const res = await request(app).get('/api/admin/documentation/nursing');
      AREA_GROUP_IDS.nursing = 'nursing-admin-group';
      expect(res.status).toBe(403);
    });
  });

  it('rejects an unknown area', async () => {
    const res = await request(app).get('/api/admin/documentation/payroll');
    expect(res.status).toBe(404);
  });

  it('lists every active client with a status per check and logs the view', async () => {
    rows.Clients = [client('C1', 60)];
    const res = await request(app).get('/api/admin/documentation/nursing');
    expect(res.status).toBe(200);
    expect(res.body.checks.map((c) => c.key)).toEqual([
      'medFaceSheet', 'nursingScreening', 'nursingAssessment', 'progressNotes',
      'nursingIdt', 'providerIdt', 'observationRecord',
    ]);
    const [c1] = res.body.clients;
    expect(c1.items.nursingAssessment.status).toBe('missing');
    expect(c1.items.observationRecord.status).toBe('na');
    expect(c1.items.nursingIdt.status).toBe('pending'); // first IDT note has 90 days
    expect(c1.gapCount).toBe(4);
    expect(res.body.summary).toMatchObject({ activeClients: 1, clientsWithGaps: 1 });

    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({ userID: 'sup@hope.org', action: 'VIEW_REPORT', recordID: 'nursing' });
  });

  it('treats missing records as pending inside the grace period', async () => {
    rows.Clients = [client('C1', 1)];
    const report = await buildReport(fakePool, 'nursing');
    expect(report.clients[0].items.medFaceSheet.status).toBe('pending');
    expect(report.clients[0].gapCount).toBe(0);
  });

  it('flags unsubmitted Section 5 notes and stale notes', async () => {
    rows.Clients = [client('C1', 90), client('C2', 90), client('C3', 90)];
    rows.progress_notes = [
      { clientID: 'C1', total: 3, drafts: 1, lastAt: daysAgo(2) },
      { clientID: 'C2', total: 3, drafts: 0, lastAt: daysAgo(45) },
      { clientID: 'C3', total: 3, drafts: 0, lastAt: daysAgo(5) },
    ];
    const report = await buildReport(fakePool, 'nursing');
    const item = (id) => report.clients.find((c) => c.clientID === id).items.progressNotes;
    expect(item('C1')).toMatchObject({ status: 'incomplete', detail: '1 note not submitted' });
    expect(item('C2').status).toBe('overdue');
    expect(item('C3').status).toBe('ok');
    expect(report.summary.byCheck.progressNotes).toMatchObject({ incomplete: 1, overdue: 1, ok: 1 });
  });

  it('requires IDT notes every 90 days', async () => {
    rows.Clients = [client('C1', 60), client('C2', 200), client('C3', 200)];
    rows.idt_nursing_notes = [
      { clientID: 'C2', total: 2, drafts: 0, lastAt: daysAgo(80) },
      { clientID: 'C3', total: 2, drafts: 0, lastAt: daysAgo(100) },
    ];
    const report = await buildReport(fakePool, 'nursing');
    const item = (id) => report.clients.find((c) => c.clientID === id).items;
    expect(item('C1').nursingIdt.status).toBe('pending');
    expect(item('C2').nursingIdt.status).toBe('ok');
    expect(item('C3').nursingIdt.status).toBe('overdue');
    expect(item('C3').providerIdt.status).toBe('missing');
  });

  it('blanks only the check whose table fails', async () => {
    rows.Clients = [client('C1', 60)];
    rows.medical_screening = [{ clientID: 'C1', total: 1, lastAt: daysAgo(50) }];
    failing.add('nursing_admission');
    const report = await buildReport(fakePool, 'nursing');
    expect(report.failedChecks).toEqual(['nursingAssessment']);
    expect(report.clients[0].items.nursingAssessment.status).toBe('error');
    expect(report.clients[0].items.nursingScreening.status).toBe('ok');
  });

  it('matches client IDs across tables as strings', async () => {
    rows.Clients = [client(154406, 60)];
    rows.medical_face_sheet = [{ clientID: '154406', total: 1, lastAt: daysAgo(50) }];
    const report = await buildReport(fakePool, 'nursing');
    expect(report.clients[0].items.medFaceSheet.status).toBe('ok');
  });

  describe('behavioral', () => {
    it('checks core consent forms and unsigned forms', async () => {
      rows.Clients = [client('C1', 30), client('C2', 30), client('C3', 30)];
      rows.AuthorizationForms = [
        { clientID: 'C1', total: 5, coreSigned: 3, unsigned: 0, lastAt: daysAgo(20) },
        { clientID: 'C2', total: 5, coreSigned: 2, unsigned: 1, lastAt: daysAgo(20) },
        { clientID: 'C3', total: 5, coreSigned: 3, unsigned: 2, lastAt: daysAgo(20) },
      ];
      const report = await buildReport(fakePool, 'behavioral');
      const item = (id) => report.clients.find((c) => c.clientID === id).items.consentForms;
      expect(item('C1').status).toBe('ok');
      expect(item('C2')).toMatchObject({ status: 'incomplete', detail: '2 of 3 core forms signed; 1 form unsigned' });
      expect(item('C3')).toMatchObject({ status: 'incomplete', detail: '2 forms started but not signed' });
    });

    it('makes Sections 1-3 due 72 hours after the admit date', async () => {
      rows.Clients = [client('C1', 2), client('C2', 3)];
      const report = await buildReport(fakePool, 'behavioral');
      const items = (id) => report.clients.find((c) => c.clientID === id).items;
      for (const key of ['faceSheet', 'consentForms', 'bioSocial', 'mentalHealth', 'assessmentPlan']) {
        expect(items('C1')[key].status).toBe('pending');
        expect(items('C2')[key].status).toBe('missing');
      }
    });

    it('requires a re-assessment one year after admission, then yearly', async () => {
      rows.Clients = [client('C1', 300), client('C2', 370), client('C3', 700)];
      rows.ReassessmentData = [{ clientID: 'C3', total: 1, unfinished: 0, lastAt: daysAgo(300) }];
      const report = await buildReport(fakePool, 'behavioral');
      const item = (id) => report.clients.find((c) => c.clientID === id).items.reassessment;
      expect(item('C1').status).toBe('pending');
      expect(item('C2').status).toBe('missing');
      expect(item('C3').status).toBe('ok');
    });

    it('requires a care plan update every 90 days', async () => {
      rows.Clients = [client('C1', 200), client('C2', 200)];
      rows.CarePlans = [
        { clientID: 'C1', total: 1, drafts: 0, lastAt: daysAgo(80) },
        { clientID: 'C2', total: 1, drafts: 0, lastAt: daysAgo(95) },
      ];
      const report = await buildReport(fakePool, 'behavioral');
      const item = (id) => report.clients.find((c) => c.clientID === id).items.carePlan;
      expect(item('C1').status).toBe('ok');
      expect(item('C2').status).toBe('overdue');
    });

    it('flags assessments not marked Complete', async () => {
      rows.Clients = [client('C1', 30)];
      rows.BioSocialAssessment = [{ clientID: 'C1', total: 1, complete: 0, pct: 40, lastAt: daysAgo(3) }];
      rows.MentalHealthAssessments = [{ clientID: 'C1', total: 1, complete: 1, pct: 100, lastAt: daysAgo(3) }];
      const { items } = (await buildReport(fakePool, 'behavioral')).clients[0];
      expect(items.bioSocial).toMatchObject({ status: 'incomplete', detail: 'Not marked Complete (40% done)' });
      expect(items.mentalHealth.status).toBe('ok');
    });

    it('flags overdue re-assessments and assessment care plans', async () => {
      rows.Clients = [client('C1', 800)];
      rows.ReassessmentData = [{ clientID: 'C1', total: 1, unfinished: 0, lastAt: daysAgo(400) }];
      rows.AssessmentCarePlans = [{ clientID: 'C1', total: 1, open: 1, pastDue: 1, lastAt: daysAgo(30) }];
      const { items } = (await buildReport(fakePool, 'behavioral')).clients[0];
      expect(items.reassessment.status).toBe('overdue');
      expect(items.assessmentPlan.status).toBe('overdue');
    });

    it('requires two encounter notes last week and flags draft notes and care plans', async () => {
      rows.Clients = [client('C1', 60), client('C2', 60), client('C3', 60), client('C4', 2)];
      rows.EncounterNotes = [
        { clientID: 'C1', total: 10, drafts: 0, lastWeek: 2, thisWeek: 0, lastAt: daysAgo(3) },
        { clientID: 'C2', total: 10, drafts: 0, lastWeek: 1, thisWeek: 0, lastAt: daysAgo(9) },
        { clientID: 'C3', total: 10, drafts: 2, lastWeek: 2, thisWeek: 1, lastAt: daysAgo(1) },
      ];
      rows.CarePlans = [{ clientID: 'C1', total: 1, drafts: 1, lastAt: daysAgo(3) }];
      const report = await buildReport(fakePool, 'behavioral');
      const items = (id) => report.clients.find((c) => c.clientID === id).items;
      expect(items('C1').encounterNotes.status).toBe('ok');
      expect(items('C2').encounterNotes).toMatchObject({ status: 'overdue' });
      expect(items('C2').encounterNotes.detail).toMatch(/^1 of 2 notes last week/);
      expect(items('C3').encounterNotes).toMatchObject({ status: 'incomplete', detail: '2 draft notes not submitted' });
      expect(items('C4').encounterNotes.status).toBe('pending');
      expect(items('C1').carePlan).toMatchObject({ status: 'incomplete', detail: '1 draft not submitted' });
    });
  });
});

// Assigning the behavioral and medical person on a client's care team
// (routes/clients.js, dbScripts/ClientCareTeam.sql).
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);
const express = require('express');
const request = require('supertest');
const { SITE_GROUPS } = require('../config/siteAccess.js');

const EUBANKS = SITE_GROUPS.Eubanks;

let rows;
let queries;
const fakePool = {
  request() {
    const params = {};
    const req = {
      input(name, _type, value) { params[name] = value; return req; },
      async query(q) {
        queries.push({ q, params: { ...params } });
        if (/INSERT INTO dbo\.AuditLog/.test(q)) return { recordset: [] };
        if (/UPDATE Clients/.test(q)) {
          const row = rows.find(c => c.clientID === params.clientID);
          const sets = q.match(/SET ([\s\S]*?), updatedAt/)[1].split(',').map(s => s.trim().split(' = @')[0]);
          sets.forEach(field => { row[field] = params[field]; });
          return { recordset: [row] };
        }
        if (/INSERT INTO Clients/.test(q)) {
          const row = { ...params };
          rows.push(row);
          return { recordset: [row] };
        }
        if (/SELECT \* FROM Clients WHERE clientID/.test(q) || /SELECT clientID FROM Clients/.test(q)) {
          return { recordset: rows.filter(c => c.clientID === params.clientID).map(c => ({ ...c })) };
        }
        throw new Error(`Unexpected query: ${q}`);
      },
    };
    return req;
  },
};

const azureSqlPath = path.resolve(__dirname, '../store/azureSql.js');
require.cache[azureSqlPath] = {
  id: azureSqlPath, filename: azureSqlPath, loaded: true,
  exports: { getPool: async () => fakePool },
};

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  req.user = { email: 'lead@hope.org', name: 'Team Lead', groups: [EUBANKS] };
  next();
});
app.use('/api/clients', require('../routes/clients.js'));

const audits = () => queries.filter(({ q }) => /INSERT INTO dbo\.AuditLog/.test(q));

beforeEach(() => {
  queries = [];
  rows = [{ clientID: 'E1', clientFirstName: 'Eve', clientLastName: 'Two', clientSite: 'Eubanks' }];
});

describe('care team assignment', () => {
  it('assigns a behavioral and a medical person and audits it', async () => {
    const res = await request(app).put('/api/clients/E1').send({
      clientBehavioralStaffEmail: ' Case.Worker@Hope.org ',
      clientBehavioralStaffName: 'Casey Worker',
      clientMedicalStaffEmail: 'nurse@hope.org',
      clientMedicalStaffName: 'Nora Nurse',
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      clientBehavioralStaffEmail: 'case.worker@hope.org',
      clientBehavioralStaffName: 'Casey Worker',
      clientMedicalStaffEmail: 'nurse@hope.org',
      clientMedicalStaffName: 'Nora Nurse',
    });

    expect(audits()).toHaveLength(1);
    const { params } = audits()[0];
    expect(params.action).toBe('ASSIGN_CARE_TEAM');
    expect(JSON.parse(params.newValues).changes.map(c => [c.role, c.to])).toEqual([
      ['behavioral', 'case.worker@hope.org'],
      ['medical', 'nurse@hope.org'],
    ]);
  });

  it('clears an assignment, name included', async () => {
    Object.assign(rows[0], { clientMedicalStaffEmail: 'nurse@hope.org', clientMedicalStaffName: 'Nora Nurse' });
    const res = await request(app).put('/api/clients/E1').send({ clientMedicalStaffEmail: '' });
    expect(res.status).toBe(200);
    expect(res.body.clientMedicalStaffEmail).toBeNull();
    expect(res.body.clientMedicalStaffName).toBeNull();
    expect(JSON.parse(audits()[0].params.newValues).changes).toEqual([
      { role: 'medical', from: 'nurse@hope.org', to: null, toName: null },
    ]);
  });

  it('does not audit when the care team is unchanged', async () => {
    Object.assign(rows[0], { clientMedicalStaffEmail: 'nurse@hope.org', clientMedicalStaffName: 'Nora Nurse' });
    const res = await request(app).put('/api/clients/E1')
      .send({ clientMedicalStaffEmail: 'nurse@hope.org', clientMedicalStaffName: 'Nora Nurse' });
    expect(res.status).toBe(200);
    expect(audits()).toHaveLength(0);
  });

  it('rejects a staff member that is not an email address', async () => {
    const res = await request(app).put('/api/clients/E1').send({ clientBehavioralStaffEmail: 'Casey Worker' });
    expect(res.status).toBe(400);
    expect(res.body.errors.clientBehavioralStaffEmail).toMatch(/email/);
    expect(queries).toHaveLength(0);
  });

  it('saves the care team on a new client', async () => {
    const res = await request(app).post('/api/clients').send({
      clientID: 'E2',
      clientFirstName: 'New',
      clientLastName: 'Person',
      clientSite: 'Eubanks',
      clientBehavioralStaffEmail: 'case.worker@hope.org',
      clientBehavioralStaffName: 'Casey Worker',
    });
    expect(res.status).toBe(201);
    const insert = queries.find(({ q }) => /INSERT INTO Clients/.test(q));
    expect(insert.params).toMatchObject({
      clientBehavioralStaffEmail: 'case.worker@hope.org',
      clientBehavioralStaffName: 'Casey Worker',
    });
    expect(insert.q).toMatch(/clientBehavioralStaffEmail, clientBehavioralStaffName, createdAt/);
    expect(insert.q).toMatch(/@clientBehavioralStaffEmail, @clientBehavioralStaffName, GETDATE\(\)/);
    expect(insert.q).not.toMatch(/clientMedicalStaff/);
  });

  it('leaves the care team columns out of a new client without one', async () => {
    const res = await request(app).post('/api/clients')
      .send({ clientID: 'E3', clientFirstName: 'No', clientLastName: 'Team', clientSite: 'Eubanks' });
    expect(res.status).toBe(201);
    expect(queries.find(({ q }) => /INSERT INTO Clients/.test(q)).q).not.toMatch(/StaffEmail/);
  });
});

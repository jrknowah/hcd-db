// Readmitting a discharged client under the same ID (routes/clients.js,
// store/dbScripts/ClientStays.sql), the read-only guard on previous stays, and
// which uploaded files each stay lists.
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);
const express = require('express');
const request = require('supertest');

let clients;    // clientID -> Clients row
let stays;      // ClientStays rows
let executed;   // stored procedure calls
let audit;

function makeRequest() {
  const params = {};
  const req = {
    input(name, _type, value) { params[name] = value; return req; },
    async query(q) {
      if (/INSERT INTO dbo\.AuditLog/.test(q)) { audit.push({ ...params }); return { recordset: [] }; }
      if (/FROM ClientStays/.test(q)) {
        return { recordset: stays.filter(s => s.clientID === params.clientID).sort((a, b) => b.stayNumber - a.stayNumber) };
      }
      if (/FROM Clients WHERE clientID = @clientID/.test(q)) {
        return { recordset: clients[params.clientID] ? [clients[params.clientID]] : [] };
      }
      throw new Error(`Unexpected query: ${q}`);
    },
    // Stand-in for dbo.usp_ReadmitClient
    async execute(proc) {
      executed.push({ proc, ...params });
      const client = clients[params.clientID];
      const stayNumber = stays.filter(s => s.clientID === params.clientID).length + 1;
      const priorStayClientID = `${params.clientID}~${stayNumber}`;
      clients[priorStayClientID] = { ...client, clientID: priorStayClientID, clientPriorStayOf: params.clientID };
      stays.push({ clientID: params.clientID, stayNumber, priorStayClientID, readmittedAt: new Date('2026-10-10T17:00:00Z') });
      Object.assign(client, { clientAdmitDate: params.admitDate, clientSite: params.site, clientDischargeDate: null, clientExitReason: null });
      return { recordset: [{ priorStayClientID, stayNumber, movedRows: 'exit_form.clientID=1; ' }] };
    },
  };
  return req;
}

const azureSqlPath = path.resolve(__dirname, '../store/azureSql.js');
require.cache[azureSqlPath] = {
  id: azureSqlPath, filename: azureSqlPath, loaded: true,
  exports: { getPool: async () => ({ request: makeRequest }) },
};

const { stayFileScope, blobInScope } = require('../utils/stayFiles.js');
const { SITE_GROUPS } = require('../config/siteAccess.js');

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  req.user = req.headers['x-test-user'] ? JSON.parse(req.headers['x-test-user']) : { email: 'cm@hope.org', groups: [] };
  next();
});
app.use('/api', require('../middleware/priorStayReadOnly.js'));
app.use('/api/clients', require('../routes/clients.js'));

beforeEach(() => {
  clients = {
    D1: { clientID: 'D1', clientFirstName: 'Dee', clientLastName: 'Moss', clientSite: 'Pacific', clientProgram: 'LAHSA',
          clientAdmitDate: '2026-01-05', clientDischargeDate: '2026-09-30', clientExitReason: 'Family Reunification' },
    A1: { clientID: 'A1', clientFirstName: 'Ana', clientLastName: 'Lopez', clientSite: 'Pacific', clientDischargeDate: null },
  };
  stays = [];
  executed = [];
  audit = [];
});

describe('POST /api/clients/:clientID/readmit', () => {
  it('starts a new stay under the same ID and archives the previous one', async () => {
    const res = await request(app).post('/api/clients/D1/readmit').send({ admitDate: '2026-10-12', clientSite: 'Eubanks' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ priorStayClientID: 'D1~1', stayNumber: 1 });
    expect(res.body.client).toMatchObject({ clientID: 'D1', clientSite: 'Eubanks', status: 'active', clientDischargeDate: null });
    expect(executed).toEqual([{ proc: 'dbo.usp_ReadmitClient', clientID: 'D1', admitDate: '2026-10-12', site: 'Eubanks', user: 'cm@hope.org' }]);
    expect(audit[0]).toMatchObject({ action: 'READMIT', clientID: 'D1', userID: 'cm@hope.org' });

    const history = await request(app).get('/api/clients/D1/stays');
    expect(history.body.map(s => s.priorStayClientID)).toEqual(['D1~1']);
  });

  it('only readmits discharged clients', async () => {
    const res = await request(app).post('/api/clients/A1/readmit').send({ admitDate: '2026-10-12', clientSite: 'Pacific' });
    expect(res.status).toBe(409);
    expect(executed).toHaveLength(0);
  });

  it('checks the admit date and site', async () => {
    const bad = await request(app).post('/api/clients/D1/readmit').send({ admitDate: 'soon', clientSite: 'Mars' });
    expect(bad.status).toBe(400);
    expect(Object.keys(bad.body.errors).sort()).toEqual(['admitDate', 'clientSite']);

    const early = await request(app).post('/api/clients/D1/readmit').send({ admitDate: '2026-09-01', clientSite: 'Pacific' });
    expect(early.status).toBe(400);
    expect(early.body.errors.admitDate).toMatch(/before the discharge date/);
    expect(executed).toHaveLength(0);
  });

  it('needs access to both the current and the new site', async () => {
    const pacificStaff = { 'x-test-user': JSON.stringify({ email: 'p@hope.org', groups: [SITE_GROUPS.Pacific] }) };
    const res = await request(app).post('/api/clients/D1/readmit').set(pacificStaff).send({ admitDate: '2026-10-12', clientSite: 'Eubanks' });
    expect(res.status).toBe(403);
    expect(executed).toHaveLength(0);
  });

  it('keeps previous stays out of the client list and read-only', async () => {
    await request(app).post('/api/clients/D1/readmit').send({ admitDate: '2026-10-12', clientSite: 'Pacific' });

    expect((await request(app).put('/api/clients/D1~1').send({ clientProgram: 'DHS' })).status).toBe(403);
    expect((await request(app).post('/api/clients/D1~1/readmit').send({ admitDate: '2026-10-12', clientSite: 'Pacific' })).status).toBe(403);
    // Any other route that names a previous stay is refused too
    expect((await request(app).post('/api/saveClientFace').send({ clientID: 'D1~1' })).status).toBe(403);
    expect((await request(app).put('/api/exit-form/D1%7E1').send({})).status).toBe(403);
    // Reading it is fine (the PDF export uses it)
    expect((await request(app).get('/api/clients/D1~1')).status).toBe(200);
  });

  it('refuses new client IDs containing "~"', async () => {
    const res = await request(app).post('/api/clients').send({ clientID: 'X~A', clientFirstName: 'A', clientLastName: 'B', clientSite: 'Pacific' });
    expect(res.status).toBe(400);
    expect(res.body.errors.clientID).toMatch(/~/);
  });
});

describe('uploaded files per stay', () => {
  const blob = (iso) => ({ properties: { createdOn: new Date(iso) } });

  beforeEach(() => {
    stays = [
      { clientID: 'D1', stayNumber: 1, readmittedAt: new Date('2026-03-01T00:00:00Z') },
      { clientID: 'D1', stayNumber: 2, readmittedAt: new Date('2026-08-01T00:00:00Z') },
    ];
  });

  it('lists the current stay files uploaded since the last readmission', async () => {
    const scope = await stayFileScope('D1');
    expect(scope.folderID).toBe('D1');
    expect(blobInScope(blob('2026-09-01T00:00:00Z'), scope)).toBe(true);
    expect(blobInScope(blob('2026-07-01T00:00:00Z'), scope)).toBe(false);
  });

  it('lists a previous stay files from its own time in the client folder', async () => {
    const first = await stayFileScope('D1~1');
    expect(first.folderID).toBe('D1');
    expect(blobInScope(blob('2026-01-15T00:00:00Z'), first)).toBe(true);
    expect(blobInScope(blob('2026-04-01T00:00:00Z'), first)).toBe(false);

    const second = await stayFileScope('D1~2');
    expect(blobInScope(blob('2026-04-01T00:00:00Z'), second)).toBe(true);
    expect(blobInScope(blob('2026-01-15T00:00:00Z'), second)).toBe(false);
    expect(blobInScope(blob('2026-09-01T00:00:00Z'), second)).toBe(false);
  });

  it('lists every file for a client who was never readmitted', async () => {
    const scope = await stayFileScope('A1');
    expect(blobInScope(blob('2020-01-01T00:00:00Z'), scope)).toBe(true);
  });
});

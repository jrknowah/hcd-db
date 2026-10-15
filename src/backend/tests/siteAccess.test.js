// Client lists limited to the sites a user can see (config/siteAccess.js).
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);
const express = require('express');
const request = require('supertest');
const { allowedSites, canSeeClient, SITE_GROUPS, AUDIT_GROUP_ID } = require('../config/siteAccess.js');

const PACIFIC = SITE_GROUPS.Pacific;
const EUBANKS = SITE_GROUPS.Eubanks;

const CLIENTS = [
  { clientID: 'P1', clientFirstName: 'Pat', clientLastName: 'One', clientSite: 'Pacific' },
  { clientID: 'E1', clientFirstName: 'Eve', clientLastName: 'Two', clientSite: 'Eubanks' },
  { clientID: 'D1', clientFirstName: 'Dan', clientLastName: 'Three', clientSite: 'Downey' },
];

describe('allowedSites', () => {
  it('gives IT admins and auditors every site', () => {
    expect(allowedSites({ isAdmin: true, groups: [PACIFIC] })).toBeNull();
    expect(allowedSites({ groups: [AUDIT_GROUP_ID] })).toBeNull();
  });

  it('limits site staff to their site groups', () => {
    const sites = allowedSites({ groups: [PACIFIC, 'some-role-group'] });
    expect(CLIENTS.filter(c => canSeeClient(sites, c)).map(c => c.clientID)).toEqual(['P1']);

    const both = allowedSites({ groups: [PACIFIC, EUBANKS] });
    expect(CLIENTS.filter(c => canSeeClient(both, c)).map(c => c.clientID)).toEqual(['P1', 'E1']);
  });

  it('matches site names regardless of case and spacing', () => {
    expect(canSeeClient(allowedSites({ groups: [PACIFIC] }), { clientSite: ' pacific ' })).toBe(true);
  });

  it('shows every site to users in no site group until strict mode is on', () => {
    expect(allowedSites({ groups: [] })).toBeNull();
    const none = allowedSites({ groups: [] }, { strict: true });
    expect(CLIENTS.some(c => canSeeClient(none, c))).toBe(false);
  });
});

// ── Routes, with a fake database ──────────────────────────────────────────
let queries;
const fakePool = {
  request() {
    const params = {};
    const req = {
      input(name, _type, value) { params[name] = value; return req; },
      async query(q) {
        queries.push(q);
        if (/SELECT \* FROM Clients\s+ORDER BY/.test(q)) return { recordset: CLIENTS };
        if (/SELECT \* FROM Clients WHERE clientID/.test(q) || /SELECT clientID FROM Clients/.test(q)) {
          return { recordset: CLIENTS.filter(c => c.clientID === params.clientID) };
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
  if (req.headers['x-test-user']) req.user = JSON.parse(req.headers['x-test-user']);
  next();
});
app.use('/api/clients', require('../routes/clients.js'));

const as = (groups) => ({ 'x-test-user': JSON.stringify({ email: 'staff@hope.org', groups }) });

beforeEach(() => {
  queries = [];
});

describe('/api/clients site access', () => {
  it('lists only the clients at the user sites', async () => {
    const res = await request(app).get('/api/clients').set(as([EUBANKS]));
    expect(res.status).toBe(200);
    expect(res.body.map(c => c.clientID)).toEqual(['E1']);
  });

  it('refuses to open a client at another site', async () => {
    const res = await request(app).get('/api/clients/P1').set(as([EUBANKS]));
    expect(res.status).toBe(403);
    expect((await request(app).get('/api/clients/E1').set(as([EUBANKS]))).status).toBe(200);
  });

  it('refuses to update a client at another site', async () => {
    const res = await request(app).put('/api/clients/P1').set(as([EUBANKS])).send({ clientProgram: 'DHS' });
    expect(res.status).toBe(403);
    expect(queries.some(q => /UPDATE Clients/.test(q))).toBe(false);
  });

  it('refuses to add a client at another site', async () => {
    const res = await request(app).post('/api/clients').set(as([EUBANKS]))
      .send({ clientFirstName: 'New', clientLastName: 'Person', clientSite: 'Pacific' });
    expect(res.status).toBe(403);
    expect(queries).toHaveLength(0);
  });
});

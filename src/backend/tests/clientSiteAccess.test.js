// Every route that names a client is limited to the user's sites
// (middleware/clientSiteAccess.js, config/siteAccess.js).
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const express = require('express');
const request = require('supertest');
const { createClientSiteAccess, candidateIDs } = require('../middleware/clientSiteAccess.js');
const { SITE_GROUPS } = require('../config/siteAccess.js');

const PACIFIC = SITE_GROUPS.Pacific;
const EUBANKS = SITE_GROUPS.Eubanks;

const CLIENTS = [
  { clientID: 'P1', clientSite: 'Pacific' },
  { clientID: 'E1', clientSite: 'Eubanks' },
];

let lookups;
let dbDown;
const fakePool = {
  request() {
    const params = {};
    const req = {
      input(name, _type, value) { params[name] = value; return req; },
      async query(q) {
        if (dbDown) throw new Error('connection lost');
        lookups.push(Object.values(params));
        expect(q).toMatch(/FROM dbo\.Clients WHERE clientID IN/);
        const ids = Object.values(params);
        return { recordset: CLIENTS.filter(c => ids.includes(c.clientID)) };
      },
    };
    return req;
  },
};

// Stand-in for middleware/auth.js: x-test-user header = signed in
const authenticate = (req, res, next) => {
  if (!req.headers['x-test-user']) return res.status(401).json({ code: 'NO_AUTH_HEADER' });
  req.user = JSON.parse(req.headers['x-test-user']);
  return next();
};

const app = express();
app.use(express.json());
app.use('/api', createClientSiteAccess({ getPool: async () => fakePool, authenticate }));
app.all('/api/*rest', (req, res) => res.json({ ok: true, user: req.user?.email || null }));

const as = (groups, extra = {}) => ({
  'x-test-user': JSON.stringify({ email: 'staff@hope.org', groups, ...extra }),
});

beforeEach(() => {
  lookups = [];
  dbDown = false;
});
afterEach(() => {
  delete process.env.CLIENT_SITE_CHECK;
});

describe('candidateIDs', () => {
  const ids = (path, { query = {}, body = {} } = {}) => candidateIDs({ path, query, body });

  it('collects path segments, clientID params and blob folders', () => {
    expect(ids('/medical/vitals/P1')).toEqual(['medical', 'vitals', 'P1']);
    expect(ids('/x', { query: { clientID: 'E1' }, body: { clientId: 'P1' } })).toEqual(['x', 'E1', 'P1']);
    expect(ids('/file/download-url', { query: { blobName: 'E1/section5/scan.pdf' } }))
      .toEqual(['file', 'download-url', 'E1']);
  });

  it('maps a previous stay to its client', () => {
    expect(ids('/getClientFace/P1~2')).toEqual(['getClientFace', 'P1']);
  });

  it('decodes encoded segments', () => {
    expect(ids('/notes/CL%2D1')).toEqual(['notes', 'CL-1']);
  });
});

describe('client site access', () => {
  it('lets site staff open clients at their own site', async () => {
    const res = await request(app).get('/api/getClientFace/E1').set(as([EUBANKS]));
    expect(res.status).toBe(200);
    expect(res.body.user).toBe('staff@hope.org');
  });

  it('refuses a client at another site, wherever the ID appears', async () => {
    const staff = as([EUBANKS]);
    expect((await request(app).get('/api/progress-notes/P1/summary').set(staff)).status).toBe(403);
    expect((await request(app).get('/api/files').query({ clientID: 'P1' }).set(staff)).status).toBe(403);
    expect((await request(app).post('/api/saveClientReferrals').send({ clientID: 'P1' }).set(staff)).status).toBe(403);
    expect((await request(app).get('/api/file/download-url').query({ blobName: 'P1/a.pdf' }).set(staff)).status).toBe(403);
    expect((await request(app).get('/api/export/client/P1~1/pdf').set(staff)).status).toBe(403);
  });

  it('requires sign-in for any request naming a client', async () => {
    const res = await request(app).get('/api/getClientFace/E1');
    expect(res.status).toBe(401);
  });

  it('passes requests that name no client without asking for sign-in', async () => {
    const res = await request(app).get('/api/nursing-archive/categories');
    expect(res.status).toBe(200);
    expect(lookups).toHaveLength(1);
  });

  it('skips paths opened directly by the browser', async () => {
    const res = await request(app).get('/api/file/stream/P1%2Fscan.pdf');
    expect(res.status).toBe(200);
    expect(lookups).toHaveLength(0);
  });

  it('gives admins and auditors every site', async () => {
    expect((await request(app).get('/api/getClientFace/P1').set(as([], { isAdmin: true }))).status).toBe(200);
  });

  it('fails closed when the database cannot be reached', async () => {
    dbDown = true;
    expect((await request(app).get('/api/getClientFace/E1').set(as([EUBANKS]))).status).toBe(503);
  });

  it('can be switched off in an emergency', async () => {
    process.env.CLIENT_SITE_CHECK = 'off';
    expect((await request(app).get('/api/getClientFace/P1').set(as([EUBANKS]))).status).toBe(200);
  });

  it('allows staff in both site groups to see both', async () => {
    const both = as([EUBANKS, PACIFIC]);
    expect((await request(app).get('/api/getClientFace/P1').set(both)).status).toBe(200);
    expect((await request(app).get('/api/getClientFace/E1').set(both)).status).toBe(200);
  });
});

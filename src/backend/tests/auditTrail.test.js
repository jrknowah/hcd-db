// Every API request leaves an audit row (middleware/auditTrail.cjs): who, what,
// which client, and the NAMES of submitted fields, never their values.
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const express = require('express');
const request = require('supertest');

// Capture audit writes instead of touching the database
const auditLogPath = require.resolve('../services/auditLog.cjs');
const realAuditLog = require(auditLogPath);
let written;
require.cache[auditLogPath].exports = {
  ...realAuditLog,
  writeAuditEntry: async (entry) => { written.push(entry); },
};
const auditTrail = require('../middleware/auditTrail.cjs');
const { identifyUser } = require('../middleware/auth.js');

const waitForWrites = () => new Promise((r) => setTimeout(r, 20));

// Stand-in for the real routes; the signed-in user comes from a test header
const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  if (req.headers['x-test-user']) req.user = { email: req.headers['x-test-user'], name: 'Test User' };
  next();
});
app.use('/api', identifyUser);
app.use(auditTrail);
app.post('/api/clients', (req, res) => res.status(201).json({ clientID: req.body.clientID }));
app.get('/api/clients/:clientID', (req, res) => res.json({ clientID: req.params.clientID }));
app.put('/api/client-face/:clientID', (_req, res) => res.status(500).json({ error: 'boom' }));
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('/api/open', (_req, res) => res.json({ ok: true }));

let savedEnv;
beforeAll(() => { savedEnv = process.env.NODE_ENV; process.env.NODE_ENV = 'production'; });
afterAll(() => { process.env.NODE_ENV = savedEnv; });
beforeEach(() => { written = []; });

describe('audit trail', () => {
  it('records creating a client: who, CREATE, client ID, field names only', async () => {
    await request(app).post('/api/clients').set('x-test-user', 'nurse@src.org')
      .send({ clientID: '123456789', clientFirstName: 'Jane', clientSSN: '111-22-3333' })
      .expect(201);
    await waitForWrites();

    expect(written).toHaveLength(1);
    const [row] = written;
    expect(row).toMatchObject({
      userId: 'nurse@src.org',
      action: 'CREATE',
      resourceType: '/api/clients',
      clientId: '123456789',
      success: true,
    });
    expect(row.details.submittedFields).toEqual(['clientFirstName', 'clientSSN']);
    // No submitted values anywhere in the row
    const serialized = JSON.stringify(row);
    expect(serialized).not.toContain('Jane');
    expect(serialized).not.toContain('111-22-3333');
  });

  it('records viewing a client', async () => {
    await request(app).get('/api/clients/123456789').set('x-test-user', 'cm@src.org').expect(200);
    await waitForWrites();
    expect(written[0]).toMatchObject({ userId: 'cm@src.org', action: 'VIEW', clientId: '123456789' });
  });

  it('records failed saves as unsuccessful', async () => {
    await request(app).put('/api/client-face/123456789').set('x-test-user', 'cm@src.org')
      .send({ clientDOB: '1980-01-01' }).expect(500);
    await waitForWrites();
    expect(written[0]).toMatchObject({ action: 'UPDATE', success: false, clientId: '123456789' });
  });

  it('does not log health checks', async () => {
    await request(app).get('/api/health').expect(200);
    await waitForWrites();
    expect(written).toHaveLength(0);
  });

  it('never blocks a request with a bad token; it is recorded as anonymous', async () => {
    await request(app).get('/api/open').set('Authorization', 'Bearer not-a-real-token').expect(200);
    await waitForWrites();
    expect(written[0]).toMatchObject({ userId: 'anonymous', action: 'VIEW' });
  });
});

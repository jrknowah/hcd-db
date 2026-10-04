// Admin > Audit Trail is open to IT Admin and Level 1; nobody else.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const express = require('express');
const request = require('supertest');
const { requireAuditAccess } = require('../middleware/signedFormUnlock');

const IT_GROUP = '47e60a70-aeab-4f3e-80bd-940cc951622f';
const LEVEL1_GROUP = 'f47eca14-0206-4719-91c7-fba7b2be382c';
const CASE_GROUP = '59b40286-56c6-4b1e-8de2-854c7d91179b';

function buildApp() {
  const app = express();
  app.use((req, _res, next) => {
    if (req.headers['x-test-user']) req.user = JSON.parse(req.headers['x-test-user']);
    next();
  });
  app.get('/api/admin/audit', requireAuditAccess, (_req, res) => res.json({ ok: true }));
  return app;
}

const get = (user) => {
  const r = request(buildApp()).get('/api/admin/audit');
  return user ? r.set('x-test-user', JSON.stringify(user)) : r;
};

describe('requireAuditAccess', () => {
  it('returns 401 without a user', async () => {
    expect((await get(null)).status).toBe(401);
  });

  it('returns 403 for a case manager', async () => {
    const res = await get({ email: 'cm@hope.org', isAdmin: false, groups: [CASE_GROUP] });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('AUDIT_ACCESS_REQUIRED');
  });

  it.each([
    ['IT Admin (group)', { email: 'it@hope.org', isAdmin: false, groups: [IT_GROUP] }],
    ['IT Admin (isAdmin)', { email: 'it@hope.org', isAdmin: true, groups: [] }],
    ['Level 1', { email: 'lead@hope.org', isAdmin: false, groups: [LEVEL1_GROUP] }],
  ])('lets %s in', async (_label, user) => {
    expect((await get(user)).status).toBe(200);
  });
});

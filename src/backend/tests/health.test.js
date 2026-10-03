// tests/health.test.js
const request = require('supertest');

// Import app - delay to allow server to initialize
let app;

beforeAll(() => {
  // Set test environment before loading app
  process.env.NODE_ENV = 'test';
  app = require('../server.cjs');
});

describe('API Health Checks', () => {
  test('GET /api/health should return 200 OK', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'OK');
    expect(response.body).toHaveProperty('timestamp');
  });

  test('GET /api/test should return test message', async () => {
    const response = await request(app)
      .get('/api/test')
      .expect(200);

    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain('Server is working');
  });

  test('GET /api/health should include routes information', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);

    expect(response.body).toHaveProperty('routes');
    expect(response.body.routes).toHaveProperty('clients');
  });
});

describe('Authentication Endpoints', () => {
  test('POST /api/auth/azure-login returns the server-verified user, not request data', async () => {
    const response = await request(app)
      .post('/api/auth/azure-login')
      .send({ user: { name: 'Spoofed Name', roles: ['IT_ADMIN'] }, token: 'anything' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.user.name).toBe('Development User');
    expect(response.body.user.roles).not.toContain('IT_ADMIN');
  });

  test('POST /api/auth/azure-login rejects requests without a token', async () => {
    await request(app)
      .post('/api/auth/azure-login')
      .set('Authorization', '')
      .send({})
      .expect(401);
  });

  test('GET /api/clients rejects requests without a token', async () => {
    const response = await request(app)
      .get('/api/clients')
      .set('Authorization', '')
      .expect(401);

    expect(response.body.code).toBe('NO_AUTH_HEADER');
  });

  test('POST /api/auth/logout works without a token', async () => {
    await request(app)
      .post('/api/auth/logout')
      .set('Authorization', '')
      .expect(200);
  });

  test('POST /api/auth/logout should succeed', async () => {
    const response = await request(app)
      .post('/api/auth/logout')
      .expect(200);

    expect(response.body.success).toBe(true);
  });
});

describe('API 404 Handling', () => {
  test('Unknown route should return 404', async () => {
    const response = await request(app)
      .get('/api/nonexistent-endpoint')
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });
});
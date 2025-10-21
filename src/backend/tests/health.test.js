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
  test('POST /api/auth/azure-login should validate user data', async () => {
    const loginData = {
      user: {
        name: 'Test User',
        email: 'test@example.com',
        roles: ['User']
      },
      token: 'mock-token-12345'
    };

    const response = await request(app)
      .post('/api/auth/azure-login')
      .send(loginData)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.user).toBeDefined();
    expect(response.body.user.name).toBe('Test User');
  });

  test('POST /api/auth/azure-login should reject missing data', async () => {
    const invalidData = {};

    const response = await request(app)
      .post('/api/auth/azure-login')
      .send(invalidData)
      .expect(400);

    expect(response.body.success).toBe(false);
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
// src/tests/mocks/server.js
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Create MSW server with our handlers
export const server = setupServer(...handlers);

// Enable API mocking before tests
export const setupMockServer = () => {
  // Start server before all tests
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'warn' });
    console.log('🎭 MSW Server started');
  });

  // Reset handlers after each test
  afterEach(() => {
    server.resetHandlers();
  });

  // Clean up after all tests
  afterAll(() => {
    server.close();
    console.log('🎭 MSW Server stopped');
  });
};
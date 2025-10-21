// ============================================================================
// STEP 1: Create vitest.config.backend.js in your PROJECT ROOT
// ============================================================================

// vitest.config.backend.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.{test,spec}.js'],
    setupFiles: ['./tests/setup.mjs'],  // Use .mjs for ES modules
    testTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/tests/',
        'src/frontend/',
        '*.config.js',
        'dist/'
      ]
    }
  }
});

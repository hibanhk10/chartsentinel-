import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: false,
    // setup.ts seeds the test process with the minimum env vars that
    // src/config/env.ts validates at import time.
    setupFiles: ['tests/setup.ts'],
  },
});

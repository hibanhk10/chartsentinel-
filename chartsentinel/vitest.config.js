import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Frontend test runner. jsdom for the DOM, jest-dom matchers via the
// setup file, globals enabled so test files don't need to import
// describe / it / expect on every line.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.{js,jsx,ts,tsx}'],
  },
});

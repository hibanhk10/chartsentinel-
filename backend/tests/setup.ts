// Test bootstrap. Runs before any test file is loaded so modules that
// validate env at import time (config/env.ts → JWT_SECRET, DATABASE_URL)
// have something to read. The values are deliberately fake — anything
// that hits the real DB or signs a real production token would be a
// test bug, not a leakage of these defaults.
process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test';
process.env.DIRECT_URL ??= process.env.DATABASE_URL;
process.env.JWT_SECRET ??= 'test-secret-which-is-at-least-32-characters!';
process.env.NODE_ENV ??= 'test';

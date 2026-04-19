// MUST be first — Sentry's auto-instrumentation patches modules at import time.
import './instrument';

import env from './config/env';
import app from './app';
import prisma from './config/db';

const PORT = env.PORT;

async function startServer() {
  try {
    await prisma.$connect();
    console.log('Connected to database');

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

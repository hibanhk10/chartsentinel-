import express from 'express';
import * as Sentry from '@sentry/node';
import cors from 'cors';
import env from './config/env';
import { errorHandler } from './middlewares/error.middleware';
import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';
import reportsRoutes from './routes/reports.routes';
import newsRoutes from './routes/news.routes';
import contactRoutes from './routes/contact.routes';
import paymentRoutes from './routes/payment.routes';
import newsletterRoutes from './routes/newsletter.routes';
import watchlistRoutes from './routes/watchlist.routes';
import adminRoutes from './routes/admin.routes';
import { registerSignalRoutes } from './routes/signals.routes';

const app = express();

// Security: Restrict CORS in production
const corsOptions = {
    origin: env.NODE_ENV === 'production' && env.FRONTEND_URL
        ? env.FRONTEND_URL
        : true, // Allow all if not specified or in dev
    credentials: true,
};

app.use(cors(corsOptions));

// Payment routes (Webhook needs raw body, so mount before global express.json)
app.use('/api/payments', paymentRoutes);

app.use(express.json());

app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/admin', adminRoutes);

// Signal engine — registers /api/signals/* endpoints directly on the app
// since the ported JS module uses absolute paths rather than a Router.
registerSignalRoutes(app);

// Sentry's Express error handler must come AFTER routes and BEFORE our
// custom handler, so it captures errors before they're serialised away.
// No-ops when SENTRY_DSN is unset (init in instrument.ts guards against it).
Sentry.setupExpressErrorHandler(app);

app.use(errorHandler);

export default app;

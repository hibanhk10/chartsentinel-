import express from 'express';
import cors from 'cors';
import { errorHandler } from './middlewares/error.middleware';
import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';
import reportsRoutes from './routes/reports.routes';
import newsRoutes from './routes/news.routes';

const app = express();

app.use(cors()); // Allow all origins for debugging

app.use(express.json());

app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/news', newsRoutes);

app.use(errorHandler);

export default app;

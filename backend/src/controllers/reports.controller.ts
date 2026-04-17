import { Request, Response } from 'express';
import { z } from 'zod';
import { ReportsService } from '../services/reports.service';

const reportsService = new ReportsService();

const idSchema = z.object({ id: z.string().min(1).max(50) });

const createReportSchema = z.object({
  title: z.string().trim().min(3).max(200),
  summary: z.string().trim().min(3).max(500),
  content: z.string().trim().min(10).max(20_000),
});

export const getAllReportsController = async (_req: Request, res: Response): Promise<void> => {
  try {
    const reports = await reportsService.getAllReports();
    res.json(reports);
  } catch (error) {
    console.error('[reports] getAll', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getReportByIdController = async (req: Request, res: Response): Promise<void> => {
  const parsed = idSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid report id' });
    return;
  }
  try {
    const report = await reportsService.getReportById(parsed.data.id);
    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }
    res.json(report);
  } catch (error) {
    console.error('[reports] getById', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createReportController = async (req: Request, res: Response): Promise<void> => {
  const parsed = createReportSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid report payload',
      issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
    return;
  }
  try {
    const report = await reportsService.createReport(parsed.data);
    res.status(201).json(report);
  } catch (error) {
    console.error('[reports] create', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

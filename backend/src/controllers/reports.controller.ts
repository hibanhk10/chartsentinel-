import { Request, Response } from 'express';
import { z } from 'zod';
import { ReportsService } from '../services/reports.service';

const reportsService = new ReportsService();

const idSchema = z.object({ id: z.string().min(1).max(50) });

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

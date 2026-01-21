import { Request, Response } from 'express';
import { ReportsService } from '../services/reports.service';

const reportsService = new ReportsService();

export const getAllReportsController = async (req: Request, res: Response) => {
  try {
    const reports = await reportsService.getAllReports();
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getReportByIdController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const report = await reportsService.getReportById(id);
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

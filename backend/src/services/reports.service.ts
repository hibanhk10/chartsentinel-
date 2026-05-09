import prisma from '../config/db';
import { fetchLiveReports, findLiveReportById, type ReportArticle } from './reports-feed.service';

// Public surface returns live analysis-RSS aggregations; the DB-backed
// `Prisma Report` model is reserved for the admin-curated `createReport`
// path. Same split as news.service: live for visitors, curated for ops.
export class ReportsService {
  async getAllReports(): Promise<ReportArticle[]> {
    return fetchLiveReports();
  }

  async getReportById(id: string): Promise<ReportArticle | null> {
    return findLiveReportById(id);
  }

  async createReport(data: { title: string; summary: string; content: string }) {
    return prisma.report.create({ data });
  }
}

import prisma from '../config/db';

export class ReportsService {
  async getAllReports() {
    return prisma.report.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getReportById(id: string) {
    return prisma.report.findUnique({
      where: { id },
    });
  }

  async createReport(data: { title: string; summary: string; content: string }) {
    return prisma.report.create({ data });
  }
}

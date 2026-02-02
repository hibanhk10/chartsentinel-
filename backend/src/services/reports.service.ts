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
    const report = await prisma.report.findUnique({
      where: { id },
    });

    if (!report) {
      throw new Error('Report not found');
    }

    return report;
  }
}

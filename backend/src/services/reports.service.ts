export class ReportsService {
  async getAllReports() {
    return [
      {
        id: '1',
        title: 'Q4 2023 Financial Report',
        summary: 'Annual financial performance overview',
        content: 'Detailed financial analysis for Q4 2023...',
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        title: 'Market Analysis Report',
        summary: 'Current market trends and predictions',
        content: 'Comprehensive market analysis...',
        createdAt: new Date().toISOString(),
      },
    ];
  }

  async getReportById(id: string) {
    return {
      id,
      title: `Report ${id}`,
      summary: 'Summary for report ' + id,
      content: 'Detailed content for report ' + id,
      createdAt: new Date().toISOString(),
    };
  }
}

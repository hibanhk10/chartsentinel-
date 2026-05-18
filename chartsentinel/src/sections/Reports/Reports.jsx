import { useState, useEffect } from 'react';
import { reportsService } from '../../services/reportsService';

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const data = await reportsService.getAllReports();
        setReports(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  if (loading) {
    return (
      <section className="py-24 bg-background-dark relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center text-text-primary">Loading reports...</div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-24 bg-background-dark relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center text-red-500">Error: {error}</div>
        </div>
      </section>
    );
  }

  return (
    <section id="reports" className="py-16 md:py-24 bg-background-dark relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <h2 className="text-4xl sm:text-5xl font-display font-bold text-center mb-4 tracking-tight text-text-primary">
          Latest Analysis
        </h2>
        <p className="text-center text-text-secondary max-w-xl mx-auto mb-12 md:mb-16">
          Aggregated longform from Investing.com, MarketWatch, Reuters, Yahoo Finance, and CoinDesk — refreshed every 30 minutes.
        </p>

        {reports.length === 0 ? (
          <div className="text-center text-text-primary">
            <p className="text-xl">No analysis available right now.</p>
            <p className="text-secondary mt-2">Sources are quiet — check back shortly.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {reports.map((report) => (
              <article key={report.id} className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
                    {report.category || 'Analysis'}
                  </span>
                  <span className="text-xs text-secondary">
                    {report.publishedAt ? new Date(report.publishedAt).toLocaleDateString() : ''}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-text-primary mb-3 line-clamp-2">
                  {report.title}
                </h3>

                <p className="text-text-secondary mb-4 line-clamp-3 flex-grow">
                  {report.summary}
                </p>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-secondary">
                    {report.source || report.author}
                  </span>
                  {report.url && (
                    <a
                      href={report.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 font-medium text-sm transition-colors"
                    >
                      Read →
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Reports;

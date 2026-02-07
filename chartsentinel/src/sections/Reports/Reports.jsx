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
          <div className="text-center text-white">Loading reports...</div>
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
    <section id="reports" className="py-24 bg-background-dark relative">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-5xl font-display font-bold text-center mb-20 tracking-tight text-white">
          Sample Reports
        </h2>

        {reports.length === 0 ? (
          <div className="text-center text-white">
            <p className="text-xl">No reports available at the moment.</p>
            <p className="text-secondary mt-2">Check back later for the latest market analysis.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {reports.map((report) => (
              <div key={report.id} className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
                    {report.category || 'Analysis'}
                  </span>
                  <span className="text-xs text-secondary">
                    {new Date(report.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white mb-3 line-clamp-2">
                  {report.title}
                </h3>

                <p className="text-slate-300 mb-4 line-clamp-3">
                  {report.summary || report.description}
                </p>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-secondary">
                    {report.author || 'Chartsentinel Team'}
                  </span>
                  <button className="text-primary hover:text-primary/80 font-medium text-sm transition-colors">
                    Read More →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Reports;

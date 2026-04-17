import { useCallback, useEffect, useState } from 'react';
import { reportsService } from '../../services/reportsService';

const formatDate = (iso) => {
    if (!iso) return '';
    try {
        return new Date(iso).toLocaleDateString();
    } catch {
        return iso;
    }
};

const DashboardReports = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await reportsService.getAllReports();
            setReports(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('[Reports]', err);
            setError(err.message || 'Could not load reports.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    return (
        <div className="space-y-12 animate-in slide-in-from-bottom duration-500">
            <header>
                <h1 className="text-5xl font-bold text-white mb-4">Reports</h1>
                <p className="text-text-secondary text-lg">Access the complete archive of market intelligence reports.</p>
            </header>

            {loading && (
                <p className="text-text-muted text-sm">Loading reports…</p>
            )}

            {error && !loading && (
                <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-2xl">
                    <p className="text-red-400 text-sm mb-4">{error}</p>
                    <button
                        type="button"
                        onClick={load}
                        className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-dark transition-colors"
                    >
                        Retry
                    </button>
                </div>
            )}

            {!loading && !error && reports.length === 0 && (
                <p className="text-text-muted text-sm">No reports have been published yet. Check back soon.</p>
            )}

            <section className="space-y-12">
                {reports.map((report) => (
                    <div key={report.id} className="flex flex-col md:flex-row gap-8 items-start group">
                        <div className="w-full md:w-80 h-48 bg-black flex items-center justify-center rounded-xl shadow-lg border border-white/5 overflow-hidden relative">
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <span className="text-white font-display text-[10px] tracking-[0.4em] uppercase opacity-80 bg-black/40 px-3 py-1 backdrop-blur-sm rounded">
                                    Chartsentinel
                                </span>
                            </div>
                        </div>
                        <div className="flex-1 pt-2">
                            <h3 className="text-2xl font-bold mb-2 text-white group-hover:text-primary transition-colors">
                                {formatDate(report.createdAt) || report.title}
                            </h3>
                            {report.title && formatDate(report.createdAt) && (
                                <p className="text-sm font-bold text-text-primary mb-2">{report.title}</p>
                            )}
                            <p className="text-text-secondary leading-relaxed max-w-2xl mb-6 text-sm">
                                {report.summary}
                            </p>
                        </div>
                    </div>
                ))}
            </section>
        </div>
    );
};

export default DashboardReports;

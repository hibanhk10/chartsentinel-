import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { API_CONFIG } from '../../config/api';

const authHeaders = () => {
    const token = localStorage.getItem('authToken');
    return {
        ...API_CONFIG.headers,
        Authorization: token ? `Bearer ${token}` : '',
    };
};

const Section = ({ title, children }) => (
    <section className="bg-surface-dark border border-white/5 rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-sm text-white mb-4">{title}</h3>
        {children}
    </section>
);

const Field = ({ label, value, onChange, as = 'input', placeholder, rows }) => (
    <div className="mb-4">
        <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wide">
            {label}
        </label>
        {as === 'textarea' ? (
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                rows={rows || 4}
                placeholder={placeholder}
                className="w-full bg-background-dark/50 border border-white/10 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-3 text-white transition-all outline-none text-sm resize-y"
            />
        ) : (
            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-background-dark/50 border border-white/10 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-3 text-white transition-all outline-none text-sm"
            />
        )}
    </div>
);

const DashboardAdmin = () => {
    const { user } = useAuth();

    const [report, setReport] = useState({ title: '', summary: '', content: '' });
    const [reportStatus, setReportStatus] = useState({ state: 'idle', message: '' });

    const [news, setNews] = useState({ title: '', content: '' });
    const [newsStatus, setNewsStatus] = useState({ state: 'idle', message: '' });

    const post = async (path, body) => {
        const resp = await fetch(`${API_CONFIG.baseURL}${path}`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify(body),
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) {
            throw new Error(data.error || data.message || `HTTP ${resp.status}`);
        }
        return data;
    };

    const submitReport = async (e) => {
        e.preventDefault();
        setReportStatus({ state: 'loading', message: '' });
        try {
            await post('/reports', report);
            setReport({ title: '', summary: '', content: '' });
            setReportStatus({ state: 'success', message: 'Report created.' });
        } catch (err) {
            setReportStatus({ state: 'error', message: err.message });
        }
    };

    const submitNews = async (e) => {
        e.preventDefault();
        setNewsStatus({ state: 'loading', message: '' });
        try {
            await post('/news', news);
            setNews({ title: '', content: '' });
            setNewsStatus({ state: 'success', message: 'News item created.' });
        } catch (err) {
            setNewsStatus({ state: 'error', message: err.message });
        }
    };

    if (user?.role !== 'admin') {
        return (
            <div className="flex flex-col items-center justify-center h-full text-text-secondary">
                <span className="material-icons text-6xl mb-4 text-primary/40">lock</span>
                <h2 className="text-2xl font-bold">Admin access required</h2>
                <p>This area is restricted to accounts with the admin role.</p>
            </div>
        );
    }

    return (
        <div className="space-y-12 animate-in fade-in duration-500">
            <header>
                <h1 className="text-5xl font-bold text-white mb-4">Admin</h1>
                <p className="text-text-secondary text-lg">
                    Publish new reports and news items. They appear in their respective tabs immediately.
                </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Section title="New Report">
                    <form onSubmit={submitReport} noValidate>
                        <Field
                            label="Title"
                            value={report.title}
                            onChange={(v) => setReport({ ...report, title: v })}
                            placeholder="Weekly Forex Breakdown"
                        />
                        <Field
                            label="Summary"
                            value={report.summary}
                            onChange={(v) => setReport({ ...report, summary: v })}
                            placeholder="Deep dive into EUR/USD and GBP/JPY trends."
                        />
                        <Field
                            label="Content"
                            as="textarea"
                            rows={8}
                            value={report.content}
                            onChange={(v) => setReport({ ...report, content: v })}
                            placeholder="Detailed analysis of major forex pairs..."
                        />
                        <button
                            type="submit"
                            disabled={reportStatus.state === 'loading'}
                            className="w-full mt-2 bg-primary text-white font-bold py-3 rounded-xl hover:bg-primary-dark transition-all disabled:opacity-50"
                        >
                            {reportStatus.state === 'loading' ? 'Saving…' : 'Publish report'}
                        </button>
                        {reportStatus.message && (
                            <p
                                className={`mt-3 text-xs ${
                                    reportStatus.state === 'success' ? 'text-green-400' : 'text-red-400'
                                }`}
                            >
                                {reportStatus.message}
                            </p>
                        )}
                    </form>
                </Section>

                <Section title="New News Item">
                    <form onSubmit={submitNews} noValidate>
                        <Field
                            label="Title"
                            value={news.title}
                            onChange={(v) => setNews({ ...news, title: v })}
                            placeholder="Federal Reserve holds rates steady"
                        />
                        <Field
                            label="Content"
                            as="textarea"
                            rows={10}
                            value={news.content}
                            onChange={(v) => setNews({ ...news, content: v })}
                            placeholder="The FOMC kept the federal funds rate in the 5.25–5.50% range..."
                        />
                        <button
                            type="submit"
                            disabled={newsStatus.state === 'loading'}
                            className="w-full mt-2 bg-primary text-white font-bold py-3 rounded-xl hover:bg-primary-dark transition-all disabled:opacity-50"
                        >
                            {newsStatus.state === 'loading' ? 'Saving…' : 'Publish news'}
                        </button>
                        {newsStatus.message && (
                            <p
                                className={`mt-3 text-xs ${
                                    newsStatus.state === 'success' ? 'text-green-400' : 'text-red-400'
                                }`}
                            >
                                {newsStatus.message}
                            </p>
                        )}
                    </form>
                </Section>
            </div>
        </div>
    );
};

export default DashboardAdmin;

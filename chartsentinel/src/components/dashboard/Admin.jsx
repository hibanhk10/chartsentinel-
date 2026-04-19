import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { API_CONFIG } from '../../config/api';
import RichTextEditor from './RichTextEditor';

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

            <AdminOverview />

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
                        <div className="mb-4">
                            <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wide">
                                Content
                            </label>
                            <RichTextEditor
                                value={report.content}
                                onChange={(v) => setReport({ ...report, content: v })}
                                placeholder="Detailed analysis of major forex pairs..."
                                minHeight={260}
                            />
                        </div>
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
                        <div className="mb-4">
                            <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wide">
                                Content
                            </label>
                            <RichTextEditor
                                value={news.content}
                                onChange={(v) => setNews({ ...news, content: v })}
                                placeholder="The FOMC kept the federal funds rate in the 5.25–5.50% range..."
                                minHeight={320}
                            />
                        </div>
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

// ── Overview + CSV exports ─────────────────────────────────────────────────
//
// Lives in the same file as the publisher UI so the admin tab is one file to
// reason about. If this grows past ~400 lines, split into a subfolder.

function AdminOverview() {
    const [state, setState] = useState({ status: 'loading', data: null, error: null });

    useEffect(() => {
        let active = true;
        const token = localStorage.getItem('authToken');
        fetch(`${API_CONFIG.baseURL}/admin/overview`, {
            headers: { ...API_CONFIG.headers, Authorization: `Bearer ${token}` },
        })
            .then(async (r) => {
                const body = await r.json().catch(() => ({}));
                if (!r.ok) throw new Error(body.error || body.message || `HTTP ${r.status}`);
                return body;
            })
            .then((data) => active && setState({ status: 'ready', data, error: null }))
            .catch((err) => active && setState({ status: 'error', data: null, error: err.message }));
        return () => {
            active = false;
        };
    }, []);

    // CSV downloads go through fetch + blob so we can add the auth header —
    // plain <a href=…> can't set one.
    async function downloadCsv(path, filename) {
        const token = localStorage.getItem('authToken');
        const res = await fetch(`${API_CONFIG.baseURL}${path}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
            alert(`Download failed: HTTP ${res.status}`);
            return;
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    if (state.status === 'loading') {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-28 bg-white/[0.03] rounded-xl animate-pulse" />
                ))}
            </div>
        );
    }

    if (state.status === 'error') {
        return (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-sm text-red-300">
                Could not load overview: {state.error}
            </div>
        );
    }

    const c = state.data.counters;
    const r = state.data.recent;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatTile label="Total users" value={c.totalUsers} sub={`${c.paidUsers} paid`} />
                <StatTile
                    label="Paid conversion"
                    value={c.paidConversion == null ? '—' : `${(c.paidConversion * 100).toFixed(1)}%`}
                />
                <StatTile label="Newsletter subs" value={c.totalSubscribers} sub={`+${r.subscribers24h} today`} />
                <StatTile label="Watchlist items" value={c.totalWatchlistItems} />
                <StatTile label="Signups · 24h" value={r.signups24h} sub={`${r.signups7d} this week`} />
                <StatTile label="Signups · 30d" value={r.signups30d} />
                <StatTile label="Contact messages" value={c.totalContactMessages} sub={`+${r.contact24h} today`} />
                <StatTile label="Reports · News" value={`${c.totalReports} · ${c.totalNews}`} />
            </div>

            <div className="bg-surface-dark border border-white/5 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
                    <h3 className="font-bold text-sm text-white">CSV exports</h3>
                    <div className="text-xs text-text-muted">All data, newest first.</div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <ExportButton
                        label="Users"
                        onClick={() => downloadCsv('/admin/export/users.csv', 'users.csv')}
                    />
                    <ExportButton
                        label="Subscribers"
                        onClick={() => downloadCsv('/admin/export/subscribers.csv', 'subscribers.csv')}
                    />
                    <ExportButton
                        label="Contact messages"
                        onClick={() => downloadCsv('/admin/export/messages.csv', 'messages.csv')}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <RecentList
                    title="Recent signups"
                    items={state.data.lists.users.map((u) => ({
                        primary: u.email,
                        secondary: u.isPaid ? 'Paid' : 'Free',
                        date: u.createdAt,
                    }))}
                />
                <RecentList
                    title="Recent subscribers"
                    items={state.data.lists.subscribers.map((s) => ({
                        primary: s.email,
                        date: s.createdAt,
                    }))}
                />
                <RecentList
                    title="Recent messages"
                    items={state.data.lists.messages.map((m) => ({
                        primary: m.fullName,
                        secondary: m.email,
                        date: m.createdAt,
                    }))}
                />
            </div>
        </div>
    );
}

function StatTile({ label, value, sub }) {
    return (
        <div className="bg-surface-dark border border-white/5 rounded-xl p-4">
            <div className="text-[10px] uppercase tracking-wider text-text-muted">{label}</div>
            <div className="mt-1 text-2xl font-semibold text-white">{value}</div>
            {sub && <div className="mt-1 text-xs text-text-secondary">{sub}</div>}
        </div>
    );
}

function ExportButton({ label, onClick }) {
    return (
        <button
            onClick={onClick}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors"
        >
            <span className="material-icons text-base">download</span>
            {label}
        </button>
    );
}

function RecentList({ title, items }) {
    return (
        <div className="bg-surface-dark border border-white/5 rounded-xl p-5">
            <h4 className="text-xs uppercase tracking-wider text-text-muted mb-3">{title}</h4>
            {items.length === 0 ? (
                <p className="text-sm text-text-secondary">Nothing yet.</p>
            ) : (
                <ul className="space-y-2">
                    {items.map((it, i) => (
                        <li key={i} className="flex items-start justify-between gap-3 text-sm">
                            <div className="min-w-0 flex-1">
                                <div className="text-white truncate">{it.primary}</div>
                                {it.secondary && (
                                    <div className="text-xs text-text-muted truncate">{it.secondary}</div>
                                )}
                            </div>
                            <div className="text-xs text-text-muted whitespace-nowrap">
                                {new Date(it.date).toLocaleDateString()}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

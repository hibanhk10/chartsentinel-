import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_CONFIG } from '../config/api';
import { fmtRelativeTime, fmtAbsoluteDate } from '../lib/format';
import SEO from '../components/ui/SEO';

// Public status page. Three signals:
//   1. API up   — implicit from the fetch succeeding
//   2. DB up    — implicit because /status reads job_runs
//   3. Cron     — last successful run + age for each scheduled job
//
// Stale thresholds match what the admin tab uses: digest stale after
// ~8 days, watchlist-check stale after ~2 hours.

const STALE_HOURS = {
    'weekly-digest': 24 * 8,
    'watchlist-check': 2,
};

function jobHealth(job) {
    if (!job) return { tone: 'unknown', label: 'No data' };
    if (job.lastStatus === 'failure') return { tone: 'bad', label: 'Failing' };
    const ageHours = (Date.now() - new Date(job.lastRunAt).getTime()) / 3_600_000;
    const stale = STALE_HOURS[job.name] ?? 24;
    if (ageHours > stale) return { tone: 'warn', label: 'Stale' };
    return { tone: 'good', label: 'Healthy' };
}

const StatusPage = () => {
    const [state, setState] = useState({ status: 'loading', data: null, error: null });

    useEffect(() => {
        let active = true;
        fetch(`${API_CONFIG.baseURL}/status`, { headers: API_CONFIG.headers })
            .then(async (r) => {
                const body = await r.json().catch(() => ({}));
                if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`);
                return body;
            })
            .then((data) => active && setState({ status: 'ready', data, error: null }))
            .catch((err) => active && setState({ status: 'error', data: null, error: err.message }));
        return () => {
            active = false;
        };
    }, []);

    const allHealthy =
        state.status === 'ready' &&
        state.data?.jobs?.every((j) => jobHealth(j).tone === 'good');

    return (
        <div className="relative z-10 min-h-screen bg-background-dark text-text-primary pt-32 pb-20 px-6">
            <SEO
                title="Status — ChartSentinel"
                description="Live status of the ChartSentinel API and scheduled jobs."
                path="/status"
            />

            <div className="max-w-2xl mx-auto">
                <Link to="/" className="text-xs text-text-muted hover:text-white inline-flex items-center gap-1 mb-8">
                    <span className="material-icons text-sm">arrow_back</span>
                    ChartSentinel
                </Link>

                <header className="mb-10">
                    <div className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-2">
                        System status
                    </div>
                    {state.status === 'loading' && (
                        <h1 className="text-3xl font-bold text-white">Checking…</h1>
                    )}
                    {state.status === 'error' && (
                        <h1 className="text-3xl font-bold text-red-300">API unreachable</h1>
                    )}
                    {state.status === 'ready' && (
                        <h1 className={`text-3xl font-bold ${allHealthy ? 'text-emerald-300' : 'text-amber-300'}`}>
                            {allHealthy ? 'All systems normal' : 'Some signals are degraded'}
                        </h1>
                    )}
                </header>

                {state.status === 'error' && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-sm text-red-300 mb-6">
                        We couldn't reach the API: {state.error}.
                    </div>
                )}

                {state.status === 'ready' && (
                    <>
                        <section className="space-y-3">
                            <h2 className="text-xs uppercase tracking-widest text-text-muted font-bold mb-2">
                                Scheduled jobs
                            </h2>
                            {state.data.jobs.length === 0 && (
                                <p className="text-sm text-text-muted py-3">
                                    No scheduled-job runs recorded yet.
                                </p>
                            )}
                            {state.data.jobs.map((job) => {
                                const health = jobHealth(job);
                                const toneClass = {
                                    good: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
                                    warn: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
                                    bad: 'bg-red-500/15 text-red-300 border-red-500/30',
                                    unknown: 'bg-white/5 text-text-muted border-white/10',
                                }[health.tone];
                                return (
                                    <div
                                        key={job.name}
                                        className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-xl p-4"
                                    >
                                        <div>
                                            <div className="font-medium text-white capitalize">
                                                {job.name.replace(/-/g, ' ')}
                                            </div>
                                            <div
                                                className="text-xs text-text-muted mt-1"
                                                title={fmtAbsoluteDate(job.lastRunAt)}
                                            >
                                                Last ran {fmtRelativeTime(job.lastRunAt)} · {job.durationMs}ms
                                            </div>
                                        </div>
                                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full border ${toneClass}`}>
                                            {health.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </section>

                        <p className="mt-10 text-[10px] text-text-muted">
                            Generated {fmtRelativeTime(state.data.generatedAt)}.
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};

export default StatusPage;

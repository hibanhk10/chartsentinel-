import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { API_CONFIG } from '../../config/api';

const DashboardHome = ({ setActiveTab }) => {
    const { user } = useAuth();
    const [subEmail, setSubEmail] = useState('');
    const [subStatus, setSubStatus] = useState('idle'); // idle | loading | success | error
    const [subMessage, setSubMessage] = useState('');

    const handleSubscribe = async (e) => {
        e.preventDefault();
        if (!subEmail) return;
        setSubStatus('loading');
        setSubMessage('');
        try {
            const resp = await fetch(`${API_CONFIG.baseURL}/newsletter`, {
                method: 'POST',
                headers: API_CONFIG.headers,
                body: JSON.stringify({ email: subEmail }),
            });
            const body = await resp.json().catch(() => ({}));
            if (!resp.ok) {
                throw new Error(body.error || body.message || `HTTP ${resp.status}`);
            }
            setSubStatus('success');
            setSubMessage('Subscribed — thanks!');
            setSubEmail('');
        } catch (err) {
            setSubStatus('error');
            setSubMessage(err.message || 'Could not subscribe.');
        }
    };

    return (
        <div className="space-y-12 animate-in fade-in duration-500">
            <section>
                <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight mb-4">
                    Hey, {user?.name || user?.email?.split('@')[0] || 'Trader'}.<br />
                    <span className="text-primary">Let's know what's happening now.</span>
                </h1>
                <p className="text-text-secondary max-w-xl text-lg leading-relaxed mb-6">
                    You can look at the current market reports in the reports tab and look at the news to make informed trades.
                </p>
                <div className="flex gap-4">
                    <button
                        type="button"
                        onClick={() => setActiveTab?.('reports')}
                        className="bg-primary text-white px-6 py-2.5 text-sm font-bold rounded-lg hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
                    >
                        View Reports
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab?.('news')}
                        className="bg-white/5 text-white border border-white/10 px-6 py-2.5 text-sm font-bold rounded-lg hover:bg-white/10 transition-all"
                    >
                        Market News
                    </button>
                </div>
            </section>

            <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-6">Quick Access</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        {
                            id: 'terminal',
                            label: 'Live Terminal',
                            blurb: 'BTC/ETH/SOL with live orderbook + trades',
                            icon: 'monitor_heart',
                            tone: 'from-primary/30 to-fuchsia-500/10',
                        },
                        {
                            id: 'mood',
                            label: 'Market Mood',
                            blurb: 'Fear & Greed plus a live majors radar',
                            icon: 'mood',
                            tone: 'from-amber-500/30 to-amber-500/5',
                        },
                        {
                            id: 'signals',
                            label: 'Signals',
                            blurb: 'Composite scores across FX, crypto, equities',
                            icon: 'insights',
                            tone: 'from-emerald-500/30 to-emerald-500/5',
                        },
                        {
                            id: 'watchlist',
                            label: 'Watchlist',
                            blurb: 'Threshold alerts on tickers you track',
                            icon: 'notifications_active',
                            tone: 'from-cyan-500/30 to-cyan-500/5',
                        },
                    ].map((tile) => (
                        <button
                            key={tile.id}
                            type="button"
                            onClick={() => setActiveTab?.(tile.id)}
                            className={`relative text-left rounded-2xl border border-white/5 bg-gradient-to-br ${tile.tone} via-surface-dark p-5 hover:border-white/15 hover:-translate-y-0.5 transition-all overflow-hidden group`}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <span className="material-icons text-primary text-2xl group-hover:scale-110 transition-transform">
                                    {tile.icon}
                                </span>
                                <span className="material-icons text-text-muted text-base group-hover:text-white transition-colors">
                                    arrow_forward
                                </span>
                            </div>
                            <h4 className="text-sm font-bold text-white mb-1">{tile.label}</h4>
                            <p className="text-[11px] text-text-muted leading-relaxed">{tile.blurb}</p>
                        </button>
                    ))}
                </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-surface-dark border border-white/5 rounded-2xl p-6 shadow-sm">
                    <h3 className="font-bold text-sm text-white mb-1">Easy Access</h3>
                    <p className="text-xs text-text-muted mb-6">View recent market reports</p>
                    <div className="space-y-4 mb-8">
                        {[
                            { date: '12/10/2025', title: 'Weekly Recap' },
                            { date: '01/10/2026', title: 'Monthly Outlook' }
                        ].map((report, idx) => (
                            <div key={idx} className="flex items-center gap-4 group cursor-pointer hover:translate-x-1 transition-transform">
                                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-[8px] font-bold text-primary uppercase text-center leading-none border border-primary/20">
                                    Charts<br />Sentinel
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-white group-hover:text-primary transition-colors">{report.date}</h4>
                                    <p className="text-[10px] text-text-muted">{report.title}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={() => setActiveTab?.('reports')}
                        className="w-full py-2 bg-white/5 border border-white/5 text-white text-[10px] font-bold rounded-lg hover:bg-white/10 transition-colors uppercase tracking-widest"
                    >
                        All Reports
                    </button>
                </div>

                <div className="bg-surface-dark border border-white/5 rounded-2xl p-6 shadow-sm flex flex-col justify-center">
                    <h3 className="font-bold text-sm text-white mb-1">Stay up to date</h3>
                    <p className="text-xs text-text-muted mb-6">Get notified when new products and articles are published.</p>
                    <form onSubmit={handleSubscribe} className="flex gap-2">
                        <input
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-xs text-white focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-text-muted"
                            placeholder="Your email"
                            type="email"
                            required
                            value={subEmail}
                            onChange={(e) => setSubEmail(e.target.value)}
                            disabled={subStatus === 'loading'}
                        />
                        <button
                            type="submit"
                            disabled={subStatus === 'loading'}
                            className="bg-primary text-white px-4 py-2 text-xs font-bold rounded-lg hover:bg-primary-dark transition-all whitespace-nowrap disabled:opacity-50"
                        >
                            {subStatus === 'loading' ? '…' : 'Subscribe'}
                        </button>
                    </form>
                    {subMessage && (
                        <p
                            className={`mt-3 text-[11px] ${
                                subStatus === 'success' ? 'text-green-400' : 'text-red-400'
                            }`}
                        >
                            {subMessage}
                        </p>
                    )}
                </div>
            </section>
        </div>
    );
};

export default DashboardHome;

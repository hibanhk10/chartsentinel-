import { useAuth } from '../../contexts/AuthContext';

const DashboardHome = ({ setActiveTab }) => {
    const { user } = useAuth();

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
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-6">What's new</h3>
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-video group cursor-pointer shadow-2xl border border-white/5">
                    <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-60 z-10" />
                    <img
                        alt="Dashboard Highlight"
                        className="w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-700"
                        src="https://images.unsplash.com/photo-1611974714658-058f1c1009fe?q=80&w=2070&auto=format&fit=crop"
                    />
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                        <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform">
                            <span className="material-icons text-white text-3xl">play_arrow</span>
                        </div>
                    </div>
                    <div className="absolute bottom-10 left-10 text-white max-w-md z-20">
                        <h4 className="text-4xl font-bold leading-none mb-2 tracking-tighter">The Internet<br />Canvas</h4>
                        <p className="text-xs text-text-secondary font-medium tracking-wide">New market analysis tool released</p>
                    </div>
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
                    <div className="flex gap-2">
                        <input
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-xs text-white focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-text-muted"
                            placeholder="Your email"
                            type="email"
                        />
                        <button className="bg-primary text-white px-4 py-2 text-xs font-bold rounded-lg hover:bg-primary-dark transition-all whitespace-nowrap">
                            Subscribe
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default DashboardHome;

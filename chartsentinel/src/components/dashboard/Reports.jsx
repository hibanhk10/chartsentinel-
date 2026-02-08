const DashboardReports = () => {
    const reports = [
        {
            date: '12/10/2025',
            title: 'Global Market Liquidity Analysis',
            desc: 'This report covers all things about the current market liquidity. It provides the best information for placing high-conviction trades.',
            image: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?q=80&w=2070&auto=format&fit=crop'
        },
        {
            date: '01/10/2026',
            title: 'Yield Curve Inversion Warning',
            desc: 'Detailed analysis of the current yield curve state and its implications for short-term derivative trading.',
            image: 'https://images.unsplash.com/photo-1551288049-bbbda536339a?q=80&w=2070&auto=format&fit=crop'
        }
    ];

    return (
        <div className="space-y-12 animate-in slide-in-from-bottom duration-500">
            <header>
                <h1 className="text-5xl font-bold text-white mb-4">Reports</h1>
                <p className="text-text-secondary text-lg">Access the complete archive of market intelligence reports.</p>
            </header>

            <section className="space-y-12">
                {reports.map((report, idx) => (
                    <div key={idx} className="flex flex-col md:flex-row gap-8 items-start group">
                        <div className="w-full md:w-80 h-48 bg-black flex items-center justify-center rounded-xl shadow-lg border border-white/5 overflow-hidden">
                            <img src={report.image} alt={report.title} className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500" />
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <span className="text-white font-display text-[10px] tracking-[0.4em] uppercase opacity-80 bg-black/40 px-3 py-1 backdrop-blur-sm rounded">Chartsentinel</span>
                            </div>
                        </div>
                        <div className="flex-1 pt-2">
                            <h3 className="text-2xl font-bold mb-2 text-white group-hover:text-primary transition-colors">{report.date}</h3>
                            <p className="text-text-secondary leading-relaxed max-w-2xl mb-6 text-sm">
                                {report.desc}
                            </p>
                            <button className="px-5 py-2 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-text-muted hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-all rounded-lg">
                                Download PDF
                            </button>
                        </div>
                    </div>
                ))}
            </section>
        </div>
    );
};

export default DashboardReports;

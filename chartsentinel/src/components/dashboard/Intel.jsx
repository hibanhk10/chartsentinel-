import ThreatMatrix from '../ui/ThreatMatrix';

const DashboardIntel = () => {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 mb-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[10px] uppercase font-bold tracking-widest text-red-400">
                        Live Intelligence Layer
                    </span>
                </div>
                <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight mb-3">
                    Geopolitical Intelligence.
                </h1>
                <p className="text-text-secondary max-w-2xl text-base leading-relaxed">
                    Regional risk surface across conflict intensity, capital controls, energy supply,
                    and trade policy. Updated continuously so you stop importing surprises into your book.
                </p>
            </header>

            <section className="h-[640px]">
                <ThreatMatrix />
            </section>

            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    {
                        label: 'How to read it',
                        body: 'Overall risk is a composite 0–100 score. Sub-factors track distinct vectors (military, economic, cyber, displacement) so you can isolate what is actually moving.',
                    },
                    {
                        label: 'Trend tag',
                        body: '▲ Escalating, ● Stable, ▼ De-escalating. Tags reflect 24h delta on the composite — useful for sizing decisions, not entries.',
                    },
                    {
                        label: 'Coverage',
                        body: 'Eastern Europe, Middle East, Asia-Pacific, and West Africa / Sahel today. Latin America and the Arctic theatres ship in the next data update.',
                    },
                ].map((item) => (
                    <div
                        key={item.label}
                        className="bg-surface-dark border border-white/5 rounded-2xl p-5"
                    >
                        <h4 className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-2">
                            {item.label}
                        </h4>
                        <p className="text-xs text-text-secondary leading-relaxed">{item.body}</p>
                    </div>
                ))}
            </section>
        </div>
    );
};

export default DashboardIntel;

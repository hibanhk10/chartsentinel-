// "Powered by" data-source strip. Sits below the hero as a fast
// credibility signal — instead of fake "as featured in WSJ" logos that
// imply press coverage we don't have, this shows the actual public
// data sources the platform reads from. Credibility from infrastructure
// rather than borrowed authority.

const SOURCES = [
    { name: 'SEC EDGAR', tag: 'Form 4 filings', icon: 'gavel' },
    { name: 'CFTC', tag: 'Commitment of Traders', icon: 'verified' },
    { name: 'Yahoo Finance', tag: 'Price history', icon: 'show_chart' },
    { name: 'Binance', tag: 'Live crypto', icon: 'currency_bitcoin' },
    { name: 'House + Senate', tag: 'PTR disclosures', icon: 'account_balance' },
    { name: 'BBC · CNBC · Reuters', tag: 'Market wires', icon: 'newspaper' },
]

export default function DataSources() {
    return (
        <section className="py-10 md:py-14 bg-background-dark relative border-y border-white/5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <p className="text-center text-[10px] uppercase tracking-[0.3em] text-text-muted font-bold mb-8">
                    Live data from
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-8">
                    {SOURCES.map((s) => (
                        <div key={s.name} className="flex flex-col items-center text-center group">
                            <span className="material-icons text-text-muted text-2xl mb-2 group-hover:text-primary transition-colors">
                                {s.icon}
                            </span>
                            <span className="text-sm font-bold text-white whitespace-nowrap">
                                {s.name}
                            </span>
                            <span className="text-[10px] uppercase tracking-widest text-text-muted mt-1">
                                {s.tag}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

const DashboardNews = () => {
    const newsItems = [
        {
            title: 'Federal Reserve Maintains Interest Rates',
            category: 'Macro',
            image: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?q=80&w=2070&auto=format&fit=crop',
        },
        {
            title: 'Tech Indices Hit New All-Time Highs',
            category: 'Market Data',
            image: 'https://images.unsplash.com/photo-1611974714658-058f1c1009fe?q=80&w=2070&auto=format&fit=crop',
        },
        {
            title: 'Crude Oil Inventories Surprise Analysts',
            category: 'Commodities',
            image: 'https://images.unsplash.com/photo-1543286386-2e659306cd6c?q=80&w=2070&auto=format&fit=crop',
        },
        {
            title: 'Emerging Markets: The Next Opportunity?',
            category: 'Strategy',
            image: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?q=80&w=2070&auto=format&fit=crop',
        }
    ];

    return (
        <div className="space-y-12 animate-in fade-in duration-700">
            <header>
                <h1 className="text-5xl font-bold tracking-tight mb-4 text-white">News</h1>
                <p className="text-text-secondary text-lg">Real-time market updates from global intelligence feeds.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
                {newsItems.map((item, idx) => (
                    <article key={idx} className="group cursor-pointer">
                        <div className="aspect-video overflow-hidden rounded-2xl mb-4 border border-white/5 shadow-xl">
                            <img
                                alt={item.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80 group-hover:opacity-100"
                                src={item.image}
                            />
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{item.category}</span>
                        </div>
                        <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors leading-tight">{item.title}</h3>
                    </article>
                ))}
            </div>
        </div>
    );
};

export default DashboardNews;

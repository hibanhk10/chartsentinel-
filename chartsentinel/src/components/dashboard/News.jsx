import { useCallback, useEffect, useState } from 'react';
import { newsService } from '../../services/newsService';
import { previewText } from '../../lib/sanitize';

const DashboardNews = () => {
    const [newsItems, setNewsItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await newsService.getAllNews();
            setNewsItems(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('[News]', err);
            setError(err.message || 'Could not load news.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    return (
        <div className="space-y-12 animate-in fade-in duration-700">
            <header>
                <h1 className="text-5xl font-bold tracking-tight mb-4 text-white">News</h1>
                <p className="text-text-secondary text-lg">Real-time market updates from global intelligence feeds.</p>
            </header>

            {loading && (
                <p className="text-text-muted text-sm">Loading news…</p>
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

            {!loading && !error && newsItems.length === 0 && (
                <p className="text-text-muted text-sm">No news items yet.</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
                {newsItems.map((item) => (
                    <article key={item.id} className="group cursor-pointer">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
                                {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : 'Market'}
                            </span>
                        </div>
                        <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors leading-tight mb-2">
                            {item.title}
                        </h3>
                        {/*
                          Content now stores TipTap-generated HTML. For the list view a
                          plain-text preview keeps the grid tidy; individual article detail
                          pages will render the sanitised HTML via renderRichText().
                        */}
                        <p className="text-sm text-text-secondary leading-relaxed line-clamp-3">{previewText(item.content)}</p>
                    </article>
                ))}
            </div>
        </div>
    );
};

export default DashboardNews;

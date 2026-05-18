import { useState, useEffect } from 'react';
import { newsService } from '../../services/newsService';

// Sentiment chip colour scheme — kept inline so the News section
// stays self-contained without dragging in a shared formatter module.
function sentimentChipClasses(label) {
  if (label === 'bullish') return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';
  if (label === 'bearish') return 'bg-red-500/15 text-red-300 border border-red-500/30';
  if (label === 'neutral') return 'bg-white/5 text-slate-300 border border-white/10';
  return null;
}

const News = () => {
  const [news, setNews] = useState([]);
  const [aggregate, setAggregate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        // Best-effort: try the sentiment-scored feed first; if the
        // LLM provider is down we drop back to the unscored variant
        // so the section still renders.
        try {
          const scored = await newsService.getNewsWithSentiment();
          setNews(scored.articles || []);
          setAggregate(scored.aggregate ?? null);
        } catch {
          const data = await newsService.getAllNews();
          setNews(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  if (loading) {
    return (
      <section className="py-24 bg-background-dark relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center text-white">Loading news...</div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-24 bg-background-dark relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center text-red-500">Error: {error}</div>
        </div>
      </section>
    );
  }

  return (
    <section id="news" className="py-16 md:py-24 bg-background-dark relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <h2 className="text-4xl sm:text-5xl font-display font-bold text-center mb-4 tracking-tight text-white">
          Latest News & Updates
        </h2>

        {/* Aggregate market-mood chip — only renders when the
            sentiment feed succeeded and produced scores. */}
        {aggregate && aggregate.scored > 0 && (
          <div className="flex items-center justify-center mb-12 md:mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
              <span className="text-[10px] uppercase tracking-widest text-text-muted font-bold">
                Market mood
              </span>
              <span
                className={`text-sm font-bold ${
                  aggregate.mean === null
                    ? 'text-text-muted'
                    : aggregate.mean >= 0.15
                      ? 'text-emerald-300'
                      : aggregate.mean <= -0.15
                        ? 'text-red-300'
                        : 'text-amber-300'
                }`}
              >
                {aggregate.mean === null
                  ? 'mixed'
                  : aggregate.mean >= 0.15
                    ? 'bullish'
                    : aggregate.mean <= -0.15
                      ? 'bearish'
                      : 'neutral'}
              </span>
              <span className="text-xs text-text-muted">
                {aggregate.bullish} ▲ · {aggregate.bearish} ▼ across {aggregate.scored}
              </span>
            </div>
          </div>
        )}
        {!aggregate && <div className="mb-12 md:mb-16" />}

        {news.length === 0 ? (
          <div className="text-center text-white">
            <p className="text-xl">No news available at the moment.</p>
            <p className="text-secondary mt-2">Check back later for the latest updates.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {news.map((article) => (
              <article key={article.id} className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
                <div className="flex items-center justify-between mb-4 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full whitespace-nowrap">
                      {article.category || 'News'}
                    </span>
                    {article.sentimentLabel && (
                      <span
                        className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${sentimentChipClasses(article.sentimentLabel)}`}
                        title={
                          article.sentiment !== null
                            ? `Sentiment score: ${article.sentiment.toFixed(2)}`
                            : ''
                        }
                      >
                        {article.sentimentLabel}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-secondary whitespace-nowrap">
                    {new Date(article.publishedAt).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white mb-3 line-clamp-2">
                  {article.title}
                </h3>

                <p className="text-slate-300 mb-4 line-clamp-3">
                  {article.summary || article.excerpt}
                </p>

                {article.imageUrl && (
                  <div className="mb-4 rounded-lg overflow-hidden">
                    <img
                      src={article.imageUrl}
                      alt={article.title}
                      className="w-full h-48 object-cover"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-sm text-secondary">
                    {article.author || 'Chartsentinel Team'}
                  </span>
                  {article.url ? (
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 font-medium text-sm transition-colors"
                    >
                      Read More →
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default News;

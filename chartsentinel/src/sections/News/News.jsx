import { useState, useEffect } from 'react';
import { newsService } from '../../services/newsService';

const News = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const data = await newsService.getAllNews();
        setNews(data);
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
      <section className="py-24 bg-background-light dark:bg-background-dark relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center text-white">Loading news...</div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-24 bg-background-light dark:bg-background-dark relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center text-red-500">Error: {error}</div>
        </div>
      </section>
    );
  }

  return (
    <section id="news" className="py-24 bg-background-light dark:bg-background-dark relative">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-5xl font-display font-bold text-center mb-20 tracking-tight text-white">
          Latest News & Updates
        </h2>
        
        {news.length === 0 ? (
          <div className="text-center text-white">
            <p className="text-xl">No news available at the moment.</p>
            <p className="text-secondary mt-2">Check back later for the latest updates.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {news.map((article) => (
              <article key={article.id} className="bg-white dark:bg-white/10 backdrop-blur-sm p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
                    {article.category || 'News'}
                  </span>
                  <span className="text-xs text-secondary">
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
                  <button className="text-primary hover:text-primary/80 font-medium text-sm transition-colors">
                    Read More →
                  </button>
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

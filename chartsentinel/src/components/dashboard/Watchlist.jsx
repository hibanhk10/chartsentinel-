import { useEffect, useState } from 'react';
import { API_CONFIG } from '../../config/api';

// Persistent watchlist with per-ticker composite-score thresholds. Writes
// hit /api/watchlist — reads happen every time the tab mounts so the list
// is always fresh across devices.

const AUTH_HEADERS = () => {
  const token = localStorage.getItem('authToken');
  return {
    ...API_CONFIG.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

async function fetchJson(path, options = {}) {
  const res = await fetch(`${API_CONFIG.baseURL}${path}`, {
    headers: AUTH_HEADERS(),
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || body.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export default function DashboardWatchlist() {
  const [items, setItems] = useState([]);
  const [tickers, setTickers] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    ticker: '',
    thresholdAbove: '',
    thresholdBelow: '',
  });
  const [formStatus, setFormStatus] = useState('idle');
  const [formError, setFormError] = useState(null);

  async function reload() {
    setStatus('loading');
    setError(null);
    try {
      const [data, tickerList] = await Promise.all([
        fetchJson('/watchlist'),
        fetchJson('/signals/tickers'),
      ]);
      setItems(data.items || []);
      setTickers(tickerList.all || []);
      setStatus('ready');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.ticker) {
      setFormError('Pick a ticker first.');
      return;
    }
    const above = form.thresholdAbove === '' ? null : Number(form.thresholdAbove);
    const below = form.thresholdBelow === '' ? null : Number(form.thresholdBelow);
    if (above == null && below == null) {
      setFormError('Set at least one threshold — otherwise there is nothing to alert on.');
      return;
    }

    setFormStatus('loading');
    setFormError(null);
    try {
      await fetchJson('/watchlist', {
        method: 'POST',
        body: JSON.stringify({
          ticker: form.ticker,
          thresholdAbove: above,
          thresholdBelow: below,
        }),
      });
      setForm({ ticker: '', thresholdAbove: '', thresholdBelow: '' });
      setFormStatus('idle');
      await reload();
    } catch (err) {
      setFormStatus('idle');
      setFormError(err.message);
    }
  }

  async function handleDelete(id) {
    try {
      await fetchJson(`/watchlist/${id}`, { method: 'DELETE' });
      await reload();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-4xl font-bold tracking-tight text-white">Watchlist</h1>
        <p className="mt-2 text-text-secondary max-w-2xl">
          Add tickers you want to track. Set a composite-score threshold and
          we&apos;ll email you the moment it crosses — usually within 30
          minutes of the market moving.
        </p>
      </header>

      <section className="bg-white/[0.03] border border-white/5 rounded-xl p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-4">
          Add or update ticker
        </h2>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-4">
          <div>
            <label htmlFor="watchlist-ticker" className="block text-xs text-text-secondary mb-1.5">
              Ticker
            </label>
            <select
              id="watchlist-ticker"
              value={form.ticker}
              onChange={(e) => setForm((f) => ({ ...f, ticker: e.target.value }))}
              className="w-full bg-black/30 border border-white/10 rounded-md px-3 py-2 text-sm text-white"
            >
              <option value="">Pick…</option>
              {tickers.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="watchlist-above" className="block text-xs text-text-secondary mb-1.5">
              Alert when composite ≥
            </label>
            <input
              id="watchlist-above"
              type="number"
              step="0.1"
              min="-5"
              max="5"
              placeholder="e.g. 1.5"
              value={form.thresholdAbove}
              onChange={(e) => setForm((f) => ({ ...f, thresholdAbove: e.target.value }))}
              className="w-full bg-black/30 border border-white/10 rounded-md px-3 py-2 text-sm text-white placeholder-white/30"
            />
          </div>
          <div>
            <label htmlFor="watchlist-below" className="block text-xs text-text-secondary mb-1.5">
              Alert when composite ≤
            </label>
            <input
              id="watchlist-below"
              type="number"
              step="0.1"
              min="-5"
              max="5"
              placeholder="e.g. -1.5"
              value={form.thresholdBelow}
              onChange={(e) => setForm((f) => ({ ...f, thresholdBelow: e.target.value }))}
              className="w-full bg-black/30 border border-white/10 rounded-md px-3 py-2 text-sm text-white placeholder-white/30"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={formStatus === 'loading'}
              className="w-full px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-60 rounded-md text-sm font-medium transition-colors"
            >
              {formStatus === 'loading' ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
        {formError && (
          <p className="mt-3 text-sm text-rose-300">{formError}</p>
        )}
      </section>

      {status === 'loading' && (
        <div className="space-y-2 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 bg-white/[0.03] rounded-md" />
          ))}
        </div>
      )}

      {status === 'error' && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {status === 'ready' && items.length === 0 && (
        <div className="bg-white/[0.02] border border-white/5 rounded-lg p-6 text-sm text-text-secondary text-center">
          You haven&apos;t added any tickers yet. Use the form above to start tracking.
        </div>
      )}

      {status === 'ready' && items.length > 0 && (
        <div className="border border-white/5 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] text-text-muted text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left font-semibold px-4 py-3">Ticker</th>
                <th className="text-right font-semibold px-4 py-3">Last composite</th>
                <th className="text-right font-semibold px-4 py-3">Above ≥</th>
                <th className="text-right font-semibold px-4 py-3">Below ≤</th>
                <th className="text-right font-semibold px-4 py-3">Last alerted</th>
                <th className="text-right font-semibold px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-white/5">
                  <td className="px-4 py-3 font-mono text-white">{item.ticker}</td>
                  <td className="px-4 py-3 text-right text-text-secondary font-mono">
                    {item.lastScore != null ? item.lastScore.toFixed(2) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-text-secondary font-mono">
                    {item.thresholdAbove != null ? item.thresholdAbove.toFixed(2) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-text-secondary font-mono">
                    {item.thresholdBelow != null ? item.thresholdBelow.toFixed(2) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-text-muted text-xs">
                    {item.lastNotifiedAt
                      ? new Date(item.lastNotifiedAt).toLocaleDateString()
                      : 'never'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-xs text-rose-300 hover:text-rose-200 transition-colors"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

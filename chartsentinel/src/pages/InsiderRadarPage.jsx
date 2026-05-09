import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import SEO from '../components/ui/SEO';
import ConvictionGauge from '../components/ui/ConvictionGauge';
import { insiderService } from '../services/insiderService';

const fmtMoney = (n) => {
  if (!n) return '$0';
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

const fmtNumber = (n) => new Intl.NumberFormat('en-US').format(Math.round(n));

const ROLE_FILTERS = [
  { value: 'all', label: 'All filers' },
  { value: 'csuite', label: 'C-suite (officers)' },
  { value: 'director', label: 'Directors' },
  { value: 'tenpct', label: '10% owners' },
];

const TYPE_FILTERS = [
  { value: 'all', label: 'Buys + sells' },
  { value: 'Buy', label: 'Buys only' },
  { value: 'Sell', label: 'Sells only' },
];

function useFetched(fn, deps = []) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null });
  useEffect(() => {
    let active = true;
    setState((s) => ({ ...s, status: 'loading' }));
    fn()
      .then((data) => active && setState({ status: 'ready', data, error: null }))
      .catch((err) => active && setState({ status: 'error', data: null, error: err.message }));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

function TradeRow({ t }) {
  const isBuy = t.type === 'Buy';
  const tag = t.officerTitle || (t.isDirector ? 'Director' : t.isTenPercentOwner ? '10% Owner' : null);
  return (
    <tr className="border-b border-white/5 hover:bg-white/[0.02]">
      <td className="py-3 px-2">
        <div className="text-white font-semibold">{t.ticker}</div>
      </td>
      <td className="py-3 px-2">
        <div className="text-white">{t.filer}</div>
        {tag && <div className="text-[10px] text-text-muted uppercase tracking-wider">{tag}</div>}
      </td>
      <td className="py-3 px-2">
        <span
          className={`inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${
            isBuy ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'
          }`}
        >
          {t.type}
        </span>
      </td>
      <td className="py-3 px-2 text-right tabular-nums text-text-secondary">
        {fmtNumber(t.shares)}
      </td>
      <td className="py-3 px-2 text-right tabular-nums text-text-secondary">
        ${t.price.toFixed(2)}
      </td>
      <td className="py-3 px-2 text-right tabular-nums text-white font-semibold">
        {fmtMoney(t.value)}
      </td>
      <td className="py-3 px-2 text-right text-xs text-text-muted">{t.date}</td>
      <td className="py-3 px-2 text-right">
        <a
          href={t.formUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-primary hover:underline"
        >
          Form 4
        </a>
      </td>
    </tr>
  );
}

function CongressRow({ t }) {
  const isBuy = /purchase|buy/i.test(t.action);
  return (
    <tr className="border-b border-white/5 hover:bg-white/[0.02]">
      <td className="py-3 px-2">
        <div className="text-white font-semibold">{t.ticker}</div>
      </td>
      <td className="py-3 px-2">
        <div className="text-white">{t.member}</div>
        <div className="text-[10px] text-text-muted uppercase tracking-wider">{t.chamber}</div>
      </td>
      <td className="py-3 px-2">
        <span
          className={`inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${
            isBuy ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'
          }`}
        >
          {t.action}
        </span>
      </td>
      <td className="py-3 px-2 text-right text-text-secondary">{t.amount}</td>
      <td className="py-3 px-2 text-right text-xs text-text-muted">{t.date}</td>
      <td className="py-3 px-2 text-right">
        <a
          href={t.disclosureUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-primary hover:underline"
        >
          PTR
        </a>
      </td>
    </tr>
  );
}

export default function InsiderRadarPage() {
  const [role, setRole] = useState('all');
  const [type, setType] = useState('all');
  const [query, setQuery] = useState('');

  const insider = useFetched(() => insiderService.getTrades({ role, type }), [role, type]);
  const clusters = useFetched(() => insiderService.getClusterBuys(), []);
  const history = useFetched(() => insiderService.getClusterHistory({ days: 30 }), []);
  const congress = useFetched(() => insiderService.getCongressTrades(), []);

  const clusterBuys = clusters.data?.clusters ?? [];
  const clusterHistory = history.data?.events ?? [];

  const insiderTrades = useMemo(() => insider.data?.trades ?? [], [insider.data]);
  const congressTrades = useMemo(() => congress.data?.trades ?? [], [congress.data]);

  const filteredInsider = useMemo(() => {
    if (!query.trim()) return insiderTrades;
    const q = query.toLowerCase();
    return insiderTrades.filter(
      (t) => t.ticker.toLowerCase().includes(q) || t.filer.toLowerCase().includes(q),
    );
  }, [insiderTrades, query]);

  const filteredCongress = useMemo(() => {
    if (!query.trim()) return congressTrades;
    const q = query.toLowerCase();
    return congressTrades.filter(
      (t) => t.ticker.toLowerCase().includes(q) || t.member.toLowerCase().includes(q),
    );
  }, [congressTrades, query]);

  return (
    <div className="relative z-10 min-h-screen bg-background-dark text-text-primary pt-32 pb-20 px-6">
      <SEO
        title="Insider Radar — ChartSentinel"
        description="Live SEC Form 4 filings, Congressional trades, and cluster-buy detection."
        path="/insider"
      />

      <div className="max-w-7xl mx-auto">
        <motion.header
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-10"
        >
          <div className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-2">
            Insider radar
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            What insiders &amp; Congress are actually doing
          </h1>
          <p className="text-text-muted mt-3 max-w-2xl">
            Live SEC EDGAR Form 4 filings paired with House and Senate disclosure feeds. No
            fabricated data — when a source is quiet, the table is empty.
          </p>
        </motion.header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          <ConvictionGauge trades={insiderTrades} title="Insider Conviction" />

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur lg:col-span-2">
            <div className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-4">
              Cluster buys (≥3 insiders, 14-day window)
            </div>
            {clusters.status === 'loading' && <div className="text-text-muted text-sm">Scanning…</div>}
            {clusters.status === 'error' && (
              <div className="text-red-300 text-sm">Failed: {clusters.error}</div>
            )}
            {clusters.status === 'ready' && clusterBuys.length === 0 && (
              <div className="text-text-muted text-sm">
                No clusters in the current window. This is normal — cluster buys are rare.
              </div>
            )}
            {clusters.status === 'ready' && clusterBuys.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {clusterBuys.slice(0, 6).map((c) => (
                  <div
                    key={c.ticker}
                    className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3"
                  >
                    <div className="flex items-baseline justify-between">
                      <span className="text-white font-bold">{c.ticker}</span>
                      <span className="text-[10px] uppercase tracking-widest text-emerald-300">
                        {c.buyerCount} buyers
                      </span>
                    </div>
                    <div className="text-emerald-300 font-bold tabular-nums mt-1">
                      {fmtMoney(c.totalValue)}
                    </div>
                    <div className="text-[10px] text-text-muted mt-1">
                      {c.earliestDate} → {c.latestDate}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur mb-10">
          <div className="flex items-baseline justify-between mb-4">
            <div className="text-[10px] uppercase tracking-widest text-text-muted font-bold">
              Cluster history (last 30 days)
            </div>
            {history.status === 'ready' && (
              <span className="text-[10px] uppercase tracking-widest text-text-muted">
                {clusterHistory.length} events
              </span>
            )}
          </div>
          {history.status === 'loading' && (
            <div className="text-text-muted text-sm">Loading history…</div>
          )}
          {history.status === 'error' && (
            <div className="text-red-300 text-sm">Failed: {history.error}</div>
          )}
          {history.status === 'ready' && clusterHistory.length === 0 && (
            <div className="text-text-muted text-sm">
              No historical clusters yet. The snapshot job populates this once it's been
              running for a few days.
            </div>
          )}
          {history.status === 'ready' && clusterHistory.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase tracking-widest text-text-muted">
                  <tr className="border-b border-white/5">
                    <th className="text-left py-2 px-2">Ticker</th>
                    <th className="text-right py-2 px-2">Buyers</th>
                    <th className="text-right py-2 px-2">Total value</th>
                    <th className="text-left py-2 px-2 hidden md:table-cell">Window</th>
                    <th className="text-right py-2 px-2">Detected</th>
                  </tr>
                </thead>
                <tbody>
                  {clusterHistory.map((e) => (
                    <tr key={e.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="py-3 px-2 text-white font-semibold">{e.ticker}</td>
                      <td className="py-3 px-2 text-right tabular-nums text-emerald-300">
                        {e.buyerCount}
                      </td>
                      <td className="py-3 px-2 text-right tabular-nums text-white font-semibold">
                        {fmtMoney(e.totalValue)}
                      </td>
                      <td className="py-3 px-2 text-xs text-text-muted hidden md:table-cell">
                        {e.earliestDate} → {e.latestDate}
                      </td>
                      <td className="py-3 px-2 text-right text-xs text-text-muted">
                        {new Date(e.detectedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search ticker or name…"
            className="bg-white/[0.03] border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder:text-text-muted focus:outline-none focus:border-primary/50 min-w-[240px]"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
          >
            {ROLE_FILTERS.map((f) => (
              <option key={f.value} value={f.value} className="bg-background-dark">
                {f.label}
              </option>
            ))}
          </select>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
          >
            {TYPE_FILTERS.map((f) => (
              <option key={f.value} value={f.value} className="bg-background-dark">
                {f.label}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur overflow-hidden mb-10">
          <div className="px-6 py-4 border-b border-white/5 flex items-baseline justify-between">
            <h2 className="text-white font-semibold">SEC Form 4 — recent filings</h2>
            <span className="text-[10px] uppercase tracking-widest text-text-muted">
              {insider.status === 'ready' ? `${filteredInsider.length} shown` : ''}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-widest text-text-muted">
                <tr className="border-b border-white/5">
                  <th className="text-left py-2 px-2">Ticker</th>
                  <th className="text-left py-2 px-2">Filer</th>
                  <th className="text-left py-2 px-2">Type</th>
                  <th className="text-right py-2 px-2">Shares</th>
                  <th className="text-right py-2 px-2">Price</th>
                  <th className="text-right py-2 px-2">Value</th>
                  <th className="text-right py-2 px-2">Date</th>
                  <th className="text-right py-2 px-2">Source</th>
                </tr>
              </thead>
              <tbody>
                {insider.status === 'loading' && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-text-muted">
                      Loading SEC EDGAR…
                    </td>
                  </tr>
                )}
                {insider.status === 'error' && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-red-300">
                      {insider.error}
                    </td>
                  </tr>
                )}
                {insider.status === 'ready' && filteredInsider.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-text-muted">
                      No filings match your filters.
                    </td>
                  </tr>
                )}
                {filteredInsider.map((t, i) => (
                  <TradeRow key={`${t.formUrl}-${i}`} t={t} />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 flex items-baseline justify-between">
            <h2 className="text-white font-semibold">Congressional trades</h2>
            <span className="text-[10px] uppercase tracking-widest text-text-muted">
              {congress.status === 'ready' ? `${filteredCongress.length} shown` : ''}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-widest text-text-muted">
                <tr className="border-b border-white/5">
                  <th className="text-left py-2 px-2">Ticker</th>
                  <th className="text-left py-2 px-2">Member</th>
                  <th className="text-left py-2 px-2">Action</th>
                  <th className="text-right py-2 px-2">Amount</th>
                  <th className="text-right py-2 px-2">Date</th>
                  <th className="text-right py-2 px-2">Source</th>
                </tr>
              </thead>
              <tbody>
                {congress.status === 'loading' && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-text-muted">
                      Loading PTR feeds…
                    </td>
                  </tr>
                )}
                {congress.status === 'error' && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-red-300">
                      {congress.error}
                    </td>
                  </tr>
                )}
                {congress.status === 'ready' && filteredCongress.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-text-muted">
                      No disclosures available right now.
                    </td>
                  </tr>
                )}
                {filteredCongress.map((t, i) => (
                  <CongressRow key={`${t.member}-${t.ticker}-${t.date}-${i}`} t={t} />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-[10px] text-text-muted mt-6 max-w-2xl">
          Sources: SEC EDGAR Form 4 Atom feed; House Stock Watcher and Senate Stock Watcher
          aggregated PTR datasets. Data is informational only and not investment advice.
        </p>
      </div>
    </div>
  );
}

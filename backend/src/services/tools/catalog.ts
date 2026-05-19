import prisma from '../../config/db';
import {
  fetchRecentForm4s,
  detectClusterBuys,
  loadClusterHistory,
} from '../insider.service';
import { fetchCongressTrades } from '../congress.service';
import { fetchLiveNews } from '../news-feed.service';
import { computeRiskMetrics } from '../../lib/risk-metrics';
import { calculatePositionSize } from '../../lib/position-sizing';
import { projectPriceFan } from '../../lib/monte-carlo';
import { buildCorrelationMatrix } from '../../lib/correlation';
import { scoreArticles, aggregateSentiment } from '../news-sentiment.service';
import { decomposeExposure } from '../../lib/exposure';
import { getMacroCalendar } from '../../lib/macro-calendar';
import type { MacroEventType } from '../../lib/macro-calendar';
import { computeEventVol } from '../../lib/event-vol';

// Tool catalog for the agentic chat loop. Each entry holds three
// things:
//   • the OpenAI-format JSON schema the LLM sees (so it knows the
//     name, args, and purpose)
//   • a `run` function that executes the call server-side
//   • a result cap so a tool can't dump 50KB of JSON back at the
//     LLM and blow the context budget
//
// The runtime in ai.service walks tool_calls returned by the model
// and dispatches them through `runTool`. Anything that throws is
// caught and returned as `{ error: "..." }` so the model can see
// what failed and adapt instead of the whole chat exploding.

export interface ToolContext {
  userId: string | null;
}

interface ToolDef<TArgs = Record<string, unknown>> {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  run: (args: TArgs, ctx: ToolContext) => Promise<unknown>;
}

// Lazy engine import — keeps this module fast to load when only the
// catalog (not the runtime) is needed.
async function engine() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (await import('../../signals/engine.js')) as any;
}

function truncate<T>(rows: T[], n: number): T[] {
  return rows.slice(0, n);
}

const TOOLS: ToolDef[] = [
  {
    name: 'getCompositeScore',
    description:
      'Get the live ChartSentinel composite signal score (−100 to +100) for a single ticker, with the contribution from each component (seasonality, COT positioning, chart pattern, base). Use this whenever the user asks about a specific ticker.',
    parameters: {
      type: 'object',
      properties: {
        ticker: {
          type: 'string',
          description:
            "The ticker symbol. Use the canonical form: 'AAPL' for stocks, 'BTC-USD' / 'ETH-USD' for crypto, 'EURUSD=X' for FX.",
        },
      },
      required: ['ticker'],
    },
    run: async (args) => {
      const t = (args as { ticker: string }).ticker;
      const data = await (await engine()).computeScoreForTicker(t);
      if (!data) return { error: `No data available for ${t}.` };
      return data;
    },
  },
  {
    name: 'getScreenerTop',
    description:
      "Return the N tickers with the highest absolute composite scores in the universe right now. Use this when the user asks 'what's strong / weak today', 'top movers', or 'biggest signals'. Optional category filter by asset class.",
    parameters: {
      type: 'object',
      properties: {
        limit: {
          type: 'integer',
          description: 'How many rows to return. Default 10, max 20.',
        },
        category: {
          type: 'string',
          enum: ['all', 'forex', 'crypto', 'stocks'],
          description: 'Optional asset-class filter.',
        },
        direction: {
          type: 'string',
          enum: ['bullish', 'bearish', 'either'],
          description:
            "Filter by sign: 'bullish' returns highest positive scores, 'bearish' returns lowest negative. Default 'either' returns highest absolute scores.",
        },
      },
      required: [],
    },
    run: async (args) => {
      const a = args as { limit?: number; category?: string; direction?: string };
      const cap = Math.min(Math.max(a.limit ?? 10, 1), 20);
      const eng = await engine();
      // Engine exposes a cached screener via the route handler; the
      // ticker universe + per-ticker scoring is the same call here.
      const tickers: string[] = eng.ALL_TICKERS as string[];
      const category = a.category ?? 'all';
      const filtered = tickers.filter((t) => {
        if (category === 'forex') return t.endsWith('=X');
        if (category === 'crypto') return t.endsWith('-USD');
        if (category === 'stocks') return !t.endsWith('=X') && !t.endsWith('-USD');
        return true;
      });
      // Batched compute — the engine caches per-ticker so this is
      // cheap on warm cache.
      const scored = await Promise.all(
        filtered.map(async (t) => {
          try {
            const r = await eng.computeScoreForTicker(t);
            return r ? { ticker: t, score: r.composite, signal: r.signal } : null;
          } catch {
            return null;
          }
        }),
      );
      const valid = scored.filter(
        (r): r is { ticker: string; score: number; signal: string } => r !== null,
      );
      const direction = a.direction ?? 'either';
      const sorted = valid.sort((a, b) => {
        if (direction === 'bullish') return b.score - a.score;
        if (direction === 'bearish') return a.score - b.score;
        return Math.abs(b.score) - Math.abs(a.score);
      });
      return { rows: truncate(sorted, cap) };
    },
  },
  {
    name: 'getRecentInsiderTrades',
    description:
      'Live SEC Form 4 filings — corporate insiders buying or selling stock in their own company. Use this when the user asks about insider activity, recent C-suite transactions, or directors trading.',
    parameters: {
      type: 'object',
      properties: {
        ticker: {
          type: 'string',
          description: "Optional ticker filter, e.g. 'AAPL'. Omit for the full feed.",
        },
        type: {
          type: 'string',
          enum: ['Buy', 'Sell', 'either'],
          description: 'Filter for buys, sells, or either. Default either.',
        },
        limit: {
          type: 'integer',
          description: 'Max rows. Default 10, max 25.',
        },
      },
      required: [],
    },
    run: async (args) => {
      const a = args as { ticker?: string; type?: string; limit?: number };
      const cap = Math.min(Math.max(a.limit ?? 10, 1), 25);
      const all = await fetchRecentForm4s();
      let rows = all;
      if (a.ticker) {
        const wanted = a.ticker.toUpperCase();
        rows = rows.filter((r) => r.ticker.toUpperCase() === wanted);
      }
      if (a.type === 'Buy' || a.type === 'Sell') {
        rows = rows.filter((r) => r.type === a.type);
      }
      return { rows: truncate(rows, cap) };
    },
  },
  {
    name: 'getActiveClusters',
    description:
      'Tickers currently flagged for cluster-buy activity (≥3 distinct insiders buying within a 14-day window). This is the documented insider alpha signal — far more meaningful than single insider trades.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
    run: async () => {
      const trades = await fetchRecentForm4s();
      const clusters = detectClusterBuys(trades);
      return { clusters: truncate(clusters, 15) };
    },
  },
  {
    name: 'getClusterHistory',
    description:
      "Past cluster-buy events from the snapshot cron. Use this when the user asks about historical insider clusters or 'what tickers had cluster buys recently'.",
    parameters: {
      type: 'object',
      properties: {
        days: {
          type: 'integer',
          description: 'Look-back window in days. Default 30, max 90.',
        },
      },
      required: [],
    },
    run: async (args) => {
      const days = Math.min(Math.max((args as { days?: number }).days ?? 30, 1), 90);
      const events = await loadClusterHistory(days, 30);
      return { events, windowDays: days };
    },
  },
  {
    name: 'getCongressTrades',
    description:
      'House + Senate disclosed stock trades. Use this when the user asks about politicians trading, Pelosi/Tuberville etc., or government insider activity.',
    parameters: {
      type: 'object',
      properties: {
        ticker: {
          type: 'string',
          description: 'Optional ticker filter.',
        },
        limit: {
          type: 'integer',
          description: 'Max rows. Default 10, max 30.',
        },
      },
      required: [],
    },
    run: async (args) => {
      const a = args as { ticker?: string; limit?: number };
      const cap = Math.min(Math.max(a.limit ?? 10, 1), 30);
      let trades = await fetchCongressTrades();
      if (a.ticker) {
        const wanted = a.ticker.toUpperCase();
        trades = trades.filter((t) => t.ticker.toUpperCase() === wanted);
      }
      return { rows: truncate(trades, cap) };
    },
  },
  {
    name: 'getLatestNews',
    description:
      'Live aggregated market news from BBC Business, Yahoo Finance, CNBC, CoinDesk, Investing.com. Use this when the user asks for current events, headlines, or "what is happening in the market".',
    parameters: {
      type: 'object',
      properties: {
        keyword: {
          type: 'string',
          description:
            'Optional case-insensitive filter against the title + summary. e.g. "fed", "bitcoin", "nvidia".',
        },
        limit: {
          type: 'integer',
          description: 'Max stories. Default 8, max 15.',
        },
      },
      required: [],
    },
    run: async (args) => {
      const a = args as { keyword?: string; limit?: number };
      const cap = Math.min(Math.max(a.limit ?? 8, 1), 15);
      const all = await fetchLiveNews();
      let filtered = all;
      if (a.keyword) {
        const re = new RegExp(a.keyword.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
        filtered = filtered.filter((n) => re.test(`${n.title} ${n.summary || ''}`));
      }
      return {
        rows: truncate(filtered, cap).map((n) => ({
          title: n.title,
          summary: n.summary,
          source: n.source,
          publishedAt: n.publishedAt,
        })),
      };
    },
  },
  {
    name: 'getSeasonality',
    description:
      "Historical monthly return profile for a ticker — which months have historically been bullish or bearish. Use this when the user asks 'is X seasonal' or 'how does this ticker do in <month>'.",
    parameters: {
      type: 'object',
      properties: {
        ticker: { type: 'string', description: 'Ticker symbol.' },
      },
      required: ['ticker'],
    },
    run: async (args) => {
      const ticker = (args as { ticker: string }).ticker;
      const eng = await engine();
      const priceData = await eng.fetchYahooHistory(ticker, 11);
      if (!priceData || priceData.length === 0) {
        return { error: `No price history for ${ticker}.` };
      }
      const seasonality = eng.computeSeasonality(priceData, 10);
      if (!seasonality) return { error: 'Insufficient data.' };
      const current = eng.getSeasonalSignal(seasonality);
      return { ...seasonality, currentSignal: current };
    },
  },
  {
    name: 'getRiskMetrics',
    description:
      'Risk-metric snapshot for one ticker over a multi-year window: 95% / 99% historical VaR, annualised return and volatility, Sharpe, Sortino, and max drawdown with the dates of the peak-and-trough. Use this when the user asks about risk, volatility, drawdown, or risk-adjusted return.',
    parameters: {
      type: 'object',
      properties: {
        ticker: { type: 'string', description: 'Ticker symbol.' },
        years: {
          type: 'integer',
          description: 'Look-back window. Default 3, max 10.',
        },
      },
      required: ['ticker'],
    },
    run: async (args) => {
      const a = args as { ticker: string; years?: number };
      const years = Math.min(Math.max(a.years ?? 3, 1), 10);
      const eng = await engine();
      const isSpy = a.ticker.toUpperCase() === 'SPY';
      const [bars, spyBars] = await Promise.all([
        eng.fetchYahooHistory(a.ticker, years),
        isSpy ? Promise.resolve(null) : eng.fetchYahooHistory('SPY', years).catch(() => null),
      ]);
      if (!bars || bars.length === 0) return { error: `No price history for ${a.ticker}.` };
      const metrics = computeRiskMetrics(
        bars.map((b: { date: string; close: number }) => ({ date: b.date, close: b.close })),
        spyBars && spyBars.length > 0
          ? spyBars.map((b: { date: string; close: number }) => ({ date: b.date, close: b.close }))
          : undefined,
      );
      return { ticker: a.ticker, years, benchmark: isSpy ? null : 'SPY', metrics };
    },
  },
  {
    name: 'calculatePositionSize',
    description:
      "Calculates how many shares to buy given account size, entry price, stop loss, and either a risk percent or a fixed dollar risk. Use this whenever the user asks 'how big should my position be' or 'how many shares can I buy' or describes a stop and an entry. Pure math; no live data is needed.",
    parameters: {
      type: 'object',
      properties: {
        accountSize: { type: 'number', description: 'Total trading account size in USD.' },
        entry: { type: 'number', description: 'Planned entry price per share.' },
        stop: { type: 'number', description: 'Planned stop-loss price per share.' },
        riskPercent: {
          type: 'number',
          description: 'Percent of account willing to risk on this trade (e.g. 1 for 1%).',
        },
        riskDollars: {
          type: 'number',
          description: 'Alternative to riskPercent: a fixed dollar amount.',
        },
        side: {
          type: 'string',
          enum: ['long', 'short'],
          description: 'Default long. Determines which side of entry the stop should be.',
        },
      },
      required: ['accountSize', 'entry', 'stop'],
    },
    run: async (args) => {
      const result = calculatePositionSize(
        args as unknown as Parameters<typeof calculatePositionSize>[0],
      );
      return result;
    },
  },
  {
    name: 'getProbabilityProjection',
    description:
      'Monte Carlo probability cone for a single ticker. Returns percentile price bands (p05, p25, p50, p75, p95) projected forward from the latest close using historical drift and volatility. Use this when the user asks "where could X go in N days" or "what is the range".',
    parameters: {
      type: 'object',
      properties: {
        ticker: { type: 'string', description: 'Ticker symbol.' },
        horizonDays: {
          type: 'integer',
          description: 'Projection horizon in trading days. Default 30, max 252.',
        },
      },
      required: ['ticker'],
    },
    run: async (args) => {
      const a = args as { ticker: string; horizonDays?: number };
      const horizon = Math.min(Math.max(a.horizonDays ?? 30, 1), 252);
      const eng = await engine();
      const bars = await eng.fetchYahooHistory(a.ticker, 3);
      if (!bars || bars.length === 0) return { error: `No price history for ${a.ticker}.` };
      const result = projectPriceFan({
        history: bars.map((b: { date: string; close: number }) => ({
          date: b.date,
          close: b.close,
        })),
        horizonDays: horizon,
        paths: 1000,
      });
      if ('error' in result) return result;
      // Trim payload: the chat doesn't need every daily band, just
      // the headline horizon endpoints (median + extreme percentiles)
      // and a few interior checkpoints. Keeps the response small
      // enough to fit in the model's tool-output budget.
      const horizons = [1, 5, 10, Math.floor(horizon / 2), horizon].filter(
        (h, i, arr) => arr.indexOf(h) === i && h >= 1 && h <= horizon,
      );
      const checkpoints = horizons.map((h) => ({
        day: h,
        ...result.bands[h - 1].values,
      }));
      return {
        ticker: a.ticker,
        startPrice: result.startPrice,
        startDate: result.startDate,
        muAnnual: result.mu,
        sigmaAnnual: result.sigma,
        checkpoints,
      };
    },
  },
  {
    name: 'getPortfolioRisk',
    description:
      "The asker's portfolio-level risk metrics: weighted-equity-curve VaR, Sharpe, Sortino, max drawdown. Use when the user references 'my portfolio risk' or 'how risky is my book'. Requires the user to be signed in and have a portfolio with holdings.",
    parameters: {
      type: 'object',
      properties: {
        portfolioId: {
          type: 'string',
          description:
            "Optional portfolio id. If omitted, uses the user's first portfolio (their default).",
        },
      },
      required: [],
    },
    run: async (args, ctx) => {
      if (!ctx.userId) {
        return { error: 'User is not signed in.' };
      }
      const a = args as { portfolioId?: string };
      const portfolio = a.portfolioId
        ? await prisma.portfolio.findFirst({
            where: { id: a.portfolioId, userId: ctx.userId },
            include: { items: true },
          })
        : await prisma.portfolio.findFirst({
            where: { userId: ctx.userId },
            orderBy: { createdAt: 'asc' },
            include: { items: true },
          });
      if (!portfolio) return { error: 'No portfolio found for this user.' };
      if (portfolio.items.length === 0) {
        return { error: 'Portfolio has no holdings yet.' };
      }
      const eng = await engine();
      const holdings = await Promise.all(
        portfolio.items.map(async (it) => {
          const bars = await eng.fetchYahooHistory(it.ticker, 3).catch(() => []);
          return { ticker: it.ticker, weight: it.weight, bars };
        }),
      );
      const total = holdings.reduce((s, h) => s + h.weight, 0);
      if (total <= 0) return { error: 'Portfolio weights sum to zero.' };
      const alive = holdings
        .filter((h) => Array.isArray(h.bars) && h.bars.length > 0)
        .map((h) => ({ ...h, w: h.weight / total }));
      if (alive.length === 0) return { error: 'No price data for any holding.' };
      // Re-normalise across survivors.
      const aw = alive.reduce((s, h) => s + h.w, 0);
      for (const h of alive) h.w /= aw;
      const dates: Set<string>[] = alive.map(
        (h) => new Set<string>(h.bars.map((b: { date: string }) => b.date)),
      );
      const common: string[] = [...dates[0]]
        .filter((d: string) => dates.every((s) => s.has(d)))
        .sort();
      if (common.length < 30) return { error: 'Not enough overlapping history.' };
      const closeMaps: Map<string, number>[] = alive.map(
        (h) =>
          new Map(
            h.bars.map((b: { date: string; close: number }) => [b.date, b.close]),
          ),
      );
      let eq = 1;
      const curve: { date: string; close: number }[] = [{ date: common[0], close: eq }];
      for (let i = 1; i < common.length; i++) {
        let stepReturn = 0;
        for (let j = 0; j < alive.length; j++) {
          const today = closeMaps[j].get(common[i]) ?? 0;
          const prev = closeMaps[j].get(common[i - 1]) ?? 0;
          if (today > 0 && prev > 0) stepReturn += alive[j].w * (today / prev - 1);
        }
        eq *= 1 + stepReturn;
        curve.push({ date: common[i], close: eq });
      }
      return {
        portfolio: portfolio.name,
        holdings: alive.map((h) => ({ ticker: h.ticker, weight: h.w })),
        metrics: computeRiskMetrics(curve),
      };
    },
  },
  {
    name: 'getPortfolioCorrelations',
    description:
      "Pairwise correlation matrix across the asker's portfolio holdings, computed from the last year of daily returns. Use when the user asks about diversification, concentration, or correlations between their positions. Sign-in required.",
    parameters: {
      type: 'object',
      properties: {
        portfolioId: { type: 'string' },
      },
      required: [],
    },
    run: async (args, ctx) => {
      if (!ctx.userId) return { error: 'User is not signed in.' };
      const a = args as { portfolioId?: string };
      const portfolio = a.portfolioId
        ? await prisma.portfolio.findFirst({
            where: { id: a.portfolioId, userId: ctx.userId },
            include: { items: true },
          })
        : await prisma.portfolio.findFirst({
            where: { userId: ctx.userId },
            orderBy: { createdAt: 'asc' },
            include: { items: true },
          });
      if (!portfolio) return { error: 'No portfolio found.' };
      if (portfolio.items.length < 2) {
        return { error: 'Need at least 2 holdings to correlate.' };
      }
      const eng = await engine();
      const series: Record<string, { date: string; close: number }[]> = {};
      await Promise.all(
        portfolio.items.map(async (it) => {
          const bars = await eng.fetchYahooHistory(it.ticker, 1).catch(() => []);
          if (Array.isArray(bars) && bars.length > 0) {
            series[it.ticker] = bars.map((b: { date: string; close: number }) => ({
              date: b.date,
              close: b.close,
            }));
          }
        }),
      );
      return buildCorrelationMatrix(series);
    },
  },
  {
    name: 'getNewsSentiment',
    description:
      'Live aggregated news with per-headline sentiment scores (-1 bearish → +1 bullish), plus an overall market-mood number. Use this when the user asks about market sentiment, news mood, or "is the news bullish".',
    parameters: {
      type: 'object',
      properties: {
        keyword: {
          type: 'string',
          description: 'Optional keyword filter against title + summary.',
        },
        limit: {
          type: 'integer',
          description: 'Max stories to score. Default 10, max 20.',
        },
      },
      required: [],
    },
    run: async (args) => {
      const a = args as { keyword?: string; limit?: number };
      const cap = Math.min(Math.max(a.limit ?? 10, 1), 20);
      const all = await fetchLiveNews();
      let filtered = all;
      if (a.keyword) {
        const re = new RegExp(a.keyword.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
        filtered = all.filter((n) => re.test(`${n.title} ${n.summary || ''}`));
      }
      const slice = truncate(filtered, cap);
      const scored = await scoreArticles(slice);
      const aggregate = aggregateSentiment(scored);
      return {
        aggregate,
        articles: scored.map((a) => ({
          title: a.title,
          source: a.source,
          sentiment: a.sentiment,
          label: a.sentimentLabel,
          publishedAt: a.publishedAt,
        })),
      };
    },
  },
  {
    name: 'getUserWatchlist',
    description:
      "The asker's own watchlist — tickers they're tracking, with thresholds. Use this when they reference 'my watchlist', 'my tickers', or 'what should I look at'. Returns an empty list for anonymous users.",
    parameters: { type: 'object', properties: {}, required: [] },
    run: async (_args, ctx) => {
      if (!ctx.userId) {
        return {
          rows: [],
          note: 'User is not signed in, so no personal watchlist is available.',
        };
      }
      const items = await prisma.watchlistItem.findMany({
        where: { userId: ctx.userId },
        select: {
          ticker: true,
          thresholdAbove: true,
          thresholdBelow: true,
          lastScore: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 25,
      });
      return { rows: items };
    },
  },
  {
    name: 'getMacroCalendar',
    description:
      'Upcoming macro events in a forward window: FOMC rate decisions, US CPI, US Nonfarm Payrolls, ECB rate decisions, BoE MPC meetings. Use when the user asks "what events are coming up", "is there a Fed meeting next week", or wants to plan around macro risk.',
    parameters: {
      type: 'object',
      properties: {
        days: {
          type: 'integer',
          description: 'How many days forward to look. Default 60, max 365.',
        },
        types: {
          type: 'array',
          items: { type: 'string', enum: ['fomc', 'cpi', 'nfp', 'ecb', 'boe'] },
          description: 'Optional filter — only return events of these types.',
        },
      },
      required: [],
    },
    run: async (args) => {
      const a = args as { days?: number; types?: MacroEventType[] };
      const days = Math.min(Math.max(a.days ?? 60, 7), 365);
      const events = getMacroCalendar({ days, types: a.types });
      return { days, count: events.length, events };
    },
  },
  {
    name: 'getEventRisk',
    description:
      'How much more volatile a ticker historically is during a specific macro event window (e.g. CPI release weeks) versus baseline. Returns a vol multiplier — "1.8" means the ticker has been 1.8× as volatile during the event window. Use when the user asks "should I trim before CPI" or "is X event-sensitive".',
    parameters: {
      type: 'object',
      properties: {
        ticker: { type: 'string' },
        eventType: {
          type: 'string',
          enum: ['cpi', 'nfp'],
          description: 'Only cpi/nfp have enough historical samples to be reliable.',
        },
        windowDays: {
          type: 'integer',
          description: '±days around each event date to consider as event window. Default 2.',
        },
        yearsBack: {
          type: 'integer',
          description: 'Years of history to use. Default 5, max 10.',
        },
      },
      required: ['ticker', 'eventType'],
    },
    run: async (args) => {
      const a = args as {
        ticker: string;
        eventType: MacroEventType;
        windowDays?: number;
        yearsBack?: number;
      };
      const eng = await engine();
      const yearsBack = Math.min(Math.max(a.yearsBack ?? 5, 1), 10);
      const bars = await eng.fetchYahooHistory(a.ticker, yearsBack);
      if (!bars || bars.length === 0) return { error: `No price history for ${a.ticker}.` };
      const report = computeEventVol(
        bars.map((b: { date: string; close: number }) => ({ date: b.date, close: b.close })),
        a.eventType,
        { windowDays: a.windowDays ?? 2, yearsBack },
      );
      return { ticker: a.ticker, ...report };
    },
  },
  {
    name: 'getPortfolioExposure',
    description:
      "Static factor-decomposition of the asker's portfolio: how much of their book is in tech vs financials, USD-long vs USD-short, China-sensitive, rate-sensitive, etc. Use when they ask 'what am I really long' or 'what's my factor exposure'. Sign-in required.",
    parameters: {
      type: 'object',
      properties: { portfolioId: { type: 'string' } },
      required: [],
    },
    run: async (args, ctx) => {
      if (!ctx.userId) return { error: 'User is not signed in.' };
      const a = args as { portfolioId?: string };
      const portfolio = a.portfolioId
        ? await prisma.portfolio.findFirst({
            where: { id: a.portfolioId, userId: ctx.userId },
            include: { items: true },
          })
        : await prisma.portfolio.findFirst({
            where: { userId: ctx.userId },
            orderBy: { createdAt: 'asc' },
            include: { items: true },
          });
      if (!portfolio) return { error: 'No portfolio found.' };
      if (portfolio.items.length === 0) return { error: 'Portfolio has no holdings.' };
      const total = portfolio.items.reduce((s, it) => s + it.weight, 0);
      if (total <= 0) return { error: 'Portfolio weights sum to zero.' };
      const holdings = portfolio.items.map((it) => ({
        ticker: it.ticker,
        weight: it.weight / total,
      }));
      return { portfolio: portfolio.name, ...decomposeExposure(holdings) };
    },
  },
];

// The OpenAI tools array shape, ready to pass to OpenRouter.
export const TOOL_SCHEMAS = TOOLS.map((t) => ({
  type: 'function' as const,
  function: {
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  },
}));

const TOOL_INDEX = new Map(TOOLS.map((t) => [t.name, t]));

// Dispatch a single tool call. Caller passes the parsed name +
// argument-string from the model; we parse + execute + serialize.
// Errors are returned as objects so the model can read them and try
// a different approach.
export async function runTool(
  name: string,
  rawArgs: string,
  ctx: ToolContext,
): Promise<unknown> {
  const tool = TOOL_INDEX.get(name);
  if (!tool) {
    return { error: `Unknown tool "${name}". Available: ${[...TOOL_INDEX.keys()].join(', ')}` };
  }
  let args: Record<string, unknown> = {};
  if (rawArgs && rawArgs !== '{}') {
    try {
      args = JSON.parse(rawArgs);
    } catch {
      return { error: `Could not parse arguments JSON for ${name}: ${rawArgs.slice(0, 120)}` };
    }
  }
  try {
    return await tool.run(args, ctx);
  } catch (err) {
    return { error: `Tool ${name} failed: ${(err as Error).message}` };
  }
}

export function listToolNames(): string[] {
  return TOOLS.map((t) => t.name);
}

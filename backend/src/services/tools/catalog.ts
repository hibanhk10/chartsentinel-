import prisma from '../../config/db';
import {
  fetchRecentForm4s,
  detectClusterBuys,
  loadClusterHistory,
} from '../insider.service';
import { fetchCongressTrades } from '../congress.service';
import { fetchLiveNews } from '../news-feed.service';

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

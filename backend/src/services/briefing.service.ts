// Personalised briefing composer. Pulls a user's watchlist + portfolio
// exposure + the next 7 days of macro events + the top live headlines,
// then asks the LLM for a 4-paragraph prose brief. Used by:
//   • POST /api/ai/briefing (interactive — dashboard)
//   • scripts/send-daily-briefings.ts (cron — email delivery)
//
// Caching is intentionally not in this module — the API endpoint
// caches per-user, but the cron job always wants a fresh brief so it
// can't be shared at this layer.

import prisma from '../config/db';
import { callLlm } from './ai.service';
import { getMacroCalendar } from '../lib/macro-calendar';
import { decomposeExposure } from '../lib/exposure';
import { fetchLiveNews } from './news-feed.service';

export interface BriefingSources {
  watchlist: { ticker: string; score: number | null }[];
  topExposure: { factor: string; weight: number }[];
  upcomingEvents: { date: string; type: string; label: string }[];
  headlines: { title: string; source: string }[];
}

export interface ComposedBriefing {
  transcript: string;
  sources: BriefingSources;
  generatedAt: string;
}

function asScore(n: unknown): number | null {
  if (typeof n !== 'number' || Number.isNaN(n)) return null;
  return Math.round(n);
}

// Returns the user's briefing inputs without calling the LLM. Useful
// for the email template, which renders the inputs alongside the
// transcript regardless of whether the LLM succeeded.
export async function gatherBriefingInputs(userId: string): Promise<BriefingSources> {
  const watchlist = await prisma.watchlistItem.findMany({
    where: { userId },
    select: { ticker: true, lastScore: true },
    orderBy: { createdAt: 'desc' },
    take: 8,
  });
  const watchlistSummary = watchlist.map((w) => ({
    ticker: w.ticker,
    score: asScore(w.lastScore),
  }));

  let topExposure: { factor: string; weight: number }[] = [];
  const portfolio = await prisma.portfolio.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    include: { items: true },
  });
  if (portfolio && portfolio.items.length > 0) {
    const total = portfolio.items.reduce((s, it) => s + (it.weight || 0), 0);
    if (total > 0) {
      const holdings = portfolio.items.map((it) => ({
        ticker: it.ticker,
        weight: it.weight / total,
      }));
      const breakdown = decomposeExposure(holdings);
      topExposure = Object.entries(breakdown.factors)
        .filter(([, v]) => Math.abs(v) >= 0.1)
        .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
        .slice(0, 3)
        .map(([k, v]) => ({ factor: k, weight: v }));
    }
  }

  const upcomingEvents = getMacroCalendar({ days: 7 }).slice(0, 6).map((e) => ({
    date: e.date,
    type: e.type,
    label: e.label,
  }));

  let headlines: { title: string; source: string }[] = [];
  try {
    const news = await fetchLiveNews();
    headlines = news.slice(0, 3).map((n) => ({ title: n.title, source: n.source }));
  } catch (err) {
    // News fetch failures are non-fatal — the briefing still composes.
    console.warn('[briefing] news fetch failed', (err as Error).message);
  }

  return { watchlist: watchlistSummary, topExposure, upcomingEvents, headlines };
}

// One-shot compose: gather + LLM call. Returns null when the LLM
// provider failed (caller decides what to do — skip the email, return
// a 502 to the dashboard, etc.).
export async function composeBriefing(userId: string): Promise<ComposedBriefing | null> {
  const sources = await gatherBriefingInputs(userId);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const userMessage =
    `Compose a 60-90 second spoken-style market briefing for ${today}. ` +
    `Write 4 paragraphs, second person, flowing prose (no bullets, no headings). ` +
    `Cover, in order: (1) overnight context, framed by the most prominent recent ` +
    `headline; (2) the user's watchlist — pick 2-3 tickers and reference their ` +
    `composite scores when available; (3) macro events on the calendar this week ` +
    `and what to watch; (4) one risk-management nudge tied to the user's most-loaded ` +
    `factor exposure. Keep it conversational and grounded in the numbers below. ` +
    `Never recommend trades.\n\nINPUTS:\n${JSON.stringify(sources, null, 2)}`;

  const reply = await callLlm({
    systemPrompt:
      'You are ChartSentinel AI. Generate a personalised market briefing in 4 ' +
      'paragraphs of flowing prose. Be specific and quote real numbers from the ' +
      'inputs. Never give buy/sell advice. End with "Informational only."',
    userMessage,
    maxTokens: 900,
  });

  if (!reply) return null;

  return {
    transcript: reply,
    sources,
    generatedAt: new Date().toISOString(),
  };
}

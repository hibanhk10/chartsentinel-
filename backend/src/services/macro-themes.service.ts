// LLM-clustered macro narratives. Takes the live news feed, hands it
// to the LLM with a strict-JSON contract, and gets back 3–6 themed
// narratives (e.g. "AI capex reset", "BoJ tightening watch"). The LLM
// emits headline *ids* rather than re-quoting the text, so we can
// merge the original source / url / published time back in without
// trusting the model to regurgitate them faithfully.
//
// Cached for 4 hours — themes don't shift faster than that on any
// reasonable news flow, and one LLM call per theme refresh keeps the
// spend bounded even with multiple concurrent users.

import { callLlm } from './ai.service';
import { fetchLiveNews, type NewsArticle } from './news-feed.service';

export interface ThemeHeadline {
  source: string;
  text: string;
  time: string;
  url: string | null;
}

export interface MacroTheme {
  id: string;
  title: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  // Soft direction tag for the UI's ▲▼▶ glyph. LLM picks based on
  // recency-pattern + headline tone; magnitude is bounded to [-3, 3]
  // so the UI's existing 3-dot scale lines up.
  momentum: number;
  impact: 'low' | 'medium' | 'high';
  summary: string;
  tickers: string[];
  regions: string[];
  headlines: ThemeHeadline[];
}

interface CacheEntry {
  themes: MacroTheme[];
  generatedAt: string;
  expiresAt: number;
}

const CACHE_TTL_MS = 4 * 60 * 60 * 1000;
let cache: CacheEntry | null = null;

// Used by tests to reset between cases without re-mocking the cache
// internals from outside the module.
export function __resetCacheForTests(): void {
  cache = null;
}

function isoToRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const mins = Math.max(0, Math.round((now - then) / 60_000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

// Pull JSON array out of a possibly-fenced LLM reply. Same defensive
// shape as ai-narrate — free-tier models love to wrap output in
// ```json blocks even when explicitly told not to.
function extractJsonArray(raw: string): unknown[] | null {
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]+?)```/);
  if (fence) s = fence[1].trim();
  const start = s.indexOf('[');
  const end = s.lastIndexOf(']');
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(s.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function clamp(n: unknown, lo: number, hi: number, fallback: number): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return fallback;
  return Math.max(lo, Math.min(hi, n));
}

function asEnum<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

function asStringArray(v: unknown, max: number): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => (typeof x === 'string' ? x.trim() : ''))
    .filter((s) => s.length > 0 && s.length < 40)
    .slice(0, max);
}

// Maps LLM-emitted headline ids back onto the original news list. The
// model can either return numeric indices or string ids; both work.
function resolveHeadlines(ids: unknown, news: NewsArticle[]): ThemeHeadline[] {
  if (!Array.isArray(ids)) return [];
  const resolved: ThemeHeadline[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    let idx: number | null = null;
    if (typeof id === 'number' && Number.isFinite(id)) idx = Math.floor(id);
    else if (typeof id === 'string') {
      const parsed = parseInt(id.replace(/[^0-9]/g, ''), 10);
      if (!Number.isNaN(parsed)) idx = parsed;
    }
    if (idx === null || idx < 0 || idx >= news.length) continue;
    if (seen.has(news[idx].id)) continue;
    seen.add(news[idx].id);
    resolved.push({
      source: news[idx].source,
      text: news[idx].title,
      time: isoToRelative(news[idx].publishedAt),
      url: news[idx].url ?? null,
    });
    if (resolved.length >= 5) break;
  }
  return resolved;
}

function normaliseTheme(raw: unknown, news: NewsArticle[]): MacroTheme | null {
  if (!raw || typeof raw !== 'object') return null;
  const t = raw as Record<string, unknown>;
  const title = typeof t.title === 'string' ? t.title.trim() : '';
  const summary = typeof t.summary === 'string' ? t.summary.trim() : '';
  if (!title || !summary) return null;
  const headlines = resolveHeadlines(t.headlineIds ?? t.headline_ids, news);
  // A theme with zero supporting headlines is almost certainly an
  // invention — discard it so the UI doesn't surface ungrounded
  // narratives.
  if (headlines.length === 0) return null;
  return {
    id:
      typeof t.id === 'string' && /^[a-z0-9-]+$/i.test(t.id)
        ? t.id.toLowerCase()
        : title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40),
    title: title.slice(0, 60),
    sentiment: asEnum(t.sentiment, ['bullish', 'bearish', 'neutral'] as const, 'neutral'),
    momentum: Math.round(clamp(t.momentum, -3, 3, 0)),
    impact: asEnum(t.impact, ['low', 'medium', 'high'] as const, 'medium'),
    summary: summary.slice(0, 280),
    tickers: asStringArray(t.tickers, 6).map((s) => s.toUpperCase()),
    regions: asStringArray(t.regions, 4),
    headlines,
  };
}

// Honest fallback when the LLM is offline. Reads the headline list
// and rolls up a single "raw feed" theme so the UI still shows
// something useful and clearly labelled instead of going blank.
function fallbackThemes(news: NewsArticle[]): MacroTheme[] {
  if (news.length === 0) return [];
  return [
    {
      id: 'live-feed-rollup',
      title: 'Live feed (uncategorised)',
      sentiment: 'neutral',
      momentum: 0,
      impact: 'medium',
      summary:
        'AI clustering is offline. Top headlines from the live news feed, ' +
        'shown without theme grouping. Themes return once the LLM provider ' +
        'is reachable again.',
      tickers: [],
      regions: [],
      headlines: news.slice(0, 5).map((n) => ({
        source: n.source,
        text: n.title,
        time: isoToRelative(n.publishedAt),
        url: n.url,
      })),
    },
  ];
}

export async function getMacroThemes(): Promise<{ themes: MacroTheme[]; generatedAt: string }> {
  if (cache && cache.expiresAt > Date.now()) {
    return { themes: cache.themes, generatedAt: cache.generatedAt };
  }

  const news = await fetchLiveNews();
  if (news.length === 0) {
    const empty = { themes: [] as MacroTheme[], generatedAt: new Date().toISOString() };
    cache = { ...empty, expiresAt: Date.now() + 5 * 60_000 };
    return empty;
  }

  // Compact input — LLM gets just enough to cluster on. Sending full
  // article bodies bloats tokens without improving clustering quality.
  const compact = news.slice(0, 30).map((n, i) => ({
    id: i,
    title: n.title,
    source: n.source,
    category: n.category,
    publishedAt: n.publishedAt,
  }));

  const userMessage =
    `Cluster the following ${compact.length} financial headlines into 3 to 6 ` +
    `narrative THEMES. Each theme groups headlines that are about the same ` +
    `underlying story or driver. Reply with a JSON array only, no commentary ` +
    `outside it. Each theme object MUST shape exactly:\n` +
    `  id (kebab-case), title (short), sentiment ("bullish"|"bearish"|"neutral"),\n` +
    `  momentum (integer -3..3 — how the theme is trending recently),\n` +
    `  impact ("low"|"medium"|"high"),\n` +
    `  summary (1-2 sentences, ≤280 chars),\n` +
    `  tickers (array of 2-6 affected symbols),\n` +
    `  regions (array of 1-3 region names),\n` +
    `  headlineIds (array of the input "id" integers that support this theme).\n` +
    `Group by story, not by source. Skip headlines that don't cluster.\n\n` +
    JSON.stringify(compact);

  const reply = await callLlm({
    systemPrompt:
      'You are ChartSentinel AI, a market analyst. Cluster news headlines into ' +
      'macro themes. Reply with strict JSON only — an array of theme objects. ' +
      'Never invent a headline that is not in the input. Never recommend trades.',
    userMessage,
    maxTokens: 1500,
  });

  if (!reply) {
    const generatedAt = new Date().toISOString();
    const themes = fallbackThemes(news);
    cache = { themes, generatedAt, expiresAt: Date.now() + 15 * 60_000 };
    return { themes, generatedAt };
  }

  const parsed = extractJsonArray(reply);
  const themes: MacroTheme[] = [];
  if (Array.isArray(parsed)) {
    for (const t of parsed) {
      const normalised = normaliseTheme(t, news);
      if (normalised) themes.push(normalised);
      if (themes.length >= 6) break;
    }
  }

  const finalThemes = themes.length > 0 ? themes : fallbackThemes(news);
  const generatedAt = new Date().toISOString();
  cache = { themes: finalThemes, generatedAt, expiresAt: Date.now() + CACHE_TTL_MS };
  return { themes: finalThemes, generatedAt };
}

// Test seam for asserting normalisation without the LLM round-trip.
export const __normaliseThemeForTests = normaliseTheme;

// Unified "smart money flow" feed. Combines the two real data
// streams we already have — SEC Form 4 insider trades (with cluster
// detection) and Congress STOCK Act disclosures — into one ranked
// list with optional LLM "why this matters" captions per row.
//
// The two sources we previously mocked (13F deltas and on-chain
// whales) need data providers we haven't wired yet (Whalewisdom,
// WhaleAlert). They're omitted rather than faked — the SmartMoney
// page chips show only the categories we can actually populate.

import {
  fetchRecentForm4s,
  detectClusterBuys,
  type InsiderTrade,
  type ClusterBuy,
} from './insider.service';
import { fetchCongressTrades, type CongressTrade } from './congress.service';
import { callLlm } from './ai.service';

export type SmartMoneySource = 'congress' | 'insider-cluster' | 'insider-trade';

export interface SmartMoneyEntry {
  id: string;
  source: SmartMoneySource;
  actor: string;
  // BUY / SELL / CLUSTER_BUY — the chips colour off this.
  action: string;
  ticker: string;
  amount: string;
  date: string;
  // 0–100 unusualness score. Heuristics per source (cluster size,
  // officer rank, dollar magnitude); not a probability — just an
  // ordering signal so the feed ranks the most distinctive prints
  // first.
  unusual: number;
  // What the row actually says, before LLM narration. Used as a
  // fallback when narration is off or the LLM call fails.
  baseNote: string;
  // LLM-generated one-line caption explaining why the row matters.
  // Optional — page is fine without it; gating is at the endpoint.
  caption: string | null;
  url: string | null;
}

interface CacheEntry {
  entries: SmartMoneyEntry[];
  generatedAt: string;
  expiresAt: number;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1h — these feeds don't move faster
let cache: CacheEntry | null = null;

export function __resetCacheForTests(): void {
  cache = null;
}

// "$50K – $100K" → 75000 midpoint. Used to rank Congress trades by
// magnitude. Returns 0 for unparseable strings so they fall to the
// bottom rather than blowing up the sort.
function parseAmountRange(s: string): number {
  if (!s) return 0;
  const nums = s.replace(/[$,]/g, '').match(/[\d.]+/g);
  if (!nums || nums.length === 0) return 0;
  // Strings often look like "1000 - 15000" or "1,000,001 +".
  const values = nums.map((n) => parseFloat(n)).filter((n) => Number.isFinite(n));
  if (values.length === 0) return 0;
  return values.reduce((s2, v) => s2 + v, 0) / values.length;
}

function shortFormatUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n.toFixed(0)}`;
}

function actorLabelForInsider(t: InsiderTrade): string {
  const role = t.officerTitle
    ? t.officerTitle
    : t.isOfficer
      ? 'Officer'
      : t.isDirector
        ? 'Director'
        : t.isTenPercentOwner
          ? '10% owner'
          : 'Insider';
  return `${role}, ${t.ticker}`;
}

// 0-100 score for an individual insider trade. Officer rank +
// $-magnitude bump, capped so a single eye-popping number doesn't
// crowd out clusters in the feed.
function unusualForInsiderTrade(t: InsiderTrade): number {
  let score = 30;
  if (t.isOfficer) score += 20;
  if (t.officerTitle && /(CEO|CFO|COO|Chair)/i.test(t.officerTitle)) score += 15;
  if (t.value >= 5_000_000) score += 20;
  else if (t.value >= 1_000_000) score += 10;
  else if (t.value >= 250_000) score += 5;
  if (t.type === 'Buy') score += 10; // open-market buys are rarer than sells
  return Math.min(95, score);
}

// Cluster of 3+ insiders buying same ticker over a short window is
// historically a stronger signal than any single trade — base score
// reflects that.
function unusualForCluster(c: ClusterBuy): number {
  let score = 70;
  if (c.buyerCount >= 5) score += 15;
  else if (c.buyerCount >= 4) score += 10;
  if (c.totalValue >= 5_000_000) score += 10;
  else if (c.totalValue >= 1_000_000) score += 5;
  return Math.min(99, score);
}

function unusualForCongress(t: CongressTrade): number {
  let score = 40;
  const mid = parseAmountRange(t.amount);
  if (mid >= 500_000) score += 25;
  else if (mid >= 100_000) score += 15;
  else if (mid >= 15_000) score += 8;
  if (/Buy|Purchase/i.test(t.action)) score += 5;
  return Math.min(92, score);
}

function dateKey(s: string): string {
  // Date-only key for stable id hashing. The full ISO can carry a
  // time component that varies by source; trimming to the day keeps
  // the same trade idempotent across refreshes.
  return s.slice(0, 10);
}

// ── LLM narration ───────────────────────────────────────────────────

interface NarrationOut {
  id: string;
  caption: string;
}

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

async function narrateEntries(entries: SmartMoneyEntry[]): Promise<SmartMoneyEntry[]> {
  if (entries.length === 0) return entries;
  const compact = entries.slice(0, 12).map((e, i) => ({
    id: `s${i}`,
    source: e.source,
    actor: e.actor,
    action: e.action,
    ticker: e.ticker,
    amount: e.amount,
    date: e.date,
    note: e.baseNote,
  }));
  const prompt =
    'For each smart-money trade below, write a one-sentence caption (≤22 words) ' +
    'explaining why it is interesting for market watchers — what makes the print ' +
    'distinctive (role of the buyer, size relative to history, cluster pattern, ' +
    'etc.). Do not recommend trades. Strict JSON array reply: ' +
    '[{"id":"s0","caption":"..."}].\n\n' +
    JSON.stringify(compact);

  const reply = await callLlm({
    systemPrompt:
      'You are ChartSentinel AI. Reply with strict JSON only — an array of ' +
      '{"id","caption"} objects. Never recommend trades.',
    userMessage: prompt,
    maxTokens: 700,
  });
  if (!reply) return entries;

  const parsed = extractJsonArray(reply);
  if (!parsed) return entries;
  const byId = new Map<string, string>();
  for (const r of parsed) {
    if (r && typeof r === 'object' && 'id' in r && 'caption' in r) {
      const c = String((r as NarrationOut).caption).trim();
      const id = String((r as NarrationOut).id);
      if (c && id) byId.set(id, c);
    }
  }
  return entries.map((e, i) => ({
    ...e,
    caption: byId.get(`s${i}`) ?? e.caption,
  }));
}

// ── Aggregation ─────────────────────────────────────────────────────

function timeAgo(date: string): string {
  const then = new Date(date + 'T00:00:00Z').getTime();
  if (!Number.isFinite(then)) return '';
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return '1d ago';
  return `${days}d ago`;
}

export async function getSmartMoneyFeed(options: { narrate?: boolean } = {}): Promise<{
  entries: SmartMoneyEntry[];
  generatedAt: string;
  cached: boolean;
}> {
  if (cache && cache.expiresAt > Date.now()) {
    return { entries: cache.entries, generatedAt: cache.generatedAt, cached: true };
  }

  const [insiderTrades, congressTrades] = await Promise.all([
    fetchRecentForm4s().catch(() => [] as InsiderTrade[]),
    fetchCongressTrades().catch(() => [] as CongressTrade[]),
  ]);

  const clusters = detectClusterBuys(insiderTrades);

  const entries: SmartMoneyEntry[] = [];

  for (const c of clusters) {
    entries.push({
      id: `cluster-${c.ticker}-${dateKey(c.latestDate)}`,
      source: 'insider-cluster',
      actor: `${c.buyerCount} insiders, ${c.ticker}`,
      action: 'CLUSTER_BUY',
      ticker: c.ticker,
      amount: shortFormatUsd(c.totalValue),
      date: c.latestDate,
      unusual: unusualForCluster(c),
      baseNote:
        `${c.buyerCount} insiders bought ${c.ticker} between ${dateKey(c.earliestDate)} and ${dateKey(c.latestDate)}` +
        ` for a combined ${shortFormatUsd(c.totalValue)}.`,
      caption: null,
      url: null,
    });
  }

  // Standalone insider trades not already represented by a cluster.
  // Helps surface the eye-popping single CEO buy that wouldn't trigger
  // the cluster detector on its own.
  const clusteredTickers = new Set(clusters.map((c) => c.ticker));
  for (const t of insiderTrades) {
    if (clusteredTickers.has(t.ticker)) continue;
    if (t.value < 100_000) continue; // floor so the feed isn't crowded by trivial fills
    entries.push({
      id: `insider-${t.ticker}-${dateKey(t.date)}-${t.filer.slice(0, 12)}`,
      source: 'insider-trade',
      actor: `${actorLabelForInsider(t)} — ${t.filer}`,
      action: t.type.toUpperCase(),
      ticker: t.ticker,
      amount: shortFormatUsd(t.value),
      date: t.date,
      unusual: unusualForInsiderTrade(t),
      baseNote:
        `${t.filer} ${t.type === 'Buy' ? 'bought' : 'sold'} ${t.shares.toLocaleString()} shares ` +
        `of ${t.ticker} at ~$${t.price.toFixed(2)} (${shortFormatUsd(t.value)}).`,
      caption: null,
      url: t.formUrl,
    });
  }

  for (const ct of congressTrades) {
    if (!ct.ticker || ct.ticker.length > 8) continue; // skip non-ticker disclosures
    entries.push({
      id: `congress-${ct.ticker}-${dateKey(ct.date)}-${ct.member.slice(0, 16)}`,
      source: 'congress',
      actor: `${ct.member} (${ct.chamber})`,
      action: /sale|sell/i.test(ct.action) ? 'SELL' : 'BUY',
      ticker: ct.ticker,
      amount: ct.amount,
      date: ct.date,
      unusual: unusualForCongress(ct),
      baseNote: `${ct.member} disclosed a ${ct.action.toLowerCase()} of ${ct.ticker} (${ct.amount}).`,
      caption: null,
      url: ct.disclosureUrl,
    });
  }

  // Rank by unusualness primarily, date secondarily so newer ties win.
  entries.sort((a, b) =>
    b.unusual - a.unusual || b.date.localeCompare(a.date),
  );
  const top = entries.slice(0, 30);

  let narrated = top;
  if (options.narrate) {
    try {
      narrated = await narrateEntries(top);
    } catch (err) {
      console.warn('[smart-money] narration failed', (err as Error).message);
    }
  }

  const generatedAt = new Date().toISOString();
  cache = { entries: narrated, generatedAt, expiresAt: Date.now() + CACHE_TTL_MS };
  return { entries: narrated, generatedAt, cached: false };
}

// Mostly used by the UI in "X ago" labels alongside the date; exposed
// because callers may want to render the relative label without
// re-implementing the math.
export { timeAgo as smartMoneyTimeAgo };

import { callLlm } from './ai.service';
import type { NewsArticle } from './news-feed.service';

// Per-headline sentiment classifier. We don't run a proper FinBERT
// model — the agentic LLM already in the stack does this cheaply if
// we batch it. One LLM call scores up to 12 headlines, results are
// memoised by URL hash forever (a headline's polarity doesn't
// change).
//
// Output range: −1.0 (very bearish) → +1.0 (very bullish). Anything
// the model couldn't classify (or any non-numeric reply) gets null
// so the UI can render "—" instead of a fake zero.

export interface ScoredArticle extends NewsArticle {
  sentiment: number | null; // -1..+1, null when unavailable
  sentimentLabel: 'bullish' | 'neutral' | 'bearish' | null;
}

const cache = new Map<string, { score: number | null; label: ScoredArticle['sentimentLabel'] }>();
const BATCH_SIZE = 12;

function labelFor(score: number | null): ScoredArticle['sentimentLabel'] {
  if (score === null) return null;
  if (score >= 0.25) return 'bullish';
  if (score <= -0.25) return 'bearish';
  return 'neutral';
}

// Sends a single batch to the LLM. We pin the model to a strict
// machine-readable format because free-tier models love to add
// "Sure! Here's the analysis: ..." preamble that breaks parsing.
async function scoreBatch(articles: NewsArticle[]): Promise<Map<string, number | null>> {
  const result = new Map<string, number | null>();
  if (articles.length === 0) return result;

  // Numbered list keyed to the article's id (sha1 hash). The model
  // returns lines like "1: 0.4" which we parse back into the map.
  const lines = articles
    .map((a, i) => `${i + 1}. [${a.id}] ${a.title}`)
    .join('\n');

  const systemPrompt =
    'You score financial news headlines for short-term market sentiment. ' +
    'For each numbered headline, output one line in the format ' +
    '"<number>: <score>" where score is a number between -1.0 (very bearish) ' +
    'and +1.0 (very bullish), or "0" for neutral. Output only the numbered ' +
    'lines, no commentary, no preamble.';

  const reply = await callLlm({
    systemPrompt,
    userMessage: lines,
    maxTokens: 200,
  });
  if (!reply) {
    for (const a of articles) result.set(a.id, null);
    return result;
  }

  // Parse "1: 0.4" or "1: +0.4" or "1 -> 0.2". Loose enough to survive
  // a model that wandered slightly, strict enough to ignore prose.
  for (const line of reply.split('\n')) {
    const m = line.match(/^\s*(\d+)\s*[:\-=>]+\s*([+\-]?\d+(?:\.\d+)?)/);
    if (!m) continue;
    const idx = parseInt(m[1], 10) - 1;
    const score = parseFloat(m[2]);
    if (idx >= 0 && idx < articles.length && Number.isFinite(score)) {
      const clipped = Math.max(-1, Math.min(1, score));
      result.set(articles[idx].id, clipped);
    }
  }
  // Any article the model skipped gets null so we don't infinite-loop
  // re-asking it on cache misses.
  for (const a of articles) {
    if (!result.has(a.id)) result.set(a.id, null);
  }
  return result;
}

export async function scoreArticles(articles: NewsArticle[]): Promise<ScoredArticle[]> {
  // Partition into cached vs uncached. Anything we've seen before is
  // free.
  const pending: NewsArticle[] = [];
  for (const a of articles) {
    if (!cache.has(a.id)) pending.push(a);
  }
  // Batch the misses so a fetch of 30 articles is one LLM call, not 30.
  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const chunk = pending.slice(i, i + BATCH_SIZE);
    const batchResult = await scoreBatch(chunk);
    for (const [id, score] of batchResult) {
      cache.set(id, { score, label: labelFor(score) });
    }
  }
  return articles.map((a) => {
    const hit = cache.get(a.id);
    return {
      ...a,
      sentiment: hit?.score ?? null,
      sentimentLabel: hit?.label ?? null,
    };
  });
}

// Aggregate sentiment over a scored feed. Returns mean (−1..+1)
// across articles with non-null sentiment plus a simple ratio of
// bullish vs bearish counts. Useful for the homepage "market mood"
// chip and the agentic getNewsSentiment tool.
export function aggregateSentiment(articles: ScoredArticle[]): {
  mean: number | null;
  bullish: number;
  neutral: number;
  bearish: number;
  scored: number;
} {
  let sum = 0;
  let scored = 0;
  let bullish = 0;
  let neutral = 0;
  let bearish = 0;
  for (const a of articles) {
    if (a.sentiment === null) continue;
    sum += a.sentiment;
    scored++;
    if (a.sentimentLabel === 'bullish') bullish++;
    else if (a.sentimentLabel === 'bearish') bearish++;
    else neutral++;
  }
  return {
    mean: scored > 0 ? sum / scored : null,
    bullish,
    neutral,
    bearish,
    scored,
  };
}

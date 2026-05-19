// Batched LLM narration for the Phase B intelligence layer. Both
// anomalies and catalysts share the same pattern: take a list of
// structured rows, ask the LLM for one short caption per row, parse
// JSON back, attach to the original objects. Doing it batched (one
// LLM call per page render rather than one-per-row) keeps cost
// bounded — a typical anomalies page = 1 LLM call, regardless of
// whether there are 5 or 25 rows on it.

import { callLlm } from './ai.service';

interface NarrationRow {
  id: string;
  caption: string;
}

// Strip code fences + extract the first JSON array we find. Free-tier
// models sometimes wrap output in ```json blocks even when told not
// to; this normalises both shapes.
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

// Common narrate helper — caller builds the prompt + row→id mapping,
// we run the LLM call, parse JSON, and merge captions back onto the
// original rows. Returns the input unchanged on any failure so the
// page degrades to "no captions" rather than blanking entirely.
async function narrate<T extends { __id: string }>(
  rows: T[],
  prompt: string,
  maxTokens: number,
): Promise<(T & { caption: string | null })[]> {
  if (rows.length === 0) return rows.map((r) => ({ ...r, caption: null }));
  const reply = await callLlm({
    systemPrompt:
      'You are ChartSentinel AI. Reply in strict JSON only — an array of objects shaped ' +
      '{"id": "<id>", "caption": "<text>"}. No prose outside the array. No commentary. ' +
      'Keep each caption under 22 words. Never recommend trades.',
    userMessage: prompt,
    maxTokens,
  });
  if (!reply) return rows.map((r) => ({ ...r, caption: null }));

  const parsed = extractJsonArray(reply);
  if (!parsed) return rows.map((r) => ({ ...r, caption: null }));
  const byId = new Map<string, string>();
  for (const r of parsed) {
    if (r && typeof r === 'object' && 'id' in r && 'caption' in r) {
      const id = String((r as NarrationRow).id);
      const caption = String((r as NarrationRow).caption).trim();
      if (id && caption) byId.set(id, caption);
    }
  }
  return rows.map((row) => ({
    ...row,
    caption: byId.get(row.__id) ?? null,
  }));
}

// ---- Anomalies ----

export interface AnomalyRow {
  ticker: string;
  asOf?: string | null;
  return?: number | null;
  returnZ?: number | null;
  volumeZ?: number | null;
  maxZ?: number | null;
  type?: 'price' | 'volume' | null;
  caption?: string | null;
}

export async function narrateAnomalies(rows: AnomalyRow[]): Promise<AnomalyRow[]> {
  const compact = rows.slice(0, 12).map((r, i) => ({
    __id: `a${i}`,
    ticker: r.ticker,
    type: r.type,
    returnPct: r.return !== null && r.return !== undefined ? (r.return * 100).toFixed(2) : null,
    returnZ: r.returnZ !== null && r.returnZ !== undefined ? r.returnZ.toFixed(1) : null,
    volumeZ: r.volumeZ !== null && r.volumeZ !== undefined ? r.volumeZ.toFixed(1) : null,
  }));
  const prompt =
    'For each anomaly below, write a one-sentence caption (≤22 words) that ' +
    'states what is unusual in plain English. Mention ticker, direction, and ' +
    'whether the surprise is in price or volume. Do not interpret causes; ' +
    'just describe what the print is.\n\n' +
    JSON.stringify(compact);

  const narrated = await narrate(compact, prompt, 600);

  // Merge back onto the full original list — rows past the 12 we
  // narrated keep caption=null, which is fine.
  const captionById = new Map(narrated.map((r) => [r.__id, r.caption]));
  return rows.map((r, i) => ({
    ...r,
    caption: captionById.get(`a${i}`) ?? null,
  }));
}

// ---- Catalysts ----

export interface CatalystRow {
  date: string;
  type: string;
  label: string;
  notes?: string;
  caption?: string | null;
}

export async function narrateCatalysts(rows: CatalystRow[]): Promise<CatalystRow[]> {
  const compact = rows.slice(0, 20).map((r, i) => ({
    __id: `c${i}`,
    date: r.date,
    type: r.type,
    label: r.label,
    notes: r.notes ?? null,
  }));
  const prompt =
    'For each upcoming macro event below, write a one-sentence "what to ' +
    'watch" caption (≤22 words) — what data point or decision the print ' +
    'reveals, and which assets typically react. No predictions, no trade ' +
    'recommendations. Plain factual setup only.\n\n' +
    JSON.stringify(compact);

  const narrated = await narrate(compact, prompt, 800);
  const captionById = new Map(narrated.map((r) => [r.__id, r.caption]));
  return rows.map((r, i) => ({
    ...r,
    caption: captionById.get(`c${i}`) ?? null,
  }));
}

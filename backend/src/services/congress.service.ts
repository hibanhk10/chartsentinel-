// Congressional trade ingestion. Two real, free sources:
//   - House Stock Watcher: aggregated PTR JSON, S3-hosted
//   - Senate Stock Watcher: same idea for the Senate
// Both maintainers have ebbed and flowed — if either S3 endpoint stops
// returning data, the response will be an empty array (not synthetic noise).
// We never fabricate trades; an empty result is the correct answer.

const HOUSE_URL = 'https://house-stock-watcher-data.s3-us-west-2.amazonaws.com/data/all_transactions.json';
const SENATE_URL = 'https://senate-stock-watcher-data.s3-us-west-2.amazonaws.com/aggregate/all_transactions.json';
const CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_TRADES = 250;

export interface CongressTrade {
  member: string;
  chamber: 'House' | 'Senate';
  ticker: string;
  action: string;
  amount: string;
  date: string;
  disclosureUrl: string;
}

interface CacheEntry<T> {
  expires: number;
  value: T;
}
const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const hit = cache.get(key);
  if (!hit || hit.expires < Date.now()) {
    if (hit) cache.delete(key);
    return null;
  }
  return hit.value as T;
}

function setCached<T>(key: string, value: T): void {
  cache.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
}

interface RawHouseRow {
  representative?: string;
  ticker?: string;
  asset_description?: string;
  type?: string;
  amount?: string;
  transaction_date?: string;
  ptr_link?: string;
}

interface RawSenateRow {
  senator?: string;
  ticker?: string;
  asset_description?: string;
  type?: string;
  amount?: string;
  transaction_date?: string;
  ptr_link?: string;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'ChartSentinel/1.0' } });
    if (!res.ok) {
      console.warn(`[congress] ${url} ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`[congress] ${url} fetch failed`, err);
    return null;
  }
}

function normalizeTicker(t: string | undefined): string {
  if (!t) return '';
  const cleaned = t.trim().toUpperCase();
  // Source occasionally fills "--" or "N/A" when the asset isn't a listed equity.
  if (cleaned === '--' || cleaned === 'N/A' || cleaned === 'NULL') return '';
  return cleaned;
}

function normalizeDate(d: string | undefined): string {
  if (!d) return '';
  // Most rows are ISO already; some are MM/DD/YYYY.
  const iso = d.match(/^\d{4}-\d{2}-\d{2}/);
  if (iso) return iso[0];
  const us = d.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (us) return `${us[3]}-${us[1]}-${us[2]}`;
  return '';
}

export async function fetchCongressTrades(): Promise<CongressTrade[]> {
  const cached = getCached<CongressTrade[]>('congress');
  if (cached) return cached;

  const [houseRaw, senateRaw] = await Promise.all([
    fetchJson<RawHouseRow[]>(HOUSE_URL),
    fetchJson<RawSenateRow[]>(SENATE_URL),
  ]);

  const trades: CongressTrade[] = [];

  if (Array.isArray(houseRaw)) {
    for (const r of houseRaw) {
      const ticker = normalizeTicker(r.ticker);
      const date = normalizeDate(r.transaction_date);
      if (!ticker || !date || !r.representative || !r.type) continue;
      trades.push({
        member: r.representative,
        chamber: 'House',
        ticker,
        action: r.type,
        amount: r.amount ?? '',
        date,
        disclosureUrl: r.ptr_link ?? 'https://disclosures-clerk.house.gov/FinancialDisclosure',
      });
    }
  }

  if (Array.isArray(senateRaw)) {
    for (const r of senateRaw) {
      const ticker = normalizeTicker(r.ticker);
      const date = normalizeDate(r.transaction_date);
      if (!ticker || !date || !r.senator || !r.type) continue;
      trades.push({
        member: r.senator,
        chamber: 'Senate',
        ticker,
        action: r.type,
        amount: r.amount ?? '',
        date,
        disclosureUrl: r.ptr_link ?? 'https://efdsearch.senate.gov/search/',
      });
    }
  }

  trades.sort((a, b) => b.date.localeCompare(a.date));
  const trimmed = trades.slice(0, MAX_TRADES);
  setCached('congress', trimmed);
  return trimmed;
}

// SEC EDGAR Form 4 ingestion. Two-step parse: Atom feed → filing index page →
// Form 4 XML. Throttled to satisfy SEC's 10 req/s ceiling. SEC requires a
// real User-Agent with contact info; failures to provide one return 403.

import prisma from '../config/db';

const SEC_UA = 'ChartSentinel/1.0 (chartsentinel.com@gmail.com)';
const RSS_URL =
  'https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&CIK=&type=4&company=&dateb=&owner=include&start=0&count=80&output=atom';
const SEC_THROTTLE_MS = 120;
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_TRADES = 60;

export interface InsiderTrade {
  filer: string;
  ticker: string;
  type: 'Buy' | 'Sell';
  shares: number;
  price: number;
  value: number;
  date: string;
  formUrl: string;
  officerTitle: string | null;
  isOfficer: boolean;
  isDirector: boolean;
  isTenPercentOwner: boolean;
}

export interface ClusterBuy {
  ticker: string;
  buyerCount: number;
  totalValue: number;
  buyers: string[];
  earliestDate: string;
  latestDate: string;
}

interface CacheEntry<T> {
  expires: number;
  value: T;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.expires < Date.now()) {
    cache.delete(key);
    return null;
  }
  return hit.value as T;
}

function setCached<T>(key: string, value: T, ttlMs = CACHE_TTL_MS): void {
  cache.set(key, { value, expires: Date.now() + ttlMs });
}

async function secFetch(url: string): Promise<string | null> {
  const res = await fetch(url, {
    headers: { 'User-Agent': SEC_UA, Accept: 'application/atom+xml,application/xml,text/xml,text/html' },
  });
  if (!res.ok) {
    console.warn(`[insider] SEC fetch ${res.status} for ${url}`);
    return null;
  }
  return res.text();
}

// Extracts the first capture group of a non-greedy regex against XML.
// We avoid pulling in an XML parser dep — Form 4 schema is stable and the
// fields we need are unambiguous in their tag names.
function pick(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`));
  return m ? m[1].trim() : null;
}

// transactionShares, transactionPricePerShare, etc. wrap the actual number
// in a <value>…</value> child. Pick the inner value if present.
function pickValue(xml: string, tag: string): string | null {
  const block = pick(xml, tag);
  if (!block) return null;
  const inner = pick(block, 'value');
  return inner ?? block;
}

export function parseForm4(xml: string, formUrl: string): InsiderTrade | null {
  const ticker = pick(xml, 'issuerTradingSymbol');
  const filer = pick(xml, 'rptOwnerName');
  if (!ticker || !filer) return null;

  // Officer / director / 10% owner flags drive the C-suite filter.
  const isOfficer = /<isOfficer>(?:<value>)?(?:1|true)/i.test(xml);
  const isDirector = /<isDirector>(?:<value>)?(?:1|true)/i.test(xml);
  const isTenPercentOwner = /<isTenPercentOwner>(?:<value>)?(?:1|true)/i.test(xml);
  const officerTitle = pickValue(xml, 'officerTitle');

  // Only first non-derivative transaction; gifts (price 0) and derivatives skipped.
  const txMatch = xml.match(/<nonDerivativeTransaction>([\s\S]*?)<\/nonDerivativeTransaction>/);
  if (!txMatch) return null;
  const tx = txMatch[1];

  const sharesStr = pickValue(tx, 'transactionShares');
  const priceStr = pickValue(tx, 'transactionPricePerShare');
  const adCode = pickValue(tx, 'transactionAcquiredDisposedCode');
  const dateStr = pickValue(tx, 'transactionDate') ?? pickValue(xml, 'periodOfReport');
  if (!sharesStr || !priceStr || !adCode) return null;

  const shares = parseFloat(sharesStr);
  const price = parseFloat(priceStr);
  if (!Number.isFinite(shares) || !Number.isFinite(price) || price === 0) return null;

  const isBuy = adCode.toUpperCase() === 'A';
  const date = (dateStr || new Date().toISOString().slice(0, 10)).slice(0, 10);

  return {
    filer,
    ticker,
    type: isBuy ? 'Buy' : 'Sell',
    shares,
    price,
    value: shares * price,
    date,
    formUrl,
    officerTitle,
    isOfficer,
    isDirector,
    isTenPercentOwner,
  };
}

async function resolveForm4Xml(indexHref: string): Promise<InsiderTrade | null> {
  const html = await secFetch(indexHref);
  if (!html) return null;
  // The filing index lists every artifact; the primary Form 4 doc is the
  // first .xml under /Archives/edgar/data/. The decorative XSLT-rendered
  // `xslF345*` paths still resolve to the same XML if we strip the xslt
  // prefix, but the bare .xml is simpler and equivalent.
  const m = html.match(/\/Archives\/edgar\/data\/\d+\/\d+\/[A-Za-z0-9_-]+\.xml/);
  if (!m) return null;
  const xml = await secFetch(`https://www.sec.gov${m[0]}`);
  if (!xml) return null;
  return parseForm4(xml, indexHref);
}

export async function fetchRecentForm4s(): Promise<InsiderTrade[]> {
  const cached = getCached<InsiderTrade[]>('form4');
  if (cached) return cached;

  const atom = await secFetch(RSS_URL);
  if (!atom) return [];

  const links: string[] = [];
  const linkRe = /<link[^>]*href="([^"]+)"[^>]*\/>/g;
  let lm: RegExpExecArray | null;
  while ((lm = linkRe.exec(atom))) {
    const href = lm[1];
    if (href.includes('/Archives/edgar/data/') && href.endsWith('-index.htm')) {
      links.push(href);
    }
  }

  const trades: InsiderTrade[] = [];
  for (const href of links) {
    if (trades.length >= MAX_TRADES) break;
    const t = await resolveForm4Xml(href);
    if (t) trades.push(t);
    await new Promise((r) => setTimeout(r, SEC_THROTTLE_MS));
  }

  trades.sort((a, b) => b.date.localeCompare(a.date));
  setCached('form4', trades);
  return trades;
}

// Cluster-buy detector: tickers where ≥3 distinct insiders bought within a
// rolling window. This is the actual alpha signal — single insider buys are
// noisy, clusters are the documented edge (see Cohen, Malloy, Pomorski 2012).
export function detectClusterBuys(
  trades: InsiderTrade[],
  windowDays = 14,
  minBuyers = 3,
): ClusterBuy[] {
  const buys = trades.filter((t) => t.type === 'Buy');
  const byTicker = new Map<string, InsiderTrade[]>();
  for (const t of buys) {
    const arr = byTicker.get(t.ticker) ?? [];
    arr.push(t);
    byTicker.set(t.ticker, arr);
  }

  const clusters: ClusterBuy[] = [];
  for (const [ticker, list] of byTicker) {
    const buyers = new Set(list.map((t) => t.filer));
    if (buyers.size < minBuyers) continue;
    const dates = list.map((t) => new Date(t.date).getTime()).sort((a, b) => a - b);
    const spanDays = (dates[dates.length - 1] - dates[0]) / 86_400_000;
    if (spanDays > windowDays) continue;
    clusters.push({
      ticker,
      buyerCount: buyers.size,
      totalValue: list.reduce((s, t) => s + t.value, 0),
      buyers: [...buyers],
      earliestDate: list.reduce((m, t) => (t.date < m ? t.date : m), list[0].date),
      latestDate: list.reduce((m, t) => (t.date > m ? t.date : m), list[0].date),
    });
  }
  return clusters.sort((a, b) => b.totalValue - a.totalValue);
}

// ── Persistence ────────────────────────────────────────────────────────────
// The live endpoint serves a 5-min cache of the last ~60 EDGAR filings.
// Cluster detection over a 14-day window is statistically meaningful only
// across weeks of accumulated data, so we snapshot filings into Postgres
// on every snapshot run and re-detect over the persistent set.

export interface SnapshotResult {
  filingsFetched: number;
  filingsInserted: number;
  filingsSkipped: number;
  clustersDetected: number;
  clustersInserted: number;
}

// Upserts the freshly-fetched Form 4s into `insider_filings`. formUrl is
// the natural unique key, so a re-fetch of the same filing is a no-op
// rather than a duplicate row.
export async function persistFilings(trades: InsiderTrade[]): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0;
  let skipped = 0;
  for (const t of trades) {
    const result = await prisma.insiderFiling.upsert({
      where: { formUrl: t.formUrl },
      create: {
        formUrl: t.formUrl,
        filer: t.filer,
        ticker: t.ticker,
        type: t.type,
        shares: t.shares,
        price: t.price,
        value: t.value,
        filingDate: new Date(t.date),
        officerTitle: t.officerTitle,
        isOfficer: t.isOfficer,
        isDirector: t.isDirector,
        isTenPercentOwner: t.isTenPercentOwner,
      },
      update: {}, // The same filing should never change; ignore conflicts.
      select: { capturedAt: true, id: true },
    });
    // capturedAt within 1s of now ⇒ the row was just created. Prisma's
    // upsert doesn't expose "was inserted" directly, so we infer.
    if (Date.now() - result.capturedAt.getTime() < 1000) inserted++;
    else skipped++;
  }
  return { inserted, skipped };
}

// Pulls the last `windowDays` worth of stored filings and re-converts them
// back into the in-memory shape the cluster detector expects. Used by the
// snapshot job and the history endpoint.
export async function loadRecentStoredFilings(windowDays = 30): Promise<InsiderTrade[]> {
  const since = new Date(Date.now() - windowDays * 86_400_000);
  const rows = await prisma.insiderFiling.findMany({
    where: { filingDate: { gte: since } },
    orderBy: { filingDate: 'desc' },
  });
  return rows.map((r) => ({
    filer: r.filer,
    ticker: r.ticker,
    type: r.type as 'Buy' | 'Sell',
    shares: r.shares,
    price: r.price,
    value: r.value,
    date: r.filingDate.toISOString().slice(0, 10),
    formUrl: r.formUrl,
    officerTitle: r.officerTitle,
    isOfficer: r.isOfficer,
    isDirector: r.isDirector,
    isTenPercentOwner: r.isTenPercentOwner,
  }));
}

// Materialises detected clusters. (ticker, latestDate) is unique on the
// table, so re-running the detector across overlapping windows produces a
// no-op for already-known events.
export async function persistClusters(clusters: ClusterBuy[]): Promise<{ inserted: number }> {
  let inserted = 0;
  for (const c of clusters) {
    try {
      await prisma.clusterBuyEvent.create({
        data: {
          ticker: c.ticker,
          buyerCount: c.buyerCount,
          totalValue: c.totalValue,
          buyers: c.buyers,
          earliestDate: new Date(c.earliestDate),
          latestDate: new Date(c.latestDate),
        },
      });
      inserted++;
    } catch (err) {
      // P2002 = unique-constraint violation on (ticker, latestDate). We
      // already saw this exact cluster — fine to skip silently.
      if ((err as { code?: string }).code !== 'P2002') throw err;
    }
  }
  return { inserted };
}

// One-shot: fetch live → persist → re-detect over 30d → persist new
// clusters. Returns counts so the cron caller can log meaningful stats.
export async function runInsiderSnapshot(): Promise<SnapshotResult> {
  const fresh = await fetchRecentForm4s();
  const filings = await persistFilings(fresh);

  const recent = await loadRecentStoredFilings(30);
  const clusters = detectClusterBuys(recent);
  const clusterResult = await persistClusters(clusters);

  return {
    filingsFetched: fresh.length,
    filingsInserted: filings.inserted,
    filingsSkipped: filings.skipped,
    clustersDetected: clusters.length,
    clustersInserted: clusterResult.inserted,
  };
}

export interface ClusterHistoryEntry {
  id: string;
  ticker: string;
  buyerCount: number;
  totalValue: number;
  buyers: string[];
  earliestDate: string;
  latestDate: string;
  detectedAt: string;
}

export async function loadClusterHistory(days = 30, limit = 50): Promise<ClusterHistoryEntry[]> {
  const since = new Date(Date.now() - days * 86_400_000);
  const rows = await prisma.clusterBuyEvent.findMany({
    where: { detectedAt: { gte: since } },
    orderBy: { detectedAt: 'desc' },
    take: limit,
  });
  return rows.map((r) => ({
    id: r.id,
    ticker: r.ticker,
    buyerCount: r.buyerCount,
    totalValue: r.totalValue,
    buyers: r.buyers,
    earliestDate: r.earliestDate.toISOString().slice(0, 10),
    latestDate: r.latestDate.toISOString().slice(0, 10),
    detectedAt: r.detectedAt.toISOString(),
  }));
}

export interface ClusterPerformanceEntry extends ClusterHistoryEntry {
  priceAtCluster: number | null;
  priceLatest: number | null;
  returnPct: number | null; // % return from cluster latestDate to most-recent close
  daysHeld: number;
}

interface YahooBar {
  date: string;
  close: number;
}

// Picks the close on or before `dateStr`. The detection date may fall
// on a weekend or holiday — walk back until we find a trading day. If
// the cluster is too recent for any close yet, returns null.
function priceOnOrBefore(bars: YahooBar[], dateStr: string): number | null {
  for (let i = bars.length - 1; i >= 0; i--) {
    if (bars[i].date <= dateStr) return bars[i].close;
  }
  return null;
}

// Public Caught-it wall: returns each historical cluster decorated with
// the forward return since the cluster's `latestDate`. We dedupe ticker
// fetches so a flurry of clusters on the same ticker only hits Yahoo
// once per request; the engine's own cache further protects us across
// requests.
export async function loadClusterPerformance(
  days: number,
  limit: number,
): Promise<ClusterPerformanceEntry[]> {
  const since = new Date(Date.now() - days * 86_400_000);
  const rows = await prisma.clusterBuyEvent.findMany({
    where: { detectedAt: { gte: since } },
    orderBy: { detectedAt: 'desc' },
    take: limit,
  });

  // engine.js is the canonical Yahoo data path; importing it here keeps
  // the price logic in one place rather than re-implementing the fetch.
  // Lazy-loaded so the module stays decoupled — Vitest mocks the
  // service without needing a Yahoo round-trip.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const engine = await import('../signals/engine.js');
  const fetchYahoo: (ticker: string, years?: number) => Promise<YahooBar[]> =
    (engine as { fetchYahooHistory: typeof fetchYahoo }).fetchYahooHistory;

  // Translate equity tickers to Yahoo's symbols. Plain stocks pass
  // through unchanged; FX symbols already carry the `=X` suffix from
  // signals/engine.js so no remap is needed.
  const tickerToYahoo = (t: string) => t;

  const uniqueTickers = [...new Set(rows.map((r) => tickerToYahoo(r.ticker)))];
  const priceCache = new Map<string, YahooBar[]>();
  await Promise.all(
    uniqueTickers.map(async (t) => {
      try {
        const bars = await fetchYahoo(t, 1);
        priceCache.set(t, Array.isArray(bars) ? bars : []);
      } catch (err) {
        console.warn(`[insider] price fetch failed for ${t}`, (err as Error).message);
        priceCache.set(t, []);
      }
    }),
  );

  return rows.map((r) => {
    const bars = priceCache.get(tickerToYahoo(r.ticker)) ?? [];
    const latestDateStr = r.latestDate.toISOString().slice(0, 10);
    const priceAtCluster = priceOnOrBefore(bars, latestDateStr);
    const priceLatest = bars.length > 0 ? bars[bars.length - 1].close : null;
    const returnPct =
      priceAtCluster && priceLatest && priceAtCluster > 0
        ? ((priceLatest - priceAtCluster) / priceAtCluster) * 100
        : null;
    const daysHeld = Math.floor((Date.now() - r.latestDate.getTime()) / 86_400_000);

    return {
      id: r.id,
      ticker: r.ticker,
      buyerCount: r.buyerCount,
      totalValue: r.totalValue,
      buyers: r.buyers,
      earliestDate: r.earliestDate.toISOString().slice(0, 10),
      latestDate: latestDateStr,
      detectedAt: r.detectedAt.toISOString(),
      priceAtCluster,
      priceLatest,
      returnPct,
      daysHeld,
    };
  });
}

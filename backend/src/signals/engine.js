/**
 * ChartSentinel Signal Engine
 *
 * Modules:
 *   1. Data Ingestion — COT, macro (FRED), historical prices (Yahoo Finance)
 *   2. Seasonality Engine — average historical returns by calendar day
 *   3. COT Scoring — net speculative positioning normalized to Z-scores
 *   4. Pattern Matching — nearest-neighbour correlation over price history
 *   5. Composite Scoring — weighted aggregate score per asset
 */

// ── Simple Cache (reusable) ─────────────────────────────────────────────────

class SignalCache {
  constructor() {
    this.cache = new Map();
  }
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }
  set(key, data, ttlMs) {
    this.cache.set(key, { data, expiry: Date.now() + ttlMs });
  }
}

const cache = new SignalCache();

// Cache TTLs
const ONE_HOUR = 3600_000;
const SIX_HOURS = 21_600_000;
const ONE_DAY = 86_400_000;
const _ONE_WEEK = 604_800_000;

// ── 1. DATA INGESTION ───────────────────────────────────────────────────────

// Forex pairs we support (start narrow as recommended)
const FOREX_PAIRS = [
  'EURUSD=X',
  'GBPUSD=X',
  'USDJPY=X',
  'AUDUSD=X',
  'USDCAD=X',
  'USDCHF=X',
  'NZDUSD=X',
  'EURGBP=X',
];

const CRYPTO_PAIRS = ['BTC-USD', 'ETH-USD', 'SOL-USD', 'XRP-USD', 'ADA-USD'];

const STOCK_TICKERS = [
  'AAPL',
  'MSFT',
  'GOOGL',
  'AMZN',
  'NVDA',
  'TSLA',
  'META',
  'SPY',
  'QQQ',
  'DIA',
];

const ALL_TICKERS = [...FOREX_PAIRS, ...CRYPTO_PAIRS, ...STOCK_TICKERS];

/**
 * Fetch historical daily prices from Yahoo Finance (free, no API key needed).
 * Returns array of { date, open, high, low, close, volume }.
 */
async function fetchYahooHistory(ticker, years = 10) {
  const cacheKey = `yahoo_${ticker}_${years}y`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const period2 = Math.floor(Date.now() / 1000);
  const period1 = period2 - years * 365.25 * 86400;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?period1=${Math.floor(period1)}&period2=${period2}&interval=1d`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout per ticker
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ChartSentinel/1.0)' },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!resp.ok) throw new Error(`Yahoo HTTP ${resp.status}`);
    const json = await resp.json();
    const result = json.chart?.result?.[0];
    if (!result) throw new Error('No data from Yahoo');

    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};
    const data = timestamps
      .map((ts, i) => ({
        date: new Date(ts * 1000).toISOString().split('T')[0],
        open: quotes.open?.[i],
        high: quotes.high?.[i],
        low: quotes.low?.[i],
        close: quotes.close?.[i],
        volume: quotes.volume?.[i],
      }))
      .filter((d) => d.close != null);

    cache.set(cacheKey, data, SIX_HOURS);
    return data;
  } catch (err) {
    console.error(`[Yahoo] Failed for ${ticker}:`, err.message);
    return [];
  }
}

/**
 * Fetch FRED macro data (free API, key optional for basic access).
 * Series IDs: DFF (Fed Funds Rate), CPIAUCSL (CPI), UNRATE (Unemployment), etc.
 */
async function fetchFredSeries(seriesId) {
  const cacheKey = `fred_${seriesId}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const apiKey = process.env.FRED_API_KEY || 'DEMO_KEY';
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=100`;

  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`FRED HTTP ${resp.status}`);
    const json = await resp.json();
    const data = (json.observations || [])
      .map((o) => ({
        date: o.date,
        value: parseFloat(o.value) || null,
      }))
      .filter((d) => d.value != null);

    cache.set(cacheKey, data, ONE_DAY);
    return data;
  } catch (err) {
    console.error(`[FRED] Failed for ${seriesId}:`, err.message);
    return [];
  }
}

/**
 * Fetch CFTC Commitment of Traders data (free, from CFTC public API).
 * Returns positioning data for major Forex futures.
 */
async function fetchCOTData() {
  const cacheKey = 'cot_latest';
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  // CFTC Socrata API — Traders in Financial Futures
  const url =
    'https://publicreporting.cftc.gov/resource/jun7-fc8e.json?$limit=200&$order=report_date_as_yyyy_mm_dd DESC&$where=report_date_as_yyyy_mm_dd > "' +
    new Date(Date.now() - 90 * ONE_DAY).toISOString().split('T')[0] +
    '"';

  try {
    const resp = await fetch(url, {
      headers: { Accept: 'application/json' },
    });
    if (!resp.ok) throw new Error(`CFTC HTTP ${resp.status}`);
    const raw = await resp.json();

    // Map CFTC contract names to our currency symbols
    const currencyMap = {
      'EURO FX': 'EUR',
      'JAPANESE YEN': 'JPY',
      'BRITISH POUND': 'GBP',
      'AUSTRALIAN DOLLAR': 'AUD',
      'CANADIAN DOLLAR': 'CAD',
      'SWISS FRANC': 'CHF',
      'NEW ZEALAND DOLLAR': 'NZD',
      'U.S. DOLLAR INDEX': 'USD',
    };

    const data = raw
      .filter((r) => {
        const name = (r.contract_market_name || '').toUpperCase();
        return Object.keys(currencyMap).some((k) => name.includes(k));
      })
      .map((r) => {
        const name = (r.contract_market_name || '').toUpperCase();
        const currency =
          Object.entries(currencyMap).find(([k]) => name.includes(k))?.[1] || 'UNKNOWN';
        return {
          currency,
          date: r.report_date_as_yyyy_mm_dd,
          noncommLong: parseInt(r.noncomm_positions_long_all, 10) || 0,
          noncommShort: parseInt(r.noncomm_positions_short_all, 10) || 0,
          commLong: parseInt(r.comm_positions_long_all, 10) || 0,
          commShort: parseInt(r.comm_positions_short_all, 10) || 0,
          netSpeculative:
            (parseInt(r.noncomm_positions_long_all, 10) || 0) -
            (parseInt(r.noncomm_positions_short_all, 10) || 0),
        };
      });

    cache.set(cacheKey, data, ONE_DAY);
    return data;
  } catch (err) {
    console.error('[COT] Failed:', err.message);
    return [];
  }
}

// ── 2. SEASONALITY ENGINE ───────────────────────────────────────────────────

/**
 * Compute seasonality curve for a ticker.
 * Groups historical daily returns by trading day of year, averages across years.
 * Returns { curve: [{dayOfYear, avgReturn, winRate}], years }
 */
function computeSeasonality(priceData, lookbackYears = 10) {
  if (!priceData || priceData.length < 252) return null;

  // Group by year
  const byYear = {};
  for (const d of priceData) {
    const year = parseInt(d.date.slice(0, 4), 10);
    if (!byYear[year]) byYear[year] = [];
    byYear[year].push(d);
  }

  const years = Object.keys(byYear).map(Number).sort();
  if (years.length < 3) return null;

  // Use the most recent `lookbackYears` years
  const useYears = years.slice(-lookbackYears);

  // For each year, compute cumulative return indexed by trading day (0..~252)
  const returnsByDay = {}; // dayIndex -> [return values across years]

  for (const year of useYears) {
    const yearData = byYear[year];
    if (!yearData || yearData.length < 50) continue;
    const basePrice = yearData[0].close;
    for (let i = 0; i < yearData.length; i++) {
      const pctReturn = ((yearData[i].close - basePrice) / basePrice) * 100;
      if (!returnsByDay[i]) returnsByDay[i] = [];
      returnsByDay[i].push(pctReturn);
    }
  }

  // Average across years for each trading day
  const curve = Object.entries(returnsByDay)
    .map(([dayIdx, returns]) => ({
      dayOfYear: parseInt(dayIdx, 10),
      avgReturn: returns.reduce((a, b) => a + b, 0) / returns.length,
      winRate: returns.filter((r) => r > 0).length / returns.length,
      sampleSize: returns.length,
    }))
    .sort((a, b) => a.dayOfYear - b.dayOfYear);

  // Detrended Price Oscillator (DPO) — remove the overall trend
  const period = 20; // ~1 month lookback
  const dpo = curve.map((point, i) => {
    if (i < period) return { ...point, dpo: 0 };
    const smaIdx = i - Math.floor(period / 2);
    if (smaIdx < 0 || smaIdx >= curve.length) return { ...point, dpo: 0 };
    // Simple moving average centered at period/2 ago
    let sum = 0,
      count = 0;
    for (
      let j = Math.max(0, smaIdx - Math.floor(period / 2));
      j <= Math.min(curve.length - 1, smaIdx + Math.floor(period / 2));
      j++
    ) {
      sum += curve[j].avgReturn;
      count++;
    }
    const sma = sum / count;
    return { ...point, dpo: point.avgReturn - sma };
  });

  return {
    ticker: null, // set by caller
    years: useYears,
    totalDataPoints: priceData.length,
    curve: dpo,
  };
}

/**
 * Get the current seasonal signal for a ticker.
 * Returns a score from -100 to +100 based on where we are in the seasonal pattern.
 */
function getSeasonalSignal(seasonality) {
  if (!seasonality?.curve.length) return 0;

  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((now - startOfYear) / 86_400_000);

  // Map calendar day to trading day (~252 trading days per year)
  const tradingDay = Math.floor((dayOfYear * 252) / 365);
  const point = seasonality.curve[Math.min(tradingDay, seasonality.curve.length - 1)];
  if (!point) return 0;

  // Look ahead 20 trading days for direction
  const futureIdx = Math.min(tradingDay + 20, seasonality.curve.length - 1);
  const futurePoint = seasonality.curve[futureIdx];
  if (!futurePoint) return 0;

  const expectedMove = futurePoint.avgReturn - point.avgReturn;
  // Normalize to -100..+100 (cap at +/-5% expected move)
  return Math.max(-100, Math.min(100, expectedMove * 20));
}

// ── 3. COT SCORING ──────────────────────────────────────────────────────────

/**
 * Compute COT Z-score for a currency.
 * Normalizes net speculative positioning over the trailing 52 weeks.
 * Returns score from -100 to +100.
 */
function computeCOTScore(cotData, currency) {
  const currencyData = cotData
    .filter((d) => d.currency === currency)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (currencyData.length < 4) return { score: 0, netPosition: 0, trend: 'neutral' };

  const netPositions = currencyData.map((d) => d.netSpeculative);
  const latest = netPositions[netPositions.length - 1];
  const mean = netPositions.reduce((a, b) => a + b, 0) / netPositions.length;
  const stdDev = Math.sqrt(
    netPositions.reduce((sum, x) => sum + (x - mean) ** 2, 0) / netPositions.length
  );

  const zScore = stdDev > 0 ? (latest - mean) / stdDev : 0;
  // Normalize Z-score to -100..+100 (cap at +/-3 sigma)
  const score = Math.max(-100, Math.min(100, (zScore / 3) * 100));

  // Determine trend from last 4 weeks
  const recent = netPositions.slice(-4);
  let trend = 'neutral';
  if (recent.length >= 2) {
    const delta = recent[recent.length - 1] - recent[0];
    if (delta > 0) trend = 'increasing';
    else if (delta < 0) trend = 'decreasing';
  }

  return {
    score: Math.round(score),
    netPosition: latest,
    trend,
    zScore: parseFloat(zScore.toFixed(2)),
  };
}

// ── 4. PATTERN MATCHING ENGINE ──────────────────────────────────────────────

/**
 * Find historical patterns similar to the current price pattern.
 * Uses Pearson correlation over normalized price windows.
 */
function findPatternMatches(priceData, windowSize = 60, topK = 20) {
  if (!priceData || priceData.length < windowSize * 3) return null;

  const closes = priceData.map((d) => d.close);

  // Current pattern (last `windowSize` days)
  const currentWindow = closes.slice(-windowSize);
  const currentNorm = normalizeWindow(currentWindow);

  // Search through all historical windows
  const matches = [];
  const forwardDays = 30; // How far ahead to measure the outcome

  for (let i = 0; i < closes.length - windowSize - forwardDays; i++) {
    const historicalWindow = closes.slice(i, i + windowSize);
    const historicalNorm = normalizeWindow(historicalWindow);

    const correlation = pearsonCorrelation(currentNorm, historicalNorm);
    if (correlation < 0.7) continue; // Only keep strong matches

    // Measure what happened after this historical window
    const entryPrice = closes[i + windowSize];
    const exitPrice = closes[i + windowSize + forwardDays];
    if (!entryPrice || !exitPrice) continue;
    const forwardReturn = ((exitPrice - entryPrice) / entryPrice) * 100;

    matches.push({
      startDate: priceData[i]?.date,
      correlation: parseFloat(correlation.toFixed(4)),
      forwardReturn: parseFloat(forwardReturn.toFixed(2)),
    });
  }

  // Sort by correlation strength
  matches.sort((a, b) => b.correlation - a.correlation);
  const topMatches = matches.slice(0, topK);

  if (topMatches.length === 0)
    return { matches: [], bullishAvg: 0, bearishAvg: 0, robustness: 0, direction: 'neutral' };

  const bullishReturns = topMatches.filter((m) => m.forwardReturn > 0).map((m) => m.forwardReturn);
  const bearishReturns = topMatches.filter((m) => m.forwardReturn <= 0).map((m) => m.forwardReturn);
  const allReturns = topMatches.map((m) => m.forwardReturn);

  const bullishAvg =
    bullishReturns.length > 0
      ? bullishReturns.reduce((a, b) => a + b, 0) / bullishReturns.length
      : 0;
  const bearishAvg =
    bearishReturns.length > 0
      ? bearishReturns.reduce((a, b) => a + b, 0) / bearishReturns.length
      : 0;
  const avgReturn = allReturns.reduce((a, b) => a + b, 0) / allReturns.length;
  const stdReturn = Math.sqrt(
    allReturns.reduce((sum, x) => sum + (x - avgReturn) ** 2, 0) / allReturns.length
  );

  // Robustness: higher when matches agree on direction (lower std relative to mean)
  const robustness = stdReturn > 0 ? Math.min(100, Math.abs(avgReturn / stdReturn) * 33) : 0;
  const winRate = bullishReturns.length / topMatches.length;

  return {
    matches: topMatches.slice(0, 5), // Return top 5 for display
    bullishAvg: parseFloat(bullishAvg.toFixed(2)),
    bearishAvg: parseFloat(bearishAvg.toFixed(2)),
    avgReturn: parseFloat(avgReturn.toFixed(2)),
    winRate: parseFloat(winRate.toFixed(2)),
    robustness: Math.round(robustness),
    direction: avgReturn > 0.5 ? 'bullish' : avgReturn < -0.5 ? 'bearish' : 'neutral',
    matchCount: topMatches.length,
    bestMatch: topMatches[0] || null,
  };
}

function normalizeWindow(window) {
  const min = Math.min(...window);
  const max = Math.max(...window);
  const range = max - min;
  if (range === 0) return window.map(() => 0);
  return window.map((v) => (v - min) / range);
}

function pearsonCorrelation(x, y) {
  const n = Math.min(x.length, y.length);
  if (n === 0) return 0;
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumX2 = 0,
    sumY2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumX2 += x[i] ** 2;
    sumY2 += y[i] ** 2;
  }
  const denom = Math.sqrt((n * sumX2 - sumX ** 2) * (n * sumY2 - sumY ** 2));
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

// ── 5. COMPOSITE SCORING ────────────────────────────────────────────────────

/**
 * Compute composite score for a ticker combining all signals.
 * Weights: Seasonality (30%), COT (25%), Pattern (30%), Macro (15%)
 */
function computeCompositeScore(seasonalSignal, cotScore, patternResult) {
  const weights = { seasonal: 0.3, cot: 0.25, pattern: 0.3, base: 0.15 };

  const seasonalScore = seasonalSignal || 0;
  const cotSignal = cotScore?.score || 0;
  const patternScore = patternResult
    ? patternResult.direction === 'bullish'
      ? patternResult.robustness
      : patternResult.direction === 'bearish'
        ? -patternResult.robustness
        : 0
    : 0;

  const composite =
    seasonalScore * weights.seasonal + cotSignal * weights.cot + patternScore * weights.pattern;

  const score = Math.max(-100, Math.min(100, Math.round(composite)));

  let signal = 'neutral';
  if (score >= 60) signal = 'strong_buy';
  else if (score >= 25) signal = 'buy';
  else if (score <= -60) signal = 'strong_sell';
  else if (score <= -25) signal = 'sell';

  return {
    score,
    signal,
    components: {
      seasonal: Math.round(seasonalScore),
      cot: Math.round(cotSignal),
      pattern: Math.round(patternScore),
    },
  };
}

// ── EXPRESS ROUTES ──────────────────────────────────────────────────────────

export {
  ALL_TICKERS,
  computeCOTScore,
  computeCompositeScore,
  computeSeasonality,
  fetchCOTData,
  fetchFredSeries,
  fetchYahooHistory,
  findPatternMatches,
  getSeasonalSignal,
};

export function registerSignalRoutes(app) {
  // ── Available tickers ──
  app.get('/api/signals/tickers', (_req, res) => {
    res.json({
      forex: FOREX_PAIRS,
      crypto: CRYPTO_PAIRS,
      stocks: STOCK_TICKERS,
      all: ALL_TICKERS,
    });
  });

  // ── Seasonality for a ticker ──
  app.get('/api/signals/seasonality/:ticker', async (req, res) => {
    try {
      const ticker = req.params.ticker;
      const years = parseInt(req.query.years, 10) || 10;

      const cacheKey = `seasonality_${ticker}_${years}`;
      const cached = cache.get(cacheKey);
      if (cached) return res.json(cached);

      const priceData = await fetchYahooHistory(ticker, Math.max(years + 1, 11));
      if (!priceData.length)
        return res.status(404).json({ error: 'No price data available for this ticker' });

      const seasonality = computeSeasonality(priceData, years);
      if (!seasonality)
        return res.status(404).json({ error: 'Insufficient data for seasonality computation' });
      seasonality.ticker = ticker;

      const currentSignal = getSeasonalSignal(seasonality);
      const result = { ...seasonality, currentSignal };

      cache.set(cacheKey, result, SIX_HOURS);
      res.json(result);
    } catch (err) {
      console.error('[Seasonality]', err);
      res.status(500).json({ error: 'Failed to compute seasonality' });
    }
  });

  // ── COT Report data ──
  app.get('/api/signals/cot', async (_req, res) => {
    try {
      const cotData = await fetchCOTData();
      if (!cotData.length) return res.json({ data: [], scores: {} });

      const currencies = ['EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD', 'USD'];
      const scores = {};
      for (const c of currencies) {
        scores[c] = computeCOTScore(cotData, c);
      }

      res.json({ data: cotData, scores });
    } catch (err) {
      console.error('[COT]', err);
      res.status(500).json({ error: 'Failed to fetch COT data' });
    }
  });

  // ── Pattern matching for a ticker ──
  app.get('/api/signals/patterns/:ticker', async (req, res) => {
    try {
      const ticker = req.params.ticker;
      const window = parseInt(req.query.window, 10) || 60;

      const cacheKey = `patterns_${ticker}_${window}`;
      const cached = cache.get(cacheKey);
      if (cached) return res.json(cached);

      const priceData = await fetchYahooHistory(ticker, 10);
      if (!priceData.length) return res.status(404).json({ error: 'No price data available' });

      const result = findPatternMatches(priceData, window);
      if (!result) return res.status(404).json({ error: 'Insufficient data for pattern analysis' });

      const response = { ticker, windowSize: window, ...result };
      cache.set(cacheKey, response, ONE_HOUR);
      res.json(response);
    } catch (err) {
      console.error('[Patterns]', err);
      res.status(500).json({ error: 'Failed to compute pattern matches' });
    }
  });

  // ── Composite score for a ticker ──
  app.get('/api/signals/score/:ticker', async (req, res) => {
    try {
      const ticker = req.params.ticker;

      const cacheKey = `score_${ticker}`;
      const cached = cache.get(cacheKey);
      if (cached) return res.json(cached);

      // Fetch all data in parallel
      const [priceData, cotData] = await Promise.all([
        fetchYahooHistory(ticker, 11),
        fetchCOTData(),
      ]);

      // Compute individual signals
      const seasonality = priceData.length > 0 ? computeSeasonality(priceData, 10) : null;
      const seasonalSignal = seasonality ? getSeasonalSignal(seasonality) : 0;

      // COT only applies to Forex
      const currencyFromTicker = ticker.replace('USD=X', '').replace('=X', '').slice(0, 3);
      const cotScore = computeCOTScore(cotData, currencyFromTicker);

      // Pattern matching
      const patternResult = priceData.length > 200 ? findPatternMatches(priceData) : null;

      // Composite
      const composite = computeCompositeScore(seasonalSignal, cotScore, patternResult);

      const result = {
        ticker,
        timestamp: new Date().toISOString(),
        composite,
        signals: {
          seasonal: { score: Math.round(seasonalSignal), years: seasonality?.years?.length || 0 },
          cot: cotScore,
          pattern: patternResult
            ? {
                direction: patternResult.direction,
                robustness: patternResult.robustness,
                winRate: patternResult.winRate,
                avgReturn: patternResult.avgReturn,
                matchCount: patternResult.matchCount,
              }
            : null,
        },
      };

      cache.set(cacheKey, result, ONE_HOUR);
      res.json(result);
    } catch (err) {
      console.error('[Score]', err);
      res.status(500).json({ error: 'Failed to compute signal score' });
    }
  });

  // ── Screener: scores for all tickers ──
  app.get('/api/signals/screener', async (_req, res) => {
    try {
      const cacheKey = 'screener_all';
      const cached = cache.get(cacheKey);
      if (cached) return res.json(cached);

      const cotData = await fetchCOTData();

      // Process all tickers in parallel (batched to avoid rate limits)
      const batchSize = 5;
      const results = [];

      for (let i = 0; i < ALL_TICKERS.length; i += batchSize) {
        const batch = ALL_TICKERS.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(async (ticker) => {
            try {
              const priceData = await fetchYahooHistory(ticker, 11);
              if (!priceData || priceData.length < 100) return null;

              const latestPrice = priceData[priceData.length - 1]?.close;
              if (!latestPrice) return null; // Skip assets with no valid price

              const seasonality =
                priceData.length >= 252 ? computeSeasonality(priceData, 10) : null;
              const seasonalSignal = seasonality ? getSeasonalSignal(seasonality) : 0;
              const currencyFromTicker = ticker.replace('USD=X', '').replace('=X', '').slice(0, 3);
              const cotScore = computeCOTScore(cotData, currencyFromTicker);
              const patternResult = priceData.length > 200 ? findPatternMatches(priceData) : null;
              const composite = computeCompositeScore(seasonalSignal, cotScore, patternResult);

              const prevPrice = priceData[priceData.length - 2]?.close;
              const dayChange = prevPrice ? ((latestPrice - prevPrice) / prevPrice) * 100 : 0;

              return {
                ticker,
                price: latestPrice,
                dayChange: parseFloat(dayChange.toFixed(2)),
                score: composite.score,
                signal: composite.signal,
                components: composite.components,
                pattern: patternResult
                  ? {
                      direction: patternResult.direction,
                      robustness: patternResult.robustness,
                      winRate: patternResult.winRate,
                    }
                  : null,
              };
            } catch {
              return null;
            }
          })
        );
        results.push(...batchResults.filter(Boolean));
      }

      // Sort by absolute score (strongest signals first)
      results.sort((a, b) => Math.abs(b.score) - Math.abs(a.score));

      const response = {
        timestamp: new Date().toISOString(),
        count: results.length,
        assets: results,
      };

      cache.set(cacheKey, response, ONE_HOUR);
      res.json(response);
    } catch (err) {
      console.error('[Screener]', err);
      res.status(500).json({ error: 'Failed to run screener' });
    }
  });

  // ── FRED macro data ──
  app.get('/api/signals/macro', async (_req, res) => {
    try {
      const cacheKey = 'macro_summary';
      const cached = cache.get(cacheKey);
      if (cached) return res.json(cached);

      const [fedRate, cpi, unemployment, gdp] = await Promise.all([
        fetchFredSeries('DFF'), // Fed Funds Rate
        fetchFredSeries('CPIAUCSL'), // CPI
        fetchFredSeries('UNRATE'), // Unemployment
        fetchFredSeries('GDP'), // GDP
      ]);

      const result = {
        fedFundsRate: {
          current: fedRate[0]?.value,
          date: fedRate[0]?.date,
          history: fedRate.slice(0, 12),
        },
        cpi: { current: cpi[0]?.value, date: cpi[0]?.date, history: cpi.slice(0, 12) },
        unemployment: {
          current: unemployment[0]?.value,
          date: unemployment[0]?.date,
          history: unemployment.slice(0, 12),
        },
        gdp: { current: gdp[0]?.value, date: gdp[0]?.date, history: gdp.slice(0, 4) },
        timestamp: new Date().toISOString(),
      };

      cache.set(cacheKey, result, SIX_HOURS);
      res.json(result);
    } catch (err) {
      console.error('[Macro]', err);
      res.status(500).json({ error: 'Failed to fetch macro data' });
    }
  });

  // ── Signal summary for AI context (used by Genesis chat) ──
  app.get('/api/signals/ai-context/:ticker', async (req, res) => {
    try {
      const ticker = req.params.ticker;

      const [priceData, cotData, macroResp] = await Promise.all([
        fetchYahooHistory(ticker, 11),
        fetchCOTData(),
        fetchFredSeries('DFF'),
      ]);

      const seasonality = priceData.length > 0 ? computeSeasonality(priceData, 10) : null;
      const seasonalSignal = seasonality ? getSeasonalSignal(seasonality) : 0;
      const currencyFromTicker = ticker.replace('USD=X', '').replace('=X', '').slice(0, 3);
      const cotScore = computeCOTScore(cotData, currencyFromTicker);
      const patternResult = priceData.length > 200 ? findPatternMatches(priceData) : null;
      const composite = computeCompositeScore(seasonalSignal, cotScore, patternResult);

      const latestPrice = priceData[priceData.length - 1]?.close;

      // Build a text summary for RAG injection into AI prompts
      const summary = [
        `Asset: ${ticker} | Price: ${latestPrice?.toFixed(2)}`,
        `Composite Score: ${composite.score}/100 (${composite.signal.replace('_', ' ')})`,
        `Seasonal Signal: ${Math.round(seasonalSignal)} (${seasonalSignal > 20 ? 'bullish' : seasonalSignal < -20 ? 'bearish' : 'neutral'} seasonality)`,
        `COT: Z-score ${cotScore.zScore}, net position ${cotScore.netPosition} (${cotScore.trend})`,
        patternResult
          ? `Pattern Match: ${patternResult.matchCount} similar periods found, ${(patternResult.winRate * 100).toFixed(0)}% bullish, avg return ${patternResult.avgReturn}%, robustness ${patternResult.robustness}%`
          : 'Pattern: insufficient data',
        `Fed Funds Rate: ${macroResp[0]?.value}%`,
      ].join('\n');

      res.json({ ticker, summary, composite, raw: { seasonalSignal, cotScore, patternResult } });
    } catch (err) {
      console.error('[AI Context]', err);
      res.status(500).json({ error: 'Failed to build AI context' });
    }
  });

  console.log('[Signals] Routes registered: /api/signals/*');
}

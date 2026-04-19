/**
 * ChartSentinel Extended Signal Engine
 *
 * Features:
 *   - Alerts system (score threshold triggers + browser push)
 *   - Backtesting engine (historical P&L simulation)
 *   - Market Mood / Fear & Greed indicator
 *   - Sector rotation map
 *   - Day-of-week / Monthly statistics
 *   - Cross-asset correlation matrix
 *   - SEC insider trading tracker
 */

// Upstream preregister imports these from './signals.js'; this repo renamed
// the ported module to engine.js. Symbol list kept identical so the diff
// against upstream stays minimal.
import {
  ALL_TICKERS,
  computeCOTScore,
  computeCompositeScore,
  computeSeasonality,
  fetchCOTData,
  findPatternMatches,
  getSeasonalSignal,
} from './engine.js';

// ── Shared Cache ────────────────────────────────────────────────────────────

class ExtCache {
  constructor() {
    this.cache = new Map();
  }
  get(key) {
    const e = this.cache.get(key);
    if (!e) return null;
    if (Date.now() > e.expiry) {
      this.cache.delete(key);
      return null;
    }
    return e.data;
  }
  set(key, data, ttlMs) {
    this.cache.set(key, { data, expiry: Date.now() + ttlMs });
  }
}
const cache = new ExtCache();
const ONE_HOUR = 3600_000;
const SIX_HOURS = 21_600_000;
const _ONE_DAY = 86_400_000;

/**
 * Run the screener directly (no internal HTTP call).
 * Used by mood, sectors, and alerts check.
 */
async function runScreenerDirect(fetchYahooHistory) {
  const cacheKey = 'screener_direct';
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const cotData = await fetchCOTData();
  const results = [];
  const batchSize = 5;

  for (let i = 0; i < ALL_TICKERS.length; i += batchSize) {
    const batch = ALL_TICKERS.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (ticker) => {
        try {
          const priceData = await fetchYahooHistory(ticker, 11);
          if (!priceData || priceData.length < 100) return null;
          const latestPrice = priceData[priceData.length - 1]?.close;
          if (!latestPrice) return null;
          const seasonality = priceData.length >= 252 ? computeSeasonality(priceData, 10) : null;
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

  results.sort((a, b) => Math.abs(b.score) - Math.abs(a.score));
  const response = { timestamp: new Date().toISOString(), count: results.length, assets: results };
  cache.set(cacheKey, response, ONE_HOUR);
  return response;
}

// ── 1. ALERTS SYSTEM ────────────────────────────────────────────────────────

let alertIdCounter = 1;
const alerts = []; // In-memory store (replace with DB in production)

/**
 * Check all active alerts against current screener data.
 * Returns triggered alerts.
 */
function checkAlerts(screenerData) {
  if (!screenerData?.assets) return [];
  const triggered = [];

  for (const alert of alerts) {
    if (!alert.active) continue;
    const asset = screenerData.assets.find((a) => a.ticker === alert.ticker);
    if (!asset) continue;

    let fired = false;
    if (alert.condition === 'above' && asset.score >= alert.threshold) fired = true;
    if (alert.condition === 'below' && asset.score <= alert.threshold) fired = true;
    if (
      alert.condition === 'crosses_zero' &&
      ((alert._lastScore < 0 && asset.score >= 0) || (alert._lastScore > 0 && asset.score <= 0))
    )
      fired = true;

    alert._lastScore = asset.score;

    if (fired) {
      alert.lastTriggered = new Date().toISOString();
      alert.triggerCount = (alert.triggerCount || 0) + 1;
      if (!alert.repeating) alert.active = false;
      triggered.push({
        alertId: alert.id,
        ticker: alert.ticker,
        condition: alert.condition,
        threshold: alert.threshold,
        currentScore: asset.score,
        signal: asset.signal,
        timestamp: alert.lastTriggered,
      });
    }
  }
  return triggered;
}

// ── 2. BACKTESTING ENGINE ───────────────────────────────────────────────────

/**
 * Simulate a score-based strategy on historical data.
 * Strategy: buy when composite score > buyThreshold, sell when < sellThreshold.
 * Returns equity curve and performance metrics.
 */
function runBacktest(priceData, seasonalityFn, options = {}) {
  const { buyThreshold = 25, sellThreshold = -10, initialCapital = 10000 } = options;

  if (!priceData || priceData.length < 252) return null;

  let capital = initialCapital;
  let position = 0; // 0 = flat, 1 = long
  let entryPrice = 0;
  const trades = [];
  const equity = [];
  let wins = 0;
  let losses = 0;
  let maxEquity = initialCapital;
  let maxDrawdown = 0;

  // Simulate day by day using simplified seasonal signal
  for (let i = 252; i < priceData.length; i++) {
    const price = priceData[i].close;
    const date = priceData[i].date;

    // Compute a simplified score based on recent momentum + seasonality
    const lookback = priceData.slice(i - 60, i);
    const _returns60d = ((price - lookback[0].close) / lookback[0].close) * 100;
    const returns20d = ((price - priceData[i - 20].close) / priceData[i - 20].close) * 100;

    // Simple momentum score (-100 to 100)
    const momentumScore = Math.max(-100, Math.min(100, returns20d * 10));

    // Day of year for seasonal component
    const dayOfYear = Math.floor(
      (new Date(date) - new Date(new Date(date).getFullYear(), 0, 1)) / 86400000
    );
    const tradingDay = Math.floor((dayOfYear * 252) / 365);
    const seasonalScore = seasonalityFn ? seasonalityFn(tradingDay) : 0;

    const score = momentumScore * 0.6 + seasonalScore * 0.4;

    // Trading logic
    if (position === 0 && score >= buyThreshold) {
      position = 1;
      entryPrice = price;
      trades.push({ type: 'buy', date, price, score: Math.round(score) });
    } else if (position === 1 && score <= sellThreshold) {
      const pnl = ((price - entryPrice) / entryPrice) * 100;
      capital *= 1 + pnl / 100;
      position = 0;
      if (pnl > 0) wins++;
      else losses++;
      trades.push({
        type: 'sell',
        date,
        price,
        pnl: parseFloat(pnl.toFixed(2)),
        score: Math.round(score),
      });
    }

    const currentEquity = position === 1 ? capital * (price / entryPrice) : capital;

    equity.push({ date, value: parseFloat(currentEquity.toFixed(2)), score: Math.round(score) });

    if (currentEquity > maxEquity) maxEquity = currentEquity;
    const drawdown = ((maxEquity - currentEquity) / maxEquity) * 100;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  // Close any open position
  if (position === 1) {
    const lastPrice = priceData[priceData.length - 1].close;
    const pnl = ((lastPrice - entryPrice) / entryPrice) * 100;
    capital *= 1 + pnl / 100;
    if (pnl > 0) wins++;
    else losses++;
    trades.push({
      type: 'sell',
      date: priceData[priceData.length - 1].date,
      price: lastPrice,
      pnl: parseFloat(pnl.toFixed(2)),
      score: 0,
    });
  }

  const totalReturn = ((capital - initialCapital) / initialCapital) * 100;
  const totalTrades = wins + losses;
  const winRate = totalTrades > 0 ? wins / totalTrades : 0;

  // Buy-and-hold comparison
  const holdReturn =
    ((priceData[priceData.length - 1].close - priceData[252].close) / priceData[252].close) * 100;

  return {
    initialCapital,
    finalCapital: parseFloat(capital.toFixed(2)),
    totalReturn: parseFloat(totalReturn.toFixed(2)),
    buyAndHoldReturn: parseFloat(holdReturn.toFixed(2)),
    alpha: parseFloat((totalReturn - holdReturn).toFixed(2)),
    totalTrades,
    wins,
    losses,
    winRate: parseFloat(winRate.toFixed(2)),
    maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
    sharpeApprox: totalReturn / (maxDrawdown || 1),
    trades: trades.slice(-20), // Last 20 trades
    equity: equity.filter((_, i) => i % 5 === 0), // Sample every 5 days for chart
  };
}

// ── 3. MARKET MOOD / FEAR & GREED ──────────────────────────────────────────

/**
 * Compute market mood from VIX, signal distribution, and momentum.
 * Returns 0 (extreme fear) to 100 (extreme greed).
 */
async function computeMarketMood(screenerData) {
  let vixScore = 50; // neutral default
  let signalScore = 50;
  let momentumScore = 50;

  // VIX from Yahoo Finance
  try {
    const resp = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=5d',
      {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ChartSentinel/1.0)' },
      }
    );
    if (resp.ok) {
      const json = await resp.json();
      const closes = json.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.filter(Boolean) || [];
      if (closes.length > 0) {
        const vix = closes[closes.length - 1];
        // VIX < 15 = greedy, VIX > 30 = fearful
        vixScore = Math.max(0, Math.min(100, 100 - ((vix - 12) / 25) * 100));
      }
    }
  } catch {
    /* use default */
  }

  // Signal distribution from screener
  if (screenerData?.assets?.length > 0) {
    const assets = screenerData.assets;
    const bullish = assets.filter((a) => a.score > 0).length;
    const total = assets.length;
    signalScore = (bullish / total) * 100;

    // Average momentum from day changes
    const avgChange = assets.reduce((sum, a) => sum + (a.dayChange || 0), 0) / total;
    momentumScore = Math.max(0, Math.min(100, 50 + avgChange * 10));
  }

  // Weighted composite
  const mood = Math.round(vixScore * 0.4 + signalScore * 0.35 + momentumScore * 0.25);

  let label = 'Neutral';
  let emoji = '😐';
  if (mood >= 80) {
    label = 'Extreme Greed';
    emoji = '🤑';
  } else if (mood >= 60) {
    label = 'Greed';
    emoji = '😏';
  } else if (mood >= 45) {
    label = 'Neutral';
    emoji = '😐';
  } else if (mood >= 25) {
    label = 'Fear';
    emoji = '😰';
  } else {
    label = 'Extreme Fear';
    emoji = '😱';
  }

  return {
    score: mood,
    label,
    emoji,
    components: {
      vix: Math.round(vixScore),
      signals: Math.round(signalScore),
      momentum: Math.round(momentumScore),
    },
    timestamp: new Date().toISOString(),
  };
}

// ── 4. SECTOR ROTATION MAP ─────────────────────────────────────────────────

const SECTORS = {
  Technology: ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'META'],
  'Consumer Discretionary': ['AMZN', 'TSLA'],
  'Broad Market': ['SPY', 'QQQ', 'DIA'],
  Crypto: ['BTC-USD', 'ETH-USD', 'SOL-USD', 'XRP-USD', 'ADA-USD'],
  'Forex Majors': ['EURUSD=X', 'GBPUSD=X', 'USDJPY=X', 'AUDUSD=X'],
  'Forex Minors': ['USDCAD=X', 'USDCHF=X', 'NZDUSD=X', 'EURGBP=X'],
};

function computeSectorRotation(screenerData) {
  if (!screenerData?.assets) return [];

  const assetMap = {};
  for (const a of screenerData.assets) assetMap[a.ticker] = a;

  return Object.entries(SECTORS)
    .map(([sector, tickers]) => {
      const members = tickers.map((t) => assetMap[t]).filter(Boolean);
      if (members.length === 0)
        return { sector, score: 0, signal: 'neutral', phase: 'unknown', members: [] };

      const avgScore = members.reduce((sum, m) => sum + m.score, 0) / members.length;
      const avgChange = members.reduce((sum, m) => sum + (m.dayChange || 0), 0) / members.length;

      // Determine cycle phase based on score + momentum
      let phase = 'consolidation';
      if (avgScore > 30 && avgChange > 0) phase = 'expansion';
      else if (avgScore > 0 && avgChange < 0) phase = 'peak';
      else if (avgScore < -30 && avgChange < 0) phase = 'contraction';
      else if (avgScore < 0 && avgChange > 0) phase = 'recovery';

      let signal = 'neutral';
      if (avgScore >= 40) signal = 'strong_buy';
      else if (avgScore >= 15) signal = 'buy';
      else if (avgScore <= -40) signal = 'strong_sell';
      else if (avgScore <= -15) signal = 'sell';

      return {
        sector,
        score: Math.round(avgScore),
        signal,
        phase,
        dayChange: parseFloat(avgChange.toFixed(2)),
        members: members.map((m) => ({ ticker: m.ticker, score: m.score, dayChange: m.dayChange })),
      };
    })
    .sort((a, b) => Math.abs(b.score) - Math.abs(a.score));
}

// ── 5. DAY-OF-WEEK & MONTHLY STATISTICS ────────────────────────────────────

function computeCalendarStats(priceData) {
  if (!priceData || priceData.length < 252) return null;

  // Daily returns
  const dailyReturns = [];
  for (let i = 1; i < priceData.length; i++) {
    const ret = ((priceData[i].close - priceData[i - 1].close) / priceData[i - 1].close) * 100;
    const d = new Date(priceData[i].date);
    dailyReturns.push({
      date: priceData[i].date,
      return: ret,
      dayOfWeek: d.getDay(),
      month: d.getMonth(),
    });
  }

  // Day-of-week stats
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const byDay = {};
  for (const r of dailyReturns) {
    if (!byDay[r.dayOfWeek]) byDay[r.dayOfWeek] = [];
    byDay[r.dayOfWeek].push(r.return);
  }

  const dayOfWeekStats = Object.entries(byDay)
    .filter(([day]) => day >= 1 && day <= 5) // weekdays only
    .map(([day, returns]) => ({
      day: dayNames[parseInt(day, 10)],
      avgReturn: parseFloat((returns.reduce((a, b) => a + b, 0) / returns.length).toFixed(4)),
      winRate: parseFloat((returns.filter((r) => r > 0).length / returns.length).toFixed(3)),
      count: returns.length,
      bestReturn: parseFloat(Math.max(...returns).toFixed(2)),
      worstReturn: parseFloat(Math.min(...returns).toFixed(2)),
    }));

  // Monthly stats
  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const byMonth = {};
  for (const r of dailyReturns) {
    if (!byMonth[r.month]) byMonth[r.month] = [];
    byMonth[r.month].push(r.return);
  }

  const monthlyStats = Object.entries(byMonth).map(([month, returns]) => {
    const cumReturn = returns.reduce((a, b) => a + b, 0);
    return {
      month: monthNames[parseInt(month, 10)],
      avgDailyReturn: parseFloat((cumReturn / returns.length).toFixed(4)),
      avgMonthlyReturn: parseFloat((cumReturn / (returns.length / 21)).toFixed(2)), // ~21 trading days per month
      winRate: parseFloat((returns.filter((r) => r > 0).length / returns.length).toFixed(3)),
      count: returns.length,
    };
  });

  return { dayOfWeek: dayOfWeekStats, monthly: monthlyStats };
}

// ── 6. CORRELATION MATRIX ──────────────────────────────────────────────────

function computeCorrelationMatrix(priceDataMap) {
  const tickers = Object.keys(priceDataMap);
  if (tickers.length < 2) return null;

  // Compute daily returns for each ticker (last 60 trading days)
  const returnsMap = {};
  for (const ticker of tickers) {
    const data = priceDataMap[ticker];
    if (!data || data.length < 61) continue;
    const recent = data.slice(-61);
    returnsMap[ticker] = [];
    for (let i = 1; i < recent.length; i++) {
      returnsMap[ticker].push((recent[i].close - recent[i - 1].close) / recent[i - 1].close);
    }
  }

  const validTickers = Object.keys(returnsMap);
  const matrix = {};

  for (const a of validTickers) {
    matrix[a] = {};
    for (const b of validTickers) {
      if (a === b) {
        matrix[a][b] = 1.0;
        continue;
      }
      const minLen = Math.min(returnsMap[a].length, returnsMap[b].length);
      const ra = returnsMap[a].slice(0, minLen);
      const rb = returnsMap[b].slice(0, minLen);
      matrix[a][b] = parseFloat(pearson(ra, rb).toFixed(3));
    }
  }

  return { tickers: validTickers, matrix };
}

function pearson(x, y) {
  const n = x.length;
  if (n === 0) return 0;
  let sx = 0,
    sy = 0,
    sxy = 0,
    sx2 = 0,
    sy2 = 0;
  for (let i = 0; i < n; i++) {
    sx += x[i];
    sy += y[i];
    sxy += x[i] * y[i];
    sx2 += x[i] ** 2;
    sy2 += y[i] ** 2;
  }
  const d = Math.sqrt((n * sx2 - sx ** 2) * (n * sy2 - sy ** 2));
  return d === 0 ? 0 : (n * sxy - sx * sy) / d;
}

// ── 7. SEC INSIDER TRADING TRACKER ─────────────────────────────────────────

async function fetchInsiderTrades(ticker) {
  const cacheKey = `insider_${ticker}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  // SEC EDGAR XBRL API (free, no key needed)
  const cik = await getCompanyCIK(ticker);
  if (!cik) return [];

  try {
    const url = `https://efts.sec.gov/LATEST/search-index?q=%22${ticker}%22&dateRange=custom&startdt=${getDateNDaysAgo(90)}&enddt=${new Date().toISOString().split('T')[0]}&forms=4`;
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'ChartSentinel research@chartsentinel.com',
        Accept: 'application/json',
      },
    });
    if (!resp.ok) return [];
    const data = await resp.json();

    const filings = (data.hits?.hits || []).slice(0, 10).map((h) => ({
      date: h._source?.file_date,
      form: h._source?.form_type,
      filer: h._source?.display_names?.[0] || 'Unknown',
      url: `https://www.sec.gov/Archives/edgar/data/${cik}/${h._source?.file_num}`,
    }));

    cache.set(cacheKey, filings, SIX_HOURS);
    return filings;
  } catch (err) {
    console.error('[Insider]', err.message);
    return [];
  }
}

async function getCompanyCIK(ticker) {
  try {
    const resp = await fetch('https://www.sec.gov/files/company_tickers.json', {
      headers: { 'User-Agent': 'ChartSentinel research@chartsentinel.com' },
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const entry = Object.values(data).find((e) => e.ticker === ticker.toUpperCase());
    return entry ? String(entry.cik_str).padStart(10, '0') : null;
  } catch {
    return null;
  }
}

function getDateNDaysAgo(n) {
  return new Date(Date.now() - n * 86_400_000).toISOString().split('T')[0];
}

// ── EXPRESS ROUTES ──────────────────────────────────────────────────────────

export function registerExtendedRoutes(app, fetchYahooHistory) {
  // ── Alerts CRUD ──
  app.get('/api/alerts', (_req, res) => {
    res.json({ alerts, count: alerts.length });
  });

  app.post('/api/alerts', (req, res) => {
    const { ticker, condition, threshold, repeating } = req.body;
    if (!ticker || !condition || threshold == null) {
      return res.status(400).json({ error: 'ticker, condition, and threshold are required' });
    }
    const alert = {
      id: alertIdCounter++,
      ticker,
      condition, // 'above', 'below', 'crosses_zero'
      threshold: parseFloat(threshold),
      repeating: !!repeating,
      active: true,
      createdAt: new Date().toISOString(),
      lastTriggered: null,
      triggerCount: 0,
      _lastScore: 0,
    };
    alerts.push(alert);
    res.status(201).json(alert);
  });

  app.delete('/api/alerts/:id', (req, res) => {
    const idx = alerts.findIndex((a) => a.id === parseInt(req.params.id, 10));
    if (idx === -1) return res.status(404).json({ error: 'Alert not found' });
    alerts.splice(idx, 1);
    res.json({ success: true });
  });

  app.get('/api/alerts/check', async (_req, res) => {
    try {
      const screenerData = await runScreenerDirect(fetchYahooHistory);
      const triggered = checkAlerts(screenerData);
      res.json({ triggered, checkedAt: new Date().toISOString() });
    } catch (_err) {
      res.status(500).json({ error: 'Failed to check alerts' });
    }
  });

  // ── Backtesting ──
  app.get('/api/backtest/:ticker', async (req, res) => {
    try {
      const ticker = req.params.ticker;
      const buyThreshold = parseInt(req.query.buy, 10) || 25;
      const sellThreshold = parseInt(req.query.sell, 10) || -10;

      const cacheKey = `backtest_${ticker}_${buyThreshold}_${sellThreshold}`;
      const cached = cache.get(cacheKey);
      if (cached) return res.json(cached);

      const priceData = await fetchYahooHistory(ticker, 5);
      if (!priceData || priceData.length < 252) {
        return res.status(404).json({ error: 'Insufficient price data for backtesting' });
      }

      const result = runBacktest(priceData, null, { buyThreshold, sellThreshold });
      if (!result) return res.status(500).json({ error: 'Backtest computation failed' });

      const response = { ticker, buyThreshold, sellThreshold, ...result };
      cache.set(cacheKey, response, ONE_HOUR);
      res.json(response);
    } catch (err) {
      console.error('[Backtest]', err);
      res.status(500).json({ error: 'Backtest failed' });
    }
  });

  // ── Market Mood ──
  app.get('/api/signals/mood', async (_req, res) => {
    try {
      const cacheKey = 'market_mood';
      const cached = cache.get(cacheKey);
      if (cached) return res.json(cached);

      let screenerData = null;
      try {
        screenerData = await runScreenerDirect(fetchYahooHistory);
      } catch {
        /* use default */
      }

      const mood = await computeMarketMood(screenerData);
      cache.set(cacheKey, mood, ONE_HOUR);
      res.json(mood);
    } catch (err) {
      console.error('[Mood]', err);
      res.status(500).json({ error: 'Failed to compute market mood' });
    }
  });

  // ── Sector Rotation ──
  app.get('/api/signals/sectors', async (_req, res) => {
    try {
      const cacheKey = 'sectors';
      const cached = cache.get(cacheKey);
      if (cached) return res.json(cached);

      let screenerData = null;
      try {
        screenerData = await runScreenerDirect(fetchYahooHistory);
      } catch {
        /* fallback */
      }

      const sectors = computeSectorRotation(screenerData);
      const response = { sectors, timestamp: new Date().toISOString() };
      cache.set(cacheKey, response, ONE_HOUR);
      res.json(response);
    } catch (err) {
      console.error('[Sectors]', err);
      res.status(500).json({ error: 'Failed to compute sector rotation' });
    }
  });

  // ── Calendar Statistics ──
  app.get('/api/signals/calendar/:ticker', async (req, res) => {
    try {
      const ticker = req.params.ticker;
      const cacheKey = `calendar_${ticker}`;
      const cached = cache.get(cacheKey);
      if (cached) return res.json(cached);

      const priceData = await fetchYahooHistory(ticker, 10);
      if (!priceData || priceData.length < 252) {
        return res.status(404).json({ error: 'Insufficient data' });
      }

      const stats = computeCalendarStats(priceData);
      if (!stats) return res.status(404).json({ error: 'Could not compute stats' });

      const response = { ticker, ...stats };
      cache.set(cacheKey, response, SIX_HOURS);
      res.json(response);
    } catch (err) {
      console.error('[Calendar]', err);
      res.status(500).json({ error: 'Failed to compute calendar stats' });
    }
  });

  // ── Correlation Matrix ──
  app.get('/api/signals/correlations', async (req, res) => {
    try {
      const cacheKey = 'correlations';
      const cached = cache.get(cacheKey);
      if (cached) return res.json(cached);

      const tickers = (
        req.query.tickers || 'SPY,QQQ,BTC-USD,ETH-USD,AAPL,MSFT,GOOGL,EURUSD=X'
      ).split(',');
      const priceDataMap = {};

      // Fetch in batches
      for (let i = 0; i < tickers.length; i += 4) {
        const batch = tickers.slice(i, i + 4);
        const results = await Promise.all(batch.map((t) => fetchYahooHistory(t, 1)));
        batch.forEach((t, j) => {
          if (results[j]?.length > 0) priceDataMap[t] = results[j];
        });
      }

      const matrix = computeCorrelationMatrix(priceDataMap);
      if (!matrix) return res.json({ tickers: [], matrix: {} });

      const response = { ...matrix, timestamp: new Date().toISOString() };
      cache.set(cacheKey, response, SIX_HOURS);
      res.json(response);
    } catch (err) {
      console.error('[Correlations]', err);
      res.status(500).json({ error: 'Failed to compute correlations' });
    }
  });

  // ── Insider Trading ──
  app.get('/api/signals/insiders/:ticker', async (req, res) => {
    try {
      const filings = await fetchInsiderTrades(req.params.ticker);
      res.json({ ticker: req.params.ticker, filings, count: filings.length });
    } catch (err) {
      console.error('[Insiders]', err);
      res.status(500).json({ error: 'Failed to fetch insider data' });
    }
  });

  console.log(
    '[Signals Extended] Routes registered: /api/alerts/*, /api/backtest/*, /api/signals/mood, /api/signals/sectors, /api/signals/calendar/*, /api/signals/correlations, /api/signals/insiders/*'
  );
}

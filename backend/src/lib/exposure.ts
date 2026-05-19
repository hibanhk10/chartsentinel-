// Static factor-classification map for the platform's covered universe.
// Each ticker carries a normalised asset class, a region, and weights
// (0–1) on the macro factors we surface in the exposure panel:
//
//   tech     — technology / growth sensitivity
//   usd      — USD-strength sensitivity (positive = benefits from
//              stronger dollar, negative = hurt by it). FX pairs are
//              the only place we use negative weights — a long EURUSD
//              position is structurally short USD.
//   china    — China demand / supply-chain exposure
//   energy   — oil + gas + commodity-cycle exposure
//   rate     — duration / rate-cut beneficiary (high for long bonds,
//              negative for value/financials that benefit from
//              steepening)
//   beta     — broad-market beta tilt (1 = roughly SPY-like, >1 =
//              amplified)
//
// Anything not in the map falls back to neutral (zeros across the
// board, asset class "unknown"). The aggregator handles that
// gracefully so the UI degrades to "—" rather than crashing when a
// new ticker enters the covered list before its classification ships.
//
// This is hand-curated, not regression-derived. Future v2 swaps in a
// rolling regression against factor ETFs (XLK / UUP / FXI / XLE / TLT)
// — keeping the same output shape so the consuming components don't
// have to know which engine produced the numbers.

export type AssetClass =
  | 'equity'
  | 'etf-equity'
  | 'etf-sector'
  | 'etf-commodity'
  | 'etf-bond'
  | 'fx'
  | 'crypto'
  | 'unknown';

export interface FactorWeights {
  tech: number;
  usd: number;
  china: number;
  energy: number;
  rate: number;
  beta: number;
}

export interface TickerProfile {
  ticker: string;
  assetClass: AssetClass;
  region: string;
  sector: string | null;
  factors: FactorWeights;
}

const ZERO: FactorWeights = { tech: 0, usd: 0, china: 0, energy: 0, rate: 0, beta: 0 };

// Constructor sugar — saves repeating the `factors:` shape 80 times.
function p(
  ticker: string,
  assetClass: AssetClass,
  region: string,
  sector: string | null,
  f: Partial<FactorWeights> = {},
): TickerProfile {
  return {
    ticker,
    assetClass,
    region,
    sector,
    factors: { ...ZERO, ...f },
  };
}

const PROFILES: TickerProfile[] = [
  // ── US Tech mega-caps. Tech-heavy, mostly USD-revenue but Apple +
  //    Nvidia have meaningful non-USD revenue. China exposure is
  //    nonzero for the supply-chain-dependent ones.
  p('AAPL', 'equity', 'US', 'Technology', { tech: 1.0, china: 0.6, beta: 1.2 }),
  p('MSFT', 'equity', 'US', 'Technology', { tech: 1.0, beta: 1.1 }),
  p('GOOGL', 'equity', 'US', 'Technology', { tech: 1.0, beta: 1.1 }),
  p('GOOG', 'equity', 'US', 'Technology', { tech: 1.0, beta: 1.1 }),
  p('AMZN', 'equity', 'US', 'Consumer Discretionary', { tech: 0.8, beta: 1.3 }),
  p('NVDA', 'equity', 'US', 'Technology', { tech: 1.0, china: 0.5, beta: 1.6 }),
  p('TSLA', 'equity', 'US', 'Consumer Discretionary', { tech: 0.7, china: 0.6, beta: 1.9 }),
  p('META', 'equity', 'US', 'Communication Services', { tech: 1.0, beta: 1.3 }),
  p('NFLX', 'equity', 'US', 'Communication Services', { tech: 0.8, beta: 1.2 }),
  p('AVGO', 'equity', 'US', 'Technology', { tech: 1.0, china: 0.5, beta: 1.3 }),
  p('AMD', 'equity', 'US', 'Technology', { tech: 1.0, china: 0.4, beta: 1.7 }),
  p('INTC', 'equity', 'US', 'Technology', { tech: 0.9, china: 0.5, beta: 1.2 }),
  p('ORCL', 'equity', 'US', 'Technology', { tech: 0.9, beta: 1.0 }),
  p('CRM', 'equity', 'US', 'Technology', { tech: 1.0, beta: 1.2 }),
  p('ADBE', 'equity', 'US', 'Technology', { tech: 1.0, beta: 1.1 }),
  p('PLTR', 'equity', 'US', 'Technology', { tech: 1.0, beta: 1.8 }),
  p('COIN', 'equity', 'US', 'Financials', { tech: 0.6, beta: 2.2 }),
  p('SHOP', 'equity', 'CA', 'Technology', { tech: 1.0, beta: 1.7 }),
  p('UBER', 'equity', 'US', 'Industrials', { tech: 0.7, beta: 1.3 }),

  // ── US financials. Rate-sensitive (positive for banks, negative
  //    for payment networks that earn float).
  p('JPM', 'equity', 'US', 'Financials', { rate: 0.6, beta: 1.1 }),
  p('BAC', 'equity', 'US', 'Financials', { rate: 0.7, beta: 1.2 }),
  p('GS', 'equity', 'US', 'Financials', { rate: 0.5, beta: 1.3 }),
  p('V', 'equity', 'US', 'Financials', { tech: 0.4, beta: 0.9 }),
  p('MA', 'equity', 'US', 'Financials', { tech: 0.4, beta: 0.9 }),

  // ── Defensive / healthcare. Low beta, low factor exposure.
  p('UNH', 'equity', 'US', 'Healthcare', { beta: 0.7 }),
  p('JNJ', 'equity', 'US', 'Healthcare', { beta: 0.6 }),
  p('PFE', 'equity', 'US', 'Healthcare', { beta: 0.7 }),
  p('WMT', 'equity', 'US', 'Consumer Staples', { beta: 0.6 }),
  p('HD', 'equity', 'US', 'Consumer Discretionary', { beta: 1.0 }),
  p('COST', 'equity', 'US', 'Consumer Staples', { beta: 0.7 }),

  // ── Energy. Direct oil exposure dominates.
  p('XOM', 'equity', 'US', 'Energy', { energy: 1.0, beta: 0.9 }),
  p('CVX', 'equity', 'US', 'Energy', { energy: 1.0, beta: 0.9 }),

  // ── Broad-market ETFs.
  p('SPY', 'etf-equity', 'US', null, { beta: 1.0 }),
  p('QQQ', 'etf-equity', 'US', null, { tech: 0.7, beta: 1.2 }),
  p('DIA', 'etf-equity', 'US', null, { beta: 0.95 }),
  p('IWM', 'etf-equity', 'US', null, { beta: 1.3, rate: -0.3 }),
  p('VTI', 'etf-equity', 'US', null, { beta: 1.0 }),
  p('EFA', 'etf-equity', 'EAFE', null, { usd: -0.6, beta: 0.9 }),
  p('EEM', 'etf-equity', 'EM', null, { china: 0.4, usd: -0.7, beta: 1.1 }),
  p('FXI', 'etf-equity', 'China', null, { china: 1.0, usd: -0.5, beta: 1.2 }),
  p('VWO', 'etf-equity', 'EM', null, { usd: -0.7, beta: 1.1 }),

  // ── Sector ETFs.
  p('XLF', 'etf-sector', 'US', 'Financials', { rate: 0.5, beta: 1.1 }),
  p('XLE', 'etf-sector', 'US', 'Energy', { energy: 1.0, beta: 1.0 }),
  p('XLK', 'etf-sector', 'US', 'Technology', { tech: 1.0, beta: 1.2 }),
  p('XLV', 'etf-sector', 'US', 'Healthcare', { beta: 0.8 }),
  p('SMH', 'etf-sector', 'US', 'Semiconductors', { tech: 1.0, china: 0.4, beta: 1.5 }),
  p('ARKK', 'etf-sector', 'US', 'Innovation', { tech: 1.0, beta: 1.8 }),

  // ── Commodities (USD-quoted but the metal/oil itself is the
  //    non-USD asset, so they get negative USD weights).
  p('GLD', 'etf-commodity', 'Global', null, { usd: -0.7 }),
  p('SLV', 'etf-commodity', 'Global', null, { usd: -0.6, beta: 0.8 }),
  p('USO', 'etf-commodity', 'Global', null, { energy: 1.0 }),

  // ── Bonds. Long-duration treasuries are the cleanest rate beta.
  p('TLT', 'etf-bond', 'US', null, { rate: 1.0 }),
  p('IEF', 'etf-bond', 'US', null, { rate: 0.7 }),
  p('SHY', 'etf-bond', 'US', null, { rate: 0.3 }),
  p('HYG', 'etf-bond', 'US', null, { rate: 0.4, beta: 0.5 }),

  // ── FX pairs. USD weights are by quote convention:
  //    EURUSD long = short USD; USDJPY long = long USD.
  //    All carry zero beta to SPY.
  p('EURUSD=X', 'fx', 'EU', null, { usd: -1.0 }),
  p('GBPUSD=X', 'fx', 'UK', null, { usd: -1.0 }),
  p('AUDUSD=X', 'fx', 'AU', null, { usd: -1.0, china: 0.4 }),
  p('NZDUSD=X', 'fx', 'NZ', null, { usd: -1.0, china: 0.3 }),
  p('USDJPY=X', 'fx', 'JP', null, { usd: 1.0 }),
  p('USDCHF=X', 'fx', 'CH', null, { usd: 1.0 }),
  p('USDCAD=X', 'fx', 'CA', null, { usd: 1.0, energy: -0.3 }),
  p('USDMXN=X', 'fx', 'MX', null, { usd: 1.0 }),
  p('USDCNH=X', 'fx', 'CN', null, { usd: 1.0, china: -0.5 }),
  p('USDZAR=X', 'fx', 'ZA', null, { usd: 1.0 }),
  p('USDTRY=X', 'fx', 'TR', null, { usd: 1.0 }),
  p('USDINR=X', 'fx', 'IN', null, { usd: 1.0 }),

  // ── Crypto. All -USD pairs. Treated as a single high-beta cluster
  //    with mild short-USD lean (BTC/ETH narratives often pair with
  //    DXY moves).
  p('BTC-USD', 'crypto', 'Global', null, { usd: -0.3, beta: 2.0 }),
  p('ETH-USD', 'crypto', 'Global', null, { usd: -0.3, beta: 2.3 }),
  p('SOL-USD', 'crypto', 'Global', null, { beta: 2.5 }),
  p('XRP-USD', 'crypto', 'Global', null, { beta: 2.0 }),
  p('ADA-USD', 'crypto', 'Global', null, { beta: 2.2 }),
  p('DOGE-USD', 'crypto', 'Global', null, { beta: 2.5 }),
  p('AVAX-USD', 'crypto', 'Global', null, { beta: 2.4 }),
  p('LINK-USD', 'crypto', 'Global', null, { beta: 2.2 }),
  p('DOT-USD', 'crypto', 'Global', null, { beta: 2.2 }),
  p('MATIC-USD', 'crypto', 'Global', null, { beta: 2.3 }),
];

const PROFILE_BY_TICKER = new Map(PROFILES.map((p) => [p.ticker.toUpperCase(), p]));

export function getTickerProfile(ticker: string): TickerProfile | null {
  return PROFILE_BY_TICKER.get(ticker.toUpperCase()) ?? null;
}

export interface Holding {
  ticker: string;
  // Weight as a fraction of total portfolio value. Caller normalises;
  // we don't re-normalise here so the consumer sees if the inputs were
  // already off (sum < 1 implies cash; sum > 1 implies leverage).
  weight: number;
}

export interface ExposureBreakdown {
  // Sum of all input weights — surfaced so callers can detect cash
  // (sum < 1) or leverage (sum > 1) without recomputing.
  totalWeight: number;
  // Portion of the portfolio whose tickers were in the classification
  // map. Anything not classified is rolled into `unclassifiedWeight`.
  classifiedWeight: number;
  unclassifiedWeight: number;
  byAssetClass: Record<string, number>;
  byRegion: Record<string, number>;
  bySector: Record<string, number>;
  factors: FactorWeights;
  // Echoed back so the UI can render a "What we classified" footer.
  unclassifiedTickers: string[];
}

export function decomposeExposure(holdings: Holding[]): ExposureBreakdown {
  const out: ExposureBreakdown = {
    totalWeight: 0,
    classifiedWeight: 0,
    unclassifiedWeight: 0,
    byAssetClass: {},
    byRegion: {},
    bySector: {},
    factors: { ...ZERO },
    unclassifiedTickers: [],
  };
  for (const h of holdings) {
    if (!Number.isFinite(h.weight) || h.weight === 0) continue;
    out.totalWeight += h.weight;
    const prof = getTickerProfile(h.ticker);
    if (!prof) {
      out.unclassifiedWeight += h.weight;
      out.unclassifiedTickers.push(h.ticker);
      out.byAssetClass.unknown = (out.byAssetClass.unknown ?? 0) + h.weight;
      continue;
    }
    out.classifiedWeight += h.weight;
    out.byAssetClass[prof.assetClass] = (out.byAssetClass[prof.assetClass] ?? 0) + h.weight;
    out.byRegion[prof.region] = (out.byRegion[prof.region] ?? 0) + h.weight;
    if (prof.sector) {
      out.bySector[prof.sector] = (out.bySector[prof.sector] ?? 0) + h.weight;
    }
    // Factor weights aggregate as weighted sums — a 50/50 portfolio of
    // {tech: 1.0} and {tech: 0.0} reports a portfolio tech weight of
    // 0.5, which is what users intuitively expect.
    for (const k of Object.keys(out.factors) as (keyof FactorWeights)[]) {
      out.factors[k] += prof.factors[k] * h.weight;
    }
  }
  return out;
}

export function listAllProfiles(): TickerProfile[] {
  return PROFILES;
}

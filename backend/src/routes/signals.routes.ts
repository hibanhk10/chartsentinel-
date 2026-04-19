// Thin typing shim over the JS signals engine so the rest of the backend
// can consume it with type safety. The engine itself lives in
// src/signals/engine.js (ported wholesale from the preregister site) and
// registers its own routes under /api/signals/*.
//
// Why not rewrite it in TS? Two reasons:
//   1. The engine is self-contained (uses native fetch + Map-based cache,
//      no npm dependencies). A port-and-rewrite doubles the risk surface
//      for a first merge.
//   2. Keeping it as .js preserves a clean diff against the preregister
//      upstream so future merges are trivial.

import type { Express } from 'express';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const engine = require('../signals/engine');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const extended = require('../signals/extended');

export function registerSignalRoutes(app: Express): void {
  engine.registerSignalRoutes(app);
  // Extended engine needs fetchYahooHistory injected so its backtester +
  // correlation matrix don't reach around the module boundary for it.
  extended.registerExtendedRoutes(app, engine.fetchYahooHistory);
}

// Re-export the pure functions for anywhere else in the backend that wants
// to read a composite score, seasonality, or COT positioning without going
// through HTTP (e.g. the weekly digest, future alerts, admin UI).
export const computeCompositeScore: (
  ticker: string,
) => Promise<unknown> = engine.computeCompositeScore;

export const computeSeasonality: (
  ticker: string,
) => Promise<unknown> = engine.computeSeasonality;

export const computeCOTScore: (
  ticker: string,
) => Promise<unknown> = engine.computeCOTScore;

export const ALL_TICKERS: string[] = engine.ALL_TICKERS;

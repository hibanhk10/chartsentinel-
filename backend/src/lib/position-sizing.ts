// Position-sizing calculator. The single most-asked retail-trader
// question — "given my account and where I'd put a stop, how many
// shares should I actually buy?"
//
// Two methods supported:
//   • risk-percent: classic. Risk a fixed % of account per trade;
//     the position size falls out of (account * risk%) / (entry − stop).
//   • fixed-dollar: user names a dollar amount they're willing to lose
//     on the trade. Same formula but without the percent calculation.
//
// Returns an explicit error string instead of throwing — the agentic
// tool surface reads this directly so a bad input produces a useful
// "your stop equals your entry" rather than a 500.

export interface PositionSizingInput {
  accountSize: number;
  entry: number;
  stop: number;
  riskPercent?: number; // either riskPercent or riskDollars must be set
  riskDollars?: number;
  side?: 'long' | 'short';
}

export interface PositionSizingResult {
  shares: number;
  riskAmount: number;
  perShareRisk: number;
  notional: number;
  notionalPctOfAccount: number;
  side: 'long' | 'short';
  rrWarning?: string;
}

export function calculatePositionSize(input: PositionSizingInput): PositionSizingResult | { error: string } {
  const { accountSize, entry, stop, riskPercent, riskDollars, side = 'long' } = input;
  if (!Number.isFinite(accountSize) || accountSize <= 0) {
    return { error: 'accountSize must be a positive number.' };
  }
  if (!Number.isFinite(entry) || entry <= 0) return { error: 'entry must be a positive number.' };
  if (!Number.isFinite(stop) || stop <= 0) return { error: 'stop must be a positive number.' };
  if (entry === stop) {
    return { error: 'entry and stop are equal — there is no risk to size.' };
  }
  // Direction sanity: long stops should be below entry, short stops above.
  if (side === 'long' && stop >= entry) {
    return { error: 'For a long position, stop must be below entry.' };
  }
  if (side === 'short' && stop <= entry) {
    return { error: 'For a short position, stop must be above entry.' };
  }

  let riskAmount: number;
  if (typeof riskDollars === 'number' && Number.isFinite(riskDollars) && riskDollars > 0) {
    riskAmount = riskDollars;
  } else if (typeof riskPercent === 'number' && Number.isFinite(riskPercent) && riskPercent > 0) {
    riskAmount = accountSize * (riskPercent / 100);
  } else {
    return { error: 'Provide either riskPercent or riskDollars.' };
  }

  const perShareRisk = Math.abs(entry - stop);
  const rawShares = riskAmount / perShareRisk;
  const shares = Math.floor(rawShares);
  const notional = shares * entry;

  let rrWarning: string | undefined;
  // Heuristic: a trade where the position consumes >50% of the
  // account is almost always an oversized position even if the per-
  // share risk is small. Surface it.
  if (notional > accountSize * 0.5) {
    rrWarning =
      `Notional ${notional.toFixed(0)} is more than 50% of the account. ` +
      `Consider a wider stop or smaller risk%.`;
  }

  return {
    shares,
    riskAmount,
    perShareRisk,
    notional,
    notionalPctOfAccount: accountSize > 0 ? notional / accountSize : 0,
    side,
    rrWarning,
  };
}

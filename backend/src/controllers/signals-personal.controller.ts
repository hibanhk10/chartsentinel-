import { Request, Response } from 'express';
import { z } from 'zod';
import { signalWeightsService } from '../services/signal-weights.service';
import {
  computeScoreForTicker,
  normalizeSignalWeights,
} from '../routes/signals.routes';

interface AuthedRequest extends Request {
  user?: { id: string; email: string; role: string };
}

// Reads / writes the user's custom composite weights. The four components
// are seasonal, cot, pattern, and base — same names the engine recognises.
// Stored as JSON on User; the scoring pipeline normalises before scoring
// so a saved 30/30/30/10 is mathematically the same as 0.3/0.3/0.3/0.1.

const weightSchema = z.object({
  seasonal: z.number().nonnegative(),
  cot: z.number().nonnegative(),
  pattern: z.number().nonnegative(),
  base: z.number().nonnegative(),
});

export const getMyWeights = async (req: AuthedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Sign in first.' });
    return;
  }
  const weights = await signalWeightsService.forUser(req.user.id);
  res.json({
    weights,
    defaults: signalWeightsService.defaults(),
  });
};

export const setMyWeights = async (req: AuthedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Sign in first.' });
    return;
  }
  try {
    const body = weightSchema.parse(req.body);
    await signalWeightsService.setForUser(req.user.id, body);
    const fresh = await signalWeightsService.forUser(req.user.id);
    res.json({ weights: fresh });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0]?.message ?? 'Invalid request.' });
      return;
    }
    res.status(400).json({ error: error instanceof Error ? error.message : 'Could not save weights.' });
  }
};

export const resetMyWeights = async (req: AuthedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Sign in first.' });
    return;
  }
  await signalWeightsService.resetForUser(req.user.id);
  res.json({ weights: signalWeightsService.defaults() });
};

// Personal score — same orchestration as /api/signals/score/:ticker but
// the user's saved weights are folded into computeCompositeScore.
export const getMyScore = async (req: AuthedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Sign in first.' });
    return;
  }
  const ticker = req.params.ticker;
  if (!ticker) {
    res.status(400).json({ error: 'Ticker required.' });
    return;
  }

  try {
    const weights = await signalWeightsService.forUser(req.user.id);
    const result = await computeScoreForTicker(ticker, weights);
    if (!result) {
      res.status(404).json({ error: 'No price data for this ticker.' });
      return;
    }

    res.json({
      ticker,
      timestamp: new Date().toISOString(),
      composite: {
        score: result.composite,
        signal: result.signal,
        components: result.components,
      },
      weightsUsed: normalizeSignalWeights(weights),
    });
  } catch (err) {
    console.error('[me/score]', err);
    res.status(500).json({ error: 'Failed to compute personalised score.' });
  }
};

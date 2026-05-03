import { Prisma } from '@prisma/client';
import prisma from '../config/db';
import {
  DEFAULT_SIGNAL_WEIGHTS,
  normalizeSignalWeights,
} from '../routes/signals.routes';

// Stored shape on the User row. Loose typing because the column is JSON
// and older deployments may have written keys we don't recognise.
export type StoredWeights = {
  seasonal?: number;
  cot?: number;
  pattern?: number;
  base?: number;
};

export const signalWeightsService = {
  // Fetch a user's saved weights, normalised. Returns the default blend
  // when none are saved or the row is missing.
  async forUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { signalWeights: true },
    });
    return normalizeSignalWeights((user?.signalWeights as StoredWeights) ?? null);
  },

  // Save raw weights. We persist the user-supplied shape (not the
  // normalised one) so a 30/30/30/10 entry round-trips exactly when the
  // settings page reads it back, even though scoring still normalises
  // before computing the composite.
  async setForUser(userId: string, weights: StoredWeights) {
    // Sanity-check: every component must be finite, non-negative, and
    // the total must be > 0. We let the normaliser do the rescaling at
    // scoring time but reject obvious junk here.
    const components = ['seasonal', 'cot', 'pattern', 'base'] as const;
    for (const k of components) {
      const v = weights[k];
      if (v == null) continue;
      if (!Number.isFinite(v) || v < 0) {
        throw new Error(`${k} weight must be a non-negative number`);
      }
    }
    const total = components.reduce((a, k) => a + (weights[k] ?? 0), 0);
    if (total <= 0) throw new Error('At least one weight must be positive.');

    await prisma.user.update({
      where: { id: userId },
      data: { signalWeights: weights },
    });
  },

  // Reset to defaults — clears the JSON column. Prisma's nullable JSON
  // columns refuse plain null; use the explicit JsonNull sentinel.
  async resetForUser(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { signalWeights: Prisma.JsonNull },
    });
  },

  defaults() {
    return { ...DEFAULT_SIGNAL_WEIGHTS };
  },
};

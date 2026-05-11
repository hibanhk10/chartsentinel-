import { createHash } from 'node:crypto';
import prisma from '../config/db';
import env from '../config/env';

// LLM provider + per-identity daily caps. Sits in front of every
// /api/ai/* endpoint that needs to actually call a model.
//
// Provider priority:
//   1. OpenRouter (free model) if OPENROUTER_API_KEY is set — preferred
//      because the free models are good enough for short prompts and we
//      get to swap providers via env var.
//   2. Gemini if GEMINI_API_KEY is set — legacy path, kept for backward
//      compatibility with the existing Gemini wiring.
//   3. No call — the controller renders a fallback / mock response.
//
// Caps are per identity per UTC day, where identity is `u:<userId>`
// for authed callers and `ip:<sha256(ip)>` for anonymous. The cap is
// derived from the user's plan tier; anonymous gets the same floor
// as Free.
// OpenRouter's free-model catalog rotates aggressively — slugs that
// worked last week return 404 "No endpoints found" this week. Rather
// than play whack-a-mole on every catalog churn, we keep a ranked
// fallback list and try them in order, caching the first one that
// returns 200 so the rest of the process stays cheap. OPENROUTER_MODEL
// env var pins one model when an operator knows what they want.
const FALLBACK_MODELS: ReadonlyArray<string> = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'google/gemma-2-9b-it:free',
  'mistralai/mistral-7b-instruct:free',
  'mistralai/mistral-nemo:free',
  'qwen/qwen-2.5-7b-instruct:free',
  'nousresearch/hermes-3-llama-3.1-405b:free',
  'microsoft/phi-3-medium-128k-instruct:free',
  'liquid/lfm-40b:free',
];
const DEFAULT_MODEL = FALLBACK_MODELS[0];
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
// Sticky cache for the working model. Once a slug returns 200 we
// keep using it for the lifetime of the process; on 404 we burn the
// cache and rotate to the next candidate. Reset on container restart.
let workingModel: string | null = null;

export const DAILY_PROMPT_CAPS: Record<string, number> = {
  free: 5,
  pro: 30,
  ultimate: 200,
};

export interface LlmCallOptions {
  systemPrompt?: string;
  userMessage: string;
  maxTokens?: number;
}

export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export function identityForUser(userId: string | null | undefined, ip: string | undefined): string {
  if (userId) return `u:${userId}`;
  const safeIp = ip || 'unknown';
  return `ip:${createHash('sha256').update(safeIp).digest('hex').slice(0, 32)}`;
}

export function capForPlan(plan: string | null | undefined): number {
  if (!plan) return DAILY_PROMPT_CAPS.free;
  return DAILY_PROMPT_CAPS[plan] ?? DAILY_PROMPT_CAPS.free;
}

export interface UsageState {
  used: number;
  cap: number;
  remaining: number;
  exhausted: boolean;
}

// Returns the current usage state without incrementing — used by the
// frontend to render "X of Y prompts remaining today" pre-flight.
export async function readUsage(identity: string, plan: string | null | undefined): Promise<UsageState> {
  const day = todayUtc();
  const row = await prisma.aiUsage.findUnique({ where: { identity_day: { identity, day } } });
  const used = row?.count ?? 0;
  const cap = capForPlan(plan);
  return { used, cap, remaining: Math.max(0, cap - used), exhausted: used >= cap };
}

// Throws AI_CAP_EXCEEDED if the user is already at their cap. Use
// BEFORE calling the LLM so a refusal-to-charge happens up front
// rather than mid-stream. Pair with `recordUsage` after a successful
// LLM response so failed / mock fallbacks don't burn the user's
// daily budget.
export async function assertUnderCap(identity: string, plan: string | null | undefined): Promise<UsageState> {
  const state = await readUsage(identity, plan);
  if (state.exhausted) {
    const err = new Error('Daily AI prompt cap reached.') as Error & { code?: string };
    err.code = 'AI_CAP_EXCEEDED';
    throw err;
  }
  return state;
}

// Records a successful LLM call against the user's daily quota. Idempotent
// in the sense that two parallel calls won't slip past the cap — the
// upsert+increment runs in a transaction with a fresh cap check inside.
export async function recordUsage(identity: string, plan: string | null | undefined): Promise<UsageState> {
  const day = todayUtc();
  const cap = capForPlan(plan);
  const row = await prisma.$transaction(async (tx) => {
    const existing = await tx.aiUsage.findUnique({ where: { identity_day: { identity, day } } });
    if (existing && existing.count >= cap) {
      const err = new Error('Daily AI prompt cap reached.') as Error & { code?: string };
      err.code = 'AI_CAP_EXCEEDED';
      throw err;
    }
    return tx.aiUsage.upsert({
      where: { identity_day: { identity, day } },
      create: { identity, day, count: 1 },
      update: { count: { increment: 1 } },
    });
  });
  return { used: row.count, cap, remaining: Math.max(0, cap - row.count), exhausted: row.count >= cap };
}

// Backwards-compat alias for the previous "increment first, then call"
// flow. Internally identical to `recordUsage`. New code should use the
// `assertUnderCap` → `callLlm` → `recordUsage` pattern.
export const incrementUsage = recordUsage;

// Calls the configured LLM provider. Returns the text or null on failure.
// Caller decides what to do with null (typically a friendly fallback).
export async function callLlm(opts: LlmCallOptions): Promise<string | null> {
  if (env.OPENROUTER_API_KEY) {
    return callOpenRouter(opts);
  }
  if (env.GEMINI_API_KEY) {
    return callGemini(opts);
  }
  // The single-most-confusing failure mode is "neither key is set,
  // user wonders why the chat returns mocks." This warn fires once
  // per request that needs the LLM so the cause is obvious in
  // production logs.
  console.warn(
    '[ai] no LLM provider configured. Set OPENROUTER_API_KEY (preferred) or GEMINI_API_KEY on the backend service env.',
  );
  return null;
}

// Surface provider config at boot so the operator knows what to
// expect. Called from server.ts after env validation succeeds.
export function logAiProviderStatus(): void {
  const providers: string[] = [];
  if (env.OPENROUTER_API_KEY) providers.push(`OpenRouter (model=${env.OPENROUTER_MODEL || DEFAULT_MODEL})`);
  if (env.GEMINI_API_KEY) providers.push('Gemini');
  if (providers.length === 0) {
    console.warn('[ai] no LLM providers configured — /api/ai/* will return mock responses');
  } else {
    console.log('[ai] providers ready:', providers.join(', '));
  }
}

// Tries one specific model. Used by callOpenRouter to walk the
// fallback chain. Returns { ok: text } on success, { code, body } on a
// non-2xx so the caller can decide whether to retry the next model.
async function tryOpenRouter(
  model: string,
  opts: LlmCallOptions,
): Promise<{ ok: string } | { code: number; body: string } | { err: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12_000);
  try {
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': env.APP_URL || 'https://www.chartsentinel.com',
        'X-Title': 'ChartSentinel',
      },
      body: JSON.stringify({
        model,
        messages: [
          ...(opts.systemPrompt ? [{ role: 'system', content: opts.systemPrompt }] : []),
          { role: 'user', content: opts.userMessage },
        ],
        max_tokens: opts.maxTokens ?? 400,
        temperature: 0.4,
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '<no body>');
      return { code: res.status, body };
    }
    const body = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      error?: { message?: string; code?: number };
    };
    if (body?.error) {
      return { code: 200, body: JSON.stringify(body.error) };
    }
    const text = body?.choices?.[0]?.message?.content?.trim();
    if (!text) {
      return { code: 200, body: 'empty content' };
    }
    return { ok: text };
  } catch (err) {
    return { err: (err as Error).message };
  } finally {
    clearTimeout(timer);
  }
}

async function callOpenRouter(opts: LlmCallOptions): Promise<string | null> {
  // Build a candidate list: env-pinned model first (if set), then the
  // currently-cached working model, then the rest of the fallback
  // chain. Skips duplicates so a successful sticky model isn't tried
  // twice on the same request.
  const envPinned = env.OPENROUTER_MODEL || null;
  const candidates: string[] = [];
  const seen = new Set<string>();
  for (const m of [envPinned, workingModel, ...FALLBACK_MODELS]) {
    if (m && !seen.has(m)) {
      candidates.push(m);
      seen.add(m);
    }
  }

  for (const model of candidates) {
    const result = await tryOpenRouter(model, opts);
    if ('ok' in result) {
      if (workingModel !== model) {
        console.log(`[ai] openrouter using model=${model}`);
        workingModel = model;
      }
      return result.ok;
    }
    if ('code' in result) {
      console.warn(`[ai] openrouter ${result.code} model=${model}: ${result.body.slice(0, 240)}`);
      // 404 / 400 means the model is dead — keep walking. 401 / 403
      // is the API key itself; no point trying other models.
      if (result.code === 401 || result.code === 403) return null;
      // If env-pinned model failed, respect the operator's choice
      // and don't auto-fall-back to defaults — they pinned for a
      // reason, surface the error.
      if (envPinned && model === envPinned) return null;
      // Burn the cache so the next attempt re-discovers a working slug.
      if (workingModel === model) workingModel = null;
    } else {
      console.warn(`[ai] openrouter call failed model=${model}: ${result.err}`);
    }
  }
  return null;
}

async function callGemini(opts: LlmCallOptions): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const url =
      'https://generativelanguage.googleapis.com/v1beta/models/' +
      `gemini-2.0-flash:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY!)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl.signal,
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${opts.systemPrompt ?? ''}\n\n${opts.userMessage}` }],
          },
        ],
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return text && text.length > 0 ? text : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

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
// Smaller free model than llama-3.3-70b — that one's daily quota on
// OpenRouter free tier is brutal and often returns empty content. The
// 8B sibling is reliably available and good enough for our 1-3
// sentence prompts. Override via OPENROUTER_MODEL.
const DEFAULT_MODEL = 'meta-llama/llama-3.1-8b-instruct:free';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

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

// Atomically increments daily usage. Returns the post-increment state.
// Throws if the increment would exceed the cap (caller can branch on
// the error.code 'AI_CAP_EXCEEDED').
export async function incrementUsage(identity: string, plan: string | null | undefined): Promise<UsageState> {
  const day = todayUtc();
  const cap = capForPlan(plan);
  // Upsert + increment in a transaction so two concurrent requests
  // can't slip past the cap by both seeing `used < cap` before either
  // writes.
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

// Calls the configured LLM provider. Returns the text or null on failure.
// Caller decides what to do with null (typically a friendly fallback).
export async function callLlm(opts: LlmCallOptions): Promise<string | null> {
  if (env.OPENROUTER_API_KEY) {
    return callOpenRouter(opts);
  }
  if (env.GEMINI_API_KEY) {
    return callGemini(opts);
  }
  return null;
}

async function callOpenRouter(opts: LlmCallOptions): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12_000);
  try {
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        // OpenRouter recommends these for attribution + rate-limit
        // pooling. HTTP-Referer doubles as the calling app's URL.
        'HTTP-Referer': env.APP_URL || 'https://www.chartsentinel.com',
        'X-Title': 'ChartSentinel',
      },
      body: JSON.stringify({
        model: env.OPENROUTER_MODEL || DEFAULT_MODEL,
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
      // Capture the body — OpenRouter sends a JSON error with the
      // actual reason (invalid model, missing credits, rate limit,
      // unauthorised) and "[ai] openrouter 401" alone hides that.
      const body = await res.text().catch(() => '<no body>');
      console.warn(
        `[ai] openrouter ${res.status} model=${env.OPENROUTER_MODEL || DEFAULT_MODEL}: ${body.slice(0, 240)}`,
      );
      return null;
    }
    const body = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      error?: { message?: string; code?: number };
    };
    if (body?.error) {
      console.warn(
        `[ai] openrouter error model=${env.OPENROUTER_MODEL || DEFAULT_MODEL}:`,
        body.error,
      );
      return null;
    }
    const text = body?.choices?.[0]?.message?.content?.trim();
    if (!text) {
      console.warn(
        `[ai] openrouter returned empty content (model=${env.OPENROUTER_MODEL || DEFAULT_MODEL})`,
        JSON.stringify(body).slice(0, 240),
      );
    }
    return text && text.length > 0 ? text : null;
  } catch (err) {
    console.warn('[ai] openrouter call failed', (err as Error).message);
    return null;
  } finally {
    clearTimeout(timer);
  }
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

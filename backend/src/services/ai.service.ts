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
// OpenRouter fallback chain. Two tiers:
//
//   1. `:free` slugs — zero per-token cost, but the free pool is
//      shared globally and is almost always rate-limited (429)
//      unless the OpenRouter account has $10+ in deposit
//      ("accumulate your rate limits"). 404 entries get delisted
//      periodically; we drop them from the session and keep walking.
//
//   2. Paid micro-models — sub-cent prompts. We fall through to
//      these so the chat keeps working even when the free pool is
//      saturated. Typical call ~$0.00002, so 1000/day ≈ 2¢. Set
//      OPENROUTER_FREE_ONLY=true to skip this tier entirely.
//
// OPENROUTER_MODEL env pins one model and skips all fallbacks; use
// it when an operator knows exactly what they want.
const FREE_MODELS: ReadonlyArray<string> = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'nousresearch/hermes-3-llama-3.1-405b:free',
  'google/gemma-2-9b-it:free',
  'mistralai/mistral-7b-instruct:free',
  'mistralai/mistral-nemo:free',
  'qwen/qwen-2.5-7b-instruct:free',
];
const PAID_MICRO_MODELS: ReadonlyArray<string> = [
  'google/gemini-flash-1.5-8b', // ~$0.04/M tokens — cheapest mainstream
  'meta-llama/llama-3.2-3b-instruct', // ~$0.06/M
  'mistralai/mistral-nemo', // ~$0.1/M
];
const DEFAULT_MODEL = FREE_MODELS[0];
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Sticky cache for the working model. Once a slug returns 200 we
// keep using it for the lifetime of the process; on 404/429 we burn
// the cache and rotate to the next candidate. Reset on container
// restart.
let workingModel: string | null = null;

// Per-process record of slugs that returned 404 ("no endpoints
// found") so we don't keep paying the round-trip on permanently
// delisted models. 429s are NOT skipped — they're transient.
const deadModels = new Set<string>();

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
  // Make the agentic toggle impossible to miss. Without this line,
  // operators can't tell whether they're getting tool-grounded
  // answers or single-shot training-data answers from log scanning
  // alone.
  if (env.AI_AGENTIC) {
    console.log('[ai] agentic mode: ON (chat will call live-data tools before answering)');
  } else {
    console.log('[ai] agentic mode: OFF (set AI_AGENTIC=true to enable live-data tools)');
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
  // Build the candidate list. Order:
  //   1. operator-pinned model (env)         — exclusive when set
  //   2. last known-good "sticky" model      — fast path for warm process
  //   3. free models                          — preferred when they work
  //   4. paid micro models                    — fallback when free is dead
  // Permanently-404'd slugs are dropped via the session-level
  // deadModels set so a 9-deep retry chain shrinks to 1-2 hops
  // after the first request of the process.
  const envPinned = env.OPENROUTER_MODEL || null;
  const freeOnly = process.env.OPENROUTER_FREE_ONLY === 'true';
  const candidates: string[] = [];
  const seen = new Set<string>();
  const push = (m: string | null) => {
    if (!m || seen.has(m) || deadModels.has(m)) return;
    candidates.push(m);
    seen.add(m);
  };
  if (envPinned) {
    push(envPinned);
  } else {
    push(workingModel);
    for (const m of FREE_MODELS) push(m);
    if (!freeOnly) {
      for (const m of PAID_MICRO_MODELS) push(m);
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
      // 401 / 403 means the API key itself — abort, no point trying
      // other models.
      if (result.code === 401 || result.code === 403) return null;
      // 404 = model permanently delisted; remember so we skip it
      // for the rest of this process.
      if (result.code === 404) deadModels.add(model);
      // Pinned model failures stop here — operator chose this slug
      // for a reason and we shouldn't silently auto-fall-back.
      if (envPinned && model === envPinned) return null;
      // Burn the sticky cache so the next attempt re-discovers a
      // working slug instead of pinning the dead one.
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

// ─── Agentic tool-call loop ────────────────────────────────────────────────
//
// `callLlm` is one-shot — model gets a prompt, model returns text. The
// agentic path below is multi-shot: we pass a tool catalog with the
// message, the model can emit `tool_calls`, we execute them server-side
// and feed results back, repeat until the model returns plain text
// instead of another tool call.
//
// Hop limit prevents runaway loops — a misbehaving model could otherwise
// chain dozens of tool calls and burn the user's quota.

import { runTool, TOOL_SCHEMAS, type ToolContext } from './tools/catalog';

const MAX_TOOL_HOPS = 4;

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: {
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }[];
  tool_call_id?: string;
  name?: string;
}

export interface AgenticOptions {
  systemPrompt: string;
  userMessage: string;
  toolContext: ToolContext;
  maxTokens?: number;
}

// Sends one chat round-trip to OpenRouter with tool schemas attached.
// Returns the full assistant message so the caller can read either
// `content` (plain text) or `tool_calls` (function dispatch needed).
async function tryOpenRouterWithTools(
  model: string,
  messages: ChatMessage[],
  maxTokens: number,
): Promise<
  | { ok: ChatMessage }
  | { code: number; body: string }
  | { err: string }
> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20_000);
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
        messages,
        tools: TOOL_SCHEMAS,
        tool_choice: 'auto',
        max_tokens: maxTokens,
        temperature: 0.3,
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '<no body>');
      return { code: res.status, body };
    }
    const body = (await res.json()) as {
      choices?: { message?: ChatMessage }[];
      error?: { message?: string; code?: number };
    };
    if (body?.error) {
      return { code: 200, body: JSON.stringify(body.error) };
    }
    const msg = body?.choices?.[0]?.message;
    if (!msg) return { code: 200, body: 'empty content' };
    return { ok: msg };
  } catch (err) {
    return { err: (err as Error).message };
  } finally {
    clearTimeout(timer);
  }
}

// Picks a tool-capable model from the fallback chain. Most small free
// models don't reliably emit tool_calls; we prefer the larger ones
// first. Same dead-slug / 401 / pin behaviour as the plain caller.
const TOOL_CAPABLE_MODELS: ReadonlyArray<string> = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'nousresearch/hermes-3-llama-3.1-405b:free',
  'mistralai/mistral-nemo:free',
  // Paid fallbacks — sub-cent, used only if AI_AGENTIC + free pool is dead.
  'google/gemini-flash-1.5-8b',
  'mistralai/mistral-nemo',
];

async function callOpenRouterAgentic(opts: AgenticOptions): Promise<string | null> {
  const envPinned = env.OPENROUTER_MODEL || null;
  const candidates: string[] = [];
  const seen = new Set<string>();
  const push = (m: string | null) => {
    if (!m || seen.has(m) || deadModels.has(m)) return;
    candidates.push(m);
    seen.add(m);
  };
  if (envPinned) push(envPinned);
  else {
    push(workingModel);
    for (const m of TOOL_CAPABLE_MODELS) push(m);
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: opts.systemPrompt },
    { role: 'user', content: opts.userMessage },
  ];

  for (const model of candidates) {
    let finalText: string | null = null;
    let bailed = false;
    // Per-model inner loop: keep hopping tool calls until the model
    // either returns plain content or we hit the hop limit. A model
    // that fails at any step inside this loop drops to the next
    // candidate.
    for (let hop = 0; hop < MAX_TOOL_HOPS && !bailed; hop++) {
      const result = await tryOpenRouterWithTools(model, messages, opts.maxTokens ?? 700);
      if ('ok' in result) {
        const msg = result.ok;
        // The model wants to call one or more tools. Append the
        // assistant turn (with its tool_calls), execute each tool,
        // and append the tool responses for the next round.
        if (msg.tool_calls && msg.tool_calls.length > 0) {
          messages.push({
            role: 'assistant',
            content: msg.content ?? null,
            tool_calls: msg.tool_calls,
          });
          for (const tc of msg.tool_calls) {
            const out = await runTool(
              tc.function.name,
              tc.function.arguments,
              opts.toolContext,
            );
            messages.push({
              role: 'tool',
              tool_call_id: tc.id,
              name: tc.function.name,
              content: JSON.stringify(out).slice(0, 6000),
            });
          }
          continue;
        }
        // No tool call — model produced its final answer.
        const text = msg.content?.trim();
        if (text) {
          if (workingModel !== model) {
            console.log(`[ai] openrouter agentic using model=${model}`);
            workingModel = model;
          }
          finalText = text;
          break;
        }
        // Empty content + no tool calls = useless reply; drop the model.
        console.warn(`[ai] openrouter agentic empty reply model=${model}`);
        bailed = true;
      } else if ('code' in result) {
        console.warn(
          `[ai] openrouter agentic ${result.code} model=${model}: ${result.body.slice(0, 240)}`,
        );
        if (result.code === 401 || result.code === 403) return null;
        if (result.code === 404) deadModels.add(model);
        if (envPinned && model === envPinned) return null;
        if (workingModel === model) workingModel = null;
        bailed = true;
      } else {
        console.warn(`[ai] openrouter agentic call failed model=${model}: ${result.err}`);
        bailed = true;
      }
    }
    if (finalText) return finalText;
  }
  return null;
}

// Public entry point for the agentic chat. Returns null on hard
// failure; the caller renders an honest fallback. Quota debit still
// belongs to the caller — same charge-on-success contract as
// callLlm, so a 0-tool-call no-answer doesn't burn the user's budget.
export async function callLlmWithTools(opts: AgenticOptions): Promise<string | null> {
  if (env.OPENROUTER_API_KEY) {
    return callOpenRouterAgentic(opts);
  }
  // Gemini's REST API has its own tool-call format which we'd need to
  // bridge separately. For now, agentic mode requires OpenRouter; if
  // only Gemini is configured we fall back to a single-shot prompt
  // so the chat still works (without live data).
  if (env.GEMINI_API_KEY) {
    console.warn(
      '[ai] agentic mode requires OpenRouter; falling back to single-shot Gemini call',
    );
    return callLlm({
      systemPrompt: opts.systemPrompt,
      userMessage: opts.userMessage,
      maxTokens: opts.maxTokens,
    });
  }
  console.warn('[ai] no provider available for agentic call');
  return null;
}

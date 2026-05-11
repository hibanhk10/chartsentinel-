import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/db';
import {
    callLlm,
    incrementUsage,
    readUsage,
    identityForUser,
    capForPlan,
} from '../services/ai.service';

interface AuthedAiRequest extends Request {
    user?: { id: string; email: string; role: string };
}

// Resolve the caller's plan tier for AI rate limiting. Authed users
// read their `plan` column; anonymous callers and pre-plan-column
// users get the free cap.
async function resolveCallerPlan(req: AuthedAiRequest): Promise<string> {
    if (!req.user?.id) return 'free';
    const row = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { plan: true },
    });
    return row?.plan ?? 'free';
}

// Genesis AI / interrogation — single endpoint that powers the
// dashboard's chat tab. Mirrors the contract from the preregister
// site's /api/ai/interrogate so the chat component can hit either
// backend without adapters, but the implementation here uses raw
// fetch against Gemini's REST API rather than the SDK so we don't
// pull a new dep into the main backend just for one route.
//
// Behavior matrix:
//   - Compliance-blocked phrasing       -> stock disclaimer string
//   - GEMINI_API_KEY unset / missing     -> rotating mock string
//   - Gemini call succeeds              -> Gemini response
//   - Gemini call fails / times out     -> rotating fallback string
// Every branch returns 200 with { text } so the frontend never has
// to special-case errors.

const interrogateSchema = z.object({
    message: z.string().min(1, 'Message is required').max(2000),
});

const COMPLIANCE_BLOCKED_PHRASES = [
    'where should i invest',
    'what should i buy',
    'buy now',
    'good investment',
    'recommend',
];

const COMPLIANCE_RESPONSE
    = 'I am an AI analyst, not an investment advisor. I can provide general '
    + 'information about market dynamics, trends, and historical behaviors. '
    + 'I cannot give personalized investment advice or recommend specific assets.';

const MOCK_RESPONSES = [
    'Our models utilize multi-modal data streams, including sentiment analysis of unstructured financial text.',
    'Latency is optimized to sub-millisecond levels via direct market access (DMA).',
    'Risk parameters are dynamically adjusted based on real-time volatility clustering models.',
    'The intelligence matrix detects anomalous volume clustering in decentralized dark pools.',
];

const FAILURE_FALLBACKS = [
    'The intelligence matrix is experiencing high synaptic load. Analyzing via secondary nodes.',
    'Quantum decoherence detected in primary processing unit. Standby for recalibration.',
    'Neural pathways are currently saturated with high-priority market data. Insight speed may be reduced.',
    'Anomalous signal noise detected in the interrogation layer. Attempting secure bypass.',
];

const SYSTEM_PROMPT
    = 'You are ChartSentinel AI, an informational market analyst. Never provide '
    + 'investment advice. Analyze the user query and provide an insightful, '
    + 'data-backed response in 2-4 sentences. Always add a disclaimer that this '
    + 'is informational only.';

function pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

async function callGemini(
    userMessage: string,
    apiKey: string,
    systemPrompt: string = SYSTEM_PROMPT,
): Promise<string | null> {
    // Promise.race keeps the request bounded — Gemini occasionally
    // takes 20+ seconds to first byte and we'd rather show a fallback
    // than hang the chat UI.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    try {
        const url
            = 'https://generativelanguage.googleapis.com/v1beta/models/'
            + `gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`;

        const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
                contents: [
                    {
                        role: 'user',
                        parts: [
                            { text: `${systemPrompt}\n\nUser query: "${userMessage}"` },
                        ],
                    },
                ],
            }),
        });

        if (!resp.ok) {
            return null;
        }
        const json = await resp.json() as any;
        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (typeof text === 'string' && text.trim().length > 0) {
            return text.trim();
        }
        return null;
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

// ---------------------------------------------------------------------------
// /ai/sweep — macro market summary. Cached server-side for 5 min so a
// homepage with this widget mounted on every visit doesn't hammer the
// upstream provider. RSS fallback runs when GEMINI_API_KEY is unset
// or the upstream call fails.
// ---------------------------------------------------------------------------

const FALLBACK_RSS_SOURCES = [
    'https://feeds.bbci.co.uk/news/business/rss.xml',
    'https://www.coindesk.com/arc/outboundfeeds/rss/',
    'https://feeds.reuters.com/reuters/businessNews',
];

let sweepCache: { value: { summary: string; timestamp: number } | null; expiresAt: number } = {
    value: null, expiresAt: 0,
};

async function rssFallbackSummary(): Promise<string> {
    for (const rssUrl of FALLBACK_RSS_SOURCES) {
        try {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), 5000);
            const resp = await fetch(
                `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`,
                { signal: ctrl.signal }
            );
            clearTimeout(timer);
            const data = await resp.json() as any;
            if (data?.items?.length) {
                return `Live Insight: ${data.items[0].title}.`;
            }
        } catch {
            // try next
        }
    }
    return 'Market tracking active. Connectivity limited.';
}

const SWEEP_PROMPT
    = 'You are ChartSentinel AI, an informational market analyst. Never '
    + 'provide investment advice. Use a descriptive, not directive tone. '
    + 'Provide a 2-sentence macro market sweep summary based on current '
    + 'geopolitics and tech.';

export const sweep = async (_req: Request, res: Response) => {
    if (sweepCache.value && Date.now() < sweepCache.expiresAt) {
        res.json(sweepCache.value);
        return;
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    let summary: string;

    if (geminiKey) {
        const reply = await callGemini(SWEEP_PROMPT, geminiKey);
        summary = reply || (await rssFallbackSummary());
    } else {
        summary = await rssFallbackSummary();
    }

    const data = { summary, timestamp: Date.now() };
    sweepCache = { value: data, expiresAt: Date.now() + 5 * 60 * 1000 };
    res.json(data);
};

// ---------------------------------------------------------------------------
// /ai/alert — single-headline impact analysis. Cached per-headline (text
// hash-keyed in a plain Map so we don't add a Redis dep for what is
// effectively a memo). The breaking-news ticker calls this for the
// lead headline so the ticker can prepend an "AI ALERT:" prefix to one
// item per refresh cycle.
// ---------------------------------------------------------------------------

const alertSchema = z.object({
    headline: z.string().min(1, 'Headline required').max(500),
});

const alertCache = new Map<string, { analysis: string; expiresAt: number }>();

export const alert = async (req: Request, res: Response) => {
    try {
        const { headline } = alertSchema.parse(req.body);
        const cached = alertCache.get(headline);
        if (cached && Date.now() < cached.expiresAt) {
            res.json({ analysis: cached.analysis });
            return;
        }

        const geminiKey = process.env.GEMINI_API_KEY;
        let analysis: string;

        if (!geminiKey) {
            analysis = 'Market impact probability: Moderate.';
        } else {
            const prompt
                = 'You are ChartSentinel AI, a market analyst. Never provide '
                + 'investment advice. Analyze this headline for market context '
                + `in 1 short sentence. Be descriptive, not directive: ${headline}`;
            const reply = await callGemini(prompt, geminiKey);
            analysis = reply || 'Market impact probability: Moderate.';
        }

        // Hour-long TTL — headlines rarely change meaning within the same
        // breaking-news cycle, and caching means the same lead headline
        // doesn't burn 5+ Gemini calls per ticker refresh.
        alertCache.set(headline, {
            analysis,
            expiresAt: Date.now() + 60 * 60 * 1000,
        });
        res.json({ analysis });
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({
                success: false,
                errors: error.errors.map((err) => ({
                    field: err.path[0],
                    message: err.message,
                })),
            });
            return;
        }
        console.error('AI alert error:', error);
        res.json({ analysis: 'Market impact probability: Moderate.' });
    }
};

export const interrogate = async (req: Request, res: Response) => {
    try {
        const { message } = interrogateSchema.parse(req.body);
        const lower = message.toLowerCase();

        if (COMPLIANCE_BLOCKED_PHRASES.some((p) => lower.includes(p))) {
            res.json({ text: COMPLIANCE_RESPONSE });
            return;
        }

        const geminiKey = process.env.GEMINI_API_KEY;
        if (!geminiKey) {
            res.json({ text: pickRandom(MOCK_RESPONSES) });
            return;
        }

        const reply = await callGemini(message, geminiKey);
        if (reply) {
            res.json({ text: reply });
            return;
        }
        res.json({ text: pickRandom(FAILURE_FALLBACKS) });
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({
                success: false,
                errors: error.errors.map((err) => ({
                    field: err.path[0],
                    message: err.message,
                })),
            });
            return;
        }
        // Unexpected error — log it but still return a chat-shaped
        // response so the UI doesn't break.
        console.error('AI interrogate error:', error);
        res.json({ text: pickRandom(FAILURE_FALLBACKS) });
    }
};

// ---------------------------------------------------------------------------
// /ai/explain-score — plain-English breakdown of a ticker's composite score.
// Caller passes the components we just computed (rather than the server
// re-fetching) so latency is bounded by Gemini and we don't double-pay the
// upstream Yahoo / CFTC calls.
//
// Cached server-side keyed by (ticker, rounded score) for 15 min — the
// explanation is stable as long as the inputs don't move materially.
// ---------------------------------------------------------------------------

const explainScoreSchema = z.object({
    ticker: z.string().trim().min(1).max(20),
    score: z.number().int().min(-100).max(100),
    signal: z.string().trim().max(20),
    components: z.object({
        seasonal: z.number(),
        cot: z.number(),
        pattern: z.number(),
    }),
});

const EXPLAIN_PROMPT
    = 'You are ChartSentinel AI, an informational market analyst. Given a '
    + 'composite signal score and its three component contributions, write a '
    + '3-sentence plain-English breakdown of what is driving the score. '
    + 'Identify which component dominates, mention the direction (bullish/bearish/'
    + 'neutral), and ground each claim in the supplied numbers. Never recommend '
    + 'a trade or a position. Do not include a disclaimer in the response — '
    + 'the UI surfaces one separately.';

const EXPLAIN_FALLBACKS = [
    'Composite score reflects a blended view of seasonality, CFTC positioning, and historical pattern matches. Detailed AI breakdown unavailable; check the per-component bars for the underlying contributions.',
    'AI breakdown is temporarily unavailable. The score combines three weighted components — refer to the component bars to see which is pulling the composite in this direction.',
];

type ExplainCacheKey = string;
const explainCache = new Map<ExplainCacheKey, { text: string; expiresAt: number }>();
const EXPLAIN_TTL_MS = 15 * 60 * 1000;

function explainCacheKey(input: z.infer<typeof explainScoreSchema>): ExplainCacheKey {
    // Round each component to the nearest 5 so trivial drift between
    // requests still hits the cache. The ticker is uppercased so
    // ?ticker=btc-usd and ?ticker=BTC-USD don't get separate cache rows.
    const r = (n: number) => Math.round(n / 5) * 5;
    return `${input.ticker.toUpperCase()}|${r(input.score)}|${r(input.components.seasonal)}|${r(input.components.cot)}|${r(input.components.pattern)}`;
}

// Read-only usage status, used by the frontend to render "X of Y
// prompts remaining today" before the user fires a call.
export const usage = async (req: AuthedAiRequest, res: Response) => {
    try {
        const ip = req.ip || req.headers['x-forwarded-for']?.toString() || '';
        const identity = identityForUser(req.user?.id, ip);
        const plan = await resolveCallerPlan(req);
        const state = await readUsage(identity, plan);
        res.json({ usage: state, plan });
    } catch (error) {
        res.status(500).json({ error: 'usage lookup failed', detail: (error as Error).message });
    }
};

export const explainScore = async (req: AuthedAiRequest, res: Response) => {
    try {
        const input = explainScoreSchema.parse(req.body);
        const cacheKey = explainCacheKey(input);
        const cached = explainCache.get(cacheKey);
        const ip = req.ip || req.headers['x-forwarded-for']?.toString() || '';
        const identity = identityForUser(req.user?.id, ip);
        const plan = await resolveCallerPlan(req);

        // Cache hits skip the rate counter — repeated reads of the same
        // score+ticker are free for the user.
        if (cached && Date.now() < cached.expiresAt) {
            const usage = await readUsage(identity, plan);
            res.json({ text: cached.text, cached: true, usage });
            return;
        }

        // Increment the daily counter first. If the user has burned
        // their cap we send a structured 429 the frontend can render
        // as an upgrade prompt instead of a silent failure.
        let usage;
        try {
            usage = await incrementUsage(identity, plan);
        } catch (err) {
            if ((err as { code?: string }).code === 'AI_CAP_EXCEEDED') {
                const cap = capForPlan(plan);
                res.status(429).json({
                    error: 'Daily AI prompt cap reached.',
                    code: 'AI_CAP_EXCEEDED',
                    usage: { used: cap, cap, remaining: 0, exhausted: true },
                });
                return;
            }
            throw err;
        }

        // Compose a structured user message — the model does well with
        // key-value bullet inputs and we want it grounded strictly in
        // these numbers, not free-form analysis.
        const userMessage
            = `Ticker: ${input.ticker}\n`
            + `Composite score: ${input.score} (${input.signal})\n`
            + `Component contributions:\n`
            + `  • Seasonal: ${input.components.seasonal}\n`
            + `  • COT positioning: ${input.components.cot}\n`
            + `  • Historical pattern match: ${input.components.pattern}\n`
            + `Explain in 3 sentences which component dominates and why.`;

        const reply = await callLlm({
            systemPrompt: EXPLAIN_PROMPT,
            userMessage,
            maxTokens: 220,
        });
        const text = reply || pickRandom(EXPLAIN_FALLBACKS);

        if (reply) {
            explainCache.set(cacheKey, {
                text,
                expiresAt: Date.now() + EXPLAIN_TTL_MS,
            });
        }

        res.json({ text, cached: false, usage });
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({
                success: false,
                errors: error.errors.map((err) => ({
                    field: err.path[0],
                    message: err.message,
                })),
            });
            return;
        }
        console.error('AI explain-score error:', error);
        res.json({ text: pickRandom(EXPLAIN_FALLBACKS) });
    }
};

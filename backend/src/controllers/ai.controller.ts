import { Request, Response } from 'express';
import { z } from 'zod';

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

async function callGemini(userMessage: string, apiKey: string): Promise<string | null> {
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
                            { text: `${SYSTEM_PROMPT}\n\nUser query: "${userMessage}"` },
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

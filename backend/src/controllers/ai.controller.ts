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

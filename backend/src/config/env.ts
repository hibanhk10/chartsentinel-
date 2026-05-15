import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const envSchema = z.object({
  PORT: z.string().transform(Number).default('3000'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  // JWT_SECRET must be a real secret — a short or empty value is worse
  // than useless because the tokens it signs are trivially forgeable.
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 chars'),
  FRONTEND_URL: z.string().url().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  // Optional — when unset, Sentry stays quiet. Wire it in staging/prod only.
  SENTRY_DSN: z.string().url().optional(),

  // Transactional email via Resend. The email service no-ops when the key
  // is absent so dev environments don't send surprise mail. EMAIL_FROM
  // should match a verified domain in Resend, or a resend.dev sender for
  // early local testing. APP_URL is the public frontend base used in
  // reset-password links and the welcome email's CTA.
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  APP_URL: z.string().url().optional(),

  // Optional — when unset, /api/ai/interrogate returns rotating mock
  // responses so the chat UI still works in dev. Set in staging/prod
  // to enable real LLM-backed answers. We prefer OpenRouter over the
  // legacy Gemini key when both are present because OpenRouter offers
  // free-tier models (Llama 3.3 70B, Hermes, etc.) and lets us swap
  // providers without code changes.
  GEMINI_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().optional(),

  // Toggle the agentic chat loop. When true, /api/ai/interrogate
  // passes the tool catalog to the model and walks a tool-call
  // loop so the chat can pull real composite scores, insider
  // feeds, news, etc. before answering. Off by default to keep
  // costs predictable when no operator has reviewed the surface.
  AI_AGENTIC: z
    .string()
    .optional()
    .transform((v) => v === 'true' || v === '1'),

  // Stripe billing. Behaviour matrix:
  //   PAYMENTS_ENABLED unset / false → /api/payments/* returns 503 with a
  //                                    "payments are disabled" message,
  //                                    Pro features stay open for everyone
  //                                    (free-tier mode, useful for dev /
  //                                    pre-launch).
  //   PAYMENTS_ENABLED=true → checkout + webhook are live, isPaid gating
  //                            kicks in on the Pro endpoints (webhooks,
  //                            signal mix, portfolio, signal export).
  //
  // STRIPE_PRICE_PRO / _ULTIMATE are the Price IDs from the Stripe
  // dashboard. We avoid passing raw amounts to checkout — Stripe Price
  // objects let you change plans without redeploying.
  PAYMENTS_ENABLED: z
    .string()
    .optional()
    .transform((v) => v === 'true' || v === '1'),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_PRO: z.string().optional(),
  STRIPE_PRICE_ULTIMATE: z.string().optional(),

  // Telegram bot for watchlist alert delivery. When TELEGRAM_BOT_TOKEN is
  // unset the watchlist script silently skips the Telegram path and only
  // emails — same pattern as Resend / Gemini. Bot username is the public
  // @handle (without the @) used to build deep links from the Settings UI:
  // https://t.me/<username>?start=<token>. Webhook secret is matched
  // against the X-Telegram-Bot-Api-Secret-Token header on inbound
  // webhook calls so a third party can't forge /start events.
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_BOT_USERNAME: z.string().optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),
});

const env = envSchema.parse(process.env);

// Hard-fail in production if the frontend origin isn't configured. Without it
// the CORS middleware either opens to the world (dev-style) or blocks all
// browser traffic — both are worse than not booting.
if (env.NODE_ENV === 'production' && !env.FRONTEND_URL) {
  throw new Error(
    'FRONTEND_URL must be set in production so CORS can pin the allowed origin.'
  );
}

console.log('Environment loaded for DB host:', new URL(env.DATABASE_URL).host);

export default env;

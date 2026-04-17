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

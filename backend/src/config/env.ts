import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const envSchema = z.object({
  PORT: z.string().transform(Number).default('3000'),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string(),
});

const env = envSchema.parse(process.env);
console.log('Environment loaded for DB host:', new URL(env.DATABASE_URL).host);

export default env;

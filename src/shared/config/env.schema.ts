import { z } from 'zod';

export const envSchema = z.object({
  /** Application */
  NODE_ENV: z.enum(['development', 'production', 'staging', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  APP_NAME: z.string().default('NestJS Boilerplate'),
  APP_DESCRIPTION: z.string().default('NestJS Boilerplate backend API'),

  /** MongoDB */
  MONGODB_URI: z.string().url().default('mongodb://127.0.0.1:27017/turtles'),

  /** Redis / Cache */
  REDIS_URL: z.string().url().default('redis://127.0.0.1:6379'),
  CACHE_TTL: z.coerce.number().int().positive().default(5),

  /** Rate Limiting */
  THROTTLE_TTL: z.coerce.number().int().positive().default(60),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(100),

  /** Health Checks */
  HEALTH_HEAP_THRESHOLD_MB: z.coerce.number().int().positive().default(150),
  HEALTH_RSS_THRESHOLD_MB: z.coerce.number().int().positive().default(300),

  /** Seq Logging */
  SEQ_SERVER_URL: z.string().optional(),
  SEQ_API_KEY: z.string().optional(),
  SEQ_SERVICE_NAME: z.string().default('nestjs-boilerplate'),

  /** Resend */
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM: z.string().default('noreply@example.com'),

  /** Auth */
  AUTH_JWT_SECRET: z.string().default('your_jwt_secret_key'),
});

export type EnvConfig = z.infer<typeof envSchema>;

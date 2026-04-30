import { z } from 'zod';

export const envSchema = z.object({
  /** Application */
  NODE_ENV: z.enum(['development', 'production', 'staging', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

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

  /** Prometheus */
  PROMETHEUS_METRICS_PATH: z.string().default('metrics'),
});

export type EnvConfig = z.infer<typeof envSchema>;

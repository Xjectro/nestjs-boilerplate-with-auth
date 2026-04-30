const IDEMPOTENCY_NAMESPACE = 'idempotency';

export const IDEMPOTENCY_LOCK_TTL = 10 * 1000;
export const IDEMPOTENCY_CACHE_TTL = 300 * 1000;

export const buildIdempotencyKey = (token: string) => `${IDEMPOTENCY_NAMESPACE}:${token}`;
export const buildIdempotencyLockKey = (token: string) => `${buildIdempotencyKey(token)}:lock`;

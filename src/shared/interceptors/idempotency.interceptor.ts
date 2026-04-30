import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  BadRequestException,
  CallHandler,
  ConflictException,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { of } from 'rxjs';
import { tap } from 'rxjs/operators';
import {
  buildIdempotencyKey,
  buildIdempotencyLockKey,
  IDEMPOTENCY_CACHE_TTL,
  IDEMPOTENCY_LOCK_TTL,
} from '@/shared/http/idempotency';
import { getHeader, NestFastifyRequest } from '@/shared/http/request';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest<NestFastifyRequest>();
    const rawSign = getHeader(request, 'sign');
    const sign = Array.isArray(rawSign) ? rawSign[0] : rawSign;

    if (!sign) {
      throw new BadRequestException('Idempotency key missing');
    }

    const redisKey = buildIdempotencyKey(sign);
    const lockKey = buildIdempotencyLockKey(sign);

    const cached = await this.cacheManager.get(redisKey);
    if (cached) {
      return of(cached);
    }

    const lockExists = await this.cacheManager.get(lockKey);
    if (lockExists) {
      throw new ConflictException('Request already processing');
    }

    await this.cacheManager.set(lockKey, true, IDEMPOTENCY_LOCK_TTL);

    return next.handle().pipe(
      tap((data) => {
        void this.cacheManager.set(redisKey, data, IDEMPOTENCY_CACHE_TTL);
        void this.cacheManager.del(lockKey);
      }),
    );
  }
}

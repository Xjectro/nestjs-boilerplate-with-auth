import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { createCacheKeyBuilder } from '@/shared/cache/cache.keys';
import { Turtle } from './entities/turtle.schema';

const turtleCacheKeys = createCacheKeyBuilder('turtles');

@Injectable()
export class TurtleCacheRepository {
  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  getList() {
    return this.cacheManager.get<Turtle[]>(turtleCacheKeys.all());
  }

  async setList(data: Turtle[]) {
    await this.cacheManager.set(turtleCacheKeys.all(), data);
  }

  async evictList() {
    await this.cacheManager.del(turtleCacheKeys.all());
  }

  getOne(id: string) {
    return this.cacheManager.get<Turtle>(turtleCacheKeys.one(id));
  }

  async setOne(id: string, turtle: Turtle) {
    await this.cacheManager.set(turtleCacheKeys.one(id), turtle);
  }

  async evictOne(id: string) {
    await this.cacheManager.del(turtleCacheKeys.one(id));
  }
}

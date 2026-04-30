import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  MongooseHealthIndicator,
} from '@nestjs/terminus';
import type { EnvConfig } from '@/shared/config';
import { RedisHealthIndicator } from './redis.health.indicator';

const bytesFromMb = (value: number) => value * 1024 * 1024;

@Controller()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly mongoose: MongooseHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly redis: RedisHealthIndicator,
    private readonly config: ConfigService<EnvConfig, true>,
  ) {}

  @Get('health')
  @HealthCheck()
  check() {
    const heapLimit = this.config.get('HEALTH_HEAP_THRESHOLD_MB');
    const rssLimit = this.config.get('HEALTH_RSS_THRESHOLD_MB');

    return this.health.check([
      () => this.memory.checkHeap('memory_heap', bytesFromMb(heapLimit)),
      () => this.memory.checkRSS('memory_rss', bytesFromMb(rssLimit)),
      () => this.redis.isHealthy('redis'),
    ]);
  }

  @Get('ready')
  @HealthCheck()
  readiness() {
    return this.health.check([
      () => this.mongoose.pingCheck('mongodb'),
      () => this.redis.isHealthy('redis'),
    ]);
  }
}

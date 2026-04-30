import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { redisStore } from 'cache-manager-redis-yet';
import { ConfigModule, type EnvConfig } from '@/shared/config';
import { ContextModule } from '@/shared/context';
import { ResponseInterceptor } from '@/shared/interceptors/response.interceptor';
import { LoggerModule } from '@/shared/modules/logger.module';
import { MonitoringModule } from '@/shared/modules/monitoring.module';
import { HealthModule } from '@/modules/health/health.module';
import { TurtleModule } from '@/modules/turtle/turtle.module';

@Module({
  imports: [
    ConfigModule,
    ContextModule,
    EventEmitterModule.forRoot(),

    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvConfig, true>) => ({
        uri: config.get('MONGODB_URI'),
      }),
    }),

    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (config: ConfigService<EnvConfig, true>) => {
        const ttl = config.get('CACHE_TTL') * 1000;
        const redisUrl = config.get('REDIS_URL');

        try {
          const store = await redisStore({ url: redisUrl });
          return { store, ttl };
        } catch (error) {
          console.warn(
            `Redis connection failed (${redisUrl}). Falling back to in-memory cache.`,
            error,
          );
          return { ttl };
        }
      },
    }),

    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvConfig, true>) => [
        {
          ttl: config.get('THROTTLE_TTL'),
          limit: config.get('THROTTLE_LIMIT'),
        },
      ],
    }),

    /** Feature Modules */
    TurtleModule,
    HealthModule,

    /** Shared Modules */
    LoggerModule,
    MonitoringModule,
  ],
  providers: [
    ResponseInterceptor,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { redisStore } from 'cache-manager-redis-yet';
import { LoggerModule } from '@/integrations/logger/logger.module';
import { MonitoringModule } from '@/integrations/monitoring/monitoring.module';
import { ConfigModule, type EnvConfig } from '@/shared/config';
import { ContextModule } from '@/shared/context';
import { HealthModule } from '@/shared/health/health.module';
import { ResponseInterceptor } from '@/shared/interceptors/response.interceptor';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule,
    ContextModule,
    EventEmitterModule.forRoot(),

    /** MongoDB */
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvConfig, true>) => ({
        uri: config.get('MONGODB_URI'),
      }),
    }),

    /** Cache */
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

    /** Rate Limiting */
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
    AuthModule,
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

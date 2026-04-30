import * as crypto from 'crypto';
import { Global, Module } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { RequestContext } from './request-context.service';

@Global()
@Module({
  imports: [
    ClsModule.forRoot({
      global: true,
      interceptor: {
        mount: true,
        setup: (cls, context) => {
          const req = context.switchToHttp().getRequest();
          const existing = req.headers?.['x-correlation-id'];
          const correlationId =
            (Array.isArray(existing) ? existing[0] : existing) ?? crypto.randomUUID();
          cls.set('correlationId', correlationId);
          if (req.headers) {
            req.headers['x-correlation-id'] = correlationId;
          }
        },
      },
    }),
  ],
  providers: [RequestContext],
  exports: [RequestContext],
})
export class ContextModule {}

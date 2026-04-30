import { SeqLogger } from '@jasonsoft/nestjs-seq';
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { tap } from 'rxjs/operators';
import { RequestContext } from '@/shared/context';
import { NestFastifyRequest } from '@/shared/http/request';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    private readonly logger: SeqLogger,
    private readonly requestContext: RequestContext,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const now = Date.now();
    const request = context.switchToHttp().getRequest<NestFastifyRequest>();
    const { method, url, id, ip, headers } = request;

    const correlationId = this.requestContext.correlationId;

    const requestContext = {
      method,
      context: 'RouterRequest',
      url,
      requestId: id,
      correlationId,
      ip,
      userAgent: headers['user-agent'],
    };

    return next.handle().pipe(
      tap(() => {
        this.logger.log(
          `Completed {${url}, ${method}} route ${Date.now() - now}ms`,
          requestContext,
        );
      }),
    );
  }
}

import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { EnvConfig } from '@/shared/config';
import { RequestContext } from '@/shared/context';
import { NestFastifyRequest } from '@/shared/http/request';
import { ApiSuccessResponse } from '@/shared/http/response';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(
    private readonly config: ConfigService<EnvConfig, true>,
    private readonly requestContext: RequestContext,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<NestFastifyRequest>();

    if (!this.shouldWrap(request)) {
      return next.handle();
    }

    return next.handle().pipe(map((data) => this.toEnvelope(request, data)));
  }

  private toEnvelope(request: NestFastifyRequest | undefined, data: unknown): ApiSuccessResponse {
    return {
      success: true,
      data,
      path: request?.url ?? '',
      timestamp: new Date().toISOString(),
      requestId: request?.id,
      correlationId: this.requestContext.correlationId,
    };
  }

  private shouldWrap(request: NestFastifyRequest | undefined) {
    if (!request) {
      return true;
    }

    if (this.isMetricsRoute(request)) {
      return false;
    }

    const acceptHeader = this.normalizeAcceptHeader(request.headers?.accept);
    if (!acceptHeader) {
      return true;
    }

    if (acceptHeader.includes('application/json')) {
      return true;
    }

    if (acceptHeader.includes('*/*')) {
      return true;
    }

    return false;
  }

  private normalizeAcceptHeader(raw: string | string[] | undefined) {
    if (Array.isArray(raw)) {
      return raw.join(',').toLowerCase();
    }

    return raw?.toLowerCase();
  }

  private isMetricsRoute(request: NestFastifyRequest) {
    const configuredPath = this.config.get('PROMETHEUS_METRICS_PATH').replace(/^\/+/u, '');
    const metricsPath = `/${configuredPath}`.replace(/\/+$/u, '');
    const currentPath = (request.url?.split('?')[0] ?? '').replace(/\/+$/u, '');
    const knownRoutePath = (request as { route?: { path?: string } }).route?.path;
    const normalizedRoutePath = knownRoutePath?.replace(/\/+$/u, '');
    return currentPath === metricsPath || normalizedRoutePath === metricsPath;
  }
}

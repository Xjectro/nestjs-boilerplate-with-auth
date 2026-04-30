import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram } from 'prom-client';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

interface RequestLike {
  method?: string;
  url?: string;
  route?: {
    path?: string;
  };
}

interface ResponseLike {
  statusCode?: number;
}

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric('http_requests_total')
    private readonly httpRequestCounter: Counter<'method' | 'route' | 'status'>,
    @InjectMetric('http_request_duration_seconds')
    private readonly httpRequestDuration: Histogram<'method' | 'route' | 'status'>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<RequestLike>();
    const response = httpContext.getResponse<ResponseLike>();

    const baseLabels = {
      method: (request?.method ?? 'UNKNOWN').toUpperCase(),
      route: request?.route?.path ?? request?.url ?? 'UNKNOWN',
    } as const;

    const stopTimer = this.httpRequestDuration.startTimer(baseLabels);

    return next.handle().pipe(
      tap({
        next: () => this.recordSuccess(response, baseLabels, stopTimer),
        error: (err) => this.recordError(err, response, baseLabels, stopTimer),
      }),
    );
  }

  private recordSuccess(
    response: ResponseLike,
    baseLabels: Readonly<{ method: string; route: string }>,
    stopTimer: (labels?: Record<'method' | 'route' | 'status', string>) => void,
  ) {
    const status = response?.statusCode?.toString() ?? '200';
    const labels = { ...baseLabels, status };
    this.httpRequestCounter.inc(labels);
    stopTimer(labels);
  }

  private recordError(
    err: unknown,
    response: ResponseLike,
    baseLabels: Readonly<{ method: string; route: string }>,
    stopTimer: (labels?: Record<'method' | 'route' | 'status', string>) => void,
  ) {
    const status = this.resolveStatus(err, response);
    const labels = { ...baseLabels, status };
    this.httpRequestCounter.inc(labels);
    stopTimer(labels);
  }

  private resolveStatus(err: unknown, response: ResponseLike) {
    if (err instanceof HttpException) {
      return err.getStatus().toString();
    }

    const fallbackStatus = response?.statusCode ?? 500;
    return fallbackStatus.toString();
  }
}

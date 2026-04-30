import * as crypto from 'crypto';
import { Injectable, NestMiddleware } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { NestFastifyRequest } from '@/shared/http/request';

const CORRELATION_HEADER = 'x-correlation-id';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  constructor(private readonly cls: ClsService) {}

  use(req: NestFastifyRequest, _res: unknown, next: () => void) {
    const existing = req.headers[CORRELATION_HEADER];
    const correlationId = (Array.isArray(existing) ? existing[0] : existing) ?? crypto.randomUUID();

    this.cls.set('correlationId', correlationId);
    req.headers[CORRELATION_HEADER] = correlationId;

    next();
  }
}

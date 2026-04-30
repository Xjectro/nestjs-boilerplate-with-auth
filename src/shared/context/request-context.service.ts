import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class RequestContext {
  constructor(private readonly cls: ClsService) {}

  get correlationId(): string | undefined {
    return this.cls.get('correlationId');
  }

  set correlationId(value: string) {
    this.cls.set('correlationId', value);
  }

  get<T = unknown>(key: string): T | undefined {
    return this.cls.get(key);
  }

  set<T = unknown>(key: string, value: T): void {
    this.cls.set(key, value);
  }
}

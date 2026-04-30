import { SeqLogger } from '@jasonsoft/nestjs-seq';
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { NestFastifyRequest } from '@/shared/http/request';
import { ApiErrorCode, ApiErrorResponse } from '@/shared/http/response';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: SeqLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') {
      throw exception;
    }

    const http = host.switchToHttp();
    const response = http.getResponse<FastifyReply>();
    const request = http.getRequest<NestFastifyRequest>();

    const normalized = this.normalizeError(exception);
    const payload: ApiErrorResponse = {
      success: false,
      errorCode: normalized.errorCode,
      message: normalized.message,
      path: request?.url ?? '',
      timestamp: new Date().toISOString(),
      requestId: request?.id,
      details: normalized.details,
    };

    if (normalized.shouldLog) {
      const stack = this.isErrorLike(exception) ? exception.stack : undefined;
      this.logger.error(payload.message, stack);
    }

    if (!response.sent) {
      response.raw.writeHead(normalized.status, { 'content-type': 'application/json' });
      response.raw.end(JSON.stringify(payload));
    }
  }

  private normalizeError(exception: unknown): {
    status: number;
    errorCode: ApiErrorCode | string;
    message: string;
    details?: unknown;
    shouldLog: boolean;
  } {
    if (this.isHttpException(exception)) {
      const response = exception.getResponse();
      const message = this.extractMessage(response) ?? exception.message ?? 'Request failed.';
      const providedCode = this.extractErrorCode(response);

      return {
        status: exception.getStatus(),
        errorCode: providedCode ?? this.mapStatusToCode(exception.getStatus(), response),
        message,
        details: this.extractDetails(response),
        shouldLog: exception.getStatus() >= 500,
      };
    }

    const fallbackMessage = this.isErrorLike(exception)
      ? exception.message
      : 'Internal server error occurred.';

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      errorCode: ApiErrorCode.INTERNAL_SERVER_ERROR,
      message: fallbackMessage,
      shouldLog: true,
    };
  }

  private mapStatusToCode(status: number, response: unknown): ApiErrorCode | string {
    if (status === HttpStatus.BAD_REQUEST) {
      if (this.isValidationResponse(response)) {
        return ApiErrorCode.VALIDATION_FAILED;
      }
      return ApiErrorCode.BAD_REQUEST;
    }

    if (status === HttpStatus.UNAUTHORIZED) {
      return ApiErrorCode.UNAUTHORIZED;
    }

    if (status === HttpStatus.FORBIDDEN) {
      return ApiErrorCode.FORBIDDEN;
    }

    if (status === HttpStatus.NOT_FOUND) {
      return ApiErrorCode.NOT_FOUND;
    }

    if (status === HttpStatus.CONFLICT) {
      return ApiErrorCode.CONFLICT;
    }

    if (status >= 500) {
      return ApiErrorCode.INTERNAL_SERVER_ERROR;
    }

    return `HTTP_${status}`;
  }

  private extractMessage(response: unknown): string | undefined {
    if (typeof response === 'string') {
      return response;
    }

    if (this.isRecord(response)) {
      const message = response.message;
      if (typeof message === 'string') {
        return message;
      }

      if (Array.isArray(message)) {
        return message.join(', ');
      }
    }

    return undefined;
  }

  private extractDetails(response: unknown): unknown {
    if (typeof response === 'string') {
      return undefined;
    }

    if (this.isRecord(response)) {
      const { message, errorCode, ...rest } = response;
      return Object.keys(rest).length > 0 ? rest : undefined;
    }

    return undefined;
  }

  private extractErrorCode(response: unknown): string | undefined {
    if (!this.isRecord(response)) {
      return undefined;
    }

    const code = response.errorCode;
    return typeof code === 'string' ? code : undefined;
  }

  private isValidationResponse(response: unknown): boolean {
    if (!this.isRecord(response)) {
      return false;
    }

    const { message } = response;
    return Array.isArray(message);
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return this.isObject(value) && !Array.isArray(value);
  }

  private isHttpException(exception: unknown): exception is HttpException {
    return this.isObject(exception) && exception instanceof HttpException;
  }

  private isErrorLike(value: unknown): value is Error {
    return this.isObject(value) && value instanceof Error;
  }

  private isObject(value: unknown): value is object {
    return typeof value === 'object' && value !== null;
  }
}

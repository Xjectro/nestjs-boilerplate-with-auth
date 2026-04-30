export enum ApiErrorCode {
  UNIQUE_SLUG = 'UNIQUE_SLUG',
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
}

export type ApiSuccessResponse<T = unknown> = {
  success: true;
  data: T;
  path: string;
  timestamp: string;
  requestId?: string | number;
  correlationId?: string;
};

export type ApiErrorResponse = {
  success: false;
  errorCode: ApiErrorCode | string;
  message: string;
  path: string;
  timestamp: string;
  requestId?: string | number;
  correlationId?: string;
  details?: unknown;
};

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

export enum ApiErrorCode {
  UNIQUE_SLUG = 'UNIQUE_SLUG',
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  EMAIL_NOT_FOUND = 'EMAIL_NOT_FOUND',
  PASSWORD_INVALID = 'PASSWORD_INVALID',
  EMAIL_ALREADY_IN_USE = 'EMAIL_ALREADY_IN_USE',
  TOKEN_INVALID = 'TOKEN_INVALID',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  OTP_INVALID = 'OTP_INVALID',
  OTP_EXPIRED = 'OTP_EXPIRED',
  OTP_ALREADY_USED = 'OTP_ALREADY_USED',
  OTP_PURPOSE_MISMATCH = 'OTP_PURPOSE_MISMATCH',
  CUSTOMER_NOT_FOUND = 'CUSTOMER_NOT_FOUND',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
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

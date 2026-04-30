export type ApiSuccessPayload<T> = {
  success: true;
  data: T;
  path: string;
  timestamp: string;
  requestId?: string | number;
};

export type ApiErrorPayload = {
  success: false;
  errorCode: string;
  message: string;
  path: string;
  timestamp: string;
  requestId?: string | number;
  details?: unknown;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const assertSuccessPayload = <T>(payload: unknown): ApiSuccessPayload<T> => {
  if (!isPlainObject(payload)) {
    throw new Error('Response payload must be an object.');
  }

  if (payload.success !== true) {
    throw new Error('Response payload is not a success envelope.');
  }

  if (!('data' in payload)) {
    throw new Error('Success payload must include data.');
  }

  if (typeof payload.path !== 'string' || typeof payload.timestamp !== 'string') {
    throw new Error('Success payload must include path and timestamp.');
  }

  return payload as ApiSuccessPayload<T>;
};

export const assertErrorPayload = (payload: unknown): ApiErrorPayload => {
  if (!isPlainObject(payload)) {
    throw new Error('Error payload must be an object.');
  }

  if (payload.success !== false) {
    throw new Error('Error payload must have success=false.');
  }

  if (typeof payload.errorCode !== 'string' || typeof payload.message !== 'string') {
    throw new Error('Error payload must include a message and error code.');
  }

  if (typeof payload.path !== 'string' || typeof payload.timestamp !== 'string') {
    throw new Error('Error payload must include path and timestamp.');
  }

  return payload as ApiErrorPayload;
};

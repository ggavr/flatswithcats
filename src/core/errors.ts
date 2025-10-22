export type AppErrorCode =
  | 'APP_ERROR'
  | 'VALIDATION'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'RATE_LIMIT'
  | 'DEPENDENCY';

export class AppError extends Error {
  constructor(message: string, public code: AppErrorCode = 'APP_ERROR', public details?: unknown) {
    super(message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) { super(message, 'VALIDATION', details); }
}

export class Forbidden extends AppError {
  constructor(message = 'Forbidden', details?: unknown) { super(message, 'FORBIDDEN', details); }
}

export class NotFound extends AppError {
  constructor(message = 'Not found', details?: unknown) { super(message, 'NOT_FOUND', details); }
}

export class Unauthorized extends AppError {
  constructor(message = 'Unauthorized', details?: unknown) { super(message, 'UNAUTHORIZED', details); }
}

export class RateLimited extends AppError {
  constructor(message = 'Rate limit exceeded', details?: unknown) { super(message, 'RATE_LIMIT', details); }
}

export class DependencyError extends AppError {
  constructor(message = 'External dependency error', details?: unknown) { super(message, 'DEPENDENCY', details); }
}

export const isAppError = (err: unknown): err is AppError => err instanceof AppError;

export const toAppError = (err: unknown, fallback: AppError = new AppError('Unexpected error')): AppError => {
  if (isAppError(err)) return err;
  if (err instanceof Error) return new AppError(err.message, 'APP_ERROR', err);
  return fallback;
};

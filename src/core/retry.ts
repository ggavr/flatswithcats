import { log } from './logger';
import { DependencyError, RateLimited } from './errors';

const retryLog = log.withContext({ scope: 'retry' });

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableErrors?: Array<new (...args: any[]) => Error>;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 200,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
  retryableErrors: [DependencyError]
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableError = (error: unknown, retryableErrors: Array<new (...args: any[]) => Error>): boolean => {
  if (!error) return false;
  
  // Always retry on rate limit errors (429)
  if (error instanceof RateLimited) return true;
  
  // Check if error is instance of any retryable error class
  return retryableErrors.some((ErrorClass) => error instanceof ErrorClass);
};

const getRetryDelay = (error: unknown): number | null => {
  // If it's a RateLimited error, check if it has retry-after info
  if (error instanceof RateLimited && error.details && typeof error.details === 'object') {
    const details = error.details as Record<string, unknown>;
    if (typeof details.retryAfter === 'number') {
      return details.retryAfter * 1000; // Convert to ms
    }
  }
  return null;
};

export const withRetry = async <T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
  context?: Record<string, unknown>
): Promise<T> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const scopedLog = context ? retryLog.withContext(context) : retryLog;

  let lastError: unknown;
  
  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      const isLastAttempt = attempt === opts.maxAttempts;
      const isRetryable = isRetryableError(error, opts.retryableErrors);
      
      if (isLastAttempt || !isRetryable) {
        scopedLog.error('Operation failed permanently', { attempt, error });
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const customDelay = getRetryDelay(error);
      const baseDelay = opts.initialDelayMs * Math.pow(opts.backoffMultiplier, attempt - 1);
      const delayMs = customDelay || Math.min(baseDelay, opts.maxDelayMs);
      
      scopedLog.warn('Operation failed, retrying', { 
        attempt, 
        nextAttempt: attempt + 1, 
        delayMs,
        error: error instanceof Error ? error.message : String(error)
      });
      
      await sleep(delayMs);
    }
  }
  
  throw lastError;
};


import { APIResponseError, Client } from '@notionhq/client';
import { cfg } from '../core/config';
import { DependencyError, Forbidden, NotFound, RateLimited, Unauthorized } from '../core/errors';
import { log } from '../core/logger';
import { withRetry } from '../core/retry';

const notionLog = log.withContext({ scope: 'notion' });
const NOTION_TIMEOUT_MS = 10_000;

const fetchWithTimeout: typeof fetch = async (input, init = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), NOTION_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      throw new DependencyError('Notion request timed out', { input });
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

export const notion = new Client({ auth: cfg.notion.token, fetch: fetchWithTimeout as any });
export const DB = {
  profiles: cfg.notion.dbProfiles,
  listings: cfg.notion.dbListings,
  subscriptions: cfg.notion.dbSubscriptions
};

const extractRetryAfter = (error: APIResponseError): number | undefined => {
  // Try to extract retry-after from response headers or body
  if (error.status === 429) {
    // Notion typically returns retry-after in seconds in the response
    if (typeof error.body === 'object' && error.body !== null) {
      const body = error.body as Record<string, unknown>;
      if (typeof body.retry_after === 'number') {
        return body.retry_after;
      }
    }
    // Default to 60 seconds for rate limits
    return 60;
  }
  return undefined;
};

export const handleNotionError = (error: unknown, context: Record<string, unknown>): never => {
  const scoped = notionLog.withContext(context);
  if (error instanceof APIResponseError) {
    scoped.error('Notion API error', error.body);
    const retryAfter = extractRetryAfter(error);
    switch (error.status) {
      case 401:
        throw new Unauthorized('Notion: unauthorized', error.body);
      case 403:
        throw new Forbidden('Notion: forbidden', error.body);
      case 404:
        throw new NotFound('Notion: resource not found', error.body);
      case 429:
        // Build details object for rate limit error
        const details = typeof error.body === 'object' && error.body !== null 
          ? { ...(error.body as Record<string, unknown>), retryAfter }
          : { body: error.body, retryAfter };
        throw new RateLimited('Notion: rate limited', details);
      case 500:
      case 502:
      case 503:
      case 504:
        // Transient server errors - should be retried
        throw new DependencyError(`Notion server error (${error.status})`, error.body);
      default:
        throw new DependencyError(`Notion request failed (${error.status})`, error.body);
    }
  }
  if (error instanceof DependencyError) {
    scoped.error('Notion dependency error', error);
    throw error;
  }
  scoped.error('Notion client error', error);
  throw new DependencyError('Unknown Notion client error', error);
};

/**
 * Wrapper to execute Notion operations with automatic retry logic
 */
export const withNotionRetry = <T>(
  fn: () => Promise<T>,
  context?: Record<string, unknown>
): Promise<T> => {
  return withRetry(
    fn,
    {
      maxAttempts: 3,
      initialDelayMs: 300,
      maxDelayMs: 10000,
      backoffMultiplier: 2,
      retryableErrors: [DependencyError, RateLimited]
    },
    context
  );
};

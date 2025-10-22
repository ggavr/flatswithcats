import { APIResponseError, Client } from '@notionhq/client';
import { cfg } from '../core/config';
import { DependencyError, Forbidden, NotFound, RateLimited, Unauthorized } from '../core/errors';
import { log } from '../core/logger';

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
  listings: cfg.notion.dbListings
};

export const handleNotionError = (error: unknown, context: Record<string, unknown>): never => {
  const scoped = notionLog.withContext(context);
  if (error instanceof APIResponseError) {
    scoped.error('Notion API error', error.body);
    switch (error.status) {
      case 401:
        throw new Unauthorized('Notion: unauthorized', error.body);
      case 403:
        throw new Forbidden('Notion: forbidden', error.body);
      case 404:
        throw new NotFound('Notion: resource not found', error.body);
      case 429:
        throw new RateLimited('Notion: rate limited', error.body);
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

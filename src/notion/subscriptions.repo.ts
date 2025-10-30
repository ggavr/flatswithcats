import { notion, DB, handleNotionError, withNotionRetry } from './notionClient';
import { text, parseRichText, parseNumber, buildRichTextProperty } from './notionUtils';
import type {
  NotionPage,
  NotionDatabaseQueryResponse
} from './notionTypes';
import { DependencyError } from '../core/errors';
import { log } from '../core/logger';
import { createCache } from '../core/cache';

const subscriptionsRepoLog = log.withContext({ scope: 'subscriptionsRepo' });

const REQUIRED_PROPERTIES: Record<string, { rich_text: Record<string, never> }> = {
  cities: { rich_text: {} },
  countries: { rich_text: {} }
};

const REQUIRED_NUMBER_PROPERTIES = ['tgId'];

let cachedSubscriptionProperties: Set<string> | null = null;
const SUBSCRIPTION_CACHE_TTL_MS = 5 * 60_000; // 5 minutes

interface Subscription {
  tgId: number;
  cities: string;
  countries: string;
  enabled: boolean;
}

type StoredSubscription = Subscription & { id: string; createdAt: string; updatedAt: string };

const subscriptionCache = createCache<number, StoredSubscription>({
  ttlMs: SUBSCRIPTION_CACHE_TTL_MS,
  maxSize: 1000,
  logContext: 'subscriptions'
});

const ensureSubscriptionsSchema = async () => {
  if (cachedSubscriptionProperties) return cachedSubscriptionProperties;
  
  try {
    const db = await notion.databases.retrieve({ database_id: DB.subscriptions });
    const available = new Set<string>(Object.keys(db.properties ?? {}));
    const missingRichText = Object.entries(REQUIRED_PROPERTIES).filter(([key]) => !available.has(key));
    const missingNumbers = REQUIRED_NUMBER_PROPERTIES.filter((key) => !available.has(key));

    if (missingNumbers.length) {
      throw new DependencyError('Subscriptions database missing required number properties.', { missingNumbers });
    }

    if (missingRichText.length) {
      const payload = missingRichText.reduce<Record<string, { rich_text: Record<string, never> }>>(
        (acc, [key, schema]) => {
          acc[key] = schema;
          return acc;
        },
        {}
      );
      
      try {
        await notion.databases.update({ database_id: DB.subscriptions, properties: payload });
        missingRichText.forEach(([key]) => available.add(key));
        subscriptionsRepoLog.info('Extended subscriptions database schema', {
          added: missingRichText.map(([key]) => key)
        });
      } catch (error) {
        throw new DependencyError(
          'Subscriptions database missing required properties (cities, countries).',
          error
        );
      }
    }
    
    cachedSubscriptionProperties = available;
    return available;
  } catch (error) {
    subscriptionsRepoLog.error('Failed to retrieve subscriptions database schema', error);
    throw error;
  }
};

const toSubscription = (page: NotionPage): StoredSubscription => {
  const props = page?.properties ?? {};
  
  const getNumber = (prop: any): number | undefined => {
    if (prop && 'number' in prop) {
      return typeof prop.number === 'number' ? prop.number : undefined;
    }
    return undefined;
  };
  
  const getCheckbox = (prop: any): boolean => {
    if (prop && 'checkbox' in prop) {
      return Boolean(prop.checkbox);
    }
    return false;
  };
  
  return {
    id: page.id,
    tgId: getNumber(props.tgId) ?? 0,
    cities: parseRichText(props.cities),
    countries: parseRichText(props.countries),
    enabled: getCheckbox(props.enabled),
    createdAt: typeof page?.created_time === 'string' ? page.created_time : new Date().toISOString(),
    updatedAt: typeof page?.last_edited_time === 'string' ? page.last_edited_time : new Date().toISOString()
  };
};

export const subscriptionsRepo = {
  async upsert(tgId: number, cities: string, countries: string, enabled: boolean): Promise<StoredSubscription> {
    try {
      await ensureSubscriptionsSchema();
      
      // Check if subscription already exists
      const existing = await this.findByTgId(tgId);
      
      if (existing) {
        // Update existing
        const updated = await withNotionRetry(
          async () => {
            const page = await notion.pages.update({
              page_id: existing.id,
              properties: {
                cities: { rich_text: text(cities) },
                countries: { rich_text: text(countries) },
                enabled: { checkbox: enabled }
              }
            } as any);
            return toSubscription(page as NotionPage);
          },
          { tgId, op: 'subscriptions.update' }
        );
        
        subscriptionCache.set(tgId, updated);
        return updated;
      } else {
        // Create new
        const created = await withNotionRetry(
          async () => {
            const page = await notion.pages.create({
              parent: { database_id: DB.subscriptions },
              properties: {
                title: { title: text(`subscription-${tgId}`) },
                tgId: { number: tgId },
                cities: { rich_text: text(cities) },
                countries: { rich_text: text(countries) },
                enabled: { checkbox: enabled }
              }
            } as any);
            return toSubscription(page as NotionPage);
          },
          { tgId, op: 'subscriptions.create' }
        );
        
        subscriptionCache.set(tgId, created);
        return created;
      }
    } catch (error) {
      return handleNotionError(error, { tgId, op: 'subscriptions.upsert' });
    }
  },

  async findByTgId(tgId: number): Promise<StoredSubscription | null> {
    const cached = subscriptionCache.get(tgId);
    if (cached) return cached;
    
    try {
      const response = await withNotionRetry(
        async () => notion.databases.query({
          database_id: DB.subscriptions,
          filter: { property: 'tgId', number: { equals: tgId } },
          page_size: 1
        } as any) as Promise<NotionDatabaseQueryResponse>,
        { tgId, op: 'subscriptions.findByTgId' }
      );
      
      const results = response.results || [];
      if (results.length === 0) return null;
      
      const subscription = toSubscription(results[0]);
      subscriptionCache.set(tgId, subscription);
      return subscription;
    } catch (error) {
      return handleNotionError(error, { tgId, op: 'subscriptions.findByTgId' });
    }
  },

  async findAllEnabled(): Promise<StoredSubscription[]> {
    try {
      const response = await withNotionRetry(
        async () => notion.databases.query({
          database_id: DB.subscriptions,
          filter: { property: 'enabled', checkbox: { equals: true } },
          page_size: 100
        } as any) as Promise<NotionDatabaseQueryResponse>,
        { op: 'subscriptions.findAllEnabled' }
      );
      
      const results = response.results || [];
      return results.map((page) => toSubscription(page));
    } catch (error) {
      return handleNotionError(error, { op: 'subscriptions.findAllEnabled' });
    }
  },

  async delete(tgId: number) {
    try {
      const subscription = await this.findByTgId(tgId);
      if (!subscription) return;
      
      await withNotionRetry(
        async () => notion.pages.update({
          page_id: subscription.id,
          archived: true
        } as any),
        { tgId, op: 'subscriptions.delete' }
      );
      
      subscriptionCache.delete(tgId);
    } catch (error) {
      return handleNotionError(error, { tgId, op: 'subscriptions.delete' });
    }
  }
};


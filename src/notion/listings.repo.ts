import { notion, DB, handleNotionError, withNotionRetry } from './notionClient';
import { text, parseRichText, parseNumber, buildRichTextProperty, buildNumberProperty, buildTitleProperty } from './notionUtils';
import type {
  NotionPage,
  NotionPageCreateRequest,
  NotionPageUpdateRequest,
  NotionDatabaseQueryRequest,
  NotionDatabaseQueryResponse
} from './notionTypes';
import type { Listing } from '../core/types';
import { DependencyError } from '../core/errors';
import { log } from '../core/logger';
import { createCache } from '../core/cache';

const listingsRepoLog = log.withContext({ scope: 'listingsRepo' });

const REQUIRED_RICH_TEXT_PROPERTIES: Record<string, { rich_text: Record<string, never> }> = {
  profileId: { rich_text: {} },
  name: { rich_text: {} },
  city: { rich_text: {} },
  country: { rich_text: {} },
  catPhotoId: { rich_text: {} },
  catPhotoUrl: { rich_text: {} },
  apartmentDescription: { rich_text: {} },
  apartmentPhotoIds: { rich_text: {} },
  apartmentPhotoUrl: { rich_text: {} },
  conditions: { rich_text: {} },
  dates: { rich_text: {} },
  preferredDestinations: { rich_text: {} }
};

const REQUIRED_NUMBER_PROPERTIES = ['tgId', 'channelMessageId'];

let cachedListingProperties: Set<string> | null = null;
const LISTING_CACHE_TTL_MS = 60_000;

type StoredListing = Listing & { id: string; createdAt: string; updatedAt: string };

const listingByIdCache = createCache<string, StoredListing>({
  ttlMs: LISTING_CACHE_TTL_MS,
  maxSize: 1000,
  logContext: 'listings:id'
});

const listingsByOwnerCache = createCache<number, StoredListing[]>({
  ttlMs: LISTING_CACHE_TTL_MS,
  maxSize: 500,
  logContext: 'listings:owner'
});

const ensureListingsSchema = async (): Promise<Set<string>> => {
  if (cachedListingProperties) return cachedListingProperties;
  try {
    const db = await notion.databases.retrieve({ database_id: DB.listings });
    const available = new Set<string>(Object.keys(db.properties ?? {}));
    const missingRichText = Object.entries(REQUIRED_RICH_TEXT_PROPERTIES).filter(([key]) => !available.has(key));
    const missingNumbers = REQUIRED_NUMBER_PROPERTIES.filter((key) => !available.has(key));

    if (missingNumbers.length) {
      throw new DependencyError('Listings database missing required number properties.', { missingNumbers });
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
        await notion.databases.update({ database_id: DB.listings, properties: payload });
        missingRichText.forEach(([key]) => available.add(key));
        listingsRepoLog.info('Extended listings database schema', {
          added: missingRichText.map(([key]) => key)
        });
      } catch (error) {
        throw new DependencyError(
          'Listings database missing required rich_text properties (profileId, name, city, country, catPhotoId, catPhotoUrl, apartmentDescription, apartmentPhotoIds, apartmentPhotoUrl, conditions, dates, preferredDestinations).',
          error
        );
      }
    }
    cachedListingProperties = available;
    return available;
  } catch (error) {
    listingsRepoLog.error('Failed to retrieve listings database schema', error);
    throw new DependencyError('Failed to read listings database schema', error);
  }
};

const toListing = (page: NotionPage): StoredListing => {
  const props = page?.properties ?? {};
  
  // Helper to safely extract number from property
  const getNumber = (prop: any): number | undefined => {
    if (prop && 'number' in prop) {
      return typeof prop.number === 'number' ? prop.number : undefined;
    }
    return undefined;
  };
  
  return {
    id: page.id,
    ownerTgId: getNumber(props.tgId) ?? 0,
    profileId: parseRichText(props.profileId),
    name: parseRichText(props.name),
    city: parseRichText(props.city),
    country: parseRichText(props.country),
    catPhotoId: parseRichText(props.catPhotoId),
    catPhotoUrl: parseRichText(props.catPhotoUrl) || undefined,
    apartmentDescription: parseRichText(props.apartmentDescription),
    apartmentPhotoId: parseRichText(props.apartmentPhotoIds),
    apartmentPhotoUrl: parseRichText(props.apartmentPhotoUrl) || undefined,
    conditions: parseRichText(props.conditions),
    dates: parseRichText(props.dates),
    preferredDestinations: parseRichText(props.preferredDestinations),
    channelMessageId: getNumber(props.channelMessageId),
    createdAt: typeof page?.created_time === 'string' ? page.created_time : new Date().toISOString(),
    updatedAt: typeof page?.last_edited_time === 'string' ? page.last_edited_time : new Date().toISOString()
  };
};

const buildProperties = (listing: Listing) => ({
  title: { title: text(`listing-${listing.ownerTgId}`) },
  tgId: { number: listing.ownerTgId },
  profileId: { rich_text: text(listing.profileId) },
  name: { rich_text: text(listing.name) },
  city: { rich_text: text(listing.city) },
  country: { rich_text: text(listing.country) },
  catPhotoId: { rich_text: text(listing.catPhotoId) },
  catPhotoUrl: { rich_text: text(listing.catPhotoUrl) },
  apartmentDescription: { rich_text: text(listing.apartmentDescription) },
  apartmentPhotoIds: { rich_text: text(listing.apartmentPhotoId) },
  apartmentPhotoUrl: { rich_text: text(listing.apartmentPhotoUrl) },
  conditions: { rich_text: text(listing.conditions) },
  dates: { rich_text: text(listing.dates) },
  preferredDestinations: { rich_text: text(listing.preferredDestinations) },
  channelMessageId: { number: listing.channelMessageId ?? null }
});

export const listingsRepo = {
  async create(listing: Listing): Promise<StoredListing> {
    try {
      await ensureListingsSchema();
      
      const stored = await withNotionRetry(
        async () => {
          const page = await notion.pages.create({
            parent: { database_id: DB.listings },
            properties: buildProperties(listing)
          } as any);
          return toListing(page as NotionPage);
        },
        { tgId: listing.ownerTgId, op: 'listings.create' }
      );
      
      listingByIdCache.set(stored.id, stored);
      listingsByOwnerCache.delete(stored.ownerTgId);
      return stored;
    } catch (error) {
      return handleNotionError(error, { tgId: listing.ownerTgId, op: 'listings.create' });
    }
  },

  async updateChannelMessage(id: string, messageId: number) {
    try {
      const cached = listingByIdCache.get(id);
      
      await withNotionRetry(
        async () => notion.pages.update({
          page_id: id,
          properties: { channelMessageId: { number: messageId } }
        } as any),
        { id, op: 'listings.updateChannelMessage' }
      );
      
      listingByIdCache.delete(id);
      if (cached) {
        listingsByOwnerCache.delete(cached.ownerTgId);
      }
    } catch (error) {
      return handleNotionError(error, { id, op: 'listings.updateChannelMessage' });
    }
  },

  async findById(id: string): Promise<StoredListing | null> {
    const cached = listingByIdCache.get(id);
    if (cached) return cached;
    
    try {
      const page = await withNotionRetry(
        async () => notion.pages.retrieve({ page_id: id }) as Promise<NotionPage>,
        { id, op: 'listings.findById' }
      );
      
      const stored = toListing(page as NotionPage);
      listingByIdCache.set(stored.id, stored);
      return stored;
    } catch (error) {
      return handleNotionError(error, { id, op: 'listings.findById' });
    }
  },

  async findByOwner(tgId: number): Promise<StoredListing[]> {
    const cached = listingsByOwnerCache.get(tgId);
    if (cached) return cached;
    
    try {
      const response = await withNotionRetry(
        async () => notion.databases.query({
          database_id: DB.listings,
          filter: { property: 'tgId', number: { equals: tgId } },
          sorts: [{ timestamp: 'created_time', direction: 'descending' }],
          page_size: 25
        } as any) as Promise<NotionDatabaseQueryResponse>,
        { tgId, op: 'listings.findByOwner' }
      );
      
      const results = response.results || [];
      const mapped = results.map((page) => toListing(page));
      for (const item of mapped) {
        listingByIdCache.set(item.id, item);
      }
      listingsByOwnerCache.set(tgId, mapped);
      return mapped;
    } catch (error) {
      return handleNotionError(error, { tgId, op: 'listings.findByOwner' });
    }
  }
};

import { notion, DB, handleNotionError } from './notionClient';
import type { Profile } from '../core/types';
import { log } from '../core/logger';
import { DependencyError } from '../core/errors';

const text = (value?: string | null) => {
  if (!value) return [];
  return [{ type: 'text', text: { content: value.toString().slice(0, 1900) } }];
};

const parseRichText = (prop: any) => prop?.rich_text?.[0]?.plain_text ?? '';
const parseNumber = (prop: any) => (typeof prop?.number === 'number' ? prop.number : undefined);

const profilesRepoLog = log.withContext({ scope: 'profilesRepo' });

const REQUIRED_PROPERTIES: Record<string, { rich_text: Record<string, never> }> = {
  intro: { rich_text: {} },
  catName: { rich_text: {} },
  catPhotoUrl: { rich_text: {} }
};

let cachedProfileProperties: Set<string> | null = null;

const ensureProfilesSchema = async (): Promise<Set<string>> => {
  if (cachedProfileProperties) return cachedProfileProperties;

  try {
    const db = await notion.databases.retrieve({ database_id: DB.profiles });
    const available = new Set<string>(Object.keys(db.properties ?? {}));
    const missingEntries = Object.entries(REQUIRED_PROPERTIES).filter(([key]) => !available.has(key));

    if (missingEntries.length) {
      const updatePayload = missingEntries.reduce<Record<string, { rich_text: Record<string, never> }>>(
        (acc, [key, schema]) => {
          acc[key] = schema;
          return acc;
        },
        {}
      );
      try {
        await notion.databases.update({ database_id: DB.profiles, properties: updatePayload });
        missingEntries.forEach(([key]) => available.add(key));
        profilesRepoLog.info('Extended profiles database schema', { added: missingEntries.map(([key]) => key) });
      } catch (error) {
        throw new DependencyError('Profiles database is missing required properties. Please add intro, catName и catPhotoUrl.', error);
      }
    }

    cachedProfileProperties = available;
    return available;
  } catch (error) {
    profilesRepoLog.error('Failed to retrieve profiles database schema', error);
    throw new DependencyError('Failed to read profiles database schema', error);
  }
};

const toProfile = (page: any): (Profile & { id: string }) => {
  const props = page?.properties ?? {};
  const nameRich = parseRichText(props.name);
  const titleFallback = page?.properties?.title?.title?.[0]?.plain_text ?? '';
  return {
    id: page.id,
    tgId: props.tgId?.number ?? 0,
    name: nameRich || titleFallback,
    city: parseRichText(props.city),
    country: parseRichText(props.country),
    intro: parseRichText(props.intro),
    catName: parseRichText(props.catName),
    catPhotoId: parseRichText(props.catPhotoId),
    catPhotoUrl: parseRichText(props.catPhotoUrl) || undefined,
    channelMessageId: parseNumber(props.channelMessageId)
  };
};

const buildProperties = (profile: Profile, availableProps: Set<string>) => {
  const props: Record<string, any> = {
    title: { title: text(profile.name) },
    tgId: { number: profile.tgId },
    name: { rich_text: text(profile.name) },
    city: { rich_text: text(profile.city) },
    country: { rich_text: text(profile.country) },
    catPhotoId: { rich_text: text(profile.catPhotoId) }
  };

  if (!availableProps.has('intro')) {
    throw new DependencyError('Profiles database missing intro property', { profile });
  }
  props.intro = { rich_text: text(profile.intro) };

  if (!availableProps.has('catName')) {
    throw new DependencyError('Profiles database missing catName property', { profile });
  }
  props.catName = { rich_text: text(profile.catName) };

  if (!availableProps.has('catPhotoUrl')) {
    throw new DependencyError('Profiles database missing catPhotoUrl property', { profile });
  }
  if (profile.catPhotoUrl) {
    props.catPhotoUrl = { rich_text: text(profile.catPhotoUrl) };
  } else {
    props.catPhotoUrl = { rich_text: [] };
  }

  if (typeof profile.channelMessageId === 'number') {
    props.channelMessageId = { number: profile.channelMessageId };
  }

  return props;
};

export const profilesRepo = {
  async upsert(profile: Profile) {
    const existing = await this.findByTgId(profile.tgId);
    const availableProps = await ensureProfilesSchema();
    const properties = buildProperties(profile, availableProps);
    try {
      if (existing?.id) {
        const page = await notion.pages.update({ page_id: existing.id, properties } as any);
        return toProfile(page);
      }
      const page = await notion.pages.create({
        parent: { database_id: DB.profiles },
        properties
      } as any);
      return toProfile(page);
    } catch (error) {
      return handleNotionError(error, { tgId: profile.tgId, op: 'profiles.upsert' });
    }
  },

  async findByTgId(tgId: number): Promise<(Profile & { id: string }) | null> {
    try {
      const response: any = await (notion as any).databases.query({
        database_id: DB.profiles,
        filter: { property: 'tgId', number: { equals: tgId } },
        page_size: 1
      });
      const page = response.results?.[0];
      return page ? toProfile(page) : null;
    } catch (error) {
      return handleNotionError(error, { tgId, op: 'profiles.findByTgId' });
    }
  },

  async updateChannelMessage(tgId: number, messageId: number) {
    const existing = await this.findByTgId(tgId);
    if (!existing?.id) return;
    try {
      await notion.pages.update({
        page_id: existing.id,
        properties: { channelMessageId: { number: messageId } }
      });
    } catch (error) {
      handleNotionError(error, { tgId, op: 'profiles.updateChannelMessage' });
    }
  }
};

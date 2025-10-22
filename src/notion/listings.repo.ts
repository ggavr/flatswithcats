import { notion, DB, handleNotionError } from './notionClient';
import type { Listing } from '../core/types';

const text = (value?: string | null) => {
  if (!value) return [];
  return [{ type: 'text', text: { content: value.toString().slice(0, 1900) } }];
};

const parseRichText = (prop: any) => prop?.rich_text?.[0]?.plain_text ?? '';
const parseNumber = (prop: any) => (typeof prop?.number === 'number' ? prop.number : undefined);

const toListing = (page: any): Listing & { id: string } => {
  const props = page?.properties ?? {};
  return {
    id: page.id,
    ownerTgId: props.tgId?.number ?? 0,
    profileId: parseRichText(props.profileId),
    name: parseRichText(props.name),
    city: parseRichText(props.city),
  country: parseRichText(props.country),
  catPhotoId: parseRichText(props.catPhotoId),
  apartmentDescription: parseRichText(props.apartmentDescription),
  apartmentPhotoId: parseRichText(props.apartmentPhotoIds),
  conditions: parseRichText(props.conditions),
  dates: parseRichText(props.dates),
  preferredDestinations: parseRichText(props.preferredDestinations),
    channelMessageId: parseNumber(props.channelMessageId)
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
  apartmentDescription: { rich_text: text(listing.apartmentDescription) },
  apartmentPhotoIds: { rich_text: text(listing.apartmentPhotoId) },
  conditions: { rich_text: text(listing.conditions) },
  dates: { rich_text: text(listing.dates) },
  preferredDestinations: { rich_text: text(listing.preferredDestinations) },
  channelMessageId: { number: listing.channelMessageId ?? null }
});

export const listingsRepo = {
  async create(listing: Listing) {
    try {
      const page = await notion.pages.create({
        parent: { database_id: DB.listings },
        properties: buildProperties(listing)
      } as any);
      return (page as any).id as string;
    } catch (error) {
      return handleNotionError(error, { tgId: listing.ownerTgId, op: 'listings.create' });
    }
  },

  async updateChannelMessage(id: string, messageId: number) {
    try {
      await notion.pages.update({
        page_id: id,
        properties: { channelMessageId: { number: messageId } }
      });
    } catch (error) {
      return handleNotionError(error, { id, op: 'listings.updateChannelMessage' });
    }
  },

  async findById(id: string) {
    try {
      const page: any = await notion.pages.retrieve({ page_id: id } as any);
      return toListing(page);
    } catch (error) {
      return handleNotionError(error, { id, op: 'listings.findById' });
    }
  }
};

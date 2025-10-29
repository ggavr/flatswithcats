import type { Listing, Profile } from '../core/types';
import { ValidationError } from '../core/errors';
import { listingsRepo } from '../notion/listings.repo';
import { profileService } from './profile.service';
import { normalizeDateRange } from './dateParser.service';

const MAX_LENGTH = 500;

type ListingDraftInput = {
  city: string;
  country: string;
  apartmentDescription: string;
  apartmentPhotoId: string;
  apartmentPhotoUrl?: string;
  dates: string;
  conditions: string;
  preferredDestinations: string;
};

const clean = (value: string, field: string, max = MAX_LENGTH) => {
  const trimmed = value?.trim();
  if (!trimmed) throw new ValidationError(`${field} не может быть пустым`);
  if (trimmed.length > max) throw new ValidationError(`${field} слишком длинное (максимум ${max} символов)`);
  return trimmed;
};

const sanitizeUrl = (value?: string | null) => value?.trim() ?? '';

const buildDraft = (profile: Profile & { id: string }, ownerTgId: number, input: ListingDraftInput): Listing => {
  const apartmentPhotoUrl = sanitizeUrl(input.apartmentPhotoUrl);
  if (apartmentPhotoUrl && apartmentPhotoUrl.length > 2048) {
    throw new ValidationError('Ссылка на фото квартиры слишком длинная (максимум 2048 символов)');
  }

  return {
    ownerTgId,
    profileId: profile.id,
    name: profile.name,
    city: clean(input.city, 'Город', 120),
    country: clean(input.country, 'Страна', 120),
    catPhotoId: profile.catPhotoId,
    catPhotoUrl: profile.catPhotoUrl,
    apartmentDescription: clean(input.apartmentDescription, 'Описание квартиры'),
    apartmentPhotoId: clean(input.apartmentPhotoId, 'Фото квартиры', 512),
    apartmentPhotoUrl,
    dates: normalizeDateRange(input.dates),
    conditions: clean(input.conditions, 'Условия (взаимный обмен или оплата)'),
    preferredDestinations: clean(input.preferredDestinations, 'Желаемые направления')
  };
};

export const listingService = {
  async buildDraft(ownerTgId: number, input: ListingDraftInput, profile?: Profile & { id: string }) {
    const resolvedProfile = profile ?? await profileService.ensureComplete(ownerTgId);
    return buildDraft(resolvedProfile, ownerTgId, input);
  },

  async persist(draft: Listing) {
    const stored = await listingsRepo.create(draft);
    return { listingId: stored.id, listing: stored };
  },

  async updateChannelMessage(listingId: string, messageId: number) {
    await listingsRepo.updateChannelMessage(listingId, messageId);
  },

  async getById(id: string) {
    return listingsRepo.findById(id);
  },

  async listByOwner(ownerTgId: number) {
    return listingsRepo.findByOwner(ownerTgId);
  }
};

import type { Listing, Profile } from '../core/types';
import { ValidationError } from '../core/errors';
import { listingsRepo } from '../notion/listings.repo';
import { profileService } from './profile.service';

const MAX_LENGTH = 500;

const pad = (value: number) => value.toString().padStart(2, '0');

const MONTH_ALIASES: Record<string, number> = {
  январь: 1,
  января: 1,
  янв: 1,
  jan: 1,
  january: 1,
  февраль: 2,
  февраля: 2,
  фев: 2,
  feb: 2,
  february: 2,
  март: 3,
  марта: 3,
  мар: 3,
  mar: 3,
  march: 3,
  апрель: 4,
  апреля: 4,
  апр: 4,
  apr: 4,
  april: 4,
  май: 5,
  мая: 5,
  may: 5,
  июнь: 6,
  июня: 6,
  июн: 6,
  jun: 6,
  june: 6,
  июль: 7,
  июля: 7,
  июл: 7,
  jul: 7,
  july: 7,
  август: 8,
  августа: 8,
  авг: 8,
  aug: 8,
  august: 8,
  сентябрь: 9,
  сентября: 9,
  сен: 9,
  sep: 9,
  sept: 9,
  september: 9,
  октябрь: 10,
  октября: 10,
  окт: 10,
  oct: 10,
  october: 10,
  ноябрь: 11,
  ноября: 11,
  ноя: 11,
  nov: 11,
  november: 11,
  декабрь: 12,
  декабря: 12,
  дек: 12,
  dec: 12,
  december: 12
};

const DATE_TOKEN_REGEX =
  /(\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?|\d{1,2}\s+[a-zа-яё]+(?:\s+\d{2,4})?)/giu;

interface ParsedDate {
  day: number;
  month: number;
  year: number;
  hasYear: boolean;
  date: Date;
}

const normalizeYear = (raw: string | undefined, fallback: number, original: string) => {
  if (!raw) return { year: fallback, hasYear: false };
  const digits = raw.replace(/\D/g, '');
  if (!digits) return { year: fallback, hasYear: false };
  if (digits.length === 2) {
    const value = Number(digits);
    const year = value >= 70 ? 1900 + value : 2000 + value;
    return { year, hasYear: true };
  }
  if (digits.length === 4) {
    return { year: Number(digits), hasYear: true };
  }
  throw new ValidationError(`Год в дате «${original.trim()}» указан некорректно.`);
};

const buildDate = (year: number, month: number, day: number, original: string) => {
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new ValidationError(`Дата «${original.trim()}» не существует.`);
  }
  return date;
};

const resolveMonth = (raw: string, original: string) => {
  const sanitized = raw.replace(/[^a-zа-яё]/giu, '').toLowerCase();
  if (!sanitized) throw new ValidationError(`Месяц в дате «${original.trim()}» не распознан.`);
  if (sanitized in MONTH_ALIASES) return MONTH_ALIASES[sanitized];
  for (const [key, value] of Object.entries(MONTH_ALIASES)) {
    if (sanitized.startsWith(key)) return value;
  }
  throw new ValidationError(`Месяц в дате «${original.trim()}» не распознан.`);
};

const parseNumericDate = (value: string, fallbackYear: number, original: string): ParsedDate | null => {
  const match = value.match(/^(\d{1,2})([./-])(\d{1,2})(?:\2(\d{2,4}))?$/);
  if (!match) return null;
  const [, dayRaw, , monthRaw, yearRaw] = match;
  const day = Number(dayRaw);
  const month = Number(monthRaw);
  if (!day || !month) {
    throw new ValidationError(`Не удалось распознать дату «${original}».`);
  }
  const { year, hasYear } = normalizeYear(yearRaw, fallbackYear, original);
  const date = buildDate(year, month, day, original);
  return { day, month, year, hasYear, date };
};

const parseTextDate = (value: string, fallbackYear: number, original: string): ParsedDate | null => {
  const match = value.match(/^(\d{1,2})\s+([a-zа-яё]+)(?:\s+(\d{2,4}))?$/i);
  if (!match) return null;
  const [, dayRaw, monthRaw, yearRaw] = match;
  const day = Number(dayRaw);
  if (!day) {
    throw new ValidationError(`Не удалось распознать дату «${original}».`);
  }
  const month = resolveMonth(monthRaw, original);
  const { year, hasYear } = normalizeYear(yearRaw, fallbackYear, original);
  const date = buildDate(year, month, day, original);
  return { day, month, year, hasYear, date };
};

const parseDate = (value: string, fallbackYear: number): ParsedDate => {
  const original = value.trim();
  const normalized = value
    .toLowerCase()
    .replace(/г\.?/g, '')
    .trim()
    .replace(/\s+/g, ' ');
  const numeric = parseNumericDate(normalized, fallbackYear, original);
  if (numeric) return numeric;
  const textual = parseTextDate(normalized, fallbackYear, original);
  if (textual) return textual;
  throw new ValidationError(`Не удалось распознать дату «${original}».`);
};

const extractDateTokens = (value: string) => {
  const matches: string[] = [];
  const regex = new RegExp(DATE_TOKEN_REGEX.source, DATE_TOKEN_REGEX.flags);
  let match: RegExpExecArray | null;
  while ((match = regex.exec(value)) !== null) {
    matches.push(match[0]);
    if (matches.length === 2) break;
  }
  return matches;
};

export const normalizeDateRange = (value: string) => {
  const input = value?.trim();
  if (!input) {
    throw new ValidationError('Укажи даты поиска опекуна.');
  }
  const cleaned = input.replace(/\s+/g, ' ');
  const tokens = extractDateTokens(cleaned);
  if (tokens.length < 2) {
    throw new ValidationError('Не удалось распознать диапазон дат. Укажи начало и конец периода.');
  }
  const currentYear = new Date().getFullYear();
  const start = parseDate(tokens[0], currentYear);
  const end = parseDate(tokens[1], start.year);

  if (end.date.getTime() < start.date.getTime()) {
    if (!end.hasYear) {
      const adjusted = new Date(end.date);
      adjusted.setFullYear(adjusted.getFullYear() + 1);
      end.date = adjusted;
      end.year = adjusted.getFullYear();
    } else {
      throw new ValidationError('Дата окончания раньше даты начала. Проверь, пожалуйста, период.');
    }
  }

  const formattedStart = `${pad(start.day)}.${pad(start.month)}.${start.year}`;
  const formattedEnd = `${pad(end.day)}.${pad(end.month)}.${end.year}`;
  return `${formattedStart} - ${formattedEnd}`;
};

type ListingDraftInput = {
  apartmentDescription: string;
  apartmentPhotoId: string;
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

const buildDraft = (profile: Profile & { id: string }, ownerTgId: number, input: ListingDraftInput): Listing => ({
  ownerTgId,
  profileId: profile.id,
  name: profile.name,
  city: profile.city,
  country: profile.country,
  catPhotoId: profile.catPhotoId,
  apartmentDescription: clean(input.apartmentDescription, 'Описание квартиры'),
  apartmentPhotoId: clean(input.apartmentPhotoId, 'Фото квартиры', 512),
  dates: normalizeDateRange(input.dates),
  conditions: clean(input.conditions, 'Условия (взаимный обмен или оплата)'),
  preferredDestinations: clean(input.preferredDestinations, 'Желаемые направления')
});

export const listingService = {
  async buildDraft(ownerTgId: number, input: ListingDraftInput) {
    const profile = await profileService.ensure(ownerTgId);
    return buildDraft(profile, ownerTgId, input);
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
  }
};

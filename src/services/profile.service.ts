import type { Profile } from '../core/types';
import { ValidationError, NotFound } from '../core/errors';
import { profilesRepo } from '../notion/profiles.repo';

const clean = (value: string, field: string, max = 180) => {
  const trimmed = value?.trim();
  if (!trimmed) throw new ValidationError(`${field} не может быть пустым`);
  if (trimmed.length > max) throw new ValidationError(`${field} слишком длинное (максимум ${max} символов)`);
  return trimmed;
};

const normalizeLocation = (value: string | undefined) => {
  if (!value || !value.trim()) {
    return { city: '', country: '' };
  }
  const parts = value.split(',').map((part) => part.trim()).filter(Boolean);
  const city = clean(parts[0], 'Город');
  const country = clean(parts[1] ?? parts[0], 'Страна');
  return { city, country };
};

const isNonEmpty = (value: string | null | undefined) => Boolean(value && value.trim());

export const profileService = {
  async save(input: {
    tgId: number;
    name: string;
    intro: string;
    catName: string;
    catPhotoId: string;
    catPhotoUrl?: string;
    location?: string;
  }): Promise<Profile & { id: string }> {
    const name = clean(input.name, 'Имя', 120);
    const intro = clean(input.intro, 'Интро', 600);
    const catName = clean(input.catName, 'Имя кота', 100);
    const catPhotoId = clean(input.catPhotoId, 'Фото кота', 512);
    const catPhotoUrl = input.catPhotoUrl?.trim() ?? '';
    if (catPhotoUrl && catPhotoUrl.length > 2048) {
      throw new ValidationError('Ссылка на фото кота слишком длинная (максимум 2048 символов)');
    }

    const { city, country } = normalizeLocation(input.location);

    const profile: Profile = {
      tgId: input.tgId,
      name,
      city,
      country,
      intro,
      catName,
      catPhotoId,
      catPhotoUrl
    };
    const stored = await profilesRepo.upsert(profile);
    if (!stored) throw new Error('Не удалось сохранить анкету');
    return { ...stored, intro, catName, catPhotoUrl: stored.catPhotoUrl ?? catPhotoUrl };
  },

  async get(tgId: number) {
    return profilesRepo.findByTgId(tgId);
  },

  async ensure(tgId: number) {
    const profile = await profilesRepo.findByTgId(tgId);
    if (!profile) throw new NotFound('Анкета не найдена. Начни с /start');
    return profile;
  },

  isComplete(profile: Profile | null | undefined) {
    if (!profile) return false;
    return (
      isNonEmpty(profile.name) &&
      isNonEmpty(profile.catName) &&
      isNonEmpty(profile.intro) &&
      isNonEmpty(profile.catPhotoId)
    );
  },

  async ensureComplete(tgId: number) {
    const profile = await this.ensure(tgId);
    if (!this.isComplete(profile)) {
      throw new ValidationError('Сначала заполни анкету: имя, кот, история и фото обязательны.');
    }
    return profile;
  },

  async updateChannelMessage(tgId: number, messageId: number) {
    await profilesRepo.updateChannelMessage(tgId, messageId);
  }
};

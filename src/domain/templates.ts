import type { Listing, Profile } from '../core/types';

const escape = (value: string) =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/[_*\[\]()~`>#+=|{}.!-]/g, (match) => `\\${match}`);

export const templates = {
  profilePreview: (profile: Profile) => {
    const lines = [
      `\\[${escape(profile.name)}\\] / \\#Город: ${escape(profile.city)}, ${escape(profile.country)}`,
      '\\[О себе\\]',
      escape(profile.intro),
      `Кiт: ${escape(profile.catName)}`
    ];
    return lines.join('\n');
  },

  listingCard: (profile: Profile, listing: Listing) => {
    const lines = [
      `*${escape(profile.name)} ищет опекуна*`,
      `Город: \\#${escape(listing.city)}, ${escape(listing.country)}`,
      '',
      `Кiт: ${escape(profile.catName)}`,
      '',
      '🏡 *Жильё*',
      escape(listing.apartmentDescription),
      '',
      '📅 *Даты*',
      escape(listing.dates),
      '',
      '📝 *Условия \\(взаимный обмен или оплата\\)*',
      escape(listing.conditions),
      '',
      '🌍 *Желаемые направления*',
      escape(listing.preferredDestinations)
    ];
    return lines.join('\n');
  }
};

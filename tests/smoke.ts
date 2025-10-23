/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from 'node:assert/strict';

process.env.BOT_TOKEN ??= 'test-bot-token';
process.env.CHANNEL_ID ??= '-1001234567890';
process.env.CHANNEL_INVITE_LINK ??= 'https://t.me/joinchat/test';
process.env.MOD_CHAT_ID ??= '-1009876543210';
process.env.NOTION_TOKEN ??= 'test-notion-token';
process.env.NOTION_DB_PROFILES ??= 'db-profiles';
process.env.NOTION_DB_LISTINGS ??= 'db-listings';

async function main() {
  const memoryUsers = new Map<number, any>();
  const memoryListings = new Map<string, any>();

  const { profilesRepo } = await import('../src/notion/profiles.repo');
  const { listingsRepo } = await import('../src/notion/listings.repo');

  profilesRepo.findByTgId = async (tgId: number) => memoryUsers.get(tgId) ?? null;
  profilesRepo.upsert = async (profile: any) => {
    const stored = { ...profile, id: `profile-${profile.tgId}` };
    memoryUsers.set(profile.tgId, stored);
    return stored;
  };
  profilesRepo.updateChannelMessage = async () => undefined;

  listingsRepo.create = async (listing: any) => {
    const id = `listing-${memoryListings.size + 1}`;
    const stored = { ...listing, id };
    memoryListings.set(id, stored);
    return stored;
  };
  listingsRepo.updateChannelMessage = async (id: string, messageId: number) => {
    const current = memoryListings.get(id);
    assert.ok(current, `Listing ${id} must exist`);
    memoryListings.set(id, { ...current, channelMessageId: messageId });
  };
  listingsRepo.findById = async (id: string) => memoryListings.get(id) ?? null;

  const { profileService } = await import('../src/services/profile.service');
  const { listingService, normalizeDateRange } = await import('../src/services/listing.service');
  const { templates } = await import('../src/domain/templates');
  const { issueSessionToken, verifySessionToken } = await import('../src/api/auth/sessionToken');

  const storedProfile = await profileService.save({
    tgId: 1,
    name: '  Alice  ',
    location: ' Москва, Россия ',
    intro: ' Люблю котов и путешествия. ',
    catName: '  Мурка ',
    catPhotoId: 'cat_file_id'
  });

  assert.equal(storedProfile.name, 'Alice');
  assert.equal(storedProfile.city, 'Москва');
  assert.equal(storedProfile.country, 'Россия');
  assert.equal(storedProfile.intro, 'Люблю котов и путешествия.');
  assert.equal(storedProfile.catName, 'Мурка');

  const draft = await listingService.buildDraft(1, {
    city: 'Москва',
    country: 'Россия',
    apartmentDescription: ' Просторная квартира ',
    apartmentPhotoId: 'apt_photo',
    apartmentPhotoUrl: '',
    dates: '01/06/25-30/06/25',
    conditions: '500 € + корм',
    preferredDestinations: 'Берлин'
  });
  const { listingId, listing } = await listingService.persist(draft);

  assert.ok(listingId);
  assert.equal(listing.dates, '01.06.2025 - 30.06.2025');
  assert.equal(listing.city, 'Москва');
  assert.equal(listing.country, 'Россия');
  assert.equal(memoryListings.get(listingId)?.apartmentPhotoId, 'apt_photo');
  assert.equal(memoryListings.get(listingId)?.preferredDestinations, 'Берлин');
  assert.equal(memoryListings.get(listingId)?.conditions, '500 € + корм');

  const normalizedInlineRange = normalizeDateRange('1-15 июля 2024');
  assert.equal(normalizedInlineRange, '01.07.2024 - 15.07.2024');

  const previewWithBackslash = templates.profilePreview({
    ...storedProfile,
    intro: 'Путь: C\\Users\\Alice'
  });
  assert.ok(/C\\+Users/.test(previewWithBackslash), 'Backslashes must be escaped in Markdown');

  memoryUsers.set(2, {
    id: 'profile-2',
    tgId: 2,
    name: 'Bob',
    city: '',
    country: '',
    intro: '',
    catName: 'Барсик',
    catPhotoId: '',
    catPhotoUrl: ''
  });

  await assert.rejects(
    listingService.buildDraft(2, {
      city: 'Прага',
      country: 'Чехия',
      apartmentDescription: 'Апартаменты в центре',
      apartmentPhotoId: 'apt_photo_2',
      apartmentPhotoUrl: '',
      dates: '01/07/25 - 15/07/25',
      conditions: 'Обмен',
      preferredDestinations: 'Берлин'
    }),
    (error: unknown) => error instanceof Error && error.message.includes('Сначала заполни анкету')
  );

  const sessionUser = {
    id: 42,
    first_name: 'Test'
  };
  const sessionToken = issueSessionToken(sessionUser, Math.floor(Date.now() / 1000));
  const sessionPayload = verifySessionToken(sessionToken);
  assert.equal(sessionPayload.sub, sessionUser.id);
  assert.equal(sessionPayload.user.first_name, 'Test');

  console.log('Smoke tests passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

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
    memoryUsers.set(profile.tgId, { ...profile, id: `profile-${profile.tgId}` });
    return `profile-${profile.tgId}`;
  };
  profilesRepo.updateChannelMessage = async () => undefined;

  listingsRepo.create = async (listing: any) => {
    const id = `listing-${memoryListings.size + 1}`;
    memoryListings.set(id, { ...listing, id });
    return id;
  };
  listingsRepo.updateChannelMessage = async (id: string, messageId: number) => {
    const current = memoryListings.get(id);
    assert.ok(current, `Listing ${id} must exist`);
    memoryListings.set(id, { ...current, channelMessageId: messageId });
  };
  listingsRepo.findById = async (id: string) => memoryListings.get(id);

  const { profileService } = await import('../src/services/profile.service');
  const { listingService } = await import('../src/services/listing.service');

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

  const { listingId, listing } = await listingService.create(1, {
    apartmentDescription: ' Просторная квартира ',
    apartmentPhotoId: 'apt_photo',
    dates: '01/06/25-30/06/25',
    conditions: '500 € + корм',
    preferredDestinations: 'Берлин'
  });

  assert.ok(listingId);
  assert.equal(listing.dates, '01/06/25 - 30/06/25');
  assert.equal(listing.city, storedProfile.city);
  assert.equal(listing.country, storedProfile.country);
  assert.equal(memoryListings.get(listingId)?.apartmentPhotoId, 'apt_photo');
  assert.equal(memoryListings.get(listingId)?.preferredDestinations, 'Берлин');
  assert.equal(memoryListings.get(listingId)?.conditions, '500 € + корм');

  console.log('Smoke tests passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import type { AppFastifyInstance } from '../server';
import { cfg } from '../../core/config';
import { listingService, profileService, publishService, templates } from '../../domain';
import { requireTelegramAuth } from '../hooks/requireTelegramAuth';
import { requireTelegramUserId } from '../utils/auth';

type ListingRequestBody = {
  apartmentDescription?: string;
  apartmentPhotoId?: string;
  apartmentPhotoUrl?: string;
  dates?: string;
  conditions?: string;
  preferredDestinations?: string;
  publish?: boolean;
};

const toDraftInput = (body: ListingRequestBody) => ({
  apartmentDescription: body.apartmentDescription ?? '',
  apartmentPhotoId: body.apartmentPhotoId ?? '',
  apartmentPhotoUrl: body.apartmentPhotoUrl ?? '',
  dates: body.dates ?? '',
  conditions: body.conditions ?? '',
  preferredDestinations: body.preferredDestinations ?? ''
});

export const registerListingRoutes = async (server: AppFastifyInstance) => {
  server.post('/api/listings/preview', { preHandler: requireTelegramAuth }, async (request, reply) => {
    const tgId = requireTelegramUserId(request);
    const body = request.body as ListingRequestBody;
    const draft = await listingService.buildDraft(tgId, toDraftInput(body));
    const profile = await profileService.ensure(tgId);
    const preview = templates.listingCard(profile, draft);
    return reply.send({ preview, listing: draft });
  });

  server.post('/api/listings', { preHandler: requireTelegramAuth }, async (request, reply) => {
    const tgId = requireTelegramUserId(request);
    const body = request.body as ListingRequestBody;
    const draft = await listingService.buildDraft(tgId, toDraftInput(body));
    const { listingId, listing } = await listingService.persist(draft);

    let published: null | { messageId: number } = null;
    if (body.publish) {
      const profile = await profileService.ensure(tgId);
      const caption = templates.listingCard(profile, listing);
      const messageId = await publishService.publishListing(server.telegram, listing, caption);
      await listingService.updateChannelMessage(listingId, messageId);
      published = { messageId };
    }

    return reply.send({ listingId, listing, published, channelInviteLink: body.publish ? cfg.channelInviteLink : undefined });
  });

  server.get('/api/listings/:id', { preHandler: requireTelegramAuth }, async (request, reply) => {
    const tgId = requireTelegramUserId(request);
    const { id } = request.params as { id: string };
    const listing = await listingService.getById(id);
    if (!listing || listing.ownerTgId !== tgId) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'Listing not found' });
    }
    const profile = await profileService.ensure(tgId);
    const preview = templates.listingCard(profile, listing);
    return reply.send({ listing, preview });
  });

  server.post('/api/listings/:id/publish', { preHandler: requireTelegramAuth }, async (request, reply) => {
    const tgId = requireTelegramUserId(request);
    const { id } = request.params as { id: string };
    const listing = await listingService.getById(id);
    if (!listing || listing.ownerTgId !== tgId) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'Listing not found' });
    }
    const profile = await profileService.ensure(tgId);
    const caption = templates.listingCard(profile, listing);
    const messageId = await publishService.publishListing(server.telegram, listing, caption);
    await listingService.updateChannelMessage(id, messageId);
    return reply.send({ messageId, channelInviteLink: cfg.channelInviteLink });
  });
};

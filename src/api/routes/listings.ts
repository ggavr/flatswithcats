import type { AppFastifyInstance } from '../server';
import { cfg } from '../../core/config';
import { listingService, profileService, publishService, templates } from '../../domain';
import { requireTelegramAuth } from '../hooks/requireTelegramAuth';
import { requireTelegramUserId } from '../utils/auth';

type ListingRequestBody = {
  city?: string;
  country?: string;
  apartmentDescription?: string;
  apartmentPhotoId?: string;
  apartmentPhotoUrl?: string;
  dates?: string;
  conditions?: string;
  preferredDestinations?: string;
  publish?: boolean;
};

const toDraftInput = (body: ListingRequestBody) => ({
  city: body.city ?? '',
  country: body.country ?? '',
  apartmentDescription: body.apartmentDescription ?? '',
  apartmentPhotoId: body.apartmentPhotoId ?? '',
  apartmentPhotoUrl: body.apartmentPhotoUrl ?? '',
  dates: body.dates ?? '',
  conditions: body.conditions ?? '',
  preferredDestinations: body.preferredDestinations ?? ''
});

export const registerListingRoutes = async (server: AppFastifyInstance) => {
  server.get('/api/listings/public', async (request, reply) => {
    const query = request.query as { 
      city?: string; 
      country?: string; 
      limit?: string; 
    };
    
    const searchQuery = query.city || query.country || '';
    const limit = query.limit ? parseInt(query.limit, 10) : 50;
    
    const listings = await listingService.search(searchQuery, limit);
    const items = listings.map((listing) => ({
      id: listing.id,
      name: listing.name,
      city: listing.city,
      country: listing.country,
      catPhotoUrl: listing.catPhotoUrl,
      apartmentDescription: listing.apartmentDescription,
      apartmentPhotoUrl: listing.apartmentPhotoUrl,
      dates: listing.dates,
      conditions: listing.conditions,
      preferredDestinations: listing.preferredDestinations,
      channelMessageId: listing.channelMessageId,
      updatedAt: listing.updatedAt
    }));
    return reply.send({ listings: items });
  });

  server.get('/api/listings', { preHandler: requireTelegramAuth }, async (request, reply) => {
    const tgId = requireTelegramUserId(request);
    const listings = await listingService.listByOwner(tgId);
    const items = listings.map((listing) => ({
      id: listing.id,
      ownerTgId: listing.ownerTgId,
      profileId: listing.profileId,
      name: listing.name,
      city: listing.city,
      country: listing.country,
      catPhotoId: listing.catPhotoId,
      catPhotoUrl: listing.catPhotoUrl,
      apartmentDescription: listing.apartmentDescription,
      apartmentPhotoId: listing.apartmentPhotoId,
      apartmentPhotoUrl: listing.apartmentPhotoUrl,
      dates: listing.dates,
      conditions: listing.conditions,
      preferredDestinations: listing.preferredDestinations,
      channelMessageId: listing.channelMessageId,
      createdAt: listing.createdAt,
      updatedAt: listing.updatedAt,
      status: listing.channelMessageId ? 'published' : 'draft'
    }));
    return reply.send({ listings: items });
  });

  server.post('/api/listings/preview', { preHandler: requireTelegramAuth }, async (request, reply) => {
    const tgId = requireTelegramUserId(request);
    const body = request.body as ListingRequestBody;
    
    // Fetch profile once at the start
    const profile = await profileService.ensureComplete(tgId);
    const draft = await listingService.buildDraft(tgId, toDraftInput(body), profile);
    const preview = templates.listingCard(profile, draft);
    return reply.send({ preview, listing: draft });
  });

  server.post('/api/listings', { preHandler: requireTelegramAuth }, async (request, reply) => {
    const tgId = requireTelegramUserId(request);
    const body = request.body as ListingRequestBody;
    
    // Fetch profile once if publishing
    const profile = body.publish ? await profileService.ensureComplete(tgId) : undefined;
    const draft = await listingService.buildDraft(tgId, toDraftInput(body), profile);
    const { listingId, listing } = await listingService.persist(draft);

    let published: null | { messageId: number } = null;
    if (body.publish && profile) {
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
    
    // Fetch both listing and profile in parallel
    const [listing, profile] = await Promise.all([
      listingService.getById(id),
      profileService.ensureComplete(tgId)
    ]);
    
    if (!listing || listing.ownerTgId !== tgId) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'Listing not found' });
    }
    
    const preview = templates.listingCard(profile, listing);
    return reply.send({ listing, preview });
  });

  server.post('/api/listings/:id/publish', { preHandler: requireTelegramAuth }, async (request, reply) => {
    const tgId = requireTelegramUserId(request);
    const { id } = request.params as { id: string };
    
    // Fetch both listing and profile in parallel
    const [listing, profile] = await Promise.all([
      listingService.getById(id),
      profileService.ensureComplete(tgId)
    ]);
    
    if (!listing || listing.ownerTgId !== tgId) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'Listing not found' });
    }
    
    const caption = templates.listingCard(profile, listing);
    const messageId = await publishService.publishListing(server.telegram, listing, caption);
    await listingService.updateChannelMessage(id, messageId);
    return reply.send({ messageId, channelInviteLink: cfg.channelInviteLink });
  });

  server.patch('/api/listings/:id', { preHandler: requireTelegramAuth }, async (request, reply) => {
    const tgId = requireTelegramUserId(request);
    const { id } = request.params as { id: string };
    const body = request.body as ListingRequestBody;
    
    const listing = await listingService.getById(id);
    if (!listing || listing.ownerTgId !== tgId) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'Listing not found' });
    }
    
    const { listing: updated } = await listingService.update(id, tgId, toDraftInput(body));
    
    // If republish requested and listing was already published, update channel message
    let republished: null | { messageId: number } = null;
    if (body.publish && updated.channelMessageId) {
      const profile = await profileService.ensureComplete(tgId);
      const caption = templates.listingCard(profile, updated);
      
      // Try to edit the existing message
      try {
        await server.telegram.editMessageCaption(
          cfg.channelId,
          updated.channelMessageId,
          undefined,
          caption,
          { parse_mode: 'MarkdownV2' }
        );
        republished = { messageId: updated.channelMessageId };
      } catch (error) {
        // If edit fails (e.g., message too old), publish new message
        const messageId = await publishService.publishListing(server.telegram, updated, caption);
        await listingService.updateChannelMessage(id, messageId);
        republished = { messageId };
      }
    }
    
    return reply.send({ 
      listing: updated, 
      republished,
      channelInviteLink: body.publish ? cfg.channelInviteLink : undefined 
    });
  });

  server.delete('/api/listings/:id', { preHandler: requireTelegramAuth }, async (request, reply) => {
    const tgId = requireTelegramUserId(request);
    const { id } = request.params as { id: string };
    
    const listing = await listingService.getById(id);
    if (!listing || listing.ownerTgId !== tgId) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'Listing not found' });
    }
    
    await listingService.archive(id, tgId);
    return reply.send({ success: true });
  });
};

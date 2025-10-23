import type { AppFastifyInstance } from '../server';
import { profileService, publishService } from '../../domain';
import { templates } from '../../domain/templates';
import { cfg } from '../../core/config';
import { requireTelegramAuth } from '../hooks/requireTelegramAuth';
import { requireTelegramUserId } from '../utils/auth';

export const registerProfileRoutes = async (server: AppFastifyInstance) => {
  server.get('/api/profile', { preHandler: requireTelegramAuth }, async (request, reply) => {
    const tgId = requireTelegramUserId(request);
    const profile = await profileService.get(tgId);
    if (!profile) {
      return reply.send({ profile: null, preview: null, profileCompleted: false });
    }
    const preview = templates.profilePreview(profile);
    return reply.send({ profile, preview, profileCompleted: profileService.isComplete(profile) });
  });

  server.put('/api/profile', { preHandler: requireTelegramAuth }, async (request, reply) => {
    const tgId = requireTelegramUserId(request);
    const body = request.body as {
      name?: string;
      location?: string;
      intro?: string;
      catName?: string;
      catPhotoId?: string;
      catPhotoUrl?: string;
    };

    const payload = {
      tgId,
      name: body.name ?? '',
      intro: body.intro ?? '',
      catName: body.catName ?? '',
      catPhotoId: body.catPhotoId ?? '',
      catPhotoUrl: body.catPhotoUrl ?? '',
      location: body.location
    };

    const profile = await profileService.save(payload);
    const preview = templates.profilePreview(profile);
    return reply.send({ profile, preview, profileCompleted: profileService.isComplete(profile) });
  });

  server.post('/api/profile/publish', { preHandler: requireTelegramAuth }, async (request, reply) => {
    const tgId = requireTelegramUserId(request);
    const profile = await profileService.ensureComplete(tgId);
    const preview = templates.profilePreview(profile);
    const messageId = await publishService.publishProfile(server.telegram, profile, preview);
    await profileService.updateChannelMessage(tgId, messageId);
    return reply.send({ messageId, preview, channelInviteLink: cfg.channelInviteLink });
  });
};

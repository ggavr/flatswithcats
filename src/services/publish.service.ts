import type { Telegram } from 'telegraf';
import type { InputMediaPhoto } from 'telegraf/types';
import { cfg } from '../core/config';
import { DependencyError } from '../core/errors';
import { log } from '../core/logger';
import type { Listing, Profile } from '../core/types';

const publishLog = log.withContext({ scope: 'publish' });

export const publishService = {
  async publishProfile(telegram: Telegram, profile: Profile, caption: string) {
    try {
      const message = await telegram.sendPhoto(cfg.channelId, profile.catPhotoId, {
        caption,
        parse_mode: 'MarkdownV2'
      });
      publishLog.info('Profile posted to channel', { tgId: profile.tgId, messageId: message.message_id });
      return message.message_id;
    } catch (error) {
      publishLog.error('Failed to publish profile', error);
      throw new DependencyError('Не удалось отправить анкету в канал', error);
    }
  },

  async publishListing(telegram: Telegram, listing: Listing, caption: string) {
    try {
      const media: InputMediaPhoto[] = [
        {
          type: 'photo',
          media: listing.catPhotoId,
          caption,
          parse_mode: 'MarkdownV2'
        },
        {
          type: 'photo',
          media: listing.apartmentPhotoId
        }
      ];
      const messages = await telegram.sendMediaGroup(cfg.channelId, media);
      const messageId = messages[0]?.message_id;
      if (!messageId) throw new Error('Telegram did not return message id');
      publishLog.info('Listing posted to channel', { listingId: listing.id, messageId });
      return messageId;
    } catch (error) {
      publishLog.error('Failed to publish listing', error);
      throw new DependencyError('Не удалось отправить объявление в канал', error);
    }
  }
};

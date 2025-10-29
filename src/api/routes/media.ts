import type { AppFastifyInstance } from '../server';
import { log } from '../../core/logger';
import { requireTelegramAuth } from '../hooks/requireTelegramAuth';
import { requireTelegramUserId } from '../utils/auth';
import { mediaStorage } from '../../services/mediaStorage.service';

const MAX_PHOTO_BYTES = 15 * 1024 * 1024; // 15 MB safety limit below Telegram's maximum
const mediaLog = log.withContext({ scope: 'media' });

export const registerMediaRoutes = async (server: AppFastifyInstance) => {
  server.post('/api/media/photo', { preHandler: requireTelegramAuth }, async (request, reply) => {
    const tgId = requireTelegramUserId(request);
    const part = await request.file();
    if (!part) {
      return reply.code(400).send({ error: 'VALIDATION', message: 'Файл не найден в запросе' });
    }

    if (!part.mimetype || !part.mimetype.startsWith('image/')) {
      return reply.code(400).send({ error: 'VALIDATION', message: 'Поддерживаются только изображения' });
    }

    const buffer = await part.toBuffer();
    if (!buffer.length) {
      return reply.code(400).send({ error: 'VALIDATION', message: 'Файл пустой' });
    }
    if (buffer.length > MAX_PHOTO_BYTES) {
      return reply.code(400).send({ error: 'VALIDATION', message: 'Файл слишком большой (максимум 15 МБ)' });
    }

    const filename = part.filename ?? 'photo.jpg';
    
    // Store the file locally first
    const stored = await mediaStorage.save(buffer, filename, part.mimetype);
    
    // Upload to Telegram to get file_id
    // We use a temporary chat (user's DM) but with better error handling
    let message;
    let fileId: string;
    
    try {
      // Try to send to user's DM
      message = await server.telegram.sendPhoto(
        tgId, 
        { source: buffer, filename }, 
        { 
          disable_notification: true,
          caption: '📸 Фото загружено (это сообщение будет удалено)'
        }
      );
      
      const photos = message.photo ?? [];
      const best = photos[photos.length - 1];
      if (!best?.file_id) {
        throw new Error('Telegram не вернул file_id');
      }
      fileId = best.file_id;
      
      // Try to delete the temporary message (non-critical)
      try {
        await server.telegram.deleteMessage(tgId, message.message_id);
      } catch (deleteError) {
        // Log but don't fail - user can delete manually
        mediaLog.warn('Не удалось удалить временное фото (пользователь может удалить вручную)', { 
          tgId, 
          messageId: message.message_id,
          error: deleteError 
        });
      }
    } catch (uploadError) {
      mediaLog.error('Не удалось загрузить фото через Telegram', { tgId, error: uploadError });
      
      // If Telegram upload fails, we still have the file stored locally
      // Return the URL but without file_id (can still be used for web display)
      return reply.send({ 
        fileId: null, 
        url: stored.url,
        warning: 'Фото сохранено, но не удалось получить Telegram file_id. Используй фото только для предпросмотра в веб-интерфейсе.'
      });
    }

    return reply.send({ fileId, url: stored.url });
  });
};

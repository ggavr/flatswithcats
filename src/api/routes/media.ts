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
    let message;
    try {
      message = await server.telegram.sendPhoto(tgId, { source: buffer, filename }, { disable_notification: true });
    } catch (error) {
      mediaLog.error('Не удалось загрузить фото через Telegram', error);
      return reply.code(400).send({
        error: 'DEPENDENCY',
        message: 'Telegram отклонил фото. Убедись, что бот имеет право писать тебе в личные сообщения.'
      });
    }
    const photos = message.photo ?? [];
    const best = photos[photos.length - 1];
    if (!best?.file_id) {
      throw new Error('Telegram не вернул file_id');
    }

    try {
      await server.telegram.deleteMessage(tgId, message.message_id);
    } catch (error) {
      mediaLog.warn('Не удалось удалить временное фото', error);
    }

    const stored = await mediaStorage.save(buffer, filename, part.mimetype);

    return reply.send({ fileId: best.file_id, url: stored.url });
  });
};

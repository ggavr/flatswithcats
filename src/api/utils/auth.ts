import type { FastifyRequest } from 'fastify';
import { Forbidden } from '../../core/errors';
import type { TelegramAuthContext } from '../auth/telegram';

export const requireTelegramUserId = (request: FastifyRequest) => {
  const { telegramAuth } = request as FastifyRequest & { telegramAuth?: TelegramAuthContext };
  const id = telegramAuth?.user?.id;
  if (typeof id !== 'number') {
    throw new Forbidden('Telegram user is not authenticated');
  }
  return id;
};

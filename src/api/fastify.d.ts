import '@fastify/multipart';
import type { Telegram } from 'telegraf';
import type { TelegramAuthContext } from './auth/telegram';

declare module 'fastify' {
  interface FastifyInstance {
    telegram: Telegram;
  }

  interface FastifyRequest {
    telegramAuth?: TelegramAuthContext;
  }
}

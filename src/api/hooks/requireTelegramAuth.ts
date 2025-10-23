import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';
import { verifyTelegramInitData, type TelegramAuthContext } from '../auth/telegram';

const HEADER_NAME = 'x-telegram-init-data';

const pickInitData = (request: FastifyRequest): string | null => {
  const header = request.headers[HEADER_NAME];
  if (typeof header === 'string') return header;
  if (Array.isArray(header)) return header[0] ?? null;

  const queryInitData = (request.query as Record<string, unknown> | undefined)?.initData;
  if (typeof queryInitData === 'string') return queryInitData;

  if (request.body && typeof request.body === 'object') {
    const body = request.body as Record<string, unknown>;
    const candidate = body.initData;
    if (typeof candidate === 'string') return candidate;
  }

  return null;
};

export const requireTelegramAuth: preHandlerHookHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  const initData = pickInitData(request);
  const auth = verifyTelegramInitData(initData ?? '');
  (request as FastifyRequest & { telegramAuth?: TelegramAuthContext }).telegramAuth = auth;
};

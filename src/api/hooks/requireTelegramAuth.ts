import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';
import { verifyTelegramInitData, type TelegramAuthContext } from '../auth/telegram';
import { issueSessionToken, verifySessionToken } from '../auth/sessionToken';
import { Forbidden } from '../../core/errors';

const HEADER_NAME = 'x-telegram-init-data';
const AUTH_HEADER = 'authorization';
const SESSION_HEADER = 'x-auth-token';

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

const pickSessionToken = (request: FastifyRequest): string | null => {
  const authHeader = request.headers[AUTH_HEADER];
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim();
  }
  if (Array.isArray(authHeader)) {
    const token = authHeader.find((value) => value.startsWith('Bearer '));
    if (token) return token.slice('Bearer '.length).trim();
  }
  const headerToken = request.headers[SESSION_HEADER];
  if (typeof headerToken === 'string') return headerToken.trim();
  if (Array.isArray(headerToken)) return headerToken[0]?.trim() ?? null;
  return null;
};

export const requireTelegramAuth: preHandlerHookHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  const existingToken = pickSessionToken(request);
  if (existingToken) {
    const payload = verifySessionToken(existingToken);
    const { user, authDate } = payload;
    (request as FastifyRequest & { telegramAuth?: TelegramAuthContext }).telegramAuth = {
      user,
      authDate,
      sessionToken: existingToken
    };
    return;
  }

  const initData = pickInitData(request);
  if (!initData) {
    throw new Forbidden('Telegram auth token is missing.');
  }
  const auth = verifyTelegramInitData(initData);
  const sessionToken = issueSessionToken(auth.user, auth.authDate);
  reply.header(SESSION_HEADER, sessionToken);
  reply.header('cache-control', 'no-store');
  (request as FastifyRequest & { telegramAuth?: TelegramAuthContext }).telegramAuth = {
    ...auth,
    sessionToken,
    tokenIssued: true
  };
};

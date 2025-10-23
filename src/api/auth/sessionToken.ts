import crypto from 'node:crypto';
import { Forbidden } from '../../core/errors';
import { cfg } from '../../core/config';
import type { TelegramInitUser } from './telegram';

const SESSION_TOKEN_SALT = 'SessionToken';
const TOKEN_VERSION = 'v1';
const SESSION_TTL_SECONDS = 3600;

const secret = crypto.createHmac('sha256', SESSION_TOKEN_SALT).update(cfg.botToken).digest();

export interface SessionTokenPayload {
  ver: string;
  sub: number;
  authDate: number;
  user: TelegramInitUser;
  iat: number;
  exp: number;
}

const encode = (payload: SessionTokenPayload) => Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');

const sign = (data: string) => crypto.createHmac('sha256', secret).update(data).digest('base64url');

const decode = (encoded: string): SessionTokenPayload => {
  try {
    const json = Buffer.from(encoded, 'base64url').toString('utf8');
    const payload = JSON.parse(json) as SessionTokenPayload;
    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid payload');
    }
    return payload;
  } catch {
    throw new Forbidden('Auth token is invalid.');
  }
};

export const issueSessionToken = (user: TelegramInitUser, authDate: number): string => {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload: SessionTokenPayload = {
    ver: TOKEN_VERSION,
    sub: user.id,
    user,
    authDate,
    iat: nowSeconds,
    exp: nowSeconds + SESSION_TTL_SECONDS
  };
  const encoded = encode(payload);
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
};

export const verifySessionToken = (token: string): SessionTokenPayload => {
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) {
    throw new Forbidden('Auth token format is invalid.');
  }
  const expectedSignature = sign(encoded);
  const signatureBuffer = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    throw new Forbidden('Auth token signature mismatch.');
  }
  const payload = decode(encoded);
  if (payload.ver !== TOKEN_VERSION) {
    throw new Forbidden('Auth token version mismatch.');
  }
  if (payload.sub !== payload.user?.id) {
    throw new Forbidden('Auth token payload is invalid.');
  }
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (payload.exp <= nowSeconds) {
    throw new Forbidden('Auth token expired.');
  }
  return payload;
};

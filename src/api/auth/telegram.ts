import crypto from 'node:crypto';
import { Forbidden } from '../../core/errors';
import { cfg } from '../../core/config';
import { consumeInitDataReplay } from './telegramReplay';

export interface TelegramInitUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  allows_write_to_pm?: boolean;
  photo_url?: string;
}

export interface TelegramAuthContext {
  user: TelegramInitUser;
  authDate: number;
  raw?: string;
  sessionToken?: string;
  tokenIssued?: boolean;
}

const SECRET_KEY_SALT = 'WebAppData';
const DEFAULT_MAX_AGE_SECONDS = 300;

const getSecretKey = (botToken: string) =>
  crypto.createHmac('sha256', SECRET_KEY_SALT).update(botToken).digest();

const buildDataCheckString = (params: URLSearchParams) =>
  [...params]
    .filter(([key]) => key !== 'hash')
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

const parseUser = (value: string | null): TelegramInitUser | null => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as TelegramInitUser;
    if (!parsed || typeof parsed.id !== 'number') return null;
    return parsed;
  } catch (error) {
    return null;
  }
};

export const verifyTelegramInitData = (
  rawInitData: string,
  options: { maxAgeSeconds?: number } = {}
): TelegramAuthContext => {
  const initData = rawInitData.trim();
  if (!initData) {
    throw new Forbidden('Telegram init data is missing');
  }

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) {
    throw new Forbidden('Telegram init data hash is missing');
  }

  const dataCheckString = buildDataCheckString(params);
  const secretKey = getSecretKey(cfg.botToken);
  const signature = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (signature !== hash) {
    throw new Forbidden('Telegram init data signature mismatch');
  }

  const authDateRaw = params.get('auth_date');
  const authDate = Number.parseInt(authDateRaw ?? '0', 10);
  if (!Number.isFinite(authDate) || authDate <= 0) {
    throw new Forbidden('Telegram init data auth_date is invalid');
  }

  const maxAgeSeconds = options.maxAgeSeconds ?? DEFAULT_MAX_AGE_SECONDS;
  if (maxAgeSeconds > 0) {
    const ageSeconds = Math.floor(Date.now() / 1000) - authDate;
    if (ageSeconds > maxAgeSeconds) {
      throw new Forbidden('Telegram init data is too old');
    }
  }

  const user = parseUser(params.get('user'));
  if (!user) {
    throw new Forbidden('Telegram init data user payload is invalid');
  }

  consumeInitDataReplay({ userId: user.id, hash });

  return { user, authDate, raw: initData };
};

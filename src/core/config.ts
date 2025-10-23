import 'dotenv/config';
import path from 'node:path';
import { log } from './logger';

const REQUIRED_NODE_MAJOR = 18;

const requireEnv = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`[config] Missing required env var: ${name}`);
  return value;
};

const ensureNodeVersion = () => {
  const major = Number.parseInt(process.versions.node.split('.')[0] ?? '0', 10);
  if (!Number.isFinite(major) || major < REQUIRED_NODE_MAJOR) {
    throw new Error(`[config] Node.js ${REQUIRED_NODE_MAJOR}.x or newer is required. Detected ${process.versions.node}.`);
  }
};

ensureNodeVersion();

const parsePort = (value: string) => {
  const port = Number.parseInt(value, 10);
  if (!Number.isFinite(port) || port <= 0 || port > 65535) {
    throw new Error(`[config] API_PORT must be a valid port number. Received ${value}`);
  }
  return port;
};

const parseCorsOrigins = (value: string | undefined) => {
  if (!value) return ['*'];
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const normalizePublicPath = (value: string) => {
  if (!value) return '/uploads/';
  const withLeading = value.startsWith('/') ? value : `/${value}`;
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
};

const resolveStorageRoot = (value: string | undefined) =>
  path.resolve(process.cwd(), value ?? 'storage/uploads');

export const cfg = {
  botToken: requireEnv('BOT_TOKEN'),
  channelId: requireEnv('CHANNEL_ID'),
  channelInviteLink: requireEnv('CHANNEL_INVITE_LINK'),
  http: {
    host: process.env.API_HOST ?? '0.0.0.0',
    port: parsePort(process.env.API_PORT ?? '8080'),
    corsOrigins: parseCorsOrigins(process.env.API_CORS_ORIGINS)
  },
  notion: {
    token: requireEnv('NOTION_TOKEN'),
    dbProfiles: requireEnv('NOTION_DB_PROFILES'),
    dbListings: requireEnv('NOTION_DB_LISTINGS')
  },
  webAppUrl: process.env.WEBAPP_URL?.trim() ?? null,
  media: {
    storageRoot: resolveStorageRoot(process.env.MEDIA_STORAGE_ROOT),
    publicPath: normalizePublicPath(process.env.MEDIA_PUBLIC_PATH ?? '/uploads'),
    baseUrl: process.env.MEDIA_BASE_URL?.replace(/\/$/, '') ?? null
  }
};

log.info('[config] Loaded configuration successfully');

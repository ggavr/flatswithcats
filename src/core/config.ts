import 'dotenv/config';
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

export const cfg = {
  botToken: requireEnv('BOT_TOKEN'),
  channelId: requireEnv('CHANNEL_ID'),
  channelInviteLink: requireEnv('CHANNEL_INVITE_LINK'),
  notion: {
    token: requireEnv('NOTION_TOKEN'),
    dbProfiles: requireEnv('NOTION_DB_PROFILES'),
    dbListings: requireEnv('NOTION_DB_LISTINGS')
  }
};

log.info('[config] Loaded configuration successfully');

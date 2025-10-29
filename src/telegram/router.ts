import type { Context } from 'telegraf';
import { Telegraf } from 'telegraf';
import { registerCommands } from './commands';
import { profileService } from '../services/profile.service';
import type { Profile } from '../core/types';

const RATE_LIMIT_WINDOW_MS = 500;
const ACTIVITY_TTL_MS = 10 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 1000;
const MAX_TRACKED_USERS = 5000;
const lastActivity = new Map<number, number>();
let lastCleanupAt = 0;

interface BotContext extends Context {
  state: {
    profile?: Profile & { id: string } | null;
  };
}

const pruneLastActivityMap = (now: number) => {
  if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) return;
  lastCleanupAt = now;
  for (const [userId, timestamp] of lastActivity) {
    if (now - timestamp > ACTIVITY_TTL_MS) {
      lastActivity.delete(userId);
    }
  }
  if (lastActivity.size > MAX_TRACKED_USERS) {
    for (const userId of lastActivity.keys()) {
      lastActivity.delete(userId);
      if (lastActivity.size <= MAX_TRACKED_USERS) break;
    }
  }
};

export const buildRouter = (bot: Telegraf) => {
  // Rate limiting middleware
  bot.use(async (ctx, next) => {
    const fromId = ctx.from?.id;
    if (!fromId) return next();
    const now = Date.now();
    pruneLastActivityMap(now);
    const last = lastActivity.get(fromId) ?? 0;
    if (now - last < RATE_LIMIT_WINDOW_MS) {
      // Silently drop rate-limited requests
      return;
    }
    lastActivity.set(fromId, now);
    return next();
  });

  // Profile caching middleware
  bot.use(async (ctx, next) => {
    const botCtx = ctx as BotContext;
    botCtx.state = { profile: undefined };
    const fromId = ctx.from?.id;
    if (fromId) {
      try {
        const profile = await profileService.get(fromId);
        botCtx.state.profile = profile;
      } catch (error) {
        // Profile not found or error - continue without profile
        botCtx.state.profile = null;
      }
    }
    return next();
  });

  registerCommands(bot);
};

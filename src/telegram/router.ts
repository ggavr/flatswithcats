import { Scenes, Telegraf, session, MemorySessionStore } from 'telegraf';
import { onboardingScene } from './scenes/onboarding.scene';
import { newListingScene } from './scenes/newListing.scene';
import { registerCommands } from './commands';

const SESSION_TTL_MS = 15 * 60 * 1000;
const SCENE_TTL_SECONDS = 15 * 60;
const RATE_LIMIT_WINDOW_MS = 500;
const ACTIVITY_TTL_MS = 10 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 1000;
const MAX_TRACKED_USERS = 5000;
const lastActivity = new Map<number, number>();
let lastCleanupAt = 0;

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
  const scenes = [onboardingScene, newListingScene] as unknown as Array<Scenes.BaseScene<Scenes.SceneContext>>;
  const stage = new Scenes.Stage<Scenes.SceneContext>(scenes, { ttl: SCENE_TTL_SECONDS });
  bot.use(async (ctx, next) => {
    const fromId = ctx.from?.id;
    if (!fromId) return next();
    const now = Date.now();
    pruneLastActivityMap(now);
    const last = lastActivity.get(fromId) ?? 0;
    if (now - last < RATE_LIMIT_WINDOW_MS) {
      return;
    }
    lastActivity.set(fromId, now);
    return next();
  });
  bot.use(session({ store: new MemorySessionStore(SESSION_TTL_MS) }) as any);
  bot.use(stage.middleware() as any);
  registerCommands(bot as unknown as Telegraf<Scenes.SceneContext>);
};

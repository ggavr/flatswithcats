import { Scenes, Telegraf, session, MemorySessionStore } from 'telegraf';
import { onboardingScene } from './scenes/onboarding.scene';
import { newListingScene } from './scenes/newListing.scene';
import { registerCommands } from './commands';

const SESSION_TTL_MS = 15 * 60 * 1000;
const SCENE_TTL_SECONDS = 15 * 60;

export const buildRouter = (bot: Telegraf) => {
  const scenes = [onboardingScene, newListingScene] as unknown as Array<Scenes.BaseScene<Scenes.SceneContext>>;
  const stage = new Scenes.Stage<Scenes.SceneContext>(scenes, { ttl: SCENE_TTL_SECONDS });
  bot.use(session({ store: new MemorySessionStore(SESSION_TTL_MS) }) as any);
  bot.use(stage.middleware() as any);
  registerCommands(bot as unknown as Telegraf<Scenes.SceneContext>);
};

import { createBot } from './telegram/bot';
import { log } from './core/logger';

async function main() {
  const bot = createBot();
  await bot.launch();
  log.info('Bot launched');
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

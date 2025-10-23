import { createBot } from './telegram/bot';
import { log } from './core/logger';
import { startServer } from './api/server';

async function main() {
  const bot = createBot();
  const server = await startServer({ telegram: bot.telegram });
  await bot.launch();
  log.info('Bot launched');
  const shutdown = async (signal: string) => {
    log.info(`Received ${signal}, shutting down`);
    try {
      await server.close();
    } catch (error) {
      log.error('Failed to close HTTP server', error);
    }
    await bot.stop(signal);
  };
  process.once('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.once('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

import { createBot } from './telegram/bot';
import { log } from './core/logger';
import { startServer } from './api/server';

/**
 * Self-ping to keep the server alive on Render free tier.
 * Render free tier services sleep after 15 minutes of inactivity,
 * which would disable the Telegram bot webhook.
 */
const setupSelfPing = () => {
  const externalUrl = process.env.RENDER_EXTERNAL_URL;
  if (!externalUrl) {
    log.info('[self-ping] RENDER_EXTERNAL_URL not set, skipping self-ping setup');
    return;
  }

  const PING_INTERVAL_MS = 5 * 60 * 1000; // Every 5 minutes
  const pingUrl = `${externalUrl}/healthz`;

  log.info('[self-ping] Setting up self-ping', { url: pingUrl, intervalMs: PING_INTERVAL_MS });

  setInterval(async () => {
    try {
      const response = await fetch(pingUrl, { 
        method: 'GET',
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      if (response.ok) {
        log.info('[self-ping] Success', { status: response.status });
      } else {
        log.warn('[self-ping] Non-OK response', { status: response.status });
      }
    } catch (error) {
      log.error('[self-ping] Failed', error);
    }
  }, PING_INTERVAL_MS);
};

async function main() {
  const bot = createBot();
  const server = await startServer({ telegram: bot.telegram });
  await bot.launch();
  log.info('Bot launched');
  
  // Setup self-ping for Render free tier
  setupSelfPing();
  
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

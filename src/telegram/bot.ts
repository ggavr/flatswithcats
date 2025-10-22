import { Telegraf } from 'telegraf';
import { cfg } from '../core/config';
import { toAppError } from '../core/errors';
import { log } from '../core/logger';
import { buildRouter } from './router';

export const createBot = () => {
  const bot = new Telegraf(cfg.botToken);
  buildRouter(bot);
  bot.catch((err, ctx) => {
    const scene = (ctx as unknown as { scene?: { current?: { id?: string } } }).scene;
    const scopedLog = log.withContext({ scope: 'bot', from: ctx.from?.id, scene: scene?.current?.id });
    const appError = toAppError(err);
    scopedLog.error('Bot error', appError);
    const message =
      appError.code === 'VALIDATION' || appError.code === 'FORBIDDEN'
        ? appError.message
        : 'Что-то пошло не так. Попробуйте ещё раз позже.';
    ctx.reply?.(message);
  });
  return bot;
};

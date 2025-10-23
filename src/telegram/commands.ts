import { Markup, Telegraf } from 'telegraf';
import type { Context } from 'telegraf';
import { profileService } from '../services/profile.service';
import { kb } from './keyboards';
import { templates } from '../domain/templates';
import { cfg } from '../core/config';

const miniAppReminder = () => {
  const url = cfg.webAppUrl;
  if (!url) {
    return 'Используй мини-эпп, чтобы заполнить анкету или разместить объявление.';
  }
  return [
    'Открой мини-эпп, чтобы заполнить анкету, увидеть объявления и статус модерации.',
    'Нажми кнопку «🚀 Открыть мини-эпп».'
  ].join('\n');
};

const sendMainMenu = async (ctx: Context, text: string) => {
  const tgId = ctx.from?.id;
  const profile = tgId ? await profileService.get(tgId) : null;
  await ctx.reply(text, kb.main({ hasProfile: Boolean(profile), webAppUrl: cfg.webAppUrl }));
};

const sendProfileStatus = async (ctx: Context) => {
  const tgId = ctx.from?.id;
  if (!tgId) {
    await ctx.reply('Не удалось определить твой профиль.');
    return;
  }
  const profile = await profileService.get(tgId);
  if (!profile) {
    const inlineApp = kb.inlineApp(cfg.webAppUrl);
    await ctx.reply(miniAppReminder(), inlineApp ? inlineApp : undefined);
    return;
  }
  const inlineApp = kb.inlineApp(cfg.webAppUrl);
  const introExtra = {
    disable_notification: true,
    ...(inlineApp ? { reply_markup: inlineApp.reply_markup } : {})
  };
  await ctx.reply('Вот как выглядит твоя анкета в мини-эппе:', introExtra);
  await ctx.reply(templates.profilePreview(profile), {
    parse_mode: 'MarkdownV2',
    link_preview_options: { is_disabled: true },
    ...(inlineApp ? { reply_markup: inlineApp.reply_markup } : {})
  });
};

const sendListingsHint = async (ctx: Context) => {
  const inlineApp = kb.inlineApp(cfg.webAppUrl);
  const lines = [
    'Разместить объявление можно только в мини-эппе.',
    'Там же доступны черновики и опубликованные посты.'
  ];
  await ctx.reply(lines.join('\n'), inlineApp ? inlineApp : undefined);
};

const sendSupport = async (ctx: Context) => {
  const lines = [
    'Нужна помощь? Напиши модераторам: @flatswithcats_support',
    cfg.channelInviteLink ? `Чат сообщества: ${cfg.channelInviteLink}` : null
  ].filter(Boolean);
  await ctx.reply(lines.join('\n'));
};

export const registerCommands = (bot: Telegraf<Context>) => {
  bot.start(async (ctx) => {
    const tgId = ctx.from?.id;
    const profile = tgId ? await profileService.get(tgId) : null;
    if (profile) {
      await ctx.reply('С возвращением! Продолжай в мини-эппе или посмотри статус.', kb.main({ hasProfile: true, webAppUrl: cfg.webAppUrl }));
      return;
    }
    await ctx.reply('Привет! Мини-эпп поможет заполнить анкету и разместить объявление.', kb.main({ hasProfile: false, webAppUrl: cfg.webAppUrl }));
    if (cfg.webAppUrl) {
      await ctx.reply('Нажми «🚀 Открыть мини-эпп», чтобы начать.', Markup.inlineKeyboard([Markup.button.webApp('🚀 Открыть мини-эпп', cfg.webAppUrl)]));
    }
  });

  bot.command('menu', async (ctx) => sendMainMenu(ctx, 'Главное меню'));
  bot.command('status', sendProfileStatus);

  bot.hears('Главное меню', async (ctx) => sendMainMenu(ctx, 'Главное меню'));
  bot.hears('ℹ️ Как начать', async (ctx) => {
    const inlineApp = kb.inlineApp(cfg.webAppUrl);
    await ctx.reply(miniAppReminder(), inlineApp ? inlineApp : undefined);
  });
  bot.hears('ℹ️ Мой профиль', sendProfileStatus);
  bot.hears('📢 Мои объявления', sendListingsHint);
  bot.hears('📞 Поддержка', sendSupport);
};

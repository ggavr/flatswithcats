import { Markup, Telegraf } from 'telegraf';
import type { Context, InlineQueryResult } from 'telegraf';
import { kb } from './keyboards';
import { templates } from '../domain/templates';
import { cfg } from '../core/config';
import type { Profile } from '../core/types';
import { listingService } from '../services/listing.service';

interface BotContext extends Context {
  state: {
    profile?: Profile & { id: string } | null;
  };
}

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
  const botCtx = ctx as BotContext;
  const profile = botCtx.state.profile;
  await ctx.reply(text, kb.main({ hasProfile: Boolean(profile), webAppUrl: cfg.webAppUrl }));
};

const sendProfileStatus = async (ctx: Context) => {
  const botCtx = ctx as BotContext;
  const profile = botCtx.state.profile;
  
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

const sendSearchResults = async (ctx: Context) => {
  const query = ctx.message && 'text' in ctx.message ? ctx.message.text.replace('/search', '').trim() : '';
  
  try {
    const listings = await listingService.search(query, 10);
    
    if (listings.length === 0) {
      const message = query 
        ? `Не найдено объявлений по запросу "${query}". Попробуй другой город или страну.`
        : 'Пока нет опубликованных объявлений. Создай своё первое объявление в мини-эппе!';
      await ctx.reply(message);
      return;
    }

    const results = listings.slice(0, 5);
    let message = query 
      ? `🔍 Найдено объявлений: ${listings.length}. Показываю первые ${results.length}:\n\n`
      : `📢 Последние объявления (показано ${results.length} из ${listings.length}):\n\n`;

    for (const listing of results) {
      message += `📍 ${listing.city}, ${listing.country}\n`;
      message += `👤 ${listing.name}\n`;
      message += `📅 ${listing.dates}\n`;
      message += `🎯 Хочет в: ${listing.preferredDestinations}\n`;
      if (listing.channelMessageId && cfg.channelUsername) {
        message += `🔗 https://t.me/${cfg.channelUsername}/${listing.channelMessageId}\n`;
      }
      message += '\n';
    }

    if (listings.length > 5) {
      message += `\n💡 Используй inline-режим для полного поиска: @${ctx.botInfo?.username || 'bot'} город`;
    }

    await ctx.reply(message);
  } catch (error) {
    await ctx.reply('Не удалось выполнить поиск. Попробуй ещё раз позже.');
  }
};

export const registerCommands = (bot: Telegraf<Context>) => {
  bot.start(async (ctx) => {
    const botCtx = ctx as BotContext;
    const profile = botCtx.state.profile;
    
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
  bot.command('search', sendSearchResults);

  bot.hears('Главное меню', async (ctx) => sendMainMenu(ctx, 'Главное меню'));
  bot.hears('ℹ️ Как начать', async (ctx) => {
    const inlineApp = kb.inlineApp(cfg.webAppUrl);
    await ctx.reply(miniAppReminder(), inlineApp ? inlineApp : undefined);
  });
  bot.hears('ℹ️ Мой профиль', sendProfileStatus);
  bot.hears('📢 Мои объявления', sendListingsHint);
  bot.hears('📞 Поддержка', sendSupport);

  // Inline query handler for searching listings
  bot.on('inline_query', async (ctx) => {
    const query = ctx.inlineQuery.query.trim();
    
    try {
      const listings = await listingService.search(query, 20);
      
      const results: InlineQueryResult[] = listings.map((listing, idx) => {
        const description = `${listing.dates} • ${listing.preferredDestinations}`;
        const messageText = [
          `📍 ${listing.city}, ${listing.country}`,
          `👤 ${listing.name}`,
          `📅 ${listing.dates}`,
          `🏠 ${listing.apartmentDescription}`,
          `✅ ${listing.conditions}`,
          `🎯 Хочет в: ${listing.preferredDestinations}`,
          listing.channelMessageId && cfg.channelUsername 
            ? `\n🔗 https://t.me/${cfg.channelUsername}/${listing.channelMessageId}`
            : ''
        ].filter(Boolean).join('\n');

        return {
          type: 'article',
          id: `${listing.id}-${idx}`,
          title: `${listing.city}, ${listing.country}`,
          description,
          input_message_content: {
            message_text: messageText
          }
        };
      });

      await ctx.answerInlineQuery(results, {
        cache_time: 60,
        is_personal: false
      });
    } catch (error) {
      // Return empty results on error
      await ctx.answerInlineQuery([], { cache_time: 10 });
    }
  });
};

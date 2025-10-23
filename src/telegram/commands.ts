import { Telegraf, Scenes } from 'telegraf';
import { profileService } from '../services/profile.service';
import { kb } from './keyboards';
import { templates } from '../domain/templates';

type SceneContext = Scenes.SceneContext;

const enterScene = (sceneId: string) => async (ctx: SceneContext) => {
  await ctx.scene.enter(sceneId);
};

const sendMainMenu = async (ctx: SceneContext, text: string) => {
  const tgId = ctx.from?.id;
  const profile = tgId ? await profileService.get(tgId) : null;
  await ctx.reply(text, kb.main(Boolean(profile)));
};

const sendStatus = async (ctx: SceneContext) => {
  const tgId = ctx.from?.id;
  if (!tgId) {
    await ctx.reply('Не удалось определить твой профиль.');
    return;
  }
  const profile = await profileService.get(tgId);
  if (!profile) {
    await ctx.reply('Анкеты ещё нет. Пожалуйста, нажми «📝 Регистрация», чтобы начать.', kb.main(false));
    return;
  }
  await ctx.reply(templates.profilePreview(profile), {
    parse_mode: 'MarkdownV2',
    link_preview_options: { is_disabled: true },
    reply_markup: kb.profileActions().reply_markup
  });
};

export const registerCommands = (bot: Telegraf<SceneContext>) => {
  bot.start(async (ctx) => {
    const tgId = ctx.from?.id;
    const profile = tgId ? await profileService.get(tgId) : null;
    if (profile) {
      await ctx.reply('С возвращением! Что делаем дальше?', kb.main(true));
      return;
    }
    await ctx.reply('Привет! Я помогу собрать твою анкету и опубликовать объявление. Начнём?', kb.main(false));
    return ctx.scene.enter('registration');
  });

  bot.command('register', enterScene('registration'));
  bot.command('listing', enterScene('newListing'));
  bot.command('status', sendStatus);
  bot.command('menu', async (ctx) => sendMainMenu(ctx, 'Главное меню'));

  bot.hears('Главное меню', async (ctx) => sendMainMenu(ctx, 'Главное меню'));
  bot.hears('Отмена', async (ctx) => sendMainMenu(ctx, 'Главное меню'));
  bot.hears('📝 Регистрация', enterScene('registration'));
  bot.hears('📢 Разместить объявление', enterScene('newListing'));
  bot.hears('ℹ️ Мой профиль', sendStatus);
  bot.hears('✏️ Обновить анкету', enterScene('registration'));
};

import { Scenes } from 'telegraf';
import { profileService } from '../../services/profile.service';
import { publishService } from '../../services/publish.service';
import { cfg } from '../../core/config';
import { kb } from '../keyboards';
import { templates } from '../../domain/templates';

interface RegistrationState extends Scenes.WizardSessionData {
  name?: string;
  intro?: string;
  catName?: string;
  catPhotoId?: string;
  profileId?: string;
}

type RegistrationCtx = Scenes.WizardContext<RegistrationState>;

const CANCEL = 'отмена';
const JOIN_CHAT = '🚪 Присоединиться к чату';
const CREATE_LISTING = '📢 Разместить объявление';
const EDIT_PROFILE = '✏️ Обновить анкету';
const FINAL_STEP_INDEX = 4;

const getText = (ctx: RegistrationCtx) => {
  if ('message' in ctx && ctx.message && 'text' in ctx.message) {
    return ctx.message.text.trim();
  }
  return null;
};

const resetToStart = async (ctx: RegistrationCtx) => {
  await ctx.reply('Начнём сначала.', kb.main(false));
  return ctx.scene.reenter();
};

const saveProfileAndShowPreview = async (ctx: RegistrationCtx, state: RegistrationState): Promise<boolean> => {
  const tgId = ctx.from?.id;
  if (!tgId) {
    await ctx.reply('Не удалось сохранить анкету (нет tgId).', kb.main(false));
    await ctx.scene.leave();
    return false;
  }

  try {
    const stored = await profileService.save({
      tgId,
      name: state.name ?? '',
      intro: state.intro ?? '',
      catName: state.catName ?? '',
      catPhotoId: state.catPhotoId ?? ''
    });
    state.profileId = stored.id;
    await ctx.reply('Вот как выглядит твоя анкета:', {
      parse_mode: 'MarkdownV2',
      link_preview_options: { is_disabled: true }
    });
    await ctx.reply(templates.profilePreview(stored), {
      parse_mode: 'MarkdownV2',
      link_preview_options: { is_disabled: true }
    });
    await ctx.reply('Что делаем дальше?', kb.postProfile());
    ctx.wizard.selectStep(FINAL_STEP_INDEX);
    return true;
  } catch (error) {
    await ctx.reply(error instanceof Error ? error.message : 'Не удалось сохранить анкету. Попробуй снова.');
    return false;
  }
};

export const onboardingScene = new Scenes.WizardScene<RegistrationCtx>(
  'registration',
  async (ctx) => {
    await ctx.reply('Шаг 1. Напиши, пожалуйста, как тебя зовут.', kb.cancel());
    return ctx.wizard.next();
  },
  async (ctx) => {
    const state = ctx.wizard.state as RegistrationState;
    const text = getText(ctx);
    if (!text) return;
    if (text.toLowerCase() === CANCEL) {
      await ctx.reply('Окей, возвращаю в меню.', kb.main(false));
      return ctx.scene.leave();
    }
    state.name = text;
    await ctx.reply('Шаг 2. Как зовут твоего кота (или котов)?', kb.cancel());
    return ctx.wizard.next();
  },
  async (ctx) => {
    const state = ctx.wizard.state as RegistrationState;
    const text = getText(ctx);
    if (!text) return;
    if (text.toLowerCase() === CANCEL) {
      await ctx.reply('Окей, возвращаю в меню.', kb.main(false));
      return ctx.scene.leave();
    }
    state.catName = text;
    await ctx.reply(
      [
        'Шаг 3. Расскажи, пожалуйста, в нескольких предложениях о себе:',
        'чем занимаешься и что любишь.'
      ].join('\n'),
      kb.cancel()
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    const state = ctx.wizard.state as RegistrationState;
    const text = getText(ctx);
    if (!text) return;
    if (text.toLowerCase() === CANCEL) {
      await ctx.reply('Окей, возвращаю в меню.', kb.main(false));
      return ctx.scene.leave();
    }
    state.intro = text;
    await ctx.reply(
      [
        'Шаг 4. Пришли, пожалуйста, фото кота.',
        'Если котов несколько — можешь указать имена в подписи.'
      ].join('\n'),
      kb.cancel()
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    const state = ctx.wizard.state as RegistrationState;
    if (!('message' in ctx) || !ctx.message) return;
    if ('text' in ctx.message) {
      const text = ctx.message.text.trim().toLowerCase();
      if (text === CANCEL) {
        await ctx.reply('Окей, возвращаю в меню.', kb.main(false));
        return ctx.scene.leave();
      }
      await ctx.reply('Пожалуйста, пришли фото кота.', kb.cancel());
      return;
    }
    if (!('photo' in ctx.message) || !ctx.message.photo?.length) {
      await ctx.reply('Пожалуйста, пришли фото кота ещё раз.', kb.cancel());
      return;
    }

    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    state.catPhotoId = photo.file_id;
    const caption = ctx.message.caption?.trim();
    if (caption) {
      state.catName = caption;
    }
    const saved = await saveProfileAndShowPreview(ctx, state);
    if (!saved) return resetToStart(ctx);
    return;
  },
  async (ctx) => {
    const text = getText(ctx);
    if (!text) return;
    const lower = text.toLowerCase();
    if (lower === CANCEL) {
      await ctx.reply('Окей, возвращаю в меню.', kb.main(true));
      return ctx.scene.leave();
    }

    const tgId = ctx.from?.id;
    if (!tgId) {
      await ctx.reply('Не удалось определить твой профиль.', kb.main(true));
      return ctx.scene.leave();
    }

    const profile = await profileService.ensureComplete(tgId);
    if (text === JOIN_CHAT) {
      const caption = templates.profilePreview(profile);
      const messageId = await publishService.publishProfile(ctx.telegram, profile, caption);
      await profileService.updateChannelMessage(tgId, messageId);
      await ctx.reply('Готово! Мы опубликовали твою анкету в чате.', kb.main(true));
      await ctx.reply(`Присоединяйся к чату: ${cfg.channelInviteLink}`);
      return ctx.scene.leave();
    }

    if (text === CREATE_LISTING) {
      await ctx.reply('Переходим к объявлению.', kb.cancel());
      return ctx.scene.enter('newListing');
    }

    if (text === 'Главное меню') {
      await ctx.reply('Главное меню', kb.main(true));
      return;
    }

    if (text === EDIT_PROFILE) {
      await ctx.reply('Обновим анкету.', kb.cancel());
      return ctx.scene.reenter();
    }

    await ctx.reply('Пожалуйста, выбери действие кнопкой ниже.', kb.postProfile());
  }
);

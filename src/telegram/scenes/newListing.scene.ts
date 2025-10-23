import { Scenes } from 'telegraf';
import { listingService, normalizeDateRange } from '../../services/listing.service';
import { profileService } from '../../services/profile.service';
import { publishService } from '../../services/publish.service';
import { cfg } from '../../core/config';
import { kb } from '../keyboards';
import { templates } from '../../domain/templates';
import type { Listing } from '../../core/types';

interface ListingState extends Scenes.WizardSessionData {
  location?: { city: string; country: string; area?: string };
  housing?: string;
  pets?: string;
  apartmentPhotoId?: string;
  dates?: string;
  conditions?: string;
  preferredDestinations?: string;
  listingId?: string;
  listingDraft?: Listing;
}

type ListingCtx = Scenes.WizardContext<ListingState>;

const CANCEL = 'отмена';
const BACK = '↩️ изменить';

const getText = (ctx: ListingCtx) => {
  if ('message' in ctx && ctx.message && 'text' in ctx.message) {
    return ctx.message.text.trim();
  }
  return null;
};

export const newListingScene = new Scenes.WizardScene<ListingCtx>(
  'newListing',
  async (ctx) => {
    const tgId = ctx.from?.id;
    if (!tgId) {
      await ctx.reply('Не удалось определить тебя. Попробуй ещё раз.', kb.main(false));
      return ctx.scene.leave();
    }

    const profile = await profileService.get(tgId);
    if (!profile) {
      await ctx.reply('Сначала, пожалуйста, заполни анкету через «📝 Регистрация».', kb.main(false));
      return ctx.scene.leave();
    }

    const state = ctx.wizard.state as ListingState;
    state.location = { city: profile.city, country: profile.country };
    await ctx.reply(
      [
        'Шаг 1. Расскажи, пожалуйста, о жилье:',
        'Пример: Двухкомнатная квартира в центре, есть балкон и рабочее место.'
      ].join('\n'),
      kb.cancel()
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    const text = getText(ctx);
    if (!text) return;
    const lower = text.toLowerCase();
    if (lower === CANCEL) {
      await ctx.reply('Окей, возвращаю в меню.', kb.main(true));
      return ctx.scene.leave();
    }
    if (lower === BACK) {
      await ctx.reply(
        [
          'Шаг 1. Расскажи, пожалуйста, о жилье:',
          'Пример: Двухкомнатная квартира в центре, есть балкон и рабочее место.'
        ].join('\n'),
        kb.cancel()
      );
      return;
    }

    const state = ctx.wizard.state as ListingState;
    state.housing = text;

    await ctx.reply(
      [
        'Шаг 2. Расскажи, пожалуйста, о котах и особенностях ухода:',
        'Пример: Две кошки, спокойные, кормим два раза в день.'
      ].join('\n'),
      kb.cancel()
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    const text = getText(ctx);
    if (!text) return;
    const lower = text.toLowerCase();
    if (lower === CANCEL) {
      await ctx.reply('Окей, возвращаю в меню.', kb.main(true));
      return ctx.scene.leave();
    }
    if (lower === BACK) {
      await ctx.reply(
        [
          'Шаг 1. Расскажи, пожалуйста, о жилье:',
          'Пример: Двухкомнатная квартира в центре, есть балкон и рабочее место.'
        ].join('\n'),
        kb.cancel()
      );
      ctx.wizard.selectStep(1);
      return;
    }

    const state = ctx.wizard.state as ListingState;
    state.pets = text;

    await ctx.reply('Шаг 3. Пришли, пожалуйста, фото квартиры.', kb.cancel());
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!('message' in ctx) || !ctx.message) return;
    if ('text' in ctx.message) {
      const text = ctx.message.text.trim().toLowerCase();
      if (text === CANCEL) {
        await ctx.reply('Окей, возвращаю в меню.', kb.main(true));
        return ctx.scene.leave();
      }
      if (text === BACK) {
        await ctx.reply(
          [
            'Шаг 2. Расскажи, пожалуйста, о котах и особенностях ухода:',
            'Пример: Две кошки, спокойные, кормим два раза в день.'
          ].join('\n'),
          kb.cancel()
        );
        ctx.wizard.selectStep(2);
        return;
      }
      await ctx.reply('Пожалуйста, отправь фото квартиры.', kb.cancel());
      return;
    }

    if (!('photo' in ctx.message) || !ctx.message.photo?.length) {
      await ctx.reply('Пожалуйста, пришли фото квартиры ещё раз.', kb.cancel());
      return;
    }
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const state = ctx.wizard.state as ListingState;
    state.apartmentPhotoId = photo.file_id;

    const prompt = [
      'Шаг 4. Укажи даты, когда ищешь подмену:',
      'Пример: 1 июня - 30 июня 2025'
    ].join('\n');
    await ctx.reply(prompt, kb.cancel());
    return ctx.wizard.next();
  },
  async (ctx) => {
    const text = getText(ctx);
    if (!text) return;
    const lower = text.toLowerCase();
    if (lower === CANCEL) {
      await ctx.reply('Окей, возвращаю в меню.', kb.main(true));
      return ctx.scene.leave();
    }
    if (lower === BACK) {
      await ctx.reply('Шаг 3. Пришли, пожалуйста, фото квартиры.', kb.cancel());
      ctx.wizard.selectStep(3);
      return;
    }

    const state = ctx.wizard.state as ListingState;
    try {
      const normalized = normalizeDateRange(text);
      state.dates = normalized;
    } catch (error) {
      await ctx.reply(
        error instanceof Error ? error.message : 'Не удалось распознать даты. Попробуй снова.',
        kb.cancel()
      );
      return;
    }

    await ctx.reply(
      [
        'Шаг 5. Опиши, пожалуйста, условия (взаимный обмен, обязанности, оплата):',
        'Пример: Взаимный обмен, оплачиваем коммуналку, кормить котов два раза в день.'
      ].join('\n'),
      kb.cancel()
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    const text = getText(ctx);
    if (!text) return;
    const lower = text.toLowerCase();
    if (lower === CANCEL) {
      await ctx.reply('Окей, возвращаю в меню.', kb.main(true));
      return ctx.scene.leave();
    }
    if (lower === BACK) {
      await ctx.reply(
        [
          'Шаг 4. Укажи даты, когда ищешь подмену:',
          'Пример: 1 июня - 30 июня 2025'
        ].join('\n'),
        kb.cancel()
      );
      ctx.wizard.selectStep(4);
      return;
    }

    const state = ctx.wizard.state as ListingState;
    state.conditions = text;

    await ctx.reply(
      [
        'Шаг 6. Поделись желаемыми направлениями или городами:',
        'Пример: Берлин, Прага'
      ].join('\n'),
      kb.cancel()
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    const text = getText(ctx);
    if (!text) return;
    const lower = text.toLowerCase();
    if (lower === CANCEL) {
      await ctx.reply('Окей, возвращаю в меню.', kb.main(true));
      return ctx.scene.leave();
    }
    if (lower === BACK) {
      await ctx.reply(
        [
          'Шаг 5. Опиши, пожалуйста, условия (взаимный обмен, обязанности, оплата):',
          'Пример: Взаимный обмен, оплачиваем коммуналку, кормить котов два раза в день.'
        ].join('\n'),
        kb.cancel()
      );
      ctx.wizard.selectStep(5);
      return;
    }

    const state = ctx.wizard.state as ListingState;
    state.preferredDestinations = text;

    const tgId = ctx.from?.id;
    if (!tgId) {
      await ctx.reply('Не удалось определить профиль.', kb.main(true));
      return ctx.scene.leave();
    }
    const profile = await profileService.ensure(tgId);

    try {
      const locationLine = state.location?.city;
      const descriptionParts = [state.housing ?? ''];
      if (locationLine) descriptionParts.push(locationLine);
      if (state.pets) descriptionParts.push(`Коты: ${state.pets}`);
      const apartmentDescription = descriptionParts.filter(Boolean).join('\n');

      const draft = await listingService.buildDraft(tgId, {
        apartmentDescription,
        apartmentPhotoId: state.apartmentPhotoId ?? '',
        dates: state.dates ?? '',
        conditions: state.conditions ?? '',
        preferredDestinations: state.preferredDestinations ?? ''
      });
      state.listingDraft = draft;

      await ctx.reply('Вот как будет выглядеть объявление:', {
        parse_mode: 'MarkdownV2',
        link_preview_options: { is_disabled: true }
      });
      await ctx.reply(templates.listingCard(profile, draft), {
        parse_mode: 'MarkdownV2',
        link_preview_options: { is_disabled: true }
      });
      await ctx.reply('Публикуем?', kb.confirmListing());
      return ctx.wizard.next();
    } catch (error) {
      await ctx.reply(error instanceof Error ? error.message : 'Не удалось подготовить объявление. Попробуй снова.');
      return ctx.scene.leave();
    }
  },
  async (ctx) => {
    const text = getText(ctx);
    if (!text) return;
    const lower = text.toLowerCase();
    if (lower === CANCEL) {
      await ctx.reply('Окей, отменяю.', kb.main(true));
      return ctx.scene.leave();
    }
    if (lower === BACK) {
      await ctx.reply('Давай обновим объявление заново.', kb.main(true));
      return ctx.scene.reenter();
    }
    if (!text.startsWith('✅')) {
      await ctx.reply('Пожалуйста, нажми кнопку «✅ Опубликовать» или «↩️ Изменить».', kb.confirmListing());
      return;
    }

    const tgId = ctx.from?.id;
    if (!tgId) {
      await ctx.reply('Не удалось найти данные объявления.', kb.main(true));
      return ctx.scene.leave();
    }

    const profile = await profileService.ensure(tgId);
    const state = ctx.wizard.state as ListingState;
    const draft = state.listingDraft;
    if (!draft) {
      await ctx.reply('Черновик объявления не найден. Попробуй создать объявление ещё раз.', kb.main(true));
      return ctx.scene.leave();
    }

    const { listingId, listing } = await listingService.persist(draft);
    state.listingId = listingId;
    const caption = templates.listingCard(profile, listing);
    const messageId = await publishService.publishListing(ctx.telegram, listing, caption);
    await listingService.updateChannelMessage(listingId, messageId);
    await ctx.reply('Объявление опубликовано в канале!', kb.main(true));
    await ctx.reply(`Присоединяйся: ${cfg.channelInviteLink}`);
    return ctx.scene.leave();
  }
);

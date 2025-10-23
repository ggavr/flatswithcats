import { Markup } from 'telegraf';

interface MainKeyboardOptions {
  hasProfile: boolean;
  webAppUrl?: string | null;
}

const main = ({ hasProfile, webAppUrl }: MainKeyboardOptions) => {
  const rows: Array<
    Array<ReturnType<typeof Markup.button.webApp> | string>
  > = [];

  if (webAppUrl) {
    rows.push([Markup.button.webApp('🚀 Открыть мини-эпп', webAppUrl)]);
  }

  const profileRow: string[] = ['ℹ️ Мой профиль', '📢 Мои объявления'];
  if (!hasProfile) {
    profileRow[0] = 'ℹ️ Как начать';
  }
  rows.push(profileRow);
  rows.push(['📞 Поддержка', 'Главное меню']);

  return Markup.keyboard(rows).resize().persistent();
};

const inlineApp = (webAppUrl?: string | null) => {
  if (!webAppUrl) return undefined;
  return Markup.inlineKeyboard([Markup.button.webApp('🚀 Открыть мини-эпп', webAppUrl)]);
};

export const kb = {
  main,
  inlineApp
};

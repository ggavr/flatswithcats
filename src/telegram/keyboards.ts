import { Markup } from 'telegraf';

const resize = (rows: string[][]) => Markup.keyboard(rows).resize();

const main = (registered = false) => {
  const rows = registered
    ? [
        ['📢 Разместить объявление'],
        ['ℹ️ Мой профиль']
      ]
    : [
        ['📝 Регистрация', '📢 Разместить объявление'],
        ['ℹ️ Мой профиль']
      ];
  return resize(rows);
};

export const kb = {
  main,
  cancel: () => resize([['Отмена']]),
  postProfile: () =>
    resize([
      ['🚪 Присоединиться к чату'],
      ['📢 Разместить объявление'],
      ['✏️ Обновить анкету'],
      ['Главное меню'],
      ['Отмена']
    ]),
  profileActions: () =>
    resize([
      ['📢 Разместить объявление'],
      ['✏️ Обновить анкету'],
      ['Главное меню'],
      ['Отмена']
    ]),
  confirmListing: () => resize([['✅ Опубликовать'], ['↩️ Изменить'], ['Отмена']])
};

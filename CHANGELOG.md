# Changelog

## [Unreleased] - 2025-01-XX

### 🚨 Hotfixes (Post-Review)

#### Fixed analytics closing Mini App instantly
- **Problem**: `analytics.track()` вызывал `window.Telegram.WebApp.sendData()`, что по спецификации Telegram сразу закрывает WebApp. `trackSessionStart()` закрывал приложение при загрузке
- **Solution**: Убран вызов `sendData()`, оставлено только консольное логирование. Добавлены комментарии про батчевую отправку через API в будущем
- **Impact**: Mini App теперь работает корректно, не закрывается после событий
- **Files**: `apps/web/lib/analytics.ts`

#### Fixed case-sensitive search returning no results
- **Problem**: Запрос приводился к `.toLowerCase()`, но Notion `rich_text.contains` регистрозависимый. Поиск "Москва" не находил "москва"
- **Solution**: Убрана конвертация в lowercase, поиск теперь использует оригинальный ввод пользователя. Добавлен комментарий про case-insensitive варианты
- **Impact**: Поиск теперь работает корректно для городов с заглавной буквы
- **Files**: `src/notion/listings.repo.ts`

### 🐛 Critical Fixes

#### Fixed location fields being erased on profile save
- **Problem**: При сохранении профиля поля `city` и `country` стирались, так как форма не отправляла значение `location` на сервер
- **Solution**: 
  - Добавлены поля "Город" и "Страна" в форму профиля (`ProfileForm.tsx`)
  - `buildProfilePayload` теперь формирует `location` из `city` и `country`
  - Значения корректно сохраняются и загружаются при открытии приложения
- **Impact**: Пользователи больше не потеряют информацию о местоположении

### 🔧 Medium Fixes

#### Separated preview and publish loading states
- **Problem**: Один флаг `listingLoading` управлял и предпросмотром, и публикацией — кнопка "Опубликовать" показывала "Публикуем…" даже при генерации предпросмотра
- **Solution**: 
  - Разделены состояния на `listingPreviewing` и `listingPublishing`
  - Каждая кнопка теперь показывает правильный статус
  - Улучшена телеметрия действий
- **Impact**: Более понятный UX, точная индикация текущего процесса

#### Bot profile caching in middleware
- **Problem**: Каждое обращение к `/menu`, "Главное меню", "ℹ️ Мой профиль" вызывало запрос к Notion
- **Solution**: 
  - Добавлен middleware в `router.ts`, который кеширует профиль в `ctx.state.profile`
  - Команды теперь используют кешированный профиль
  - Снижена нагрузка на Notion API
- **Impact**: Быстрее отклик бота, меньше лимитов API

### ✨ New Features

#### Search functionality (/search + inline query)
- **Added `/search` command** для поиска объявлений по городу или стране
- **Inline query support** — можно искать прямо в чате: `@bot_name Барселона`
- Показывает до 20 результатов с возможностью поделиться
- Поиск работает только по опубликованным объявлениям
- **Files changed**: 
  - `src/notion/listings.repo.ts` — метод `searchPublished()`
  - `src/services/listing.service.ts` — метод `search()`
  - `src/telegram/commands.ts` — команда и inline handler
  - `src/core/config.ts` — добавлено `channelUsername`

#### Draft functionality with localStorage
- **Auto-save drafts** — форма объявления автоматически сохраняется при изменениях
- **Auto-load on startup** — черновик загружается при открытии, если анкета заполнена
- **TTL 7 days** — черновики хранятся 7 дней
- Визуальный индикатор "📝 Черновик сохранён"
- Черновик удаляется после публикации
- **Files changed**: 
  - `apps/web/lib/drafts.ts` (новый файл)
  - `apps/web/app/twa/page.tsx` — интеграция

#### Ability to delete listings
- Кнопка "🗑️ Удалить" для каждого объявления в списке "Мои объявления"
- Подтверждение перед удалением
- Архивирование в Notion (не физическое удаление)
- **Files changed**: 
  - `src/notion/listings.repo.ts` — метод `archive()`
  - `src/services/listing.service.ts` — метод `archive()`
  - `src/api/routes/listings.ts` — DELETE endpoint
  - `apps/web/lib/api.ts` — метод `deleteListing()`
  - `apps/web/app/twa/page.tsx` — UI кнопка

#### Custom React hooks
Для упрощения кода и переиспользования логики:
- **`useTelegramSession`** — инициализация Telegram session, загрузка профиля
- **`useListings`** — загрузка и управление списком объявлений
- Можно использовать в других компонентах
- **Files**: 
  - `apps/web/hooks/useTelegramSession.ts`
  - `apps/web/hooks/useListings.ts`

#### Event tracking (analytics)
- Трекинг ключевых действий пользователя:
  - `session_start` — открытие приложения
  - `profile_save`, `profile_publish` — работа с анкетой
  - `listing_preview`, `listing_publish`, `listing_delete` — работа с объявлениями
  - `photo_upload` — загрузка фото
  - `draft_save`, `draft_load` — работа с черновиками
  - `error_occurred` — ошибки
- Легко интегрируется с внешними сервисами (Google Analytics, Mixpanel)
- Логирование в консоль для отладки
- **Files**: 
  - `apps/web/lib/analytics.ts` (новый файл)
  - `apps/web/app/twa/page.tsx` — интеграция трекинга

### 📝 Configuration

Добавлена новая переменная окружения (опциональная):
```env
CHANNEL_USERNAME=your_channel_username
```
Используется для формирования ссылок на посты в канале при поиске.

### 🔮 Future Enhancements (Отложено)

#### `/notify` command (subscription management)
- **Статус**: Отложено для будущей версии
- **Описание**: Система подписок на новые объявления по городам/странам
- **Причина**: Требует более сложной архитектуры с хранением подписок и фоновой обработки

## Рекомендации по развертыванию

1. Обновить зависимости: `npm install`
2. Добавить `CHANNEL_USERNAME` в `.env` (опционально)
3. Пересобрать проект: `npm run build`
4. Перезапустить сервисы

## Тестирование

Рекомендуется протестировать:
- ✅ Сохранение профиля с городом/страной
- ✅ Предпросмотр и публикация объявлений (отдельные статусы)
- ✅ `/search` команда без параметров и с городом
- ✅ Inline query поиск
- ✅ Автосохранение черновиков
- ✅ Удаление объявлений
- ✅ События в console (analytics)

## Known Issues

Нет известных критических проблем.

## Contributors

- AI Assistant (@cursor)


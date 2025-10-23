# Cats & Flats Platform

Обновлённый моно-репозиторий объединяет Telegram-бота, HTTP API и веб-интерфейсы (мини-эпп + полноценный сайт) на едином доменном слое.

## Структура

- `src/` — общий код домена (Notion, сервисы, типы) и Telegram-бот.
- `src/api/` — Fastify-сервер, который переиспользует доменные сервисы.
- `apps/web/` — Next.js 14 (App Router). Включает:
  - `/app/page.tsx` — публичный сайт.
  - `/app/twa/page.tsx` — Telegram WebApp с формами анкет и объявлений.

## Требования

- Node.js ≥ 18 (проверяется при старте).
- Notion базы и токены (см. `.env.example`).
- Для мини-эппа: бот должен быть включён и опубликован в Telegram.

## Настройка окружения

1. Скопируйте `.env.example` → `.env` и заполните обязательные переменные:
   ```bash
   BOT_TOKEN=...
   CHANNEL_ID=...
   CHANNEL_INVITE_LINK=...
   NOTION_TOKEN=...
   NOTION_DB_PROFILES=...
   NOTION_DB_LISTINGS=...
   API_PORT=8080        # опционально
   API_HOST=0.0.0.0     # опционально
   API_CORS_ORIGINS=*   # список origin через запятую
   MEDIA_STORAGE_ROOT=storage/uploads  # куда сохранять оригиналы (по умолчанию ./storage/uploads)
   MEDIA_PUBLIC_PATH=/uploads          # URL-префикс для раздачи файлов Fastify
   MEDIA_BASE_URL=https://static.example.com/uploads # (опционально) абсолютный CDN URL
   ```
2. Установите зависимости для Node-сервера:
   ```bash
   npm install
   ```
3. Установите зависимости веб-приложения (в отдельной директории):
   ```bash
   npm --prefix apps/web install
   ```

## Запуск

- **Бот + API** (одним процессом):
  ```bash
  npm run dev
  ```
  HTTP-сервер слушает `http://API_HOST:API_PORT` (по умолчанию `http://0.0.0.0:8080`). Health-check: `/healthz`.

- **Собранный бот**:
  ```bash
  npm run build
  npm start
  ```

- **Next.js (публичный сайт и мини-эпп)**:
  ```bash
  npm run dev:web             # http://localhost:3000
  NEXT_PUBLIC_API_BASE_URL=http://localhost:8080 npm run dev:web
  ```

## Интеграция Telegram WebApp

- Мини-эпп (`/twa`) автоматически берёт `initData` из `window.Telegram.WebApp` и передаёт его в API через заголовок `X-Telegram-Init-Data`.
- Аутентификация проверяется на сервере (`verifyTelegramInitData`). Допустимое время жизни подписи — 1 час.
- CORS по умолчанию открыт (`*`). Для продакшена укажите список хостов в `API_CORS_ORIGINS`.
- Формы используют REST-эндпоинты:
  - `GET /api/profile`
  - `PUT /api/profile`
  - `POST /api/profile/publish`
  - `POST /api/listings/preview`
  - `POST /api/listings` (передайте `publish: true`, чтобы сразу отправить в канал)
  - `POST /api/listings/:id/publish`
  - `POST /api/media/photo` — принимает изображение, сохраняет оригинал и возвращает `file_id` Telegram + публичный URL

## Проверка сценария вручную

1. Установите зависимости: `npm install` и `npm --prefix apps/web install`.
2. Заполните `.env` (Notion, Telegram, опционально `API_CORS_ORIGINS`).
3. Запустите сервер: `npm run dev`. Отдельно поднимите фронтенд: `NEXT_PUBLIC_API_BASE_URL=http://localhost:8080 npm run dev:web`.
4. В Telegram откройте бот, запустите мини-эпп `/twa` и заполните анкету. Загрузите фото кота — веб-клиент автоматически получит `file_id` и ссылку (должна открываться по `MEDIA_PUBLIC_PATH` или `MEDIA_BASE_URL`).
5. Сохраните и опубликуйте анкету. В ответ придёт ссылка на канал; убедитесь, что пост появился.
6. Создайте объявление: загрузите фото квартиры, проверьте предпросмотр, опубликуйте и проверьте Notion/канал.

## Деплой на Render

1. Подготовьте репозиторий: `render.yaml` описывает два веб-сервиса (API/бот и Next.js) и диск для медиаконтента. Всё уже включено в репо.
2. В панели Render создайте Blueprint из репозитория. На шаге настройки задайте переменные окружения для сервиса `cats-flats-api`:
   - `BOT_TOKEN`, `CHANNEL_ID`, `CHANNEL_INVITE_LINK`
   - `NOTION_TOKEN`, `NOTION_DB_PROFILES`, `NOTION_DB_LISTINGS`
   - `API_CORS_ORIGINS` (например, `https://cats-flats-web.onrender.com`)
   - `MEDIA_STORAGE_ROOT=/var/uploads`, `MEDIA_PUBLIC_PATH=/uploads`, `MEDIA_BASE_URL=https://cats-flats-api.onrender.com/uploads`
3. Добавьте persistent disk для API (10 GB по пути `/var/uploads`) — Render создаст его автоматически по данным из `render.yaml`.
4. Для сервиса `cats-flats-web` задайте переменную `NEXT_PUBLIC_API_BASE_URL=https://cats-flats-api.onrender.com` (или свой домен). Остальные секреты не требуются.
5. Запустите деплой. После публикации API будет доступен на `https://cats-flats-api.onrender.com`, фронтенд — на `https://cats-flats-web.onrender.com` (или ваших доменах).
6. Настройте WebApp в BotFather (`/setdomain`, `/setmenubutton`) на адрес фронтенда, например `https://cats-flats-web.onrender.com/twa`.

## Дальнейшие шаги

- Перенести медиа в постоянное хранилище (S3/GCS) и получать `file_id` без промежуточного сообщения.
- Расширить Next.js-маршруты для SEO-страниц и каталога объявлений.
- Настроить общие тесты (e2e) для API и мини-эппа.

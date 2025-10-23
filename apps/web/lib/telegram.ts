declare global {
  interface TelegramWebApp {
    initData?: string;
    initDataUnsafe?: Record<string, unknown> & { hash?: string; auth_date?: number; user?: unknown };
    ready: () => void;
    expand: () => void;
  }

  interface TelegramSDK {
    WebApp?: TelegramWebApp;
  }

  interface Window {
    Telegram?: TelegramSDK;
  }
}

export const isTelegramEnvironment = () => typeof window !== 'undefined' && Boolean(window.Telegram?.WebApp);

const serializeInitDataUnsafe = (payload: TelegramWebApp['initDataUnsafe']) => {
  if (!payload) return null;
  const params = new URLSearchParams();
  for (const [key, raw] of Object.entries(payload)) {
    if (raw === undefined || raw === null) continue;
    if (typeof raw === 'object') {
      params.append(key, JSON.stringify(raw));
    } else {
      params.append(key, String(raw));
    }
  }
  const serialized = params.toString();
  return serialized.length ? serialized : null;
};

export const getTelegramInitData = (): string | null => {
  if (!isTelegramEnvironment()) return null;
  const webApp = window.Telegram!.WebApp!;
  return webApp.initData && webApp.initData.length > 0
    ? webApp.initData
    : serializeInitDataUnsafe(webApp.initDataUnsafe);
};

export const prepareTelegramWebApp = () => {
  if (!isTelegramEnvironment()) return;
  const webApp = window.Telegram!.WebApp!;
  try {
    webApp.ready();
    webApp.expand();
  } catch (error) {
    // Ignore SDK errors: failing here should not break the web version.
    console.warn('Failed to initialize Telegram WebApp', error);
  }
};

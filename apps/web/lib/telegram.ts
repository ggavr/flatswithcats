declare global {
  interface TelegramWebApp {
    initData?: string;
    initDataUnsafe?: unknown;
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

export const getTelegramInitData = (): string | null => {
  if (!isTelegramEnvironment()) return null;
  return window.Telegram?.WebApp?.initData ?? null;
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

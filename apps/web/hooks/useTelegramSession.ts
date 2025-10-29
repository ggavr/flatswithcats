import { useEffect, useState } from 'react';
import { api, ApiError } from '@lib/api';
import { getTelegramInitData, isTelegramEnvironment, prepareTelegramWebApp } from '@lib/telegram';
import type { ProfileResponse } from '@lib/types';

interface UseTelegramSessionResult {
  sessionReady: boolean;
  initializing: boolean;
  error: string | null;
  profileData: ProfileResponse | null;
  clearError: () => void;
}

export const useTelegramSession = (): UseTelegramSessionResult => {
  const [sessionReady, setSessionReady] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<ProfileResponse | null>(null);

  useEffect(() => {
    let retryTimeout: number | undefined;
    let cancelled = false;

    const bootstrap = async (init: string) => {
      api.auth.setInitData(init);
      setSessionReady(false);
      setError(null);

      try {
        const data = await api.fetchProfile();
        if (cancelled) return;
        
        setProfileData(data);
        setSessionReady(true);
      } catch (reason) {
        if (cancelled) return;

        if (reason instanceof ApiError && (reason.status === 401 || reason.status === 403)) {
          const hadInitData = api.auth.hasInitData();
          api.auth.clear();
          setSessionReady(false);
          setError(
            hadInitData
              ? 'Не удалось обновить сессию Telegram. Закрой и заново открой мини‑эпп через бота.'
              : 'Сессия Telegram отсутствует. Запусти мини‑эпп из Telegram ещё раз.'
          );
        } else {
          const message = reason instanceof Error ? reason.message : 'Не удалось загрузить данные.';
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setInitializing(false);
        }
      }
    };

    const attemptInit = () => {
      prepareTelegramWebApp();
      const data = getTelegramInitData();
      
      if (data) {
        void bootstrap(data);
        return;
      }

      if (isTelegramEnvironment()) {
        retryTimeout = window.setTimeout(() => {
          const retryData = getTelegramInitData();
          if (retryData) {
            void bootstrap(retryData);
          } else if (!cancelled) {
            setError('Не удалось получить initData от Telegram. Попробуйте перезапустить мини‑эпп.');
            setInitializing(false);
          }
        }, 400);
      } else {
        setError('Мини‑эпп доступно только внутри Telegram.');
        setInitializing(false);
      }
    };

    attemptInit();

    return () => {
      cancelled = true;
      if (retryTimeout) window.clearTimeout(retryTimeout);
    };
  }, []);

  const clearError = () => setError(null);

  return {
    sessionReady,
    initializing,
    error,
    profileData,
    clearError
  };
};


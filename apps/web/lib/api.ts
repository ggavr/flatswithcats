import type {
  CreateListingResponse,
  ListingDraftPayload,
  ListingPreviewResponse,
  MediaUploadResponse,
  ProfileResponse,
  PublishListingResponse,
  PublishProfileResponse,
  SaveProfilePayload
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://cats-flats-api.onrender.com';
const INIT_DATA_HEADER = 'X-Telegram-Init-Data';
const SESSION_HEADER = 'x-auth-token';
const AUTH_HEADER = 'Authorization';

let sessionToken: string | null = null;
let initDataCache: string | null = null;
let refreshPromise: Promise<void> | null = null;

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

interface ApiErrorPayload {
  error?: string;
  message?: string;
  details?: unknown;
}

const toHeaders = (input?: HeadersInit): Headers => {
  const headers = new Headers();
  if (!input) return headers;
  if (input instanceof Headers) {
    input.forEach((value, key) => headers.set(key, value));
    return headers;
  }
  if (Array.isArray(input)) {
    for (const [key, value] of input) {
      headers.set(key, value);
    }
    return headers;
  }
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      headers.set(key, Array.isArray(value) ? value.join(', ') : String(value));
    }
  }
  return headers;
};

type AuthMode = 'auto' | 'initDataOnly';

const buildHeaders = (mode: AuthMode, extra?: HeadersInit): Headers => {
  const headers = toHeaders(extra);
  if (mode === 'initDataOnly') {
    if (!initDataCache) {
      throw new ApiError(401, 'Сессия Telegram не найдена. Перезапусти мини‑эпп.');
    }
    headers.set(INIT_DATA_HEADER, initDataCache);
    return headers;
  }
  if (sessionToken) {
    headers.set(AUTH_HEADER, `Bearer ${sessionToken}`);
    return headers;
  }
  if (initDataCache) {
    headers.set(INIT_DATA_HEADER, initDataCache);
    return headers;
  }
  throw new ApiError(401, 'Сессия Telegram не инициализирована. Перезапусти мини‑эпп.');
};

const parseError = async (response: Response): Promise<ApiError> => {
  let message = `${response.status} ${response.statusText}`;
  let code: string | undefined;
  try {
    const payload = (await response.json()) as ApiErrorPayload;
    if (payload?.message) message = payload.message;
    if (payload?.error) code = payload.error;
  } catch (error) {
    // ignore JSON parse failures
  }
  return new ApiError(response.status, message, code);
};

const internalRequest = async <T>(
  path: string,
  init: RequestInit | undefined,
  mode: AuthMode
): Promise<T> => {
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, {
    ...init,
    headers: buildHeaders(mode, init?.headers)
  });
  if (!response.ok) {
    throw await parseError(response);
  }
  const token = response.headers.get(SESSION_HEADER);
  if (token) {
    sessionToken = token;
  }
  if (response.status === 204) {
    return undefined as unknown as T;
  }
  return (await response.json()) as T;
};

const refreshSession = async () => {
  if (!initDataCache) {
    throw new ApiError(401, 'Telegram не передал данные авторизации. Перезапусти мини‑эпп.');
  }
  if (!refreshPromise) {
    const attempt = (async () => {
      sessionToken = null;
      await internalRequest('/api/profile', undefined, 'initDataOnly');
    })();
    refreshPromise = attempt
      .catch((error) => {
        sessionToken = null;
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

const request = async <T>(path: string, init?: RequestInit, options?: { retry?: boolean }): Promise<T> => {
  try {
    return await internalRequest<T>(path, init, 'auto');
  } catch (error) {
    if (
      !options?.retry &&
      error instanceof ApiError &&
      (error.status === 401 || error.status === 403)
    ) {
      await refreshSession();
      return internalRequest<T>(path, init, 'auto');
    }
    throw error;
  }
};

const jsonRequest = async <T>(path: string, body: unknown, method: 'POST' | 'PUT') =>
  request<T>(
    path,
    {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }
  );

export const api = {
  auth: {
    setInitData(value: string | null | undefined) {
      const trimmed = value?.trim();
      initDataCache = trimmed && trimmed.length > 0 ? trimmed : null;
      sessionToken = null;
    },
    clear() {
      initDataCache = null;
      sessionToken = null;
    },
    hasSession() {
      return sessionToken !== null;
    },
    hasInitData() {
      return Boolean(initDataCache);
    },
    getToken() {
      return sessionToken;
    }
  },

  fetchProfile: () => request<ProfileResponse>('/api/profile'),

  saveProfile: (payload: SaveProfilePayload) => jsonRequest<ProfileResponse>('/api/profile', payload, 'PUT'),

  previewListing: (payload: ListingDraftPayload) =>
    jsonRequest<ListingPreviewResponse>('/api/listings/preview', payload, 'POST'),

  createListing: (payload: ListingDraftPayload & { publish?: boolean }) =>
    jsonRequest<CreateListingResponse>('/api/listings', payload, 'POST'),

  publishListing: (listingId: string) =>
    request<PublishListingResponse>(`/api/listings/${listingId}/publish`, { method: 'POST' }),

  publishProfile: () =>
    request<PublishProfileResponse>('/api/profile/publish', { method: 'POST' }),

  uploadPhoto: (file: File) => {
    const body = new FormData();
    body.append('file', file);
    return request<MediaUploadResponse>('/api/media/photo', {
      method: 'POST',
      body
    });
  }
};

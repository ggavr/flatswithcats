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

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

export interface AuthOptions {
  initData?: string | null;
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

const buildHeaders = (auth: AuthOptions | undefined, extra?: HeadersInit): Headers => {
  const headers = toHeaders(extra);
  if (sessionToken) {
    headers.set(AUTH_HEADER, `Bearer ${sessionToken}`);
    return headers;
  }
  const initData = auth?.initData;
  if (initData && initData.trim().length > 0) {
    headers.set(INIT_DATA_HEADER, initData);
    return headers;
  }
  throw new ApiError(401, 'Сессия Telegram не инициализирована. Перезапусти мини‑эпп.');
};

const handleError = async (response: Response): Promise<never> => {
  let message = `${response.status} ${response.statusText}`;
  let code: string | undefined;
  try {
    const payload = (await response.json()) as ApiErrorPayload;
    if (payload?.message) message = payload.message;
    if (payload?.error) code = payload.error;
  } catch (error) {
    // ignore JSON parse failures
  }
  if (response.status === 401 || response.status === 403) {
    sessionToken = null;
  }
  throw new ApiError(response.status, message, code);
};

const request = async <T>(path: string, init?: RequestInit, auth?: AuthOptions): Promise<T> => {
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, {
    ...init,
    headers: buildHeaders(auth, init?.headers)
  });
  if (!response.ok) {
    await handleError(response);
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

const jsonRequest = async <T>(
  path: string,
  body: unknown,
  method: 'POST' | 'PUT',
  auth?: AuthOptions
) =>
  request<T>(
    path,
    {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    },
    auth
  );

export const api = {
  auth: {
    reset() {
      sessionToken = null;
    },
    hasToken() {
      return sessionToken !== null;
    }
  },

  fetchProfile: (auth: AuthOptions) => request<ProfileResponse>('/api/profile', undefined, auth),

  saveProfile: (payload: SaveProfilePayload, auth?: AuthOptions) =>
    jsonRequest<ProfileResponse>('/api/profile', payload, 'PUT', auth),

  previewListing: (payload: ListingDraftPayload, auth?: AuthOptions) =>
    jsonRequest<ListingPreviewResponse>('/api/listings/preview', payload, 'POST', auth),

  createListing: (payload: ListingDraftPayload & { publish?: boolean }, auth?: AuthOptions) =>
    jsonRequest<CreateListingResponse>('/api/listings', payload, 'POST', auth),

  publishListing: (listingId: string, auth?: AuthOptions) =>
    request<PublishListingResponse>(`/api/listings/${listingId}/publish`, { method: 'POST' }, auth),

  publishProfile: (auth?: AuthOptions) =>
    request<PublishProfileResponse>('/api/profile/publish', { method: 'POST' }, auth),

  uploadPhoto: (file: File, auth?: AuthOptions) => {
    const body = new FormData();
    body.append('file', file);
    return request<MediaUploadResponse>(
      '/api/media/photo',
      {
        method: 'POST',
        body
      },
      auth
    );
  }
};

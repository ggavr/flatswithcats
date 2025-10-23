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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';
const INIT_DATA_HEADER = 'X-Telegram-Init-Data';

const buildHeaders = (initData: string, extra?: HeadersInit): HeadersInit => ({
  [INIT_DATA_HEADER]: initData,
  ...(extra ?? {})
});

interface ApiErrorPayload {
  error?: string;
  message?: string;
  details?: unknown;
}

const handleError = async (response: Response) => {
  let message = `${response.status} ${response.statusText}`;
  try {
    const payload = (await response.json()) as ApiErrorPayload;
    if (payload?.message) message = payload.message;
  } catch (error) {
    // ignore
  }
  throw new Error(message);
};

const request = async <T>(path: string, initData: string, init?: RequestInit): Promise<T> => {
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, {
    ...init,
    headers: buildHeaders(initData, init?.headers)
  });
  if (!response.ok) {
    await handleError(response);
  }
  return (await response.json()) as T;
};

const jsonRequest = async <T>(path: string, initData: string, body: unknown, method: 'POST' | 'PUT') =>
  request<T>(path, initData, {
    method,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

export const api = {
  fetchProfile: (initData: string) => request<ProfileResponse>('/api/profile', initData),

  saveProfile: (initData: string, payload: SaveProfilePayload) =>
    jsonRequest<ProfileResponse>('/api/profile', initData, payload, 'PUT'),

  previewListing: (initData: string, payload: ListingDraftPayload) =>
    jsonRequest<ListingPreviewResponse>('/api/listings/preview', initData, payload, 'POST'),

  createListing: (initData: string, payload: ListingDraftPayload & { publish?: boolean }) =>
    jsonRequest<CreateListingResponse>('/api/listings', initData, payload, 'POST'),

  publishListing: (initData: string, listingId: string) =>
    request<PublishListingResponse>(`/api/listings/${listingId}/publish`, initData, { method: 'POST' }),

  publishProfile: (initData: string) =>
    request<PublishProfileResponse>('/api/profile/publish', initData, { method: 'POST' }),

  uploadPhoto: (initData: string, file: File) => {
    const body = new FormData();
    body.append('file', file);
    return request<MediaUploadResponse>('/api/media/photo', initData, {
      method: 'POST',
      body
    });
  }
};

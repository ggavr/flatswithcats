import type { Listing, Profile } from './types';

export interface ProfileResponse {
  profile: (Profile & { id?: string }) | null;
  preview?: string | null;
  profileCompleted: boolean;
}

export interface SaveProfilePayload {
  name: string;
  catName: string;
  intro: string;
  catPhotoId: string;
  catPhotoUrl?: string;
  location?: string;
}

export interface ListingDraftPayload {
  city: string;
  country: string;
  apartmentDescription: string;
  apartmentPhotoId: string;
  apartmentPhotoUrl?: string;
  dates: string;
  conditions: string;
  preferredDestinations: string;
}

export interface ListingPreviewResponse {
  preview: string;
  listing: Listing;
}

export interface CreateListingResponse {
  listingId: string;
  listing: Listing;
  published: null | { messageId: number };
  channelInviteLink?: string;
}

export interface MediaUploadResponse {
  fileId: string;
  url: string;
}

export interface PublishProfileResponse {
  messageId: number;
  preview: string;
  channelInviteLink?: string;
}

export interface PublishListingResponse {
  messageId: number;
  channelInviteLink?: string;
}

export interface Profile {
  id?: string;
  tgId: number;
  name: string;
  city: string;
  country: string;
  intro: string;
  catName: string;
  catPhotoId: string;
  catPhotoUrl?: string;
  channelMessageId?: number;
}

export interface Listing {
  id?: string;
  ownerTgId: number;
  profileId: string;
  name: string;
  city: string;
  country: string;
  catPhotoId: string;
  catPhotoUrl?: string;
  apartmentDescription: string;
  apartmentPhotoId: string;
  apartmentPhotoUrl?: string;
  dates: string;
  conditions: string;
  preferredDestinations: string;
  channelMessageId?: number;
}

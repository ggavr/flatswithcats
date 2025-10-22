export interface Profile {
  tgId: number;
  name: string;
  city: string;
  country: string;
  intro: string;
  catName: string;
  catPhotoId: string;
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
  apartmentDescription: string;
  apartmentPhotoId: string;
  dates: string;
  conditions: string;
  preferredDestinations: string;
  channelMessageId?: number;
}

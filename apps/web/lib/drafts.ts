// Draft management using localStorage

import type { ListingFormValue } from '../components/listing/ListingForm';

const DRAFT_KEY = 'fwc_listing_draft';
const DRAFT_TIMESTAMP_KEY = 'fwc_listing_draft_timestamp';
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface ListingDraft {
  data: ListingFormValue;
  timestamp: number;
}

export const draftStorage = {
  save(draft: ListingFormValue): void {
    try {
      const timestamp = Date.now();
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      localStorage.setItem(DRAFT_TIMESTAMP_KEY, timestamp.toString());
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  },

  load(): ListingFormValue | null {
    try {
      const data = localStorage.getItem(DRAFT_KEY);
      const timestamp = localStorage.getItem(DRAFT_TIMESTAMP_KEY);
      
      if (!data || !timestamp) {
        return null;
      }

      const age = Date.now() - Number.parseInt(timestamp, 10);
      if (age > DRAFT_TTL_MS) {
        this.clear();
        return null;
      }

      return JSON.parse(data) as ListingFormValue;
    } catch (error) {
      console.error('Failed to load draft:', error);
      return null;
    }
  },

  clear(): void {
    try {
      localStorage.removeItem(DRAFT_KEY);
      localStorage.removeItem(DRAFT_TIMESTAMP_KEY);
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
  },

  hasValidDraft(): boolean {
    try {
      const timestamp = localStorage.getItem(DRAFT_TIMESTAMP_KEY);
      if (!timestamp) return false;
      
      const age = Date.now() - Number.parseInt(timestamp, 10);
      return age <= DRAFT_TTL_MS;
    } catch {
      return false;
    }
  }
};


// Simple event tracking system
// Can be extended to integrate with analytics services (Google Analytics, Mixpanel, etc.)

type EventName =
  | 'profile_save'
  | 'profile_publish'
  | 'listing_preview'
  | 'listing_publish'
  | 'listing_delete'
  | 'photo_upload'
  | 'draft_save'
  | 'draft_load'
  | 'session_start'
  | 'error_occurred';

interface EventProperties {
  [key: string]: string | number | boolean | undefined;
}

class Analytics {
  private enabled: boolean;
  private events: Array<{ name: EventName; properties?: EventProperties; timestamp: number }> = [];

  constructor() {
    this.enabled = typeof window !== 'undefined' && !window.location.hostname.includes('localhost');
  }

  track(eventName: EventName, properties?: EventProperties): void {
    if (!this.enabled) {
      console.log(`[Analytics] ${eventName}`, properties);
      return;
    }

    const event = {
      name: eventName,
      properties,
      timestamp: Date.now()
    };

    this.events.push(event);

    // Keep only last 100 events
    if (this.events.length > 100) {
      this.events.shift();
    }

    // Log to console for debugging
    console.log(`[Analytics] ${eventName}`, properties);

    // NOTE: Do NOT use window.Telegram.WebApp.sendData() here!
    // sendData() immediately closes the Mini App after sending data,
    // which would break UX. Instead, store events locally and send
    // them in batches through your own API endpoint or cloudStorage.

    // Here you can add integration with external analytics services
    // Example: Google Analytics
    // if (window.gtag) {
    //   window.gtag('event', eventName, properties);
    // }

    // Example: Mixpanel
    // if (window.mixpanel) {
    //   window.mixpanel.track(eventName, properties);
    // }

    // Future: Send batched events to backend
    // this.sendBatchIfNeeded();
  }

  getEvents(): Array<{ name: EventName; properties?: EventProperties; timestamp: number }> {
    return [...this.events];
  }

  clearEvents(): void {
    this.events = [];
  }
}

export const analytics = new Analytics();

// Convenience functions
export const trackProfileSave = (success: boolean) => {
  analytics.track('profile_save', { success });
};

export const trackProfilePublish = (success: boolean) => {
  analytics.track('profile_publish', { success });
};

export const trackListingPreview = () => {
  analytics.track('listing_preview');
};

export const trackListingPublish = (success: boolean) => {
  analytics.track('listing_publish', { success });
};

export const trackListingDelete = (listingId: string) => {
  analytics.track('listing_delete', { listingId });
};

export const trackPhotoUpload = (target: 'profile' | 'listing', success: boolean) => {
  analytics.track('photo_upload', { target, success });
};

export const trackDraftSave = () => {
  analytics.track('draft_save');
};

export const trackDraftLoad = (hasData: boolean) => {
  analytics.track('draft_load', { hasData });
};

export const trackSessionStart = () => {
  analytics.track('session_start');
};

export const trackError = (errorType: string, message: string) => {
  analytics.track('error_occurred', { errorType, message });
};


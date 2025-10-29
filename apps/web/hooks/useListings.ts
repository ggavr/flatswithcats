import { useCallback, useEffect, useState } from 'react';
import { api } from '@lib/api';
import type { ListingsIndexItem } from '@lib/types';

interface UseListingsResult {
  listings: ListingsIndexItem[];
  loading: boolean;
  error: string | null;
  reload: (options?: { silent?: boolean }) => Promise<void>;
}

export const useListings = (sessionReady: boolean): UseListingsResult => {
  const [listings, setListings] = useState<ListingsIndexItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async (options?: { silent?: boolean }) => {
    if (!sessionReady) return;
    
    if (!options?.silent) {
      setLoading(true);
    }
    setError(null);

    try {
      const { listings: data } = await api.fetchListings();
      setListings(data);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Не удалось получить список объявлений.';
      setError(message);
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, [sessionReady]);

  useEffect(() => {
    if (sessionReady) {
      void reload();
    }
  }, [sessionReady, reload]);

  return {
    listings,
    loading,
    error,
    reload
  };
};


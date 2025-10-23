import type { Logger } from './logger';
import { log } from './logger';

interface CacheEntry<V> {
  value: V;
  expiresAt: number;
}

export interface Cache<K, V> {
  get: (key: K) => V | null;
  set: (key: K, value: V) => void;
  delete: (key: K) => void;
  clear: () => void;
}

interface CacheOptions {
  ttlMs: number;
  maxSize?: number;
  logContext?: string;
}

export const createCache = <K, V>(options: CacheOptions): Cache<K, V> => {
  const { ttlMs, maxSize = 1000, logContext } = options;
  const store = new Map<K, CacheEntry<V>>();
  const cacheLog: Logger = log.withContext({ scope: 'cache', context: logContext });

  const evictIfNeeded = () => {
    if (store.size <= maxSize) return;
    const overflow = store.size - maxSize;
    let removed = 0;
    for (const key of store.keys()) {
      store.delete(key);
      removed += 1;
      if (removed >= overflow) break;
    }
    cacheLog.warn?.(`Evicted ${removed} cache entries due to size limit`);
  };

  const get = (key: K): V | null => {
    const entry = store.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      store.delete(key);
      return null;
    }
    return entry.value;
  };

  const set = (key: K, value: V) => {
    store.set(key, { value, expiresAt: Date.now() + ttlMs });
    evictIfNeeded();
  };

  const del = (key: K) => {
    store.delete(key);
  };

  const clear = () => {
    store.clear();
  };

  return {
    get,
    set,
    delete: del,
    clear
  };
};

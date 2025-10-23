import { Forbidden } from '../../core/errors';

const INIT_DATA_TTL_MS = 5 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 1000;
const MAX_ENTRIES = 25_000;

const usedInitData = new Map<string, number>();
let lastCleanupAt = 0;

const buildKey = (userId: number, hash: string) => `${userId}:${hash}`;

const prune = (now: number) => {
  if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) return;
  lastCleanupAt = now;

  for (const [key, timestamp] of usedInitData) {
    if (now - timestamp > INIT_DATA_TTL_MS) {
      usedInitData.delete(key);
    }
  }

  if (usedInitData.size <= MAX_ENTRIES) return;
  const overflow = usedInitData.size - MAX_ENTRIES;
  let removed = 0;
  for (const key of usedInitData.keys()) {
    usedInitData.delete(key);
    removed += 1;
    if (removed >= overflow) break;
  }
};

export const consumeInitDataReplay = ({ userId, hash }: { userId: number; hash: string }) => {
  if (!hash) return;
  const now = Date.now();
  prune(now);
  const key = buildKey(userId, hash);
  const lastSeen = usedInitData.get(key);
  if (lastSeen && now - lastSeen < INIT_DATA_TTL_MS) {
    throw new Forbidden('Telegram init data has already been used. Request a new session.');
  }
  usedInitData.set(key, now);
};

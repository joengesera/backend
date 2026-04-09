import { logger } from '../utils/logger';

export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  invalidate(key: string): Promise<void>;
}

export class InMemoryCacheService implements CacheService {
  private cache = new Map<string, { value: any; expiry: number }>();

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttlSeconds * 1000
    });
  }

  async invalidate(key: string): Promise<void> {
    // Basic implementation: if key ends with colon, invalidate all starting with it
    if (key.endsWith(':')) {
      for (const k of this.cache.keys()) {
        if (k.startsWith(key)) this.cache.delete(k);
      }
    } else {
      this.cache.delete(key);
    }
    logger.debug({ msg: 'CACHE_INVALIDATED', key });
  }
}

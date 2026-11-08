/** Small in-memory cache with request de-duplication and "serve the old copy if the SEC fails". */
export interface CacheResult<T> {
  value: T;
  /** True when a refresh failed and an expired copy was returned instead. */
  stale: boolean;
  fetchedAt: number;
}

export interface LoaderCache<T> {
  get: (key: string, loader: () => Promise<T>) => Promise<CacheResult<T>>;
  size: () => number;
}

export function createLoaderCache<T>(opts: { ttlMs: number; maxEntries?: number; now?: () => number }): LoaderCache<T> {
  const now = opts.now ?? Date.now;
  const max = opts.maxEntries ?? 200;
  const entries = new Map<string, { value: T; fetchedAt: number }>();
  const inflight = new Map<string, Promise<CacheResult<T>>>();

  const get = (key: string, loader: () => Promise<T>): Promise<CacheResult<T>> => {
    const hit = entries.get(key);
    if (hit && now() - hit.fetchedAt < opts.ttlMs) return Promise.resolve({ ...hit, stale: false });
    const pending = inflight.get(key);
    if (pending) return pending;

    const p = (async (): Promise<CacheResult<T>> => {
      try {
        const value = await loader();
        const entry = { value, fetchedAt: now() };
        entries.delete(key);
        entries.set(key, entry);
        while (entries.size > max) entries.delete(entries.keys().next().value as string);
        return { ...entry, stale: false };
      } catch (err) {
        if (hit) return { ...hit, stale: true };
        throw err;
      } finally {
        inflight.delete(key);
      }
    })();
    inflight.set(key, p);
    return p;
  };

  return { get, size: () => entries.size };
}

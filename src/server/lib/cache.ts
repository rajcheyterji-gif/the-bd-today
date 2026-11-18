// Shared Cache API helper for public GET endpoints (articles list,
// categories, navigation, authors).
//
// Same pattern as the exchange-rates route: the payload is stored in
// caches.default as { cached_at, value }, served fresh inside the TTL,
// served stale inside TTL+SWR while a background refresh runs (via
// executionCtx.waitUntil when the runtime provides it), and re-fetched
// inline when fully expired. Cache misses and cache failures never fail
// the request — the loader just runs directly.
//
// Only ever use this for public, non-user-specific GETs. Never cache
// admin/auth endpoints, POSTs, or anything with a side effect (the
// article-detail endpoint counts a view, so it is deliberately NOT
// cached here). The cache key must be the full request URL so different
// query strings (page/limit/sort/category) get different entries.

/** Minimal Cache shape we use — avoids depending on Workers lib types. */
export type CacheLike = {
  match(req: Request | string): Promise<Response | undefined>;
  put(req: Request | string, res: Response): Promise<void>;
};

export function getDefaultCache(): CacheLike | undefined {
  try {
    const storage = (globalThis as { caches?: { default?: CacheLike } }).caches;
    return storage?.default;
  } catch {
    return undefined;
  }
}

/** executionCtx.waitUntil bound for the caller, when the runtime has one. */
export function getWaitUntil(
  c: { executionCtx?: { waitUntil?: (promise: Promise<unknown>) => void } },
): ((promise: Promise<unknown>) => void) | undefined {
  // Hono's executionCtx getter THROWS when the request has no
  // ExecutionContext (app.request in tests, non-Workers runners), so the
  // access itself must be guarded — `c.executionCtx?.` is not enough.
  let ctx: { waitUntil?: (promise: Promise<unknown>) => void } | undefined;
  try {
    ctx = c.executionCtx;
  } catch {
    return undefined;
  }
  const waitUntil = ctx?.waitUntil;
  return typeof waitUntil === "function"
    ? (promise: Promise<unknown>) => waitUntil.call(ctx, promise)
    : undefined;
}

interface Stored<T> {
  cached_at: number;
  value: T;
}

export type CacheOutcome = "fresh" | "stale" | "miss";

export async function cachedJson<T>(opts: {
  cache: CacheLike | undefined;
  key: string;
  /** Fresh-serve window. */
  ttlMs: number;
  /** Extra window in which a stale entry is served while refreshing. */
  swrMs: number;
  waitUntil?: (promise: Promise<unknown>) => void;
  load: () => Promise<T>;
}): Promise<{ value: T; fromCache: CacheOutcome }> {
  const { cache, key, ttlMs, swrMs, waitUntil, load } = opts;
  const now = Date.now();

  const readStored = async (): Promise<Stored<T> | null> => {
    if (!cache) return null;
    try {
      const hit = await cache.match(key);
      if (!hit) return null;
      const stored = (await hit.json()) as Stored<T>;
      if (!stored || typeof stored.cached_at !== "number" || !("value" in stored)) {
        return null;
      }
      return stored;
    } catch {
      return null;
    }
  };

  const store = async (value: T): Promise<void> => {
    if (!cache) return;
    try {
      await cache.put(
        key,
        new Response(JSON.stringify({ cached_at: Date.now(), value }), {
          headers: { "content-type": "application/json" },
        }),
      );
    } catch {
      // Cache write failure must not fail the request.
    }
  };

  const stored = await readStored();
  if (stored) {
    const age = now - stored.cached_at;
    if (age < ttlMs) return { value: stored.value, fromCache: "fresh" };
    if (age < ttlMs + swrMs) {
      // Stale but usable: answer now and refresh in the background when
      // the runtime allows it. Without waitUntil (tests, non-Workers
      // runners) refresh inline so the next request is fresh.
      if (waitUntil) {
        waitUntil(
          load()
            .then((value) => store(value))
            .catch((err) => console.error("background cache refresh failed", err)),
        );
        return { value: stored.value, fromCache: "stale" };
      }
      const value = await load();
      await store(value);
      return { value, fromCache: "miss" };
    }
    // Fully expired: fall through to a fresh load below.
  }

  const value = await load();
  await store(value);
  return { value, fromCache: "miss" };
}

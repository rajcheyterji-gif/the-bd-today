// Foreign-exchange rates, mounted at /api/v1:
//   GET  /exchange-rates
//
// Fetches the free, no-key ExchangeRate-API feed (base BDT), converts it
// to "BDT per 1 unit" for the eight currencies the site shows, and caches
// the derived payload in the Cache API for ~6 hours. If the upstream
// fails, a stale cached payload is served; with nothing cached at all
// the endpoint answers 503 so the client strip hides itself instead of
// showing an error. No D1/R2 access — this route never touches the DB.
import { Hono } from "hono";
import type { Env } from "../env";
import { ok } from "../lib/response";

const UPSTREAM_URL = "https://open.er-api.com/v6/latest/BDT";
const SOURCE = "open.er-api.com";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

/** Currencies shown in the footer strip, with their Bengali names. */
export const EXCHANGE_CURRENCIES: { code: string; name: string; name_en: string }[] = [
  { code: "USD", name: "মার্কিন ডলার", name_en: "US Dollar" },
  { code: "EUR", name: "ইউরো", name_en: "Euro" },
  { code: "GBP", name: "ব্রিটিশ পাউন্ড", name_en: "British Pound" },
  { code: "INR", name: "ভারতীয় রুপি", name_en: "Indian Rupee" },
  { code: "CNY", name: "চীনা ইউয়ান", name_en: "Chinese Yuan" },
  { code: "JPY", name: "জাপানি ইয়েন", name_en: "Japanese Yen" },
  { code: "SAR", name: "সৌদি রিয়াল", name_en: "Saudi Riyal" },
  { code: "AED", name: "আমিরাত দিরহাম", name_en: "UAE Dirham" },
];

export type ExchangeRateEntry = {
  code: string;
  /** Bengali currency name, e.g. "মার্কিন ডলার". */
  name: string;
  name_en: string;
  /** BDT per 1 unit of the currency, rounded to 2 decimals. */
  rate: number;
};

export type ExchangeRatesPayload = {
  base: "BDT";
  /** Upstream feed timestamp (time_last_update_utc), ISO 8601. */
  updated_at: string;
  source: string;
  rates: ExchangeRateEntry[];
};

type CachedPayload = ExchangeRatesPayload & { cached_at: number };

/** Minimal Cache shape we use — avoids depending on Workers lib types. */
type CacheLike = {
  match(req: Request | string): Promise<Response | undefined>;
  put(req: Request | string, res: Response): Promise<void>;
};

function getDefaultCache(): CacheLike | undefined {
  try {
    const storage = (globalThis as { caches?: { default?: CacheLike } }).caches;
    return storage?.default;
  } catch {
    return undefined;
  }
}

type UpstreamResponse = {
  result?: string;
  base_code?: string;
  time_last_update_utc?: string;
  rates?: Record<string, number>;
};

function isValidUpstream(body: unknown): body is UpstreamResponse {
  if (!body || typeof body !== "object") return false;
  const b = body as UpstreamResponse;
  if (b.result !== "success" || b.base_code !== "BDT") return false;
  if (!b.rates || typeof b.rates !== "object") return false;
  return EXCHANGE_CURRENCIES.every(
    (c) => typeof b.rates![c.code] === "number" && Number.isFinite(b.rates![c.code]) && b.rates![c.code] > 0,
  );
}

/** er-api quotes "units per 1 BDT"; the site shows "BDT per 1 unit". */
function toPayload(body: UpstreamResponse, cachedAt: number): CachedPayload {
  const updatedAt = body.time_last_update_utc
    ? new Date(body.time_last_update_utc).toISOString()
    : new Date(cachedAt).toISOString();
  return {
    base: "BDT",
    updated_at: updatedAt,
    source: SOURCE,
    rates: EXCHANGE_CURRENCIES.map((c) => ({
      code: c.code,
      name: c.name,
      name_en: c.name_en,
      rate: Math.round((1 / body.rates![c.code]) * 100) / 100,
    })),
    cached_at: cachedAt,
  };
}

async function readCached(cache: CacheLike, key: string): Promise<CachedPayload | null> {
  try {
    const hit = await cache.match(key);
    if (!hit) return null;
    const payload = (await hit.json()) as CachedPayload;
    if (!payload || typeof payload.cached_at !== "number" || !Array.isArray(payload.rates)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

async function fetchUpstream(): Promise<CachedPayload> {
  const res = await fetch(UPSTREAM_URL, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`upstream ${res.status}`);
  const body: unknown = await res.json();
  if (!isValidUpstream(body)) throw new Error("upstream payload invalid");
  return toPayload(body, Date.now());
}

const rates = new Hono<{ Bindings: Env }>();

rates.get("/exchange-rates", async (c) => {
  const cache = getDefaultCache();
  const key = c.req.url;

  // Fresh cache first — no upstream call at all inside the TTL.
  const cached = cache ? await readCached(cache, key) : null;
  if (cached && Date.now() - cached.cached_at < CACHE_TTL_MS) {
    const { cached_at: _cachedAt, ...payload } = cached;
    c.header("Cache-Control", "public, max-age=21600");
    return ok(c, payload);
  }

  try {
    const fresh = await fetchUpstream();
    if (cache) {
      try {
        await cache.put(
          key,
          new Response(JSON.stringify(fresh), {
            headers: { "content-type": "application/json" },
          }),
        );
      } catch {
        // Cache write failure must not fail the request.
      }
    }
    const { cached_at: _cachedAt, ...payload } = fresh;
    c.header("Cache-Control", "public, max-age=21600");
    return ok(c, payload);
  } catch (err) {
    // Upstream failed: serve a stale cached payload if we have one.
    if (cached) {
      const { cached_at: _cachedAt, ...payload } = cached;
      c.header("Cache-Control", "public, max-age=300");
      return ok(c, payload);
    }
    console.error("exchange-rates upstream failed", err);
    return c.json(
      {
        success: false,
        error: { code: "RATES_UNAVAILABLE", message: "Exchange rates are temporarily unavailable" },
      },
      503,
    );
  }
});

export default rates;

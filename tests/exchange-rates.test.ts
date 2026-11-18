// Exchange-rates endpoint tests — run with `npm test` (vitest).
// The upstream ExchangeRate-API call is mocked via global fetch, and the
// Cache API is faked in-memory where the stale/fresh cache paths matter.
// The Worker has no Cache API in this runner, so the no-cache paths are
// covered by the first three tests (caches undefined).
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/server/index";
import { createFakeEnv } from "./fake-d1";

const app = createApp();

const UPSTREAM_RATES = {
  USD: 0.0082,
  EUR: 0.0075,
  GBP: 0.0064,
  INR: 0.72,
  CNY: 0.058,
  JPY: 1.26,
  SAR: 0.0308,
  AED: 0.0301,
};

function upstreamResponse() {
  return new Response(
    JSON.stringify({
      result: "success",
      base_code: "BDT",
      time_last_update_utc: "Wed, 18 Nov 2026 00:00:02 +0000",
      rates: UPSTREAM_RATES,
    }),
    { headers: { "content-type": "application/json" } },
  );
}

async function getRates(env = createFakeEnv()) {
  return app.request("/api/v1/exchange-rates", { method: "GET" }, env);
}

/** Minimal in-memory Cache API fake: caches.default with match/put. */
function createFakeCaches() {
  const store = new Map<string, Response>();
  const keyOf = (req: Request | string) => (typeof req === "string" ? req : req.url);
  return {
    store,
    default: {
      async match(req: Request | string) {
        const hit = store.get(keyOf(req));
        return hit ? hit.clone() : undefined;
      },
      async put(req: Request | string, res: Response) {
        store.set(keyOf(req), res.clone());
      },
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GET /api/v1/exchange-rates", () => {
  it("converts upstream per-BDT rates to BDT per 1 unit", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => upstreamResponse()));
    const res = await getRates();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.base).toBe("BDT");
    expect(body.data.source).toBe("open.er-api.com");
    expect(body.data.updated_at).toBe("2026-11-18T00:00:02.000Z");
    expect(body.data.rates).toHaveLength(8);
    const byCode = new Map(body.data.rates.map((r: { code: string }) => [r.code, r]));
    expect(byCode.get("USD")).toMatchObject({ name: "মার্কিন ডলার", rate: 121.95 });
    expect(byCode.get("EUR")).toMatchObject({ rate: 133.33 });
    expect(byCode.get("JPY")).toMatchObject({ rate: 0.79 });
    expect(byCode.get("INR")).toMatchObject({ rate: 1.39 });
  });

  it("returns 503 when the upstream fails and nothing is cached", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("network down");
    }));
    const res = await getRates();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("RATES_UNAVAILABLE");
  });

  it("returns 503 when the upstream payload is invalid", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ result: "error" }), { status: 200 })),
    );
    const res = await getRates();
    expect(res.status).toBe(503);
  });

  it("serves the cached payload without calling the upstream again", async () => {
    const fakeCaches = createFakeCaches();
    vi.stubGlobal("caches", fakeCaches);
    const fetchMock = vi.fn(async () => upstreamResponse());
    vi.stubGlobal("fetch", fetchMock);

    const first = await getRates();
    expect(first.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Upstream now fails — the fresh cache must still answer.
    fetchMock.mockRejectedValue(new Error("network down"));
    const second = await getRates();
    expect(second.status).toBe(200);
    const body = await second.json();
    expect(body.data.rates).toHaveLength(8);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("serves a stale cached payload when the upstream fails", async () => {
    const fakeCaches = createFakeCaches();
    vi.stubGlobal("caches", fakeCaches);
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("network down");
    }));
    // Pre-seed a 7-hour-old cached payload (TTL is 6h).
    const stale = {
      base: "BDT",
      updated_at: "2026-11-18T00:00:02.000Z",
      source: "open.er-api.com",
      rates: [{ code: "USD", name: "মার্কিন ডলার", name_en: "US Dollar", rate: 121.95 }],
      cached_at: Date.now() - 7 * 60 * 60 * 1000,
    };
    fakeCaches.store.set(
      "http://localhost/api/v1/exchange-rates",
      new Response(JSON.stringify(stale), {
        headers: { "content-type": "application/json" },
      }),
    );
    const res = await getRates();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.rates).toHaveLength(1);
    expect(body.data.rates[0].code).toBe("USD");
  });
});

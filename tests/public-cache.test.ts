// Speed: Cache API + stale-while-revalidate on the public GET lists, and
// slim list payloads (no article body in list responses).
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/server/index";
import { cachedJson, type CacheLike } from "../src/server/lib/cache";
import { listArticles } from "../src/server/services/articles";
import { createFakeEnv } from "./fake-d1";

const app = createApp();

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
    } satisfies CacheLike,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

async function get(path: string, env = createFakeEnv()) {
  return app.request(path, { method: "GET" }, env);
}

describe("GET /api/v1/articles (cached + slim)", () => {
  it("serves a repeat request from cache and sets edge Cache-Control", async () => {
    const fakeCaches = createFakeCaches();
    vi.stubGlobal("caches", fakeCaches);

    const first = await get("/api/v1/articles?limit=12");
    expect(first.status).toBe(200);
    expect(first.headers.get("cache-control")).toBe(
      "public, max-age=60, stale-while-revalidate=300",
    );
    const firstBody = await first.json();
    expect(firstBody.data).toHaveLength(1);
    expect(firstBody.data[0].title).toBe("পরীক্ষামূলক সংবাদ");

    // The DB is now empty — a cache hit must still answer with the article.
    const second = await get("/api/v1/articles?limit=12", createFakeEnv({ articles: [] }));
    expect(second.status).toBe(200);
    const secondBody = await second.json();
    expect(secondBody.data).toHaveLength(1);
    expect(secondBody.data[0].title).toBe("পরীক্ষামূলক সংবাদ");
  });

  it("list rows are slim: excerpt present, full body and SEO fields dropped", async () => {
    const res = await get("/api/v1/articles?limit=12");
    const body = await res.json();
    expect(body.data[0].excerpt).toBe("এটি একটি পরীক্ষামূলক সংবাদের সারাংশ।");
    expect(body.data[0].content).toBe("");
    expect(body.data[0]).not.toHaveProperty("image_caption");
    expect(body.data[0]).not.toHaveProperty("seo_title");
    expect(body.pagination.total).toBe(1);
  });

  it("search is never cached and still returns slim rows", async () => {
    const res = await get("/api/v1/articles?search=%E0%A6%AA%E0%A6%B0%E0%A7%80%E0%A6%95%E0%A7%8D%E0%A6%B7%E0%A6%BE");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBeNull();
    const body = await res.json();
    expect(body.data[0].content).toBe("");
  });

  it("article detail still returns the full body (not slim)", async () => {
    const res = await get("/api/v1/articles/test-article");
    const body = await res.json();
    expect(body.data.content).toContain("পরীক্ষামূলক সংবাদের মূল অংশ");
  });
});

describe("GET /api/v1/categories and /api/v1/navigation (cached)", () => {
  it("a fresh cached categories entry is served without touching D1", async () => {
    const fakeCaches = createFakeCaches();
    vi.stubGlobal("caches", fakeCaches);
    const seeded = {
      success: true,
      data: [{ id: 99, slug: "seeded", name_bn: "সিড", name_en: "Seeded" }],
    };
    fakeCaches.store.set(
      "http://localhost/api/v1/categories",
      new Response(JSON.stringify({ cached_at: Date.now(), value: seeded }), {
        headers: { "content-type": "application/json" },
      }),
    );
    const res = await get("/api/v1/categories");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe(
      "public, max-age=300, stale-while-revalidate=600",
    );
    const body = await res.json();
    expect(body.data[0].slug).toBe("seeded");
  });

  it("a fresh cached navigation entry is served without touching D1", async () => {
    const fakeCaches = createFakeCaches();
    vi.stubGlobal("caches", fakeCaches);
    const seeded = {
      success: true,
      data: [{ id: 99, label: "Seeded", label_bn: "সিড", url: "/seeded", position: 1 }],
    };
    fakeCaches.store.set(
      "http://localhost/api/v1/navigation",
      new Response(JSON.stringify({ cached_at: Date.now(), value: seeded }), {
        headers: { "content-type": "application/json" },
      }),
    );
    const res = await get("/api/v1/navigation");
    const body = await res.json();
    expect(body.data[0].label).toBe("Seeded");
  });
});

describe("listArticles slim option (service level)", () => {
  it("slim drops the body; full keeps it; totals agree", async () => {
    const env = createFakeEnv();
    const slim = await listArticles(env.DB, { status: "published" }, { slim: true });
    expect(slim.total).toBe(1);
    expect(slim.articles[0].content).toBe("");
    expect(slim.articles[0].excerpt).toBe("এটি একটি পরীক্ষামূলক সংবাদের সারাংশ।");
    const full = await listArticles(env.DB, { status: "published" });
    expect(full.total).toBe(slim.total);
    expect(full.articles[0].content).toContain("পরীক্ষামূলক সংবাদের মূল অংশ");
  });
});

describe("cachedJson helper", () => {
  it("serves a fresh entry without calling load", async () => {
    const fakeCaches = createFakeCaches();
    const load = vi.fn(async () => "fresh-value");
    fakeCaches.store.set(
      "k",
      new Response(JSON.stringify({ cached_at: Date.now(), value: "cached-value" })),
    );
    const result = await cachedJson({
      cache: fakeCaches.default,
      key: "k",
      ttlMs: 60_000,
      swrMs: 300_000,
      load,
    });
    expect(result).toEqual({ value: "cached-value", fromCache: "fresh" });
    expect(load).not.toHaveBeenCalled();
  });

  it("serves stale while refreshing in the background when waitUntil exists", async () => {
    const fakeCaches = createFakeCaches();
    const background: Promise<unknown>[] = [];
    const load = vi.fn(async () => "fresh-value");
    fakeCaches.store.set(
      "k",
      new Response(JSON.stringify({ cached_at: Date.now() - 120_000, value: "stale-value" })),
    );
    const result = await cachedJson({
      cache: fakeCaches.default,
      key: "k",
      ttlMs: 60_000,
      swrMs: 300_000,
      waitUntil: (p) => {
        background.push(p);
      },
      load,
    });
    expect(result).toEqual({ value: "stale-value", fromCache: "stale" });
    expect(load).toHaveBeenCalledTimes(1);
    await Promise.all(background);
    const hit = await fakeCaches.default.match("k");
    const stored = (await hit?.json()) as { value: string };
    expect(stored.value).toBe("fresh-value");
  });

  it("refreshes inline when stale and no waitUntil is available", async () => {
    const fakeCaches = createFakeCaches();
    fakeCaches.store.set(
      "k",
      new Response(JSON.stringify({ cached_at: Date.now() - 120_000, value: "stale-value" })),
    );
    const result = await cachedJson({
      cache: fakeCaches.default,
      key: "k",
      ttlMs: 60_000,
      swrMs: 300_000,
      load: async () => "fresh-value",
    });
    expect(result).toEqual({ value: "fresh-value", fromCache: "miss" });
  });

  it("re-fetches when fully expired", async () => {
    const fakeCaches = createFakeCaches();
    fakeCaches.store.set(
      "k",
      new Response(JSON.stringify({ cached_at: Date.now() - 400_000, value: "old-value" })),
    );
    const result = await cachedJson({
      cache: fakeCaches.default,
      key: "k",
      ttlMs: 60_000,
      swrMs: 300_000,
      load: async () => "fresh-value",
    });
    expect(result).toEqual({ value: "fresh-value", fromCache: "miss" });
  });

  it("works with no cache at all", async () => {
    const result = await cachedJson({
      cache: undefined,
      key: "k",
      ttlMs: 60_000,
      swrMs: 300_000,
      load: async () => 42,
    });
    expect(result).toEqual({ value: 42, fromCache: "miss" });
  });
});

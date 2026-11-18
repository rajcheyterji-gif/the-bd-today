// Backend smoke tests — run with `npm test` (vitest).
// Covers the public API surface with the in-memory FakeD1 (see fake-d1.ts)
// plus the pure shared helpers the Worker depends on.
import { describe, expect, it } from "vitest";
import { createApp } from "../src/server/index";
import { publishScheduledArticles } from "../src/server/services/articles";
import {
  excerpt,
  formatDateBn,
  readingTimeMinutes,
  sanitizeHtml,
  slugify,
  toBengaliDigits,
} from "../src/shared/utils";
import { createFakeEnv } from "./fake-d1";

const app = createApp();

async function get(path: string, env = createFakeEnv()) {
  return app.request(path, { method: "GET" }, env);
}

describe("shared utils (backend additions)", () => {
  it("slugify keeps the existing behaviour (Bengali slugs preserved)", () => {
    expect(slugify("বাংলাদেশের অর্থনীতি")).toBe("বাংলাদেশের-অর্থনীতি");
    expect(slugify("Padma Bridge 2026")).toBe("padma-bridge-2026");
  });

  it("sanitizeHtml strips scripts, handlers and javascript: URLs", () => {
    const dirty =
      `<p onclick="evil()">Hello <script>alert(1)</script> ` +
      `<a href="javascript:evil()">x</a> <b>bold</b></p>`;
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain("<script");
    expect(clean).not.toContain("onclick");
    expect(clean).not.toContain("javascript:");
    expect(clean).toContain("<b>bold</b>");
    expect(clean).toContain("Hello");
  });

  it("sanitizeHtml keeps safe links and images", () => {
    const clean = sanitizeHtml(
      `<p><a href="https://example.com">link</a> <img src="/img.jpg" alt="x"></p>`,
    );
    expect(clean).toContain('href="https://example.com"');
    expect(clean).toContain('rel="noopener noreferrer"');
    expect(clean).toContain('<img src="/img.jpg" alt="x">');
  });

  it("formatDateBn renders Bengali digits and month names", () => {
    expect(toBengaliDigits(2026)).toBe("২০২৬");
    expect(formatDateBn("2026-11-18T09:00:00.000Z")).toContain("২০২৬");
  });

  it("excerpt strips HTML and truncates at a word boundary", () => {
    expect(excerpt("<p>Hello world, this is a test</p>", 10)).toBe("Hello…");
    expect(excerpt("<p>Short</p>")).toBe("Short");
  });

  it("readingTimeMinutes counts words at 200 wpm", () => {
    expect(readingTimeMinutes("word ".repeat(400))).toBe(2);
  });
});

describe("public articles API", () => {
  it("GET /api/v1/articles lists published articles with pagination", async () => {
    const res = await get("/api/v1/articles");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].slug).toBe("test-article");
    expect(body.data[0].tags).toContain("ঢাকা");
    expect(body.pagination).toEqual({ page: 1, limit: 12, total: 1, totalPages: 1 });
  });

  it("GET /api/v1/articles rejects an invalid sort", async () => {
    const res = await get("/api/v1/articles?sort=bogus");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("GET /api/v1/articles/:slug returns the article and increments views", async () => {
    const env = createFakeEnv();
    const res = await app.request("/api/v1/articles/test-article", { method: "GET" }, env);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.slug).toBe("test-article");
    expect(body.data.views).toBe(43); // 42 + the increment
    expect(Array.isArray(body.data.related)).toBe(true);
  });

  it("GET /api/v1/articles/:slug 404s for unknown slugs", async () => {
    const res = await get("/api/v1/articles/no-such-article");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("GET /api/v1/search requires q and searches published articles", async () => {
    const missing = await get("/api/v1/search");
    expect(missing.status).toBe(400);
    const res = await get("/api/v1/search?q=%E0%A6%AA%E0%A6%B0%E0%A7%80%E0%A6%95%E0%A7%8D%E0%A6%B7%E0%A6%BE");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.pagination.total).toBe(1);
  });
});

describe("public categories / authors / navigation", () => {
  it("GET /api/v1/categories lists categories with article counts", async () => {
    const res = await get("/api/v1/categories");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.data[0].slug).toBe("bangladesh");
    expect(body.data[0].article_count).toBe(1);
  });

  it("GET /api/v1/categories/:slug returns one category or 404", async () => {
    const okRes = await get("/api/v1/categories/sports");
    expect(okRes.status).toBe(200);
    const missing = await get("/api/v1/categories/nope");
    expect(missing.status).toBe(404);
  });

  it("GET /api/v1/authors lists authors", async () => {
    const res = await get("/api/v1/authors");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("GET /api/v1/navigation returns an array", async () => {
    const res = await get("/api/v1/navigation");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });
});

describe("newsletter", () => {
  it("POST /api/v1/newsletter subscribes, then reports already_subscribed", async () => {
    const env = createFakeEnv();
    const first = await app.request(
      "/api/v1/newsletter",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "reader@example.com" }),
      },
      env,
    );
    expect(first.status).toBe(201);
    expect((await first.json()).data).toEqual({
      subscribed: true,
      already_subscribed: false,
    });
    const second = await app.request(
      "/api/v1/newsletter",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "reader@example.com" }),
      },
      env,
    );
    expect(second.status).toBe(200);
    expect((await second.json()).data.already_subscribed).toBe(true);
  });

  it("POST /api/v1/newsletter rejects an invalid email", async () => {
    const res = await app.request(
      "/api/v1/newsletter",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "not-an-email" }),
      },
      createFakeEnv(),
    );
    expect(res.status).toBe(400);
  });
});

describe("admin auth gating + SEO", () => {
  it("GET /api/v1/admin/dashboard requires a session", async () => {
    const res = await get("/api/v1/admin/dashboard");
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("UNAUTHORIZED");
  });

  it("POST /api/v1/admin/articles requires a session", async () => {
    const res = await app.request(
      "/api/v1/admin/articles",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "x", content: "y", category_id: 1 }),
      },
      createFakeEnv(),
    );
    expect(res.status).toBe(401);
  });

  it("GET /api/v1/sitemap.xml lists published articles", async () => {
    const res = await get("/api/v1/sitemap.xml");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/xml");
    const text = await res.text();
    expect(text).toContain("test-article");
    expect(text).toContain("<urlset");
  });

  it("GET /robots.txt serves the dynamic robots file", async () => {
    const res = await get("/robots.txt");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/plain");
    expect(await res.text()).toContain("Sitemap:");
  });
});

describe("scheduled publishing service", () => {
  it("publishScheduledArticles publishes due articles", async () => {
    const env = createFakeEnv();
    const count = await publishScheduledArticles(env.DB);
    expect(count).toBe(1);
  });
});

/**
 * Bot prerender tests — run with `npm test` (vitest).
 *
 * The public site is a client-rendered SPA, so crawlers used to see only
 * the empty shell. The Worker now serves search bots a complete
 * server-rendered page (src/server/lib/prerender.ts): real headlines and
 * article body text in the HTML, Bengali titles/descriptions, and
 * NewsArticle JSON-LD. Humans always get the SPA instead.
 */
import { describe, expect, it } from "vitest";
import { createApp } from "../src/server/index";
import { isBot } from "../src/server/lib/prerender";
import { pageMeta } from "../src/shared/seo";
import { createFakeEnv } from "./fake-d1";

const app = createApp();
const GOOGLEBOT = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
const CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

async function get(path: string, userAgent: string) {
  return app.request(
    path,
    { method: "GET", headers: { "user-agent": userAgent } },
    createFakeEnv(),
  );
}

describe("isBot", () => {
  it("recognises Googlebot, Bingbot and social scrapers", () => {
    expect(isBot(GOOGLEBOT)).toBe(true);
    expect(isBot("Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)")).toBe(true);
    expect(isBot("facebookexternalhit/1.1")).toBe(true);
    expect(isBot("Twitterbot/1.0")).toBe(true);
  });

  it("treats real browsers (and no UA) as human", () => {
    expect(isBot(CHROME)).toBe(false);
    expect(isBot("")).toBe(false);
    expect(isBot(null)).toBe(false);
    expect(isBot(undefined)).toBe(false);
  });
});

describe("pageMeta (Bengali titles + descriptions)", () => {
  it("gives the homepage a Bengali title and description", () => {
    const meta = pageMeta("/");
    expect(meta.title).toBe("দ্য বিডি টুডে | সর্বশেষ বাংলাদেশ ও বিশ্ব সংবাদ");
    expect(meta.description).toContain("বাংলাদেশ ও বিশ্বের সর্বশেষ খবর");
  });

  it("gives every category its own Bengali title and description", () => {
    const slugs = [
      "bangladesh",
      "international",
      "politics",
      "economy",
      "sports",
      "technology",
      "entertainment",
      "education",
      "lifestyle",
    ];
    for (const slug of slugs) {
      const meta = pageMeta(`/category/${slug}`);
      expect(meta.title).toContain("দ্য বিডি টুডে");
      expect(meta.title).not.toBe(pageMeta("/").title);
      expect(meta.description.length).toBeGreaterThan(20);
    }
    expect(pageMeta("/category/bangladesh").title).toBe("বাংলাদেশের খবর | দ্য বিডি টুডে");
    expect(pageMeta("/latest").title).toBe("সর্বশেষ খবর | দ্য বিডি টুডে");
    expect(pageMeta("/breaking").title).toBe("ব্রেকিং নিউজ | দ্য বিডি টুডে");
  });

  it("falls back gracefully for an unknown category", () => {
    expect(pageMeta("/category/nope").title).toBe("বিভাগের খবর | দ্য বিডি টুডে");
  });
});

describe("bot prerendering (createApp + FakeD1)", () => {
  it("Googlebot on /article/:slug gets the full body text + NewsArticle JSON-LD", async () => {
    const res = await get("/article/test-article", GOOGLEBOT);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("পরীক্ষামূলক সংবাদের মূল অংশ");
    expect(html).toContain('"@type":"NewsArticle"');
    expect(html).toContain("<title>পরীক্ষামূলক সংবাদ | দ্য বিডি টুডে</title>");
    expect(html).toContain("/article/test-article");
  });

  it("Googlebot on / gets headlines with links in the HTML", async () => {
    const res = await get("/", GOOGLEBOT);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("পরীক্ষামূলক সংবাদ");
    expect(html).toContain("/article/test-article");
    expect(html).toContain('"@type":"ItemList"');
    expect(html).toContain("দ্য বিডি টুডে | সর্বশেষ বাংলাদেশ ও বিশ্ব সংবাদ");
  });

  it("Googlebot on /category/:slug gets the Bengali category title", async () => {
    const res = await get("/category/bangladesh", GOOGLEBOT);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("বাংলাদেশের খবর | দ্য বিডি টুডে");
    expect(html).toContain("পরীক্ষামূলক সংবাদ");
  });

  it("Googlebot on /latest gets the latest list", async () => {
    const res = await get("/latest", GOOGLEBOT);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("পরীক্ষামূলক সংবাদ");
  });

  it("a human browser never gets the prerendered body text", async () => {
    const res = await get("/article/test-article", CHROME);
    const html = await res.text();
    expect(html).not.toContain("পরীক্ষামূলক সংবাদের মূল অংশ");
  });

  it("Googlebot on an unknown article falls through (no fake prerender)", async () => {
    const res = await get("/article/no-such-article", GOOGLEBOT);
    expect(res.status).toBe(404);
  });
});

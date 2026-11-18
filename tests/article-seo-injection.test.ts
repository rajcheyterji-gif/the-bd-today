/**
 * Per-article dynamic SEO injection tests — run with `npm test` (vitest).
 *
 * Covers the non-bot path of the SPA fallback (src/server/index.ts): a
 * human browser on /article/:slug gets index.html with the article's own
 * title, OG/Twitter tags, NewsArticle JSON-LD and canonical link injected
 * from D1 — plus the Cache-Control header — while bots keep the separate
 * prerender (see tests/prerender.test.ts). The fake ASSETS binding serves
 * a shell modelled on the real dist/client/index.html head.
 *
 * The fake deliberately emulates Cloudflare's SPA `not_found_handling`
 * (wrangler.jsonc): extension-less paths answer with the shell (200),
 * exactly as production Static Assets does. A regression here (Nov 2026)
 * showed why that matters: the old fake 404'd those paths, so the tests
 * passed while production served the raw shell and the injection never
 * ran for human browsers.
 */
import { describe, expect, it } from "vitest";
import { createApp } from "../src/server/index";
import { injectSeoIntoHtml, spaArticleTagsHtml } from "../src/server/lib/seo";
import { createFakeEnv, cannedArticle, type FakeArticleRow } from "./fake-d1";

const app = createApp();
const ORIGIN = "https://test.example.com";
const CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

// Shell modelled on src/client/index.html: static Bengali title and
// homepage OG/Twitter tags that the injection must replace, not duplicate.
const SHELL_HTML = `<!doctype html>
<html lang="bn">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta
      name="description"
      content="বাংলাদেশ ও বিশ্বের সর্বশেষ খবর — রাজনীতি, অর্থনীতি, খেলাধুলা, প্রযুক্তি, বিনোদন ও শিক্ষার সব খবর সবার আগে, বাংলায়।"
    />
    <meta property="og:site_name" content="THE BD TODAY" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="দ্য বিডি টুডে | সর্বশেষ বাংলাদেশ ও বিশ্ব সংবাদ" />
    <meta
      property="og:description"
      content="বাংলাদেশ ও বিশ্বের সর্বশেষ খবর — রাজনীতি, অর্থনীতি, খেলাধুলা, প্রযুক্তি, বিনোদন ও শিক্ষার সব খবর সবার আগে, বাংলায়।"
    />
    <meta property="og:url" content="https://test.example.com/" />
    <meta property="og:image" content="https://test.example.com/og-image.jpg" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="দ্য বিডি টুডে | সর্বশেষ বাংলাদেশ ও বিশ্ব সংবাদ" />
    <meta
      name="twitter:description"
      content="বাংলাদেশ ও বিশ্বের সর্বশেষ খবর — রাজনীতি, অর্থনীতি, খেলাধুলা, প্রযুক্তি, বিনোদন ও শিক্ষার সব খবর সবার আগে, বাংলায়।"
    />
    <meta name="twitter:image" content="https://test.example.com/og-image.jpg" />
    <title>দ্য বিডি টুডে | সর্বশেষ বাংলাদেশ ও বিশ্ব সংবাদ</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/main.tsx"></script>
  </body>
</html>`;

/**
 * Fake ASSETS emulating production Static Assets with SPA
 * `not_found_handling`: the shell for /index.html and for every
 * extension-less client route (200), a real file for /logo.png,
 * 404 for anything else with an extension.
 */
function envWithShell(articles?: FakeArticleRow[]) {
  const env = createFakeEnv(articles ? { articles } : undefined);
  return {
    ...env,
    ASSETS: {
      fetch: async (input: RequestInfo | URL) => {
        const url = new URL(typeof input === "string" ? input : input.url);
        if (url.pathname === "/logo.png") {
          return new Response("fake-png-bytes", {
            status: 200,
            headers: { "content-type": "image/png" },
          });
        }
        // SPA fallback: extension-less paths serve the shell, like the
        // real `not_found_handling: "single-page-application"`.
        if (
          url.pathname === "/index.html" ||
          !/\/[^/]+\.[A-Za-z0-9]+$/.test(url.pathname)
        ) {
          return new Response(SHELL_HTML, {
            status: 200,
            headers: { "content-type": "text/html; charset=utf-8" },
          });
        }
        return new Response("not found", { status: 404 });
      },
    } as unknown as Fetcher,
  };
}

async function getArticlePage(slug: string, articles?: FakeArticleRow[]) {
  return app.request(`${ORIGIN}/article/${slug}`, {
    method: "GET",
    headers: { "user-agent": CHROME },
  }, envWithShell(articles));
}

describe("non-bot /article/:slug injection (SPA fallback)", () => {
  it("injects the article title, OG/Twitter tags, JSON-LD, canonical and Cache-Control", async () => {
    const res = await getArticlePage("test-article");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(res.headers.get("cache-control")).toBe(
      "public, max-age=60, stale-while-revalidate=300",
    );
    const html = await res.text();
    // Title replaced (article title + brand), exactly once.
    expect(html).toContain("<title>পরীক্ষামূলক সংবাদ | THE BD TODAY</title>");
    expect(html.match(/<title>/g)).toHaveLength(1);
    // Per-article OG/Twitter tags, exactly once each (static ones stripped).
    expect(html).toContain('property="og:type" content="article"');
    expect(html).toContain('property="og:title" content="পরীক্ষামূলক সংবাদ"');
    expect(html).toContain(
      'property="og:url" content="https://test.example.com/article/test-article"',
    );
    expect(html).toContain(
      'property="og:description" content="এটি একটি পরীক্ষামূলক সংবাদের সারাংশ।"',
    );
    expect(html).toContain('name="twitter:title" content="পরীক্ষামূলক সংবাদ"');
    expect(html.match(/property="og:title"/g)).toHaveLength(1);
    expect(html.match(/name="description"/g)).toHaveLength(1);
    // No featured image on the canned article -> branded share image.
    expect(html).toContain(
      'property="og:image" content="https://test.example.com/og-image.jpg"',
    );
    // Canonical points at the clean article URL.
    expect(html).toContain(
      '<link rel="canonical" href="https://test.example.com/article/test-article">',
    );
    expect(html.match(/rel="canonical"/g)).toHaveLength(1);
    // NewsArticle JSON-LD in <head> with headline, dates and author.
    expect(html).toContain('<script type="application/ld+json">');
    expect(html).toContain('"@type":"NewsArticle"');
    expect(html).toContain('"headline":"পরীক্ষামূলক সংবাদ"');
    expect(html).toContain('"datePublished":"2026-11-17T10:00:00.000Z"');
    expect(html).toContain('"name":"Admin User"');
    expect(html.indexOf("application/ld+json")).toBeLessThan(html.indexOf("</head>"));
    // The SPA shell itself survives untouched.
    expect(html).toContain('<div id="root"></div>');
    expect(html).toContain('<meta charset="utf-8" />');
    // No article body text leaks to humans (that is the bots' prerender).
    expect(html).not.toContain("পরীক্ষামূলক সংবাদের মূল অংশ");
  });

  it("absolutizes a relative R2 featured image URL in og:image / twitter:image", async () => {
    const article: FakeArticleRow = {
      ...cannedArticle(),
      featured_image_url: "/api/v1/media-file?key=media%2Ftest.jpg",
    };
    const res = await getArticlePage("test-article", [article]);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain(
      'property="og:image" content="https://test.example.com/api/v1/media-file?key=media%2Ftest.jpg"',
    );
    expect(html).toContain(
      'name="twitter:image" content="https://test.example.com/api/v1/media-file?key=media%2Ftest.jpg"',
    );
    expect(html).not.toContain('content="/api/v1/media-file');
  });

  it("unknown slug falls back to branded defaults so React shows its own 404", async () => {
    const res = await getArticlePage("no-such-article");
    expect(res.status).toBe(200);
    const html = await res.text();
    // Static shell title kept; no article title, no canonical, no JSON-LD.
    expect(html).toContain("<title>দ্য বিডি টুডে | সর্বশেষ বাংলাদেশ ও বিশ্ব সংবাদ</title>");
    expect(html).not.toContain("পরীক্ষামূলক সংবাদ");
    expect(html).not.toContain('rel="canonical"');
    expect(html).not.toContain("application/ld+json");
    // Branded defaults still injected (share preview never breaks).
    expect(html).toContain('property="og:type" content="website"');
    expect(html).toContain(
      'property="og:image" content="https://test.example.com/og-image.jpg"',
    );
  });

  it("draft article falls back to branded defaults (only published is injected)", async () => {
    const article: FakeArticleRow = { ...cannedArticle(), status: "draft" };
    const res = await getArticlePage("test-article", [article]);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).not.toContain("পরীক্ষামূলক সংবাদ");
    expect(html).not.toContain('rel="canonical"');
    expect(html).toContain('property="og:type" content="website"');
  });

  it("a real static file is served raw, never injected", async () => {
    const res = await app.request(`${ORIGIN}/logo.png`, {
      method: "GET",
      headers: { "user-agent": CHROME },
    }, envWithShell());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("image/png");
    expect(await res.text()).toBe("fake-png-bytes");
  });

  it("the homepage goes through the injection path, not the raw shell", async () => {
    const res = await app.request(`${ORIGIN}/`, {
      method: "GET",
      headers: { "user-agent": CHROME },
    }, envWithShell());
    expect(res.status).toBe(200);
    // The injected Cache-Control proves the injection path ran: the raw
    // asset branch carries no such header in this fake.
    expect(res.headers.get("cache-control")).toBe(
      "public, max-age=60, stale-while-revalidate=300",
    );
    const html = await res.text();
    expect(html).toContain("<title>দ্য বিডি টুডে | সর্বশেষ বাংলাদেশ ও বিশ্ব সংবাদ</title>");
  });
});

describe("injectSeoIntoHtml canonical", () => {
  it("inserts a single escaped canonical link before </head>", () => {
    const out = injectSeoIntoHtml(
      SHELL_HTML,
      spaArticleTagsHtml(ORIGIN, {
        id: 1,
        slug: "test-article",
        title: "পরীক্ষামূলক সংবাদ",
        excerpt: "সারাংশ।",
        content: "<p>x</p>",
        category_id: 1,
        category: { id: 1, slug: "bangladesh", name_bn: "বাংলাদেশ", name_en: "Bangladesh" },
        author_id: 1,
        author: { id: 1, name: "Admin User", role: "admin" },
        tags: [],
        status: "published",
        published_at: "2026-11-17T10:00:00.000Z",
        created_at: "2026-11-17T10:00:00.000Z",
        updated_at: "2026-11-17T10:00:00.000Z",
        views: 0,
        reading_time_minutes: 1,
      }),
      "পরীক্ষামূলক সংবাদ | THE BD TODAY",
      undefined,
      "https://test.example.com/article/test-article?x=1&y=2",
    );
    expect(out).toContain(
      '<link rel="canonical" href="https://test.example.com/article/test-article?x=1&amp;y=2">',
    );
    expect(out.match(/rel="canonical"/g)).toHaveLength(1);
    expect(out.indexOf('rel="canonical"')).toBeLessThan(out.indexOf("</head>"));
  });
});

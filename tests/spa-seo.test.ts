/**
 * SPA fallback SEO tests — run with `npm test` (vitest).
 * Verifies the server-side tag injection that link scrapers (WhatsApp /
 * Facebook / X) rely on: article pages get the article's own image, other
 * pages get the branded share image, and the static index.html tags are
 * replaced, never duplicated.
 */
import { describe, expect, it } from "vitest";
import type { Article } from "../src/shared/types";
import {
  defaultMetaTagsHtml,
  injectSeoIntoHtml,
  spaArticleTagsHtml,
} from "../src/server/lib/seo";

const SITE_URL = "https://www.thebdtoday.online";

function makeArticle(overrides: Partial<Article> = {}): Article {
  return {
    id: 1,
    slug: "padma-setu-dokkhinanchol-orthoniti",
    title: "পদ্মা সেতু ঘিরে দক্ষিণাঞ্চলে অর্থনৈতিক জাগরণ",
    excerpt: "পদ্মা সেতু ঘিরে দক্ষিণাঞ্চলে অর্থনৈতিক জাগরণ, বদলে যাচ্ছে জীবনযাত্রা।",
    content: "<p>Full body text of the article goes here.</p>",
    category_id: 2,
    category: { id: 2, slug: "bangladesh", name_bn: "বাংলাদেশ", name_en: "Bangladesh" },
    author_id: 1,
    author: { id: 1, name: "Ayesha Rahman", role: "editor" },
    tags: ["padma", "economy"],
    featured_image_url: "https://example.com/images/padma.jpg",
    status: "published",
    published_at: "2026-11-17T10:00:00.000Z",
    created_at: "2026-11-17T09:00:00.000Z",
    updated_at: "2026-11-17T12:00:00.000Z",
    views: 10,
    reading_time_minutes: 3,
    ...overrides,
  };
}

const INDEX_HTML = `<!doctype html>
<html lang="bn">
  <head>
    <meta charset="utf-8" />
    <meta
      name="description"
      content="THE BD TODAY — Bangladesh's trusted source for national, politics, economy, sports, technology and world news, in Bengali and English."
    />
    <meta property="og:site_name" content="THE BD TODAY" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="THE BD TODAY | Latest Bangladesh News" />
    <meta name="twitter:card" content="summary" />
    <title>THE BD TODAY | Latest Bangladesh News</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;

describe("defaultMetaTagsHtml", () => {
  it("points og:image and twitter:image at the branded share image", () => {
    const html = defaultMetaTagsHtml(SITE_URL, "/");
    expect(html).toContain(
      'property="og:image" content="https://www.thebdtoday.online/og-image.jpg"',
    );
    expect(html).toContain(
      'name="twitter:image" content="https://www.thebdtoday.online/og-image.jpg"',
    );
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    expect(html).toContain('property="og:image:width" content="1200"');
    expect(html).toContain('property="og:image:height" content="630"');
  });

  it("sets og:url to the requested page", () => {
    expect(defaultMetaTagsHtml(SITE_URL, "/category/bangladesh")).toContain(
      'property="og:url" content="https://www.thebdtoday.online/category/bangladesh"',
    );
  });
});

describe("spaArticleTagsHtml", () => {
  it("uses the article's featured image for og:image and twitter:image", () => {
    const html = spaArticleTagsHtml(SITE_URL, makeArticle());
    expect(html).toContain(
      'property="og:image" content="https://example.com/images/padma.jpg"',
    );
    expect(html).toContain(
      'name="twitter:image" content="https://example.com/images/padma.jpg"',
    );
    expect(html).toContain('property="og:type" content="article"');
    expect(html).toContain(
      'property="og:url" content="https://www.thebdtoday.online/article/padma-setu-dokkhinanchol-orthoniti"',
    );
  });

  it("falls back to the branded share image when the article has no image", () => {
    const html = spaArticleTagsHtml(
      SITE_URL,
      makeArticle({ featured_image_url: undefined }),
    );
    expect(html).toContain(
      'property="og:image" content="https://www.thebdtoday.online/og-image.jpg"',
    );
    expect(html).toContain(
      'name="twitter:image" content="https://www.thebdtoday.online/og-image.jpg"',
    );
  });
});

describe("injectSeoIntoHtml", () => {
  it("strips the static OG/Twitter/description tags and inserts the new ones once", () => {
    const headHtml = defaultMetaTagsHtml(SITE_URL, "/");
    const out = injectSeoIntoHtml(INDEX_HTML, headHtml);
    // Old static tags are gone (no duplicates).
    expect(out).not.toContain('name="twitter:card" content="summary"');
    expect(out.match(/property="og:title"/g)).toHaveLength(1);
    expect(out.match(/name="description"/g)).toHaveLength(1);
    // New tags are present exactly once.
    expect(out.match(/property="og:image"/g)).toHaveLength(1);
    expect(out.match(/name="twitter:image"/g)).toHaveLength(1);
    expect(out).toContain('property="og:url" content="https://www.thebdtoday.online/"');
    // Untouched head content survives.
    expect(out).toContain('<meta charset="utf-8" />');
    expect(out).toContain('<div id="root"></div>');
  });

  it("replaces the title and inserts JSON-LD before </head>", () => {
    const headHtml = spaArticleTagsHtml(SITE_URL, makeArticle());
    const jsonLd = JSON.stringify({ "@type": "NewsArticle", headline: "x" });
    const out = injectSeoIntoHtml(
      INDEX_HTML,
      headHtml,
      "পদ্মা সেতু ঘিরে দক্ষিণাঞ্চলে অর্থনৈতিক জাগরণ | THE BD TODAY",
      jsonLd,
    );
    expect(out).toContain(
      "<title>পদ্মা সেতু ঘিরে দক্ষিণাঞ্চলে অর্থনৈতিক জাগরণ | THE BD TODAY</title>",
    );
    expect(out).toContain('<script type="application/ld+json">{"@type":"NewsArticle"');
    expect(out.indexOf("application/ld+json")).toBeLessThan(out.indexOf("</head>"));
  });
});

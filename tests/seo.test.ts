/**
 * SEO helper tests — run with `npm test` (vitest).
 * Verifies OG/Twitter tags, JSON-LD and meta descriptions for articles.
 */
import { describe, expect, it } from "vitest";
import {
  articleJsonLd,
  articleMetaTags,
  metaDescription,
  renderMetaTags,
  siteJsonLd,
} from "../src/shared/seo";

const SITE_URL = "https://thebdtoday.com";

const article = {
  title: "বাংলাদেশের অর্থনীতি এগিয়ে যাচ্ছে",
  slug: "bangladesh-economy-2026",
  excerpt: "Growth continues across exports and remittances.",
  content: "Full body text of the article goes here.",
  category: "Economy",
  tags: ["economy", "exports"],
  featuredImageUrl: "https://media.thebdtoday.com/img/hero.jpg",
  authorName: "Ayesha Rahman",
  publishedAt: "2026-11-17T10:00:00.000Z",
  updatedAt: "2026-11-17T12:00:00.000Z",
};

describe("metaDescription", () => {
  it("prefers an explicit SEO description", () => {
    expect(
      metaDescription({ ...article, seoDescription: "Custom SEO text." }),
    ).toBe("Custom SEO text.");
  });

  it("falls back to the excerpt, then the content", () => {
    expect(metaDescription(article)).toBe("Growth continues across exports and remittances.");
    expect(metaDescription({ ...article, excerpt: null })).toContain("Full body text");
  });

  it("caps at 160 characters", () => {
    const long = metaDescription({ ...article, excerpt: null, content: "word ".repeat(100) });
    expect(long.length).toBeLessThanOrEqual(160);
  });
});

describe("articleMetaTags", () => {
  it("emits OG + Twitter tags with the canonical article URL", () => {
    const tags = articleMetaTags(SITE_URL, article);
    const byProp = (p: string) => tags.find((t) => t.property === p)?.content;
    const byName = (n: string) => tags.find((t) => t.name === n)?.content;
    expect(byProp("og:type")).toBe("article");
    expect(byProp("og:url")).toBe(`${SITE_URL}/article/bangladesh-economy-2026`);
    expect(byProp("og:image")).toBe(article.featuredImageUrl);
    expect(byProp("article:section")).toBe("Economy");
    expect(byProp("article:published_time")).toBe(article.publishedAt);
    expect(byName("twitter:card")).toBe("summary_large_image");
    expect(byName("description")).toBe(article.excerpt);
  });

  it("omits the image tags when there is no featured image", () => {
    const tags = articleMetaTags(SITE_URL, { ...article, featuredImageUrl: null });
    expect(tags.some((t) => t.property === "og:image")).toBe(false);
  });
});

describe("renderMetaTags", () => {
  it("renders valid meta elements and escapes attribute values", () => {
    const html = renderMetaTags([
      { property: "og:title", content: 'A "quoted" <title>' },
    ]);
    expect(html).toBe('<meta property="og:title" content="A &quot;quoted&quot; &lt;title&gt;">');
  });
});

describe("JSON-LD", () => {
  it("builds a NewsArticle object with author, dates and keywords", () => {
    const ld = articleJsonLd(SITE_URL, article);
    expect(ld["@type"]).toBe("NewsArticle");
    expect(ld.headline).toBe(article.title);
    expect(ld.datePublished).toBe(article.publishedAt);
    expect(ld.keywords).toBe("economy, exports");
    expect((ld.author as Record<string, string>).name).toBe("Ayesha Rahman");
    expect((ld.publisher as Record<string, string>).name).toBe("THE BD TODAY");
  });

  it("builds an organisation object for the homepage", () => {
    const ld = siteJsonLd(SITE_URL);
    expect(ld["@type"]).toBe("NewsMediaOrganization");
    expect(ld.url).toBe(SITE_URL);
  });
});

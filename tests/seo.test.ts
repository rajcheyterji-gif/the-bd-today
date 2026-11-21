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
import {
  googleVerificationFile,
  googleVerificationMetaTag,
} from "../src/server/lib/seo";

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
    const graph = ld["@graph"] as Record<string, unknown>[];
    const org = graph.find((n) => n["@type"] === "NewsMediaOrganization");
    expect(org).toBeDefined();
    expect(org?.url).toBe(SITE_URL);
  });

  it("includes a WebSite node with a SearchAction for the sitelinks search box", () => {
    const ld = siteJsonLd(SITE_URL);
    const graph = ld["@graph"] as Record<string, unknown>[];
    const site = graph.find((n) => n["@type"] === "WebSite");
    expect(site).toBeDefined();
    const action = site?.potentialAction as Record<string, unknown>;
    expect(action["@type"]).toBe("SearchAction");
    const target = action.target as Record<string, string>;
    expect(target.urlTemplate).toBe(
      `${SITE_URL}/search?q={search_term_string}`,
    );
  });

  it("includes the site logo in the NewsArticle publisher", () => {
    const ld = articleJsonLd(SITE_URL, article);
    const publisher = ld.publisher as Record<string, unknown>;
    const logo = publisher.logo as Record<string, string>;
    expect(logo["@type"]).toBe("ImageObject");
    expect(logo.url).toBe(`${SITE_URL}/logo.png`);
  });

  it("includes the site logo in the organisation object", () => {
    const ld = siteJsonLd(SITE_URL);
    const graph = ld["@graph"] as Record<string, unknown>[];
    const org = graph.find((n) => n["@type"] === "NewsMediaOrganization");
    const logo = org?.logo as Record<string, string>;
    expect(logo.url).toBe(`${SITE_URL}/logo.png`);
  });
});

describe("Google Search Console verification helpers", () => {
  it("recognises an HTML verification filename", () => {
    expect(googleVerificationFile("googleAbC123.html")).toBe("googleAbC123.html");
    expect(googleVerificationFile("  googleAbC123.html  ")).toBe("googleAbC123.html");
    expect(googleVerificationFile("/googleAbC123.html")).toBe("googleAbC123.html");
  });

  it("returns null for a meta token or an empty value", () => {
    expect(googleVerificationFile("AbC123token")).toBeNull();
    expect(googleVerificationFile("")).toBeNull();
    expect(googleVerificationFile()).toBeNull();
  });

  it("renders the meta tag for a token and nothing for a filename", () => {
    expect(googleVerificationMetaTag("AbC123token")).toBe(
      '<meta name="google-site-verification" content="AbC123token">',
    );
    expect(googleVerificationMetaTag("googleAbC123.html")).toBe("");
    expect(googleVerificationMetaTag()).toBe("");
  });

  it("escapes quotes in the token", () => {
    expect(googleVerificationMetaTag('a"b')).toContain("a&quot;b");
  });
});

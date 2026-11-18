/**
 * SEO helpers shared by the Worker (sitemap / RSS / JSON-LD injection)
 * and the React clients (document head tags on article pages).
 *
 * Nothing here touches the network or the DOM: callers render the
 * returned values into <meta> tags, <script type="application/ld+json">,
 * or the XML feeds in src/server/routes/seo.ts.
 */
import { absoluteUrl, truncate } from "./utils";

export type ArticleSeoInput = {
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string;
  category: string;
  tags?: string[];
  featuredImageUrl?: string | null;
  authorName?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string[] | null;
};

export type MetaTag = { name?: string; property?: string; content: string };

export const SITE_DEFAULTS = {
  name: "THE BD TODAY",
  tagline: "Bangladesh and world news, first and fastest.",
  locale: "bn_BD",
  twitterHandle: "@thebdtoday",
} as const;

/** Plain-text description for meta tags: explicit SEO text wins, else excerpt, else body. */
export function metaDescription(article: ArticleSeoInput): string {
  const source = article.seoDescription ?? article.excerpt ?? article.content;
  return truncate(source.replace(/<[^>]*>/g, " "), 160);
}

export function articleTitle(article: ArticleSeoInput): string {
  return article.seoTitle ?? article.title;
}

export function articleUrl(siteUrl: string, article: ArticleSeoInput): string {
  return absoluteUrl(siteUrl, `/article/${article.slug}`);
}

/** Open Graph + Twitter Card tags for an article page. */
export function articleMetaTags(siteUrl: string, article: ArticleSeoInput): MetaTag[] {
  const url = articleUrl(siteUrl, article);
  const title = articleTitle(article);
  const description = metaDescription(article);
  const tags: MetaTag[] = [
    { property: "og:type", content: "article" },
    { property: "og:site_name", content: SITE_DEFAULTS.name },
    { property: "og:locale", content: SITE_DEFAULTS.locale },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: url },
    { name: "description", content: description },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
  ];
  if (SITE_DEFAULTS.twitterHandle) {
    tags.push({ name: "twitter:site", content: SITE_DEFAULTS.twitterHandle });
  }
  if (article.featuredImageUrl) {
    tags.push(
      { property: "og:image", content: article.featuredImageUrl },
      { name: "twitter:image", content: article.featuredImageUrl },
    );
  }
  if (article.publishedAt) {
    tags.push({ property: "article:published_time", content: article.publishedAt });
  }
  if (article.updatedAt) {
    tags.push({ property: "article:modified_time", content: article.updatedAt });
  }
  if (article.category) {
    tags.push({ property: "article:section", content: article.category });
  }
  for (const tag of article.seoKeywords ?? article.tags ?? []) {
    tags.push({ property: "article:tag", content: tag });
  }
  return tags;
}

/** Render MetaTag[] to an HTML string for server-rendered / prerendered heads. */
export function renderMetaTags(tags: MetaTag[]): string {
  return tags
    .map((t) => {
      const attr = t.property
        ? `property="${escapeAttr(t.property)}"`
        : `name="${escapeAttr(t.name ?? "")}"`;
      return `<meta ${attr} content="${escapeAttr(t.content)}">`;
    })
    .join("\n");
}

/** Schema.org NewsArticle JSON-LD object for an article page. */
export function articleJsonLd(siteUrl: string, article: ArticleSeoInput): Record<string, unknown> {
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: articleTitle(article),
    description: metaDescription(article),
    mainEntityOfPage: { "@type": "WebPage", "@id": articleUrl(siteUrl, article) },
    articleSection: article.category,
    inLanguage: "bn",
    publisher: {
      "@type": "NewsMediaOrganization",
      name: SITE_DEFAULTS.name,
      url: siteUrl,
      // Google News / rich results want a publisher logo. /logo.jpg is the
      // site's wordmark (the header logo), served from the same origin.
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl(siteUrl, "/logo.jpg"),
      },
    },
  };
  if (article.authorName) {
    jsonLd.author = { "@type": "Person", name: article.authorName };
  }
  if (article.publishedAt) jsonLd.datePublished = article.publishedAt;
  if (article.updatedAt) jsonLd.dateModified = article.updatedAt;
  if (article.featuredImageUrl) {
    jsonLd.image = [article.featuredImageUrl];
  }
  const keywords = article.seoKeywords ?? article.tags;
  if (keywords && keywords.length > 0) jsonLd.keywords = keywords.join(", ");
  return jsonLd;
}

/** JSON-LD for the homepage / section pages (organisation + website). */
export function siteJsonLd(siteUrl: string): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "NewsMediaOrganization",
    name: SITE_DEFAULTS.name,
    url: siteUrl,
    description: SITE_DEFAULTS.tagline,
    inLanguage: "bn",
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl(siteUrl, "/logo.jpg"),
    },
  };
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

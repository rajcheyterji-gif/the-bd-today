// Server-side SEO helpers. The shared helpers in src/shared/seo.ts do the
// real work (OG/Twitter tags, NewsArticle JSON-LD); this module adapts them
// to the server's Article shape and adds the sitemap XML builder used by
// the /api/v1/sitemap.xml route (src/server/routes/seo.ts is mounted there
// too — see src/server/index.ts).
import type { Article } from "../../shared/types";
import {
  articleJsonLd,
  articleMetaTags,
  metaDescription,
  renderMetaTags,
  siteJsonLd,
  type ArticleSeoInput,
} from "../../shared/seo";

export { metaDescription, siteJsonLd };

/** Map a contract Article to the shared SEO input shape. */
export function toSeoInput(article: Article): ArticleSeoInput {
  return {
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt,
    content: article.content,
    category: article.category?.name_en ?? "",
    tags: article.tags,
    featuredImageUrl: article.featured_image_url ?? null,
    authorName: article.author?.name ?? null,
    publishedAt: article.published_at ?? null,
    updatedAt: article.updated_at ?? null,
    seoTitle: article.seo_title ?? null,
    seoDescription: article.seo_description ?? null,
  };
}

/** Schema.org NewsArticle JSON-LD object for an article page. */
export function newsArticleJsonLd(
  siteUrl: string,
  article: Article,
): Record<string, unknown> {
  return articleJsonLd(siteUrl, toSeoInput(article));
}

/** OG + Twitter Card tags for an article page, rendered as HTML. */
export function articleMetaTagsHtml(siteUrl: string, article: Article): string {
  return renderMetaTags(articleMetaTags(siteUrl, toSeoInput(article)));
}

export interface SitemapUrl {
  loc: string;
  lastmod?: string | null;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Build a sitemap.xml document from a list of URLs. */
export function buildSitemapXml(urls: SitemapUrl[]): string {
  const entries = urls.map((u) => {
    const parts = [`<loc>${xmlEscape(u.loc)}</loc>`];
    if (u.lastmod) parts.push(`<lastmod>${xmlEscape(u.lastmod)}</lastmod>`);
    if (u.changefreq) parts.push(`<changefreq>${u.changefreq}</changefreq>`);
    if (u.priority !== undefined) parts.push(`<priority>${u.priority.toFixed(1)}</priority>`);
    return `  <url>${parts.join("")}</url>`;
  });
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    entries.join("\n") +
    `\n</urlset>`
  );
}

/** Default robots.txt body (the static public/robots.txt is served by ASSETS first). */
export function defaultRobotsTxt(siteUrl: string): string {
  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    "Disallow: /api/",
    `Sitemap: ${siteUrl}/sitemap.xml`,
    "",
  ].join("\n");
}

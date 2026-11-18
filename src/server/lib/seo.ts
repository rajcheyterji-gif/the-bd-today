// Server-side SEO helpers. The shared helpers in src/shared/seo.ts do the
// real work (OG/Twitter tags, NewsArticle JSON-LD); this module adapts them
// to the server's Article shape and adds the sitemap XML builder used by
// the /api/v1/sitemap.xml route (src/server/routes/seo.ts is mounted there
// too — see src/server/index.ts).
//
// It also powers the SPA fallback's server-side tag injection
// (src/server/index.ts): link scrapers (WhatsApp / Facebook / X) never run
// JavaScript, so the Worker injects real OG/Twitter tags into index.html
// before serving it — article tags for /article/:slug, branded defaults
// everywhere else.
import type { Article } from "../../shared/types";
import {
  articleJsonLd,
  articleMetaTags,
  metaDescription,
  pageMeta,
  renderMetaTags,
  siteJsonLd,
  SITE_DEFAULTS,
  type ArticleSeoInput,
  type MetaTag,
} from "../../shared/seo";
import { absoluteUrl } from "../../shared/utils";

export { metaDescription, siteJsonLd };

/** Branded fallback share image (1200x630) served from /og-image.jpg. */
export const DEFAULT_OG_IMAGE_PATH = "/og-image.jpg";

export const DEFAULT_OG_TITLE = "THE BD TODAY | Latest Bangladesh News";
export const DEFAULT_OG_DESCRIPTION =
  "Latest Bangladesh and world news — national, politics, economy, sports, technology and more.";

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

/**
 * OG + Twitter Card tags for an article page as served by the SPA fallback.
 * Same as articleMetaTagsHtml, but an article without a featured image
 * falls back to the branded share image so a shared link never previews
 * with no image at all.
 */
export function spaArticleTagsHtml(siteUrl: string, article: Article): string {
  const tags = articleMetaTags(siteUrl, toSeoInput(article));
  if (!article.featured_image_url) {
    const image = absoluteUrl(siteUrl, DEFAULT_OG_IMAGE_PATH);
    tags.push(
      { property: "og:image", content: image },
      { name: "twitter:image", content: image },
    );
  }
  return renderMetaTags(tags);
}

/** Branded default OG/Twitter tags for non-article routes (homepage, categories, search, ...). */
export function defaultMetaTags(siteUrl: string, path: string): MetaTag[] {
  const url = absoluteUrl(siteUrl, path);
  const image = absoluteUrl(siteUrl, DEFAULT_OG_IMAGE_PATH);
  return [
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: SITE_DEFAULTS.name },
    { property: "og:locale", content: SITE_DEFAULTS.locale },
    { property: "og:title", content: DEFAULT_OG_TITLE },
    { property: "og:description", content: DEFAULT_OG_DESCRIPTION },
    { property: "og:url", content: url },
    { property: "og:image", content: image },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: "THE BD TODAY" },
    { name: "description", content: DEFAULT_OG_DESCRIPTION },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:site", content: SITE_DEFAULTS.twitterHandle },
    { name: "twitter:title", content: DEFAULT_OG_TITLE },
    { name: "twitter:description", content: DEFAULT_OG_DESCRIPTION },
    { name: "twitter:image", content: image },
  ];
}

/** Default tags rendered as HTML (see defaultMetaTags). */
export function defaultMetaTagsHtml(siteUrl: string, path: string): string {
  return renderMetaTags(defaultMetaTags(siteUrl, path));
}

/**
 * Bengali OG/Twitter tags for home, category, latest and breaking pages
 * (from the shared pageMeta map in src/shared/seo.ts). Use these — not
 * the English defaultMetaTags — for every non-article route, so Google
 * and link scrapers see the same Bengali title + description as the
 * <title> and meta description on the page.
 */
export function pageMetaTags(siteUrl: string, path: string): MetaTag[] {
  const meta = pageMeta(path);
  const url = absoluteUrl(siteUrl, path);
  const image = absoluteUrl(siteUrl, DEFAULT_OG_IMAGE_PATH);
  return [
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: SITE_DEFAULTS.name },
    { property: "og:locale", content: SITE_DEFAULTS.locale },
    { property: "og:title", content: meta.title },
    { property: "og:description", content: meta.description },
    { property: "og:url", content: url },
    { property: "og:image", content: image },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: "THE BD TODAY" },
    { name: "description", content: meta.description },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:site", content: SITE_DEFAULTS.twitterHandle },
    { name: "twitter:title", content: meta.title },
    { name: "twitter:description", content: meta.description },
    { name: "twitter:image", content: image },
  ];
}

/** Bengali page tags rendered as HTML (see pageMetaTags). */
export function pageMetaTagsHtml(siteUrl: string, path: string): string {
  return renderMetaTags(pageMetaTags(siteUrl, path));
}

/**
 * Inject server-side SEO tags into a copy of index.html.
 *
 * - Strips the static og:/twitter:/description meta tags (the client-side
 *   Seo.tsx re-upserts its own after load, so removing them here only
 *   affects the first paint / scrapers).
 * - Replaces <title> when a title is given.
 * - Inserts a <link rel="canonical"> when a canonical URL is given.
 * - Inserts the new tags (and an optional JSON-LD script) before </head>.
 * If there is no </head>, the tags are appended at the end.
 */
export function injectSeoIntoHtml(
  html: string,
  headHtml: string,
  title?: string,
  jsonLd?: string,
  canonical?: string,
): string {
  const STRIP_META_RE =
    /<meta[^>]+(?:property="og:[^"]+"|name="twitter:[^"]+"|name="description")[^>]*>\s*/g;
  let out = html.replace(STRIP_META_RE, "");
  if (title !== undefined) {
    out = out.replace(
      /<title>[^<]*<\/title>/,
      `<title>${escapeHtml(title)}</title>`,
    );
  }
  const parts = [headHtml];
  if (canonical !== undefined) {
    parts.unshift(`<link rel="canonical" href="${escapeAttr(canonical)}">`);
  }
  const insert =
    jsonLd !== undefined
      ? `${parts.join("\n")}\n<script type="application/ld+json">${jsonLd}</script>`
      : parts.join("\n");
  if (out.includes("</head>")) {
    return out.replace("</head>", `${insert}\n</head>`);
  }
  return `${out}\n${insert}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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
    `Sitemap: ${siteUrl}/news-sitemap.xml`,
    "",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Google Search Console verification (see GOOGLE-SETUP.md).
//
// GOOGLE_SITE_VERIFICATION holds whatever Search Console gives you:
//   - an HTML verification filename, e.g. "googleAbC123dEf.html" — the
//     Worker serves it at /googleAbC123dEf.html with the exact body Google
//     expects (handled in src/server/index.ts), or
//   - a meta-tag token (a long string, no ".html") — rendered as
//     <meta name="google-site-verification"> on every page the Worker
//     serves (also handled in src/server/index.ts).
// Unset (or empty) means "not verified yet": both helpers return nothing.
/** The verification filename to serve, or null when the value is not a file. */
export function googleVerificationFile(value?: string): string | null {
  const v = (value ?? "").trim().replace(/^\/+/, "");
  if (!v) return null;
  return /\.html$/i.test(v) ? v : null;
}

/** The <meta name="google-site-verification"> tag, or "" when not applicable. */
export function googleVerificationMetaTag(value?: string): string {
  const v = (value ?? "").trim();
  if (!v || /\.html$/i.test(v)) return "";
  return `<meta name="google-site-verification" content="${escapeAttr(v)}">`;
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

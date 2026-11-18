/**
 * Bot-aware prerendering for search engines (Cloudflare Workers).
 *
 * The public site is a client-rendered SPA: a normal visitor gets
 * index.html + the JS bundle, but crawlers (Googlebot, Bingbot, link
 * scrapers) never run that JavaScript, so they used to see only the
 * shell — no headlines, no article text. The Worker already injected
 * per-page meta tags for scrapers (see src/server/index.ts); this
 * module goes one step further for real search bots: it serves them a
 * complete server-rendered HTML page built from D1, with the actual
 * headlines and article body in the markup.
 *
 * Humans are NEVER served this HTML — they always get the SPA, so the
 * design (white background, navy text, red accent) is untouched. The
 * prerendered page is plain semantic HTML with minimal inline styling,
 * only for crawlers. No React SSR, no Node APIs, no extra dependency:
 * the Worker just queries D1 and strings together HTML.
 *
 * Routes covered: / (home), /article/:slug, /category/:slug, /latest,
 * /breaking. Anything else (including /admin and /api/*) falls through
 * to the normal SPA/API handling. A bot asking for an unknown article
 * or category also falls through instead of getting a 404 page.
 */
import type { Article } from "../../shared/types";
import {
  articleJsonLd,
  articleMetaTags,
  CATEGORY_PAGE_META,
  metaDescription,
  pageMeta,
  renderMetaTags,
  siteJsonLd,
  SITE_DEFAULTS,
} from "../../shared/seo";
import { absoluteUrl } from "../../shared/utils";
import { sanitizeHtml } from "../../shared/utils";
import { getArticleBySlug, getRelatedArticles, listArticles } from "../services/articles";
import { toSeoInput } from "./seo";

/** Search-engine and social crawlers. Anything else is treated as a human browser. */
const BOT_UA_RE =
  /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegrambot|discordbot|applebot|petalbot|sogou|exabot|facebot|ia_archiver|semrushbot|ahrefsbot/i;

export function isBot(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return BOT_UA_RE.test(userAgent);
}

export interface PrerenderResult {
  status: number;
  html: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/'/g, "&#39;");
}

/** Minimal inline styling for the bot-only page (humans never see this). */
const PRERENDER_CSS = [
  "body{font-family:system-ui,sans-serif;max-width:720px;margin:0 auto;padding:16px;color:#0f172a;background:#fff;line-height:1.7}",
  "a{color:#c1121f}",
  "header{border-bottom:4px solid #c1121f;padding-bottom:8px;margin-bottom:16px}",
  "header a{font-size:24px;font-weight:900;color:#0f172a;text-decoration:none}",
  "nav a{margin-right:12px}",
  "article{margin-bottom:24px}",
  "img{max-width:100%;height:auto}",
  "footer{border-top:1px solid #e5e7eb;margin-top:32px;padding-top:12px;color:#64748b;font-size:14px}",
].join("\n");

function navHtml(): string {
  const links = Object.entries(CATEGORY_PAGE_META)
    .map(
      ([slug, meta]) =>
        `<a href="/category/${escapeAttr(slug)}">${escapeHtml(meta.nameBn ?? slug)}</a>`,
    )
    .join("");
  return `<nav><a href="/">সর্বশেষ</a>${links}<a href="/breaking">ব্রেকিং</a></nav>`;
}

function pageShell(args: {
  origin: string;
  title: string;
  description: string;
  canonical: string;
  headTags: string;
  jsonLdScripts: string[];
  body: string;
}): string {
  const jsonLd = args.jsonLdScripts
    .map((s) => `<script type="application/ld+json">${s}</script>`)
    .join("\n");
  return (
    `<!doctype html>\n<html lang="bn">\n<head>\n` +
    `<meta charset="utf-8">\n` +
    `<meta name="viewport" content="width=device-width, initial-scale=1">\n` +
    `<title>${escapeHtml(args.title)}</title>\n` +
    `<meta name="description" content="${escapeAttr(args.description)}">\n` +
    `<link rel="canonical" href="${escapeAttr(args.canonical)}">\n` +
    `${args.headTags}\n${jsonLd}\n` +
    `<style>\n${PRERENDER_CSS}\n</style>\n</head>\n<body>\n` +
    `<header><a href="/">${escapeHtml(SITE_DEFAULTS.name)}</a>${navHtml()}</header>\n` +
    `<main>\n${args.body}\n</main>\n` +
    `<footer><p>© ${new Date().getFullYear()} ${escapeHtml(SITE_DEFAULTS.name)}</p></footer>\n` +
    `</body>\n</html>`
  );
}

function articleListHtml(articles: Article[], origin: string): string {
  return articles
    .map((a) => {
      const url = absoluteUrl(origin, `/article/${a.slug}`);
      const date = a.published_at ? a.published_at.slice(0, 10) : "";
      return (
        `<article>\n` +
        `<h2><a href="${escapeAttr(url)}">${escapeHtml(a.title)}</a></h2>\n` +
        (a.excerpt ? `<p>${escapeHtml(a.excerpt)}</p>\n` : "") +
        (date ? `<p><time datetime="${escapeAttr(a.published_at ?? "")}">${escapeHtml(date)}</time></p>\n` : "") +
        `</article>`
      );
    })
    .join("\n");
}

function itemListJsonLd(origin: string, articles: Article[]): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: articles.map((a, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absoluteUrl(origin, `/article/${a.slug}`),
      name: a.title,
    })),
  }).replace(/</g, "\\u003c");
}

async function prerenderList(
  db: D1Database,
  origin: string,
  path: string,
  categorySlug?: string,
): Promise<PrerenderResult | null> {
  const meta = pageMeta(path);
  const { articles } = await listArticles(db, {
    category: categorySlug,
    status: "published",
    page: 1,
    limit: 20,
    sort: "latest",
  });
  const canonical = absoluteUrl(origin, path);
  const headTags = renderMetaTags([
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: SITE_DEFAULTS.name },
    { property: "og:locale", content: SITE_DEFAULTS.locale },
    { property: "og:title", content: meta.title },
    { property: "og:description", content: meta.description },
    { property: "og:url", content: canonical },
    { property: "og:image", content: absoluteUrl(origin, "/og-image.jpg") },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: meta.title },
    { name: "twitter:description", content: meta.description },
    { name: "twitter:image", content: absoluteUrl(origin, "/og-image.jpg") },
  ]);
  const heading = categorySlug
    ? (CATEGORY_PAGE_META[categorySlug]?.nameBn ?? meta.title)
    : meta.title.split(" | ")[0];
  return {
    status: 200,
    html: pageShell({
      origin,
      title: meta.title,
      description: meta.description,
      canonical,
      headTags,
      jsonLdScripts: [
        JSON.stringify(siteJsonLd(origin)).replace(/</g, "\\u003c"),
        itemListJsonLd(origin, articles),
      ],
      body:
        `<h1>${escapeHtml(heading)}</h1>\n` +
        (articles.length > 0
          ? articleListHtml(articles, origin)
          : `<p>${escapeHtml("এই বিভাগে এখনো কোনো সংবাদ প্রকাশিত হয়নি।")}</p>`),
    }),
  };
}

async function prerenderArticle(
  db: D1Database,
  origin: string,
  slug: string,
): Promise<PrerenderResult | null> {
  const article = await getArticleBySlug(db, decodeURIComponent(slug), "published");
  if (!article) return null;
  const input = toSeoInput(article);
  const title = `${article.title} | দ্য বিডি টুডে`;
  const description = metaDescription(input);
  const canonical = absoluteUrl(origin, `/article/${article.slug}`);
  const headTags = renderMetaTags(articleMetaTags(origin, input));
  const jsonLd = JSON.stringify(articleJsonLd(origin, input)).replace(/</g, "\\u003c");
  let relatedHtml = "";
  try {
    const related = await getRelatedArticles(db, article, 4);
    if (related.length > 0) {
      relatedHtml =
        `<section>\n<h2>আরও পড়ুন</h2>\n<ul>\n` +
        related
          .map(
            (r) =>
              `<li><a href="${escapeAttr(absoluteUrl(origin, `/article/${r.slug}`))}">${escapeHtml(r.title)}</a></li>`,
          )
          .join("\n") +
        `\n</ul>\n</section>`;
    }
  } catch {
    // Related links are a bonus — never fail the page over them.
  }
  const byline = [
    article.author?.name,
    article.category?.name_bn,
    article.published_at ? article.published_at.slice(0, 10) : "",
  ]
    .filter(Boolean)
    .join(" • ");
  return {
    status: 200,
    html: pageShell({
      origin,
      title,
      description,
      canonical,
      headTags,
      jsonLdScripts: [jsonLd],
      body:
        `<article>\n` +
        `<h1>${escapeHtml(article.title)}</h1>\n` +
        (byline ? `<p>${escapeHtml(byline)}</p>\n` : "") +
        (article.featured_image_url
          ? `<figure><img src="${escapeAttr(article.featured_image_url)}" alt="${escapeAttr(article.title)}">` +
            (article.image_caption ? `<figcaption>${escapeHtml(article.image_caption)}</figcaption>` : "") +
            `</figure>\n`
          : "") +
        `<div>${sanitizeHtml(article.content)}</div>\n` +
        `</article>\n${relatedHtml}`,
    }),
  };
}

/**
 * Render a bot-only HTML page for a public path, or null when this
 * request should fall through to the SPA / API handling (not a bot,
 * not a prerendered route, or the article/category does not exist).
 */
export async function prerenderForPath(
  db: D1Database,
  origin: string,
  path: string,
  userAgent: string | null | undefined,
): Promise<PrerenderResult | null> {
  if (!isBot(userAgent)) return null;
  const clean = path.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  try {
    if (clean === "/" || clean === "/latest" || clean === "/breaking") {
      return await prerenderList(db, origin, clean);
    }
    const articleMatch = clean.match(/^\/article\/([^/]+)$/);
    if (articleMatch) return await prerenderArticle(db, origin, articleMatch[1]);
    const categoryMatch = clean.match(/^\/category\/([^/]+)$/);
    if (categoryMatch) {
      const row = await db
        .prepare(`SELECT id, slug, name_bn, name_en FROM categories WHERE slug = ? LIMIT 1`)
        .bind(decodeURIComponent(categoryMatch[1]))
        .first<{ id: number; slug: string; name_bn: string; name_en: string }>();
      if (!row) return null;
      return await prerenderList(db, origin, clean, row.slug);
    }
    return null;
  } catch (err) {
    // A prerender failure must never break the page: fall through to
    // the SPA, which still serves the shell + injected meta tags.
    console.error("Prerender failed", err);
    return null;
  }
}

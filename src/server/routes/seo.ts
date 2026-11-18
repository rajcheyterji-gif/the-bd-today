/**
 * SEO routes: /sitemap.xml, /robots.txt and /rss.xml.
 *
 * Mounted by src/server/index.ts under the Worker root and also under
 * /api/v1 (so /api/v1/sitemap.xml works per the shared API contract).
 *
 * Data assumptions (match the migrations in migrations/):
 *   articles: slug, title, excerpt, content, status, published_at, updated_at
 *   categories: slug, updated_at
 * Only status = 'published' articles with a published_at in the past appear.
 */
import { Hono } from "hono";
import { articleJsonLd, metaDescription } from "../../shared/seo";
import { absoluteUrl } from "../../shared/utils";

type Env = {
  DB: D1Database;
  SITE_URL?: string;
};

const seo = new Hono<{ Bindings: Env }>();

type SitemapRow = { slug: string; updated_at: string | null };
type FeedRow = {
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  category: string;
  published_at: string | null;
  updated_at: string | null;
};

function siteUrl(c: { env: Env }): string {
  return (c.env.SITE_URL ?? "https://www.thebdtoday.online").replace(/\/+$/, "");
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function xmlResponse(body: string): Response {
  return new Response(body, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}

seo.get("/sitemap.xml", async (c) => {
  const origin = siteUrl(c);
  const { results } = await c.env.DB.prepare(
    `SELECT slug, updated_at FROM articles
     WHERE status = 'published' AND published_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     ORDER BY published_at DESC LIMIT 5000`,
  ).all<SitemapRow>();
  const categories = await c.env.DB.prepare(
    `SELECT slug, updated_at FROM categories ORDER BY name ASC`,
  ).all<SitemapRow>();

  const urls: string[] = [
    `  <url><loc>${origin}/</loc><changefreq>hourly</changefreq><priority>1.0</priority></url>`,
    `  <url><loc>${origin}/latest</loc><changefreq>hourly</changefreq><priority>0.9</priority></url>`,
    `  <url><loc>${origin}/breaking</loc><changefreq>hourly</changefreq><priority>0.9</priority></url>`,
  ];
  for (const row of categories.results ?? []) {
    urls.push(
      `  <url><loc>${origin}/category/${xmlEscape(row.slug)}</loc><changefreq>daily</changefreq><priority>0.7</priority>${row.updated_at ? `<lastmod>${xmlEscape(row.updated_at)}</lastmod>` : ""}</url>`,
    );
  }
  for (const row of results ?? []) {
    urls.push(
      `  <url><loc>${origin}/article/${xmlEscape(row.slug)}</loc><changefreq>daily</changefreq><priority>0.8</priority>${row.updated_at ? `<lastmod>${xmlEscape(row.updated_at)}</lastmod>` : ""}</url>`,
    );
  }
  return xmlResponse(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`,
  );
});

seo.get("/robots.txt", (c) => {
  const origin = siteUrl(c);
  return new Response(
    [
      "User-agent: *",
      "Allow: /",
      "Disallow: /admin",
      "Disallow: /api/",
      `Sitemap: ${origin}/sitemap.xml`,
      `Sitemap: ${origin}/news-sitemap.xml`,
      "",
    ].join("\n"),
    {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "public, max-age=86400",
      },
    },
  );
});

/**
 * Google News sitemap — /news-sitemap.xml (alias /sitemap-news.xml).
 *
 * Google only accepts articles published in the last 48 hours in a News
 * sitemap, so the query filters published_at to the last 2 days (using an
 * ISO-formatted cutoff so the string comparison is exact) and caps at
 * 1000 URLs. Submit this URL in Google Publisher Center (NOT in Search
 * Console — Search Console takes the regular sitemap.xml). When no article
 * is fresh enough the sitemap is valid but empty, which is expected
 * between publishing days; publish regularly to keep it populated.
 */
type NewsRow = { slug: string; title: string; published_at: string | null };

async function newsSitemap(c: { env: Env }): Promise<Response> {
  const origin = siteUrl(c);
  const { results } = await c.env.DB.prepare(
    `SELECT slug, title, published_at FROM articles
     WHERE status = 'published'
       AND published_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
       AND published_at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-2 days')
     ORDER BY published_at DESC LIMIT 1000`,
  ).all<NewsRow>();

  const entries = (results ?? []).map((row) => {
    const pubDate = row.published_at ?? new Date().toISOString();
    return [
      "  <url>",
      `    <loc>${origin}/article/${xmlEscape(row.slug)}</loc>`,
      "    <news:news>",
      "      <news:publication>",
      "        <news:name>THE BD TODAY</news:name>",
      "        <news:language>bn</news:language>",
      "      </news:publication>",
      `      <news:publication_date>${xmlEscape(pubDate)}</news:publication_date>`,
      `      <news:title>${xmlEscape(row.title)}</news:title>`,
      "    </news:news>",
      "  </url>",
    ].join("\n");
  });

  return xmlResponse(
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n` +
      entries.join("\n") +
      (entries.length > 0 ? "\n" : "") +
      `</urlset>`,
  );
}

seo.get("/news-sitemap.xml", newsSitemap);
seo.get("/sitemap-news.xml", newsSitemap);

seo.get("/rss.xml", async (c) => {
  const origin = siteUrl(c);
  const { results } = await c.env.DB.prepare(
    `SELECT slug, title, excerpt, content, category, published_at, updated_at
     FROM articles
     WHERE status = 'published' AND published_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     ORDER BY published_at DESC LIMIT 50`,
  ).all<FeedRow>();

  const items = (results ?? []).map((row) => {
    const link = absoluteUrl(origin, `/article/${row.slug}`);
    const pubDate = row.published_at
      ? new Date(row.published_at).toUTCString()
      : new Date().toUTCString();
    return [
      "    <item>",
      `      <title>${xmlEscape(row.title)}</title>`,
      `      <link>${xmlEscape(link)}</link>`,
      `      <guid isPermaLink="true">${xmlEscape(link)}</guid>`,
      `      <description>${xmlEscape(metaDescription({ ...row, tags: [] }))}</description>`,
      `      <category>${xmlEscape(row.category)}</category>`,
      `      <pubDate>${pubDate}</pubDate>`,
      "    </item>",
    ].join("\n");
  });

  return xmlResponse(
    [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
      "  <channel>",
      "    <title>THE BD TODAY</title>",
      `    <link>${origin}/</link>`,
      "    <description>Bangladesh and world news, first and fastest.</description>",
      "    <language>bn</language>",
      `    <atom:link href="${origin}/rss.xml" rel="self" type="application/rss+xml" />`,
      ...items,
      "  </channel>",
      "</rss>",
    ].join("\n"),
  );
});

// JSON-LD for a single article, e.g. for prerendered article pages.
// GET /seo/article/:slug.jsonld — the client inlines this in the page head.
seo.get("/seo/article/:slug.jsonld", async (c) => {
  const origin = siteUrl(c);
  const row = await c.env.DB.prepare(
    `SELECT slug, title, excerpt, content, category, published_at, updated_at
     FROM articles WHERE slug = ? AND status = 'published' LIMIT 1`,
  )
    .bind(c.req.param("slug"))
    .first<FeedRow>();
  if (!row) return c.json({ success: false, error: { code: "NOT_FOUND", message: "Article not found" } }, 404);
  return c.json(articleJsonLd(origin, row));
});

export default seo;

// THE BD TODAY — Cloudflare Worker entry point (Hono).
//
// Mounts the API under /api/v1, the SEO routes (sitemap / robots / RSS)
// at the root AND under /api/v1 (contract: GET /api/v1/sitemap.xml), and
// serves the Vite-built SPA from ASSETS for every other route.
// The scheduled() handler runs the nightly cron (see wrangler.jsonc):
// publish due scheduled articles + prune expired sessions.
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import type { Env, AppVariables } from "./env";
import { errorCodeForStatus, fail } from "./lib/response";
import { HttpError } from "./lib/errors";
import { publishScheduledArticles, getArticleBySlug } from "./services/articles";
import { pruneExpiredSessions } from "./services/auth";
import {
  defaultMetaTagsHtml,
  googleVerificationFile,
  googleVerificationMetaTag,
  injectSeoIntoHtml,
  newsArticleJsonLd,
  siteJsonLd,
  spaArticleTagsHtml,
  toSeoInput,
} from "./lib/seo";
import { articleTitle } from "../shared/seo";
import type { Article } from "../shared/types";
import authRoutes from "./routes/auth";
import articleRoutes from "./routes/articles";
import categoryRoutes from "./routes/categories";
import adminRoutes from "./routes/admin";
import mediaRoutes from "./routes/media";
import publicRoutes from "./routes/public";
import seoRoutes from "./routes/seo";

export function createApp(): Hono<{ Bindings: Env; Variables: AppVariables }> {
  const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();

  // Security headers on every response.
  app.use(async (c, next) => {
    await next();
    c.header("X-Content-Type-Options", "nosniff");
    c.header("X-Frame-Options", "DENY");
    c.header("Referrer-Policy", "strict-origin-when-cross-origin");
    c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    c.header("Cross-Origin-Opener-Policy", "same-origin");
    if (c.req.path.startsWith("/api/")) {
      c.header("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
    }
  });

  // CORS: reflect the request origin (credentials are used for the admin
  // session cookie); public GETs also work with no Origin header.
  app.use(
    "/api/*",
    cors({
      origin: (origin) => origin || "*",
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
      credentials: true,
      maxAge: 86400,
    }),
  );

  // API routes.
  app.route("/api/v1/auth", authRoutes);
  app.route("/api/v1/articles", articleRoutes);
  app.route("/api/v1/categories", categoryRoutes);
  app.route("/api/v1/admin", adminRoutes);
  app.route("/api/v1/admin/media", mediaRoutes);
  app.route("/api/v1", publicRoutes);

  // SEO routes at the root (/sitemap.xml, /robots.txt, /rss.xml) and under
  // the API prefix (/api/v1/sitemap.xml per the shared contract).
  app.route("/", seoRoutes);
  app.route("/api/v1", seoRoutes);

  // SPA fallback: static assets first, then index.html for client routes.
  // Link scrapers (WhatsApp / Facebook / X) never run JavaScript, so the
  // server injects real Open Graph / Twitter tags into index.html before
  // serving it: per-article tags for /article/:slug (loaded from D1), and
  // branded defaults (logo share image + page URL) everywhere else.
  // The origin comes from the request itself — wrangler SITE_URL may lag
  // behind the live custom domain, and the origin serving this page is
  // always where the preview image resolves.
  app.all("*", async (c) => {
    const path = c.req.path;
    if (path.startsWith("/api/")) {
      return fail(c, 404, "NOT_FOUND", "Route not found");
    }
    // Google Search Console HTML-file verification: /googleAbC123.html is
    // served from the GOOGLE_SITE_VERIFICATION secret (see GOOGLE-SETUP.md).
    // The file body is exactly what Google expects to find there.
    const verificationFile = googleVerificationFile(c.env.GOOGLE_SITE_VERIFICATION);
    if (verificationFile && path === `/${verificationFile}`) {
      return c.text(`google-site-verification: ${verificationFile}`, 200, {
        "content-type": "text/html; charset=utf-8",
      });
    }
    try {
      const asset = await c.env.ASSETS.fetch(c.req.raw);
      if (asset.status !== 404) {
        // The homepage ("/") is served straight from ASSETS as index.html,
        // so the meta-tag verification method has to be injected here too —
        // Search Console checks the homepage for the meta tag.
        const verificationMeta = googleVerificationMetaTag(
          c.env.GOOGLE_SITE_VERIFICATION,
        );
        const contentType = asset.headers.get("content-type") ?? "";
        if (verificationMeta && contentType.includes("text/html")) {
          const html = await asset.text();
          const injected = html.includes("</head>")
            ? html.replace("</head>", `${verificationMeta}\n</head>`)
            : `${verificationMeta}\n${html}`;
          // Drop the stale content-length: the rewritten body is longer
          // than the original asset, and a wrong length would truncate it.
          const headers = new Headers(asset.headers);
          headers.delete("content-length");
          return new Response(injected, {
            status: asset.status,
            headers,
          });
        }
        return asset;
      }
      const index = await c.env.ASSETS.fetch(
        new Request(new URL("/index.html", c.req.url)),
      );
      if (index.status !== 404) {
        const origin = new URL(c.req.url).origin;
        const articleMatch = path.match(/^\/article\/([^/?#]+)/);
        let title: string | undefined;
        let headHtml: string;
        let jsonLd: string | undefined;
        if (articleMatch) {
          let article: Article | null = null;
          try {
            article = await getArticleBySlug(
              c.env.DB,
              decodeURIComponent(articleMatch[1]),
              "published",
            );
          } catch (err) {
            // Never fail the page over a preview lookup: fall through to
            // the branded defaults below.
            console.error("SPA SEO article lookup failed", err);
          }
          if (article) {
            headHtml = spaArticleTagsHtml(origin, article);
            title = `${articleTitle(toSeoInput(article))} | THE BD TODAY`;
            jsonLd = JSON.stringify(newsArticleJsonLd(origin, article)).replace(
              /</g,
              "\\u003c",
            );
          } else {
            headHtml = defaultMetaTagsHtml(origin, path);
          }
        } else {
          headHtml = defaultMetaTagsHtml(origin, path);
          // Organisation schema on every non-article page (homepage,
          // categories, search, ...) so Google knows the publisher.
          jsonLd = JSON.stringify(siteJsonLd(origin)).replace(/</g, "\\u003c");
        }
        const verificationMeta = googleVerificationMetaTag(
          c.env.GOOGLE_SITE_VERIFICATION,
        );
        if (verificationMeta) headHtml = `${verificationMeta}\n${headHtml}`;
        const html = await index.text();
        const body = injectSeoIntoHtml(html, headHtml, title, jsonLd);
        return new Response(body, {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }
    } catch (err) {
      console.error("ASSETS fetch failed", err);
    }
    return c.text("Not found", 404);
  });

  app.notFound((c) => fail(c, 404, "NOT_FOUND", "Route not found"));

  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      const status = err.status;
      return fail(c, status, errorCodeForStatus(status), err.message);
    }
    if (err instanceof HttpError) {
      return fail(c, err.status, err.code, err.message, err.details);
    }
    console.error("Unhandled error", err);
    return fail(c, 500, "INTERNAL_ERROR", "Internal server error");
  });

  return app;
}

const app = createApp();

export default {
  fetch: app.fetch,
  async scheduled(
    _event: ScheduledEvent,
    env: Env,
    _ctx: ExecutionContext,
  ): Promise<void> {
    try {
      const published = await publishScheduledArticles(env.DB);
      const pruned = await pruneExpiredSessions(env.DB);
      console.log(
        `scheduled run: published ${published} article(s), pruned ${pruned} expired session(s)`,
      );
    } catch (err) {
      console.error("scheduled run failed", err);
    }
  },
};

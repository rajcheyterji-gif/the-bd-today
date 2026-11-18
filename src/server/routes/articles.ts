// Public article routes: GET /api/v1/articles, GET /api/v1/articles/:slug.
// Mounted at /api/v1/articles. The public list is published-only; the
// admin list lives in routes/admin.ts.
import { Hono } from "hono";
import type { Env } from "../env";
import type { SessionUser } from "../../shared/types";
import { ok, paginationMeta } from "../lib/response";
import { validateQuery } from "../middleware/validate";
import { getClientIp, sha256Hex } from "../middleware/auth";
import { getArticleBySlug, getRelatedArticles, incrementArticleViews, listArticles } from "../services/articles";
import { articleListQuerySchema } from "../validators/articles";
import { cachedJson, getDefaultCache, getWaitUntil } from "../lib/cache";

type ArticlesEnv = { Bindings: Env; Variables: { user: SessionUser } };

const articles = new Hono<ArticlesEnv>();

// Public list responses are Cache API-cached for 60s (stale-while-
// revalidate 300s) and edge-cached the same way, so repeat visits —
// including the homepage's 13 parallel list calls — answer from cache
// instead of hitting D1 every time. A newly published story shows up
// within about a minute. Search is never cached: it is per-query and
// low-reuse, and searchers expect fresh results.
const LIST_TTL_MS = 60_000;
const LIST_SWR_MS = 300_000;
const LIST_CACHE_CONTROL = "public, max-age=60, stale-while-revalidate=300";

articles.get("/", async (c) => {
  const query = validateQuery(c, articleListQuerySchema);
  if (query.search) {
    const { articles: items, total } = await listArticles(
      c.env.DB,
      { ...query, status: "published" },
      { slim: true },
    );
    return ok(c, items, 200, paginationMeta(total, query.page, query.limit));
  }
  const cached = await cachedJson({
    cache: getDefaultCache(),
    key: c.req.url,
    ttlMs: LIST_TTL_MS,
    swrMs: LIST_SWR_MS,
    waitUntil: getWaitUntil(c),
    load: async () => {
      const { articles: items, total } = await listArticles(
        c.env.DB,
        { ...query, status: "published" },
        { slim: true },
      );
      return {
        success: true as const,
        data: items,
        pagination: paginationMeta(total, query.page, query.limit),
      };
    },
  });
  c.header("Cache-Control", LIST_CACHE_CONTROL);
  return c.json(cached.value);
});

articles.get("/:slug", async (c) => {
  const slug = c.req.param("slug");
  const article = await getArticleBySlug(c.env.DB, slug, "published");
  if (!article) {
    return c.json(
      { success: false, error: { code: "NOT_FOUND", message: "Article not found" } },
      404,
    );
  }
  // Count the view (best-effort) and record it for daily analytics.
  const ipHash = await sha256Hex(getClientIp(c)).catch(() => null);
  await incrementArticleViews(c.env.DB, Number(article.id), ipHash);
  const related = await getRelatedArticles(c.env.DB, article, 4);
  return ok(c, { ...article, views: article.views + 1, related });
});

export default articles;

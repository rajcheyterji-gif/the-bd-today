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

type ArticlesEnv = { Bindings: Env; Variables: { user: SessionUser } };

const articles = new Hono<ArticlesEnv>();

articles.get("/", async (c) => {
  const query = validateQuery(c, articleListQuerySchema);
  const { articles: items, total } = await listArticles(c.env.DB, {
    ...query,
    status: "published",
  });
  return ok(c, items, 200, paginationMeta(total, query.page, query.limit));
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

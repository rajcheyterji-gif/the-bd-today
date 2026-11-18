// Miscellaneous public routes, mounted at /api/v1:
//   GET  /authors, GET /authors/:id, POST /newsletter, GET /search,
//   GET  /navigation, GET /media-file, POST /articles/:slug/comments
import { Hono } from "hono";
import type { Env } from "../env";
import type { SessionUser } from "../../shared/types";
import { ok, paginationMeta } from "../lib/response";
import { validateBody, validateQuery } from "../middleware/validate";
import { listArticles } from "../services/articles";
import { articleListQuerySchema, commentCreateSchema } from "../validators/articles";
import { newsletterSchema } from "../validators/categories";
import { nowIso } from "../lib/db";
import { cachedJson, getDefaultCache, getWaitUntil } from "../lib/cache";

// Slow-changing public data (authors list, navigation): cached 5 minutes
// with a 10-minute stale window, Worker Cache API + edge alike.
const SLOW_TTL_MS = 300_000;
const SLOW_SWR_MS = 600_000;
const SLOW_CACHE_CONTROL = "public, max-age=300, stale-while-revalidate=600";

type PublicEnv = { Bindings: Env; Variables: { user: SessionUser } };

const pub = new Hono<PublicEnv>();

// --- Authors ---------------------------------------------------------------

pub.get("/authors", async (c) => {
  const cached = await cachedJson({
    cache: getDefaultCache(),
    key: c.req.url,
    ttlMs: SLOW_TTL_MS,
    swrMs: SLOW_SWR_MS,
    waitUntil: getWaitUntil(c),
    load: async () => {
      const { results } = await c.env.DB.prepare(
        `SELECT u.id, u.name, u.role, u.avatar_url, u.bio,
                COUNT(a.id) AS article_count
         FROM users u
         LEFT JOIN articles a ON a.author_id = u.id AND a.status = 'published'
         GROUP BY u.id ORDER BY u.name ASC`,
      ).all<{
        id: number;
        name: string;
        role: string;
        avatar_url: string | null;
        bio: string | null;
        article_count: number;
      }>();
      return { success: true as const, data: results ?? [] };
    },
  });
  c.header("Cache-Control", SLOW_CACHE_CONTROL);
  return c.json(cached.value);
});

pub.get("/authors/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) {
    return c.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid author id" } },
      400,
    );
  }
  const author = await c.env.DB.prepare(
    `SELECT u.id, u.name, u.role, u.avatar_url, u.bio,
            COUNT(a.id) AS article_count
     FROM users u
     LEFT JOIN articles a ON a.author_id = u.id AND a.status = 'published'
     WHERE u.id = ? GROUP BY u.id LIMIT 1`,
  )
    .bind(id)
    .first<{
      id: number;
      name: string;
      role: string;
      avatar_url: string | null;
      bio: string | null;
      article_count: number;
    }>();
  if (!author) {
    return c.json(
      { success: false, error: { code: "NOT_FOUND", message: "Author not found" } },
      404,
    );
  }
  const { articles: items } = await listArticles(
    c.env.DB,
    {
      author: String(id),
      status: "published",
      page: 1,
      limit: 10,
      sort: "latest",
    },
    { slim: true },
  );
  return ok(c, { ...author, articles: items });
});

// --- Newsletter ------------------------------------------------------------

pub.post("/newsletter", async (c) => {
  const body = await validateBody(c, newsletterSchema);
  const email = body.email.trim().toLowerCase();
  const existing = await c.env.DB.prepare(
    `SELECT id, status FROM newsletter_subscribers WHERE email = ? LIMIT 1`,
  )
    .bind(email)
    .first<{ id: number; status: string }>();
  if (existing) {
    if (existing.status !== "active") {
      await c.env.DB.prepare(
        `UPDATE newsletter_subscribers SET status = 'active', subscribed_at = ? WHERE id = ?`,
      )
        .bind(nowIso(), existing.id)
        .run();
    }
    return ok(c, { subscribed: true, already_subscribed: true });
  }
  await c.env.DB.prepare(
    `INSERT INTO newsletter_subscribers (email, status, subscribed_at) VALUES (?, 'active', ?)`,
  )
    .bind(email, nowIso())
    .run();
  return ok(c, { subscribed: true, already_subscribed: false }, 201);
});

// --- Search ----------------------------------------------------------------

pub.get("/search", async (c) => {
  const q = (c.req.query("q") ?? "").trim();
  if (!q) {
    return c.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Query parameter q is required" } },
      400,
    );
  }
  const query = validateQuery(c, articleListQuerySchema);
  const { articles: items, total } = await listArticles(
    c.env.DB,
    {
      ...query,
      search: q,
      status: "published",
    },
    { slim: true },
  );
  return ok(c, items, 200, paginationMeta(total, query.page, query.limit));
});

// --- Navigation ------------------------------------------------------------

pub.get("/navigation", async (c) => {
  const cached = await cachedJson({
    cache: getDefaultCache(),
    key: c.req.url,
    ttlMs: SLOW_TTL_MS,
    swrMs: SLOW_SWR_MS,
    waitUntil: getWaitUntil(c),
    load: async () => {
      const { results } = await c.env.DB.prepare(
        `SELECT id, label, label_bn, url, position, parent_id, is_active
         FROM navigation WHERE is_active = 1 ORDER BY position ASC, id ASC`,
      ).all<{
        id: number;
        label: string;
        label_bn: string | null;
        url: string;
        position: number;
        parent_id: number | null;
        is_active: number;
      }>();
      return { success: true as const, data: results ?? [] };
    },
  });
  c.header("Cache-Control", SLOW_CACHE_CONTROL);
  return c.json(cached.value);
});

// --- Media files (R2) --------------------------------------------------------
// Uploaded images are stored in R2 and served through this route, e.g.
// /api/v1/media-file?key=media%2F2026%2F11%2F...jpg

pub.get("/media-file", async (c) => {
  const key = c.req.query("key") ?? "";
  if (!key.startsWith("media/") || key.includes("..")) {
    return c.json(
      { success: false, error: { code: "NOT_FOUND", message: "File not found" } },
      404,
    );
  }
  const object = await c.env.R2_BUCKET.get(key);
  if (!object) {
    return c.json(
      { success: false, error: { code: "NOT_FOUND", message: "File not found" } },
      404,
    );
  }
  return new Response(await object.arrayBuffer(), {
    headers: {
      "content-type": object.httpMetadata?.contentType ?? "application/octet-stream",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
});

// --- Article comments --------------------------------------------------------
// Public submission only; moderation (approve/reject) is admin-only.

pub.post("/articles/:slug/comments", async (c) => {
  const slug = c.req.param("slug");
  const body = await validateBody(c, commentCreateSchema);
  const article = await c.env.DB.prepare(
    `SELECT id FROM articles WHERE slug = ? AND status = 'published' LIMIT 1`,
  )
    .bind(slug)
    .first<{ id: number }>();
  if (!article) {
    return c.json(
      { success: false, error: { code: "NOT_FOUND", message: "Article not found" } },
      404,
    );
  }
  const result = await c.env.DB.prepare(
    `INSERT INTO comments (article_id, author_name, author_email, content, status, created_at)
     VALUES (?, ?, ?, ?, 'pending', ?)`,
  )
    .bind(article.id, body.author_name, body.author_email, body.content, nowIso())
    .run();
  return ok(
    c,
    {
      id: Number(result.meta?.last_row_id ?? 0),
      article_id: article.id,
      author_name: body.author_name,
      author_email: body.author_email,
      content: body.content,
      status: "pending",
      created_at: nowIso(),
    },
    201,
  );
});

export default pub;

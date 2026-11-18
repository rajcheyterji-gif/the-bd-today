// Admin routes, mounted at /api/v1/admin. All routes require a session;
// mutating routes additionally require the CSRF double-submit token.
// RBAC:
//   dashboard ......... any staff (admin / editor / author)
//   analytics ......... admin, editor
//   users, settings,
//   audit-logs ........ admin only
//   articles .......... admin, editor, author (authors only their own)
//   categories, tags .. admin, editor
//   comments .......... admin, editor
// Media lives in routes/media.ts (mounted at /api/v1/admin/media).
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { Env } from "../env";
import type { SessionUser } from "../../shared/types";
import { ok, paginationMeta, paginationParams } from "../lib/response";
import { validateBody, validateQuery } from "../middleware/validate";
import { csrfProtection, getClientIp, requireAuth, requireRole } from "../middleware/auth";
import { recordAuditLog } from "../services/auth";
import {
  createArticle,
  deleteArticle,
  getArticleById,
  listArticles,
  updateArticle,
  createTag,
  deleteTag,
  listTags,
  updateTag,
} from "../services/articles";
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from "../services/categories";
import { getAnalytics, getDashboardStats } from "../services/analytics";
import {
  articleCreateSchema,
  articleListQuerySchema,
  articleUpdateSchema,
  normalizeArticleInput,
} from "../validators/articles";
import {
  categoryCreateSchema,
  categoryUpdateSchema,
  commentStatusSchema,
  settingsSchema,
  tagCreateSchema,
  tagUpdateSchema,
} from "../validators/categories";

type AdminEnv = { Bindings: Env; Variables: { user: SessionUser } };

const admin = new Hono<AdminEnv>();

admin.use(requireAuth);
// CSRF for every mutating admin route (GET/HEAD/OPTIONS pass through).
admin.use(async (c, next) => {
  if (c.req.method !== "GET" && c.req.method !== "HEAD" && c.req.method !== "OPTIONS") {
    return csrfProtection(c, next);
  }
  await next();
});

async function audit(
  c: { env: Env; var: { user: SessionUser }; req: { header: (n: string) => string | undefined } },
  action: string,
  entityType: string,
  entityId: number | string,
  details?: Record<string, unknown>,
): Promise<void> {
  await recordAuditLog(c.env.DB, {
    userId: c.var.user.id,
    action,
    entityType,
    entityId,
    details,
    ip: getClientIp(c),
  });
}

/** Authors may only touch their own articles; admins/editors may touch any. */
async function assertArticleAccess(
  db: D1Database,
  user: SessionUser,
  articleId: number,
): Promise<void> {
  const article = await getArticleById(db, articleId);
  if (!article) {
    throw new HTTPException(404, { message: "Article not found" });
  }
  if (user.role === "author" && article.author_id !== user.id) {
    throw new HTTPException(403, { message: "You can only edit your own articles" });
  }
}

// --- Dashboard & analytics ---------------------------------------------------

admin.get("/dashboard", async (c) => {
  return ok(c, await getDashboardStats(c.env.DB));
});

admin.get("/analytics", requireRole("admin", "editor"), async (c) => {
  const days = Number.parseInt(c.req.query("days") ?? "30", 10);
  return ok(c, await getAnalytics(c.env.DB, Number.isFinite(days) ? days : 30));
});

// --- Users (admin only) -------------------------------------------------------

admin.get("/users", requireRole("admin"), async (c) => {
  const { page, limit } = paginationParams(c);
  const { total } = (await c.env.DB.prepare(`SELECT COUNT(*) AS total FROM users`).first<{
    total: number;
  }>()) ?? { total: 0 };
  const { results } = await c.env.DB.prepare(
    `SELECT id, name, email, role, avatar_url, bio, created_at, updated_at, last_login_at
     FROM users ORDER BY created_at ASC LIMIT ? OFFSET ?`,
  )
    .bind(limit, (page - 1) * limit)
    .all<{
      id: number;
      name: string;
      email: string;
      role: string;
      avatar_url: string | null;
      bio: string | null;
      created_at: string;
      updated_at: string;
      last_login_at: string | null;
    }>();
  return ok(c, results ?? [], 200, paginationMeta(total, page, limit));
});

// --- Settings (admin only) ----------------------------------------------------

admin.get("/settings", requireRole("admin"), async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT key, value FROM settings ORDER BY key ASC`,
  ).all<{ key: string; value: string }>();
  const settings: Record<string, string> = {};
  for (const row of results ?? []) settings[row.key] = row.value;
  return ok(c, settings);
});

admin.put("/settings", requireRole("admin"), async (c) => {
  const raw: unknown = await c.req.json().catch(() => undefined);
  const input = (raw as { settings?: unknown } | null)?.settings ?? raw;
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    throw new HTTPException(400, { message: "Settings must be an object of string values" });
  }
  const now = new Date().toISOString();
  for (const [key, value] of Object.entries(parsed.data)) {
    await c.env.DB.prepare(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    )
      .bind(key, value, now)
      .run();
  }
  await audit(c, "settings.update", "settings", "site", { keys: Object.keys(parsed.data) });
  const { results } = await c.env.DB.prepare(
    `SELECT key, value FROM settings ORDER BY key ASC`,
  ).all<{ key: string; value: string }>();
  const settings: Record<string, string> = {};
  for (const row of results ?? []) settings[row.key] = row.value;
  return ok(c, settings);
});

// --- Articles -----------------------------------------------------------------

const articleStaff = requireRole("admin", "editor", "author");

admin.get("/articles", articleStaff, async (c) => {
  const query = validateQuery(c, articleListQuerySchema);
  const { articles: items, total } = await listArticles(c.env.DB, {
    ...query,
    status: query.status ?? "all",
  });
  return ok(c, items, 200, paginationMeta(total, query.page, query.limit));
});

admin.post("/articles", articleStaff, async (c) => {
  const parsed = await validateBody(c, articleCreateSchema);
  const input = normalizeArticleInput(parsed);
  // Authors always own what they create; admins/editors may assign author_id.
  const authorId =
    c.var.user.role === "author" ? c.var.user.id : (input.author_id ?? c.var.user.id);
  // The create schema guarantees title + content; the `?? ""` only
  // satisfies the type checker (unreachable after validation).
  const article = await createArticle(
    c.env.DB,
    { ...input, title: input.title ?? "", content: input.content ?? "" },
    authorId,
  );
  await audit(c, "article.create", "article", article.id, {
    slug: article.slug,
    title: article.title,
  });
  return ok(c, article, 201);
});

admin.put("/articles/:id", articleStaff, async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) {
    throw new HTTPException(400, { message: "Invalid article id" });
  }
  await assertArticleAccess(c.env.DB, c.var.user, id);
  const parsed = await validateBody(c, articleUpdateSchema);
  const input = normalizeArticleInput(parsed);
  // Authors cannot reassign ownership.
  if (c.var.user.role === "author") delete input.author_id;
  const article = await updateArticle(c.env.DB, id, input);
  await audit(c, "article.update", "article", id, { slug: article.slug });
  return ok(c, article);
});

admin.delete("/articles/:id", articleStaff, async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) {
    throw new HTTPException(400, { message: "Invalid article id" });
  }
  await assertArticleAccess(c.env.DB, c.var.user, id);
  await deleteArticle(c.env.DB, id);
  await audit(c, "article.delete", "article", id);
  return ok(c, { deleted: true });
});

// --- Categories ---------------------------------------------------------------

const categoryStaff = requireRole("admin", "editor");

admin.get("/categories", articleStaff, async (c) => {
  return ok(c, await listCategories(c.env.DB));
});

admin.post("/categories", categoryStaff, async (c) => {
  const parsed = await validateBody(c, categoryCreateSchema);
  const category = await createCategory(c.env.DB, parsed);
  await audit(c, "category.create", "category", category.id, { slug: category.slug });
  return ok(c, category, 201);
});

admin.put("/categories/:id", categoryStaff, async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) {
    throw new HTTPException(400, { message: "Invalid category id" });
  }
  const parsed = await validateBody(c, categoryUpdateSchema);
  const category = await updateCategory(c.env.DB, id, parsed);
  await audit(c, "category.update", "category", id, { slug: category.slug });
  return ok(c, category);
});

admin.delete("/categories/:id", categoryStaff, async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) {
    throw new HTTPException(400, { message: "Invalid category id" });
  }
  await deleteCategory(c.env.DB, id);
  await audit(c, "category.delete", "category", id);
  return ok(c, { deleted: true });
});

// --- Tags ---------------------------------------------------------------------

admin.get("/tags", articleStaff, async (c) => {
  return ok(c, await listTags(c.env.DB));
});

admin.post("/tags", categoryStaff, async (c) => {
  const parsed = await validateBody(c, tagCreateSchema);
  const tag = await createTag(c.env.DB, parsed);
  await audit(c, "tag.create", "tag", tag.id, { name: tag.name });
  return ok(c, tag, 201);
});

admin.put("/tags/:id", categoryStaff, async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) {
    throw new HTTPException(400, { message: "Invalid tag id" });
  }
  const parsed = await validateBody(c, tagUpdateSchema);
  const tag = await updateTag(c.env.DB, id, parsed);
  await audit(c, "tag.update", "tag", id, { name: tag.name });
  return ok(c, tag);
});

admin.delete("/tags/:id", categoryStaff, async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) {
    throw new HTTPException(400, { message: "Invalid tag id" });
  }
  await deleteTag(c.env.DB, id);
  await audit(c, "tag.delete", "tag", id);
  return ok(c, { deleted: true });
});

// --- Comments -----------------------------------------------------------------

admin.get("/comments", requireRole("admin", "editor"), async (c) => {
  const { page, limit } = paginationParams(c);
  const status = c.req.query("status");
  const where = status ? "WHERE c.status = ?" : "";
  const args: unknown[] = status ? [status] : [];
  const { total } = (await c.env.DB.prepare(
    `SELECT COUNT(*) AS total FROM comments c ${where}`,
  )
    .bind(...args)
    .first<{ total: number }>()) ?? { total: 0 };
  const { results } = await c.env.DB.prepare(
    `SELECT c.id, c.article_id, a.title AS article_title, a.slug AS article_slug,
            c.author_name, c.author_email, c.content, c.status, c.created_at
     FROM comments c LEFT JOIN articles a ON a.id = c.article_id
     ${where} ORDER BY c.created_at DESC LIMIT ? OFFSET ?`,
  )
    .bind(...args, limit, (page - 1) * limit)
    .all<{
      id: number;
      article_id: number;
      article_title: string | null;
      article_slug: string | null;
      author_name: string;
      author_email: string;
      content: string;
      status: string;
      created_at: string;
    }>();
  return ok(c, results ?? [], 200, paginationMeta(total, page, limit));
});

admin.put("/comments/:id", requireRole("admin", "editor"), async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) {
    throw new HTTPException(400, { message: "Invalid comment id" });
  }
  const parsed = await validateBody(c, commentStatusSchema);
  const existing = await c.env.DB.prepare(`SELECT id FROM comments WHERE id = ? LIMIT 1`)
    .bind(id)
    .first<{ id: number }>();
  if (!existing) throw new HTTPException(404, { message: "Comment not found" });
  await c.env.DB.prepare(`UPDATE comments SET status = ? WHERE id = ?`)
    .bind(parsed.status, id)
    .run();
  await audit(c, "comment.moderate", "comment", id, { status: parsed.status });
  const updated = await c.env.DB.prepare(
    `SELECT c.id, c.article_id, a.title AS article_title, a.slug AS article_slug,
            c.author_name, c.author_email, c.content, c.status, c.created_at
     FROM comments c LEFT JOIN articles a ON a.id = c.article_id
     WHERE c.id = ? LIMIT 1`,
  )
    .bind(id)
    .first<{
      id: number;
      article_id: number;
      article_title: string | null;
      article_slug: string | null;
      author_name: string;
      author_email: string;
      content: string;
      status: string;
      created_at: string;
    }>();
  return ok(c, updated);
});

// --- Audit logs (admin only) ---------------------------------------------------

admin.get("/audit-logs", requireRole("admin"), async (c) => {
  const { page, limit } = paginationParams(c);
  const action = c.req.query("action");
  const userId = c.req.query("user_id");
  const clauses: string[] = [];
  const args: unknown[] = [];
  if (action) {
    clauses.push("al.action = ?");
    args.push(action);
  }
  if (userId && /^\d+$/.test(userId)) {
    clauses.push("al.user_id = ?");
    args.push(Number(userId));
  }
  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const { total } = (await c.env.DB.prepare(
    `SELECT COUNT(*) AS total FROM audit_logs al ${where}`,
  )
    .bind(...args)
    .first<{ total: number }>()) ?? { total: 0 };
  const { results } = await c.env.DB.prepare(
    `SELECT al.id, al.user_id, u.name AS user_name, al.action, al.entity_type,
            al.entity_id, al.details, al.ip_address, al.created_at
     FROM audit_logs al LEFT JOIN users u ON u.id = al.user_id
     ${where} ORDER BY al.created_at DESC LIMIT ? OFFSET ?`,
  )
    .bind(...args, limit, (page - 1) * limit)
    .all<{
      id: number;
      user_id: number | null;
      user_name: string | null;
      action: string;
      entity_type: string | null;
      entity_id: string | null;
      details: string | null;
      ip_address: string | null;
      created_at: string;
    }>();
  return ok(c, results ?? [], 200, paginationMeta(total, page, limit));
});

export default admin;

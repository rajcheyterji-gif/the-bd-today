// Article service — all D1 access for articles, via prepared statements.
// The public API shape is the shared contract (Article: content,
// category_id, tags: string[]). Two columns exist purely for the SEO
// routes in src/server/routes/seo.ts, which read the table directly:
//   * `body`      — GENERATED ALWAYS AS (content), i.e. a mirror of content
//   * `category`  — denormalized category name_en, kept in sync on write
// (see migrations/0001_schema.sql).
import type { Article, ArticleListParams, ArticleSort, ArticleStatus, UserRole } from "../../shared/types";
import { excerpt as makeExcerpt, readingTimeMinutes, sanitizeHtml, slugify } from "../../shared/utils";
import { HttpError, badRequest, notFound } from "../lib/errors";
import { isNumericId, likePattern, nowIso } from "../lib/db";

export interface ArticleRow {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  excerpt: string;
  content: string;
  category_id: number;
  category_slug: string | null;
  category_name_bn: string | null;
  category_name_en: string | null;
  author_id: number;
  author_name: string;
  author_role: string;
  author_avatar_url: string | null;
  author_bio: string | null;
  tags: string | null;
  featured_image_url: string | null;
  image_caption: string | null;
  image_credit: string | null;
  status: string;
  published_at: string | null;
  scheduled_at: string | null;
  created_at: string;
  updated_at: string;
  views: number;
  reading_time_minutes: number;
  seo_title: string | null;
  seo_description: string | null;
}

const ARTICLE_COLUMNS = `
  a.id, a.slug, a.title, a.subtitle, a.excerpt, a.content, a.category_id,
  c.slug AS category_slug, c.name_bn AS category_name_bn, c.name_en AS category_name_en,
  a.author_id, u.name AS author_name, u.role AS author_role,
  u.avatar_url AS author_avatar_url, u.bio AS author_bio,
  GROUP_CONCAT(t.name, '|||') AS tags,
  a.featured_image_url, a.image_caption, a.image_credit, a.status,
  a.published_at, a.scheduled_at, a.created_at, a.updated_at, a.views,
  a.reading_time_minutes, a.seo_title, a.seo_description`;

const ARTICLE_JOINS = `
  FROM articles a
  LEFT JOIN categories c ON c.id = a.category_id
  LEFT JOIN users u ON u.id = a.author_id
  LEFT JOIN article_tags at ON at.article_id = a.id
  LEFT JOIN tags t ON t.id = at.tag_id`;

/**
 * Slim columns for LIST responses (public lists, search, related).
 * List pages render title / excerpt / image / category / author / date
 * only — never the full HTML body, image captions, SEO fields or the
 * author bio. Dropping them cuts ~10% of the JSON and, more importantly,
 * the D1 rows the Worker has to read and serialise. The shape is
 * unchanged: `content` is still present, as "" (see mapListRow).
 * The admin list keeps the full columns — its preview modal renders
 * the article body from the list row.
 */
const ARTICLE_LIST_COLUMNS = `
  a.id, a.slug, a.title, a.subtitle, a.excerpt, a.category_id,
  c.slug AS category_slug, c.name_bn AS category_name_bn, c.name_en AS category_name_en,
  a.author_id, u.name AS author_name, u.role AS author_role,
  u.avatar_url AS author_avatar_url,
  GROUP_CONCAT(t.name, '|||') AS tags,
  a.featured_image_url, a.status,
  a.published_at, a.scheduled_at, a.created_at, a.updated_at, a.views,
  a.reading_time_minutes`;

function mapRow(row: ArticleRow): Article {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle ?? undefined,
    excerpt: row.excerpt,
    content: row.content,
    category_id: row.category_id,
    category: row.category_slug
      ? {
          id: row.category_id,
          slug: row.category_slug,
          name_bn: row.category_name_bn ?? "",
          name_en: row.category_name_en ?? "",
        }
      : undefined,
    author_id: row.author_id,
    author: {
      id: row.author_id,
      name: row.author_name,
      role: row.author_role as UserRole,
      avatar_url: row.author_avatar_url,
      bio: row.author_bio,
    },
    tags: row.tags ? row.tags.split("|||").filter(Boolean) : [],
    featured_image_url: row.featured_image_url ?? undefined,
    image_caption: row.image_caption ?? undefined,
    image_credit: row.image_credit ?? undefined,
    status: row.status as ArticleStatus,
    published_at: row.published_at ?? undefined,
    scheduled_at: row.scheduled_at ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
    views: row.views,
    reading_time_minutes: row.reading_time_minutes,
    seo_title: row.seo_title ?? undefined,
    seo_description: row.seo_description ?? undefined,
  };
}

/** Row shape returned by ARTICLE_LIST_COLUMNS (no body / captions / SEO). */
export interface ArticleListRow {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  excerpt: string;
  category_id: number;
  category_slug: string | null;
  category_name_bn: string | null;
  category_name_en: string | null;
  author_id: number;
  author_name: string;
  author_role: string;
  author_avatar_url: string | null;
  tags: string | null;
  featured_image_url: string | null;
  status: string;
  published_at: string | null;
  scheduled_at: string | null;
  created_at: string;
  updated_at: string;
  views: number;
  reading_time_minutes: number;
}

/**
 * Map a slim list row to an Article. `content` is "" — list pages show
 * the excerpt, which createArticle always generates (seed rows all carry
 * one), and `excerptFrom` only reads `content` when the excerpt is empty.
 * Nothing in the public list UI reads captions, SEO fields or author bio.
 */
function mapListRow(row: ArticleListRow): Article {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle ?? undefined,
    excerpt: row.excerpt,
    content: "",
    category_id: row.category_id,
    category: row.category_slug
      ? {
          id: row.category_id,
          slug: row.category_slug,
          name_bn: row.category_name_bn ?? "",
          name_en: row.category_name_en ?? "",
        }
      : undefined,
    author_id: row.author_id,
    author: {
      id: row.author_id,
      name: row.author_name,
      role: row.author_role as UserRole,
      avatar_url: row.author_avatar_url,
      bio: null,
    },
    tags: row.tags ? row.tags.split("|||").filter(Boolean) : [],
    featured_image_url: row.featured_image_url ?? undefined,
    status: row.status as ArticleStatus,
    published_at: row.published_at ?? undefined,
    scheduled_at: row.scheduled_at ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
    views: row.views,
    reading_time_minutes: row.reading_time_minutes,
  };
}

function sortClause(sort: ArticleSort): string {
  switch (sort) {
    case "popular":
      return "a.views DESC, a.published_at DESC";
    case "trending":
      // Recently published articles first, ordered by views within that window.
      // strftime() renders the cutoff in the same ISO-8601 shape as published_at.
      return `CASE WHEN a.published_at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-30 days') THEN a.views ELSE 0 END DESC, a.published_at DESC`;
    case "latest":
    default:
      return "COALESCE(a.published_at, a.created_at) DESC, a.id DESC";
  }
}

interface WhereClause {
  sql: string;
  params: unknown[];
}

/** Build the shared WHERE clause for list/count queries. */
function buildWhere(params: ArticleListParams): WhereClause {
  const clauses: string[] = [];
  const values: unknown[] = [];

  if (params.status && params.status !== "all") {
    clauses.push("a.status = ?");
    values.push(params.status);
  }
  if (params.category) {
    if (isNumericId(params.category)) {
      clauses.push("a.category_id = ?");
      values.push(Number(params.category));
    } else {
      clauses.push("c.slug = ?");
      values.push(params.category);
    }
  }
  if (params.search) {
    const pattern = likePattern(params.search);
    clauses.push("(a.title LIKE ? ESCAPE '\\' OR a.excerpt LIKE ? ESCAPE '\\' OR a.content LIKE ? ESCAPE '\\')");
    values.push(pattern, pattern, pattern);
  }
  if (params.tag) {
    clauses.push(
      `EXISTS (SELECT 1 FROM article_tags at2 JOIN tags t2 ON t2.id = at2.tag_id
        WHERE at2.article_id = a.id AND (t2.slug = ? OR t2.name = ?))`,
    );
    values.push(params.tag, params.tag);
  }
  if (params.author) {
    if (isNumericId(params.author)) {
      clauses.push("a.author_id = ?");
      values.push(Number(params.author));
    } else {
      clauses.push("u.name LIKE ? ESCAPE '\\'");
      values.push(likePattern(params.author));
    }
  }
  return { sql: clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "", params: values };
}

export interface ArticleListResult {
  articles: Article[];
  total: number;
}

export async function listArticles(
  db: D1Database,
  params: ArticleListParams,
  opts?: { slim?: boolean },
): Promise<ArticleListResult> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 12;
  const sort = params.sort ?? "latest";
  const where = buildWhere(params);
  const columns = opts?.slim ? ARTICLE_LIST_COLUMNS : ARTICLE_COLUMNS;

  // The count and the page are independent — run them together instead
  // of two sequential D1 round trips back to back.
  const [countRow, { results }] = await Promise.all([
    db
      .prepare(
        `SELECT COUNT(DISTINCT a.id) AS total ${ARTICLE_JOINS} ${where.sql}`,
      )
      .bind(...where.params)
      .first<{ total: number }>(),
    db
      .prepare(
        `SELECT ${columns} ${ARTICLE_JOINS} ${where.sql}
         GROUP BY a.id ORDER BY ${sortClause(sort)} LIMIT ? OFFSET ?`,
      )
      .bind(...where.params, limit, (page - 1) * limit)
      .all<ArticleRow>(),
  ]);

  const rows = results ?? [];
  const articles = opts?.slim
    ? rows.map((row) => mapListRow(row as unknown as ArticleListRow))
    : rows.map(mapRow);
  return { articles, total: countRow?.total ?? 0 };
}

export async function getArticleBySlug(
  db: D1Database,
  slug: string,
  status?: ArticleStatus,
): Promise<Article | null> {
  const statusClause = status ? "AND a.status = ?" : "";
  const args: unknown[] = [slug];
  if (status) args.push(status);
  const row = await db
    .prepare(
      `SELECT ${ARTICLE_COLUMNS} ${ARTICLE_JOINS}
       WHERE a.slug = ? ${statusClause} GROUP BY a.id LIMIT 1`,
    )
    .bind(...args)
    .first<ArticleRow>();
  return row ? mapRow(row) : null;
}

export async function getArticleById(db: D1Database, id: number): Promise<Article | null> {
  const row = await db
    .prepare(
      `SELECT ${ARTICLE_COLUMNS} ${ARTICLE_JOINS}
       WHERE a.id = ? GROUP BY a.id LIMIT 1`,
    )
    .bind(id)
    .first<ArticleRow>();
  return row ? mapRow(row) : null;
}

/** Increment the view counter and record a daily-views row (never throws). */
export async function incrementArticleViews(
  db: D1Database,
  articleId: number,
  ipHash: string | null,
): Promise<void> {
  try {
    await db
      .prepare(`UPDATE articles SET views = views + 1 WHERE id = ?`)
      .bind(articleId)
      .run();
    await db
      .prepare(`INSERT INTO article_views (article_id, viewed_at, ip_hash) VALUES (?, ?, ?)`)
      .bind(articleId, nowIso(), ipHash)
      .run();
  } catch (err) {
    console.error("incrementArticleViews failed", err);
  }
}

export async function getRelatedArticles(
  db: D1Database,
  article: Article,
  limit = 4,
): Promise<Article[]> {
  // Related stories render as cards (excerpt only), so the slim columns
  // are enough — same shape, no body.
  const { results } = await db
    .prepare(
      `SELECT ${ARTICLE_LIST_COLUMNS} ${ARTICLE_JOINS}
       WHERE a.category_id = ? AND a.id != ? AND a.status = 'published'
       GROUP BY a.id ORDER BY a.published_at DESC LIMIT ?`,
    )
    .bind(article.category_id, article.id, limit)
    .all<ArticleListRow>();
  const related = (results ?? []).map(mapListRow);
  if (related.length >= limit) return related;
  // Top up with latest published articles from other categories.
  const exclude = related.map((r) => r.id);
  const excludeClause =
    exclude.length > 0 ? `AND a.id NOT IN (${exclude.map(() => "?").join(", ")})` : "";
  const { results: more } = await db
    .prepare(
      `SELECT ${ARTICLE_LIST_COLUMNS} ${ARTICLE_JOINS}
       WHERE a.id != ? AND a.status = 'published' ${excludeClause}
       GROUP BY a.id ORDER BY a.published_at DESC LIMIT ?`,
    )
    .bind(article.id, ...exclude, limit - related.length)
    .all<ArticleListRow>();
  return [...related, ...(more ?? []).map(mapListRow)];
}

async function ensureUniqueSlug(
  db: D1Database,
  base: string,
  excludeId?: number,
): Promise<string> {
  let slug = base;
  let attempt = 0;
  for (;;) {
    const args: unknown[] = [slug];
    const exclude = excludeId !== undefined ? "AND id != ?" : "";
    if (excludeId !== undefined) args.push(excludeId);
    const row = await db
      .prepare(`SELECT 1 AS found FROM articles WHERE slug = ? ${exclude} LIMIT 1`)
      .bind(...args)
      .first<{ found: number }>();
    if (!row) return slug;
    attempt += 1;
    slug = `${base}-${attempt + 1}`;
    if (attempt > 100) throw badRequest("SLUG_CONFLICT", "Could not generate a unique slug");
  }
}

/** Resolve a category reference (id, slug or name_en) to its id + name_en. */
export async function resolveCategory(
  db: D1Database,
  ref: { id?: number; slugOrName?: string },
): Promise<{ id: number; name_en: string }> {
  let row: { id: number; name_en: string } | null = null;
  if (ref.id !== undefined) {
    row = await db
      .prepare(`SELECT id, name_en FROM categories WHERE id = ? LIMIT 1`)
      .bind(ref.id)
      .first<{ id: number; name_en: string }>();
  } else if (ref.slugOrName) {
    row = await db
      .prepare(
        `SELECT id, name_en FROM categories WHERE slug = ? OR name_en = ? OR name_bn = ? LIMIT 1`,
      )
      .bind(ref.slugOrName, ref.slugOrName, ref.slugOrName)
      .first<{ id: number; name_en: string }>();
  }
  if (!row) throw badRequest("CATEGORY_NOT_FOUND", "Category does not exist");
  return row;
}

async function syncTags(db: D1Database, articleId: number, tagNames: string[]): Promise<void> {
  await db.prepare(`DELETE FROM article_tags WHERE article_id = ?`).bind(articleId).run();
  const seen = new Set<string>();
  for (const rawName of tagNames) {
    const name = rawName.trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    const slug = slugify(name);
    await db
      .prepare(`INSERT INTO tags (slug, name) VALUES (?, ?) ON CONFLICT(slug) DO NOTHING`)
      .bind(slug, name)
      .run();
    const tag = await db
      .prepare(`SELECT id FROM tags WHERE slug = ? LIMIT 1`)
      .bind(slug)
      .first<{ id: number }>();
    if (tag) {
      await db
        .prepare(`INSERT INTO article_tags (article_id, tag_id) VALUES (?, ?) ON CONFLICT DO NOTHING`)
        .bind(articleId, tag.id)
        .run();
    }
  }
}

export interface ArticleInput {
  title: string;
  slug?: string;
  subtitle?: string | null;
  excerpt?: string | null;
  content: string;
  category_id?: number;
  category?: string;
  author_id?: number;
  tags?: string[];
  featured_image_url?: string | null;
  image_caption?: string | null;
  image_credit?: string | null;
  status?: ArticleStatus;
  scheduled_at?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
}

export async function createArticle(
  db: D1Database,
  input: ArticleInput,
  authorId: number,
): Promise<Article> {
  const category = await resolveCategory(db, {
    id: input.category_id,
    slugOrName: input.category,
  });
  const content = sanitizeHtml(input.content);
  const now = nowIso();
  const status = input.status ?? "draft";
  const slug = await ensureUniqueSlug(db, input.slug ? slugify(input.slug) : slugify(input.title));
  const publishedAt =
    status === "published" ? now : status === "scheduled" ? null : null;
  const result = await db
    .prepare(
      `INSERT INTO articles
        (slug, title, subtitle, excerpt, content, category_id, category, author_id,
         featured_image_url, image_caption, image_credit, status, published_at, scheduled_at,
         reading_time_minutes, seo_title, seo_description, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      slug,
      input.title,
      input.subtitle ?? null,
      input.excerpt ?? makeExcerpt(content, 160),
      content,
      category.id,
      category.name_en,
      authorId,
      input.featured_image_url ?? null,
      input.image_caption ?? null,
      input.image_credit ?? null,
      status,
      publishedAt,
      status === "scheduled" ? (input.scheduled_at ?? null) : null,
      Math.max(1, readingTimeMinutes(content)),
      input.seo_title ?? null,
      input.seo_description ?? null,
      now,
      now,
    )
    .run();
  const id = Number(result.meta?.last_row_id ?? 0);
  if (input.tags) await syncTags(db, id, input.tags);
  const created = await getArticleById(db, id);
  if (!created) throw new HttpError(500, "INTERNAL_ERROR", "Article could not be created");
  return created;
}

export async function updateArticle(
  db: D1Database,
  id: number,
  input: Partial<ArticleInput>,
): Promise<Article> {
  const existing = await getArticleById(db, id);
  if (!existing) throw notFound("Article not found");

  const sets: string[] = [];
  const values: unknown[] = [];
  const set = (column: string, value: unknown) => {
    sets.push(`${column} = ?`);
    values.push(value);
  };

  if (input.category_id !== undefined || input.category !== undefined) {
    const category = await resolveCategory(db, {
      id: input.category_id,
      slugOrName: input.category,
    });
    set("category_id", category.id);
    // Keep the denormalized `category` column (read by the SEO routes) in sync.
    set("category", category.name_en);
  }

  if (input.title !== undefined) set("title", input.title);
  if (input.slug !== undefined) {
    set("slug", await ensureUniqueSlug(db, slugify(input.slug), id));
  }
  if (input.subtitle !== undefined) set("subtitle", input.subtitle);
  if (input.excerpt !== undefined) set("excerpt", input.excerpt);
  let content: string | undefined;
  if (input.content !== undefined) {
    content = sanitizeHtml(input.content);
    set("content", content);
    set("reading_time_minutes", Math.max(1, readingTimeMinutes(content)));
    if (input.excerpt === undefined) set("excerpt", makeExcerpt(content, 160));
  }
  if (input.featured_image_url !== undefined) set("featured_image_url", input.featured_image_url);
  if (input.image_caption !== undefined) set("image_caption", input.image_caption);
  if (input.image_credit !== undefined) set("image_credit", input.image_credit);
  if (input.seo_title !== undefined) set("seo_title", input.seo_title);
  if (input.seo_description !== undefined) set("seo_description", input.seo_description);

  const now = nowIso();
  if (input.status !== undefined) {
    set("status", input.status);
    if (input.status === "published" && !existing.published_at) {
      set("published_at", now);
    }
    if (input.status === "scheduled") {
      set("scheduled_at", input.scheduled_at ?? existing.scheduled_at ?? null);
    } else if (input.scheduled_at !== undefined) {
      set("scheduled_at", input.scheduled_at);
    }
  } else if (input.scheduled_at !== undefined) {
    set("scheduled_at", input.scheduled_at);
  }
  set("updated_at", now);

  if (sets.length > 1) {
    await db
      .prepare(`UPDATE articles SET ${sets.join(", ")} WHERE id = ?`)
      .bind(...values, id)
      .run();
  }
  if (input.tags !== undefined) await syncTags(db, id, input.tags);
  const updated = await getArticleById(db, id);
  if (!updated) throw notFound("Article not found");
  return updated;
}

export async function deleteArticle(db: D1Database, id: number): Promise<void> {
  const existing = await getArticleById(db, id);
  if (!existing) throw notFound("Article not found");
  // Delete children explicitly (D1 foreign-key enforcement is not relied on).
  await db.prepare(`DELETE FROM article_tags WHERE article_id = ?`).bind(id).run();
  await db.prepare(`DELETE FROM article_views WHERE article_id = ?`).bind(id).run();
  await db.prepare(`DELETE FROM comments WHERE article_id = ?`).bind(id).run();
  await db.prepare(`DELETE FROM articles WHERE id = ?`).bind(id).run();
}

/**
 * Publish scheduled articles whose scheduled_at has arrived.
 * Called by the nightly cron (src/server/index.ts scheduled handler).
 * Returns the number of articles published.
 */
export async function publishScheduledArticles(db: D1Database): Promise<number> {
  const now = nowIso();
  const result = await db
    .prepare(
      `UPDATE articles
       SET status = 'published', published_at = COALESCE(published_at, ?), updated_at = ?
       WHERE status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= ?`,
    )
    .bind(now, now, now)
    .run();
  return result.meta?.changes ?? 0;
}

/** Tags for the admin tag manager (with article counts). */
export async function listTags(
  db: D1Database,
): Promise<Array<{ id: number; slug: string; name: string; name_bn: string | null; article_count: number }>> {
  const { results } = await db
    .prepare(
      `SELECT t.id, t.slug, t.name, t.name_bn,
              (SELECT COUNT(*) FROM article_tags at WHERE at.tag_id = t.id) AS article_count
       FROM tags t ORDER BY t.name ASC`,
    )
    .all<{
      id: number;
      slug: string;
      name: string;
      name_bn: string | null;
      article_count: number;
    }>();
  return results ?? [];
}

export async function createTag(
  db: D1Database,
  input: { name: string; name_bn?: string | null },
): Promise<{ id: number; slug: string; name: string; name_bn: string | null }> {
  const slug = slugify(input.name);
  const existing = await db
    .prepare(`SELECT id FROM tags WHERE slug = ? LIMIT 1`)
    .bind(slug)
    .first<{ id: number }>();
  if (existing) throw new HttpError(409, "CONFLICT", "A tag with this slug already exists");
  const result = await db
    .prepare(`INSERT INTO tags (slug, name, name_bn) VALUES (?, ?, ?)`)
    .bind(slug, input.name, input.name_bn ?? null)
    .run();
  return {
    id: Number(result.meta?.last_row_id ?? 0),
    slug,
    name: input.name,
    name_bn: input.name_bn ?? null,
  };
}

export async function updateTag(
  db: D1Database,
  id: number,
  input: { name?: string; name_bn?: string | null },
): Promise<{ id: number; slug: string; name: string; name_bn: string | null }> {
  const existing = await db
    .prepare(`SELECT id, slug, name, name_bn FROM tags WHERE id = ? LIMIT 1`)
    .bind(id)
    .first<{ id: number; slug: string; name: string; name_bn: string | null }>();
  if (!existing) throw notFound("Tag not found");
  const name = input.name ?? existing.name;
  const slug = slugify(name);
  const clash = await db
    .prepare(`SELECT id FROM tags WHERE slug = ? AND id != ? LIMIT 1`)
    .bind(slug, id)
    .first<{ id: number }>();
  if (clash) throw new HttpError(409, "CONFLICT", "A tag with this slug already exists");
  await db
    .prepare(`UPDATE tags SET slug = ?, name = ?, name_bn = ? WHERE id = ?`)
    .bind(slug, name, input.name_bn ?? existing.name_bn, id)
    .run();
  return { id, slug, name, name_bn: input.name_bn ?? existing.name_bn };
}

export async function deleteTag(db: D1Database, id: number): Promise<void> {
  const existing = await db
    .prepare(`SELECT id FROM tags WHERE id = ? LIMIT 1`)
    .bind(id)
    .first<{ id: number }>();
  if (!existing) throw notFound("Tag not found");
  await db.prepare(`DELETE FROM article_tags WHERE tag_id = ?`).bind(id).run();
  await db.prepare(`DELETE FROM tags WHERE id = ?`).bind(id).run();
}

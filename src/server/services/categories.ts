// Category service — D1 prepared statements only.
import type { Category } from "../../shared/types";
import { slugify } from "../../shared/utils";
import { HttpError, badRequest, notFound } from "../lib/errors";

export interface CategoryRow extends Category {
  article_count: number;
}

export async function listCategories(db: D1Database): Promise<CategoryRow[]> {
  const { results } = await db
    .prepare(
      `SELECT c.id, c.slug, c.name_bn, c.name_en, c.description,
              c.created_at, c.updated_at,
              (SELECT COUNT(*) FROM articles a
               WHERE a.category_id = c.id AND a.status = 'published') AS article_count
       FROM categories c ORDER BY c.name_en ASC`,
    )
    .all<CategoryRow>();
  return results ?? [];
}

export async function getCategoryBySlug(db: D1Database, slug: string): Promise<CategoryRow | null> {
  const row = await db
    .prepare(
      `SELECT c.id, c.slug, c.name_bn, c.name_en, c.description,
              c.created_at, c.updated_at,
              (SELECT COUNT(*) FROM articles a
               WHERE a.category_id = c.id AND a.status = 'published') AS article_count
       FROM categories c WHERE c.slug = ? LIMIT 1`,
    )
    .bind(slug)
    .first<CategoryRow>();
  return row ?? null;
}

export async function getCategoryById(db: D1Database, id: number): Promise<Category | null> {
  const row = await db
    .prepare(
      `SELECT id, slug, name_bn, name_en, description, created_at, updated_at
       FROM categories WHERE id = ? LIMIT 1`,
    )
    .bind(id)
    .first<Category>();
  return row ?? null;
}

export interface CategoryInput {
  slug: string;
  name_bn: string;
  name_en: string;
  description?: string | null;
}

export async function createCategory(db: D1Database, input: CategoryInput): Promise<Category> {
  const slug = slugify(input.slug);
  const existing = await db
    .prepare(`SELECT id FROM categories WHERE slug = ? LIMIT 1`)
    .bind(slug)
    .first<{ id: number }>();
  if (existing) throw new HttpError(409, "CONFLICT", "A category with this slug already exists");
  const now = new Date().toISOString();
  const result = await db
    .prepare(
      `INSERT INTO categories (slug, name_bn, name_en, description, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(slug, input.name_bn, input.name_en, input.description ?? null, now, now)
    .run();
  const created = await getCategoryById(db, Number(result.meta?.last_row_id ?? 0));
  if (!created) throw new HttpError(500, "INTERNAL_ERROR", "Category could not be created");
  return created;
}

export async function updateCategory(
  db: D1Database,
  id: number,
  input: Partial<CategoryInput>,
): Promise<Category> {
  const existing = await getCategoryById(db, id);
  if (!existing) throw notFound("Category not found");
  const slug = input.slug !== undefined ? slugify(input.slug) : existing.slug;
  if (slug !== existing.slug) {
    const clash = await db
      .prepare(`SELECT id FROM categories WHERE slug = ? AND id != ? LIMIT 1`)
      .bind(slug, id)
      .first<{ id: number }>();
    if (clash) throw new HttpError(409, "CONFLICT", "A category with this slug already exists");
  }
  const nameEn = input.name_en ?? existing.name_en;
  const nameBn = input.name_bn ?? existing.name_bn;
  const description = input.description !== undefined ? input.description : existing.description;
  await db
    .prepare(
      `UPDATE categories SET slug = ?, name_bn = ?, name_en = ?, description = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind(slug, nameBn, nameEn, description, new Date().toISOString(), id)
    .run();
  // Keep the denormalized `category` column on articles in sync (SEO routes).
  if (nameEn !== existing.name_en) {
    await db
      .prepare(`UPDATE articles SET category = ? WHERE category_id = ?`)
      .bind(nameEn, id)
      .run();
  }
  const updated = await getCategoryById(db, id);
  if (!updated) throw notFound("Category not found");
  return updated;
}

export async function deleteCategory(db: D1Database, id: number): Promise<void> {
  const existing = await getCategoryById(db, id);
  if (!existing) throw notFound("Category not found");
  const { count } = (await db
    .prepare(`SELECT COUNT(*) AS count FROM articles WHERE category_id = ?`)
    .bind(id)
    .first<{ count: number }>()) ?? { count: 0 };
  if (count > 0) {
    throw badRequest(
      "CATEGORY_IN_USE",
      `Category has ${count} article(s); move or delete them first`,
    );
  }
  await db.prepare(`DELETE FROM categories WHERE id = ?`).bind(id).run();
}

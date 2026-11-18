// Server-side Zod schemas for article requests.
//
// The contract shape is primary (content, category_id, featured_image_url,
// snake_case). The legacy aliases (body, category name, camelCase) exist so
// payloads built from src/shared/validation.ts (articleInputSchema) keep
// working; normalizeArticleInput() folds both into one canonical shape.
import { z } from "zod";
import type { ArticleInput } from "../services/articles";

export const ARTICLE_STATUSES = ["draft", "published", "scheduled", "archived"] as const;

const slugField = z
  .string()
  .min(1)
  .max(200)
  .regex(
    /^[a-z0-9\u0980-\u09FF]+(?:-[a-z0-9\u0980-\u09FF]+)*$/,
    "slug may only contain lowercase letters, Bengali letters, digits and single hyphens",
  );

const articleCreateBase = z.object({
  title: z.string().min(1, "title is required").max(300),
  slug: slugField.optional(),
  subtitle: z.string().max(300).optional().nullable(),
  excerpt: z.string().max(500).optional().nullable(),
  content: z.string().min(1, "content is required").optional(),
  body: z.string().min(1).optional(), // legacy alias for content
  category_id: z.number().int().positive().optional(),
  category: z.string().min(1).max(100).optional(), // legacy: category name/slug
  author_id: z.number().int().positive().optional(),
  tags: z.array(z.string().min(1).max(60)).max(20).default([]),
  featured_image_url: z.string().url().max(500).optional().nullable(),
  featuredImageUrl: z.string().url().max(500).optional().nullable(), // legacy
  image_caption: z.string().max(300).optional().nullable(),
  image_credit: z.string().max(200).optional().nullable(),
  status: z.enum(ARTICLE_STATUSES).default("draft"),
  scheduled_at: z.string().datetime({ offset: true }).optional().nullable(),
  scheduledAt: z.string().datetime({ offset: true }).optional().nullable(), // legacy
  seo_title: z.string().max(120).optional().nullable(),
  seo_description: z.string().max(200).optional().nullable(),
  seoTitle: z.string().max(120).optional().nullable(), // legacy
  seoDescription: z.string().max(200).optional().nullable(), // legacy
});

export const articleCreateSchema = articleCreateBase
  .refine((d) => d.content !== undefined || d.body !== undefined, {
    message: "content (or body) is required",
  })
  .refine((d) => d.category_id !== undefined || d.category !== undefined, {
    message: "category_id (or category) is required",
  })
  .refine(
    (d) =>
      d.status !== "scheduled" ||
      d.scheduled_at != null ||
      d.scheduledAt != null,
    { message: "scheduled_at is required when status is scheduled" },
  );

export const articleUpdateSchema = articleCreateBase
  .partial()
  .omit({ tags: true })
  .extend({ tags: z.array(z.string().min(1).max(60)).max(20).optional() })
  .refine(
    (d) =>
      d.status !== "scheduled" ||
      d.scheduled_at != null ||
      d.scheduledAt != null,
    { message: "scheduled_at is required when status is scheduled" },
  );

export type ArticleCreateInput = z.infer<typeof articleCreateSchema>;
export type ArticleUpdateInput = z.infer<typeof articleUpdateSchema>;

/** Fold contract + legacy fields into the canonical service input. */
export function normalizeArticleInput(
  parsed: ArticleCreateInput | ArticleUpdateInput,
): Partial<ArticleInput> {
  const input: Partial<ArticleInput> = {};
  if (parsed.title !== undefined) input.title = parsed.title;
  if (parsed.slug !== undefined) input.slug = parsed.slug;
  if (parsed.subtitle !== undefined) input.subtitle = parsed.subtitle;
  if (parsed.excerpt !== undefined) input.excerpt = parsed.excerpt;
  const content = parsed.content ?? parsed.body;
  if (content !== undefined) input.content = content;
  if (parsed.category_id !== undefined) input.category_id = parsed.category_id;
  if (parsed.category !== undefined) input.category = parsed.category;
  if (parsed.author_id !== undefined) input.author_id = parsed.author_id;
  if (parsed.tags !== undefined) input.tags = parsed.tags;
  const featured = parsed.featured_image_url ?? parsed.featuredImageUrl;
  if (featured !== undefined) input.featured_image_url = featured;
  if (parsed.image_caption !== undefined) input.image_caption = parsed.image_caption;
  if (parsed.image_credit !== undefined) input.image_credit = parsed.image_credit;
  if (parsed.status !== undefined) input.status = parsed.status;
  const scheduled = parsed.scheduled_at ?? parsed.scheduledAt;
  if (scheduled !== undefined) input.scheduled_at = scheduled;
  const seoTitle = parsed.seo_title ?? parsed.seoTitle;
  if (seoTitle !== undefined) input.seo_title = seoTitle;
  const seoDescription = parsed.seo_description ?? parsed.seoDescription;
  if (seoDescription !== undefined) input.seo_description = seoDescription;
  return input;
}

/** Public + admin list query (?category=&search=&tag=&author=&status=&page=&limit=&sort=). */
export const articleListQuerySchema = z.object({
  category: z.string().max(200).optional(),
  search: z.string().max(200).optional(),
  tag: z.string().max(100).optional(),
  author: z.string().max(100).optional(),
  status: z.enum([...ARTICLE_STATUSES, "all"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
  sort: z.enum(["latest", "popular", "trending"]).default("latest"),
});

export type ArticleListQuery = z.infer<typeof articleListQuerySchema>;

/** Public comment submission on an article. */
export const commentCreateSchema = z.object({
  author_name: z.string().min(1, "name is required").max(100),
  author_email: z.string().email("a valid email is required").max(200),
  content: z.string().min(1, "comment is required").max(2000),
});

/**
 * Zod schemas for every request body the API accepts.
 * The Worker validates with these before touching D1; the admin client
 * reuses them for form validation so both sides agree on the rules.
 */
import { z } from "zod";

export const ARTICLE_STATUSES = ["draft", "scheduled", "published", "archived"] as const;
export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

export const CATEGORIES = [
  "Bangladesh",
  "International",
  "Politics",
  "Economy",
  "Sports",
  "Technology",
  "Entertainment",
  "Education",
  "Lifestyle",
] as const;

export const slugSchema = z
  .string()
  .min(1, "slug is required")
  .max(200)
  .regex(
    /^[a-z0-9\u0980-\u09FF]+(?:-[a-z0-9\u0980-\u09FF]+)*$/,
    "slug may only contain lowercase letters, Bengali letters, digits and single hyphens",
  );

export const articleInputSchema = z.object({
  title: z.string().min(1, "title is required").max(300),
  slug: slugSchema.optional(),
  excerpt: z.string().max(500).optional(),
  content: z.string().min(1, "content is required"),
  category: z.enum(CATEGORIES),
  tags: z.array(z.string().min(1).max(60)).max(20).default([]),
  featuredImageId: z.number().int().positive().nullable().optional(),
  isBreaking: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  status: z.enum(ARTICLE_STATUSES).default("draft"),
  scheduledAt: z.string().datetime({ offset: true }).nullable().optional(),
  seoTitle: z.string().max(120).optional(),
  seoDescription: z.string().max(200).optional(),
  seoKeywords: z.array(z.string().max(60)).max(20).optional(),
});

export const articleUpdateSchema = articleInputSchema.partial().extend({
  id: z.number().int().positive(),
});

export type ArticleInput = z.infer<typeof articleInputSchema>;
export type ArticleUpdate = z.infer<typeof articleUpdateSchema>;

export const categoryInputSchema = z.object({
  name: z.string().min(1).max(100),
  slug: slugSchema,
  description: z.string().max(500).optional(),
});

export const commentInputSchema = z.object({
  articleId: z.number().int().positive(),
  authorName: z.string().min(1, "name is required").max(100),
  authorEmail: z.string().email("a valid email is required").max(200),
  content: z.string().min(1, "comment is required").max(2000),
});

export const newsletterSubscribeSchema = z.object({
  email: z.string().email("a valid email is required").max(200),
  name: z.string().max(100).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "password is required"),
});

export const initAdminSchema = z.object({
  token: z.string().min(1, "init token is required"),
  email: z.string().email(),
  name: z.string().min(1).max(100),
  password: z.string().min(12, "admin password must be at least 12 characters"),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

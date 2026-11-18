// Server-side Zod schemas for categories, tags, comments, settings and
// newsletter requests.
import { z } from "zod";

const slugField = z
  .string()
  .min(1)
  .max(200)
  .regex(
    /^[a-z0-9\u0980-\u09FF]+(?:-[a-z0-9\u0980-\u09FF]+)*$/,
    "slug may only contain lowercase letters, Bengali letters, digits and single hyphens",
  );

export const categoryCreateSchema = z.object({
  slug: slugField,
  name_bn: z.string().min(1, "name_bn is required").max(100),
  name_en: z.string().min(1, "name_en is required").max(100),
  description: z.string().max(500).optional().nullable(),
});

export const categoryUpdateSchema = categoryCreateSchema.partial();

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;

export const tagCreateSchema = z.object({
  name: z.string().min(1, "name is required").max(60),
  name_bn: z.string().max(60).optional().nullable(),
});

export const tagUpdateSchema = tagCreateSchema.partial();

export type TagCreateInput = z.infer<typeof tagCreateSchema>;
export type TagUpdateInput = z.infer<typeof tagUpdateSchema>;

export const commentStatusSchema = z.object({
  status: z.enum(["pending", "approved", "rejected", "spam"]),
});

export type CommentStatusInput = z.infer<typeof commentStatusSchema>;

/** PUT /api/v1/admin/settings body: { settings: { key: value } } or a flat object. */
export const settingsSchema = z.record(z.string(), z.string().max(5000));

export const newsletterSchema = z.object({
  email: z.string().email("a valid email is required").max(200),
  name: z.string().max(100).optional(),
});

export type NewsletterInput = z.infer<typeof newsletterSchema>;

// Server-side Zod schemas for auth requests. These mirror
// src/shared/validation.ts (loginSchema / initAdminSchema) so both sides
// agree; the server init schema additionally allows the ADMIN_* env
// fallbacks documented in ENVIRONMENT.md.
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("a valid email is required").max(200),
  password: z.string().min(1, "password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const initAdminSchema = z.object({
  token: z.string().min(1, "init token is required"),
  email: z.string().email("a valid email is required").max(200).optional(),
  name: z.string().min(1).max(100).optional(),
  password: z.string().min(12, "admin password must be at least 12 characters").optional(),
});

export type InitAdminInput = z.infer<typeof initAdminSchema>;

/**
 * Own-profile update (PATCH /api/v1/auth/me). Only name, email and bio
 * are accepted — `role` is NOT in the schema, so even if a client sends
 * it, Zod strips it and the service never touches the role column.
 */
export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1, "name is required").max(100).optional(),
    email: z.string().trim().email("a valid email is required").max(200).optional(),
    bio: z.string().max(500).nullable().optional(),
  })
  .refine(
    (v) => v.name !== undefined || v.email !== undefined || v.bio !== undefined,
    { message: "nothing to update" },
  );

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/** Own-password change (POST /api/v1/auth/me/password). */
export const changePasswordSchema = z.object({
  current_password: z.string().min(1, "current password is required"),
  new_password: z.string().min(12, "new password must be at least 12 characters").max(200),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

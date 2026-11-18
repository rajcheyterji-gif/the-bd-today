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

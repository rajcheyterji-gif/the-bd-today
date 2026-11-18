// Worker environment bindings for THE BD TODAY.
//
// The real D1/R2/Fetcher types come from @cloudflare/workers-types (see
// tsconfig.json "types"). Secrets are set via `.dev.vars` locally and
// `wrangler secret put` in production — see ENVIRONMENT.md. Never commit a
// real value.
import type { SessionUser } from "../shared/types";

export interface Env {
  /** D1 database `the-bd-today-db`. */
  DB: D1Database;
  /** R2 bucket for media uploads. */
  R2_BUCKET: R2Bucket;
  /** Static assets (Vite build in dist/client). */
  ASSETS: Fetcher;
  /** HMAC key that signs admin session cookies. Required. */
  SESSION_SECRET: string;
  /** One-time token authorising POST /api/v1/auth/init. */
  ADMIN_INIT_TOKEN?: string;
  /** First-admin bootstrap fallbacks (see ENVIRONMENT.md). */
  ADMIN_EMAIL?: string;
  ADMIN_NAME?: string;
  ADMIN_PASSWORD?: string;
  /** Canonical origin, e.g. https://thebdtoday.com (no trailing slash). */
  SITE_URL?: string;
  SITE_NAME?: string;
  ENVIRONMENT?: string;
}

/** Hono context variables set by the auth middleware. */
export interface AppVariables {
  user: SessionUser;
}

/** Canonical site origin for sitemaps, RSS, OG tags and media URLs. */
export function getSiteUrl(env: Env): string {
  return (env.SITE_URL ?? "https://thebdtoday.com").replace(/\/+$/, "");
}

/** Site name for JSON-LD / RSS (defaults to the brand). */
export function getSiteName(env: Env): string {
  return env.SITE_NAME ?? "THE BD TODAY";
}

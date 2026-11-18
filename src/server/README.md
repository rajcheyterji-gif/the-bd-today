# Owned by the backend builder: the Hono Worker entry (index.ts), API
# routes, auth, and scheduled publishing live here.
# Exception: src/server/routes/seo.ts (sitemap / robots / RSS) is owned
# by the config/SEO work and already exists.
#
# Backend layout
#   src/server/index.ts ......... app factory + SPA fallback + cron
#   src/server/env.ts ........... Env bindings (DB, R2_BUCKET, ASSETS, secrets)
#   src/server/lib/ ............. response envelope, HttpError, db helpers, SEO adapters
#   src/server/middleware/ ...... session auth / RBAC / CSRF / login rate limit, Zod validation
#   src/server/services/ ........ D1 access: auth (PBKDF2), articles, categories, media (R2), analytics
#   src/server/validators/ ...... server Zod schemas (accept contract shape + legacy aliases)
#   src/server/routes/ .......... auth, articles, categories, admin, media, public
#   src/shared/utils.ts ......... appended sanitizeHtml / formatDateBn / excerpt / readingTime
#                                 (existing slugify etc. untouched)
#
# Schema compatibility notes (see migrations/0001_schema.sql)
#   * articles.body is a GENERATED mirror of content; articles.category is a
#     denormalized category name_en kept in sync by the services — both exist
#     so the SEO routes can read the table directly.
#   * Timestamps are ISO-8601 UTC; compare in SQL with
#     strftime('%Y-%m-%dT%H:%M:%fZ','now'), never datetime('now').
#   * src/server/routes/seo.ts: two datetime('now') comparisons were fixed to
#     strftime(...) by the backend builder (same-day ISO timestamps otherwise
#     vanish from the sitemap/RSS). Flagged in the build report for the SEO owner.

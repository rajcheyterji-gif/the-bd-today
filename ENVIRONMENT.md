# ENVIRONMENT.md — THE BD TODAY

Every environment variable and secret this project uses, where it is set,
and how to obtain or generate it. **Never commit a real value.** Local
values go in `.dev.vars` (git-ignored, copied from `.dev.vars.example`);
production values are set with `wrangler secret put <NAME>` or as `vars`
in `wrangler.jsonc` (public values only).

## Secrets (set with `wrangler secret put`, never in git)

| Name | Required | Where set | How to obtain / generate |
| --- | --- | --- | --- |
| `SESSION_SECRET` | Yes | `.dev.vars` locally; `wrangler secret put SESSION_SECRET` in production | Generate once: `openssl rand -base64 48`. Signs admin session cookies. Rotating it logs every admin out — that is the intended recovery if it ever leaks. |
| `ADMIN_INIT_TOKEN` | Yes, until first admin exists | `.dev.vars` locally; `wrangler secret put ADMIN_INIT_TOKEN` in production | Generate once: `openssl rand -hex 32`. Authorises `POST /api/v1/auth/init` (first-admin bootstrap). Delete/rotate it after the first admin is created — the endpoint refuses to run once any user exists. |
| `ADMIN_PASSWORD` | Local dev only | `.dev.vars` only | Choose a strong password (12+ characters) for the first admin account. Used only by the init procedure; it is hashed before storage and is not a runtime secret. Do **not** set it as a production Wrangler secret. |

## Public configuration (`vars` in `wrangler.jsonc` / `.dev.vars`)

| Name | Required | Where set | Notes |
| --- | --- | --- | --- |
| `SITE_URL` | Yes | `wrangler.jsonc` → `vars`; override in `.dev.vars` for local dev | Canonical origin, e.g. `https://thebdtoday.com` (local: `http://localhost:8787`). Used for canonical links, sitemap, RSS and OG tags. No trailing slash. |
| `SITE_NAME` | No (default `THE BD TODAY`) | `wrangler.jsonc` → `vars` | Brand name used in the masthead, footer and JSON-LD. |
| `ADMIN_EMAIL` | Yes for init | `.dev.vars` / `wrangler.jsonc` → `vars` | Email of the first admin account created by `/auth/init`. |
| `ADMIN_NAME` | No | `.dev.vars` only | Display name of the first admin account. |

## Cloudflare bindings (not env vars — configured in `wrangler.jsonc`)

| Binding | Type | How to obtain |
| --- | --- | --- |
| `DB` | D1 database `the-bd-today-db` | `npx wrangler d1 create the-bd-today-db` → copy the printed `database_id` into `wrangler.jsonc`. Or dashboard: Workers & Pages → D1 → the-bd-today-db → copy the Database ID. |
| `R2_BUCKET` | R2 bucket (media uploads) | `npx wrangler r2 bucket create the-bd-today-media` → the name you choose is the `bucket_name`. Or dashboard: R2 Object Storage → Create bucket. |
| `ASSETS` | Static assets (`./dist/client`) | Automatic — Wrangler serves the Vite build. No setup. |

## CI secrets (GitHub repository secrets, never in files)

| Name | Required | How to obtain |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | Yes, for deploy workflow | Cloudflare dashboard → My Profile → API Tokens → Create Token → use the "Edit Cloudflare Workers" template (Workers, D1, R2, Account read). |
| `CLOUDFLARE_ACCOUNT_ID` | Yes, for deploy workflow | `npx wrangler whoami`, or the Account ID shown in the right-hand sidebar of any dashboard page. |

## Local setup checklist

```bash
cp .dev.vars.example .dev.vars   # then fill in SESSION_SECRET, ADMIN_INIT_TOKEN, ADMIN_PASSWORD
npx wrangler d1 create the-bd-today-db        # paste database_id into wrangler.jsonc
npx wrangler r2 bucket create the-bd-today-media  # paste bucket name into wrangler.jsonc
npm run db:migrate:local
```

## Production setup checklist

```bash
npx wrangler secret put SESSION_SECRET
npx wrangler secret put ADMIN_INIT_TOKEN
npm run db:migrate:remote
npm run deploy
# then create the first admin (see README.md — "First admin account")
# then rotate/delete ADMIN_INIT_TOKEN:
npx wrangler secret put ADMIN_INIT_TOKEN   # overwrite with a fresh random value, or
npx wrangler secret delete ADMIN_INIT_TOKEN
```

# THE BD TODAY

A professional Bengali/English news publishing platform with a complete CMS
and admin dashboard — public news portal plus editorial backend, deployed
on Cloudflare Workers.

**Stack:** React 18 + React Router + Tailwind CSS (public site & admin) ·
Hono on Cloudflare Workers (API) · Cloudflare D1 (SQLite database) ·
Cloudflare R2 (media storage) · Zod (validation) · Vite + Wrangler.

## Features

- **Public portal:** masthead with live date, breaking-news ticker, featured
  hero article, news grid, latest-news sidebar, category sections, trending
  & most-read lists, newsletter signup, article pages with SEO meta +
  JSON-LD, sitemap, RSS feed.
- **Admin CMS:** dashboard, analytics, article create/edit, drafts,
  scheduled publishing (cron), categories, tags, media library, authors,
  users, comment moderation, SEO manager, site settings, navigation,
  audit logs.
- **Content model:** users, sessions, categories, articles, tags,
  article_tags, media, comments, settings, navigation,
  newsletter_subscribers, audit_logs. Categories: Bangladesh,
  International, Politics, Economy, Sports, Technology, Entertainment,
  Education, Lifestyle.

## Project structure

```
the-bd-today/
├── src/
│   ├── client/          # Public site (React SPA, Vite root)
│   ├── admin/           # Admin dashboard (React, same Vite build)
│   ├── server/          # Hono Worker: index.ts, routes/, auth, cron
│   └── shared/          # Code used by client + server + tests:
│       ├── utils.ts     # slugify, reading time, API envelope
│       ├── validation.ts# Zod schemas for every request body
│       └── seo.ts       # OG/Twitter tags, JSON-LD, meta descriptions
├── migrations/          # D1 migrations (NNNN_description.sql)
├── public/              # Static files (robots.txt, favicon)
├── tests/               # Vitest suites (smoke, seo, validation)
├── wrangler.jsonc       # Worker, D1, R2, cron, assets config
├── vite.config.ts       # React plugin; /api proxied to :8787 in dev
├── tailwind.config.js   # Navy/red brand theme, Bengali fonts
├── ENVIRONMENT.md       # Every env var/secret and how to obtain it
└── .github/workflows/   # ci.yml (PR checks), deploy.yml (deploy on main)
```

## Prerequisites

- Node.js 20+ (Node 22+ recommended; `node --version`)
- npm (ships with Node)
- A Cloudflare account (free tier works)
- Wrangler CLI (installed as a devDependency; run via `npx wrangler`)
- GitHub repository (only needed for the deploy workflow)

## Setup

```bash
git clone <repo-url> the-bd-today
cd the-bd-today
npm install
cp .dev.vars.example .dev.vars   # fill in SESSION_SECRET, ADMIN_INIT_TOKEN, ADMIN_PASSWORD
```

### Cloudflare resources

```bash
npx wrangler login
npx wrangler d1 create the-bd-today-db
# → copy the printed database_id into wrangler.jsonc (d1_databases[0].database_id)

npx wrangler r2 bucket create the-bd-today-media
# → the name you chose is the bucket_name in wrangler.jsonc (r2_buckets[0])
```

No real Cloudflare IDs are committed — `wrangler.jsonc` ships with
`<YOUR_D1_DATABASE_ID>` and `<YOUR_R2_BUCKET_NAME>` placeholders. See
`ENVIRONMENT.md` for where to find each value.

### Database

```bash
npm run db:migrate:local    # wrangler d1 migrations apply --local
npm run db:migrate:remote   # wrangler d1 migrations apply --remote (production)
# Seed data is in migrations/0002_seed.sql — applied by the migrate commands above
```

### Secrets

```bash
npx wrangler secret put SESSION_SECRET
npx wrangler secret put ADMIN_INIT_TOKEN
```

## First admin account

The first admin is created by a one-time bootstrap endpoint that only works
while the `users` table is empty:

```bash
curl -X POST https://<your-worker>.workers.dev/api/v1/auth/init \
  -H 'Content-Type: application/json' \
  -d '{
    "token": "<ADMIN_INIT_TOKEN>",
    "email": "admin@thebdtoday.com",
    "name": "Editor-in-Chief",
    "password": "<a-strong-password-12+-chars>"
  }'
```

Then sign in at `/admin` with that email and password. After the first
admin exists, rotate or delete `ADMIN_INIT_TOKEN`
(`npx wrangler secret put ADMIN_INIT_TOKEN` with a fresh random value, or
`npx wrangler secret delete ADMIN_INIT_TOKEN`) — the endpoint refuses to
run again once any user exists.

## Local development

Run the frontend and the Worker in two terminals:

```bash
npm run dev           # Vite dev server — http://localhost:5173 (proxies /api → :8787)
npm run dev:worker    # Wrangler dev — Worker API on http://localhost:8787
```

`wrangler dev` reads `.dev.vars` automatically and applies local D1
migrations state. The Vite proxy means the SPA can call relative `/api/*`
URLs in dev exactly as it does in production.

## Production deploy

```bash
npm run deploy        # npm run build && wrangler deploy
# or: npx wrangler deploy
```

Deploy is also automated: pushing to `main` runs
`.github/workflows/deploy.yml`, which installs, builds, tests, applies
remote D1 migrations, then deploys. It needs the repository secrets
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` (see `ENVIRONMENT.md`).
Pull requests run `.github/workflows/ci.yml` instead: typecheck, build,
test — no deploy, no secrets.

### GitHub Workers Builds (alternative to the workflow)

If you prefer Cloudflare's own GitHub integration: dashboard → Workers &
Pages → Create → Connect to Git → pick this repo → build command
`npm run build`, deploy command `npx wrangler deploy`, and set the same
`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` variables. Do not enable
both Workers Builds and the `deploy.yml` workflow for the same branch —
they will race and deploy twice.

### Custom domain

1. Dashboard → Workers & Pages → the-bd-today → Settings → Domains →
   Add a custom domain, e.g. `thebdtoday.com` (and `www.thebdtoday.com`).
2. If the domain's DNS is on Cloudflare, the records are added
   automatically. If DNS is elsewhere, add the CNAME Cloudflare shows you.
3. Set `SITE_URL` in `wrangler.jsonc` → `vars` to the custom domain and
   redeploy, so canonical links, sitemap and OG tags use it.
4. Verify: `curl -I https://thebdtoday.com/sitemap.xml` and
   `https://thebdtoday.com/robots.txt`.

## Rollback

**Worker rollback (fastest):**

```bash
npx wrangler deployments list
npx wrangler rollback <deployment-id>   # or: npx wrangler rollback (latest previous)
```

**Code rollback:**

```bash
git revert <bad-commit-sha>
git push origin main        # deploy.yml redeploys the reverted code
```

**Database rollback:** D1 has no automatic down-migrations. If a deploy
shipped a bad migration, fix forward with a new migration
(`migrations/NNNN_fix.sql` + `npm run db:migrate:remote`); only restore
from a D1 backup (`wrangler d1 export` snapshots) if the data itself is
corrupt, and treat that as a data-loss event — export before any risky
migration.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on :5173 |
| `npm run dev:worker` | Wrangler dev (Worker API) on :8787 |
| `npm run build` | `tsc --noEmit && vite build` → `dist/client` |
| `npm run preview` | Preview the production build locally |
| `npm run test` / `test:watch` | Vitest suites in `tests/` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run deploy` | Build + `wrangler deploy` |
| `npm run db:migrate:local` / `:remote` | Apply D1 migrations |
| `npm run db:seed` | Notes that seed data lives in `migrations/0002_seed.sql` |

## SEO

- `public/robots.txt` and the Worker route `/robots.txt` (disallow
  `/admin`, `/api/`).
- `/sitemap.xml` — homepage, category pages, all published articles
  (max 5000 URLs), served by `src/server/routes/seo.ts`.
- `/rss.xml` — latest 50 published articles.
- `/seo/article/:slug.jsonld` — Schema.org `NewsArticle` JSON-LD.
- Article pages set OG/Twitter tags and JSON-LD via `src/shared/seo.ts`.

## Testing

```bash
npm test
```

Suites in `tests/`: `smoke.test.ts` (slugify, reading time, Zod
validation, API envelope), `seo.test.ts` (OG/Twitter/JSON-LD),
`validation.test.ts` (schema boundaries). All run offline with Vitest —
no Cloudflare credentials needed.

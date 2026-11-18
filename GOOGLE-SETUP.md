# Google Search Console + Google News setup — THE BD TODAY

Live site: **https://www.thebdtoday.online**

This file is the step-by-step checklist for the site owner. Everything under
"Already done in code" is implemented and tested in the repo; the steps below
are the clicks only the owner can do, because they need the owner's Google
account.

## Already done in code (no action needed)

- Canonical domain is `https://www.thebdtoday.online` everywhere
  (`wrangler.jsonc` SITE_URL, sitemap, RSS, robots.txt, OG tags, JSON-LD).
- `/sitemap.xml` — all published articles + category pages.
- `/news-sitemap.xml` (alias `/sitemap-news.xml`) — Google News sitemap:
  only articles published in the **last 48 hours**, with publication name
  `THE BD TODAY` and language `bn`. It is generated live from the database,
  so it empties itself when nothing was published in the last 2 days — that
  is normal. Publish regularly to keep it populated.
- `/robots.txt` — allows crawling, blocks `/admin` and `/api/`, lists both
  sitemaps.
- `/rss.xml` — latest 50 published articles.
- NewsArticle JSON-LD on every article page (headline, image, author,
  dates, keywords) with the publisher logo (`/logo.jpg`).
- NewsMediaOrganization JSON-LD on the homepage and all other pages.
- Search Console verification support via the `GOOGLE_SITE_VERIFICATION`
  secret — see step 1. The Worker serves the HTML verification file AND
  injects the verification meta tag, whichever method you pick.

## Step 1 — Google Search Console: verify ownership

1. Go to https://search.google.com/search-console and sign in with the
   Google account that should own the site.
2. Click **Add property**, choose **URL prefix**, enter
   `https://www.thebdtoday.online`, click Continue.
3. Google shows verification methods. Pick **one**:
   - **HTML file (recommended for this site):** Google gives you a file
     name like `googleAbC123dEf.html`. Copy that exact name, then run:
     ```
     npx wrangler secret put GOOGLE_SITE_VERIFICATION
     ```
     Paste the file name when asked, then redeploy (push to `main` — the
     deploy workflow runs automatically). The Worker will then serve
     `https://www.thebdtoday.online/googleAbC123dEf.html` with the exact
     body Google expects. Back in Search Console, click **Verify**.
   - **HTML tag (alternative):** Google gives you a long token string.
     Set it the same way:
     ```
     npx wrangler secret put GOOGLE_SITE_VERIFICATION
     ```
     Paste the token (not a file name), redeploy, then click **Verify**.
     The Worker injects the meta tag into every page, including the
     homepage.
   - Do **not** use the DNS-record method — the domain's DNS is managed
     by Cloudflare and the other methods above are simpler here.
4. After verification, in Search Console go to **Sitemaps** and submit:
   `https://www.thebdtoday.online/sitemap.xml`
   (Do NOT submit the news sitemap here — it belongs in Publisher Center,
   step 2.)

## Step 2 — Google Publisher Center: Google News

1. Go to https://publishercenter.google.com and sign in with the same
   Google account.
2. Click **Add publication**, enter the publication name `THE BD TODAY`,
   your country/region, and the site URL `https://www.thebdtoday.online`.
   (If the site is not verified in Search Console yet, do step 1 first —
   Publisher Center uses the same verification.)
3. In the publication settings, add the Google News sitemap URL:
   `https://www.thebdtoday.online/news-sitemap.xml`
4. Fill in the publication details (description, logo, categories,
   language: Bengali). The site logo is at
   `https://www.thebdtoday.online/logo.jpg`.
5. Submit for review. Google reviews the publication — inclusion in
   Google News is **not guaranteed** and can take days to weeks. Keep
   publishing fresh Bengali news meanwhile: the news sitemap only lists
   the last 48 hours, so a site that stops publishing disappears from it.

## Things to know

- The seed articles are dated 2026-11-08 to 2026-11-18. They age out of
  the news sitemap 48 hours after publication, so the news sitemap will
  look empty until new articles are published from the admin dashboard.
  The regular sitemap keeps all published articles forever.
- If you change the domain again, update `SITE_URL` in `wrangler.jsonc`
  and redeploy — every sitemap, feed and canonical URL follows it.
- To remove verification later: `npx wrangler secret delete GOOGLE_SITE_VERIFICATION`
  and redeploy.

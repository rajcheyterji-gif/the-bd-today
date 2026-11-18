/**
 * SEO helpers shared by the Worker (sitemap / RSS / JSON-LD injection)
 * and the React clients (document head tags on article pages).
 *
 * Nothing here touches the network or the DOM: callers render the
 * returned values into <meta> tags, <script type="application/ld+json">,
 * or the XML feeds in src/server/routes/seo.ts.
 */
import { absoluteUrl, truncate } from "./utils";

export type ArticleSeoInput = {
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string;
  category: string;
  tags?: string[];
  featuredImageUrl?: string | null;
  authorName?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string[] | null;
};

export type MetaTag = { name?: string; property?: string; content: string };

export const SITE_DEFAULTS = {
  name: "THE BD TODAY",
  tagline: "Bangladesh and world news, first and fastest.",
  locale: "bn_BD",
  twitterHandle: "@thebdtoday",
} as const;

/** Plain-text description for meta tags: explicit SEO text wins, else excerpt, else body. */
export function metaDescription(article: ArticleSeoInput): string {
  const source = article.seoDescription ?? article.excerpt ?? article.content;
  return truncate(source.replace(/<[^>]*>/g, " "), 160);
}

export function articleTitle(article: ArticleSeoInput): string {
  return article.seoTitle ?? article.title;
}

export function articleUrl(siteUrl: string, article: ArticleSeoInput): string {
  return absoluteUrl(siteUrl, `/article/${article.slug}`);
}

/**
 * Resolve a featured-image URL to an absolute https URL for OG/Twitter
 * tags and JSON-LD. Absolute URLs pass through untouched; relative paths
 * (e.g. R2 media served as /api/v1/media-file?key=…) are joined onto the
 * site origin — scrapers reject relative og:image URLs. The admin client
 * normally absolutizes on save already; this is the server-side guarantee
 * for legacy or directly-written rows.
 */
export function resolveImageUrl(siteUrl: string, url: string): string {
  if (url.startsWith("data:")) return url;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("//")) return `https:${url}`;
  return absoluteUrl(siteUrl, url);
}

/** Open Graph + Twitter Card tags for an article page. */
export function articleMetaTags(siteUrl: string, article: ArticleSeoInput): MetaTag[] {
  const url = articleUrl(siteUrl, article);
  const title = articleTitle(article);
  const description = metaDescription(article);
  const tags: MetaTag[] = [
    { property: "og:type", content: "article" },
    { property: "og:site_name", content: SITE_DEFAULTS.name },
    { property: "og:locale", content: SITE_DEFAULTS.locale },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: url },
    { name: "description", content: description },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
  ];
  if (SITE_DEFAULTS.twitterHandle) {
    tags.push({ name: "twitter:site", content: SITE_DEFAULTS.twitterHandle });
  }
  if (article.featuredImageUrl) {
    const image = resolveImageUrl(siteUrl, article.featuredImageUrl);
    tags.push(
      { property: "og:image", content: image },
      { name: "twitter:image", content: image },
    );
  }
  if (article.publishedAt) {
    tags.push({ property: "article:published_time", content: article.publishedAt });
  }
  if (article.updatedAt) {
    tags.push({ property: "article:modified_time", content: article.updatedAt });
  }
  if (article.category) {
    tags.push({ property: "article:section", content: article.category });
  }
  for (const tag of article.seoKeywords ?? article.tags ?? []) {
    tags.push({ property: "article:tag", content: tag });
  }
  return tags;
}

/** Render MetaTag[] to an HTML string for server-rendered / prerendered heads. */
export function renderMetaTags(tags: MetaTag[]): string {
  return tags
    .map((t) => {
      const attr = t.property
        ? `property="${escapeAttr(t.property)}"`
        : `name="${escapeAttr(t.name ?? "")}"`;
      return `<meta ${attr} content="${escapeAttr(t.content)}">`;
    })
    .join("\n");
}

/** Schema.org NewsArticle JSON-LD object for an article page. */
export function articleJsonLd(siteUrl: string, article: ArticleSeoInput): Record<string, unknown> {
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: articleTitle(article),
    description: metaDescription(article),
    mainEntityOfPage: { "@type": "WebPage", "@id": articleUrl(siteUrl, article) },
    articleSection: article.category,
    inLanguage: "bn",
    publisher: {
      "@type": "NewsMediaOrganization",
      name: SITE_DEFAULTS.name,
      url: siteUrl,
      // Google News / rich results want a publisher logo. /logo.jpg is the
      // site's wordmark (the header logo), served from the same origin.
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl(siteUrl, "/logo.jpg"),
      },
    },
  };
  if (article.authorName) {
    jsonLd.author = { "@type": "Person", name: article.authorName };
  }
  if (article.publishedAt) jsonLd.datePublished = article.publishedAt;
  if (article.updatedAt) jsonLd.dateModified = article.updatedAt;
  if (article.featuredImageUrl) {
    jsonLd.image = [resolveImageUrl(siteUrl, article.featuredImageUrl)];
  }
  const keywords = article.seoKeywords ?? article.tags;
  if (keywords && keywords.length > 0) jsonLd.keywords = keywords.join(", ");
  return jsonLd;
}

/** JSON-LD for the homepage / section pages (organisation + website). */
export function siteJsonLd(siteUrl: string): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "NewsMediaOrganization",
    name: SITE_DEFAULTS.name,
    url: siteUrl,
    description: SITE_DEFAULTS.tagline,
    inLanguage: "bn",
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl(siteUrl, "/logo.jpg"),
    },
  };
}

// ---------------------------------------------------------------------------
// Bengali page titles + meta descriptions (home, categories, latest,
// breaking). One source of truth, shared by:
//   - the Worker (server meta injection + bot prerendering), and
//   - the React client (Seo.tsx document titles).
// Titles are full <title> values; descriptions are ~150 chars for Google.

export type PageMeta = { title: string; description: string; nameBn?: string };

export const HOME_PAGE_META: PageMeta = {
  title: "দ্য বিডি টুডে | সর্বশেষ বাংলাদেশ ও বিশ্ব সংবাদ",
  description:
    "বাংলাদেশ ও বিশ্বের সর্বশেষ খবর — রাজনীতি, অর্থনীতি, খেলাধুলা, প্রযুক্তি, বিনোদন ও শিক্ষার সব খবর সবার আগে, বাংলায়।",
};

export const CATEGORY_PAGE_META: Record<string, PageMeta> = {
  bangladesh: {
    title: "বাংলাদেশের খবর | দ্য বিডি টুডে",
    description:
      "ঢাকা থেকে প্রত্যন্ত গ্রাম পর্যন্ত দেশের সব খবর — রাজনীতি, সমাজ, অর্থনীতি ও জনজীবনের সর্বশেষ সংবাদ।",
    nameBn: "বাংলাদেশ",
  },
  international: {
    title: "বিশ্ব সংবাদ | দ্য বিডি টুডে",
    description:
      "বিশ্বজুড়ে ঘটে যাওয়া গুরুত্বপূর্ণ সংবাদ, আন্তর্জাতিক রাজনীতি ও অর্থনীতির সর্বশেষ খবর।",
    nameBn: "আন্তর্জাতিক",
  },
  politics: {
    title: "রাজনীতির খবর | দ্য বিডি টুডে",
    description: "জাতীয় রাজনীতি, নির্বাচন, দল ও নীতিনির্ধারণী খবরের সর্বশেষ আপডেট।",
    nameBn: "রাজনীতি",
  },
  economy: {
    title: "অর্থনীতির খবর | দ্য বিডি টুডে",
    description: "অর্থনীতি, বাণিজ্য, ব্যাংক, শেয়ারবাজার ও রেমিট্যান্সের সর্বশেষ খবর।",
    nameBn: "অর্থনীতি",
  },
  sports: {
    title: "খেলাধুলার খবর | দ্য বিডি টুডে",
    description: "ক্রিকেট, ফুটবলসহ সব খেলার সর্বশেষ খবর, ফলাফল ও বিশ্লেষণ।",
    nameBn: "খেলাধুলা",
  },
  technology: {
    title: "প্রযুক্তির খবর | দ্য বিডি টুডে",
    description: "প্রযুক্তি, স্টার্টআপ, মোবাইল ও ডিজিটাল বাংলাদেশের সর্বশেষ খবর।",
    nameBn: "প্রযুক্তি",
  },
  entertainment: {
    title: "বিনোদনের খবর | দ্য বিডি টুডে",
    description: "চলচ্চিত্র, সংগীত, নাটক ও সংস্কৃতি অঙ্গনের সর্বশেষ খবর।",
    nameBn: "বিনোদন",
  },
  education: {
    title: "শিক্ষার খবর | দ্য বিডি টুডে",
    description: "শিক্ষা, পরীক্ষা, ফলাফল ও শিক্ষাপ্রতিষ্ঠানের সর্বশেষ খবর।",
    nameBn: "শিক্ষা",
  },
  lifestyle: {
    title: "জীবনযাপনের খবর | দ্য বিডি টুডে",
    description: "স্বাস্থ্য, খাবার, ভ্রমণ ও জীবনযাত্রার খবর — সুস্থ ও সুন্দর জীবনের টিপস।",
    nameBn: "জীবনযাপন",
  },
};

export const LATEST_PAGE_META: PageMeta = {
  title: "সর্বশেষ খবর | দ্য বিডি টুডে",
  description: "এই মুহূর্তের সর্বশেষ খবর — দেশ-বিদেশের সব গুরুত্বপূর্ণ সংবাদ এক জায়গায়।",
};

export const BREAKING_PAGE_META: PageMeta = {
  title: "ব্রেকিং নিউজ | দ্য বিডি টুডে",
  description: "এই মুহূর্তের ব্রেকিং নিউজ — ঘটনার সঙ্গে সঙ্গেই সর্বশেষ আপডেট।",
};

/** Bengali title + description for a public path (/, /category/:slug, /latest, /breaking). */
export function pageMeta(path: string): PageMeta {
  const clean = path.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  if (clean === "/") return HOME_PAGE_META;
  if (clean === "/latest") return LATEST_PAGE_META;
  if (clean === "/breaking") return BREAKING_PAGE_META;
  const cat = clean.match(/^\/category\/([^/]+)$/);
  if (cat) {
    const meta = CATEGORY_PAGE_META[decodeURIComponent(cat[1])];
    if (meta) return meta;
    return {
      title: "বিভাগের খবর | দ্য বিডি টুডে",
      description: "দ্য বিডি টুডে-র এই বিভাগের সর্বশেষ খবর।",
    };
  }
  return HOME_PAGE_META;
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

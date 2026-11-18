// SEO wrapper: sets document title, description, Open Graph / Twitter
// meta tags and optional NewsArticle JSON-LD for the current page.

import { useEffect } from "react";

interface SeoProps {
  title?: string;
  description?: string;
  image?: string | null;
  url?: string;
  type?: "website" | "article";
  publishedAt?: string | null;
  updatedAt?: string | null;
  authorName?: string;
  section?: string;
  tags?: string[];
}

const SITE_NAME = "THE BD TODAY";
const DEFAULT_DESC =
  "THE BD TODAY — Bangladesh's trusted source for national, politics, economy, sports, technology and world news, in Bengali and English.";

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  const selector = `meta[${attr}="${key}"]`;
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export function Seo({
  title,
  description = DEFAULT_DESC,
  image,
  url,
  type = "website",
  publishedAt,
  updatedAt,
  authorName,
  section,
  tags,
}: SeoProps) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} | Latest Bangladesh News`;
  const pageUrl = url ?? window.location.href;

  useEffect(() => {
    document.title = fullTitle;
    upsertMeta("name", "description", description);
    upsertMeta("property", "og:title", fullTitle);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:type", type === "article" ? "article" : "website");
    upsertMeta("property", "og:site_name", SITE_NAME);
    upsertMeta("property", "og:url", pageUrl);
    upsertMeta("name", "twitter:card", image ? "summary_large_image" : "summary");
    upsertMeta("name", "twitter:title", fullTitle);
    upsertMeta("name", "twitter:description", description);
    if (image) {
      upsertMeta("property", "og:image", image);
      upsertMeta("name", "twitter:image", image);
    }
    if (type === "article" && publishedAt) {
      upsertMeta("property", "article:published_time", publishedAt);
    }
    if (type === "article" && updatedAt) {
      upsertMeta("property", "article:modified_time", updatedAt);
    }
    if (type === "article" && section) {
      upsertMeta("property", "article:section", section);
    }

    const existing = document.head.querySelector("script[data-seo-jsonld]");
    existing?.remove();
    if (type === "article") {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.setAttribute("data-seo-jsonld", "true");
      script.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        headline: title ?? SITE_NAME,
        description,
        image: image ? [image] : undefined,
        datePublished: publishedAt ?? undefined,
        dateModified: updatedAt ?? publishedAt ?? undefined,
        author: authorName
          ? { "@type": "Person", name: authorName }
          : { "@type": "Organization", name: SITE_NAME },
        publisher: {
          "@type": "NewsMediaOrganization",
          name: SITE_NAME,
          url: "https://thebdtoday.com",
        },
        mainEntityOfPage: pageUrl,
        articleSection: section,
        keywords: tags?.join(", "),
      });
      document.head.appendChild(script);
    }
  }, [fullTitle, description, image, pageUrl, type, publishedAt, updatedAt, authorName, section, tags]);

  return null;
}

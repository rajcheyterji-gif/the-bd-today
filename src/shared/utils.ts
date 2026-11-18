/**
 * Shared pure helpers used by both the Worker API and the React clients.
 * No Node / Workers-only APIs here — this module must stay importable
 * from the browser bundle, the Worker, and the test runner.
 */

/** Words-per-minute used for reading-time estimates. */
export const WORDS_PER_MINUTE = 200;

/**
 * Turn an article title into a URL slug.
 *
 * - Latin text is lower-cased and ASCII-normalised (accents stripped).
 * - Bengali (and other non-Latin) letters are kept as-is: a Bengali title
 *   produces a Bengali slug, which browsers percent-encode in the URL.
 *   That is intentional — transliterating Bengali to Latin loses meaning
 *   and is not reversible.
 * - Runs of whitespace / punctuation collapse to a single hyphen.
 */
export function slugify(title: string): string {
  // Fold accents ONLY inside Latin-script runs. Applying NFKD to the
  // whole string would decompose Bengali vowel signs and destroy them,
  // so non-Latin text is left untouched.
  const folded = title.replace(/[A-Za-zÀ-ÖØ-öø-ÿ]+/g, (run) =>
    run.normalize("NFKD").replace(/[\u0300-\u036f]/g, ""),
  );
  const ascii = folded.toLowerCase().trim();
  return ascii
    // \p{M} (combining marks) must be kept: Bengali vowel signs and
    // the hasanta are marks, not letters — without this they become "-".
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

/** Count words in plain text or HTML-stripped article body. */
export function countWords(text: string): number {
  const stripped = text
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z]+;/gi, " ");
  const words = stripped.trim().split(/\s+/).filter(Boolean);
  return stripped.trim() === "" ? 0 : words.length;
}

/**
 * Estimated reading time in whole minutes, minimum 1 for any non-empty
 * body, 0 for an empty body.
 */
export function readingTimeMinutes(text: string): number {
  const words = countWords(text);
  if (words === 0) return 0;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

/** Human label, e.g. "4 min read" / "1 min read". */
export function readingTimeLabel(text: string): string {
  const minutes = readingTimeMinutes(text);
  return `${minutes} min read`;
}

/** Truncate text to `max` characters without cutting a word in half. */
export function truncate(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ") || max - 1).trimEnd()}…`;
}

/** Absolute URL helper: joins the site origin with a path. */
export function absoluteUrl(siteUrl: string, path: string): string {
  const base = siteUrl.replace(/\/+$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}

/**
 * Ask Wikimedia Commons for a narrower render of a photo.
 *
 * Article photos are thumb.wikimedia.org URLs carrying the pixel width in
 * the last path segment (…/1280px-Name.jpg). A 120px thumbnail was
 * downloading the full 1280px file; requesting a narrower render makes
 * the server downscale it, so phones fetch a fraction of the bytes
 * (measured on live seed photos: 250px is ~91–94% smaller than 1280px,
 * 330px ~86–90%, 500px ~80%, 960px ~35–39%).
 *
 * Wikimedia only serves a fixed whitelist of thumbnail widths and
 * answers 400 ("Use thumbnail sizes listed on https://w.wiki/GHai") for
 * anything else — arbitrary widths like 320/640/800 break every photo.
 * The requested width is therefore snapped UP to the smallest standard
 * step that covers it, so no caller can ever build a broken URL. Any URL
 * that is not a thumb.wikimedia.org render (R2 /media-file links,
 * absolute uploads, …) passes through unchanged, and a missing URL stays
 * missing.
 */
const STANDARD_WIDTHS = [20, 40, 60, 120, 250, 330, 500, 960, 1280, 1920, 3840];

export function thumbUrl(
  url: string | undefined | null,
  width: number,
): string | undefined {
  if (!url) return undefined;
  const match = url.match(/^(https:\/\/thumb\.wikimedia\.org\/.*\/)\d+px-([^/]+)$/);
  if (!match) return url;
  const step = STANDARD_WIDTHS.find((w) => w >= width) ?? 3840;
  return `${match[1]}${step}px-${match[2]}`;
}

// ---------------------------------------------------------------------------
// Backend additions (appended by the backend builder; existing helpers
// above are unchanged). These are the contract helpers the Worker API
// relies on: Bengali dates, HTML sanitizing, excerpts, reading time.
// ---------------------------------------------------------------------------

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

/** Convert ASCII digits in a string to Bengali digits. */
export function toBengaliDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
}

/** Format a date in Bengali (bn-BD locale, Asia/Dhaka) with Bengali digits. */
export function formatDateBn(
  date: string | Date,
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("bn-BD", {
    timeZone: "Asia/Dhaka",
    day: "numeric",
    month: "long",
    year: "numeric",
    ...options,
  }).format(d);
}

/** Short Bengali date, e.g. "১৮ নভেম্বর, ২০২৬". */
export function formatDateBnShort(date: string | Date): string {
  return formatDateBn(date);
}

/** Bengali date + time, e.g. "১৮ নভেম্বর, ২০২৬, বিকাল ৩:৩০". */
export function formatDateTimeBn(date: string | Date): string {
  return formatDateBn(date, { hour: "numeric", minute: "2-digit" });
}

/** Strip all HTML tags, leaving plain text. */
export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Estimated reading time in whole minutes (200 wpm). Contract alias of
 * readingTimeMinutes; the stored `reading_time_minutes` clamps to >= 1.
 */
export function readingTime(content: string): number {
  return readingTimeMinutes(content);
}

/** Plain-text excerpt, truncated to `length` chars without cutting a word. */
export function excerpt(content: string, length = 160): string {
  return truncate(stripHtml(content), length);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

// ---------------------------------------------------------------------------
// HTML sanitizer (allowlist, no DOMPurify / no DOM dependency)
// ---------------------------------------------------------------------------

const ALLOWED_TAGS: Record<string, string[]> = {
  p: [], br: [], strong: [], b: [], em: [], i: [], u: [], s: [], del: [],
  sub: [], sup: [], span: [], div: [],
  a: ["href", "title"],
  ul: [], ol: [], li: [],
  h1: [], h2: [], h3: [], h4: [], h5: [], h6: [],
  blockquote: [],
  img: ["src", "alt", "title", "width", "height"],
  figure: [], figcaption: [],
  code: [], pre: [], hr: [],
  table: [], thead: [], tbody: [], tr: [], th: [], td: [],
};

const VOID_TAGS = new Set(["br", "hr", "img"]);

/** Tags whose entire element (including inner content) is dropped. */
const DROP_WITH_CONTENT =
  /<(script|style|iframe|object|embed|form|input|button|select|textarea|link|meta|title|noscript|template)[\s>][\s\S]*?<\/\1\s*>|<(script|style|iframe|object|embed|form|input|button|select|textarea|link|meta|title|noscript|template)\b[^>]*\/?>/gi;

function isSafeUrl(value: string, attr: "href" | "src"): boolean {
  const v = value.trim().toLowerCase();
  if (attr === "href") {
    return (
      v.startsWith("http://") ||
      v.startsWith("https://") ||
      v.startsWith("mailto:") ||
      v.startsWith("tel:") ||
      v.startsWith("/") ||
      v.startsWith("#")
    );
  }
  return v.startsWith("http://") || v.startsWith("https://") || v.startsWith("/");
}

function escapeAttrValue(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Sanitize editor HTML with a strict tag/attribute allowlist.
 * - Drops script/style/iframe/form etc. including their content.
 * - Drops disallowed tags but keeps their inner text.
 * - Drops all attributes except the allowlisted ones (no on* handlers,
 *   no style, no javascript: / data: URLs).
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return "";
  let html = dirty.replace(/<!--[\s\S]*?-->/g, "");
  html = html.replace(DROP_WITH_CONTENT, "");

  return html.replace(
    /<\/?([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^>]*?)?)\s*\/?>/g,
    (match, rawTag: string, rawAttrs: string) => {
      const tag = rawTag.toLowerCase();
      const allowedAttrs = ALLOWED_TAGS[tag];
      if (!allowedAttrs) return ""; // drop tag, keep inner text
      const isClosing = match.startsWith("</");
      if (isClosing) return VOID_TAGS.has(tag) ? "" : `</${tag}>`;

      let attrs = "";
      if (rawAttrs) {
        const attrRe = /([a-zA-Z][a-zA-Z0-9-]*)\s*=\s*("[^"]*"|'[^']*'|[^\s"'=<>`]+)/g;
        let m: RegExpExecArray | null;
        while ((m = attrRe.exec(rawAttrs)) !== null) {
          const name = m[1].toLowerCase();
          if (!allowedAttrs.includes(name)) continue;
          let value = m[2];
          if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
          ) {
            value = value.slice(1, -1);
          }
          if ((name === "href" || name === "src") && !isSafeUrl(value, name)) continue;
          attrs += ` ${name}="${escapeAttrValue(value)}"`;
        }
      }
      // External links open safely; internal links untouched.
      if (tag === "a" && /href="https?:\/\//.test(attrs)) {
        attrs += ' rel="noopener noreferrer"';
      }
      return VOID_TAGS.has(tag) ? `<${tag}${attrs}>` : `<${tag}${attrs}>`;
    },
  );
}

// ---------------------------------------------------------------------------
// API envelope — every /api/v1 response uses this shape so clients can rely
// on it. See tests/smoke.test.ts.
// ---------------------------------------------------------------------------

export type ApiSuccess<T> = {
  success: true;
  data: T;
  // Paginated lists attach this; see Pagination in src/shared/types.ts.
  pagination?: Pagination;
};

export type ApiError = {
  success: false;
  error: { code: string; message: string; details?: unknown };
};

export type ApiEnvelope<T> = ApiSuccess<T> | ApiError;

/** Pagination block — field names match `Pagination` in src/shared/types.ts. */
export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export function ok<T>(data: T, pagination?: Pagination): ApiSuccess<T> {
  return pagination === undefined ? { success: true, data } : { success: true, data, pagination };
}

export function fail(
  code: string,
  message: string,
  details?: unknown,
): ApiError {
  return details === undefined
    ? { success: false, error: { code, message } }
    : { success: false, error: { code, message, details } };
}

export function paginationMeta(
  page: number,
  limit: number,
  total: number,
): Pagination {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

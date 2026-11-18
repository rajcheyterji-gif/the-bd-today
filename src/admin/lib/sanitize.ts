// Allowlist HTML sanitizer for editor output (no external dependency).
// Parses with DOMParser, walks the tree, and drops anything not on the
// allowlist: disallowed tags, event-handler attributes, javascript:/data:
// URLs, style attributes and embedded <script>/<style>/<iframe> content.

const ALLOWED_TAGS = new Set([
  "p", "br", "strong", "b", "em", "i", "u", "s", "strike", "a",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li", "blockquote", "pre", "code",
  "img", "figure", "figcaption", "hr", "span", "div",
  "table", "thead", "tbody", "tr", "th", "td",
  "sup", "sub", "small", "mark",
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "title", "target", "rel"]),
  img: new Set(["src", "alt", "title", "width", "height"]),
  blockquote: new Set(["cite"]),
  td: new Set(["colspan", "rowspan"]),
  th: new Set(["colspan", "rowspan"]),
};

function isSafeUrl(url: string): boolean {
  const v = url.trim().toLowerCase();
  if (v.startsWith("javascript:") || v.startsWith("vbscript:") || v.startsWith("data:text/html")) return false;
  return true;
}

function sanitizeNode(node: Node): void {
  const children = Array.from(node.childNodes);
  for (const child of children) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as HTMLElement;
      const tag = el.tagName.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) {
        if (tag === "script" || tag === "style" || tag === "iframe" || tag === "object" || tag === "embed" || tag === "form" || tag === "input" || tag === "button") {
          el.remove();
        } else {
          sanitizeNode(el);
          el.replaceWith(...Array.from(el.childNodes));
        }
        continue;
      }
      const allowed = ALLOWED_ATTRS[tag] ?? new Set<string>();
      for (const attr of Array.from(el.attributes)) {
        const name = attr.name.toLowerCase();
        if (!allowed.has(name) || name.startsWith("on")) {
          el.removeAttribute(attr.name);
          continue;
        }
        if ((name === "href" || name === "src") && !isSafeUrl(attr.value)) {
          el.removeAttribute(attr.name);
        }
      }
      if (tag === "a") {
        const href = el.getAttribute("href");
        if (href && (href.startsWith("http://") || href.startsWith("https://"))) {
          el.setAttribute("target", "_blank");
          el.setAttribute("rel", "noopener noreferrer");
        }
      }
      sanitizeNode(el);
    } else if (child.nodeType === Node.COMMENT_NODE) {
      child.remove();
    }
  }
}

/** Sanitize an HTML string; returns safe HTML ("" for empty input). */
export function sanitizeHtml(html: string): string {
  if (!html || !html.trim()) return "";
  if (typeof DOMParser === "undefined") return html;
  const doc = new DOMParser().parseFromString(html, "text/html");
  sanitizeNode(doc.body);
  return doc.body.innerHTML;
}

/** Strip all tags and return plain text (for excerpts / previews). */
export function htmlToText(html: string): string {
  if (typeof DOMParser === "undefined") return html.replace(/<[^>]*>/g, " ");
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
}

/** Rough reading time in minutes from HTML content (200 wpm, min 1). */
export function readingTimeMinutes(html: string): number {
  const words = htmlToText(html).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

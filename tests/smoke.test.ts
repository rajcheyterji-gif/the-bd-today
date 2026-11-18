/**
 * Smoke tests — run with `npm test` (vitest).
 * Covers the shared helpers every other layer depends on: slugify,
 * reading time, Zod validation, and the API envelope shape.
 */
import { describe, expect, it } from "vitest";
import {
  articleInputSchema,
  commentInputSchema,
  initAdminSchema,
  loginSchema,
  newsletterSubscribeSchema,
} from "../src/shared/validation";
import {
  fail,
  ok,
  paginationMeta,
  readingTimeLabel,
  readingTimeMinutes,
  sanitizeHtml,
  slugify,
  stripHtml,
} from "../src/shared/utils";

describe("slugify", () => {
  it("lower-cases and hyphenates Latin titles", () => {
    expect(slugify("Bangladesh Wins The Series!")).toBe("bangladesh-wins-the-series");
  });

  it("collapses punctuation and repeated separators", () => {
    expect(slugify("  Economy  &  Growth — 2026  ")).toBe("economy-growth-2026");
  });

  it("strips Latin accents", () => {
    expect(slugify("Café Culture in Dhaka")).toBe("cafe-culture-in-dhaka");
  });

  it("keeps Bengali letters in the slug (percent-encoded by browsers)", () => {
    expect(slugify("বাংলাদেশের অর্থনীতি")).toBe("বাংলাদেশের-অর্থনীতি");
  });

  it("returns an empty slug for punctuation-only input", () => {
    expect(slugify("!!!")).toBe("");
  });
});

describe("reading time", () => {
  it("estimates 1 minute for a short article", () => {
    expect(readingTimeMinutes("word ".repeat(50))).toBe(1);
    expect(readingTimeLabel("word ".repeat(50))).toBe("1 min read");
  });

  it("rounds up at 200 words per minute", () => {
    expect(readingTimeMinutes("word ".repeat(400))).toBe(2);
    expect(readingTimeMinutes("word ".repeat(401))).toBe(3);
  });

  it("returns 0 for an empty body and strips HTML before counting", () => {
    expect(readingTimeMinutes("")).toBe(0);
    expect(readingTimeMinutes("<p>hello</p> <p>world</p>")).toBe(1);
  });
});

describe("Zod validation", () => {
  const validArticle = {
    title: "Test article",
    content: "Body text.",
    category: "Bangladesh",
  };

  it("accepts a minimal valid article and applies defaults", () => {
    const parsed = articleInputSchema.parse(validArticle);
    expect(parsed.status).toBe("draft");
    expect(parsed.tags).toEqual([]);
    expect(parsed.isBreaking).toBe(false);
  });

  it("rejects an article with an unknown category", () => {
    const result = articleInputSchema.safeParse({ ...validArticle, category: "Gossip" });
    expect(result.success).toBe(false);
  });

  it("rejects an article with an empty title or content", () => {
    expect(articleInputSchema.safeParse({ ...validArticle, title: "" }).success).toBe(false);
    expect(articleInputSchema.safeParse({ ...validArticle, content: "" }).success).toBe(false);
  });

  it("rejects a comment with an invalid email", () => {
    const result = commentInputSchema.safeParse({
      articleId: 42,
      authorName: "Reader",
      authorEmail: "not-an-email",
      content: "Nice story.",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a newsletter signup with an invalid email", () => {
    expect(newsletterSubscribeSchema.safeParse({ email: "x" }).success).toBe(false);
    expect(newsletterSubscribeSchema.safeParse({ email: "reader@example.com" }).success).toBe(true);
  });

  it("requires a 12+ character password and a token for admin init", () => {
    expect(
      initAdminSchema.safeParse({
        token: "abc",
        email: "admin@thebdtoday.com",
        name: "Admin",
        password: "short",
      }).success,
    ).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
  });
});

describe("sanitizeHtml", () => {
  it("keeps formatting tags and drops script/iframe tags", () => {
    const out = sanitizeHtml('<p>Hello <strong>world</strong></p><script>alert(1)</script><iframe src="x"></iframe>');
    expect(out).toBe("<p>Hello <strong>world</strong></p>");
  });

  it("strips event handlers and javascript: URLs", () => {
    const out = sanitizeHtml('<a href="javascript:alert(1)" onclick="evil()">click</a>');
    expect(out).not.toContain("javascript:");
    expect(out).not.toContain("onclick");
    expect(out).toContain("click");
  });

  it("keeps safe links and forces rel noopener", () => {
    const out = sanitizeHtml('<a href="https://example.com">x</a>');
    expect(out).toContain('href="https://example.com"');
    expect(out).toContain('rel="noopener noreferrer"');
  });

  it("stripHtml returns plain text", () => {
    expect(stripHtml("<p>Hello <b>world</b></p>")).toBe("Hello world");
  });
});

describe("API envelope", () => {
  it("ok() always carries success:true and the data", () => {
    const envelope = ok({ id: 1 });
    expect(envelope.success).toBe(true);
    expect(envelope.data).toEqual({ id: 1 });
  });

  it("fail() always carries success:false with code and message", () => {
    const envelope = fail("NOT_FOUND", "Article not found");
    expect(envelope.success).toBe(false);
    if (!envelope.success) {
      expect(envelope.error.code).toBe("NOT_FOUND");
      expect(envelope.error.message).toBe("Article not found");
    }
  });

  it("paginationMeta computes totalPages", () => {
    expect(paginationMeta(2, 20, 45)).toEqual({
      page: 2,
      limit: 20,
      total: 45,
      totalPages: 3,
    });
    expect(paginationMeta(1, 20, 0).totalPages).toBe(1);
  });
});

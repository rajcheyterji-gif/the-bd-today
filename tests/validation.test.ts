/**
 * Validation tests — run with `npm test` (vitest).
 * Boundary cases for every request schema in src/shared/validation.ts.
 * These are the rules the Worker enforces before any D1 write.
 */
import { describe, expect, it } from "vitest";
import {
  articleInputSchema,
  articleUpdateSchema,
  categoryInputSchema,
  commentInputSchema,
  initAdminSchema,
  loginSchema,
  newsletterSubscribeSchema,
  paginationSchema,
  slugSchema,
} from "../src/shared/validation";

describe("slugSchema", () => {
  it("accepts lowercase Latin and Bengali slugs", () => {
    expect(slugSchema.safeParse("bangladesh-economy-2026").success).toBe(true);
    expect(slugSchema.safeParse("বাংলাদেশের-অর্থনীতি").success).toBe(true);
  });

  it("rejects uppercase, spaces, underscores and double hyphens", () => {
    for (const bad of ["Hello World", "hello_world", "hello--world", "-hello", "hello-"]) {
      expect(slugSchema.safeParse(bad).success).toBe(false);
    }
  });
});

describe("articleInputSchema boundaries", () => {
  const base = { title: "T", content: "B", category: "Sports" as const };

  it("caps title at 300 chars and tags at 20", () => {
    expect(articleInputSchema.safeParse({ ...base, title: "x".repeat(301) }).success).toBe(false);
    expect(
      articleInputSchema.safeParse({ ...base, tags: Array.from({ length: 21 }, (_, i) => `t${i}`) })
        .success,
    ).toBe(false);
  });

  it("accepts a scheduled article only with a valid ISO datetime", () => {
    expect(
      articleInputSchema.safeParse({
        ...base,
        status: "scheduled",
        scheduledAt: "2026-11-20T09:00:00.000Z",
      }).success,
    ).toBe(true);
    expect(
      articleInputSchema.safeParse({ ...base, status: "scheduled", scheduledAt: "tomorrow" })
        .success,
    ).toBe(false);
  });

  it("rejects an unknown status", () => {
    expect(articleInputSchema.safeParse({ ...base, status: "deleted" }).success).toBe(false);
  });
});

describe("articleUpdateSchema", () => {
  it("requires a UUID id and allows partial updates", () => {
    expect(articleUpdateSchema.safeParse({ id: "not-a-number" }).success).toBe(false);
    expect(articleUpdateSchema.safeParse({ id: -1 }).success).toBe(false);
    const parsed = articleUpdateSchema.safeParse({
      id: 7,
      title: "New title",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.title).toBe("New title");
  });
});

describe("categoryInputSchema", () => {
  it("requires a name and a valid slug", () => {
    expect(categoryInputSchema.safeParse({ name: "", slug: "x" }).success).toBe(false);
    expect(
      categoryInputSchema.safeParse({ name: "Sports", slug: "sports" }).success,
    ).toBe(true);
  });
});

describe("commentInputSchema", () => {
  it("caps comment bodies at 2000 characters", () => {
    expect(
      commentInputSchema.safeParse({
        articleId: 7,
        authorName: "Reader",
        authorEmail: "reader@example.com",
        content: "x".repeat(2001),
      }).success,
    ).toBe(false);
  });
});

describe("auth schemas", () => {
  it("login requires a valid email and a non-empty password", () => {
    expect(loginSchema.safeParse({ email: "not-email", password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.com", password: "secret" }).success).toBe(true);
  });

  it("init requires a 12+ character admin password", () => {
    const base = {
      token: "tok",
      email: "admin@thebdtoday.com",
      name: "Admin",
    };
    expect(initAdminSchema.safeParse({ ...base, password: "short-pass" }).success).toBe(false);
    expect(initAdminSchema.safeParse({ ...base, password: "twelve-chars!" }).success).toBe(true);
  });
});

describe("newsletter + pagination", () => {
  it("accepts a valid subscriber email", () => {
    expect(newsletterSubscribeSchema.safeParse({ email: "fan@example.com" }).success).toBe(true);
  });

  it("defaults page to 1 / pageSize to 20 and caps pageSize at 100", () => {
    const parsed = paginationSchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.pageSize).toBe(20);
    expect(paginationSchema.safeParse({ pageSize: 101 }).success).toBe(false);
    expect(paginationSchema.parse({ page: "3", pageSize: "10" })).toEqual({
      page: 3,
      pageSize: 10,
    });
  });
});

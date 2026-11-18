// Public category routes: GET /api/v1/categories, GET /api/v1/categories/:slug.
// Mounted at /api/v1/categories. Admin CRUD lives in routes/admin.ts.
import { Hono } from "hono";
import type { Env } from "../env";
import type { SessionUser } from "../../shared/types";
import { getCategoryBySlug, listCategories } from "../services/categories";
import { cachedJson, getDefaultCache, getWaitUntil } from "../lib/cache";

type CategoriesEnv = { Bindings: Env; Variables: { user: SessionUser } };

const categories = new Hono<CategoriesEnv>();

// Categories change rarely (admin edits only): cache 5 minutes with a
// 10-minute stale window, Worker Cache API + edge alike.
const TTL_MS = 300_000;
const SWR_MS = 600_000;
const CACHE_CONTROL = "public, max-age=300, stale-while-revalidate=600";

categories.get("/", async (c) => {
  const cached = await cachedJson({
    cache: getDefaultCache(),
    key: c.req.url,
    ttlMs: TTL_MS,
    swrMs: SWR_MS,
    waitUntil: getWaitUntil(c),
    load: async () => ({ success: true as const, data: await listCategories(c.env.DB) }),
  });
  c.header("Cache-Control", CACHE_CONTROL);
  return c.json(cached.value);
});

categories.get("/:slug", async (c) => {
  const cached = await cachedJson({
    cache: getDefaultCache(),
    key: c.req.url,
    ttlMs: TTL_MS,
    swrMs: SWR_MS,
    waitUntil: getWaitUntil(c),
    load: async () => {
      const category = await getCategoryBySlug(c.env.DB, c.req.param("slug"));
      if (!category) return null;
      return { success: true as const, data: category };
    },
  });
  if (!cached.value) {
    return c.json(
      { success: false, error: { code: "NOT_FOUND", message: "Category not found" } },
      404,
    );
  }
  c.header("Cache-Control", CACHE_CONTROL);
  return c.json(cached.value);
});

export default categories;

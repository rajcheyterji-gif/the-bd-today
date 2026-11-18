// Public category routes: GET /api/v1/categories, GET /api/v1/categories/:slug.
// Mounted at /api/v1/categories. Admin CRUD lives in routes/admin.ts.
import { Hono } from "hono";
import type { Env } from "../env";
import type { SessionUser } from "../../shared/types";
import { ok } from "../lib/response";
import { getCategoryBySlug, listCategories } from "../services/categories";

type CategoriesEnv = { Bindings: Env; Variables: { user: SessionUser } };

const categories = new Hono<CategoriesEnv>();

categories.get("/", async (c) => {
  return ok(c, await listCategories(c.env.DB));
});

categories.get("/:slug", async (c) => {
  const category = await getCategoryBySlug(c.env.DB, c.req.param("slug"));
  if (!category) {
    return c.json(
      { success: false, error: { code: "NOT_FOUND", message: "Category not found" } },
      404,
    );
  }
  return ok(c, category);
});

export default categories;

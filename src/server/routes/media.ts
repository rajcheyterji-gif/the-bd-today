// Admin media routes: GET /api/v1/admin/media, POST (multipart upload),
// DELETE /api/v1/admin/media/:id. Mounted at /api/v1/admin/media.
// Staff only (admin / editor); CSRF enforced by the admin router's
// middleware in routes/admin.ts — but this router is mounted separately,
// so it enforces auth + role + CSRF itself.
import { Hono } from "hono";
import type { Env } from "../env";
import type { SessionUser } from "../../shared/types";
import { ok, paginationMeta, paginationParams } from "../lib/response";
import { csrfProtection, getClientIp, requireRole } from "../middleware/auth";
import { recordAuditLog } from "../services/auth";
import { deleteMedia, listMedia, uploadMedia } from "../services/media";

type MediaEnv = { Bindings: Env; Variables: { user: SessionUser } };

const media = new Hono<MediaEnv>();

media.use(requireRole("admin", "editor"));
media.use(async (c, next) => {
  if (c.req.method !== "GET") return csrfProtection(c, next);
  await next();
});

media.get("/", async (c) => {
  const { page, limit } = paginationParams(c);
  const { items, total } = await listMedia(c.env.DB, page, limit);
  return ok(c, items, 200, paginationMeta(total, page, limit));
});

media.post("/", async (c) => {
  const form = await c.req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return c.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Form field 'file' is required" } },
      400,
    );
  }
  const altText = form?.get("alt_text");
  const item = await uploadMedia(
    c.env.DB,
    c.env,
    file,
    c.var.user.id,
    typeof altText === "string" ? altText : null,
  );
  await recordAuditLog(c.env.DB, {
    userId: c.var.user.id,
    action: "media.upload",
    entityType: "media",
    entityId: item.id,
    details: { filename: item.filename, size: item.size },
    ip: getClientIp(c),
  });
  return ok(c, item, 201);
});

media.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) {
    return c.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid media id" } },
      400,
    );
  }
  await deleteMedia(c.env.DB, c.env, id);
  await recordAuditLog(c.env.DB, {
    userId: c.var.user.id,
    action: "media.delete",
    entityType: "media",
    entityId: id,
    ip: getClientIp(c),
  });
  return ok(c, { deleted: true });
});

export default media;

// Media service — R2 uploads + the `media` table (D1 prepared statements).
import type { Env } from "../env";
import type { MediaItem } from "../../shared/types";
import { HttpError, notFound } from "../lib/errors";
import { nowIso } from "../lib/db";

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_PREFIXES = ["image/", "video/", "audio/"];
const ALLOWED_MIME_EXACT = new Set(["application/pdf"]);

function sanitizeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "file";
  return base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "file";
}

export async function listMedia(
  db: D1Database,
  page: number,
  limit: number,
): Promise<{ items: MediaItem[]; total: number }> {
  const { total } = (await db
    .prepare(`SELECT COUNT(*) AS total FROM media`)
    .first<{ total: number }>()) ?? { total: 0 };
  const { results } = await db
    .prepare(
      `SELECT m.id, m.filename, m.original_name, m.mime_type, m.size, m.r2_key,
              m.url, m.alt_text, m.uploaded_by, u.name AS uploaded_by_name, m.created_at
       FROM media m LEFT JOIN users u ON u.id = m.uploaded_by
       ORDER BY m.created_at DESC LIMIT ? OFFSET ?`,
    )
    .bind(limit, (page - 1) * limit)
    .all<MediaItem>();
  return { items: results ?? [], total };
}

export async function getMediaById(db: D1Database, id: number): Promise<MediaItem | null> {
  const row = await db
    .prepare(
      `SELECT m.id, m.filename, m.original_name, m.mime_type, m.size, m.r2_key,
              m.url, m.alt_text, m.uploaded_by, u.name AS uploaded_by_name, m.created_at
       FROM media m LEFT JOIN users u ON u.id = m.uploaded_by
       WHERE m.id = ? LIMIT 1`,
    )
    .bind(id)
    .first<MediaItem>();
  return row ?? null;
}

export async function uploadMedia(
  db: D1Database,
  env: Env,
  file: File,
  uploadedBy: number,
  altText?: string | null,
): Promise<MediaItem> {
  if (!file || typeof file.arrayBuffer !== "function") {
    throw new HttpError(400, "VALIDATION_ERROR", "No file uploaded");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new HttpError(400, "VALIDATION_ERROR", "File is larger than 10 MB");
  }
  const mime = file.type || "application/octet-stream";
  const allowed =
    ALLOWED_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix)) ||
    ALLOWED_MIME_EXACT.has(mime);
  if (!allowed) {
    throw new HttpError(400, "VALIDATION_ERROR", `File type ${mime} is not allowed`);
  }
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const filename = `${crypto.randomUUID()}-${sanitizeFilename(file.name)}`;
  const r2Key = `media/${yyyy}/${mm}/${filename}`;
  await env.R2_BUCKET.put(r2Key, await file.arrayBuffer(), {
    httpMetadata: { contentType: mime },
  });
  const url = `/api/v1/media-file?key=${encodeURIComponent(r2Key)}`;
  const result = await db
    .prepare(
      `INSERT INTO media (filename, original_name, mime_type, size, r2_key, url, alt_text, uploaded_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      filename,
      file.name,
      mime,
      file.size,
      r2Key,
      url,
      altText ?? null,
      uploadedBy,
      nowIso(),
    )
    .run();
  const created = await getMediaById(db, Number(result.meta?.last_row_id ?? 0));
  if (!created) throw new HttpError(500, "INTERNAL_ERROR", "Media record could not be created");
  return created;
}

export async function deleteMedia(db: D1Database, env: Env, id: number): Promise<void> {
  const item = await getMediaById(db, id);
  if (!item) throw notFound("Media item not found");
  try {
    await env.R2_BUCKET.delete(item.r2_key);
  } catch (err) {
    console.error("R2 delete failed", err);
  }
  await db.prepare(`DELETE FROM media WHERE id = ?`).bind(id).run();
}

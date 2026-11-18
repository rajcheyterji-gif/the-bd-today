// Auth service: PBKDF2-SHA256 password hashing, DB-backed sessions and
// the first-admin bootstrap. WebCrypto only — no Node `crypto` module,
// no Buffer — so this runs on the plain Workers runtime.
import type { Env } from "../env";
import type { SessionUser, UserRole } from "../../shared/types";
import { HttpError, conflict, forbidden } from "../lib/errors";
import { nowIso } from "../lib/db";
import { sha256Hex, signSessionValue, SESSION_TTL_SECONDS } from "../middleware/auth";

const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const KEY_BITS = 256;

const textEncoder = new TextEncoder();

/** base64url (no padding) for random tokens. */
function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Hash a password: `pbkdf2$100000$<base64 salt>$<base64 derived key>`.
 * 100k iterations of PBKDF2-SHA256 with a fresh 16-byte salt per password.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    key,
    KEY_BITS,
  );
  return `pbkdf2$${PBKDF2_ITERATIONS}$${bytesToBase64(salt)}$${bytesToBase64(new Uint8Array(bits))}`;
}

/** Verify a password against a stored `pbkdf2$...` hash. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  // Seed placeholder (see migrations/0002_seed.sql): no real password set.
  if (!stored || stored === "__SET_VIA_INIT__") return false;
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = Number.parseInt(parts[1], 10);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;
  const salt = base64ToBytes(parts[2]);
  const expected = base64ToBytes(parts[3]);
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    key,
    expected.length * 8,
  );
  const actual = new Uint8Array(bits);
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}

export interface UserRow {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  avatar_url: string | null;
  bio: string | null;
}

export async function getUserByEmail(db: D1Database, email: string): Promise<UserRow | null> {
  return db
    .prepare(
      `SELECT id, name, email, password_hash, role, avatar_url, bio
       FROM users WHERE email = ? LIMIT 1`,
    )
    .bind(email.trim().toLowerCase())
    .first<UserRow>();
}

export async function getUserById(db: D1Database, id: number): Promise<UserRow | null> {
  return db
    .prepare(
      `SELECT id, name, email, password_hash, role, avatar_url, bio
       FROM users WHERE id = ? LIMIT 1`,
    )
    .bind(id)
    .first<UserRow>();
}

export function toSessionUser(row: UserRow): SessionUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    avatar_url: row.avatar_url,
    bio: row.bio,
  };
}

export interface CreatedSession {
  /** Signed cookie value: `<token>.<hmac>`. */
  cookieValue: string;
  expiresAt: string;
}

/** Create a session row and return its signed cookie value. */
export async function createSession(
  db: D1Database,
  env: Env,
  userId: number,
  ip: string | null,
  userAgent: string | null,
): Promise<CreatedSession> {
  const token = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const sessionId = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();
  await db
    .prepare(
      `INSERT INTO sessions (id, user_id, expires_at, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(sessionId, userId, expiresAt, ip, userAgent)
    .run();
  return { cookieValue: await signSessionValue(env, token), expiresAt };
}

/** Delete a session by its signed cookie value (no-op when invalid). */
export async function destroySession(db: D1Database, cookieValue: string | undefined): Promise<void> {
  if (!cookieValue) return;
  const token = cookieValue.split(".")[0];
  if (!token) return;
  const sessionId = await sha256Hex(token);
  await db.prepare(`DELETE FROM sessions WHERE id = ?`).bind(sessionId).run();
}

/** Delete all sessions for a user (used on password change / admin action). */
export async function destroyUserSessions(db: D1Database, userId: number): Promise<void> {
  await db.prepare(`DELETE FROM sessions WHERE user_id = ?`).bind(userId).run();
}

/** Best-effort audit log insert — never fails the request that triggered it. */
export async function recordAuditLog(
  db: D1Database,
  entry: {
    userId?: number | null;
    action: string;
    entityType?: string | null;
    entityId?: string | number | null;
    details?: Record<string, unknown> | null;
    ip?: string | null;
  },
): Promise<void> {
  try {
    await db
      .prepare(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        entry.userId ?? null,
        entry.action,
        entry.entityType ?? null,
        entry.entityId === null || entry.entityId === undefined ? null : String(entry.entityId),
        entry.details ? JSON.stringify(entry.details) : null,
        entry.ip ?? null,
      )
      .run();
  } catch (err) {
    console.error("audit log insert failed", err);
  }
}

/**
 * First-admin bootstrap (POST /api/v1/auth/init). Guarded by
 * ADMIN_INIT_TOKEN and only usable while the users table is empty.
 * Body fields fall back to ADMIN_EMAIL / ADMIN_NAME / ADMIN_PASSWORD env.
 */
export async function createFirstAdmin(
  db: D1Database,
  env: Env,
  input: { token: string; email?: string; name?: string; password?: string },
): Promise<SessionUser> {
  if (!env.ADMIN_INIT_TOKEN) {
    throw new HttpError(500, "INIT_NOT_CONFIGURED", "ADMIN_INIT_TOKEN is not configured");
  }
  if (input.token !== env.ADMIN_INIT_TOKEN) {
    throw forbidden("Invalid init token");
  }
  // The seed users carry the placeholder hash '__SET_VIA_INIT__' and can
  // never sign in (verifyPassword rejects it), so they must NOT block
  // first-admin setup: count only users with a real password hash.
  // Before this fix the plain COUNT(*) always saw the 4 seeded users and
  // /auth/init always answered ADMIN_EXISTS in production.
  const { count } = (await db
    .prepare(
      `SELECT COUNT(*) AS count FROM users WHERE password_hash != '__SET_VIA_INIT__'`,
    )
    .first<{ count: number }>()) ?? { count: 0 };
  if (count > 0) {
    throw conflict("ADMIN_EXISTS", "An admin account already exists");
  }
  const email = (input.email ?? env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const name = (input.name ?? env.ADMIN_NAME ?? "Editor-in-Chief").trim();
  const password = input.password ?? env.ADMIN_PASSWORD ?? "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    throw new HttpError(400, "VALIDATION_ERROR", "A valid admin email is required");
  }
  if (!name) {
    throw new HttpError(400, "VALIDATION_ERROR", "An admin name is required");
  }
  if (password.length < 12) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "Admin password must be at least 12 characters",
    );
  }
  const passwordHash = await hashPassword(password);
  const result = await db
    .prepare(
      `INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')`,
    )
    .bind(name, email, passwordHash)
    .run();
  const id = Number(result.meta?.last_row_id ?? 0);
  return { id, name, email, role: "admin", avatar_url: null, bio: null };
}

/** Remove expired sessions (called from the nightly cron). Returns rows removed. */
export async function pruneExpiredSessions(db: D1Database): Promise<number> {
  const result = await db
    .prepare(`DELETE FROM sessions WHERE expires_at <= ?`)
    .bind(nowIso())
    .run();
  return result.meta?.changes ?? 0;
}

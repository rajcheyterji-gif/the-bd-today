// Session auth, RBAC, CSRF and login rate limiting.
//
// Sessions are DB-backed (see the `sessions` table) AND HMAC-signed:
// the cookie value is `<token>.<hmac>`, where the HMAC is computed with
// SESSION_SECRET. A stolen database row alone is useless without the
// secret, and a forged cookie fails the HMAC check before D1 is touched.
// Passwords are PBKDF2-SHA256 via WebCrypto only (see services/auth.ts).
import { getCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import type { MiddlewareHandler } from "hono";
import type { Env } from "../env";
import type { SessionUser, UserRole } from "../../shared/types";
import { nowIso } from "../lib/db";

export const SESSION_COOKIE = "bd_session";
export const CSRF_COOKIE = "bd_csrf";
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

type AuthedContext = {
  Bindings: Env;
  Variables: { user: SessionUser };
};

const textEncoder = new TextEncoder();

/** SHA-256 hex digest (used to store session tokens, never the raw token). */
export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", textEncoder.encode(input));
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** HMAC-SHA256 hex of `token` under SESSION_SECRET. */
export async function hmacHex(secret: string, token: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, textEncoder.encode(token));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time-ish string comparison (length check + XOR fold). */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Read one cookie from a raw Cookie header value. */
export function readCookie(headerValue: string | undefined, name: string): string | undefined {
  if (!headerValue) return undefined;
  for (const part of headerValue.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return undefined;
}
export function parseSignedCookie(value: string | undefined): { token: string; sig: string } | null {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;
  return { token: value.slice(0, dot), sig: value.slice(dot + 1) };
}

/** Verify the HMAC on a signed cookie value. */
export async function verifySignedCookie(env: Env, value: string | undefined): Promise<string | null> {
  const parsed = parseSignedCookie(value);
  if (!parsed) return null;
  const expected = await hmacHex(env.SESSION_SECRET, parsed.token);
  return safeEqual(expected, parsed.sig) ? parsed.token : null;
}

/** Sign a raw session token into its cookie value. */
export async function signSessionValue(env: Env, token: string): Promise<string> {
  return `${token}.${await hmacHex(env.SESSION_SECRET, token)}`;
}

/** Best-effort client IP (CF-Connecting-IP in production, X-Forwarded-For locally). */
export function getClientIp(c: { req: { header: (name: string) => string | undefined } }): string {
  const cf = c.req.header("CF-Connecting-IP");
  if (cf) return cf.trim();
  const forwarded = c.req.header("X-Forwarded-For");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return "unknown";
}

/**
 * Resolve the session user for this request, or null when there is no
 * valid session. Verifies the HMAC first, then looks the hashed token up
 * in the sessions table (joined to users, expiry checked).
 */
export async function getSessionUser(
  c: { env: Env; req: { header: (name: string) => string | undefined } },
): Promise<SessionUser | null> {
  const raw = readCookie(c.req.header("Cookie"), SESSION_COOKIE);
  const token = await verifySignedCookie(c.env, raw);
  if (!token) return null;
  const sessionId = await sha256Hex(token);
  const row = await c.env.DB.prepare(
    `SELECT u.id, u.name, u.email, u.role, u.avatar_url, u.bio
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.id = ? AND s.expires_at > ? LIMIT 1`,
  )
    .bind(sessionId, nowIso())
    .first<{
      id: number;
      name: string;
      email: string;
      role: UserRole;
      avatar_url: string | null;
      bio: string | null;
    }>();
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    avatar_url: row.avatar_url,
    bio: row.bio,
  };
}

/** 401 unless the request carries a valid session; sets c.var.user. */
export const requireAuth: MiddlewareHandler<AuthedContext> = async (c, next) => {
  const user = await getSessionUser(c);
  if (!user) {
    throw new HTTPException(401, { message: "Authentication required" });
  }
  c.set("user", user);
  await next();
};

/** 401 without a session, 403 when the role is not in the allowed list. */
export function requireRole(...roles: UserRole[]): MiddlewareHandler<AuthedContext> {
  return async (c, next) => {
    const user = await getSessionUser(c);
    if (!user) {
      throw new HTTPException(401, { message: "Authentication required" });
    }
    if (!roles.includes(user.role)) {
      throw new HTTPException(403, { message: "Insufficient permissions" });
    }
    c.set("user", user);
    await next();
  };
}

/**
 * Double-submit CSRF protection for mutating admin routes. The login
 * response sets a readable (non-HttpOnly) `bd_csrf` cookie; the client
 * echoes its value in the `X-CSRF-Token` header. The Origin/Referer host
 * must also match the request host when one is sent.
 */
export const csrfProtection: MiddlewareHandler = async (c, next) => {
  const cookieToken = getCookie(c, CSRF_COOKIE);
  const headerToken = c.req.header("X-CSRF-Token");
  if (!cookieToken || !headerToken || !safeEqual(cookieToken, headerToken)) {
    throw new HTTPException(403, { message: "CSRF token missing or invalid" });
  }
  const origin = c.req.header("Origin") ?? c.req.header("Referer");
  if (origin) {
    try {
      const requestHost = new URL(c.req.url).host;
      if (new URL(origin).host !== requestHost) {
        throw new HTTPException(403, { message: "CSRF origin mismatch" });
      }
    } catch (err) {
      if (err instanceof HTTPException) throw err;
      throw new HTTPException(403, { message: "CSRF origin mismatch" });
    }
  }
  await next();
};

// ---------------------------------------------------------------------------
// Login rate limiting (in-memory, per Worker isolate).
//
// NOTE: each Cloudflare isolate keeps its own map, so this is a best-effort
// brake on password guessing, not a distributed counter. 5 failed logins
// per IP per 15 minutes; a successful login clears the counter.
// ---------------------------------------------------------------------------

const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

const loginAttempts = new Map<string, { count: number; resetAt: number }>();

export function isLoginRateLimited(ip: string): boolean {
  const entry = loginAttempts.get(ip);
  if (!entry) return false;
  if (Date.now() > entry.resetAt) {
    loginAttempts.delete(ip);
    return false;
  }
  return entry.count >= LOGIN_MAX_ATTEMPTS;
}

export function recordFailedLogin(ip: string): void {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

export function clearLoginAttempts(ip: string): void {
  loginAttempts.delete(ip);
}

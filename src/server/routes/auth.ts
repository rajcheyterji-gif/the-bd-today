// Auth routes: POST /api/v1/auth/login, POST /logout, GET /me,
// POST /init (first-admin bootstrap). Mounted at /api/v1/auth.
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import type { Env } from "../env";
import type { SessionUser } from "../../shared/types";
import { ok } from "../lib/response";
import { validateBody } from "../middleware/validate";
import {
  CSRF_COOKIE,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  clearLoginAttempts,
  csrfProtection,
  getClientIp,
  getSessionUser,
  isLoginRateLimited,
  recordFailedLogin,
  requireAuth,
} from "../middleware/auth";
import {
  createFirstAdmin,
  createSession,
  destroySession,
  getUserByEmail,
  recordAuditLog,
  toSessionUser,
  verifyPassword,
} from "../services/auth";
import { initAdminSchema, loginSchema } from "../validators/auth";

type AuthEnv = { Bindings: Env; Variables: { user: SessionUser } };

const auth = new Hono<AuthEnv>();

function isHttps(c: { req: { url: string } }): boolean {
  return new URL(c.req.url).protocol === "https:";
}

/** CSRF token: random, readable by JS (double-submit), SameSite=Lax. */
function newCsrfToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

auth.post("/login", async (c) => {
  const ip = getClientIp(c);
  if (isLoginRateLimited(ip)) {
    throw new HTTPException(429, {
      message: "Too many login attempts. Try again in 15 minutes.",
    });
  }
  const body = await validateBody(c, loginSchema);
  const user = await getUserByEmail(c.env.DB, body.email);
  const valid = user !== null && (await verifyPassword(body.password, user.password_hash));
  if (!valid) {
    recordFailedLogin(ip);
    throw new HTTPException(401, { message: "Invalid email or password" });
  }
  // user is non-null here (valid implies user !== null)
  const sessionUser = toSessionUser(user!);
  clearLoginAttempts(ip);
  const session = await createSession(
    c.env.DB,
    c.env,
    sessionUser.id,
    ip,
    c.req.header("User-Agent") ?? null,
  );
  const secure = isHttps(c);
  setCookie(c, SESSION_COOKIE, session.cookieValue, {
    httpOnly: true,
    secure,
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  setCookie(c, CSRF_COOKIE, newCsrfToken(), {
    httpOnly: false,
    secure,
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  await c.env.DB.prepare(`UPDATE users SET last_login_at = ? WHERE id = ?`)
    .bind(new Date().toISOString(), sessionUser.id)
    .run();
  await recordAuditLog(c.env.DB, {
    userId: sessionUser.id,
    action: "auth.login",
    ip,
  });
  return ok(c, { user: sessionUser });
});

auth.post("/logout", csrfProtection, async (c) => {
  const raw = getCookie(c, SESSION_COOKIE);
  const user = await getSessionUser(c).catch(() => null);
  await destroySession(c.env.DB, raw);
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
  deleteCookie(c, CSRF_COOKIE, { path: "/" });
  if (user) {
    await recordAuditLog(c.env.DB, {
      userId: user.id,
      action: "auth.logout",
      ip: getClientIp(c),
    });
  }
  return ok(c, { logged_out: true });
});

auth.get("/me", requireAuth, (c) => {
  return ok(c, { user: c.var.user });
});

auth.post("/init", async (c) => {
  const body = await validateBody(c, initAdminSchema);
  const admin = await createFirstAdmin(c.env.DB, c.env, body);
  await recordAuditLog(c.env.DB, {
    userId: admin.id,
    action: "auth.init_admin",
    details: { email: admin.email },
    ip: getClientIp(c),
  });
  return ok(c, { user: admin }, 201);
});

export default auth;

// Auth tests — run with `npm test` (vitest).
// Covers PBKDF2 hashing (WebCrypto only), the login/logout/me flow, the
// login rate limit, CSRF-protected logout, the first-admin bootstrap,
// and own-profile updates + password changes (PATCH /me, POST /me/password).
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/server/index";
import { hashPassword, verifyPassword } from "../src/server/services/auth";
import {
  cookieHeader,
  createFakeEnv,
  parseSetCookies,
  type FakeUser,
} from "./fake-d1";

const app = createApp();
let adminHash = "";

beforeAll(async () => {
  adminHash = await hashPassword("Test1234!");
});

function adminUser(): FakeUser {
  return {
    id: 1,
    name: "Admin User",
    email: "admin@example.com",
    password_hash: adminHash,
    role: "admin",
    avatar_url: null,
    bio: null,
  };
}

async function login(env: ReturnType<typeof createFakeEnv>) {
  const res = await app.request(
    "/api/v1/auth/login",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@example.com", password: "Test1234!" }),
    },
    env,
  );
  return { res, cookies: parseSetCookies(res) };
}

describe("password hashing (PBKDF2-SHA256, WebCrypto only)", () => {
  it("hashes and verifies a password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash.startsWith("pbkdf2$100000$")).toBe(true);
    expect(await verifyPassword("correct horse battery staple", hash)).toBe(true);
    expect(await verifyPassword("wrong password", hash)).toBe(false);
  });

  it("never verifies the seed placeholder hash", async () => {
    expect(await verifyPassword("anything", "__SET_VIA_INIT__")).toBe(false);
    expect(await verifyPassword("anything", "")).toBe(false);
  });
});

describe("login / me / logout", () => {
  it("rejects a wrong password with 401", async () => {
    const env = createFakeEnv({ users: [adminUser()] });
    const res = await app.request(
      "/api/v1/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "admin@example.com", password: "nope" }),
      },
      env,
    );
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("UNAUTHORIZED");
  });

  it("rejects a login with a missing password (400)", async () => {
    const env = createFakeEnv({ users: [adminUser()] });
    const res = await app.request(
      "/api/v1/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "admin@example.com" }),
      },
      env,
    );
    expect(res.status).toBe(400);
  });

  it("logs in, sets session + CSRF cookies, and /me returns the user", async () => {
    const env = createFakeEnv({ users: [adminUser()] });
    const { res, cookies } = await login(env);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.user.email).toBe("admin@example.com");
    expect(cookies.bd_session).toBeTruthy();
    expect(cookies.bd_csrf).toBeTruthy();

    const me = await app.request(
      "/api/v1/auth/me",
      { method: "GET", headers: { Cookie: cookieHeader(cookies) } },
      env,
    );
    expect(me.status).toBe(200);
    expect((await me.json()).data.user.id).toBe(1);

    // The session also opens the admin dashboard.
    const dashboard = await app.request(
      "/api/v1/admin/dashboard",
      { method: "GET", headers: { Cookie: cookieHeader(cookies) } },
      env,
    );
    expect(dashboard.status).toBe(200);
    expect((await dashboard.json()).data.totals).toBeDefined();
  });

  it("logout clears the session (CSRF-protected) and /me then 401s", async () => {
    const env = createFakeEnv({ users: [adminUser()] });
    const { cookies } = await login(env);
    const logout = await app.request(
      "/api/v1/auth/logout",
      {
        method: "POST",
        headers: {
          Cookie: cookieHeader(cookies),
          "X-CSRF-Token": cookies.bd_csrf,
        },
      },
      env,
    );
    expect(logout.status).toBe(200);
    const me = await app.request(
      "/api/v1/auth/me",
      { method: "GET", headers: { Cookie: cookieHeader(cookies) } },
      env,
    );
    expect(me.status).toBe(401);
  });

  it("logout without a CSRF token is rejected", async () => {
    const env = createFakeEnv({ users: [adminUser()] });
    const { cookies } = await login(env);
    const logout = await app.request(
      "/api/v1/auth/logout",
      { method: "POST", headers: { Cookie: cookieHeader(cookies) } },
      env,
    );
    expect(logout.status).toBe(403);
  });
});

describe("login rate limiting", () => {
  it("blocks the 6th failed login from one IP within 15 minutes", async () => {
    const env = createFakeEnv({ users: [adminUser()] });
    const headers = {
      "Content-Type": "application/json",
      "CF-Connecting-IP": "10.0.0.99",
    };
    for (let i = 0; i < 5; i++) {
      const res = await app.request(
        "/api/v1/auth/login",
        {
          method: "POST",
          headers,
          body: JSON.stringify({ email: "admin@example.com", password: "nope" }),
        },
        env,
      );
      expect(res.status).toBe(401);
    }
    const blocked = await app.request(
      "/api/v1/auth/login",
      {
        method: "POST",
        headers,
        body: JSON.stringify({ email: "admin@example.com", password: "nope" }),
      },
      env,
    );
    expect(blocked.status).toBe(429);
    expect((await blocked.json()).error.code).toBe("RATE_LIMITED");
  });
});

describe("first-admin bootstrap (POST /api/v1/auth/init)", () => {
  it("rejects a wrong init token", async () => {
    const env = createFakeEnv({ users: [] });
    const res = await app.request(
      "/api/v1/auth/init",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: "wrong-token",
          email: "admin@thebdtoday.com",
          name: "Admin",
          password: "a-very-long-password",
        }),
      },
      env,
    );
    expect(res.status).toBe(403);
  });

  it("refuses to run once users exist", async () => {
    const env = createFakeEnv({ users: [adminUser()] });
    const res = await app.request(
      "/api/v1/auth/init",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: "test-init-token",
          email: "admin@thebdtoday.com",
          name: "Admin",
          password: "a-very-long-password",
        }),
      },
      env,
    );
    expect(res.status).toBe(409);
  });

  it("creates the first admin when the users table is empty", async () => {
    const env = createFakeEnv({ users: [] });
    const res = await app.request(
      "/api/v1/auth/init",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: "test-init-token",
          email: "admin@thebdtoday.com",
          name: "Editor-in-Chief",
          password: "a-very-long-password",
        }),
      },
      env,
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.user.role).toBe("admin");
    expect(body.data.user.email).toBe("admin@thebdtoday.com");
  });

  it("creates the first admin when only placeholder-hash seed users exist", async () => {
    const env = createFakeEnv({
      users: [{ ...adminUser(), password_hash: "__SET_VIA_INIT__" }],
    });
    const res = await app.request(
      "/api/v1/auth/init",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: "test-init-token",
          email: "admin@thebdtoday.com",
          name: "Editor-in-Chief",
          password: "a-very-long-password",
        }),
      },
      env,
    );
    expect(res.status).toBe(201);
  });
});

describe("own profile (PATCH /api/v1/auth/me, POST /api/v1/auth/me/password)", () => {
  function secondUser(): FakeUser {
    return {
      id: 2,
      name: "Editor User",
      email: "editor@example.com",
      password_hash: adminHash,
      role: "editor",
      avatar_url: null,
      bio: null,
    };
  }

  function authHeaders(cookies: Record<string, string>) {
    return {
      "Content-Type": "application/json",
      Cookie: cookieHeader(cookies),
      "X-CSRF-Token": cookies.bd_csrf,
    };
  }

  it("rejects a profile update without a session (401)", async () => {
    const env = createFakeEnv({ users: [adminUser()] });
    const res = await app.request(
      "/api/v1/auth/me",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Nobody" }),
      },
      env,
    );
    expect(res.status).toBe(401);
  });

  it("updates the signed-in user's name and bio", async () => {
    const env = createFakeEnv({ users: [adminUser()] });
    const { cookies } = await login(env);
    const res = await app.request(
      "/api/v1/auth/me",
      {
        method: "PATCH",
        headers: authHeaders(cookies),
        body: JSON.stringify({ name: "Azim Mia", bio: "Editor-in-Chief" }),
      },
      env,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.user.name).toBe("Azim Mia");
    expect(body.data.user.bio).toBe("Editor-in-Chief");
    expect(body.data.user.email).toBe("admin@example.com");
    expect(body.data.user.role).toBe("admin");
  });

  it("ignores a role in the body — the role never changes", async () => {
    const env = createFakeEnv({ users: [adminUser()] });
    const { cookies } = await login(env);
    const res = await app.request(
      "/api/v1/auth/me",
      {
        method: "PATCH",
        headers: authHeaders(cookies),
        body: JSON.stringify({ name: "Azim Mia", role: "author" }),
      },
      env,
    );
    expect(res.status).toBe(200);
    expect((await res.json()).data.user.role).toBe("admin");
  });

  it("rejects an email already used by another account (409)", async () => {
    const env = createFakeEnv({ users: [adminUser(), secondUser()] });
    const { cookies } = await login(env);
    const res = await app.request(
      "/api/v1/auth/me",
      {
        method: "PATCH",
        headers: authHeaders(cookies),
        body: JSON.stringify({ email: "editor@example.com" }),
      },
      env,
    );
    expect(res.status).toBe(409);
  });

  it("rejects an invalid email (400)", async () => {
    const env = createFakeEnv({ users: [adminUser()] });
    const { cookies } = await login(env);
    const res = await app.request(
      "/api/v1/auth/me",
      {
        method: "PATCH",
        headers: authHeaders(cookies),
        body: JSON.stringify({ email: "not-an-email" }),
      },
      env,
    );
    expect(res.status).toBe(400);
  });

  it("rejects a password change with the wrong current password (401)", async () => {
    const env = createFakeEnv({ users: [adminUser()] });
    const { cookies } = await login(env);
    const res = await app.request(
      "/api/v1/auth/me/password",
      {
        method: "POST",
        headers: authHeaders(cookies),
        body: JSON.stringify({ current_password: "wrong-password", new_password: "a-very-long-new-password" }),
      },
      env,
    );
    expect(res.status).toBe(401);
  });

  it("rejects a new password shorter than 12 characters (400)", async () => {
    const env = createFakeEnv({ users: [adminUser()] });
    const { cookies } = await login(env);
    const res = await app.request(
      "/api/v1/auth/me/password",
      {
        method: "POST",
        headers: authHeaders(cookies),
        body: JSON.stringify({ current_password: "Test1234!", new_password: "short" }),
      },
      env,
    );
    expect(res.status).toBe(400);
  });

  it("changes the password: old password stops working, new one works, current session stays valid", async () => {
    const env = createFakeEnv({ users: [adminUser()] });
    const { cookies } = await login(env);
    const changed = await app.request(
      "/api/v1/auth/me/password",
      {
        method: "POST",
        headers: authHeaders(cookies),
        body: JSON.stringify({ current_password: "Test1234!", new_password: "a-very-long-new-password" }),
      },
      env,
    );
    expect(changed.status).toBe(200);

    // The session that changed the password is still signed in.
    const me = await app.request(
      "/api/v1/auth/me",
      { method: "GET", headers: { Cookie: cookieHeader(cookies) } },
      env,
    );
    expect(me.status).toBe(200);

    // Old password no longer works; the new one does.
    const oldLogin = await app.request(
      "/api/v1/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "admin@example.com", password: "Test1234!" }),
      },
      env,
    );
    expect(oldLogin.status).toBe(401);
    const newLogin = await app.request(
      "/api/v1/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "admin@example.com", password: "a-very-long-new-password" }),
      },
      env,
    );
    expect(newLogin.status).toBe(200);
  });

  it("revokes the user's other sessions on password change", async () => {
    const env = createFakeEnv({ users: [adminUser()] });
    const first = await login(env);
    const second = await login(env);
    const changed = await app.request(
      "/api/v1/auth/me/password",
      {
        method: "POST",
        headers: authHeaders(first.cookies),
        body: JSON.stringify({ current_password: "Test1234!", new_password: "a-very-long-new-password" }),
      },
      env,
    );
    expect(changed.status).toBe(200);

    const other = await app.request(
      "/api/v1/auth/me",
      { method: "GET", headers: { Cookie: cookieHeader(second.cookies) } },
      env,
    );
    expect(other.status).toBe(401);
    const kept = await app.request(
      "/api/v1/auth/me",
      { method: "GET", headers: { Cookie: cookieHeader(first.cookies) } },
      env,
    );
    expect(kept.status).toBe(200);
  });
});

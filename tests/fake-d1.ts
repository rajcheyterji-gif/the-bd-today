// Minimal in-memory D1 stand-in for API tests (vitest).
// It pattern-matches the SQL the services emit — it is NOT a SQL engine.
// Only the queries the tested routes run are supported; anything else
// returns empty results / a successful run.
import type { Env } from "../src/server/env";

export interface FakeUser {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: string;
  avatar_url: string | null;
  bio: string | null;
}

export interface FakeArticleRow {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  excerpt: string;
  content: string;
  category_id: number;
  category_slug: string;
  category_name_bn: string;
  category_name_en: string;
  author_id: number;
  author_name: string;
  author_role: string;
  author_avatar_url: string | null;
  author_bio: string | null;
  tags: string;
  featured_image_url: string | null;
  image_caption: string | null;
  image_credit: string | null;
  status: string;
  published_at: string | null;
  scheduled_at: string | null;
  created_at: string;
  updated_at: string;
  views: number;
  reading_time_minutes: number;
  seo_title: string | null;
  seo_description: string | null;
}

export function cannedArticle(): FakeArticleRow {
  return {
    id: 1,
    slug: "test-article",
    title: "পরীক্ষামূলক সংবাদ",
    subtitle: null,
    excerpt: "এটি একটি পরীক্ষামূলক সংবাদের সারাংশ।",
    content: "<p>পরীক্ষামূলক সংবাদের মূল অংশ।</p>",
    category_id: 1,
    category_slug: "bangladesh",
    category_name_bn: "বাংলাদেশ",
    category_name_en: "Bangladesh",
    author_id: 1,
    author_name: "Admin User",
    author_role: "admin",
    author_avatar_url: null,
    author_bio: null,
    tags: "পরীক্ষা|||ঢাকা",
    featured_image_url: null,
    image_caption: null,
    image_credit: null,
    status: "published",
    published_at: "2026-11-17T10:00:00.000Z",
    scheduled_at: null,
    created_at: "2026-11-17T10:00:00.000Z",
    updated_at: "2026-11-17T10:00:00.000Z",
    views: 42,
    reading_time_minutes: 1,
    seo_title: null,
    seo_description: null,
  };
}

export function cannedCategories() {
  return [
    {
      id: 1,
      slug: "bangladesh",
      name_bn: "বাংলাদেশ",
      name_en: "Bangladesh",
      description: null,
      created_at: "2026-11-01T00:00:00.000Z",
      updated_at: "2026-11-01T00:00:00.000Z",
      article_count: 1,
    },
    {
      id: 2,
      slug: "sports",
      name_bn: "খেলাধুলা",
      name_en: "Sports",
      description: null,
      created_at: "2026-11-01T00:00:00.000Z",
      updated_at: "2026-11-01T00:00:00.000Z",
      article_count: 0,
    },
  ];
}

class FakeStatement {
  private params: unknown[] = [];

  constructor(
    private readonly db: FakeD1,
    private readonly sql: string,
  ) {}

  bind(...values: unknown[]): FakeStatement {
    this.params = values;
    return this;
  }

  async first<T = Record<string, unknown>>(): Promise<T | null> {
    const sql = this.sql;
    const p = this.params;
    const { users, articles, categories, sessions, subscribers } = this.db;

    if (sql.includes("FROM users WHERE email")) {
      return (users.find((u) => u.email === p[0]) ?? null) as T | null;
    }
    if (sql.includes("SELECT COUNT(*) AS count FROM users")) {
      return { count: users.length } as T;
    }
    if (sql.includes("SELECT COUNT(*) AS total FROM users")) {
      return { total: users.length } as T;
    }
    if (sql.includes("FROM sessions s JOIN users u")) {
      const session = sessions.get(String(p[0]));
      if (!session || session.expires_at <= String(p[1])) return null;
      const user = users.find((u) => u.id === session.user_id);
      if (!user) return null;
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar_url: user.avatar_url,
        bio: user.bio,
      } as T;
    }
    if (sql.includes("FROM newsletter_subscribers WHERE email")) {
      return subscribers.has(String(p[0]))
        ? ({ id: 1, status: "active" } as T)
        : null;
    }
    if (sql.includes("COUNT(DISTINCT a.id) AS total")) {
      return { total: articles.length } as T;
    }
    if (sql.includes("COALESCE(SUM(views), 0) AS total")) {
      return { total: 42 } as T;
    }
    if (sql.includes("SELECT COUNT(*) AS total FROM comments WHERE status")) {
      return { total: 0 } as T;
    }
    if (sql.includes("SELECT COUNT(*) AS total FROM newsletter_subscribers")) {
      return { total: subscribers.size } as T;
    }
    if (sql.includes("SELECT COUNT(*) AS total FROM articles WHERE status")) {
      return { total: articles.filter((a) => a.status === "published").length } as T;
    }
    if (sql.includes("SELECT COUNT(*) AS total FROM articles")) {
      return { total: articles.length } as T;
    }
    if (sql.includes("WHERE a.slug = ?")) {
      return (articles.find((a) => a.slug === p[0]) ?? null) as T | null;
    }
    if (sql.includes("WHERE a.id = ?")) {
      return (articles.find((a) => a.id === p[0]) ?? null) as T | null;
    }
    if (sql.includes("FROM categories c WHERE c.slug")) {
      return (categories.find((c) => c.slug === p[0]) ?? null) as T | null;
    }
    if (sql.includes("FROM categories WHERE slug")) {
      return (categories.find((c) => c.slug === p[0]) ?? null) as T | null;
    }
    if (sql.includes("FROM categories WHERE id")) {
      return (categories.find((c) => c.id === p[0]) ?? null) as T | null;
    }
    if (sql.includes("FROM users u") && sql.includes("WHERE u.id = ?")) {
      const user = users.find((u) => u.id === p[0]);
      return user ? ({ ...user, article_count: 1 } as T) : null;
    }
    if (sql.includes("SELECT 1 AS found FROM articles WHERE slug")) return null;
    if (sql.includes("FROM tags WHERE slug")) return null;
    if (sql.includes("SELECT id FROM tags WHERE slug")) return null;
    if (sql.includes("SELECT id FROM users WHERE email")) return null;
    if (sql.includes("FROM comments WHERE id")) return null;
    if (sql.includes("FROM media")) return null;
    return null;
  }

  async all<T = Record<string, unknown>>(): Promise<{ results: T[] }> {
    const sql = this.sql;
    const { users, articles, categories } = this.db;

    if (sql.includes("SELECT status, COUNT(*) AS count FROM articles GROUP BY status")) {
      return { results: [{ status: "published", count: articles.length }] as T[] };
    }
    if (sql.includes("SELECT slug, updated_at FROM articles")) {
      return {
        results: articles.map((a) => ({ slug: a.slug, updated_at: a.updated_at })) as T[],
      };
    }
    if (sql.includes("SELECT slug, updated_at FROM categories")) {
      return {
        results: categories.map((c) => ({ slug: c.slug, updated_at: c.updated_at })) as T[],
      };
    }
    if (sql.includes("FROM categories c ORDER BY")) {
      return { results: categories as T[] };
    }
    if (sql.includes("FROM users u") && sql.includes("GROUP BY u.id")) {
      return {
        results: users.map((u) => ({ ...u, article_count: 1 })) as T[],
      };
    }
    if (sql.includes("FROM users ORDER BY created_at")) {
      return { results: users as T[] };
    }
    if (sql.includes("SELECT a.id FROM articles a ORDER BY a.views DESC")) {
      return { results: articles.map((a) => ({ id: a.id })) as T[] };
    }
    if (sql.includes("SELECT a.id FROM articles a ORDER BY a.created_at DESC")) {
      return { results: articles.map((a) => ({ id: a.id })) as T[] };
    }
    if (sql.includes("FROM articles a") && sql.includes("GROUP_CONCAT")) {
      // Related-article queries exclude ids passed as bind params.
      if (sql.includes("a.id != ?")) {
        return {
          results: articles.filter((a) => !this.params.includes(a.id)) as T[],
        };
      }
      return { results: articles as T[] };
    }
    if (sql.includes("substr(viewed_at, 1, 10)")) {
      return { results: [] as T[] };
    }
    if (sql.includes("SELECT id, slug, title, views FROM articles")) {
      return {
        results: articles.map((a) => ({
          id: a.id,
          slug: a.slug,
          title: a.title,
          views: a.views,
        })) as T[],
      };
    }
    if (sql.includes("FROM categories c") && sql.includes("LEFT JOIN articles a")) {
      return {
        results: [
          { category: "Bangladesh", category_slug: "bangladesh", views: 42, articles: 1 },
        ] as T[],
      };
    }
    if (sql.includes("FROM tags t ORDER BY")) {
      return { results: [] as T[] };
    }
    return { results: [] as T[] };
  }

  async run(): Promise<{ success: boolean; meta?: { changes?: number; last_row_id?: number } }> {
    const sql = this.sql;
    const p = this.params;
    const { sessions, subscribers, users } = this.db;

    if (sql.includes("INSERT INTO sessions")) {
      sessions.set(String(p[0]), { user_id: Number(p[1]), expires_at: String(p[2]) });
      return { success: true, meta: { changes: 1 } };
    }
    if (sql.includes("DELETE FROM sessions WHERE id")) {
      sessions.delete(String(p[0]));
      return { success: true, meta: { changes: 1 } };
    }
    if (sql.includes("DELETE FROM sessions WHERE expires_at")) {
      return { success: true, meta: { changes: 0 } };
    }
    if (sql.includes("INSERT INTO users")) {
      const id = users.length + 1;
      users.push({
        id,
        name: String(p[0]),
        email: String(p[1]),
        password_hash: String(p[2]),
        role: "admin",
        avatar_url: null,
        bio: null,
      });
      return { success: true, meta: { changes: 1, last_row_id: id } };
    }
    if (sql.includes("INSERT INTO newsletter_subscribers")) {
      subscribers.add(String(p[0]));
      return { success: true, meta: { changes: 1 } };
    }
    if (sql.includes("UPDATE articles SET views = views + 1")) {
      const article = this.db.articles.find((a) => a.id === p[0]);
      if (article) article.views += 1;
      return { success: true, meta: { changes: 1 } };
    }
    if (sql.includes("UPDATE articles") && sql.includes("status = 'published'")) {
      return { success: true, meta: { changes: 1 } };
    }
    return { success: true, meta: { changes: 1 } };
  }
}

export class FakeD1 {
  users: FakeUser[];
  articles: FakeArticleRow[];
  categories: ReturnType<typeof cannedCategories>;
  sessions = new Map<string, { user_id: number; expires_at: string }>();
  subscribers = new Set<string>();

  constructor(opts?: { users?: FakeUser[]; articles?: FakeArticleRow[] }) {
    this.users = opts?.users ?? [];
    this.articles = opts?.articles ?? [cannedArticle()];
    this.categories = cannedCategories();
  }

  prepare(sql: string): FakeStatement {
    return new FakeStatement(this, sql);
  }

  async batch(): Promise<never> {
    throw new Error("FakeD1.batch is not implemented");
  }

  async exec(): Promise<never> {
    throw new Error("FakeD1.exec is not implemented");
  }
}

export class FakeR2 {
  private store = new Map<string, ArrayBuffer>();

  async get(key: string): Promise<{ arrayBuffer: () => Promise<ArrayBuffer>; httpMetadata?: { contentType?: string } } | null> {
    const value = this.store.get(key);
    if (!value) return null;
    return { arrayBuffer: async () => value, httpMetadata: { contentType: "image/jpeg" } };
  }

  async put(key: string, value: ArrayBuffer): Promise<unknown> {
    this.store.set(key, value);
    return null;
  }

  async delete(key: string | string[]): Promise<void> {
    const keys = Array.isArray(key) ? key : [key];
    for (const k of keys) this.store.delete(k);
  }
}

/** Build a test Env backed by the fake D1/R2. */
export function createFakeEnv(opts?: {
  users?: FakeUser[];
  articles?: FakeArticleRow[];
  initToken?: string;
}): Env {
  return {
    DB: new FakeD1(opts) as unknown as D1Database,
    R2_BUCKET: new FakeR2() as unknown as R2Bucket,
    ASSETS: {
      fetch: async () => new Response("not found", { status: 404 }),
    } as unknown as Fetcher,
    SESSION_SECRET: "test-session-secret-that-is-long-enough",
    ADMIN_INIT_TOKEN: opts?.initToken ?? "test-init-token",
    ADMIN_EMAIL: "admin@thebdtoday.com",
    ADMIN_NAME: "Editor-in-Chief",
    SITE_URL: "https://test.example.com",
    SITE_NAME: "THE BD TODAY",
  };
}

/** Parse Set-Cookie headers into a name -> value map. */
export function parseSetCookies(res: Response): Record<string, string> {
  const out: Record<string, string> = {};
  const headers = res.headers.getSetCookie?.() ?? [];
  for (const header of headers) {
    const [pair] = header.split(";");
    const eq = pair.indexOf("=");
    if (eq > 0) out[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
  }
  return out;
}

/** Build a Cookie header from parsed set-cookie values. */
export function cookieHeader(cookies: Record<string, string>): string {
  return Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

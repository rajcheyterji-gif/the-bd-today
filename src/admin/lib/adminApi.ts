// Admin API client for the Cloudflare repo.
//
// Transport: real REST at /api/v1 with cookie sessions (credentials:
// "include"). Mutating requests carry the double-submit CSRF token: the
// login response sets a readable `bd_csrf` cookie and the client echoes
// it in the `X-CSRF-Token` header (see src/server/middleware/auth.ts).
// There is NO token endpoint and NO localStorage token — do not add one.
//
// Envelope: { success, data, pagination? } | { success: false, error }.
//
// API gaps (surfaced honestly in the UI, never faked):
// - No GET /admin/articles/:id — getArticle() scans the list endpoint.
// - No user create/update/delete endpoints (only GET /admin/users).
// - No navigation CRUD (only public GET /api/v1/navigation, active items).
// - No comment DELETE (only PUT status: pending/approved/rejected/spam).
// - No sitemap endpoint — SeoManager builds its preview client-side.
// - POST /api/v1/auth/init creates the first admin but does NOT sign in;
//   the user must log in afterwards.
// - Article featured_image_url must pass the server's z.string().url()
//   check, so relative R2 URLs (/api/v1/media-file?key=…) are absolutized
//   with window.location.origin before sending.

import type {
  AnalyticsResponse,
  Article,
  ArticleStatus,
  AuditLog,
  Author,
  Category,
  Comment,
  CommentStatus,
  DashboardStats,
  MediaItem,
  NavigationItem,
  Pagination,
  SessionUser,
  SiteSettings,
  Tag,
  User,
  UserRole,
} from "../../shared/types";

export type { ArticleStatus, CommentStatus, UserRole };
export type {
  AnalyticsResponse,
  Article,
  AuditLog,
  Author,
  Category,
  Comment,
  DashboardStats,
  MediaItem,
  NavigationItem,
  Pagination,
  SessionUser,
  SiteSettings,
  Tag,
  User,
};

const BASE = "/api/v1";
export const CSRF_COOKIE = "bd_csrf";

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

/** Read the double-submit CSRF token from the readable `bd_csrf` cookie. */
export function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  for (const part of document.cookie.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === CSRF_COOKIE) return decodeURIComponent(rest.join("="));
  }
  return null;
}

/** Make a relative R2 / media URL absolute (required by the article validator). */
export function absoluteUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  if (typeof window !== "undefined" && url.startsWith("/")) return `${window.location.origin}${url}`;
  return url;
}

interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
  pagination?: Pagination;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<{ data: T; pagination?: Pagination }> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);
  const isForm = init.body instanceof FormData;
  if (!isForm && init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  // CSRF double-submit: every mutating request echoes the bd_csrf cookie.
  if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
    const token = getCsrfToken();
    if (token) headers.set("X-CSRF-Token", token);
  }
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...init, credentials: "include", headers });
  } catch {
    throw new ApiError(0, "Could not reach the server. Check your connection and try again.");
  }
  let body: Envelope<T>;
  try {
    body = (await res.json()) as Envelope<T>;
  } catch {
    throw new ApiError(res.status, `Server returned an unreadable response (HTTP ${res.status}).`);
  }
  if (!res.ok || body.success === false) {
    throw new ApiError(res.status, body.error?.message ?? `Request failed (HTTP ${res.status}).`, body.error);
  }
  return { data: body.data as T, pagination: body.pagination };
}

function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export interface ListResult<T> {
  items: T[];
  pagination?: Pagination;
}

export interface ArticleInput {
  title: string;
  subtitle?: string | null;
  slug?: string;
  excerpt?: string | null;
  content: string;
  category_id?: number | null;
  author_id?: number | null;
  tags?: string[];
  featured_image_url?: string | null;
  image_caption?: string | null;
  image_credit?: string | null;
  status?: ArticleStatus;
  scheduled_at?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
}

function articlePayload(input: ArticleInput): Record<string, unknown> {
  const out: Record<string, unknown> = { ...input };
  if (input.featured_image_url !== undefined) {
    out.featured_image_url = absoluteUrl(input.featured_image_url) ?? null;
  }
  return out;
}

export const adminApi = {
  // --- Auth ---------------------------------------------------------------
  login: async (email: string, password: string): Promise<SessionUser> => {
    const { data } = await request<{ user: SessionUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    return data.user;
  },
  logout: async (): Promise<void> => {
    await request("/auth/logout", { method: "POST", body: JSON.stringify({}) });
  },
  me: async (): Promise<SessionUser> => {
    const { data } = await request<{ user: SessionUser }>("/auth/me");
    return data.user;
  },
  /** First-admin bootstrap. Guarded by ADMIN_INIT_TOKEN; only works while
   *  no users exist; password must be >= 12 chars. Does NOT sign in — the
   *  new admin must log in afterwards. */
  initAdmin: async (input: { token: string; name: string; email: string; password: string }): Promise<SessionUser> => {
    const { data } = await request<{ user: SessionUser }>("/auth/init", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return data.user;
  },

  // --- Dashboard / analytics ----------------------------------------------
  getDashboard: async (): Promise<DashboardStats> => {
    const { data } = await request<DashboardStats>("/admin/dashboard");
    return data;
  },
  getAnalytics: async (days = 30): Promise<AnalyticsResponse> => {
    const { data } = await request<AnalyticsResponse>(`/admin/analytics${qs({ days })}`);
    return data;
  },

  // --- Articles -------------------------------------------------------------
  listArticles: async (params: {
    status?: ArticleStatus | "all";
    category?: string | number;
    search?: string;
    tag?: string;
    author?: string | number;
    page?: number;
    limit?: number;
  } = {}): Promise<ListResult<Article>> => {
    const { data, pagination } = await request<Article[]>(
      `/admin/articles${qs({
        status: params.status,
        category: params.category,
        search: params.search,
        tag: params.tag,
        author: params.author,
        page: params.page,
        limit: params.limit,
      })}`,
    );
    return { items: data, pagination };
  },
  /** No GET /admin/articles/:id endpoint exists, so scan the list. */
  getArticle: async (id: number | string): Promise<Article> => {
    const wanted = Number(id);
    let page = 1;
    for (let i = 0; i < 20; i++) {
      const res = await adminApi.listArticles({ status: "all", page, limit: 100 });
      const found = res.items.find((a) => Number(a.id) === wanted);
      if (found) return found;
      const total = res.pagination?.total ?? res.items.length;
      if (page * 100 >= total || res.items.length === 0) break;
      page += 1;
    }
    throw new ApiError(404, "Article not found.");
  },
  createArticle: async (input: ArticleInput): Promise<Article> => {
    const { data } = await request<Article>("/admin/articles", {
      method: "POST",
      body: JSON.stringify(articlePayload(input)),
    });
    return data;
  },
  updateArticle: async (id: number | string, input: Partial<ArticleInput>): Promise<Article> => {
    const { data } = await request<Article>(`/admin/articles/${id}`, {
      method: "PUT",
      body: JSON.stringify(articlePayload(input as ArticleInput)),
    });
    return data;
  },
  deleteArticle: async (id: number | string): Promise<void> => {
    await request(`/admin/articles/${id}`, { method: "DELETE" });
  },

  // --- Categories -----------------------------------------------------------
  listCategories: async (): Promise<ListResult<Category>> => {
    const { data } = await request<Category[]>("/admin/categories");
    return { items: data };
  },
  createCategory: async (input: { slug: string; name_bn: string; name_en: string; description?: string | null }): Promise<Category> => {
    const { data } = await request<Category>("/admin/categories", { method: "POST", body: JSON.stringify(input) });
    return data;
  },
  updateCategory: async (id: number, input: Partial<{ slug: string; name_bn: string; name_en: string; description: string | null }>): Promise<Category> => {
    const { data } = await request<Category>(`/admin/categories/${id}`, { method: "PUT", body: JSON.stringify(input) });
    return data;
  },
  deleteCategory: async (id: number): Promise<void> => {
    await request(`/admin/categories/${id}`, { method: "DELETE" });
  },

  // --- Tags -----------------------------------------------------------------
  listTags: async (): Promise<ListResult<Tag>> => {
    const { data } = await request<Tag[]>("/admin/tags");
    return { items: data };
  },
  createTag: async (input: { name: string; name_bn?: string | null }): Promise<Tag> => {
    const { data } = await request<Tag>("/admin/tags", { method: "POST", body: JSON.stringify(input) });
    return data;
  },
  updateTag: async (id: number, input: Partial<{ name: string; name_bn: string | null }>): Promise<Tag> => {
    const { data } = await request<Tag>(`/admin/tags/${id}`, { method: "PUT", body: JSON.stringify(input) });
    return data;
  },
  deleteTag: async (id: number): Promise<void> => {
    await request(`/admin/tags/${id}`, { method: "DELETE" });
  },

  // --- Media (R2 via /api/v1/media-file?key=…) ------------------------------
  listMedia: async (params: { q?: string; page?: number; limit?: number } = {}): Promise<ListResult<MediaItem>> => {
    const { data, pagination } = await request<MediaItem[]>(
      `/admin/media${qs({ page: params.page ?? 1, limit: params.limit ?? 48 })}`,
    );
    let items = data;
    if (params.q) {
      const needle = params.q.toLowerCase();
      items = items.filter((m) =>
        [m.filename, m.original_name, m.alt_text ?? ""].some((v) => v.toLowerCase().includes(needle)),
      );
    }
    return { items, pagination };
  },
  uploadMedia: async (file: File, altText?: string): Promise<MediaItem> => {
    if (file.size > 10 * 1024 * 1024) throw new ApiError(0, "File must be 10 MB or smaller.");
    const form = new FormData();
    form.set("file", file);
    if (altText) form.set("alt_text", altText);
    const { data } = await request<MediaItem>("/admin/media", { method: "POST", body: form });
    return data;
  },
  deleteMedia: async (id: number): Promise<void> => {
    await request(`/admin/media/${id}`, { method: "DELETE" });
  },

  // --- Users / authors ------------------------------------------------------
  // The API only exposes GET /admin/users (admin only). There are NO
  // create/update/delete user endpoints — the Users/Authors pages are
  // read-only and say so; these methods throw rather than fake it.
  listUsers: async (params: { page?: number; limit?: number } = {}): Promise<ListResult<User>> => {
    const { data, pagination } = await request<User[]>(
      `/admin/users${qs({ page: params.page ?? 1, limit: params.limit ?? 50 })}`,
    );
    return { items: data, pagination };
  },
  listAuthors: async (): Promise<ListResult<Author>> => {
    const { data } = await request<Author[]>("/authors");
    return { items: data };
  },
  createUser: async (): Promise<never> => {
    throw new ApiError(0, "The API has no user-creation endpoint (only GET /api/v1/admin/users). Ask an admin to create the account another way.");
  },
  updateUser: async (): Promise<never> => {
    throw new ApiError(0, "The API has no user-update endpoint (only GET /api/v1/admin/users). Roles and profiles cannot be changed from this dashboard.");
  },
  deleteUser: async (): Promise<never> => {
    throw new ApiError(0, "The API has no user-delete endpoint (only GET /api/v1/admin/users).");
  },

  // --- Comments ---------------------------------------------------------------
  // Moderation only: PUT status. There is NO comment-delete endpoint.
  listComments: async (params: { status?: CommentStatus | "all"; page?: number; limit?: number } = {}): Promise<ListResult<Comment>> => {
    const { data, pagination } = await request<Comment[]>(
      `/admin/comments${qs({ status: params.status === "all" ? undefined : params.status, page: params.page ?? 1, limit: params.limit ?? 20 })}`,
    );
    return { items: data, pagination };
  },
  moderateComment: async (id: number, status: CommentStatus): Promise<Comment> => {
    const { data } = await request<Comment>(`/admin/comments/${id}`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
    return data;
  },

  // --- Settings (admin only; flat string key/value pairs) -------------------
  getSettings: async (): Promise<SiteSettings> => {
    const { data } = await request<SiteSettings>("/admin/settings");
    return data;
  },
  updateSettings: async (settings: SiteSettings): Promise<SiteSettings> => {
    const { data } = await request<SiteSettings>("/admin/settings", {
      method: "PUT",
      body: JSON.stringify({ settings }),
    });
    return data;
  },

  // --- Navigation -------------------------------------------------------------
  // Read-only: only the public GET /api/v1/navigation (active items) exists.
  listNavigation: async (): Promise<ListResult<NavigationItem>> => {
    const { data } = await request<NavigationItem[]>("/navigation");
    return { items: data };
  },
  createNavigation: async (): Promise<never> => {
    throw new ApiError(0, "The API has no navigation-management endpoint (only public GET /api/v1/navigation). Navigation is edited in the database, not from this dashboard.");
  },
  updateNavigation: async (): Promise<never> => {
    throw new ApiError(0, "The API has no navigation-management endpoint (only public GET /api/v1/navigation).");
  },
  deleteNavigation: async (): Promise<never> => {
    throw new ApiError(0, "The API has no navigation-management endpoint (only public GET /api/v1/navigation).");
  },

  // --- Audit logs (admin only) ------------------------------------------------
  listAuditLogs: async (params: { page?: number; limit?: number; action?: string; user_id?: number } = {}): Promise<ListResult<AuditLog>> => {
    const { data, pagination } = await request<AuditLog[]>(
      `/admin/audit-logs${qs({ page: params.page ?? 1, limit: params.limit ?? 20, action: params.action, user_id: params.user_id })}`,
    );
    return { items: data, pagination };
  },
};

export type AdminApi = typeof adminApi;

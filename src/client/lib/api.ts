// Public data layer — fetch against the Cloudflare Worker REST API
// (/api/v1, envelope { success, data, pagination }).
//
// API contract verified against src/server/routes/{articles,categories,public}.ts:
//   GET  /articles?category=&search=&tag=&author=&status=published&page=&limit=&sort=latest|popular|trending
//   GET  /articles/:slug            -> Article & { related: Article[] } (view counted server-side)
//   GET  /categories, GET /categories/:slug
//   GET  /authors, GET /authors/:id -> Author & { articles: Article[] }
//   GET  /navigation
//   GET  /search?q=                 -> same list shape (listArticles search is used instead)
//   POST /newsletter { email }      -> { subscribed, already_subscribed }
//   POST /articles/:slug/comments { author_name, author_email, content } -> Comment (status pending)
//
// Known API gaps vs. the reference frontend (no endpoint exists for these):
//   * No breaking / featured / trending flags on articles — "Breaking" and
//     the ticker show the newest stories (sort=latest); "Trending" uses
//     sort=trending, which the server defines as recent + most-viewed.
//   * No public GET /tags and no GET comments endpoint — tags come from
//     Article.tags, and comments can only be submitted (moderated), not listed.
//   * No /contact endpoint and no site-settings endpoint — contact uses a
//     mailto fallback (see pages/ContactPage.tsx).
//   * No /home aggregate endpoint — getHome() composes parallel list calls.

import type {
  ApiResponse,
  Article,
  ArticleListParams,
  Author,
  Category,
  Comment,
  NavigationItem,
  Pagination,
} from "../../shared/types";

export type HomeData = {
  /** Newest stories; also used as the "breaking" feed (see note above). */
  breaking: Article[];
  featured: Article | null;
  latest: Article[];
  trending: Article[];
  mostRead: Article[];
  grid: Article[];
  sections: { category: Category; articles: Article[] }[];
};

export type SiteData = {
  categories: Category[];
  navigation: NavigationItem[];
};

export type ArticleDetail = {
  article: Article;
  related: Article[];
};

export type AuthorDetail = Author & { articles: Article[] };

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  let res: Response;
  try {
    res = await fetch(path, { credentials: "include", ...init });
  } catch (err) {
    throw new ApiError(0, "NETWORK_ERROR", err instanceof Error ? err.message : "Network error");
  }
  let body: ApiResponse<T>;
  try {
    body = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new ApiError(res.status, "BAD_RESPONSE", `Unexpected response from ${path}`);
  }
  if (!res.ok || !body.success) {
    throw new ApiError(
      res.status,
      body.error?.code ?? "REQUEST_FAILED",
      body.error?.message ?? `Request failed (${res.status})`,
    );
  }
  return body;
}

function listQuery(params: ArticleListParams): string {
  const q = new URLSearchParams();
  q.set("status", params.status ?? "published");
  if (params.category) q.set("category", params.category);
  if (params.search) q.set("search", params.search);
  if (params.tag) q.set("tag", params.tag);
  if (params.author) q.set("author", params.author);
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  if (params.sort) q.set("sort", params.sort);
  return q.toString();
}

export const publicApi = {
  async listArticles(
    params: ArticleListParams = {},
  ): Promise<ApiResponse<Article[]>> {
    return request<Article[]>(`/api/v1/articles?${listQuery(params)}`);
  },

  async searchArticles(q: string, page = 1, limit = 12): Promise<ApiResponse<Article[]>> {
    return this.listArticles({ search: q, page, limit });
  },

  async getArticle(slug: string): Promise<ApiResponse<ArticleDetail>> {
    const res = await request<Article & { related?: Article[] }>(
      `/api/v1/articles/${encodeURIComponent(slug)}`,
    );
    const article = res.data;
    if (!article) {
      throw new ApiError(404, "NOT_FOUND", "Article not found");
    }
    return {
      success: true,
      data: { article, related: article.related ?? [] },
    };
  },

  async listCategories(): Promise<ApiResponse<Category[]>> {
    return request<Category[]>("/api/v1/categories");
  },

  async getCategory(slug: string): Promise<ApiResponse<Category>> {
    return request<Category>(`/api/v1/categories/${encodeURIComponent(slug)}`);
  },

  async getNavigation(): Promise<ApiResponse<NavigationItem[]>> {
    return request<NavigationItem[]>("/api/v1/navigation");
  },

  async getSiteData(): Promise<ApiResponse<SiteData>> {
    const [categories, navigation] = await Promise.all([
      this.listCategories(),
      this.getNavigation(),
    ]);
    return { success: true, data: { categories: categories.data ?? [], navigation: navigation.data ?? [] } };
  },

  async listAuthors(): Promise<ApiResponse<Author[]>> {
    return request<Author[]>("/api/v1/authors");
  },

  async getAuthor(id: number): Promise<ApiResponse<AuthorDetail>> {
    return request<AuthorDetail>(`/api/v1/authors/${id}`);
  },

  async subscribeNewsletter(
    email: string,
  ): Promise<{ subscribed: boolean; already_subscribed: boolean }> {
    const res = await request<{ subscribed: boolean; already_subscribed: boolean }>(
      "/api/v1/newsletter",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      },
    );
    return res.data as { subscribed: boolean; already_subscribed: boolean };
  },

  async submitComment(
    slug: string,
    input: { author_name: string; author_email: string; content: string },
  ): Promise<ApiResponse<Comment>> {
    return request<Comment>(`/api/v1/articles/${encodeURIComponent(slug)}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  },

  /** Home page, composed from parallel list calls (no /home endpoint). */
  async getHome(): Promise<ApiResponse<HomeData>> {
    const [latestRes, popularRes, trendingRes, categoriesRes] = await Promise.all([
      this.listArticles({ page: 1, limit: 12, sort: "latest" }),
      this.listArticles({ page: 1, limit: 8, sort: "popular" }),
      this.listArticles({ page: 1, limit: 6, sort: "trending" }),
      this.listCategories(),
    ]);
    const latest = latestRes.data ?? [];
    const categories = categoriesRes.data ?? [];
    const sectionsRes = await Promise.all(
      categories.slice(0, 4).map(async (category) => {
        try {
          const res = await this.listArticles({ category: category.slug, page: 1, limit: 5, sort: "latest" });
          return { category, articles: res.data ?? [] };
        } catch {
          return { category, articles: [] as Article[] };
        }
      }),
    );
    return {
      success: true,
      data: {
        breaking: latest.slice(0, 8),
        featured: latest[0] ?? null,
        latest,
        trending: trendingRes.data ?? [],
        mostRead: popularRes.data ?? [],
        grid: latest.slice(1),
        sections: sectionsRes.filter((s) => s.articles.length > 0),
      },
    };
  },
};

/** Fill in real Bengali category names from the site-data category list. */
export function enrichArticles(articles: Article[], categories: Category[]): Article[] {
  if (categories.length === 0) return articles;
  const bySlug = new Map(categories.map((c) => [c.slug, c]));
  return articles.map((a) => {
    const cat = a.category ? bySlug.get(a.category.slug) : undefined;
    if (!cat || !a.category) return a;
    return { ...a, category: { ...a.category, name_bn: cat.name_bn, name_en: cat.name_en } };
  });
}

export type { Pagination };

// Article data hooks: home sections, lists, detail, search, authors.
// Plain fetch hooks (no react-query in this repo) returning
// { data, isPending, isError, error, refetch }; `data` is the API envelope
// { success, data, pagination }.

import { useFetch, type QueryResult } from "./useFetch";
import { publicApi, type ArticleDetail, type AuthorDetail, type HomeData } from "../lib/api";
import type { ApiResponse, Article, ArticleListParams, Author } from "../../shared/types";

export function useHome(): QueryResult<ApiResponse<HomeData>> {
  return useFetch("home", () => publicApi.getHome());
}

export function useArticles(
  query: ArticleListParams,
): QueryResult<ApiResponse<Article[]>> {
  const { category, search, tag, author, page, limit, sort } = query;
  const key = JSON.stringify({ category, search, tag, author, page, limit, sort });
  return useFetch(`articles:${key}`, () => publicApi.listArticles(query));
}

export function useArticle(slug: string): QueryResult<ApiResponse<ArticleDetail>> {
  return useFetch(`article:${slug}`, () => publicApi.getArticle(slug), {
    enabled: slug.length > 0,
  });
}

export function useSearchArticles(
  q: string,
  page = 1,
  limit = 12,
): QueryResult<ApiResponse<Article[]>> {
  return useFetch(`search:${q}:${page}:${limit}`, () => publicApi.searchArticles(q, page, limit), {
    enabled: q.trim().length > 0,
  });
}

export function useAuthors(): QueryResult<ApiResponse<Author[]>> {
  return useFetch("authors", () => publicApi.listAuthors());
}

export function useAuthor(id: number): QueryResult<ApiResponse<AuthorDetail>> {
  return useFetch(`author:${id}`, () => publicApi.getAuthor(id), {
    enabled: Number.isFinite(id) && id > 0,
  });
}

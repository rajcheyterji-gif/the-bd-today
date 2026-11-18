// API envelope helpers — every /api/v1 response uses this shape:
//   { success: true, data, pagination? }  |  { success: false, error: { code, message } }
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ApiResponse, Pagination } from "../../shared/types";

export function ok<T>(
  c: Context,
  data: T,
  status: ContentfulStatusCode = 200,
  pagination?: Pagination,
): Response {
  const body: ApiResponse<T> = { success: true, data };
  if (pagination) body.pagination = pagination;
  return c.json(body, status);
}

export function fail(
  c: Context,
  status: ContentfulStatusCode,
  code: string,
  message: string,
  details?: unknown,
): Response {
  const body: ApiResponse<never> = {
    success: false,
    error: details === undefined ? { code, message } : { code, message, details },
  };
  return c.json(body, status);
}

/** Map an HTTP status to the envelope error code used for it. */
export function errorCodeForStatus(status: number): string {
  switch (status) {
    case 400:
      return "VALIDATION_ERROR";
    case 401:
      return "UNAUTHORIZED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    case 409:
      return "CONFLICT";
    case 429:
      return "RATE_LIMITED";
    default:
      return status >= 500 ? "INTERNAL_ERROR" : "ERROR";
  }
}

export const MAX_LIMIT = 100;
export const DEFAULT_LIMIT = 12;

/** Parse ?page=&limit= from the query string, clamped to sane bounds. */
export function paginationParams(c: Context): { page: number; limit: number } {
  const rawPage = Number.parseInt(c.req.query("page") ?? "1", 10);
  const rawLimit = Number.parseInt(c.req.query("limit") ?? String(DEFAULT_LIMIT), 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(rawLimit, MAX_LIMIT)
      : DEFAULT_LIMIT;
  return { page, limit };
}

export function paginationMeta(total: number, page: number, limit: number): Pagination {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

/** SQL OFFSET for a 1-based page. */
export function pageOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

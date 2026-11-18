// Site-wide data hooks: categories and navigation, both from /api/v1.

import { useFetch, type QueryResult } from "./useFetch";
import { publicApi, type SiteData } from "../lib/api";
import type { ApiResponse, Category } from "../../shared/types";

export function useSiteData(): QueryResult<ApiResponse<SiteData>> {
  return useFetch("site-data", () => publicApi.getSiteData());
}

export function useCategories(): QueryResult<ApiResponse<SiteData>> & {
  categories: Category[];
} {
  const site = useSiteData();
  return { ...site, categories: site.data?.data?.categories ?? [] };
}

export function useCategoryBySlug(slug: string): QueryResult<ApiResponse<SiteData>> & {
  category: Category | undefined;
  categories: Category[];
} {
  const { categories, ...rest } = useCategories();
  return {
    ...rest,
    category: categories.find((c) => c.slug === slug),
    categories,
  };
}

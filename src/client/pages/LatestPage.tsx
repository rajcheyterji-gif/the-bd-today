import { useState } from "react";
import { Check, ChevronDown, SlidersHorizontal } from "lucide-react";
import { useArticles } from "../hooks/useArticles";
import { useSiteData } from "../hooks/useCategories";
import { enrichArticles } from "../lib/api";
import { Seo } from "../components/Seo";
import { LATEST_PAGE_META } from "../../shared/seo";
import { ArticleCard } from "../components/ArticleCard";
import { ListPageSkeleton, ErrorState } from "../components/Loading";
import { EmptyState } from "../components/EmptyState";
import { Pager } from "../components/Pager";
import type { ArticleSort } from "../../shared/types";

export function LatestPage() {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<ArticleSort>("latest");
  const [filterOpen, setFilterOpen] = useState(false);
  const query = useArticles({ page, limit: 12, sort });
  const { data: site } = useSiteData();
  const articles = enrichArticles(query.data?.data ?? [], site?.data?.categories ?? []);
  const totalPages = query.data?.pagination?.totalPages ?? 1;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Seo title={LATEST_PAGE_META.title} description={LATEST_PAGE_META.description} />
      <header className="mt-4 flex items-center justify-between gap-3 border-b-2 border-[#0f172a] pb-4">
        <h1 className="font-serif text-balance text-3xl font-black text-slate-900 sm:text-4xl">সর্বশেষ</h1>
        <div className="relative">
          <button
            type="button"
            onClick={() => setFilterOpen((v) => !v)}
            aria-expanded={filterOpen}
            aria-haspopup="true"
            className="inline-flex items-center gap-2 border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:border-[#c1121f] hover:text-[#c1121f]"
          >
            <SlidersHorizontal size={16} />
            ফিল্টার
            <ChevronDown size={14} className={filterOpen ? "rotate-180" : ""} />
          </button>
          {filterOpen && (
            <>
              <button
                type="button"
                aria-label="ফিল্টার বন্ধ করুন"
                tabIndex={-1}
                className="fixed inset-0 z-10 cursor-default"
                onClick={() => setFilterOpen(false)}
              />
              <div className="absolute right-0 z-20 mt-2 w-44 border border-slate-200 bg-white shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setSort("latest");
                    setPage(1);
                    setFilterOpen(false);
                  }}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm font-medium text-slate-800 hover:bg-slate-50"
                >
                  লেটেস্ট
                  {sort === "latest" && <Check size={16} className="text-[#c1121f]" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSort("oldest");
                    setPage(1);
                    setFilterOpen(false);
                  }}
                  className="flex w-full items-center justify-between border-t border-slate-100 px-4 py-2.5 text-left text-sm font-medium text-slate-800 hover:bg-slate-50"
                >
                  ওল্ড
                  {sort === "oldest" && <Check size={16} className="text-[#c1121f]" />}
                </button>
              </div>
            </>
          )}
        </div>
      </header>
      {query.isPending && <ListPageSkeleton />}
      {query.isError && (
        <div className="mt-6">
          <ErrorState message="Could not load the latest news. Please try again." onRetry={() => query.refetch()} />
        </div>
      )}
      {!query.isPending && !query.isError && articles.length === 0 && (
        <div className="mt-6">
          <EmptyState title="No stories yet" message="Our editors have not published anything yet. Please check back soon." />
        </div>
      )}
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((a) => (
          <ArticleCard key={a.id} article={a} />
        ))}
      </div>
      <Pager page={page} totalPages={totalPages} onPage={setPage} />
    </div>
  );
}

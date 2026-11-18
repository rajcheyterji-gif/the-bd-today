import { useState } from "react";
import { useArticles } from "../hooks/useArticles";
import { useSiteData } from "../hooks/useCategories";
import { enrichArticles } from "../lib/api";
import { Seo } from "../components/Seo";
import { LATEST_PAGE_META } from "../../shared/seo";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { ArticleCard } from "../components/ArticleCard";
import { Loading, ErrorState } from "../components/Loading";
import { EmptyState } from "../components/EmptyState";
import { Pager } from "../components/Pager";
import type { ArticleSort } from "../../shared/types";

export function LatestPage() {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<ArticleSort>("latest");
  const query = useArticles({ page, limit: 12, sort });
  const { data: site } = useSiteData();
  const articles = enrichArticles(query.data?.data ?? [], site?.data?.categories ?? []);
  const totalPages = query.data?.pagination?.totalPages ?? 1;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Seo title={LATEST_PAGE_META.title} description={LATEST_PAGE_META.description} />
      <Breadcrumbs items={[{ label: "Latest News" }]} />
      <header className="mt-4 flex flex-wrap items-end justify-between gap-3 border-b-2 border-[#0f172a] pb-4">
        <div>
          <h1 className="font-serif text-3xl font-black text-slate-900 sm:text-4xl">Latest News</h1>
          <p className="mt-2 text-slate-600">Every published story, newest first.</p>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          Sort by
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as ArticleSort);
              setPage(1);
            }}
            className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-[#c1121f] focus:outline-none"
          >
            <option value="latest">Latest</option>
            <option value="popular">Most read</option>
            <option value="trending">Trending</option>
          </select>
        </label>
      </header>
      {query.isPending && <Loading label="Loading latest news…" />}
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

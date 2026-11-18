import { useState } from "react";
import { Zap } from "lucide-react";
import { useArticles } from "../hooks/useArticles";
import { useSiteData } from "../hooks/useCategories";
import { enrichArticles } from "../lib/api";
import { Seo } from "../components/Seo";
import { BREAKING_PAGE_META } from "../../shared/seo";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { ArticleCard } from "../components/ArticleCard";
import { ListPageSkeleton, ErrorState } from "../components/Loading";
import { EmptyState } from "../components/EmptyState";
import { Pager } from "../components/Pager";

// The API has no breaking-news flag, so this page shows the newest stories.
export function BreakingPage() {
  const [page, setPage] = useState(1);
  const query = useArticles({ page, limit: 12, sort: "latest" });
  const { data: site } = useSiteData();
  const articles = enrichArticles(query.data?.data ?? [], site?.data?.categories ?? []);
  const totalPages = query.data?.pagination?.totalPages ?? 1;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Seo title={BREAKING_PAGE_META.title} description={BREAKING_PAGE_META.description} />
      <Breadcrumbs items={[{ label: "Breaking News" }]} />
      <header className="mt-4 border-b-2 border-[#c1121f] pb-4">
        <h1 className="flex items-center gap-2 font-serif text-3xl font-black text-slate-900 sm:text-4xl">
          <span className="text-[#c1121f]"><Zap size={28} /></span> Breaking News
        </h1>
        <p className="mt-2 text-slate-600">The stories developing right now, updated as our newsroom confirms them.</p>
      </header>
      {query.isPending && <ListPageSkeleton />}
      {query.isError && (
        <div className="mt-6">
          <ErrorState message="Could not load breaking news. Please try again." onRetry={() => query.refetch()} />
        </div>
      )}
      {!query.isPending && !query.isError && articles.length === 0 && (
        <div className="mt-6">
          <EmptyState title="No breaking news right now" message="There are no breaking stories at the moment. The latest news is on the home page." />
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

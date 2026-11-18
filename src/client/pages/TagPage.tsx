import { useState } from "react";
import { useArticles } from "../hooks/useArticles";
import { useSiteData } from "../hooks/useCategories";
import { enrichArticles } from "../lib/api";
import { Seo } from "../components/Seo";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { ArticleCard } from "../components/ArticleCard";
import { Loading, ErrorState } from "../components/Loading";
import { EmptyState } from "../components/EmptyState";
import { Pager } from "../components/Pager";

/** Tag archive: stories filed under one tag. */
export function TagPage({ slug }: { slug: string }) {
  const [page, setPage] = useState(1);
  const query = useArticles({ tag: slug, page, limit: 12, sort: "latest" });
  const { data: site } = useSiteData();
  const articles = enrichArticles(query.data?.data ?? [], site?.data?.categories ?? []);
  const totalPages = query.data?.pagination?.totalPages ?? 1;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Seo title={`Tag: ${slug}`} description={`Stories tagged "${slug}" — THE BD TODAY.`} />
      <Breadcrumbs items={[{ label: "Tags" }, { label: slug }]} />
      <header className="mt-4 border-b-2 border-[#0f172a] pb-4">
        <h1 className="font-serif text-3xl font-black text-slate-900">
          Tag: <span className="text-[#c1121f]">{slug}</span>
        </h1>
        {query.data?.pagination && (
          <p className="mt-2 text-sm text-slate-500">{query.data.pagination.total} stories</p>
        )}
      </header>
      {query.isPending && <Loading label="Loading stories…" />}
      {query.isError && (
        <div className="mt-6">
          <ErrorState message="Could not load this tag. Please try again." onRetry={() => query.refetch()} />
        </div>
      )}
      {!query.isPending && !query.isError && articles.length === 0 && (
        <div className="mt-6">
          <EmptyState title="No stories with this tag" message="Nothing has been filed under this tag yet." />
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

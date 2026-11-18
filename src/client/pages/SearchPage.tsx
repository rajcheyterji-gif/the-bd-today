import { useState } from "react";
import { useSearchArticles } from "../hooks/useArticles";
import { useSiteData } from "../hooks/useCategories";
import { enrichArticles } from "../lib/api";
import { Seo } from "../components/Seo";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { SearchBar } from "../components/SearchBar";
import { ArticleCard } from "../components/ArticleCard";
import { Loading, ErrorState } from "../components/Loading";
import { EmptyState } from "../components/EmptyState";
import { Pager } from "../components/Pager";

export function SearchPage({ initialQuery }: { initialQuery: string }) {
  const [page, setPage] = useState(1);
  const q = initialQuery.trim();
  const query = useSearchArticles(q, page, 12);
  const { data: site } = useSiteData();
  const articles = enrichArticles(query.data?.data ?? [], site?.data?.categories ?? []);
  const totalPages = query.data?.pagination?.totalPages ?? 1;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Seo
        title={q ? `Search: ${q}` : "Search"}
        description={q ? `Search results for "${q}" — THE BD TODAY.` : "Search THE BD TODAY."}
      />
      <Breadcrumbs items={[{ label: "Search" }]} />
      <header className="mt-4 border-b-2 border-[#0f172a] pb-4">
        <h1 className="font-serif text-3xl font-black text-slate-900">Search</h1>
        <div className="mt-4 max-w-xl">
          <SearchBar initialValue={q} autoFocus placeholder="Search news, topics, people…" />
        </div>
        {q && query.data?.pagination && (
          <p className="mt-3 text-sm text-slate-500">
            {query.data.pagination.total} result{query.data.pagination.total === 1 ? "" : "s"} for “{q}”
          </p>
        )}
      </header>

      {!q && (
        <div className="mt-6">
          <EmptyState title="What are you looking for?" message="Type a word or phrase above to search our published stories." />
        </div>
      )}
      {q && query.isPending && <Loading label="Searching…" />}
      {q && query.isError && (
        <div className="mt-6">
          <ErrorState message="Search failed. Please try again." onRetry={() => query.refetch()} />
        </div>
      )}
      {q && !query.isPending && !query.isError && articles.length === 0 && (
        <div className="mt-6">
          <EmptyState
            title={`No results for “${q}”`}
            message="Try a different spelling, a broader topic, or fewer words."
          />
        </div>
      )}
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((a) => (
          <ArticleCard key={a.id} article={a} />
        ))}
      </div>
      {q && <Pager page={page} totalPages={totalPages} onPage={setPage} />}
    </div>
  );
}

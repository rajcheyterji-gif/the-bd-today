import { useState } from "react";
import { useArticles } from "../hooks/useArticles";
import { useCategoryBySlug } from "../hooks/useCategories";
import { enrichArticles } from "../lib/api";
import { Seo } from "../components/Seo";
import { pageMeta } from "../../shared/seo";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { ArticleCard } from "../components/ArticleCard";
import { ListPageSkeleton, ErrorState } from "../components/Loading";
import { EmptyState } from "../components/EmptyState";
import { Pager } from "../components/Pager";

export function CategoryPage({ slug }: { slug: string }) {
  const [page, setPage] = useState(1);
  const { category, categories } = useCategoryBySlug(slug);
  const query = useArticles({ category: slug, page, limit: 12, sort: "latest" });

  const articles = enrichArticles(query.data?.data ?? [], categories);
  const totalPages = query.data?.pagination?.totalPages ?? 1;

  const meta = pageMeta(`/category/${slug}`);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Seo title={meta.title} description={meta.description} />
      <Breadcrumbs items={[{ label: category?.name_en ?? slug }]} />
      <header className="mt-4 border-b-2 border-[#0f172a] pb-4">
        <h1 className="font-serif text-3xl font-black text-slate-900 sm:text-4xl">
          {category?.name_en ?? slug}
          {category?.name_bn && category.name_bn !== category.name_en && (
            <span className="ml-3 font-bengali text-xl font-normal text-slate-500">{category.name_bn}</span>
          )}
        </h1>
        {category?.description && <p className="mt-2 max-w-2xl text-slate-600">{category.description}</p>}
        {query.data?.pagination && (
          <p className="mt-2 text-sm text-slate-500">{query.data.pagination.total} stories</p>
        )}
      </header>

      {query.isPending && <ListPageSkeleton />}
      {query.isError && (
        <div className="mt-6">
          <ErrorState message="Could not load this section. Please try again." onRetry={() => query.refetch()} />
        </div>
      )}
      {!query.isPending && !query.isError && articles.length === 0 && (
        <div className="mt-6">
          <EmptyState
            title={`No stories in ${category?.name_en ?? slug} yet`}
            message="Our editors have not published anything in this section yet. Please check back soon."
          />
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

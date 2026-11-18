import { User } from "lucide-react";
import { useAuthor } from "../hooks/useArticles";
import { useSiteData } from "../hooks/useCategories";
import { enrichArticles } from "../lib/api";
import { Seo } from "../components/Seo";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { ArticleCard } from "../components/ArticleCard";
import { Loading, ErrorState } from "../components/Loading";
import { EmptyState } from "../components/EmptyState";

export function AuthorPage({ id }: { id: number }) {
  const query = useAuthor(id);
  const { data: site } = useSiteData();
  const author = query.data?.data ?? null;
  const articles = enrichArticles(query.data?.data?.articles ?? [], site?.data?.categories ?? []);

  if (query.isPending) return <Loading label="Loading author…" />;
  if (query.isError) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <ErrorState message="Could not load this author. Please try again." onRetry={() => query.refetch()} />
      </div>
    );
  }
  if (!author) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <EmptyState title="Author not found" message="This author page does not exist or the author has no published stories yet." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Seo title={author.name} description={author.bio || `Stories by ${author.name} — THE BD TODAY.`} />
      <Breadcrumbs items={[{ label: "Authors" }, { label: author.name }]} />
      <header className="mt-4 flex flex-col gap-4 rounded border border-slate-200 bg-slate-50 p-6 sm:flex-row">
        {author.avatar_url ? (
          <img
            src={author.avatar_url}
            alt={author.name}
            className="h-20 w-20 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[#0f172a] text-white">
            <User size={36} />
          </span>
        )}
        <div>
          <h1 className="font-serif text-3xl font-black text-slate-900">{author.name}</h1>
          <p className="mt-1 text-sm font-semibold uppercase tracking-wider text-[#c1121f]">{author.role}</p>
          {author.bio && <p className="mt-2 max-w-2xl leading-relaxed text-slate-600">{author.bio}</p>}
          <p className="mt-2 text-sm text-slate-500">
            {author.article_count ?? articles.length} published{" "}
            {(author.article_count ?? articles.length) === 1 ? "story" : "stories"}
          </p>
        </div>
      </header>

      <h2 className="mt-8 border-b-2 border-[#0f172a] pb-2 font-serif text-2xl font-black text-slate-900">
        Stories by {author.name}
      </h2>
      {articles.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No stories yet" message={`${author.name} has not published any stories yet.`} />
        </div>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((a) => (
            <ArticleCard key={a.id} article={a} />
          ))}
        </div>
      )}
    </div>
  );
}

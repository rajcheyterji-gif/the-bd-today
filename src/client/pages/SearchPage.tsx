import { useState } from "react";
import { useSearchArticles } from "../hooks/useArticles";
import { useSiteData } from "../hooks/useCategories";
import { enrichArticles } from "../lib/api";
import { toBengaliDigits } from "../lib/format";
import { Seo } from "../components/Seo";
import { SearchBar } from "../components/SearchBar";
import { ArticleCard } from "../components/ArticleCard";
import { ListPageSkeleton, ErrorState } from "../components/Loading";
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
        title={q ? `অনুসন্ধান: ${q}` : "অনুসন্ধান"}
        description={q ? `“${q}”-এর জন্য অনুসন্ধানের ফলাফল — দ্য বিডি টুডে।` : "দ্য বিডি টুডে-তে খবর খুঁজুন।"}
      />
      <header className="mt-4 border-b-2 border-[#0f172a] pb-4">
        <h1 className="font-serif text-3xl font-black text-slate-900">অনুসন্ধান</h1>
        <div className="mt-4 max-w-xl">
          <SearchBar initialValue={q} autoFocus placeholder="খবর, বিষয় বা ব্যক্তি খুঁজুন…" />
        </div>
        {q && query.data?.pagination && (
          <p className="mt-3 text-sm text-slate-500">
            “{q}”-এর জন্য {toBengaliDigits(query.data.pagination.total)}টি ফলাফল
          </p>
        )}
      </header>

      {!q && (
        <div className="mt-6">
          <EmptyState title="আপনি কী খুঁজছেন?" message="উপরে একটি শব্দ বা বাক্য লিখে আমাদের প্রকাশিত খবরগুলো খুঁজুন।" />
        </div>
      )}
      {q && query.isPending && <ListPageSkeleton />}
      {q && query.isError && (
        <div className="mt-6">
          <ErrorState message="খোঁজা যায়নি। আবার চেষ্টা করুন।" onRetry={() => query.refetch()} />
        </div>
      )}
      {q && !query.isPending && !query.isError && articles.length === 0 && (
        <div className="mt-6">
          <EmptyState
            title={`“${q}”-এর জন্য কোনো ফলাফল পাওয়া যায়নি`}
            message="অন্য বানান, আরও সাধারণ বিষয় বা কম শব্দ দিয়ে চেষ্টা করুন।"
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

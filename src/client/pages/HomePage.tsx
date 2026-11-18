import { Flame, TrendingUp } from "lucide-react";
import { useHome } from "../hooks/useArticles";
import { useSiteData } from "../hooks/useCategories";
import { enrichArticles } from "../lib/api";
import { Seo } from "../components/Seo";
import { HeroArticle } from "../components/HeroArticle";
import { ArticleCard, ArticleRow } from "../components/ArticleCard";
import { Sidebar } from "../components/Sidebar";
import { CategorySection } from "../components/CategorySection";
import { Newsletter } from "../components/Newsletter";
import { Loading, ErrorState } from "../components/Loading";
import { EmptyState } from "../components/EmptyState";

export function HomePage() {
  const home = useHome();
  const site = useSiteData();

  if (home.isPending) return <Loading label="Loading today's news…" />;
  if (home.isError) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <ErrorState
          message="We could not load the latest news. Please check your connection and try again."
          onRetry={() => home.refetch()}
        />
      </div>
    );
  }

  const data = home.data?.data;
  const categories = site.data?.data?.categories ?? [];
  if (!data) return null;

  const enrich = (list: typeof data.latest) => enrichArticles(list, categories);
  const featured = data.featured;
  const grid = enrich(data.grid);
  const latest = enrich(data.latest);
  const trending = enrich(data.trending);
  const mostRead = enrich(data.mostRead);
  const sections = data.sections.map((s) => ({
    category: categories.find((c) => c.slug === s.category.slug) ?? s.category,
    articles: enrich(s.articles),
  }));

  const isEmpty =
    !featured && grid.length === 0 && latest.length === 0 && sections.length === 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Seo />
      {isEmpty ? (
        <EmptyState
          title="Welcome to THE BD TODAY"
          message="The newsroom has not published its first story yet. Once editors publish from the CMS, the front page will fill with the latest Bangladesh and world news here."
        />
      ) : (
        <div className="flex flex-col gap-10">
          {/* Hero + latest sidebar */}
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              {featured && <HeroArticle article={enrich([featured])[0] ?? featured} />}
              {grid.length > 0 && (
                <div className="mt-8">
                  <div className="mb-4 flex items-center justify-between border-b-2 border-[#0f172a] pb-2">
                    <h2 className="font-serif text-xl font-black text-slate-900">Top Stories</h2>
                  </div>
                  <div className="grid gap-6 sm:grid-cols-2">
                    {grid.slice(0, 6).map((a) => (
                      <ArticleCard key={a.id} article={a} />
                    ))}
                  </div>
                </div>
              )}
            </div>
            <Sidebar latest={latest} mostRead={mostRead} trending={trending} />
          </div>

          {/* More top stories */}
          {grid.length > 6 && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {grid.slice(6, 12).map((a) => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </div>
          )}

          {/* Trending strip */}
          {trending.length > 0 && (
            <section aria-label="Trending" className="border-t-2 border-slate-900 pt-4">
              <div className="mb-4 flex items-center gap-2">
                <span className="text-[#c1121f]"><TrendingUp size={20} /></span>
                <h2 className="font-serif text-2xl font-black text-slate-900">Trending Now</h2>
              </div>
              <div className="grid gap-x-8 gap-y-2 md:grid-cols-2">
                {trending.slice(0, 6).map((a) => (
                  <ArticleRow key={a.id} article={a} />
                ))}
              </div>
            </section>
          )}

          {/* Category sections — driven by whatever categories the API returns */}
          {sections.map((s) => (
            <CategorySection key={s.category.id} category={s.category} articles={s.articles} />
          ))}

          {/* Most read */}
          {mostRead.length > 0 && (
            <section aria-label="Most read" className="border-t-2 border-slate-900 pt-4">
              <div className="mb-4 flex items-center gap-2">
                <span className="text-[#c1121f]"><Flame size={20} /></span>
                <h2 className="font-serif text-2xl font-black text-slate-900">Most Read</h2>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {mostRead.slice(0, 4).map((a) => (
                  <ArticleCard key={a.id} article={a} size="small" />
                ))}
              </div>
            </section>
          )}

          <Newsletter />
        </div>
      )}
    </div>
  );
}

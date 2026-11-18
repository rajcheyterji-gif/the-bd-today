import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useHome } from "../hooks/useArticles";
import { useSiteData } from "../hooks/useCategories";
import { enrichArticles } from "../lib/api";
import { Seo } from "../components/Seo";
import { HeroArticle } from "../components/HeroArticle";
import { ArticleCard, ArticleRow, OverlayCard, TextStory } from "../components/ArticleCard";
import { HighlightsCarousel } from "../components/HighlightsCarousel";
import { NewsTabs } from "../components/NewsTabs";
import { CategorySection } from "../components/CategorySection";
import { Newsletter } from "../components/Newsletter";
import { Loading, ErrorState } from "../components/Loading";
import { EmptyState } from "../components/EmptyState";
import type { Article, Category } from "../../shared/types";

/** Take up to `n` articles from `pool` that have not been used yet. */
function take(pool: Article[], used: Set<string | number>, n: number): Article[] {
  const out: Article[] = [];
  for (const a of pool) {
    if (out.length >= n) break;
    if (used.has(a.id)) continue;
    used.add(a.id);
    out.push(a);
  }
  return out;
}

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

  const enrich = (list: Article[]) => enrichArticles(list, categories);
  const featured = data.featured ? enrich([data.featured])[0] : null;
  const grid = enrich(data.grid);
  const latest = enrich(data.latest);
  const trending = enrich(data.trending);
  const mostRead = enrich(data.mostRead);
  const breakingIds = new Set<string | number>(data.breaking.map((a) => a.id));
  const sections = data.sections.map((s) => ({
    category: categories.find((c) => c.slug === s.category.slug) ?? s.category,
    articles: enrich(s.articles),
  }));

  // Dedup across the lead area: featured first, then the rails.
  const used = new Set<string | number>();
  if (featured) used.add(featured.id);
  const leftRail = take(grid, used, 3);
  const centerSub = take(grid, used, featured ? 2 : 4);
  const rightRail = take(grid, used, 4);
  const imageRow = take([...grid, ...latest], used, 4);
  const carousel = take(trending.length >= 3 ? trending : latest, used, 6);
  const bandItems = take(latest, used, 4);

  // Featured section prefers sports, else the first section; use fresh
  // (unused) stories when there are at least 2, else the full list.
  const featureSection = sections.find((s) => s.category.slug === "sports") ?? sections[0];
  const restSections = sections.filter((s) => s !== featureSection);
  const featureArticles = featureSection
    ? (() => {
        const fresh = featureSection.articles.filter((a) => !used.has(a.id));
        return fresh.length >= 2 ? fresh : featureSection.articles;
      })()
    : [];

  const isEmpty =
    !featured && grid.length === 0 && latest.length === 0 && sections.length === 0;

  const hasLeft = leftRail.length > 0;
  const hasRight = rightRail.length > 0;
  const centreSpan = hasLeft && hasRight ? "lg:col-span-6" : hasLeft || hasRight ? "lg:col-span-9" : "lg:col-span-12";

  return (
    <div className="mx-auto max-w-7xl px-4 py-5">
      <Seo />
      {isEmpty ? (
        <EmptyState
          title="Welcome to THE BD TODAY"
          message="The newsroom has not published its first story yet. Once editors publish from the CMS, the front page will fill with the latest Bangladesh and world news here."
        />
      ) : (
        <div className="flex flex-col gap-10">
          {/* §1 Lead block: left rail / hero + sub stories / right rail */}
          {(featured || leftRail.length > 0 || rightRail.length > 0) && (
            <div className="grid gap-8 lg:grid-cols-12 lg:gap-0">
              {hasLeft && (
                <div className="order-2 lg:order-1 lg:col-span-3 lg:pr-6">
                  <div className="divide-y divide-slate-200">
                    {leftRail.map((a) => (
                      <TextStory key={a.id} article={a} />
                    ))}
                  </div>
                </div>
              )}
              <div
                className={`order-1 lg:order-2 ${centreSpan} ${hasLeft ? "lg:border-l lg:border-slate-200 lg:pl-6" : ""} ${hasRight ? "lg:border-r lg:border-slate-200 lg:pr-6" : ""}`}
              >
                {featured && (
                  <HeroArticle article={featured} isBreaking={breakingIds.has(featured.id)} />
                )}
                {centerSub.length > 0 && (
                  <div className={`grid gap-6 sm:grid-cols-2 ${featured ? "mt-6 border-t border-slate-200 pt-5" : ""}`}>
                    {centerSub.map((a) => (
                      <ArticleCard key={a.id} article={a} size="small" />
                    ))}
                  </div>
                )}
              </div>
              {hasRight && (
                <div className="order-3 lg:col-span-3 lg:pl-6">
                  {rightRail.map((a) => (
                    <ArticleRow key={a.id} article={a} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* §2 Four-up image row */}
          {imageRow.length >= 2 && (
            <div className="grid gap-6 border-t border-slate-200 pt-6 sm:grid-cols-2 lg:grid-cols-4">
              {imageRow.map((a) => (
                <ArticleCard key={a.id} article={a} size="small" />
              ))}
            </div>
          )}

          {/* §3 Highlights carousel */}
          {carousel.length >= 3 && <HighlightsCarousel articles={carousel} />}

          {/* §4 Feature row: ranked tabs + featured category section */}
          {(mostRead.length > 0 || trending.length > 0 || latest.length > 0 || featureArticles.length > 0) && (
            <div className="grid gap-10 lg:grid-cols-3">
              <div className={featureArticles.length > 0 ? "lg:border-r lg:border-slate-200 lg:pr-8" : "lg:col-span-3"}>
                <NewsTabs mostRead={mostRead} trending={trending} latest={latest} />
              </div>
              {featureSection && featureArticles.length > 0 && (
                <div className="lg:col-span-2">
                  <div className="border-t-[3px] border-slate-800 pt-3 lg:border-t-0 lg:pt-0">
                    <FeatureSectionHeader category={featureSection.category} />
                    <ArticleCard article={featureArticles[0]} size="large" />
                    {featureArticles.length > 1 && (
                      <div className="mt-2 grid gap-x-8 sm:grid-cols-2">
                        {featureArticles.slice(1, 5).map((a) => (
                          <ArticleRow key={a.id} article={a} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* §5 Special-coverage band */}
          {bandItems.length >= 3 && (
            <section aria-label="Special coverage" className="-mx-4 bg-[#fdf0e3] px-4 py-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {bandItems.slice(0, 4).map((a) => (
                  <OverlayCard key={a.id} article={a} />
                ))}
              </div>
            </section>
          )}

          {/* §6 Category sections */}
          {restSections.map((s) => (
            <CategorySection key={s.category.id} category={s.category} articles={s.articles} />
          ))}

          {/* §7 Newsletter */}
          <Newsletter />
        </div>
      )}
    </div>
  );
}

function FeatureSectionHeader({ category }: { category: Category }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <Link
        to={`/category/${category.slug}`}
        className="group inline-flex items-center gap-0.5 font-serif text-[22px] font-black leading-none text-slate-900 sm:text-2xl"
      >
        {category.name_bn ?? category.name_en}
        <ChevronRight size={22} className="text-[#c1121f] transition-transform group-hover:translate-x-0.5" />
      </Link>
      <Link
        to={`/category/${category.slug}`}
        className="shrink-0 font-bengali text-[13px] font-medium text-slate-500 hover:text-[#c1121f]"
      >
        সব খবর
      </Link>
    </div>
  );
}

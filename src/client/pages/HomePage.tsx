import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Camera, ChevronRight } from "lucide-react";
import { useHome } from "../hooks/useArticles";
import { useSiteData } from "../hooks/useCategories";
import { enrichArticles } from "../lib/api";
import { formatRelative } from "../lib/format";
import { Seo } from "../components/Seo";
import { HeroArticle } from "../components/HeroArticle";
import { ArticleCard, ArticleRow, TextStory } from "../components/ArticleCard";
import { HighlightsCarousel } from "../components/HighlightsCarousel";
import { NewsTabs } from "../components/NewsTabs";
import { CategorySection } from "../components/CategorySection";
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

function timeOf(a: Article) {
  return formatRelative(a.published_at ?? a.created_at, true);
}

/** Two-column text-only headline list (screenshot 6), mobile only. */
function TwoColList({ articles }: { articles: Article[] }) {
  if (articles.length === 0) return null;
  const half = Math.ceil(articles.length / 2);
  const cols = [articles.slice(0, half), articles.slice(half)];
  return (
    <div className="grid grid-cols-2 divide-x divide-slate-200">
      {cols.map((col, ci) => (
        <div key={ci} className={`divide-y divide-slate-200 ${ci === 0 ? "pr-3" : "pl-3"}`}>
          {col.map((a) => (
            <article key={a.id} className="group py-3 first:pt-0 last:pb-0">
              <h3 className="font-serif text-[16px] font-bold leading-snug">
                <Link to={`/article/${a.slug}`} className="text-slate-900 group-hover:text-[#c1121f]">
                  {a.title}
                </Link>
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                <span className="font-bengali">{timeOf(a)}</span>
              </p>
            </article>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Photo card with the red camera badge (screenshot 4). */
function PhotoCard({ article }: { article: Article }) {
  return (
    <article className="group">
      <Link to={`/article/${article.slug}`} className="relative block overflow-hidden" aria-label={article.title}>
        {article.featured_image_url ? (
          <img
            src={article.featured_image_url}
            alt={article.image_caption || article.title}
            loading="lazy"
            className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <span className="flex aspect-[4/3] items-center justify-center bg-slate-100 px-4 text-center font-serif text-xs font-black uppercase tracking-[0.25em] text-slate-400">
            THE BD TODAY
          </span>
        )}
        <span className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#c1121f] text-white">
          <Camera size={14} />
        </span>
      </Link>
      <h3 className="mt-2 font-serif text-[15px] font-bold leading-snug">
        <Link to={`/article/${article.slug}`} className="text-slate-900 group-hover:text-[#c1121f]">
          {article.title}
        </Link>
      </h3>
      <p className="mt-1 text-xs text-slate-500">
        <span className="font-bengali">{timeOf(article)}</span>
      </p>
    </article>
  );
}

/**
 * অন্যান্য (screenshot 3): one bordered card per category in a horizontal
 * snap-scrolling row — red-underlined category label, photo + headline,
 * up to two more headlines, and a blue আরও button. Dots track the scroll.
 */
function OtherCategories({ sections }: { sections: { category: Category; articles: Article[] }[] }) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);

  const onScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>(":scope > *");
    const step = card ? card.offsetWidth + 12 : 1;
    setActive(Math.min(sections.length - 1, Math.round(el.scrollLeft / step)));
  };

  if (sections.length === 0) return null;
  return (
    <div>
      <h2 className="mb-4 font-serif text-[22px] font-black text-slate-900 sm:text-2xl">অন্যান্য</h2>
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {sections.map((s) => {
          const [top, ...more] = s.articles;
          return (
            <div
              key={s.category.id}
              className="w-[78%] shrink-0 snap-start rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:w-[320px]"
            >
              <span className="inline-block border-b-2 border-[#c1121f] pb-1 font-bengali text-[15px] font-bold text-slate-900">
                {s.category.name_bn ?? s.category.name_en}
              </span>
              {top && (
                <Link to={`/article/${top.slug}`} className="group mt-3 block">
                  {top.featured_image_url ? (
                    <img
                      src={top.featured_image_url}
                      alt={top.image_caption || top.title}
                      loading="lazy"
                      className="aspect-[16/9] w-full object-cover"
                    />
                  ) : (
                    <span className="flex aspect-[16/9] items-center justify-center bg-slate-100 px-4 text-center font-serif text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                      THE BD TODAY
                    </span>
                  )}
                  <span className="mt-2 block font-serif text-[17px] font-bold leading-snug text-slate-900 group-hover:text-[#c1121f]">
                    {top.title}
                  </span>
                </Link>
              )}
              {more.slice(0, 2).map((a) => (
                <Link
                  key={a.id}
                  to={`/article/${a.slug}`}
                  className="mt-2 block border-t border-slate-200 pt-2 font-serif text-[15px] font-bold leading-snug text-slate-900 hover:text-[#c1121f]"
                >
                  {a.title}
                </Link>
              ))}
              <Link
                to={`/category/${s.category.slug}`}
                className="mt-3 inline-flex items-center gap-1 rounded-md bg-[#e8f1f8] px-3 py-1.5 text-sm font-semibold text-[#2563eb] hover:bg-[#d6e6f2]"
              >
                আরও <ChevronRight size={15} />
              </Link>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex justify-center gap-1.5" aria-hidden="true">
        {sections.map((s, i) => (
          <span
            key={s.category.id}
            className={`h-1.5 rounded-full ${i === active ? "w-2.5 bg-slate-900" : "w-1.5 bg-slate-300"}`}
          />
        ))}
      </div>
    </div>
  );
}

export function HomePage() {
  const home = useHome();
  const site = useSiteData();

  if (home.isPending) return <Loading label="Loading today's news…" />;
  if (home.isError) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-10">
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
  // Sports first, then বাংলাদেশ, then the rest in API order.
  const orderedSections = [...sections].sort((a, b) => {
    const rank = (slug: string) => (slug === "sports" ? 0 : slug === "bangladesh" ? 1 : 2);
    return rank(a.category.slug) - rank(b.category.slug);
  });
  const sportsSection = orderedSections.find((s) => s.category.slug === "sports");
  const sportsLeadId = sportsSection?.articles[0]?.id;
  const sportsLive = sportsLeadId != null && breakingIds.has(sportsLeadId);

  // Dedup only inside the lead block; other sections may reuse stories,
  // exactly like the reference paper (a story appears in its category too).
  const used = new Set<string | number>();
  if (featured) used.add(featured.id);
  const leftRail = take(grid, used, 3);
  const rightRail = take(grid, used, 4);

  const twoCol = latest.slice(1, 5);
  const motamot = latest.slice(1, 4);
  const photoGrid = latest.slice(1, 5);
  const rows = latest.slice(4, 9);
  const carousel = (trending.length >= 3 ? trending : latest).slice(0, 6);
  const withPhotos = latest.filter((a) => a.featured_image_url);
  const photoSection = (withPhotos.length >= 2 ? withPhotos : latest).slice(0, 4);

  const isEmpty =
    !featured && grid.length === 0 && latest.length === 0 && sections.length === 0;

  const hasLeft = leftRail.length > 0;
  const hasRight = rightRail.length > 0;
  const centreSpan = hasLeft && hasRight ? "lg:col-span-6" : hasLeft || hasRight ? "lg:col-span-9" : "lg:col-span-12";

  return (
    <div className="mx-auto max-w-[1280px] px-4">
      <Seo />
      {isEmpty ? (
        <EmptyState
          title="Welcome to THE BD TODAY"
          message="The newsroom has not published its first story yet. Once editors publish from the CMS, the front page will fill with the latest Bangladesh and world news here."
        />
      ) : (
        <div className="flex flex-col">
          {/* §1 Lead block: left rail / hero / right rail (rails on lg only) */}
          {(featured || leftRail.length > 0 || rightRail.length > 0) && (
            <div className="grid gap-8 border-b border-slate-200 py-5 lg:grid-cols-12 lg:gap-0 lg:pt-4">
              {hasLeft && (
                <div className="order-2 hidden lg:order-1 lg:col-span-3 lg:block lg:pr-6">
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
                {featured && <HeroArticle article={featured} />}
              </div>
              {hasRight && (
                <div className="order-3 hidden lg:col-span-3 lg:block lg:pl-6">
                  {rightRail.map((a) => (
                    <ArticleRow key={a.id} article={a} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* §2 Two-column text list (mobile only; lg has the rails) */}
          {twoCol.length > 0 && (
            <div className="border-b border-slate-200 py-4 lg:hidden">
              <TwoColList articles={twoCol} />
            </div>
          )}

          {/* §3 মতামত-style rows: red kicker + headline + excerpt + right thumb */}
          {motamot.length > 0 && (
            <div className="border-b border-slate-200 py-4">
              {motamot.map((a) => (
                <TextStory
                  key={a.id}
                  article={a}
                  kicker={a.category ? (a.category.name_bn ?? a.category.name_en) : undefined}
                />
              ))}
            </div>
          )}

          {/* §4 Two-up photo grid */}
          {photoGrid.length >= 2 && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-5 border-b border-slate-200 py-5 lg:grid-cols-4">
              {photoGrid.map((a) => (
                <ArticleCard key={a.id} article={a} size="small" />
              ))}
            </div>
          )}

          {/* §5 Text+thumb rows (mobile only; lg has the right rail) */}
          {rows.length > 0 && (
            <div className="border-b border-slate-200 py-2 lg:hidden">
              {rows.map((a) => (
                <ArticleRow key={a.id} article={a} />
              ))}
            </div>
          )}

          {/* §6 Overlay carousel */}
          {carousel.length >= 3 && (
            <div className="border-b border-slate-200 py-5">
              <HighlightsCarousel articles={carousel} />
            </div>
          )}

          {/* §7 Ranked tabs, framed by the thick grey rules from the screenshots */}
          {(mostRead.length > 0 || trending.length > 0 || latest.length > 0) && (
            <div>
              <div className="mt-5 h-[6px] bg-slate-200" />
              <div className="py-5">
                <NewsTabs mostRead={mostRead} trending={trending} latest={latest} />
              </div>
              <div className="h-[6px] bg-slate-200" />
            </div>
          )}

          {/* §8 Category sections — খেলা first (overlay lead), বাংলাদেশ with the এলাকার খবর box */}
          {orderedSections.map((s) => (
            <div key={s.category.id} className="pt-5">
              <CategorySection
                category={s.category}
                articles={s.articles}
                showLocalBox={s.category.slug === "bangladesh"}
                overlayLead={s.category.slug === "sports"}
                liveLead={s.category.slug === "sports" && sportsLive}
                dot={s.category.slug === "sports" ? "#2563eb" : undefined}
              />
            </div>
          ))}

          {/* §9 ছবিঘর: photo grid with red camera badges */}
          {photoSection.length >= 2 && (
            <div className="mt-5 border-t-[3px] border-slate-800 pt-3">
              <div className="mb-4">
                <Link
                  to="/latest"
                  className="group inline-flex items-center gap-0.5 font-serif text-[22px] font-black leading-none text-slate-900 hover:text-[#c1121f] sm:text-2xl"
                >
                  ছবিঘর
                  <ChevronRight size={22} className="text-[#c1121f] transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-5 pb-5 lg:grid-cols-4">
                {photoSection.map((a) => (
                  <PhotoCard key={a.id} article={a} />
                ))}
              </div>
            </div>
          )}

          {/* §10 অন্যান্য: horizontal swipeable category cards */}
          {orderedSections.length > 0 && (
            <div className="border-t border-slate-200 py-5">
              <OtherCategories sections={orderedSections} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

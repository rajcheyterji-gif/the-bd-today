import { Link } from "react-router-dom";
import { useHome } from "../hooks/useArticles";
import { enrichArticles } from "../lib/api";
import { useSiteData } from "../hooks/useCategories";

/**
 * Masthead: left-aligned wordmark + tagline, with a live top-stories strip
 * on the right (first 3 deduped stories from breaking + latest).
 */
export function Masthead() {
  const home = useHome();
  const site = useSiteData();
  const data = home.data?.data;
  const categories = site.data?.data?.categories ?? [];

  const breakingIds = new Set<string | number>((data?.breaking ?? []).map((a) => a.id));
  const seen = new Set<string | number>();
  const topStories = [...(data?.breaking ?? []), ...(data?.latest ?? [])]
    .filter((a) => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    })
    .slice(0, 3)
    .map((a) => enrichArticles([a], categories)[0] ?? a);

  return (
    <header className="bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4">
        <Link to="/" className="group shrink-0" aria-label="THE BD TODAY — home">
          <h1 className="font-serif text-4xl font-black leading-none tracking-tight text-slate-900 sm:text-[42px]">
            THE BD <span className="text-[#c1121f]">TODAY</span>
          </h1>
          <span className="mt-1 block font-bengali text-[13px] text-slate-500">
            দ্য বিডি টুডে — সত্য, সবার আগে
          </span>
        </Link>

        {topStories.length > 0 && (
          <div className="hidden divide-x divide-slate-200 lg:flex" aria-label="Top stories">
            {topStories.map((a) => (
              <Link key={a.id} to={`/article/${a.slug}`} className="group flex w-60 gap-2.5 px-4">
                {a.featured_image_url ? (
                  <img
                    src={a.featured_image_url}
                    alt=""
                    loading="lazy"
                    className="h-12 w-16 shrink-0 object-cover"
                  />
                ) : (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#c1121f]" />
                )}
                <span className="min-w-0">
                  {breakingIds.has(a.id) && (
                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#c1121f]">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#c1121f]" />
                      Live
                    </span>
                  )}
                  <span className="line-clamp-2 font-serif text-[13px] font-bold leading-snug text-slate-900 group-hover:text-[#c1121f]">
                    {a.title}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}

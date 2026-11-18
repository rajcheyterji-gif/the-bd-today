import { useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatRelative, excerptFrom } from "../lib/format";
import type { Article } from "../../shared/types";

/**
 * Highlights carousel: a light-blue full-bleed band with a horizontal
 * snap-scrolling row of image cards and arrow buttons.
 */
export function HighlightsCarousel({ articles }: { articles: Article[] }) {
  const trackRef = useRef<HTMLDivElement | null>(null);

  const scrollBy = (dx: number) => {
    trackRef.current?.scrollBy({ left: dx, behavior: "smooth" });
  };

  return (
    <section aria-label="Highlights" className="relative -mx-4 bg-[#e9f3f8] px-4 py-6">
      <div
        ref={trackRef}
        className="flex snap-x gap-5 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {articles.map((a) => (
          <article key={a.id} className="group w-[240px] shrink-0 snap-start sm:w-[264px]">
            <Link to={`/article/${a.slug}`} aria-label={a.title}>
              <div className="overflow-hidden">
                {a.featured_image_url ? (
                  <img
                    src={a.featured_image_url}
                    alt={a.image_caption || a.title}
                    loading="lazy"
                    className="aspect-[16/9] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="flex aspect-[16/9] items-center justify-center bg-slate-100 px-4 text-center">
                    <span className="font-serif text-sm font-black uppercase tracking-[0.25em] text-slate-400">
                      THE BD TODAY
                    </span>
                  </div>
                )}
              </div>
            </Link>
            <div className="px-1 pt-3 text-center">
              <h3 className="font-serif text-[17px] font-bold leading-snug">
                <Link to={`/article/${a.slug}`} className="text-slate-900 group-hover:text-[#c1121f]">
                  {a.title}
                </Link>
              </h3>
              <p className="mt-1 line-clamp-3 text-[13px] leading-relaxed text-slate-600">
                {excerptFrom(a.content, a.excerpt, 110)}
              </p>
              <p className="mt-2 font-bengali text-xs text-slate-500">
                {formatRelative(a.published_at ?? a.created_at, true)}
              </p>
            </div>
          </article>
        ))}
      </div>
      <button
        type="button"
        aria-label="Previous highlights"
        onClick={() => scrollBy(-300)}
        className="absolute -left-1 top-14 hidden bg-slate-900/85 p-2 text-white hover:bg-[#c1121f] sm:block"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        type="button"
        aria-label="Next highlights"
        onClick={() => scrollBy(300)}
        className="absolute -right-1 top-14 hidden bg-slate-900/85 p-2 text-white hover:bg-[#c1121f] sm:block"
      >
        <ChevronRight size={18} />
      </button>
    </section>
  );
}

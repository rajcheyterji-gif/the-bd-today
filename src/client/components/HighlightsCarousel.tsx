import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { OverlayCard } from "./ArticleCard";
import type { Article } from "../../shared/types";

/**
 * Overlay carousel (screenshot 10): a horizontal snap-scrolling row of
 * photo cards with the category label and headline overlaid on the image,
 * and orange/grey progress segments underneath showing the scroll position.
 * No band, no box — the cards sit straight on the white page.
 */
export function HighlightsCarousel({ articles }: { articles: Article[] }) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);

  const scrollBy = (dx: number) => {
    trackRef.current?.scrollBy({ left: dx, behavior: "smooth" });
  };

  const onScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>(":scope > *");
    const step = card ? card.offsetWidth + 12 : 1;
    setActive(Math.min(articles.length - 1, Math.round(el.scrollLeft / step)));
  };

  return (
    <div>
      <div className="relative">
        <div
          ref={trackRef}
          onScroll={onScroll}
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {articles.map((a) => (
            <div key={a.id} className="w-[82%] shrink-0 snap-start sm:w-[46%] lg:w-[31.5%]">
              <OverlayCard article={a} ratio="aspect-[16/10]" />
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => scrollBy(-360)}
          aria-label="Previous stories"
          className="absolute -left-2 top-1/3 hidden h-9 w-9 items-center justify-center rounded-full bg-white text-slate-900 shadow-md hover:bg-slate-100 sm:flex"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          type="button"
          onClick={() => scrollBy(360)}
          aria-label="Next stories"
          className="absolute -right-2 top-1/3 hidden h-9 w-9 items-center justify-center rounded-full bg-white text-slate-900 shadow-md hover:bg-slate-100 sm:flex"
        >
          <ChevronRight size={20} />
        </button>
      </div>
      {/* Progress segments: left-aligned, the active one orange and longer */}
      <div className="mt-3 flex justify-start gap-1.5" aria-hidden="true">
        {articles.map((a, i) => (
          <span
            key={a.id}
            className={`h-1 rounded-full ${i === active ? "w-[70px] bg-[#f97316]" : "w-[55px] bg-slate-300"}`}
          />
        ))}
      </div>
    </div>
  );
}

import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, Crosshair } from "lucide-react";
import { ArticleCard, ArticleRow, OverlayCard } from "./ArticleCard";
import type { Article, Category } from "../../shared/types";

/** The eight divisions for the আমার এলাকার খবর box. */
const DIVISIONS = ["ঢাকা", "চট্টগ্রাম", "খুলনা", "রাজশাহী", "বরিশাল", "সিলেট", "রংপুর", "ময়মনসিংহ"];

/**
 * One category section, as in the screenshots: a Bengali heading with a
 * red chevron, then a big lead photo + headline, a 2×2 photo grid, and
 * text+thumb rows.
 *
 * - `showLocalBox` (বাংলাদেশ) renders the light-blue আমার এলাকার খবর box
 *   with the বিভাগ dropdown under the heading.
 * - `overlayLead` (খেলা) renders the lead as an overlay photo card with a
 *   সরাসরি badge, and `dot` colours the dot before the heading.
 */
export function CategorySection({
  category,
  articles,
  showLocalBox = false,
  overlayLead = false,
  liveLead = false,
  dot,
}: {
  category: Category;
  articles: Article[];
  showLocalBox?: boolean;
  overlayLead?: boolean;
  liveLead?: boolean;
  dot?: string;
}) {
  const navigate = useNavigate();
  if (articles.length === 0) return null;
  const [lead, ...rest] = articles;
  const grid = rest.slice(0, 4);
  const rows = rest.slice(4);

  return (
    <section aria-label={category.name_en} className="border-t-[3px] border-slate-800 pt-3">
      <div className="mb-4">
        <Link
          to={`/category/${category.slug}`}
          className="group inline-flex items-center gap-1.5 font-serif text-[22px] font-black leading-none text-slate-900 hover:text-[#c1121f] sm:text-2xl"
        >
          {dot ? <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: dot }} aria-hidden="true" /> : null}
          {category.name_bn ?? category.name_en}
          <ChevronRight size={22} className="text-[#c1121f] transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {showLocalBox && (
        <div className="mb-5 flex flex-col gap-2 rounded-md bg-[#e8f1f8] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 font-bengali text-[15px] font-bold text-slate-900">
            <Crosshair size={18} className="text-[#c1121f]" />
            আমার এলাকার খবর
          </p>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            বিভাগ
            <select
              aria-label="বিভাগ বেছে নিন"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) navigate(`/category/${category.slug}`);
              }}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:border-[#c1121f] focus:outline-none"
            >
              <option value="" disabled>
                বিভাগ বেছে নিন
              </option>
              {DIVISIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {overlayLead && lead ? (
        <OverlayCard article={lead} badge={liveLead ? "সরাসরি" : undefined} ratio="aspect-[16/9]" />
      ) : (
        lead && (
          <div className="max-w-3xl">
            <ArticleCard article={lead} size="large" />
          </div>
        )
      )}

      {grid.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5 lg:grid-cols-4">
          {grid.map((a) => (
            <ArticleCard key={a.id} article={a} size="small" />
          ))}
        </div>
      )}

      {rows.length > 0 && (
        <div className="mt-2">
          {rows.map((a) => (
            <ArticleRow key={a.id} article={a} />
          ))}
        </div>
      )}
    </section>
  );
}

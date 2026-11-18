import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Globe, Menu, X } from "lucide-react";
import { useSiteData } from "../hooks/useCategories";
import { resolveNavHref } from "./Footer";
import { TrendingFlameIcon } from "./TrendingIcon";

/**
 * Sticky category nav (Prothom Alo mobile header, row 2): a horizontally
 * scrollable row of category links — সর্বশেষ first, then every category —
 * with the peach "Eng" toggle and the hamburger pinned at the right end.
 * Eng switches the nav labels to English (categories carry name_en).
 * The hamburger opens the full menu panel below the nav. The scroll row
 * fades out at its right edge (mask) so a category never looks sliced
 * mid-word where the pinned Eng/hamburger block begins, and the pinned
 * block sits flush with the row — no card, border or shadow over it.
 */
export function Navbar() {
  const { pathname } = useLocation();
  const { data } = useSiteData();
  const categories = data?.data?.categories ?? [];
  const navigation = data?.data?.navigation ?? [];
  const [menuOpen, setMenuOpen] = useState(false);
  const [eng, setEng] = useState(false);

  const label = (bn: string, en: string) => (eng ? en : bn);
  const catLabel = (c: { name_bn?: string | null; name_en: string }) =>
    eng ? c.name_en : (c.name_bn ?? c.name_en);

  const active = (href: string) => pathname === href;

  const linkCls = (href: string) =>
    `shrink-0 whitespace-nowrap px-2.5 py-2.5 text-[14px] font-medium sm:px-3 sm:text-[15px] ${
      active(href) ? "font-bold text-[#c1121f]" : "text-slate-900 hover:text-[#c1121f]"
    }`;

  return (
    <div className="sticky top-0 z-40 border-b border-slate-200 bg-white">
      <nav className="mx-auto flex max-w-[1280px] items-stretch" aria-label="Categories">
        {/* Scrollable category row — fades at the right edge so the last
            visible label never looks sliced mid-word */}
        <div className="flex min-w-0 flex-1 items-center overflow-x-auto pr-2 [mask-image:linear-gradient(to_right,black_88%,transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Link to="/latest" className={linkCls("/latest")}>
            {label("সর্বশেষ", "Latest")}
          </Link>
          {categories.map((c) => (
            <Link key={c.id} to={`/category/${c.slug}`} className={linkCls(`/category/${c.slug}`)}>
              {catLabel(c)}
            </Link>
          ))}
          <Link
            to="/breaking"
            className={`${linkCls("/breaking")} flex items-center gap-1`}
          >
            <TrendingFlameIcon size={15} />
            {label("ব্রেকিং", "Breaking")}
          </Link>
        </div>

        {/* Pinned right end: Eng toggle + hamburger, flush with the row */}
        <div className="flex shrink-0 items-center gap-1.5 bg-white py-1.5 pl-1 pr-2">
          <button
            type="button"
            onClick={() => setEng((v) => !v)}
            aria-pressed={eng}
            aria-label={eng ? "Switch navigation to Bengali" : "Switch navigation to English"}
            className="flex items-center gap-1 rounded-md bg-[#fde9e2] px-2.5 py-2 text-[13px] font-semibold text-slate-900 hover:bg-[#fbdcd2]"
          >
            <Globe size={15} strokeWidth={2.5} />
            {eng ? "বাংলা" : "Eng"}
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="rounded-md p-1.5 text-slate-900 hover:bg-slate-100"
          >
            {menuOpen ? <X size={22} strokeWidth={2.5} /> : <Menu size={22} strokeWidth={2.5} />}
          </button>
        </div>
      </nav>

      {/* Full menu panel */}
      {menuOpen && (
        <div className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-[1280px] px-4 py-4">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3 lg:grid-cols-4">
              <Link
                to="/latest"
                onClick={() => setMenuOpen(false)}
                className="border-b border-slate-100 py-2 text-[15px] font-medium text-slate-900 hover:text-[#c1121f]"
              >
                {label("সর্বশেষ", "Latest")}
              </Link>
              {categories.map((c) => (
                <Link
                  key={c.id}
                  to={`/category/${c.slug}`}
                  onClick={() => setMenuOpen(false)}
                  className="border-b border-slate-100 py-2 text-[15px] font-medium text-slate-900 hover:text-[#c1121f]"
                >
                  {catLabel(c)}
                </Link>
              ))}
              <Link
                to="/breaking"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-1.5 border-b border-slate-100 py-2 text-[15px] font-medium text-slate-900 hover:text-[#c1121f]"
              >
                <TrendingFlameIcon size={16} />
                {label("ব্রেকিং", "Breaking")}
              </Link>
            </div>

            <p className="mb-2 mt-5 text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
              {label("আরও", "More")}
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3 lg:grid-cols-4">
              {navigation.map((item) => (
                <Link
                  key={item.id}
                  to={resolveNavHref(item.url)}
                  onClick={() => setMenuOpen(false)}
                  className="border-b border-slate-100 py-2 text-[15px] text-slate-700 hover:text-[#c1121f]"
                >
                  {item.label_bn}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

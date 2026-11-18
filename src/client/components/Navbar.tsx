import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useSiteData } from "../hooks/useCategories";
import { resolveNavHref } from "./Footer";

/**
 * Sticky category nav (Prothom Alo mobile header, row 2): a horizontally
 * scrollable row of Bengali category links — সর্বশেষ first, then every
 * category — with the hamburger pinned at the right end. The site is
 * Bengali-only: the old Eng/বাংলা Google Translate toggle was removed
 * 2026-11-18 (it leaked Google's own popup onto the page), so there is
 * no language button here at all and no Google code loads anywhere.
 * The scroll row fades out at its right edge (mask) so a category never
 * looks sliced mid-word where the pinned hamburger block begins, and
 * the pinned block sits flush with the row — no card, border or shadow
 * over it. Once the reader scrolls past the masthead, the nav gains a
 * soft shadow so it stays readable over photos.
 */
export function Navbar() {
  const { pathname } = useLocation();
  const { data } = useSiteData();
  const categories = data?.data?.categories ?? [];
  const navigation = data?.data?.navigation ?? [];
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const active = (href: string) => pathname === href;

  const linkCls = (href: string) =>
    `shrink-0 whitespace-nowrap px-2.5 py-2.5 font-serif text-[19px] font-bold sm:px-3 ${
      active(href) ? "font-black text-[#c1121f]" : "text-[#111111] hover:text-[#c1121f]"
    }`;

  return (
    <div
      className={`sticky top-0 z-40 border-b border-slate-200 bg-white transition-shadow ${
        scrolled ? "shadow-[0_2px_12px_rgba(15,23,42,0.12)]" : ""
      }`}
    >
      <nav className="mx-auto flex max-w-[1280px] items-stretch" aria-label="Categories">
        {/* Scrollable category row — fades at the right edge so the last
            visible label never looks sliced mid-word */}
        <div className="flex min-w-0 flex-1 items-center overflow-x-auto pr-2 [mask-image:linear-gradient(to_right,black_88%,transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Link to="/latest" className={linkCls("/latest")}>
            সর্বশেষ
          </Link>
          {categories.map((c) => (
            <Link key={c.id} to={`/category/${c.slug}`} className={linkCls(`/category/${c.slug}`)}>
              {c.name_bn ?? c.name_en}
            </Link>
          ))}
          <Link
            to="/breaking"
            className={`${linkCls("/breaking")} flex items-center gap-1.5`}
          >
            {/* Solid red live dot — sober breaking marker, no cartoon flame */}
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#c1121f]" aria-hidden="true" />
            ব্রেকিং
          </Link>
        </div>

        {/* Pinned right end: hamburger only, flush with the row */}
        <div className="flex shrink-0 items-center bg-white py-1.5 pl-1 pr-2">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="rounded-md p-1.5 text-[#111111] hover:bg-slate-100"
          >
            {menuOpen ? <X size={24} strokeWidth={2.75} /> : <Menu size={24} strokeWidth={2.75} />}
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
                className="border-b border-slate-100 py-2 font-serif text-[18px] font-bold text-[#111111] hover:text-[#c1121f]"
              >
                সর্বশেষ
              </Link>
              {categories.map((c) => (
                <Link
                  key={c.id}
                  to={`/category/${c.slug}`}
                  onClick={() => setMenuOpen(false)}
                  className="border-b border-slate-100 py-2 font-serif text-[18px] font-bold text-[#111111] hover:text-[#c1121f]"
                >
                  {c.name_bn ?? c.name_en}
                </Link>
              ))}
              <Link
                to="/breaking"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-1.5 border-b border-slate-100 py-2 font-serif text-[18px] font-bold text-[#111111] hover:text-[#c1121f]"
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#c1121f]" aria-hidden="true" />
                ব্রেকিং
              </Link>
            </div>

            <p className="mb-2 mt-5 text-[13px] font-bold uppercase tracking-[0.15em] text-[#111111]">
              আরও
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

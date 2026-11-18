import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, Search, User, X } from "lucide-react";
import { useSiteData } from "../hooks/useCategories";

/**
 * Main navigation: white sticky bar, Bengali category names, সর্বশেষ first
 * and ব্রেকিং last. Search opens an expanding row; the full menu panel
 * lists every section in a grid.
 */
export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { data } = useSiteData();
  const categories = data?.data?.categories ?? [];

  const isActive = (to: string) => pathname === to;
  const linkCls = (active: boolean) =>
    `whitespace-nowrap py-3 text-[15px] font-semibold leading-none transition-colors ${
      active ? "text-[#c1121f]" : "text-slate-900 hover:text-[#c1121f]"
    }`;

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <nav
      className="sticky top-0 z-40 border-y border-slate-300 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.08)]"
      aria-label="Main"
    >
      <div className="mx-auto flex max-w-7xl items-stretch justify-between px-4">
        {/* Mobile: hamburger + mini wordmark */}
        <div className="flex items-center gap-3 lg:hidden">
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((v) => !v)}
            className="py-2.5 text-slate-900"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <Link to="/" className="py-2.5 font-serif text-xl font-black tracking-tight text-slate-900">
            THE BD <span className="text-[#c1121f]">TODAY</span>
          </Link>
        </div>

        {/* Desktop links */}
        <div className="hidden items-center gap-5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:flex">
          <Link to="/latest" className={linkCls(isActive("/latest"))}>
            সর্বশেষ
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              to={`/category/${c.slug}`}
              className={linkCls(isActive(`/category/${c.slug}`))}
            >
              {c.name_bn ?? c.name_en}
            </Link>
          ))}
          <Link to="/breaking" className={linkCls(isActive("/breaking"))}>
            ব্রেকিং
          </Link>
        </div>

        {/* Right utilities */}
        <div className="flex items-center">
          <button
            type="button"
            aria-expanded={searchOpen}
            aria-label={searchOpen ? "Close search" : "Open search"}
            onClick={() => setSearchOpen((v) => !v)}
            className="flex items-center gap-1.5 border-l border-slate-200 px-3 py-3 text-sm font-semibold text-slate-900 hover:text-[#c1121f]"
          >
            <Search size={19} />
            <span className="hidden font-bengali xl:inline">খুঁজুন</span>
          </button>
          <Link
            to="/admin"
            aria-label="Newsroom login"
            className="hidden items-center border-l border-slate-200 px-3 py-3 text-slate-900 hover:text-[#c1121f] sm:flex"
          >
            <User size={18} />
          </Link>
        </div>
      </div>

      {/* Expanding search row */}
      {searchOpen && (
        <div className="border-t border-slate-200 bg-white">
          <form role="search" onSubmit={submitSearch} className="mx-auto flex max-w-7xl gap-2 px-4 py-2.5">
            <label htmlFor="navbar-search" className="sr-only">Search news</label>
            <input
              id="navbar-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="খবর খুঁজুন — Search news, topics, people…"
              className="min-w-0 flex-1 border border-slate-300 px-3 py-2 text-sm focus:border-[#c1121f] focus:outline-none"
            />
            <button
              type="submit"
              className="bg-[#c1121f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#9e0e19]"
            >
              খুঁজুন
            </button>
          </form>
        </div>
      )}

      {/* Full menu panel */}
      {menuOpen && (
        <div className="border-t border-slate-200 bg-white">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 px-4 py-4 sm:grid-cols-3 lg:grid-cols-4">
            <Link to="/latest" onClick={() => setMenuOpen(false)} className="border-b border-slate-100 py-2.5 text-[15px] font-semibold text-slate-900 hover:text-[#c1121f]">
              সর্বশেষ
            </Link>
            <Link to="/breaking" onClick={() => setMenuOpen(false)} className="border-b border-slate-100 py-2.5 text-[15px] font-semibold text-slate-900 hover:text-[#c1121f]">
              ব্রেকিং
            </Link>
            {categories.map((c) => (
              <Link
                key={c.id}
                to={`/category/${c.slug}`}
                onClick={() => setMenuOpen(false)}
                className="border-b border-slate-100 py-2.5 text-[15px] font-semibold text-slate-900 hover:text-[#c1121f]"
              >
                {c.name_bn ?? c.name_en}
                {c.name_bn && c.name_en && c.name_en !== c.name_bn && (
                  <span className="ml-2 text-xs font-normal text-slate-400">{c.name_en}</span>
                )}
              </Link>
            ))}
            <Link to="/about" onClick={() => setMenuOpen(false)} className="border-b border-slate-100 py-2.5 text-[15px] font-semibold text-slate-900 hover:text-[#c1121f]">
              About
            </Link>
            <Link to="/contact" onClick={() => setMenuOpen(false)} className="border-b border-slate-100 py-2.5 text-[15px] font-semibold text-slate-900 hover:text-[#c1121f]">
              Contact
            </Link>
            <Link to="/admin" onClick={() => setMenuOpen(false)} className="border-b border-slate-100 py-2.5 text-[15px] font-semibold text-[#c1121f]">
              Newsroom Login
            </Link>
            {categories.length === 0 && (
              <p className="py-2.5 text-sm text-slate-400">Sections will appear once editors create them.</p>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

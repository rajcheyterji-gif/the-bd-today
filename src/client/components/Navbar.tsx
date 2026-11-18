import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useSiteData } from "../hooks/useCategories";

/** Main navigation: Home + categories from the API, mobile menu included. */
export function Navbar() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { data } = useSiteData();
  const categories = data?.data?.categories ?? [];

  const isActive = (to: string) => pathname === to;

  const linkCls = (active: boolean) =>
    `whitespace-nowrap rounded px-3 py-2 text-sm font-semibold transition-colors ${
      active ? "bg-[#c1121f] text-white" : "text-white hover:bg-white/10"
    }`;

  return (
    <nav className="sticky top-0 z-40 bg-[#0f172a] text-white shadow" aria-label="Main">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4">
        <button
          type="button"
          className="flex items-center gap-2 py-2.5 text-sm font-semibold md:hidden"
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
          Menu
        </button>
        <div className="hidden items-center gap-1 overflow-x-auto py-1 md:flex">
          <Link to="/" className={linkCls(isActive("/"))}>Home</Link>
          <Link to="/latest" className={linkCls(isActive("/latest"))}>Latest</Link>
          <Link to="/breaking" className={linkCls(isActive("/breaking"))}>Breaking</Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              to={`/category/${c.slug}`}
              className={linkCls(isActive(`/category/${c.slug}`))}
            >
              {c.name_en}
            </Link>
          ))}
        </div>
        <Link
          to="/search"
          className="hidden rounded px-3 py-2 text-sm font-medium text-slate-300 hover:text-white md:block"
        >
          Search
        </Link>
        <Link to="/" className="py-2.5 font-serif text-lg font-black tracking-tight md:hidden">
          THE BD <span className="text-[#ff4d5e]">TODAY</span>
        </Link>
      </div>
      {open && (
        <div className="border-t border-white/10 px-4 pb-4 md:hidden">
          <div className="flex flex-col">
            <Link to="/" onClick={() => setOpen(false)} className="border-b border-white/10 py-2.5 text-sm font-semibold">Home</Link>
            <Link to="/latest" onClick={() => setOpen(false)} className="border-b border-white/10 py-2.5 text-sm font-semibold">Latest</Link>
            <Link to="/breaking" onClick={() => setOpen(false)} className="border-b border-white/10 py-2.5 text-sm font-semibold">Breaking</Link>
            {categories.map((c) => (
              <Link
                key={c.id}
                to={`/category/${c.slug}`}
                onClick={() => setOpen(false)}
                className="border-b border-white/10 py-2.5 text-sm font-semibold"
              >
                {c.name_en}
                {c.name_bn ? <span className="ml-2 font-bengali text-xs text-slate-400">{c.name_bn}</span> : null}
              </Link>
            ))}
            {categories.length === 0 && (
              <p className="py-2.5 text-sm text-slate-400">Categories will appear once editors create them.</p>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

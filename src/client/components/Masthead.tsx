import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { Logo } from "./Logo";

/** Solid (filled) magnifier — Lucide's outline search reads thin and cheap at small sizes. */
function FilledSearchIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.75} strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <line x1="16.5" y1="16.5" x2="21" y2="21" />
    </svg>
  );
}

/** Solid (filled) person — matches Prothom Alo's filled Login icon. */
function FilledUserIcon({ size = 21 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </svg>
  );
}

/**
 * Masthead (Prothom Alo mobile header, row 1): the logo is a very wide
 * 7:1 lockup, so on small screens it gets a DEDICATED full-width row,
 * centred and big (~48px tall — the most a 360px phone fits), with the
 * Bengali date on the left and the solid search icon + divider + Login
 * in a slim utility row underneath — the logo can never squeeze the
 * icons out, and the icons can never hide behind the logo. From sm up
 * the masthead is a single row again: the logo is absolutely CENTRED
 * (64px at sm, 80px at md, 96px at lg) while the icons sit in normal
 * flow at the right. Tapping the magnifier opens a clean full-width
 * pill search bar (Bengali placeholder, clear + close controls,
 * autofocus, Escape to close); submitting still navigates to
 * /search?q=… exactly as before.
 */
export function Masthead() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const todayBn = new Intl.DateTimeFormat("bn-BD", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  const closeSearch = () => {
    setSearchOpen(false);
    setQuery("");
  };

  const toggleSearch = () => {
    if (searchOpen) closeSearch();
    else setSearchOpen(true);
  };

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q) {
      closeSearch();
      navigate(`/search?q=${encodeURIComponent(q)}`);
    }
  };

  return (
    <header className="bg-white">
      <div className="relative mx-auto max-w-[1280px] px-3 sm:flex sm:items-center sm:justify-end sm:px-4 sm:py-3">
        <Link
          to="/"
          className="flex justify-center py-2 sm:absolute sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:py-0"
          aria-label="THE BD TODAY — home"
        >
          <Logo
            markClassName="h-5 w-auto min-[380px]:h-[22px] sm:h-9"
            wordmarkClassName="text-[18px] min-[380px]:text-[20px] min-[480px]:text-[24px] sm:text-4xl"
          />
        </Link>

        <div className="relative z-10 flex items-center justify-between border-t border-slate-100 sm:justify-end sm:border-t-0">
          <span className="py-1.5 text-[13px] font-medium text-slate-500 sm:hidden">
            {todayBn}
          </span>
          <div className="flex items-center bg-white">
            <button
              type="button"
              aria-expanded={searchOpen}
              aria-label={searchOpen ? "Close search" : "Open search"}
              onClick={toggleSearch}
              className="p-2 text-slate-900 hover:text-[#c1121f]"
            >
              {searchOpen ? <X size={22} strokeWidth={2.5} /> : <FilledSearchIcon size={22} />}
            </button>
            <span className="mx-1 h-6 w-px bg-slate-300" aria-hidden="true" />
            <Link
              to="/admin"
              className="flex items-center gap-1.5 py-2 pl-1 pr-1 text-[15px] font-medium text-slate-900 hover:text-[#c1121f]"
            >
              <FilledUserIcon size={21} />
              <span className="hidden min-[480px]:inline">Login</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Full-width search bar */}
      {searchOpen && (
        <div className="border-t border-slate-200 bg-white">
          <form
            role="search"
            onSubmit={submitSearch}
            className="mx-auto flex max-w-[1280px] items-center gap-2 px-4 py-3"
          >
            <div className="relative min-w-0 flex-1">
              <button
                type="submit"
                aria-label="খুঁজুন"
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#c1121f]"
              >
                <FilledSearchIcon size={20} />
              </button>
              <label htmlFor="masthead-search" className="sr-only">
                খুঁজুন
              </label>
              <input
                ref={inputRef}
                id="masthead-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") closeSearch();
                }}
                placeholder="খুঁজুন"
                className="w-full rounded-full border border-slate-300 bg-white py-2.5 pl-11 pr-10 text-[15px] text-slate-900 placeholder:text-slate-400 focus:border-[#c1121f] focus:outline-none focus:ring-1 focus:ring-[#c1121f] [&::-webkit-search-cancel-button]:appearance-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:text-slate-700"
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={closeSearch}
              aria-label="Close search"
              className="shrink-0 rounded-full p-2 text-slate-700 hover:bg-slate-100"
            >
              <X size={22} strokeWidth={2.5} />
            </button>
          </form>
        </div>
      )}
    </header>
  );
}

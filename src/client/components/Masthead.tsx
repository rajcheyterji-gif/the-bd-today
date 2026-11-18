import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { Logo } from "./Logo";

/** Solid (filled) magnifier — Lucide's outline search reads thin and cheap at small sizes. */
function FilledSearchIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
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
 * Masthead (Prothom Alo mobile header, row 1): the logo lockup CENTRED
 * in the row, with the solid search icon + divider + Login pinned at the
 * right — exactly like the reference screenshot. Tapping the magnifier
 * opens a clean full-width pill search bar (Bengali placeholder, clear
 * + close controls, autofocus, Escape to close); submitting still
 * navigates to /search?q=… exactly as before.
 */
export function Masthead() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

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
      <div className="mx-auto grid max-w-[1280px] grid-cols-[1fr_auto_1fr] items-center px-3 py-3 sm:px-4">
        <span aria-hidden="true" />

        <Link to="/" className="min-w-0" aria-label="THE BD TODAY — home">
          <Logo markClassName="h-[26px] w-auto sm:h-9" wordmarkClassName="text-[24px] sm:text-4xl" />
        </Link>

        <div className="flex items-center justify-end">
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
            <span className="hidden min-[400px]:inline">Login</span>
          </Link>
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

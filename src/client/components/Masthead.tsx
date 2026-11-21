import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { Logo } from "./Logo";

/** Solid (filled) magnifier — Lucide's outline search reads thin and cheap at small sizes. */
function FilledSearchIcon({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.75} strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <line x1="16.5" y1="16.5" x2="21" y2="21" />
    </svg>
  );
}

/** Solid (filled) person — matches Prothom Alo's filled Login icon. */
function FilledUserIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </svg>
  );
}

/**
 * Masthead (Prothom Alo header, row 1): ONE dense row on every screen —
 * our logo LEFT, a big solid-black search magnifier, a thin vertical
 * divider, and a solid person icon + "Login" on the RIGHT. No date row
 * and no centred logo row: Prothom Alo shows no date in the header, and
 * the pale date strip is what made ours look washed-out. The logo is
 * a 4.72:1 Bengali wordmark rendered 34px tall on phones (44px md,
 * 52px lg — see Logo.tsx), and the "Login" text hides below sm,
 * leaving the icons compact enough that everything fits one row
 * without overlap. The masthead is not sticky (user's call,
 * 2026-11-21) — it scrolls away and only the category nav sticks.
 * Everything in the row is near-black #111111. Tapping the magnifier
 * opens a clean full-width pill search bar (Bengali placeholder,
 * clear + close controls, autofocus, Escape to close); submitting
 * still navigates to /search?q=… exactly as before.
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
      {/* 4px solid red rule above the masthead — BBC-style brand strip */}
      <div className="h-1 bg-[#c1121f]" aria-hidden="true" />
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-1 px-2 py-2 sm:px-4 sm:py-3">
        <Link to="/" className="min-w-0 shrink" aria-label="THE BD TODAY — home">
          <Logo />
        </Link>

        <div className="flex shrink-0 items-center">
          <button
            type="button"
            aria-expanded={searchOpen}
            aria-label={searchOpen ? "Close search" : "Open search"}
            onClick={toggleSearch}
            className="flex h-11 w-11 items-center justify-center text-[#111111] hover:text-[#c1121f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c1121f]"
          >
            {searchOpen ? <X size={26} strokeWidth={2.75} /> : <FilledSearchIcon size={26} />}
          </button>
          <span className="mx-1 h-7 w-px bg-[#d4d4d4]" aria-hidden="true" />
          <Link
            to="/admin"
            className="flex h-11 items-center gap-1.5 px-2 text-[17px] font-semibold text-[#111111] hover:text-[#c1121f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c1121f]"
          >
            <FilledUserIcon size={24} />
            <span className="hidden sm:inline">Login</span>
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
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#111111] hover:text-[#c1121f]"
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

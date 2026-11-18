import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, User } from "lucide-react";

/**
 * Masthead (Prothom Alo mobile header, row 1): the wordmark on the left,
 * search icon + divider + Login on the right. Search opens an expanding
 * row underneath. No date strip, no top-stories rail — the screenshots
 * show the header bare like this.
 */
export function Masthead() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q) {
      setSearchOpen(false);
      navigate(`/search?q=${encodeURIComponent(q)}`);
    }
  };

  return (
    <header className="bg-white">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="min-w-0 shrink-0" aria-label="THE BD TODAY — home">
          <span className="block font-serif text-[32px] font-black leading-none tracking-tight text-slate-900 sm:text-4xl">
            THE BD <span className="text-[#c1121f]">TODAY</span>
          </span>
        </Link>

        <div className="flex shrink-0 items-center">
          <button
            type="button"
            aria-expanded={searchOpen}
            aria-label={searchOpen ? "Close search" : "Open search"}
            onClick={() => setSearchOpen((v) => !v)}
            className="p-2 text-slate-900 hover:text-[#c1121f]"
          >
            <Search size={22} />
          </button>
          <span className="mx-1 h-6 w-px bg-slate-300" aria-hidden="true" />
          <Link
            to="/admin"
            className="flex items-center gap-1.5 py-2 pl-1 pr-1 text-[15px] font-medium text-slate-900 hover:text-[#c1121f]"
          >
            <User size={20} />
            <span className="hidden sm:inline">Login</span>
          </Link>
        </div>
      </div>

      {/* Expanding search row */}
      {searchOpen && (
        <div className="border-t border-slate-200 bg-white">
          <form
            role="search"
            onSubmit={submitSearch}
            className="mx-auto flex max-w-[1280px] gap-2 px-4 py-2.5"
          >
            <label htmlFor="masthead-search" className="sr-only">
              Search news
            </label>
            <input
              id="masthead-search"
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
    </header>
  );
}

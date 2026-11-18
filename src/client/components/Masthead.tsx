import { Link, useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { todayLine } from "../lib/format";

/** Masthead: THE BD TODAY wordmark, bilingual date line, search. */
export function Masthead() {
  const today = todayLine();
  const navigate = useNavigate();
  return (
    <header className="border-b-4 border-double border-slate-900 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 py-5 text-center sm:py-6">
        <Link to="/" className="group" aria-label="THE BD TODAY — home">
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[#c1121f]">
            Bangladesh • World • Truth First
          </p>
          <h1 className="font-serif text-5xl font-black tracking-tight text-[#0f172a] sm:text-6xl">
            THE BD <span className="text-[#c1121f]">TODAY</span>
          </h1>
          <p className="mt-1 font-bengali text-base text-slate-600">দ্য বিডি টুডে — সত্য, সবার আগে</p>
        </Link>
        <p className="text-xs text-slate-500 sm:text-sm">
          {today.en} <span className="mx-1 text-slate-300">|</span>
          <span className="font-bengali">{today.bn}</span>
          <span className="mx-1 text-slate-300">|</span> Dhaka, Bangladesh
        </p>
        <div className="w-full max-w-md">
          <form
            role="search"
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const input = e.currentTarget.elements.namedItem("q") as HTMLInputElement | null;
              const q = input?.value.trim();
              if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
            }}
          >
            <label htmlFor="masthead-search" className="sr-only">Search news</label>
            <input
              id="masthead-search"
              name="q"
              type="search"
              placeholder="Search news, topics, people…"
              className="min-w-0 flex-1 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm focus:border-[#c1121f] focus:outline-none focus:ring-1 focus:ring-[#c1121f]"
            />
            <button
              type="submit"
              aria-label="Search"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#0f172a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c1121f]"
            >
              <Search size={16} /> Search
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

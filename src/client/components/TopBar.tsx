import { Link } from "react-router-dom";
import { todayLine } from "../lib/format";

/** Thin utility strip: Bengali date first, then English date, Dhaka — plus quick links and Newsroom Login. */
export function TopBar() {
  const today = todayLine();
  return (
    <div className="border-b border-slate-200 bg-white text-slate-600">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-1.5 text-xs">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="font-bengali font-semibold text-slate-800">{today.bn}</span>
          <span className="text-slate-300">|</span>
          <span>{today.en}</span>
          <span className="hidden text-slate-300 sm:inline">|</span>
          <span className="hidden sm:inline">Dhaka, Bangladesh</span>
        </p>
        <nav className="flex items-center gap-4" aria-label="Utility">
          <Link to="/latest" className="hover:text-[#c1121f]">Latest</Link>
          <Link to="/breaking" className="hover:text-[#c1121f]">Breaking</Link>
          <Link to="/about" className="hover:text-[#c1121f]">About</Link>
          <Link to="/contact" className="hover:text-[#c1121f]">Contact</Link>
          <Link to="/admin" className="font-semibold text-[#c1121f] hover:underline">
            Newsroom Login
          </Link>
        </nav>
      </div>
    </div>
  );
}

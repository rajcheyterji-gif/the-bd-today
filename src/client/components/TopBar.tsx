import { Link } from "react-router-dom";
import { CloudSun } from "lucide-react";
import { todayLine } from "../lib/format";

/** Thin utility bar: date, weather placeholder, quick links. */
export function TopBar() {
  const today = todayLine();
  return (
    <div className="bg-[#0f172a] text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-1.5 text-xs">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
          <span>{today.en}</span>
          <span className="hidden text-slate-400 sm:inline">|</span>
          <span className="font-bengali">{today.bn}</span>
        </p>
        <p className="hidden items-center gap-1.5 text-slate-300 md:flex">
          <CloudSun size={14} />
          <span>Dhaka — weather updates coming soon</span>
        </p>
        <nav className="flex items-center gap-4" aria-label="Utility">
          <Link to="/latest" className="hover:text-white/80">Latest</Link>
          <Link to="/breaking" className="hover:text-white/80">Breaking</Link>
          <Link to="/about" className="hover:text-white/80">About</Link>
          <Link to="/contact" className="hover:text-white/80">Contact</Link>
        </nav>
      </div>
    </div>
  );
}

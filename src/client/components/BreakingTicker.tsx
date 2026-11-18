import { Link } from "react-router-dom";
import { Zap } from "lucide-react";
import { useHome } from "../hooks/useArticles";

/**
 * Breaking-news ticker: a seamless scrolling loop of the newest headlines.
 * The breaking list is duplicated so the track loops without a gap; it
 * pauses on hover and renders nothing while loading or when empty.
 */
export function BreakingTicker() {
  const { data, isPending } = useHome();
  const breaking = data?.data?.breaking ?? [];

  if (isPending || breaking.length === 0) return null;

  const track = [...breaking, ...breaking];

  return (
    <div className="border-b border-slate-200 bg-white" aria-label="Breaking news">
      <div className="mx-auto flex max-w-7xl items-stretch px-4">
        <Link
          to="/breaking"
          className="flex shrink-0 items-center gap-1.5 bg-[#c1121f] px-3 py-2 text-xs font-bold uppercase tracking-wider text-white"
        >
          <Zap size={14} />
          Breaking
        </Link>
        <div className="ticker-viewport relative flex-1 overflow-hidden" aria-label="Breaking headlines">
          <div className="ticker-track flex w-max items-center gap-10 py-2 pl-5">
            {track.map((a, i) => (
              <span key={`${a.id}-${i}`} className="flex items-center gap-10">
                <Link
                  to={`/article/${a.slug}`}
                  className="whitespace-nowrap text-sm font-medium text-slate-800 hover:text-[#c1121f]"
                >
                  {a.title}
                </Link>
                <span className="h-1.5 w-1.5 rounded-full bg-[#c1121f]" />
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

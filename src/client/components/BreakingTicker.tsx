import { Link } from "react-router-dom";
import { Zap } from "lucide-react";
import { useArticles } from "../hooks/useArticles";

/**
 * Breaking-news ticker: scrolling headlines from the API. Silent when empty.
 * The API has no breaking flag, so this shows the newest stories.
 */
export function BreakingTicker() {
  const { data, isPending } = useArticles({ page: 1, limit: 8, sort: "latest" });
  const breaking = data?.data ?? [];

  if (isPending || breaking.length === 0) return null;

  return (
    <div className="border-b border-slate-200 bg-white" aria-label="Breaking news">
      <div className="mx-auto flex max-w-7xl items-stretch gap-0 px-4">
        <Link
          to="/breaking"
          className="flex shrink-0 items-center gap-1.5 bg-[#c1121f] px-3 py-2 text-xs font-bold uppercase tracking-wider text-white"
        >
          <Zap size={14} />
          Breaking
        </Link>
        <div className="ticker-viewport relative flex-1 overflow-x-auto" aria-label="Breaking headlines — scroll for more">
          <div className="flex w-max items-center gap-8 py-2 pl-4">
            {breaking.map((a) => (
              <Link
                key={a.id}
                to={`/article/${a.slug}`}
                className="whitespace-nowrap text-sm font-medium text-slate-800 hover:text-[#c1121f]"
              >
                {a.title}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

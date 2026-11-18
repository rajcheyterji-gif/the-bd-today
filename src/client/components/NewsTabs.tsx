import { useState } from "react";
import { ArticleRow } from "./ArticleCard";
import { TrendingFlameIcon } from "./TrendingIcon";
import type { Article } from "../../shared/types";

type TabId = "read" | "trending" | "latest";

const TABS: { id: TabId; label: string }[] = [
  { id: "read", label: "পঠিত" },
  { id: "trending", label: "আলোচিত" },
  { id: "latest", label: "সর্বশেষ" },
];

/**
 * Ranked / trending / latest tabs. The পঠিত tab shows Bengali-numeral
 * ranks; the others show plain rows.
 */
export function NewsTabs({
  mostRead,
  trending,
  latest,
}: {
  mostRead: Article[];
  trending: Article[];
  latest: Article[];
}) {
  const defaultTab: TabId = mostRead.length > 0 ? "read" : trending.length > 0 ? "trending" : "latest";
  const [active, setActive] = useState<TabId>(defaultTab);

  const lists: Record<TabId, Article[]> = {
    read: mostRead,
    trending,
    latest,
  };
  const list = lists[active].slice(0, 5);

  return (
    <div>
      <div className="flex gap-6 border-b border-slate-300" role="tablist" aria-label="Most read, trending and latest">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            onClick={() => setActive(tab.id)}
            className={`-mb-px inline-flex items-center gap-1.5 border-b-2 pb-2.5 font-bengali text-2xl font-bold leading-none ${
              active === tab.id
                ? "border-[#c1121f] text-slate-900"
                : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
          >
            {tab.id === "trending" && <TrendingFlameIcon size={18} />}
            {tab.label}
          </button>
        ))}
      </div>
      <div className="mt-1">
        {list.length === 0 && (
          <p className="py-4 text-sm text-slate-500">এই তালিকায় এখনো কোনো খবর নেই।</p>
        )}
        {list.map((a, i) => (
          <ArticleRow key={a.id} article={a} rank={active === "read" ? i + 1 : undefined} largeRank={active === "read"} showThumb={false} />
        ))}
      </div>
    </div>
  );
}

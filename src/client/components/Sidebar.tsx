import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Flame, TrendingUp } from "lucide-react";
import { ArticleRow } from "./ArticleCard";
import { Newsletter } from "./Newsletter";
import type { Article } from "../../shared/types";

function SectionHeading({ icon, title, link, linkLabel }: {
  icon: ReactNode;
  title: string;
  link?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b-2 border-[#0f172a] pb-2">
      <h3 className="flex items-center gap-2 font-serif text-lg font-black text-slate-900">
        <span className="text-[#c1121f]">{icon}</span>
        {title}
      </h3>
      {link && (
        <Link to={link} className="text-xs font-semibold text-[#c1121f] hover:underline">
          {linkLabel ?? "View all"}
        </Link>
      )}
    </div>
  );
}

/** Right-hand rail: latest stories, most-read ranking, newsletter box. */
export function Sidebar({
  latest,
  mostRead,
  trending,
}: {
  latest: Article[];
  mostRead: Article[];
  trending: Article[];
}) {
  return (
    <aside className="flex flex-col gap-8">
      <section aria-label="Latest news">
        <SectionHeading icon={<TrendingUp size={18} />} title="Latest News" link="/latest" />
        <div>
          {latest.length === 0 && (
            <p className="py-4 text-sm text-slate-500">No latest stories yet.</p>
          )}
          {latest.slice(0, 6).map((a) => (
            <ArticleRow key={a.id} article={a} />
          ))}
        </div>
      </section>

      {mostRead.length > 0 && (
        <section aria-label="Most read">
          <SectionHeading icon={<Flame size={18} />} title="Most Read" link="/latest" />
          <div>
            {mostRead.slice(0, 5).map((a, i) => (
              <ArticleRow key={a.id} article={a} rank={i + 1} />
            ))}
          </div>
        </section>
      )}

      {trending.length > 0 && (
        <section aria-label="Trending">
          <SectionHeading icon={<Flame size={18} />} title="Trending Now" link="/breaking" />
          <div>
            {trending.slice(0, 5).map((a) => (
              <ArticleRow key={a.id} article={a} />
            ))}
          </div>
        </section>
      )}

      <Newsletter compact />
    </aside>
  );
}

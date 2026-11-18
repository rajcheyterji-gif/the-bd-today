import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { ArticleCard, ArticleRow, TextStory } from "./ArticleCard";
import type { Article, Category } from "../../shared/types";

/** One broadsheet category section: 3px rule, Bengali heading, 3/6/3 grid when there are enough stories. */
export function CategorySection({
  category,
  articles,
}: {
  category: Category;
  articles: Article[];
}) {
  if (articles.length === 0) return null;
  const [lead, ...rest] = articles;

  return (
    <section aria-label={category.name_en} className="border-t-[3px] border-slate-800 pt-3">
      <div className="mb-4 flex items-center justify-between">
        <Link
          to={`/category/${category.slug}`}
          className="group inline-flex items-center gap-0.5 font-serif text-[22px] font-black leading-none text-slate-900 sm:text-2xl"
        >
          {category.name_bn ?? category.name_en}
          <ChevronRight size={22} className="text-[#c1121f] transition-transform group-hover:translate-x-0.5" />
        </Link>
        <Link
          to={`/category/${category.slug}`}
          className="shrink-0 font-bengali text-[13px] font-medium text-slate-500 hover:text-[#c1121f]"
        >
          সব খবর
        </Link>
      </div>

      {rest.length >= 3 ? (
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-0">
          <div className="order-2 lg:order-1 lg:col-span-3 lg:pr-6">
            <div className="divide-y divide-slate-200">
              {rest.slice(0, 2).map((a) => (
                <TextStory key={a.id} article={a} showExcerpt={false} />
              ))}
            </div>
          </div>
          <div className="order-1 lg:order-2 lg:col-span-6 lg:border-x lg:border-slate-200 lg:px-6">
            {lead && <ArticleCard article={lead} size="large" />}
          </div>
          <div className="order-3 lg:col-span-3 lg:pl-6">
            {rest.slice(2, 4).map((a) => (
              <ArticleRow key={a.id} article={a} />
            ))}
          </div>
        </div>
      ) : rest.length > 0 ? (
        <div className="grid gap-8 md:grid-cols-2">
          {lead && <ArticleCard article={lead} size="large" />}
          <div>
            {rest.map((a) => (
              <ArticleRow key={a.id} article={a} />
            ))}
          </div>
        </div>
      ) : (
        <div className="max-w-3xl">{lead && <ArticleCard article={lead} size="large" />}</div>
      )}
    </section>
  );
}

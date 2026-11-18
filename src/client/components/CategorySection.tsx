import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { ArticleCard, ArticleRow } from "./ArticleCard";
import type { Article, Category } from "../../shared/types";

/** One category section: lead story + list, driven entirely by API data. */
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
    <section aria-label={category.name_en} className="border-t-2 border-slate-900 pt-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-2xl font-black text-slate-900">
          {category.name_en}
          {category.name_bn && category.name_bn !== category.name_en && (
            <span className="ml-3 font-bengali text-base font-normal text-slate-500">{category.name_bn}</span>
          )}
        </h2>
        <Link
          to={`/category/${category.slug}`}
          className="inline-flex items-center gap-0.5 text-sm font-semibold text-[#c1121f] hover:underline"
        >
          View all <ChevronRight size={16} />
        </Link>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {lead && <ArticleCard article={lead} size="large" />}
        <div>
          {rest.slice(0, 4).map((a) => (
            <ArticleRow key={a.id} article={a} />
          ))}
        </div>
      </div>
    </section>
  );
}

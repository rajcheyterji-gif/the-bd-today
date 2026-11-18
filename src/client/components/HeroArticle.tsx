import { Link } from "react-router-dom";
import { Clock, Eye } from "lucide-react";
import { formatRelative, formatViews, readingTimeLabel, excerptFrom } from "../lib/format";
import type { Article } from "../../shared/types";

/** Large lead story for the homepage hero slot. */
export function HeroArticle({ article }: { article: Article }) {
  return (
    <article className="group overflow-hidden rounded border border-slate-200 bg-white">
      <Link to={`/article/${article.slug}`} aria-label={article.title}>
        {article.featured_image_url ? (
          <img
            src={article.featured_image_url}
            alt={article.image_caption || article.title}
            className="aspect-[16/9] w-full object-cover transition-transform duration-300 group-hover:scale-[1.01]"
          />
        ) : (
          <div className="flex aspect-[16/9] items-center justify-center bg-[#0f172a] px-6 text-center">
            <span className="font-serif text-xl font-black uppercase tracking-[0.25em] text-white/70">
              THE BD TODAY
            </span>
          </div>
        )}
      </Link>
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          {article.category && (
            <Link
              to={`/category/${article.category.slug}`}
              className="rounded bg-[#c1121f] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white"
            >
              {article.category.name_en}
            </Link>
          )}
        </div>
        <h2 className="mt-3 font-serif text-3xl font-black leading-tight text-slate-900 sm:text-4xl">
          <Link to={`/article/${article.slug}`} className="group-hover:text-[#c1121f]">
            {article.title}
          </Link>
        </h2>
        {article.subtitle && (
          <p className="mt-2 font-serif text-lg italic text-slate-600">{article.subtitle}</p>
        )}
        <p className="mt-3 line-clamp-3 text-[15px] leading-relaxed text-slate-600">
          {excerptFrom(article.content, article.excerpt, 240)}
        </p>
        <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
          {article.author && <span className="font-medium text-slate-700">By {article.author.name}</span>}
          <span className="inline-flex items-center gap-1">
            <Clock size={14} /> {formatRelative(article.published_at ?? article.created_at)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Eye size={14} /> {formatViews(article.views)} views
          </span>
          <span>{readingTimeLabel(article.reading_time_minutes)}</span>
        </p>
      </div>
    </article>
  );
}

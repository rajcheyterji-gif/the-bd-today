import { Link } from "react-router-dom";
import { formatRelative, formatViews, readingTimeLabel, excerptFrom } from "../lib/format";
import type { Article } from "../../shared/types";

/** Large lead story for the homepage hero slot — flat, no card box. */
export function HeroArticle({ article, isBreaking = false }: { article: Article; isBreaking?: boolean }) {
  return (
    <article className="group">
      <Link to={`/article/${article.slug}`} aria-label={article.title}>
        <div className="overflow-hidden">
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
        </div>
      </Link>
      <div className="pt-4">
        {isBreaking && (
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#c1121f]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#c1121f]" />
            Breaking
          </p>
        )}
        <h2 className="font-serif text-[28px] font-black leading-[1.25] text-slate-900 sm:text-4xl">
          <Link to={`/article/${article.slug}`} className="group-hover:text-[#c1121f]">
            {article.title}
          </Link>
        </h2>
        {article.subtitle && (
          <p className="mt-2 font-serif text-lg leading-relaxed text-slate-600">{article.subtitle}</p>
        )}
        <p className="mt-2.5 line-clamp-3 text-[15px] leading-relaxed text-slate-600">
          {excerptFrom(article.content, article.excerpt, 240)}
        </p>
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          {article.author && (
            <span className="text-[13px] font-semibold text-slate-800">{article.author.name}</span>
          )}
          <span className="font-bengali">{formatRelative(article.published_at ?? article.created_at, true)}</span>
          <span className="text-slate-300">•</span>
          <span>{readingTimeLabel(article.reading_time_minutes)}</span>
          <span>{formatViews(article.views)} views</span>
        </p>
      </div>
    </article>
  );
}

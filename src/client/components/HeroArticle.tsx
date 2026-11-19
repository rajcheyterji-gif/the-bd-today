import { Link } from "react-router-dom";
import { formatRelative, excerptFrom } from "../lib/format";
import { thumbUrl } from "../../shared/utils";
import type { Article } from "../../shared/types";

/**
 * Large lead story for the homepage hero slot — flat, no card box. Matches
 * the screenshot lead: big photo, big serif headline, excerpt, time only.
 */
export function HeroArticle({ article }: { article: Article }) {
  return (
    <article className="group">
      <Link to={`/article/${article.slug}`} aria-label={article.title}>
        <div className="mx-[-1rem] w-[calc(100%+2rem)] overflow-hidden sm:mx-0 sm:w-full">
          {article.featured_image_url ? (
            <img
              src={thumbUrl(article.featured_image_url, 960)}
              alt={article.image_caption || article.title}
              decoding="async"
              fetchPriority="high"
              className="aspect-[16/9] w-full object-cover transition-transform duration-300 group-hover:scale-[1.01]"
            />
          ) : (
            <div className="flex aspect-[16/9] items-center justify-center bg-slate-100 px-6 text-center">
              <span className="font-serif text-xl font-black uppercase tracking-[0.25em] text-slate-400">
                THE BD TODAY
              </span>
            </div>
          )}
        </div>
      </Link>
      <div className="pt-4">
        <h2 className="font-serif text-balance text-[30px] font-black leading-[1.25] text-[#111111] sm:text-[40px]">
          <Link to={`/article/${article.slug}`} className="group-hover:text-[#c1121f]">
            {article.title}
          </Link>
        </h2>
        {article.subtitle && (
          <p className="no-copy mt-2 font-serif text-xl leading-relaxed text-slate-600">{article.subtitle}</p>
        )}
        <p className="no-copy mt-2.5 line-clamp-3 font-serif text-[19px] leading-[1.65] text-[#444444]">
          {excerptFrom(article.content, article.excerpt, 240)}
        </p>
        <p className="mt-3 text-[15px] text-[#757575]">
          <span className="font-serif">{formatRelative(article.published_at ?? article.created_at, true)}</span>
        </p>
      </div>
    </article>
  );
}

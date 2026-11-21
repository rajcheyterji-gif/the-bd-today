import { Link } from "react-router-dom";
import { formatRelative, excerptFrom, readingTimeLabelBn } from "../lib/format";
import { thumbUrl } from "../../shared/utils";
import type { Article } from "../../shared/types";

/**
 * Large lead story for the homepage hero slot — flat, no card box. Matches
 * the screenshot lead: big photo, big serif headline, excerpt, time only.
 */
export function HeroArticle({ article }: { article: Article }) {
  const categoryName = article.category?.name_bn ?? article.category?.name_en;
  return (
    <article className="group">
      <figure>
        <Link to={`/article/${article.slug}`} aria-label={article.title}>
          <div className="mx-[-1rem] w-[calc(100%+2rem)] overflow-hidden bg-slate-100 sm:mx-0 sm:w-full">
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
        {(article.image_caption || article.image_credit) && (
          <figcaption className="mt-2 text-[13px] leading-relaxed text-[#5f6368]">
            {article.image_caption}
            {article.image_credit && (
              <span>
                {article.image_caption ? " " : ""}ছবি: {article.image_credit}
              </span>
            )}
          </figcaption>
        )}
      </figure>
      <div className="pt-4">
        {categoryName && (
          <p className="font-bengali text-sm font-bold text-[#c1121f]">{categoryName}</p>
        )}
        <h2 className="mt-1 font-serif text-[25px] font-black leading-[1.4] text-[#111111] sm:text-[32px]">
          <Link to={`/article/${article.slug}`} className="group-hover:text-[#c1121f]">
            {article.title}
          </Link>
        </h2>
        {article.subtitle && (
          <p className="no-copy mt-2 font-serif text-xl leading-relaxed text-slate-600">{article.subtitle}</p>
        )}
        <p className="no-copy mt-2.5 line-clamp-3 font-serif text-[19px] leading-[1.8] text-[#444444]">
          {excerptFrom(article.content, article.excerpt, 240)}
        </p>
        <p className="mt-3 text-[14px] text-[#5f6368]">
          <span className="font-serif">{formatRelative(article.published_at ?? article.created_at, true)}</span>
          <span aria-hidden="true"> • </span>
          <span className="font-serif">{readingTimeLabelBn(article.reading_time_minutes)}</span>
        </p>
      </div>
    </article>
  );
}

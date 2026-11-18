import { Link } from "react-router-dom";
import { Eye } from "lucide-react";
import { formatRelative, formatViews, readingTimeLabel, excerptFrom, toBengaliDigits } from "../lib/format";
import type { Article } from "../../shared/types";

/** Bengali relative time, e.g. "৫ মিনিট আগে". */
function StoryTime({ article, className = "" }: { article: Article; className?: string }) {
  return (
    <span className={`font-bengali ${className}`}>
      {formatRelative(article.published_at ?? article.created_at, true)}
    </span>
  );
}

function ArticleImage({ article, ratio }: { article: Article; ratio: string }) {
  if (!article.featured_image_url) {
    return (
      <div className={`flex ${ratio} items-center justify-center bg-slate-100 px-4 text-center`}>
        <span className="font-serif text-sm font-black uppercase tracking-[0.25em] text-slate-400">
          THE BD TODAY
        </span>
      </div>
    );
  }
  return (
    <img
      src={article.featured_image_url}
      alt={article.image_caption || article.title}
      loading="lazy"
      className={`${ratio} w-full object-cover`}
    />
  );
}

/**
 * Flat broadsheet card — no box, border, shadow or radius; image on top,
 * serif headline below, hover turns the headline red and scales the image.
 */
export function ArticleCard({
  article,
  size = "medium",
}: {
  article: Article;
  size?: "small" | "medium" | "large";
}) {
  const titleCls =
    size === "large"
      ? "font-serif text-[26px] font-black leading-snug"
      : size === "small"
        ? "font-serif text-base font-bold leading-snug"
        : "font-serif text-lg font-bold leading-snug";
  return (
    <article className="group">
      <Link to={`/article/${article.slug}`} aria-label={article.title}>
        <div className="overflow-hidden">
          <div className="transition-transform duration-300 group-hover:scale-[1.02]">
            <ArticleImage article={article} ratio="aspect-[16/9]" />
          </div>
        </div>
      </Link>
      <div className="pt-3">
        <h3 className={titleCls}>
          <Link to={`/article/${article.slug}`} className="text-slate-900 group-hover:text-[#c1121f]">
            {article.title}
          </Link>
        </h3>
        {size !== "small" && (
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-600">
            {excerptFrom(article.content, article.excerpt)}
          </p>
        )}
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          {article.author && <span className="font-semibold text-slate-800">{article.author.name}</span>}
          <StoryTime article={article} />
          <span className="inline-flex items-center gap-1">
            <Eye size={12} /> {formatViews(article.views)}
          </span>
          <span>{readingTimeLabel(article.reading_time_minutes)}</span>
        </p>
      </div>
    </article>
  );
}

/** Text-only story for the lead rails: headline + optional excerpt + time, with an optional small thumbnail. */
export function TextStory({
  article,
  showExcerpt = true,
}: {
  article: Article;
  showExcerpt?: boolean;
}) {
  return (
    <article className="group py-4 first:pt-0 last:pb-0">
      <div className="flex gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-[17px] font-bold leading-snug">
            <Link to={`/article/${article.slug}`} className="text-slate-900 group-hover:text-[#c1121f]">
              {article.title}
            </Link>
          </h3>
          {showExcerpt && (
            <p className="mt-1 line-clamp-3 text-[13px] leading-relaxed text-slate-600">
              {excerptFrom(article.content, article.excerpt, 130)}
            </p>
          )}
          <p className="mt-1.5 text-xs text-slate-500">
            <StoryTime article={article} />
          </p>
        </div>
        {article.featured_image_url && (
          <Link to={`/article/${article.slug}`} className="shrink-0" aria-label={article.title}>
            <img
              src={article.featured_image_url}
              alt=""
              loading="lazy"
              className="h-16 w-24 object-cover"
            />
          </Link>
        )}
      </div>
    </article>
  );
}

/** Compact horizontal row for sidebars and lists, with an optional ranked Bengali numeral. */
export function ArticleRow({ article, rank }: { article: Article; rank?: number }) {
  return (
    <article className="group flex gap-3 border-b border-slate-200 py-3 last:border-b-0">
      {rank != null && (
        <span className="font-serif text-4xl font-black leading-none text-slate-300 transition-colors group-hover:text-[#c1121f]">
          {toBengaliDigits(rank)}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <h4 className="font-serif text-[15px] font-bold leading-snug">
          <Link to={`/article/${article.slug}`} className="text-slate-900 group-hover:text-[#c1121f]">
            {article.title}
          </Link>
        </h4>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
          <StoryTime article={article} />
          <span className="inline-flex items-center gap-1">
            <Eye size={12} /> {formatViews(article.views)}
          </span>
        </p>
      </div>
      {article.featured_image_url && (
        <Link to={`/article/${article.slug}`} className="shrink-0" aria-label={article.title}>
          <img
            src={article.featured_image_url}
            alt=""
            loading="lazy"
            className="h-[68px] w-24 object-cover"
          />
        </Link>
      )}
    </article>
  );
}

/** Photo card for the special-coverage band: image with a dark gradient and text overlaid at the bottom. */
export function OverlayCard({ article }: { article: Article }) {
  return (
    <Link to={`/article/${article.slug}`} className="group relative block aspect-[4/3] overflow-hidden bg-slate-800">
      {article.featured_image_url ? (
        <img
          src={article.featured_image_url}
          alt={article.image_caption || article.title}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center px-4 text-center font-serif text-sm font-black uppercase tracking-[0.25em] text-white/60">
          THE BD TODAY
        </span>
      )}
      <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
      <span className="absolute inset-x-0 bottom-0 p-3.5">
        {article.category && (
          <span className="font-bengali text-xs font-bold text-amber-300">
            {article.category.name_bn ?? article.category.name_en}
          </span>
        )}
        <span className="mt-1 line-clamp-2 block font-serif text-[17px] font-bold leading-snug text-white">
          {article.title}
        </span>
      </span>
    </Link>
  );
}

import { Link } from "react-router-dom";
import { Clock, Eye } from "lucide-react";
import { formatRelative, formatViews, readingTimeLabel, excerptFrom } from "../lib/format";
import type { Article } from "../../shared/types";

function CategoryTag({ article }: { article: Article }) {
  if (!article.category) return null;
  return (
    <Link
      to={`/category/${article.category.slug}`}
      onClick={(e) => e.stopPropagation()}
      className="text-[11px] font-bold uppercase tracking-wider text-[#c1121f] hover:underline"
    >
      {article.category.name_en}
    </Link>
  );
}

function ArticleImage({ article, ratio }: { article: Article; ratio: string }) {
  if (!article.featured_image_url) {
    return (
      <div className={`flex ${ratio} items-center justify-center bg-slate-100 px-4 text-center`}>
        <span className="font-serif text-sm font-bold uppercase tracking-widest text-slate-400">
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

export function ArticleCard({
  article,
  size = "medium",
}: {
  article: Article;
  size?: "small" | "medium" | "large";
}) {
  const titleCls =
    size === "large"
      ? "font-serif text-2xl font-bold leading-snug"
      : size === "small"
        ? "font-serif text-base font-bold leading-snug"
        : "font-serif text-lg font-bold leading-snug";
  return (
    <article className="group flex flex-col overflow-hidden rounded border border-slate-200 bg-white transition-shadow hover:shadow-md">
      <Link to={`/article/${article.slug}`} aria-label={article.title}>
        <div className="overflow-hidden">
          <div className="transition-transform duration-300 group-hover:scale-[1.02]">
            <ArticleImage article={article} ratio="aspect-[16/9]" />
          </div>
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <CategoryTag article={article} />
        <h3 className={titleCls}>
          <Link to={`/article/${article.slug}`} className="text-slate-900 group-hover:text-[#c1121f]">
            {article.title}
          </Link>
        </h3>
        {size !== "small" && (
          <p className="line-clamp-2 text-sm leading-relaxed text-slate-600">
            {excerptFrom(article.content, article.excerpt)}
          </p>
        )}
        <p className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-slate-500">
          {article.author && <span>By {article.author.name}</span>}
          <span className="inline-flex items-center gap-1">
            <Clock size={12} /> {formatRelative(article.published_at ?? article.created_at)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Eye size={12} /> {formatViews(article.views)}
          </span>
          <span>{readingTimeLabel(article.reading_time_minutes)}</span>
        </p>
      </div>
    </article>
  );
}

/** Compact horizontal card for sidebars and lists. */
export function ArticleRow({ article, rank }: { article: Article; rank?: number }) {
  return (
    <article className="group flex gap-3 border-b border-slate-200 py-3 last:border-0">
      {rank != null && (
        <span className="font-serif text-3xl font-black leading-none text-slate-200 transition-colors group-hover:text-[#c1121f]">
          {rank}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <CategoryTag article={article} />
        <h4 className="mt-0.5 font-serif text-[15px] font-bold leading-snug">
          <Link to={`/article/${article.slug}`} className="text-slate-900 group-hover:text-[#c1121f]">
            {article.title}
          </Link>
        </h4>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Clock size={12} /> {formatRelative(article.published_at ?? article.created_at)}
          </span>
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
            className="h-16 w-20 rounded object-cover"
          />
        </Link>
      )}
    </article>
  );
}

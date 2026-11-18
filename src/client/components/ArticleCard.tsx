import { Link } from "react-router-dom";
import { formatRelative, excerptFrom, toBengaliDigits } from "../lib/format";
import type { Article } from "../../shared/types";

/** Bengali relative time, e.g. "৫ মিনিট আগে". */
function StoryTime({ article, className = "" }: { article: Article; className?: string }) {
  return (
    <span className={`font-serif ${className}`}>
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
 * serif headline below, time only under it (Prothom Alo cards show just
 * the time, not author/views/reading-time). Hover turns the headline red
 * and scales the image.
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
      ? "font-serif text-[30px] font-black leading-snug"
      : size === "small"
        ? "font-serif text-[20px] font-bold leading-snug"
        : "font-serif text-xl font-bold leading-snug";
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
          <Link to={`/article/${article.slug}`} className="text-[#111111] group-hover:text-[#c1121f]">
            {article.title}
          </Link>
        </h3>
        {size !== "small" && (
          <p className="mt-1.5 line-clamp-2 font-serif text-[18px] leading-[1.6] text-[#444444]">
            {excerptFrom(article.content, article.excerpt)}
          </p>
        )}
        <p className="mt-2 text-[14px] text-[#757575]">
          <StoryTime article={article} />
        </p>
      </div>
    </article>
  );
}

/**
 * Text story: headline + optional excerpt + time, with an optional small
 * thumbnail. With `kicker` it renders the মতামত-style row from the
 * screenshots — a red kicker (category name) followed by "•" in the
 * headline line.
 */
export function TextStory({
  article,
  showExcerpt = true,
  kicker,
}: {
  article: Article;
  showExcerpt?: boolean;
  kicker?: string;
}) {
  return (
    <article className="group border-b border-slate-200 py-4 first:pt-0 last:border-b-0 last:pb-0">
      <div className="flex gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-[23px] font-bold leading-snug">
            {kicker ? (
              <>
                <span className="text-[#c1121f]">{kicker}</span>{" "}
                <span className="text-slate-400">•</span>{" "}
              </>
            ) : null}
            <Link to={`/article/${article.slug}`} className="text-[#111111] group-hover:text-[#c1121f]">
              {article.title}
            </Link>
          </h3>
          {showExcerpt && (
            <p className="mt-1 line-clamp-3 font-serif text-[18px] leading-[1.6] text-[#444444]">
              {excerptFrom(article.content, article.excerpt, 130)}
            </p>
          )}
          <p className="mt-1.5 text-[14px] text-[#757575]">
            <StoryTime article={article} />
          </p>
        </div>
        {article.featured_image_url && (
          <Link to={`/article/${article.slug}`} className="shrink-0" aria-label={article.title}>
            <img
              src={article.featured_image_url}
              alt=""
              loading="lazy"
              className="h-[110px] w-[120px] object-cover"
            />
          </Link>
        )}
      </div>
    </article>
  );
}

/**
 * Renders a headline with its first clause in red — the ranked #1 item in
 * the reference paper's পঠিত list ("লন্ডনে এনসিপির ওপর আ.লীগের হামলা •"
 * in red, the rest black). Splits on "•" (separator kept in red) or ":"
 * (colon stays black); headlines with neither render plain.
 */
function FirstClauseRed({ title }: { title: string }) {
  const bullet = title.indexOf("•");
  const colon = title.indexOf(":");
  if (bullet === -1 && colon === -1) return <>{title}</>;
  const useBullet = bullet !== -1 && (colon === -1 || bullet < colon);
  const cut = useBullet ? bullet + 1 : colon;
  return (
    <>
      <span className="text-[#c1121f]">{title.slice(0, cut)}</span>
      {title.slice(cut)}
    </>
  );
}

/**
 * Compact horizontal row for sidebars and lists, with an optional ranked
 * Bengali numeral. `largeRank` renders the big grey numerals from the
 * পঠিত/আলোচিত/সর্বশেষ tabs in the screenshots. `showThumb={false}` keeps
 * the row text-only — the tab lists are text-only by design in the
 * reference screenshots, the one exception to the every-story-has-a-photo
 * rule on the homepage. `highlightFirst` renders the first clause of the
 * headline in red (rank #1 in the পঠিত tab).
 */
export function ArticleRow({
  article,
  rank,
  largeRank = false,
  showThumb = true,
  kicker,
  highlightFirst = false,
}: {
  article: Article;
  rank?: number;
  largeRank?: boolean;
  showThumb?: boolean;
  kicker?: string;
  highlightFirst?: boolean;
}) {
  return (
    <article className="group flex gap-3 border-b border-slate-200 py-3 last:border-b-0">
      {rank != null && (
        <span
          className={`shrink-0 font-serif font-black leading-none text-slate-300 transition-colors group-hover:text-[#c1121f] ${
            largeRank ? "text-[56px]" : "text-4xl"
          }`}
        >
          {toBengaliDigits(rank)}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <h4 className="font-serif text-[22px] font-bold leading-snug sm:text-[24px]">
          {kicker ? (
            <>
              <span className="text-[#c1121f]">{kicker}</span>{" "}
              <span className="text-slate-400">•</span>{" "}
            </>
          ) : null}
          <Link to={`/article/${article.slug}`} className="text-[#111111] group-hover:text-[#c1121f]">
            {highlightFirst ? <FirstClauseRed title={article.title} /> : article.title}
          </Link>
        </h4>
        <p className="mt-1 text-[14px] text-[#757575]">
          <StoryTime article={article} />
        </p>
      </div>
      {showThumb && article.featured_image_url && (
        <Link to={`/article/${article.slug}`} className="shrink-0" aria-label={article.title}>
          <img
            src={article.featured_image_url}
            alt=""
            loading="lazy"
            className="h-[110px] w-[130px] object-cover"
          />
        </Link>
      )}
    </article>
  );
}

/**
 * Photo card with a dark gradient and text overlaid at the bottom — the
 * overlay carousel cards from the screenshots. With `badge` the amber
 * label line shows the badge (e.g. "সরাসরি") instead of the category.
 */
export function OverlayCard({
  article,
  badge,
  ratio = "aspect-[4/3]",
}: {
  article: Article;
  badge?: string;
  ratio?: string;
}) {
  return (
    <Link to={`/article/${article.slug}`} className={`group relative block overflow-hidden bg-slate-800 ${ratio}`}>
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
        {badge ? (
          <span className="flex items-center gap-1.5 font-serif text-[16px] font-bold text-amber-300">
            <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-amber-300" aria-hidden="true" />
            {badge}
          </span>
        ) : article.category ? (
          <span className="font-serif text-[16px] font-bold text-amber-300">
            {article.category.name_bn ?? article.category.name_en}
          </span>
        ) : null}
        <span className="mt-1 line-clamp-3 block font-serif text-[24px] font-bold leading-snug text-white">
          {article.title}
        </span>
      </span>
    </Link>
  );
}

import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, Clock, Eye, MessageSquare, Tag, User } from "lucide-react";
import { useArticle, useArticles } from "../hooks/useArticles";
import { useSiteData } from "../hooks/useCategories";
import { enrichArticles, publicApi } from "../lib/api";
import { sanitizeHtml } from "../../shared/utils";
import {
  formatDateBn,
  formatRelative,
  formatTime,
  formatViews,
  readingTimeLabel,
} from "../lib/format";
import { Seo } from "../components/Seo";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { ArticleCard, ArticleRow } from "../components/ArticleCard";
import { ShareButtons } from "../components/ShareButtons";
import { ArticleSkeleton, ErrorState } from "../components/Loading";
import { EmptyState } from "../components/EmptyState";

/** Client-side slugify matching the server's slug rules (for tag links). */
function slugifyTag(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

export function ArticlePage({ slug }: { slug: string }) {
  const query = useArticle(slug);
  const { data: site } = useSiteData();
  // "Most read" rail: the article endpoint returns related only, so popular
  // stories come from a separate list call (sort=popular).
  const popularQuery = useArticles({ page: 1, limit: 5, sort: "popular" });
  const navigate = useNavigate();
  const [commentName, setCommentName] = useState("");
  const [commentEmail, setCommentEmail] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [commentDone, setCommentDone] = useState(false);
  const [commentPending, setCommentPending] = useState(false);
  const [commentError, setCommentError] = useState(false);

  const detail = query.data?.data;
  const article = detail?.article
    ? enrichArticles([detail.article], site?.data?.categories ?? [])[0]
    : undefined;

  const submitComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!article || commentPending) return;
    if (!commentBody.trim() || !commentName.trim() || !commentEmail.trim()) return;
    setCommentPending(true);
    setCommentError(false);
    try {
      await publicApi.submitComment(article.slug, {
        author_name: commentName.trim(),
        author_email: commentEmail.trim(),
        content: commentBody.trim(),
      });
      setCommentDone(true);
      setCommentName("");
      setCommentEmail("");
      setCommentBody("");
    } catch {
      setCommentError(true);
    } finally {
      setCommentPending(false);
    }
  };

  if (query.isPending) return <ArticleSkeleton />;
  if (query.isError) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <ErrorState message="Could not load this article. Please try again." onRetry={() => query.refetch()} />
      </div>
    );
  }
  if (!article) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <EmptyState
          title="Story not found"
          message="This story may have been moved, unpublished, or the link may be wrong."
          actionLabel="Back to home"
          onAction={() => navigate("/")}
        />
      </div>
    );
  }

  const related = enrichArticles(detail?.related ?? [], site?.data?.categories ?? []);
  const popular = enrichArticles(popularQuery.data?.data ?? [], site?.data?.categories ?? []).filter(
    (a) => a.id !== article.id,
  );
  const authorBio = article.author?.bio ?? "";
  const publishedAt = article.published_at ?? article.created_at;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Seo
        title={article.seo_title || article.title}
        description={article.seo_description || article.excerpt}
        image={article.featured_image_url}
        type="article"
        publishedAt={article.published_at}
        updatedAt={article.updated_at}
        authorName={article.author?.name}
        section={article.category?.name_en}
        tags={article.tags}
      />
      <Breadcrumbs
        items={[
          ...(article.category
            ? [{ label: article.category.name_en, to: `/category/${article.category.slug}` }]
            : []),
          { label: article.title },
        ]}
      />

      <div className="mt-6 grid gap-10 lg:grid-cols-3">
        <article className="min-w-0 lg:col-span-2">
          <header>
            {article.category && (
              <Link
                to={`/category/${article.category.slug}`}
                className="font-bengali text-sm font-bold text-[#c1121f] hover:underline"
              >
                {article.category.name_bn ?? article.category.name_en}
              </Link>
            )}
            <h1 className="mt-2 font-serif text-[36px] font-black leading-[1.3] text-slate-900 sm:text-5xl">
              {article.title}
            </h1>
            {(article.subtitle || article.excerpt) && (
              <p className="mt-3 font-serif text-xl leading-relaxed text-slate-500 sm:text-2xl">
                {article.subtitle || article.excerpt}
              </p>
            )}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-y border-slate-200 py-3">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                {article.author && (
                  <Link
                    to={`/author/${article.author.id}`}
                    className="inline-flex items-center gap-2 font-bold text-slate-900 hover:text-[#c1121f]"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0f172a] font-serif text-lg font-bold text-white">
                      {article.author.name.charAt(0)}
                    </span>
                    {article.author.name}
                  </Link>
                )}
                <p className="font-bengali text-xs text-slate-500">
                  প্রকাশ: {formatDateBn(publishedAt)} , {formatTime(publishedAt, true)}
                  <span className="mx-1.5 text-slate-300">|</span>
                  আপডেট: {formatRelative(article.updated_at, true)}
                </p>
                <p className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Clock size={12} /> {readingTimeLabel(article.reading_time_minutes)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Eye size={12} /> {formatViews(article.views)} views
                  </span>
                </p>
              </div>
              <ShareButtons title={article.title} />
            </div>
          </header>

          {article.featured_image_url && (
            <figure className="mt-6">
              <img
                src={article.featured_image_url}
                alt={article.image_caption || article.title}
                className="w-full object-cover"
              />
              {(article.image_caption || article.image_credit) && (
                <figcaption className="mt-2 border-b border-slate-200 pb-2 text-xs text-slate-500">
                  {article.image_caption}
                  {article.image_credit && <span> — {article.image_credit}</span>}
                </figcaption>
              )}
            </figure>
          )}

          <div
            className="article-body mt-6"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.content) }}
          />

          {article.tags.length > 0 && (
            <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-5">
              <Tag size={16} className="text-slate-400" />
              {article.tags.map((tag) => (
                <Link
                  key={tag}
                  to={`/tag/${slugifyTag(tag)}`}
                  className="border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:border-[#c1121f] hover:text-[#c1121f]"
                >
                  {tag}
                </Link>
              ))}
            </div>
          )}

          {article.author && (
            <section className="mt-8 flex gap-4 border-y border-slate-200 py-5" aria-label="About the author">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#0f172a] text-white">
                <User size={24} />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Written by</p>
                <Link to={`/author/${article.author.id}`} className="font-serif text-lg font-bold text-slate-900 hover:text-[#c1121f]">
                  {article.author.name}
                </Link>
                {authorBio && <p className="mt-1 text-sm leading-relaxed text-slate-600">{authorBio}</p>}
              </div>
            </section>
          )}

          {/* Comments: submission only — the API has no public endpoint to
              list comments, so approved comments are not shown here. */}
          <section className="mt-10" aria-label="Comments">
            <h2 className="flex items-center gap-2 border-t-[3px] border-slate-800 pt-3 font-bengali text-xl font-black text-slate-900">
              <MessageSquare size={20} className="text-[#c1121f]" />
              মন্তব্য
            </h2>
            {commentDone ? (
              <p className="mt-4 flex items-center gap-2 border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-900">
                <Check size={16} /> Thank you — your comment was submitted and is awaiting moderation.
              </p>
            ) : (
              <form
                className="mt-4 flex flex-col gap-3 border border-slate-200 p-4"
                onSubmit={submitComment}
              >
                <h3 className="font-semibold text-slate-900">Leave a comment</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="comment-name" className="text-sm font-medium text-slate-700">Name *</label>
                    <input
                      id="comment-name"
                      required
                      value={commentName}
                      onChange={(e) => setCommentName(e.target.value)}
                      className="mt-1 w-full border border-slate-300 px-3 py-2 text-sm focus:border-[#c1121f] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="comment-email" className="text-sm font-medium text-slate-700">Email *</label>
                    <input
                      id="comment-email"
                      type="email"
                      required
                      value={commentEmail}
                      onChange={(e) => setCommentEmail(e.target.value)}
                      className="mt-1 w-full border border-slate-300 px-3 py-2 text-sm focus:border-[#c1121f] focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="comment-body" className="text-sm font-medium text-slate-700">Comment *</label>
                  <textarea
                    id="comment-body"
                    required
                    rows={4}
                    value={commentBody}
                    onChange={(e) => setCommentBody(e.target.value)}
                    className="mt-1 w-full border border-slate-300 px-3 py-2 text-sm focus:border-[#c1121f] focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={commentPending}
                  className="self-start bg-[#c1121f] px-5 py-2 text-sm font-semibold text-white hover:bg-[#9e0e19] disabled:opacity-60"
                >
                  {commentPending ? "Submitting…" : "Post comment"}
                </button>
                {commentError && (
                  <p className="text-sm text-red-700">Could not submit your comment. Please try again.</p>
                )}
                <p className="text-xs text-slate-500">Comments are moderated before they appear.</p>
              </form>
            )}
          </section>
        </article>

        <aside className="flex flex-col gap-8 lg:border-l lg:border-slate-200 lg:pl-8">
          {related.length > 0 && (
            <section aria-label="Related stories">
              <h2 className="border-t-[3px] border-slate-800 pt-3 font-bengali text-lg font-black text-slate-900 lg:border-t-0 lg:pt-0">সম্পর্কিত খবর</h2>
              <div>
                {related.map((a) => (
                  <ArticleRow key={a.id} article={a} />
                ))}
              </div>
            </section>
          )}
          {popular.length > 0 && (
            <section aria-label="Most read">
              <h2 className="border-t-[3px] border-slate-800 pt-3 font-bengali text-lg font-black text-slate-900 lg:border-t-0 lg:pt-0">সর্বাধিক পঠিত</h2>
              <div>
                {popular.map((a) => (
                  <ArticleRow key={a.id} article={a} />
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-12" aria-label="More from this section">
          <h2 className="mb-4 border-t-[3px] border-slate-800 pt-3 font-bengali text-2xl font-black text-slate-900">
            আরও পড়ুন — {article.category?.name_bn ?? article.category?.name_en ?? "THE BD TODAY"}
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((a) => (
              <ArticleCard key={a.id} article={a} size="small" />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, FilePlus2, Pencil, Search, Trash2 } from "lucide-react";
import { adminApi, type Article, type ArticleStatus } from "../lib/adminApi";
import { formatDateTime, formatNumber } from "../lib/utils";
import { useToast } from "./Toast";
import { Badge, Button, Card, ConfirmModal, EmptyState, ErrorState, Modal, SelectInput, Spinner, TextInput } from "./ui";
import { sanitizeHtml } from "../lib/sanitize";

interface ArticleListProps {
  /** Fixed status filter (e.g. Drafts page passes "draft"). Omit for all. */
  status?: ArticleStatus;
  title: string;
  subtitle: string;
  showStatusFilter?: boolean;
  showNewButton?: boolean;
  emptyHint: string;
}

/** Shared article table: search, status/category filters, edit / preview /
 *  publish / unpublish / archive / delete — reused by Articles, Drafts,
 *  Scheduled and Published pages. All data comes from the admin list API. */
export function ArticleList({ status, title, subtitle, showStatusFilter = true, showNewButton = true, emptyHint }: ArticleListProps) {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [qCommitted, setQCommitted] = useState("");
  const [statusFilter, setStatusFilter] = useState<ArticleStatus | "">(status ?? "");
  const [categoryFilter, setCategoryFilter] = useState<number | "">("");
  const [categories, setCategories] = useState<{ id: number; name_en: string }[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [preview, setPreview] = useState<Article | null>(null);
  const [toDelete, setToDelete] = useState<Article | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const toast = useToast();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.listArticles({
        status: status ?? (statusFilter || undefined),
        category: categoryFilter === "" ? undefined : categoryFilter,
        search: qCommitted || undefined,
        page,
        limit: 20,
      });
      setArticles(res.items);
      setTotalPages(res.pagination?.totalPages ?? 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load articles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, statusFilter, categoryFilter, qCommitted, page]);

  useEffect(() => {
    adminApi
      .listCategories()
      .then((r) => setCategories(r.items))
      .catch(() => setCategories([]));
  }, []);

  // Debounce the search box.
  useEffect(() => {
    const t = window.setTimeout(() => {
      setPage(1);
      setQCommitted(q);
    }, 400);
    return () => window.clearTimeout(t);
  }, [q]);

  const changeStatus = async (article: Article, next: ArticleStatus) => {
    setBusyId(Number(article.id));
    try {
      await adminApi.updateArticle(article.id, { status: next, scheduled_at: next === "scheduled" ? article.scheduled_at ?? null : null });
      toast.success(next === "published" ? "Article published." : `Article moved to ${next}.`);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update article.");
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setBusyId(Number(toDelete.id));
    try {
      await adminApi.deleteArticle(toDelete.id);
      toast.success("Article deleted.");
      setToDelete(null);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete article.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{title}</h1>
          <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
        </div>
        {showNewButton ? (
          <Button onClick={() => navigate("/admin/articles/new")}>
            <FilePlus2 size={16} /> New article
          </Button>
        ) : null}
      </div>

      <Card>
        <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <TextInput aria-label="Search articles" placeholder="Search by title…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {showStatusFilter && !status ? (
            <SelectInput aria-label="Filter by status" value={statusFilter} onChange={(e) => { setPage(1); setStatusFilter(e.target.value as ArticleStatus | ""); }}>
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="scheduled">Scheduled</option>
              <option value="archived">Archived</option>
            </SelectInput>
          ) : null}
          <SelectInput
            aria-label="Filter by category"
            value={categoryFilter === "" ? "" : String(categoryFilter)}
            onChange={(e) => {
              setPage(1);
              setCategoryFilter(e.target.value === "" ? "" : Number(e.target.value));
            }}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name_en}
              </option>
            ))}
          </SelectInput>
        </div>

        {loading ? (
          <Spinner label="Loading articles…" />
        ) : error ? (
          <div className="p-4">
            <ErrorState message={error} onRetry={() => void load()} />
          </div>
        ) : articles.length === 0 ? (
          <EmptyState
            title="No articles found"
            hint={emptyHint}
            action={
              <Button onClick={() => navigate("/admin/articles/new")}>
                <FilePlus2 size={16} /> Write the first article
              </Button>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-2.5 font-medium">Article</th>
                    <th className="px-4 py-2.5 font-medium">Category</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 text-right font-medium">Views</th>
                    <th className="px-4 py-2.5 font-medium">Updated</th>
                    <th className="px-4 py-2.5 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {articles.map((a) => (
                    <tr key={a.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                      <td className="max-w-xs px-4 py-3">
                        <p className="truncate font-medium text-slate-900">{a.title}</p>
                        <p className="truncate text-xs text-slate-500">
                          {a.author?.name ?? "—"} · {a.slug}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{a.category?.name_en ?? "—"}</td>
                      <td className="px-4 py-3">
                        <Badge value={a.status} />
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-700">{formatNumber(a.views)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDateTime(a.updated_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" aria-label={`Preview ${a.title}`} title="Preview" onClick={() => setPreview(a)}>
                            <Eye size={16} />
                          </Button>
                          <Button variant="ghost" aria-label={`Edit ${a.title}`} title="Edit" onClick={() => navigate(`/admin/articles/${a.id}/edit`)}>
                            <Pencil size={16} />
                          </Button>
                          {a.status !== "published" ? (
                            <Button
                              variant="ghost"
                              aria-label={`Publish ${a.title}`}
                              title="Publish"
                              disabled={busyId === Number(a.id)}
                              onClick={() => void changeStatus(a, "published")}
                            >
                              <span className="text-xs font-semibold text-green-700">Publish</span>
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              aria-label={`Unpublish ${a.title}`}
                              title="Move back to draft"
                              disabled={busyId === Number(a.id)}
                              onClick={() => void changeStatus(a, "draft")}
                            >
                              <span className="text-xs font-semibold text-amber-700">Unpublish</span>
                            </Button>
                          )}
                          <Button variant="ghost" aria-label={`Delete ${a.title}`} title="Delete" onClick={() => setToDelete(a)}>
                            <Trash2 size={16} className="text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 ? (
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm">
                <span className="text-slate-500">
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                    Previous
                  </Button>
                  <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </Card>

      <Modal open={preview !== null} onClose={() => setPreview(null)} title={preview?.title ?? "Preview"} wide>
        {preview ? (
          <article>
            {preview.featured_image_url ? <img src={preview.featured_image_url} alt={preview.image_caption || preview.title} className="mb-3 max-h-72 w-full rounded-lg object-cover" /> : null}
            {preview.image_caption ? <p className="mb-3 text-center text-xs text-slate-500">{preview.image_caption}</p> : null}
            <p className="text-xs font-semibold uppercase tracking-wide text-[#c1121f]">{preview.category?.name_en ?? ""}</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">{preview.title}</h2>
            {preview.subtitle ? <p className="mt-1 text-slate-600">{preview.subtitle}</p> : null}
            <p className="mt-2 text-xs text-slate-500">
              By {preview.author?.name ?? "—"} · {formatDateTime(preview.published_at ?? preview.created_at)} · {preview.reading_time_minutes} min read
            </p>
            <div
              className="mt-4 text-sm leading-relaxed text-slate-800 [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:mt-3 [&_h3]:font-bold [&_blockquote]:border-l-4 [&_blockquote]:border-[#c1121f] [&_blockquote]:pl-3 [&_blockquote]:italic [&_img]:max-w-full [&_img]:rounded-lg [&_figcaption]:text-center [&_figcaption]:text-xs [&_figcaption]:text-slate-500 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-[#c1121f] [&_a]:underline"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(preview.content) }}
            />
          </article>
        ) : null}
      </Modal>

      <ConfirmModal
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={() => void confirmDelete()}
        title="Delete article"
        message={`Delete “${toDelete?.title ?? ""}”? This cannot be undone.`}
      />
    </div>
  );
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, X } from "lucide-react";
import { adminApi, type Comment, type CommentStatus } from "../lib/adminApi";
import { formatDateTime } from "../lib/utils";
import { useToast } from "../components/Toast";
import { ApiGapNotice, Badge, Button, Card, EmptyState, ErrorState, SelectInput, Spinner } from "../components/ui";

/** Comment moderation: approve / reject / mark as spam via
 *  PUT /api/v1/admin/comments/:id. There is NO comment-delete endpoint,
 *  so deletion is not offered — spam is the closest available action. */
export function Comments() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<CommentStatus | "">("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const toast = useToast();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.listComments({ status: statusFilter || undefined, page, limit: 20 });
      setItems(res.items);
      setTotalPages(res.pagination?.totalPages ?? 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load comments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, page]);

  const moderate = async (c: Comment, next: CommentStatus) => {
    setBusyId(c.id);
    try {
      await adminApi.moderateComment(c.id, next);
      toast.success(next === "approved" ? "Comment approved." : next === "rejected" ? "Comment rejected." : "Comment marked as spam.");
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update the comment.");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <Spinner label="Loading comments…" />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Comments</h1>
          <p className="mt-0.5 text-sm text-slate-500">Moderate reader comments on published stories.</p>
        </div>
        <SelectInput aria-label="Filter by status" value={statusFilter} onChange={(e) => { setPage(1); setStatusFilter(e.target.value as CommentStatus | ""); }} className="!w-auto">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="spam">Spam</option>
        </SelectInput>
      </div>

      <ApiGapNotice message="The API has no comment-delete endpoint — comments can only be approved, rejected, or marked as spam (PUT /api/v1/admin/comments/:id)." />

      <Card>
        {items.length === 0 ? (
          <EmptyState title="No comments found" hint="New reader comments will appear here for moderation." />
        ) : (
          <>
            <ul className="divide-y divide-slate-100">
              {items.map((c) => (
                <li key={c.id} className="px-4 py-3 sm:px-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-medium text-slate-900">
                        {c.author_name} <span className="font-normal text-slate-500">· {c.author_email ?? "no email"}</span>
                      </p>
                      <button
                        type="button"
                        className="text-xs text-[#c1121f] hover:underline"
                        onClick={() => c.article_slug && navigate(`/admin/articles/${c.article_id}/edit`)}
                        title="Open the article in the editor"
                      >
                        {c.article_title ?? `Article #${c.article_id}`}
                      </button>
                      <p className="mt-1 break-words text-sm text-slate-700">{c.content}</p>
                      <p className="mt-1 text-xs text-slate-400">{formatDateTime(c.created_at)}</p>
                    </div>
                    <Badge value={c.status} className="shrink-0" />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {c.status !== "approved" ? (
                      <Button variant="outline" disabled={busyId === c.id} onClick={() => void moderate(c, "approved")}>
                        <Check size={14} /> Approve
                      </Button>
                    ) : null}
                    {c.status !== "rejected" ? (
                      <Button variant="outline" disabled={busyId === c.id} onClick={() => void moderate(c, "rejected")}>
                        <X size={14} /> Reject
                      </Button>
                    ) : null}
                    {c.status !== "spam" ? (
                      <Button variant="outline" disabled={busyId === c.id} onClick={() => void moderate(c, "spam")}>
                        Mark as spam
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
            {totalPages > 1 ? (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 text-sm">
                <span className="text-slate-500">Page {page} of {totalPages}</span>
                <div className="flex gap-2">
                  <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
                  <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </Card>
    </div>
  );
}

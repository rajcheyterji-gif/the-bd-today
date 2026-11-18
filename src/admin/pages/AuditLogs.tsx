import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { adminApi, type AuditLog } from "../lib/adminApi";
import { formatDateTime } from "../lib/utils";
import { Button, Card, EmptyState, ErrorState, Spinner, TextInput } from "../components/ui";

/** Audit logs (admin only). Filterable by action and user id. */
export function AuditLogs() {
  const [items, setItems] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState("");
  const [actionCommitted, setActionCommitted] = useState("");
  const [userId, setUserId] = useState("");
  const [userIdCommitted, setUserIdCommitted] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.listAuditLogs({
        page,
        limit: 20,
        action: actionCommitted || undefined,
        user_id: userIdCommitted ? Number(userIdCommitted) : undefined,
      });
      setItems(res.items);
      setTotalPages(res.pagination?.totalPages ?? 1);
      setTotal(res.pagination?.total ?? res.items.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load audit logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionCommitted, userIdCommitted, page]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setPage(1);
      setActionCommitted(action);
      setUserIdCommitted(userId);
    }, 400);
    return () => window.clearTimeout(t);
  }, [action, userId]);

  if (loading) return <Spinner label="Loading audit logs…" />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Audit Logs</h1>
        <p className="mt-0.5 text-sm text-slate-500">{total} recorded admin actions. Admin role only.</p>
      </div>

      <Card>
        <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <TextInput aria-label="Filter by action" placeholder="Filter by action, e.g. article.create…" className="pl-9" value={action} onChange={(e) => setAction(e.target.value)} />
          </div>
          <TextInput aria-label="Filter by user id" placeholder="User ID…" inputMode="numeric" value={userId} onChange={(e) => setUserId(e.target.value.replace(/\D/g, ""))} className="sm:!w-32" />
        </div>
        {items.length === 0 ? (
          <EmptyState title="No audit logs found" hint="Admin actions (logins, article saves, moderation) are recorded here." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-2.5 font-medium">When</th>
                    <th className="px-4 py-2.5 font-medium">User</th>
                    <th className="px-4 py-2.5 font-medium">Action</th>
                    <th className="px-4 py-2.5 font-medium">Entity</th>
                    <th className="px-4 py-2.5 font-medium">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((l) => (
                    <tr key={l.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDateTime(l.created_at)}</td>
                      <td className="px-4 py-3 text-slate-700">{l.user_name ?? `User #${l.user_id ?? "—"}`}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{l.action}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {l.entity_type ? `${l.entity_type} ${l.entity_id ?? ""}` : "—"}
                      </td>
                      <td className="max-w-xs truncate px-4 py-3 text-slate-600" title={l.details ?? ""}>
                        {l.details ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 ? (
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm">
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

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { adminApi, type User } from "../lib/adminApi";
import { formatDate } from "../lib/utils";
import { ApiGapNotice, Badge, Button, Card, CardHeader, EmptyState, ErrorState, Spinner, TextInput } from "../components/ui";

/** Users (admin only): GET /api/v1/admin/users. Read-only — the API has
 *  no user create/update/delete endpoints, so role changes, invites and
 *  removals are shown as disabled with the reason, never faked. */
export function Users() {
  const [items, setItems] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.listUsers({ page, limit: 50 });
      setItems(res.items);
      setTotalPages(res.pagination?.totalPages ?? 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const filtered = items.filter((u) => {
    if (roleFilter && u.role !== roleFilter) return false;
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      if (!u.name.toLowerCase().includes(needle) && !u.email.toLowerCase().includes(needle)) return false;
    }
    return true;
  });

  if (loading) return <Spinner label="Loading users…" />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Users</h1>
          <p className="mt-0.5 text-sm text-slate-500">Everyone with an account on this site. Admin role only.</p>
        </div>
        <Button disabled title="The API has no user-creation endpoint (only GET /api/v1/admin/users)">
          Invite user (unavailable)
        </Button>
      </div>

      <ApiGapNotice message="Read-only: the API exposes only GET /api/v1/admin/users — there is no endpoint to invite users, change roles, or delete accounts from this dashboard." />

      <Card>
        <CardHeader
          title={`${filtered.length} user${filtered.length === 1 ? "" : "s"}`}
          action={
            <div className="flex gap-2">
              <select
                aria-label="Filter by role"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#c1121f] focus:outline-none"
              >
                <option value="">All roles</option>
                <option value="admin">Admin</option>
                <option value="editor">Editor</option>
                <option value="author">Author</option>
              </select>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <TextInput aria-label="Search users" placeholder="Search…" className="pl-9 !w-48" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
            </div>
          }
        />
        {filtered.length === 0 ? (
          <EmptyState title="No users found" hint="Try clearing the search or role filter." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-2.5 font-medium">User</th>
                    <th className="px-4 py-2.5 font-medium">Role</th>
                    <th className="px-4 py-2.5 font-medium">Joined</th>
                    <th className="px-4 py-2.5 font-medium">Last login</th>
                    <th className="px-4 py-2.5 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{u.name}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge value={u.role} />
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(u.created_at)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(u.last_login_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs text-slate-400" title="The API has no user-update or user-delete endpoint">
                          Editing unavailable
                        </span>
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

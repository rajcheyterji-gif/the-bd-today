import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { adminApi, type Author } from "../lib/adminApi";
import { formatNumber } from "../lib/utils";
import { ApiGapNotice, Badge, Card, CardHeader, EmptyState, ErrorState, Spinner, TextInput } from "../components/ui";

/** Authors: everyone with a staff account, from the public authors list
 *  (includes published-article counts). Read-only — the API has no
 *  user create/update/delete endpoints, so inviting or editing authors
 *  is not possible from this dashboard. */
export function Authors() {
  const [items, setItems] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setItems((await adminApi.listAuthors()).items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load authors.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = items.filter((a) => {
    if (roleFilter && a.role !== roleFilter) return false;
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      if (!a.name.toLowerCase().includes(needle) && !(a.email ?? "").toLowerCase().includes(needle)) return false;
    }
    return true;
  });

  if (loading) return <Spinner label="Loading authors…" />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Authors</h1>
        <p className="mt-0.5 text-sm text-slate-500">Staff accounts and how many stories each has published.</p>
      </div>

      <ApiGapNotice message="Read-only: the API exposes only GET /api/v1/admin/users and GET /api/v1/authors — there is no endpoint to invite, edit, or remove an author from this dashboard." />

      <Card>
        <CardHeader
          title={`${filtered.length} author${filtered.length === 1 ? "" : "s"}`}
          action={
            <div className="relative w-full sm:w-auto">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <TextInput aria-label="Search authors" placeholder="Search by name…" className="w-full pl-9 sm:!w-56" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          }
        />
        <div className="flex gap-2 overflow-x-auto border-b border-slate-100 px-4 py-2">
          {(["", "admin", "editor", "author"] as const).map((r) => (
            <button
              key={r || "all"}
              type="button"
              onClick={() => setRoleFilter(r)}
              className={`shrink-0 rounded-full px-3 py-2 text-xs font-medium ${roleFilter === r ? "bg-[#c1121f] text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
            >
              {r === "" ? "All roles" : r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
        {filtered.length === 0 ? (
          <EmptyState title="No authors found" hint="Try clearing the search, or check the Users page." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#c1121f] text-sm font-bold text-white" aria-hidden="true">
                  {a.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{a.name}</p>
                  <p className="truncate text-xs text-slate-500">
                    {a.email ?? "—"}
                    {a.bio ? ` · ${a.bio}` : ""}
                  </p>
                </div>
                <Badge value={a.role} />
                <span className="hidden shrink-0 text-xs text-slate-500 sm:inline">{formatNumber(a.article_count ?? 0)} published</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

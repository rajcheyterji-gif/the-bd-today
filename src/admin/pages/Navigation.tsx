import { useEffect, useState } from "react";
import { adminApi, type NavigationItem } from "../lib/adminApi";
import { ApiGapNotice, Button, Card, CardHeader, EmptyState, ErrorState, Spinner } from "../components/ui";

/** Navigation: read-only. The API only exposes the public
 *  GET /api/v1/navigation (active items, ordered by position) — there is
 *  no admin navigation CRUD endpoint, so add/edit/delete/reorder are
 *  shown as unavailable with the reason, never faked. */
export function Navigation() {
  const [items, setItems] = useState<NavigationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setItems((await adminApi.listNavigation()).items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load navigation.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (loading) return <Spinner label="Loading navigation…" />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Navigation</h1>
          <p className="mt-0.5 text-sm text-slate-500">The live menu links shown on the public site, in display order.</p>
        </div>
        <Button disabled title="The API has no navigation-management endpoint (only public GET /api/v1/navigation)">
          Add link (unavailable)
        </Button>
      </div>

      <ApiGapNotice message="Read-only: the API exposes only public GET /api/v1/navigation (active items). There is no endpoint to add, edit, delete, or reorder navigation links from this dashboard — those live in the database." />

      <Card>
        <CardHeader title={`${items.length} active link${items.length === 1 ? "" : "s"}`} subtitle="Only active links are returned by the public endpoint; inactive links are not listed here" />
        {items.length === 0 ? (
          <EmptyState title="No navigation links" hint="The public site menu is currently empty." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((n) => (
              <li key={n.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">
                    {n.label}
                    {n.label_bn ? <span className="font-normal text-slate-500"> · {n.label_bn}</span> : ""}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {n.url} · position {n.position}
                    {n.parent_id ? ` · under #${n.parent_id}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Active</span>
                  <Button variant="outline" className="!py-1.5 text-xs" disabled title="The API has no navigation-management endpoint">
                    Edit (unavailable)
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

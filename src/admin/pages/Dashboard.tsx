import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, CheckCircle2, Clock, Eye, FilePlus2, FileText, Mail, MessageSquare } from "lucide-react";
import { adminApi, type DashboardStats } from "../lib/adminApi";
import { formatDate, formatNumber, timeAgo } from "../lib/utils";
import { Badge, BarList, Button, Card, CardHeader, EmptyState, ErrorState, Spinner, StatCard } from "../components/ui";

export function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setStats(await adminApi.getDashboard());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (loading) return <Spinner label="Loading dashboard…" />;
  if (error || !stats) return <ErrorState message={error ?? "Dashboard unavailable."} onRetry={() => void load()} />;

  const recent = stats.recent_articles ?? [];
  const byStatus = Object.entries(stats.articles_by_status ?? {}).map(([label, value]) => ({
    label: label.charAt(0).toUpperCase() + label.slice(1),
    value,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Dashboard</h1>
          <p className="mt-0.5 text-sm text-slate-500">Overview of the newsroom at a glance.</p>
        </div>
        <Button onClick={() => navigate("/admin/articles/new")}>
          <FilePlus2 size={16} /> New article
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total articles" value={formatNumber(stats.totals.articles)} icon={<FileText size={20} />} />
        <StatCard label="Published" value={formatNumber(stats.totals.published_articles)} icon={<CheckCircle2 size={20} />} />
        <StatCard label="Drafts" value={formatNumber(stats.totals.draft_articles)} icon={<Clock size={20} />} />
        <StatCard label="Total views" value={formatNumber(stats.totals.total_views)} icon={<Eye size={20} />} />
        <StatCard label="Subscribers" value={formatNumber(stats.totals.subscribers)} icon={<Mail size={20} />} />
        <StatCard label="Pending comments" value={formatNumber(stats.totals.pending_comments)} icon={<MessageSquare size={20} />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Articles by status" subtitle="Where the newsroom's stories stand" />
          <div className="p-4 sm:p-5">
            <BarList rows={byStatus} />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Recent articles"
            subtitle="Latest stories across all statuses"
            action={
              <Button variant="outline" onClick={() => navigate("/admin/articles")}>
                View all
              </Button>
            }
          />
          {recent.length === 0 ? (
            <EmptyState
              title="No articles yet"
              hint="Publish your first story from the article editor."
              action={
                <Button onClick={() => navigate("/admin/articles/new")}>
                  <FilePlus2 size={16} /> Write an article
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.slice(0, 8).map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => navigate(`/admin/articles/${a.id}/edit`)}
                  >
                    <p className="truncate text-sm font-medium text-slate-900 hover:text-[#c1121f]">{a.title}</p>
                    <p className="text-xs text-slate-500">
                      {a.category?.name_en ?? "—"} · {formatDate(a.updated_at)} · {formatNumber(a.views)} views
                    </p>
                  </button>
                  <Badge value={a.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Recent comments" subtitle="Latest reader comments" action={<Button variant="outline" onClick={() => navigate("/admin/comments")}>Moderate</Button>} />
          {(stats.recent_comments ?? []).length === 0 ? (
            <EmptyState title="No comments yet" hint="Reader comments will appear here once published stories receive them." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {(stats.recent_comments ?? []).slice(0, 5).map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{c.author_name} <span className="font-normal text-slate-500">on {c.article_title ?? "an article"}</span></p>
                    <p className="truncate text-xs text-slate-500">{c.content} · {timeAgo(c.created_at)}</p>
                  </div>
                  <Badge value={c.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Recent activity" subtitle="Latest audit log entries" action={<Button variant="outline" onClick={() => navigate("/admin/audit-logs")}>View all</Button>} />
          {(stats.recent_audit_logs ?? []).length === 0 ? (
            <EmptyState title="No activity yet" hint="Admin actions are recorded in the audit log." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {(stats.recent_audit_logs ?? []).slice(0, 5).map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                  <p className="min-w-0 truncate text-sm text-slate-800">
                    <span className="font-medium text-slate-900">{l.user_name ?? "—"}</span> · {l.action}
                    {l.entity_type ? ` · ${l.entity_type} ${l.entity_id ?? ""}` : ""}
                  </p>
                  <span className="shrink-0 text-xs text-slate-500">{timeAgo(l.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader title="Quick actions" subtitle="Common newsroom tasks" />
        <div className="flex flex-wrap gap-2 p-4 sm:p-5">
          <Button variant="outline" onClick={() => navigate("/admin/articles/new")}>
            <FilePlus2 size={16} /> New article
          </Button>
          <Button variant="outline" onClick={() => navigate("/admin/drafts")}>
            <Clock size={16} /> Review drafts
          </Button>
          <Button variant="outline" onClick={() => navigate("/admin/comments")}>
            <MessageSquare size={16} /> Moderate comments
          </Button>
          <Button variant="outline" onClick={() => navigate("/admin/analytics")}>
            <BarChart3 size={16} /> View analytics
          </Button>
        </div>
      </Card>
    </div>
  );
}

import { useEffect, useState } from "react";
import { BarChart3, Eye, FileText } from "lucide-react";
import { adminApi, type AnalyticsResponse } from "../lib/adminApi";
import { formatNumber } from "../lib/utils";
import { BarList, Button, Card, CardHeader, ErrorState, SelectInput, Spinner, StatCard } from "../components/ui";

export function Analytics() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await adminApi.getAnalytics(days));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  if (loading) return <Spinner label="Loading analytics…" />;
  if (error || !data) return <ErrorState message={error ?? "Analytics unavailable."} onRetry={() => void load()} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Analytics</h1>
          <p className="mt-0.5 text-sm text-slate-500">Readership over the selected range.</p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="analytics-days" className="text-sm text-slate-600">Range</label>
          <SelectInput id="analytics-days" value={String(days)} onChange={(e) => setDays(Number(e.target.value))} className="!w-auto">
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </SelectInput>
          <Button variant="outline" onClick={() => void load()}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Views in range" value={formatNumber(data.total_views)} icon={<Eye size={20} />} />
        <StatCard label="Total articles" value={formatNumber(data.totals.articles)} icon={<FileText size={20} />} />
        <StatCard label="Published" value={formatNumber(data.totals.published_articles)} icon={<BarChart3 size={20} />} />
        <StatCard label="Comments" value={formatNumber(data.totals.comments)} icon={<Eye size={20} />} />
      </div>

      <Card>
        <CardHeader title="Views by day" subtitle={`Daily article views, last ${data.range_days} days`} />
        <div className="p-4 sm:p-5">
          <BarList rows={data.views_by_day.map((d) => ({ label: d.date, value: d.views }))} maxLabel={`${formatNumber(data.total_views)} views in range`} />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Top articles" subtitle="Most viewed published stories" />
          {data.top_articles.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">No article views recorded yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.top_articles.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                  <p className="min-w-0 truncate text-sm font-medium text-slate-900">{a.title}</p>
                  <span className="shrink-0 text-sm tabular-nums text-slate-700">{formatNumber(a.views)} views</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader title="Views by category" subtitle="Published articles per category" />
          <div className="p-4 sm:p-5">
            <BarList rows={data.views_by_category.map((c) => ({ label: c.category, value: c.views }))} />
          </div>
        </Card>
      </div>
    </div>
  );
}

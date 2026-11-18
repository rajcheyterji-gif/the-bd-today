import { useEffect, useMemo, useState } from "react";
import { Globe, Pencil, RefreshCw, Search } from "lucide-react";
import { adminApi, type Article, type Category } from "../lib/adminApi";
import { useToast } from "../components/Toast";
import { Button, Card, CardHeader, EmptyState, ErrorState, Field, Modal, Spinner, TextArea, TextInput } from "../components/ui";

/** SEO Manager: edit per-article SEO title/description (saved via the
 *  article update API) and preview the sitemap/robots text. There is NO
 *  sitemap endpoint in this repo, so the sitemap preview is generated
 *  client-side from the published articles + categories. */
export function SeoManager() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Article | null>(null);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.listArticles({ status: "published", limit: 50 });
      setArticles(res.items);
      setCategories((await adminApi.listCategories()).items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load articles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = articles.filter(
    (a) => !q.trim() || a.title.toLowerCase().includes(q.trim().toLowerCase()) || a.slug.includes(q.trim().toLowerCase()),
  );

  const openEdit = (a: Article) => {
    setEditing(a);
    setSeoTitle(a.seo_title ?? "");
    setSeoDescription(a.seo_description ?? "");
  };

  const saveSeo = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const updated = await adminApi.updateArticle(editing.id, { seo_title: seoTitle.trim() || null, seo_description: seoDescription.trim() || null });
      toast.success("SEO fields saved.");
      setArticles((list) => list.map((x) => (x.id === editing.id ? updated : x)));
      setEditing(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save SEO fields.");
    } finally {
      setSaving(false);
    }
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "https://thebdtoday.example";
  const sitemapText = useMemo(() => {
    const lines = [
      ...categories.map((c) => `  <url><loc>${origin}/category/${c.slug}</loc></url>`),
      ...articles.map((a) => `  <url><loc>${origin}/${a.slug}</loc><lastmod>${a.updated_at.slice(0, 10)}</lastmod></url>`),
    ];
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${lines.join("\n")}\n</urlset>`;
  }, [articles, categories, origin]);
  const robotsText = `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">SEO Manager</h1>
          <p className="mt-0.5 text-sm text-slate-500">Search titles and descriptions per article, plus sitemap and robots previews.</p>
        </div>
        <Button variant="outline" onClick={() => void load()}>
          <RefreshCw size={16} /> Refresh
        </Button>
      </div>

      <Card>
        <CardHeader title="Published articles" subtitle="Edit the SEO title and description each story shows in search results" />
        <div className="border-b border-slate-100 px-4 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <TextInput aria-label="Search articles" placeholder="Search by title or slug…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        {loading ? (
          <Spinner label="Loading articles…" />
        ) : error ? (
          <div className="p-4">
            <ErrorState message={error} onRetry={() => void load()} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState title="No published articles" hint="Publish a story first, then tune its search listing here." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((a) => (
              <li key={a.id} className="px-4 py-3 sm:px-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{a.title}</p>
                    <p className="mt-0.5 truncate text-xs text-blue-700">{origin}/{a.slug}</p>
                    <p className="mt-0.5 truncate text-sm text-[#1a0dab]">{a.seo_title || a.title}</p>
                    <p className="text-xs text-slate-500">
                      {a.seo_description || a.excerpt || "No meta description set."} · SEO title {a.seo_title ? `${a.seo_title.length}/60` : "not set"}
                    </p>
                  </div>
                  <Button variant="outline" className="shrink-0 !py-1.5 text-xs" onClick={() => openEdit(a)}>
                    <Pencil size={14} /> Edit SEO
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="sitemap.xml" subtitle={`Preview generated from live data — ${articles.length} published articles, ${categories.length} categories (no sitemap endpoint in the API)`} action={<Globe className="text-slate-400" size={18} />} />
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-all p-4 font-mono text-xs text-slate-700">{sitemapText}</pre>
        </Card>
        <Card>
          <CardHeader title="robots.txt" subtitle="Preview — the live file is served by the public site" action={<Globe className="text-slate-400" size={18} />} />
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-all p-4 font-mono text-xs text-slate-700">{robotsText}</pre>
        </Card>
      </div>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={`SEO — ${editing?.title ?? ""}`}>
        <div className="space-y-4">
          <Field label="SEO title" hint={`${seoTitle.length}/60 characters`}>
            <TextInput aria-label="SEO title" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value.slice(0, 120))} />
          </Field>
          <Field label="SEO description" hint={`${seoDescription.length}/160 characters`}>
            <TextArea aria-label="SEO description" rows={3} value={seoDescription} onChange={(e) => setSeoDescription(e.target.value.slice(0, 320))} />
          </Field>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-medium text-slate-900">Search preview</p>
            <p className="mt-1 truncate text-sm text-blue-700">{origin}/{editing?.slug}</p>
            <p className="truncate text-base text-[#1a0dab]">{seoTitle || editing?.title}</p>
            <p className="text-sm text-slate-600">{seoDescription || editing?.excerpt || "No description yet."}</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={() => void saveSeo()} disabled={saving}>
              {saving ? "Saving…" : "Save SEO"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

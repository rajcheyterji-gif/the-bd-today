import { useEffect, useRef, useState } from "react";
import { Copy, Eye, Search, Trash2, Upload } from "lucide-react";
import { adminApi, type MediaItem } from "../lib/adminApi";
import { formatDate, formatNumber } from "../lib/utils";
import { useToast } from "../components/Toast";
import { Button, Card, ConfirmModal, EmptyState, ErrorState, Modal, Spinner, TextInput } from "../components/ui";

/** Media library: files live in R2 and are displayed via
 *  /api/v1/media-file?key=… (the `url` field on each item). Uploads are
 *  multipart FormData to POST /api/v1/admin/media (max 10 MB; images,
 *  video, audio and PDF). */
export function MediaLibrary() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [qCommitted, setQCommitted] = useState("");
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<MediaItem | null>(null);
  const [toDelete, setToDelete] = useState<MediaItem | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.listMedia({ q: qCommitted || undefined, page, limit: 48 });
      setItems(res.items);
      setTotalPages(res.pagination?.totalPages ?? 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load media.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qCommitted, page]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setPage(1);
      setQCommitted(q);
    }, 400);
    return () => window.clearTimeout(t);
  }, [q]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      await adminApi.uploadMedia(file);
      toast.success("File uploaded.");
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await adminApi.deleteMedia(toDelete.id);
      toast.success("Media deleted.");
      setToDelete(null);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete media.");
    }
  };

  const copyUrl = async (item: MediaItem) => {
    try {
      await navigator.clipboard.writeText(item.url);
      toast.success("URL copied.");
    } catch {
      toast.error("Could not copy the URL.");
    }
  };

  if (loading) return <Spinner label="Loading media…" />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Media Library</h1>
          <p className="mt-0.5 text-sm text-slate-500">Images and files stored in R2. Max 10 MB per file.</p>
        </div>
        <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
          <Upload size={16} /> {uploading ? "Uploading…" : "Upload file"}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*,audio/*,application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleUpload(f);
            e.target.value = "";
          }}
        />
      </div>

      <Card>
        <div className="border-b border-slate-100 px-4 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <TextInput aria-label="Search media" placeholder="Search by filename…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        {items.length === 0 ? (
          <EmptyState
            title="No media yet"
            hint="Upload an image or file to use it in articles."
            action={
              <Button onClick={() => fileRef.current?.click()}>
                <Upload size={16} /> Upload a file
              </Button>
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((item) => (
                <div key={item.id} className="overflow-hidden rounded-lg border border-slate-200">
                  <button type="button" onClick={() => setPreview(item)} className="block w-full text-left" aria-label={`Preview ${item.filename}`}>
                    {item.mime_type.startsWith("image/") ? (
                      <img src={item.url} alt={item.alt_text || item.filename} className="h-32 w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-32 items-center justify-center bg-slate-100 px-2 text-center text-xs text-slate-500">{item.mime_type}</div>
                    )}
                  </button>
                  <div className="px-2 py-2">
                    <p className="truncate text-xs font-medium text-slate-800" title={item.original_name}>{item.original_name}</p>
                    <p className="text-[11px] text-slate-400">
                      {formatDate(item.created_at)} · {formatNumber(Math.round(item.size / 1024))} KB
                      {item.uploaded_by_name ? ` · ${item.uploaded_by_name}` : ""}
                    </p>
                    <div className="mt-1.5 flex gap-1">
                      <Button variant="ghost" className="!px-1.5 !py-1 text-xs" aria-label={`Preview ${item.filename}`} onClick={() => setPreview(item)}>
                        <Eye size={14} /> View
                      </Button>
                      <Button variant="ghost" className="!px-1.5 !py-1 text-xs" aria-label={`Copy URL of ${item.filename}`} onClick={() => void copyUrl(item)}>
                        <Copy size={14} /> Copy URL
                      </Button>
                      <Button variant="ghost" className="!px-1.5 !py-1 text-xs" aria-label={`Delete ${item.filename}`} onClick={() => setToDelete(item)}>
                        <Trash2 size={14} className="text-red-600" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
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

      <Modal open={preview !== null} onClose={() => setPreview(null)} title={preview?.original_name ?? "Preview"} wide>
        {preview ? (
          <div>
            {preview.mime_type.startsWith("image/") ? (
              <img src={preview.url} alt={preview.alt_text || preview.original_name} className="max-h-96 w-full rounded-lg object-contain bg-slate-50" />
            ) : (
              <p className="rounded-lg bg-slate-50 p-6 text-center text-sm text-slate-600">{preview.mime_type} — preview not available.</p>
            )}
            <dl className="mt-4 space-y-1 text-sm text-slate-700">
              <div className="flex gap-2"><dt className="w-24 shrink-0 text-slate-500">Filename</dt><dd className="break-all">{preview.original_name}</dd></div>
              <div className="flex gap-2"><dt className="w-24 shrink-0 text-slate-500">Type</dt><dd>{preview.mime_type}</dd></div>
              <div className="flex gap-2"><dt className="w-24 shrink-0 text-slate-500">Size</dt><dd>{formatNumber(preview.size)} bytes</dd></div>
              <div className="flex gap-2"><dt className="w-24 shrink-0 text-slate-500">Alt text</dt><dd>{preview.alt_text || "—"}</dd></div>
              <div className="flex gap-2"><dt className="w-24 shrink-0 text-slate-500">Uploaded</dt><dd>{formatDate(preview.created_at)}{preview.uploaded_by_name ? ` by ${preview.uploaded_by_name}` : ""}</dd></div>
              <div className="flex gap-2"><dt className="w-24 shrink-0 text-slate-500">URL</dt><dd className="break-all text-xs">{preview.url}</dd></div>
            </dl>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => void copyUrl(preview)}>
                <Copy size={16} /> Copy URL
              </Button>
              <Button variant="danger" onClick={() => { setToDelete(preview); setPreview(null); }}>
                <Trash2 size={16} /> Delete
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmModal
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={() => void confirmDelete()}
        title="Delete media"
        message={`Delete “${toDelete?.original_name ?? ""}”? The file is removed from storage and any article using it will lose its image.`}
      />
    </div>
  );
}

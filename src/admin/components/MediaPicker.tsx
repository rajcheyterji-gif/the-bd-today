import { useEffect, useState } from "react";
import { CheckCircle2, Eye, Image, Search, Upload, X } from "lucide-react";
import { adminApi, type MediaItem } from "../lib/adminApi";
import { formatDate, formatNumber } from "../lib/utils";
import { useToast } from "./Toast";
import { Button, Modal, Spinner, TextInput } from "./ui";

interface MediaPickerProps {
  open: boolean;
  onClose: () => void;
  /** Called with the chosen image URL (and item). */
  onSelect: (url: string, item: MediaItem) => void;
  selectedUrl?: string;
}

/** Featured-image picker: browse the Media Library, upload a new image,
 *  or paste a URL. Library images are served from R2 at
 *  /api/v1/media-file?key=…; the article API absolutizes that URL on save
 *  (its validator requires an absolute URL). */
export function MediaPicker({ open, onClose, onSelect, selectedUrl }: MediaPickerProps) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [url, setUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const toast = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApi.listMedia({ q: q || undefined, limit: 30 });
      setItems(res.items);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load media.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const media = await adminApi.uploadMedia(file);
      toast.success("Image uploaded.");
      onSelect(media.url, media);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Choose a featured image" wide>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <TextInput
            aria-label="Search media"
            placeholder="Search media…"
            className="pl-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void load();
            }}
          />
        </div>
        <Button variant="outline" onClick={() => void load()}>
          Search
        </Button>
        <label className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[#c1121f] px-3 py-2 text-sm font-medium text-white hover:bg-[#9e0e19]">
          <Upload size={16} /> {uploading ? "Uploading…" : "Upload image"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleUpload(f);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      <div className="mb-3 flex gap-2">
        <TextInput aria-label="Image URL" placeholder="…or paste an image URL" value={url} onChange={(e) => setUrl(e.target.value)} />
        <Button
          variant="outline"
          onClick={() => {
            if (!url.trim()) {
              toast.error("Paste an image URL first.");
              return;
            }
            onSelect(url.trim(), {
              id: 0,
              filename: url.trim().split("/").pop() || "external image",
              original_name: url.trim().split("/").pop() || "external image",
              url: url.trim(),
              r2_key: "",
              mime_type: "image/*",
              size: 0,
              created_at: new Date().toISOString(),
            });
            onClose();
          }}
        >
          Use URL
        </Button>
      </div>

      {loading ? (
        <Spinner label="Loading media…" />
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">No media yet — upload an image or paste a URL above.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelect(item.url, item);
                onClose();
              }}
              className={`group relative overflow-hidden rounded-lg border text-left ${
                selectedUrl === item.url ? "border-[#c1121f] ring-2 ring-[#c1121f]/30" : "border-slate-200 hover:border-slate-400"
              }`}
            >
              {item.mime_type.startsWith("image/") ? (
                <img src={item.url} alt={item.alt_text || item.filename} className="h-28 w-full object-cover" loading="lazy" />
              ) : (
                <div className="flex h-28 items-center justify-center bg-slate-100 text-slate-400">
                  <Image size={28} />
                </div>
              )}
              {selectedUrl === item.url ? (
                <span className="absolute right-2 top-2 rounded-full bg-[#c1121f] p-1 text-white">
                  <CheckCircle2 size={14} />
                </span>
              ) : null}
              <span className="block truncate px-2 py-1.5 text-xs text-slate-700">{item.filename}</span>
              <span className="block px-2 pb-1.5 text-[11px] text-slate-400">
                {formatDate(item.created_at)} · {item.size ? `${formatNumber(Math.round(item.size / 1024))} KB` : "—"}
              </span>
            </button>
          ))}
        </div>
      )}
      <div className="mt-4 flex justify-end">
        <Button variant="outline" onClick={onClose}>
          <X size={16} /> Close
        </Button>
      </div>
    </Modal>
  );
}

/** Small preview chip used inside forms. */
export function ImagePreview({ url, onRemove }: { url?: string; onRemove?: () => void }) {
  if (!url) return null;
  return (
    <div className="relative mt-2 overflow-hidden rounded-lg border border-slate-200">
      <img src={url} alt="Featured" className="max-h-48 w-full object-cover" />
      <span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/60 px-2 py-1 text-xs text-white">
        <span className="flex items-center gap-1">
          <Eye size={12} /> Featured image
        </span>
        {onRemove ? (
          <button type="button" onClick={onRemove} className="rounded px-1.5 py-0.5 hover:bg-white/20">
            Remove
          </button>
        ) : null}
      </span>
    </div>
  );
}

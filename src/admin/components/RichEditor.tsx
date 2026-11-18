import { useEffect, useRef, useState } from "react";
import { Bold, Eye, FileText, Heading2, Image, Italic, Link2, List, ListOrdered, Quote, Redo2, Underline, Undo2, Upload } from "lucide-react";
import { adminApi } from "../lib/adminApi";
import { sanitizeHtml } from "../lib/sanitize";
import { wordCount } from "../lib/utils";
import { useToast } from "./Toast";
import { Button, Modal, TextInput } from "./ui";

interface RichEditorProps {
  value: string;
  onChange: (html: string) => void;
  label?: string;
  placeholder?: string;
}

function ToolbarButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={`rounded-md p-2 transition-colors ${active ? "bg-[#c1121f] text-white" : "text-slate-700 hover:bg-slate-100"}`}
    >
      {children}
    </button>
  );
}

/** contentEditable rich editor: headings, lists, quote, links, images
 *  (URL or upload to the Media Library), image captions, undo/redo, live
 *  preview, word count. Emits sanitized HTML via onChange. */
export function RichEditor({ value, onChange, label = "Article content", placeholder = "Write the story…" }: RichEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [imageOpen, setImageOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageCaption, setImageCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const toast = useToast();
  const lastEmitted = useRef(value);

  // Push external value changes (e.g. loading an article to edit) into the editor.
  useEffect(() => {
    const el = editorRef.current;
    if (el && value !== lastEmitted.current && el.innerHTML !== value) {
      el.innerHTML = value;
      lastEmitted.current = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const emit = () => {
    const el = editorRef.current;
    if (!el) return;
    const html = sanitizeHtml(el.innerHTML);
    lastEmitted.current = html;
    onChange(html);
  };

  const exec = (cmd: string, arg?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, arg);
    emit();
  };

  const insertImage = (src: string, caption: string) => {
    editorRef.current?.focus();
    const figure = caption
      ? `<figure><img src="${src}" alt="${caption.replace(/"/g, "&quot;")}"><figcaption>${caption.replace(/</g, "&lt;")}</figcaption></figure><p><br></p>`
      : `<p><img src="${src}" alt=""></p>`;
    document.execCommand("insertHTML", false, figure);
    emit();
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const media = await adminApi.uploadMedia(file, imageCaption || undefined);
      insertImage(media.url, imageCaption || file.name);
      setImageOpen(false);
      setImageCaption("");
      toast.success("Image uploaded and inserted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Image upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const words = wordCount(value);

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-800">{label}</span>
        <span className="text-xs text-slate-500">
          {words.toLocaleString()} words · ~{Math.max(1, Math.ceil(words / 200))} min read
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-300 bg-white focus-within:border-[#c1121f] focus-within:ring-2 focus-within:ring-[#c1121f]/20">
        <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-2 py-1.5" role="toolbar" aria-label="Formatting toolbar">
          <ToolbarButton label="Undo" onClick={() => exec("undo")}>
            <Undo2 size={16} />
          </ToolbarButton>
          <ToolbarButton label="Redo" onClick={() => exec("redo")}>
            <Redo2 size={16} />
          </ToolbarButton>
          <span className="mx-1 h-5 w-px bg-slate-300" />
          <ToolbarButton label="Bold" onClick={() => exec("bold")}>
            <Bold size={16} />
          </ToolbarButton>
          <ToolbarButton label="Italic" onClick={() => exec("italic")}>
            <Italic size={16} />
          </ToolbarButton>
          <ToolbarButton label="Underline" onClick={() => exec("underline")}>
            <Underline size={16} />
          </ToolbarButton>
          <span className="mx-1 h-5 w-px bg-slate-300" />
          <ToolbarButton label="Heading 2" onClick={() => exec("formatBlock", "h2")}>
            <Heading2 size={16} />
          </ToolbarButton>
          <ToolbarButton label="Heading 3" onClick={() => exec("formatBlock", "h3")}>
            <span className="text-xs font-bold">H3</span>
          </ToolbarButton>
          <ToolbarButton label="Paragraph" onClick={() => exec("formatBlock", "p")}>
            <FileText size={16} />
          </ToolbarButton>
          <span className="mx-1 h-5 w-px bg-slate-300" />
          <ToolbarButton label="Bullet list" onClick={() => exec("insertUnorderedList")}>
            <List size={16} />
          </ToolbarButton>
          <ToolbarButton label="Numbered list" onClick={() => exec("insertOrderedList")}>
            <ListOrdered size={16} />
          </ToolbarButton>
          <ToolbarButton label="Blockquote" onClick={() => exec("formatBlock", "blockquote")}>
            <Quote size={16} />
          </ToolbarButton>
          <span className="mx-1 h-5 w-px bg-slate-300" />
          <ToolbarButton label="Insert link" onClick={() => setLinkOpen(true)}>
            <Link2 size={16} />
          </ToolbarButton>
          <ToolbarButton label="Insert image" onClick={() => setImageOpen(true)}>
            <Image size={16} />
          </ToolbarButton>
          <span className="mx-1 h-5 w-px bg-slate-300" />
          <ToolbarButton label={showPreview ? "Edit" : "Preview"} active={showPreview} onClick={() => setShowPreview((s) => !s)}>
            <Eye size={16} />
          </ToolbarButton>
        </div>

        {showPreview ? (
          <div className="prose max-w-none px-4 py-3 text-sm leading-relaxed text-slate-900 [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mt-3 [&_h3]:text-lg [&_h3]:font-bold [&_blockquote]:border-l-4 [&_blockquote]:border-[#c1121f] [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-slate-600 [&_img]:max-w-full [&_img]:rounded-lg [&_figcaption]:mt-1 [&_figcaption]:text-center [&_figcaption]:text-xs [&_figcaption]:text-slate-500 [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-[#c1121f] [&_a]:underline">
            {value ? (
              <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(value) }} />
            ) : (
              <p className="text-slate-400">Nothing to preview yet.</p>
            )}
          </div>
        ) : (
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-label={label}
            aria-multiline="true"
            data-placeholder={placeholder}
            onInput={emit}
            onBlur={emit}
            className="min-h-[320px] px-4 py-3 text-sm leading-relaxed text-slate-900 outline-none empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)] [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mt-3 [&_h3]:text-lg [&_h3]:font-bold [&_blockquote]:border-l-4 [&_blockquote]:border-[#c1121f] [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-slate-600 [&_img]:max-w-full [&_img]:rounded-lg [&_figcaption]:mt-1 [&_figcaption]:text-center [&_figcaption]:text-xs [&_figcaption]:text-slate-500 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
          />
        )}
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Paste from Word/Google Docs is cleaned on save — scripts, styles and tracking attributes are stripped.
      </p>

      <Modal open={linkOpen} onClose={() => setLinkOpen(false)} title="Insert link">
        <div className="space-y-3">
          <TextInput
            aria-label="Link URL"
            placeholder="https://example.com"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (linkUrl.trim()) exec("createLink", linkUrl.trim());
                setLinkOpen(false);
                setLinkUrl("");
              }
            }}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setLinkOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!linkUrl.trim()) {
                  toast.error("Enter a URL first.");
                  return;
                }
                exec("createLink", linkUrl.trim());
                setLinkOpen(false);
                setLinkUrl("");
              }}
            >
              Insert link
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={imageOpen} onClose={() => setImageOpen(false)} title="Insert image">
        <div className="space-y-3">
          <TextInput aria-label="Image URL" placeholder="https://example.com/photo.jpg" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
          <TextInput aria-label="Image caption" placeholder="Caption (optional)" value={imageCaption} onChange={(e) => setImageCaption(e.target.value)} />
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                fileRef.current?.click();
              }}
              disabled={uploading}
            >
              <Upload size={16} /> {uploading ? "Uploading…" : "Upload from device"}
            </Button>
            <Button
              onClick={() => {
                if (!imageUrl.trim()) {
                  toast.error("Enter an image URL or upload a file.");
                  return;
                }
                insertImage(imageUrl.trim(), imageCaption);
                setImageOpen(false);
                setImageUrl("");
                setImageCaption("");
              }}
            >
              Insert image
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleUpload(f);
              e.target.value = "";
            }}
          />
        </div>
      </Modal>
    </div>
  );
}

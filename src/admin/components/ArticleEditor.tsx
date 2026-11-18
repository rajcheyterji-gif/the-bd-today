import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Eye, Image, RefreshCw, Save, Send, X } from "lucide-react";
import { adminApi, type Article, type ArticleInput, type ArticleStatus, type Author, type Category, type Tag } from "../lib/adminApi";
import { sanitizeHtml } from "../lib/sanitize";
import { formatDateTime, slugify, toInputDateTime } from "../lib/utils";
import { RichEditor } from "./RichEditor";
import { ImagePreview, MediaPicker } from "./MediaPicker";
import { useToast } from "./Toast";
import { Button, Field, Modal, SelectInput, Spinner, TextArea, TextInput } from "./ui";

export interface ArticleEditorProps {
  /** When set, the form edits this article; otherwise it creates a new one. */
  article?: Article | null;
  loading?: boolean;
  onSaved?: (article: Article) => void;
}

/** Full article form: headline, subtitle, excerpt, RichEditor content,
 *  featured image (Media Library picker), category, tags (multi + add new),
 *  author, SEO, slug (auto + editable), status, schedule — Save Draft /
 *  Preview / Publish / Schedule / Archive.
 *
 *  Repo notes: `archived` IS a supported status here; the server requires
 *  category_id on create and an absolute URL for featured_image_url
 *  (adminApi absolutizes relative R2 URLs). There are no breaking/featured
 *  flags in this repo's API, so the reference's checkboxes are omitted. */
export function ArticleEditor({ article, loading, onSaved }: ArticleEditorProps) {
  const navigate = useNavigate();
  const isEdit = Boolean(article);
  const [title, setTitle] = useState(article?.title ?? "");
  const [subtitle, setSubtitle] = useState(article?.subtitle ?? "");
  const [slug, setSlug] = useState(article?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(false);
  const [excerpt, setExcerpt] = useState(article?.excerpt ?? "");
  const [content, setContent] = useState(article?.content ?? "");
  const [categoryId, setCategoryId] = useState<number | "">(article?.category_id ?? "");
  const [authorId, setAuthorId] = useState<number | "">(article?.author_id ?? "");
  const [tags, setTags] = useState<string[]>(article?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [featuredImage, setFeaturedImage] = useState(article?.featured_image_url ?? "");
  const [imageCaption, setImageCaption] = useState(article?.image_caption ?? "");
  const [imageCredit, setImageCredit] = useState(article?.image_credit ?? "");
  const [seoTitle, setSeoTitle] = useState(article?.seo_title ?? "");
  const [seoDescription, setSeoDescription] = useState(article?.seo_description ?? "");
  const [status, setStatus] = useState<ArticleStatus>(article?.status ?? "draft");
  const [scheduledAt, setScheduledAt] = useState(toInputDateTime(article?.scheduled_at));
  const [categories, setCategories] = useState<Category[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    adminApi.listCategories().then((r) => setCategories(r.items)).catch(() => {});
    adminApi.listAuthors().then((r) => setAuthors(r.items)).catch(() => {});
    adminApi.listTags().then((r) => setAllTags(r.items)).catch(() => {});
  }, []);

  // Keep the form in sync when a different article is loaded to edit.
  useEffect(() => {
    if (!article) return;
    setTitle(article.title);
    setSubtitle(article.subtitle ?? "");
    setSlug(article.slug);
    setSlugTouched(true);
    setExcerpt(article.excerpt);
    setContent(article.content);
    setCategoryId(article.category_id ?? "");
    setAuthorId(article.author_id ?? "");
    setTags(article.tags ?? []);
    setFeaturedImage(article.featured_image_url ?? "");
    setImageCaption(article.image_caption ?? "");
    setImageCredit(article.image_credit ?? "");
    setSeoTitle(article.seo_title ?? "");
    setSeoDescription(article.seo_description ?? "");
    setStatus(article.status);
    setScheduledAt(toInputDateTime(article.scheduled_at));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article?.id]);

  const onTitleChange = (v: string) => {
    setTitle(v);
    if (!slugTouched) setSlug(slugify(v));
  };

  const addTag = (name: string) => {
    const clean = name.trim().replace(/^#/, "");
    if (!clean) return;
    if (tags.some((t) => t.toLowerCase() === clean.toLowerCase())) {
      setTagInput("");
      return;
    }
    setTags((t) => [...t, clean]);
    setTagInput("");
    if (!allTags.some((t) => t.name.toLowerCase() === clean.toLowerCase())) {
      setAllTags((t) => [...t, { id: -Date.now(), name: clean, slug: slugify(clean) }]);
    }
  };

  const payload = (nextStatus: ArticleStatus): ArticleInput => ({
    title: title.trim(),
    subtitle: subtitle.trim() || null,
    slug: slug.trim() || slugify(title),
    excerpt: excerpt.trim() || null,
    content: sanitizeHtml(content),
    category_id: categoryId === "" ? null : categoryId,
    author_id: authorId === "" ? null : authorId,
    tags,
    featured_image_url: featuredImage || null,
    image_caption: imageCaption.trim() || null,
    image_credit: imageCredit.trim() || null,
    status: nextStatus,
    scheduled_at: nextStatus === "scheduled" ? (scheduledAt ? new Date(scheduledAt).toISOString() : null) : null,
    seo_title: seoTitle.trim() || null,
    seo_description: seoDescription.trim() || null,
  });

  const validate = (nextStatus: ArticleStatus): string | null => {
    if (!title.trim()) return "A headline is required.";
    if (!content.replace(/<[^>]*>/g, "").trim()) return "Article content is empty.";
    if (categoryId === "") return "Choose a category — the server requires one.";
    if (nextStatus === "scheduled" && !scheduledAt) return "Pick a date and time to schedule this article.";
    if (nextStatus === "scheduled" && scheduledAt && new Date(scheduledAt).getTime() <= Date.now()) {
      return "Scheduled time must be in the future.";
    }
    return null;
  };

  const save = async (nextStatus: ArticleStatus) => {
    const problem = validate(nextStatus);
    if (problem) {
      toast.error(problem);
      return;
    }
    setSaving(true);
    try {
      const saved = isEdit
        ? await adminApi.updateArticle(article!.id, payload(nextStatus))
        : await adminApi.createArticle(payload(nextStatus));
      toast.success(
        nextStatus === "published" ? "Article published." : nextStatus === "scheduled" ? "Article scheduled." : nextStatus === "archived" ? "Article archived." : "Draft saved.",
      );
      onSaved?.(saved);
      if (!isEdit) navigate(`/admin/articles/${saved.id}/edit`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the article.");
    } finally {
      setSaving(false);
    }
  };

  const suggestions = useMemo(
    () => allTags.filter((t) => tagInput.trim() && t.name.toLowerCase().includes(tagInput.trim().toLowerCase()) && !tags.includes(t.name)).slice(0, 6),
    [allTags, tagInput, tags],
  );

  if (loading) return <Spinner label="Loading article…" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{isEdit ? "Edit article" : "New article"}</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {isEdit ? `Editing “${article?.title}” · last updated ${formatDateTime(article?.updated_at)}` : "Write, preview and publish a story."}
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/admin/articles")}>
          Back to articles
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        {/* Main column */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="space-y-4">
              <Field label="Headline" required>
                <TextInput aria-label="Headline" placeholder="The headline readers will see" value={title} onChange={(e) => onTitleChange(e.target.value)} />
              </Field>
              <Field label="Subtitle">
                <TextInput aria-label="Subtitle" placeholder="Optional deck / standfirst" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                <Field label="Slug" hint="Auto-generated from the headline; edit it if needed.">
                  <TextInput aria-label="Slug" value={slug} onChange={(e) => { setSlugTouched(true); setSlug(slugify(e.target.value)); }} />
                </Field>
                <div className="flex items-end pb-0.5">
                  <Button variant="outline" className="w-full sm:w-auto" onClick={() => setSlug(slugify(title))} title="Regenerate slug from headline">
                    <RefreshCw size={16} /> Regenerate
                  </Button>
                </div>
              </div>
              <Field label="Excerpt" hint="Shown on cards and in search results.">
                <TextArea aria-label="Excerpt" rows={3} placeholder="A short summary of the story…" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
              </Field>
              <RichEditor value={content} onChange={setContent} />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="mb-3 text-base font-semibold text-slate-900">Featured image</h2>
            <Button variant="outline" onClick={() => setPickerOpen(true)}>
              <Image size={16} /> {featuredImage ? "Change featured image" : "Choose from Media Library"}
            </Button>
            <ImagePreview url={featuredImage} onRemove={() => setFeaturedImage("")} />
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Image caption">
                <TextInput aria-label="Image caption" value={imageCaption} onChange={(e) => setImageCaption(e.target.value)} />
              </Field>
              <Field label="Image credit">
                <TextInput aria-label="Image credit" placeholder="Photo: …" value={imageCredit} onChange={(e) => setImageCredit(e.target.value)} />
              </Field>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="mb-3 text-base font-semibold text-slate-900">SEO</h2>
            <div className="space-y-4">
              <Field label="SEO title" hint={`${seoTitle.length}/60 characters`}>
                <TextInput aria-label="SEO title" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value.slice(0, 120))} placeholder={title || "Title for search engines"} />
              </Field>
              <Field label="SEO description" hint={`${seoDescription.length}/160 characters`}>
                <TextArea aria-label="SEO description" rows={3} value={seoDescription} onChange={(e) => setSeoDescription(e.target.value.slice(0, 320))} placeholder={excerpt || "Description for search engines"} />
              </Field>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-medium text-slate-900">Search preview</p>
                <p className="mt-1 truncate text-sm text-blue-700">{typeof window !== "undefined" ? window.location.host : ""}/{slug || "article-slug"}</p>
                <p className="truncate text-base text-[#1a0dab]">{seoTitle || title || "Untitled article"}</p>
                <p className="text-sm text-slate-600">{seoDescription || excerpt || "No description yet."}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="mb-3 text-base font-semibold text-slate-900">Publish</h2>
            <div className="space-y-3">
              <Field label="Status">
                <SelectInput aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value as ArticleStatus)}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="archived">Archived</option>
                </SelectInput>
              </Field>
              <Field label="Schedule for" hint="Required when scheduling.">
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <TextInput aria-label="Schedule date and time" type="datetime-local" className="pl-9" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
                </div>
              </Field>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => void save("draft")} disabled={saving}>
                <Save size={16} /> Save draft
              </Button>
              <Button variant="outline" onClick={() => setPreviewOpen(true)}>
                <Eye size={16} /> Preview
              </Button>
              <Button onClick={() => void save("published")} disabled={saving} className="col-span-2">
                <Send size={16} /> {saving ? "Saving…" : "Publish now"}
              </Button>
              <Button variant="dark" onClick={() => void save("scheduled")} disabled={saving} className="col-span-2">
                <Calendar size={16} /> Schedule
              </Button>
              {isEdit ? (
                <Button variant="outline" onClick={() => void save("archived")} disabled={saving} className="col-span-2">
                  Archive
                </Button>
              ) : null}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="mb-3 text-base font-semibold text-slate-900">Organisation</h2>
            <div className="space-y-4">
              <Field label="Category" required>
                <SelectInput aria-label="Category" value={categoryId === "" ? "" : String(categoryId)} onChange={(e) => setCategoryId(e.target.value === "" ? "" : Number(e.target.value))}>
                  <option value="">Select a category…</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name_en}
                      {c.name_bn ? ` (${c.name_bn})` : ""}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Author">
                <SelectInput aria-label="Author" value={authorId === "" ? "" : String(authorId)} onChange={(e) => setAuthorId(e.target.value === "" ? "" : Number(e.target.value))}>
                  <option value="">Select an author…</option>
                  {authors.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} · {a.role}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Tags" hint="Press Enter to add a tag. Tags are created when the article is saved.">
                <div className="flex flex-wrap gap-1.5 rounded-lg border border-slate-300 px-2 py-2 focus-within:border-[#c1121f] focus-within:ring-2 focus-within:ring-[#c1121f]/20">
                  {tags.map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-800">
                      {t}
                      <button type="button" aria-label={`Remove tag ${t}`} onClick={() => setTags((x) => x.filter((y) => y !== t))} className="rounded-full p-0.5 hover:bg-slate-200">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                  <input
                    aria-label="Add a tag"
                    className="min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                    placeholder={tags.length ? "" : "Add tags…"}
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        addTag(tagInput);
                      }
                    }}
                  />
                </div>
                {suggestions.length > 0 ? (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {suggestions.map((s) => (
                      <button key={s.id} type="button" onClick={() => addTag(s.name)} className="rounded-full border border-slate-200 px-2 py-0.5 text-xs text-slate-600 hover:border-[#c1121f] hover:text-[#c1121f]">
                        + {s.name}
                      </button>
                    ))}
                  </div>
                ) : null}
              </Field>
            </div>
          </div>
        </div>
      </div>

      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selectedUrl={featuredImage}
        onSelect={(url) => {
          setFeaturedImage(url);
        }}
      />

      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title="Article preview" wide>
        <article>
          {featuredImage ? <img src={featuredImage} alt={imageCaption || title} className="mb-3 max-h-72 w-full rounded-lg object-cover" /> : null}
          {imageCaption ? <p className="mb-3 text-center text-xs text-slate-500">{imageCaption}</p> : null}
          <p className="text-xs font-semibold uppercase tracking-wide text-[#c1121f]">
            {categories.find((c) => c.id === categoryId)?.name_en ?? ""}
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">{title || "Untitled article"}</h2>
          {subtitle ? <p className="mt-1 text-slate-600">{subtitle}</p> : null}
          <p className="mt-2 text-xs text-slate-500">
            By {authors.find((a) => a.id === authorId)?.name ?? "—"} · {status === "scheduled" && scheduledAt ? `Scheduled for ${formatDateTime(new Date(scheduledAt).toISOString())}` : "Not published yet"}
          </p>
          <div
            className="mt-4 text-sm leading-relaxed text-slate-800 [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:mt-3 [&_h3]:font-bold [&_blockquote]:border-l-4 [&_blockquote]:border-[#c1121f] [&_blockquote]:pl-3 [&_blockquote]:italic [&_img]:max-w-full [&_img]:rounded-lg [&_figcaption]:text-center [&_figcaption]:text-xs [&_figcaption]:text-slate-500 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-[#c1121f] [&_a]:underline"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) || "<p class='text-slate-400'>No content yet.</p>" }}
          />
          {tags.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                  #{t}
                </span>
              ))}
            </div>
          ) : null}
        </article>
      </Modal>
    </div>
  );
}

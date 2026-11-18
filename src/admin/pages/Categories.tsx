import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { adminApi, type Category } from "../lib/adminApi";
import { slugify } from "../lib/utils";
import { useToast } from "../components/Toast";
import { Badge, Button, Card, CardHeader, ConfirmModal, EmptyState, ErrorState, Field, Modal, Spinner, TextArea, TextInput } from "../components/ui";

export function Categories() {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [nameEn, setNameEn] = useState("");
  const [nameBn, setNameBn] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Category | null>(null);
  const toast = useToast();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setItems((await adminApi.listCategories()).items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load categories.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openNew = () => {
    setEditing(null);
    setNameEn("");
    setNameBn("");
    setSlug("");
    setSlugTouched(false);
    setDescription("");
    setFormOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    setNameEn(c.name_en);
    setNameBn(c.name_bn);
    setSlug(c.slug);
    setSlugTouched(true);
    setDescription(c.description ?? "");
    setFormOpen(true);
  };

  const save = async () => {
    if (!nameEn.trim() || !nameBn.trim() || !slug.trim()) {
      toast.error("English name, Bengali name and slug are all required.");
      return;
    }
    setSaving(true);
    try {
      const input = { slug: slugify(slug), name_bn: nameBn.trim(), name_en: nameEn.trim(), description: description.trim() || null };
      if (editing) {
        await adminApi.updateCategory(editing.id, input);
        toast.success("Category updated.");
      } else {
        await adminApi.createCategory(input);
        toast.success("Category created.");
      }
      setFormOpen(false);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the category.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await adminApi.deleteCategory(toDelete.id);
      toast.success("Category deleted.");
      setToDelete(null);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete the category. It may still have articles.");
    }
  };

  if (loading) return <Spinner label="Loading categories…" />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Categories</h1>
          <p className="mt-0.5 text-sm text-slate-500">Sections of the site — each article belongs to one category.</p>
        </div>
        <Button onClick={openNew}>
          <Plus size={16} /> New category
        </Button>
      </div>

      <Card>
        <CardHeader title={`${items.length} categor${items.length === 1 ? "y" : "ies"}`} />
        {items.length === 0 ? (
          <EmptyState title="No categories yet" hint="Create the first section of the site." action={<Button onClick={openNew}><Plus size={16} /> New category</Button>} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">
                    {c.name_en} <span className="font-normal text-slate-500">· {c.name_bn}</span>
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    /{c.slug}{c.description ? ` · ${c.description}` : ""}{c.article_count !== undefined ? ` · ${c.article_count} articles` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Badge value={c.slug} className="hidden sm:inline-flex" />
                  <Button variant="ghost" aria-label={`Edit ${c.name_en}`} onClick={() => openEdit(c)}>
                    <Pencil size={16} />
                  </Button>
                  <Button variant="ghost" aria-label={`Delete ${c.name_en}`} onClick={() => setToDelete(c)}>
                    <Trash2 size={16} className="text-red-600" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? "Edit category" : "New category"}>
        <div className="space-y-4">
          <Field label="Name (English)" required>
            <TextInput
              value={nameEn}
              onChange={(e) => {
                setNameEn(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
              placeholder="National"
            />
          </Field>
          <Field label="Name (Bengali)" required>
            <TextInput value={nameBn} onChange={(e) => setNameBn(e.target.value)} placeholder="জাতীয়" />
          </Field>
          <Field label="Slug" required hint="Lowercase letters, digits and hyphens only.">
            <TextInput value={slug} onChange={(e) => { setSlugTouched(true); setSlug(slugify(e.target.value)); }} placeholder="national" />
          </Field>
          <Field label="Description">
            <TextArea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this section covers…" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Create category"}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={() => void confirmDelete()}
        title="Delete category"
        message={`Delete “${toDelete?.name_en ?? ""}”? Articles in it must be moved first — the server will refuse if any remain.`}
      />
    </div>
  );
}

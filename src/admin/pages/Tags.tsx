import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { adminApi, type Tag } from "../lib/adminApi";
import { slugify } from "../lib/utils";
import { useToast } from "../components/Toast";
import { Button, Card, CardHeader, ConfirmModal, EmptyState, ErrorState, Field, Modal, Spinner, TextInput } from "../components/ui";

export function Tags() {
  const [items, setItems] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [nameBn, setNameBn] = useState("");
  const [editing, setEditing] = useState<Tag | null>(null);
  const [editName, setEditName] = useState("");
  const [editNameBn, setEditNameBn] = useState("");
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Tag | null>(null);
  const toast = useToast();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setItems((await adminApi.listTags()).items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load tags.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const create = async () => {
    const clean = name.trim();
    if (!clean) {
      toast.error("Enter a tag name.");
      return;
    }
    setSaving(true);
    try {
      await adminApi.createTag({ name: clean, name_bn: nameBn.trim() || null });
      toast.success("Tag created.");
      setName("");
      setNameBn("");
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create the tag.");
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    if (!editing || !editName.trim()) {
      toast.error("Enter a tag name.");
      return;
    }
    setSaving(true);
    try {
      await adminApi.updateTag(editing.id, { name: editName.trim(), name_bn: editNameBn.trim() || null });
      toast.success("Tag updated.");
      setEditing(null);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update the tag.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await adminApi.deleteTag(toDelete.id);
      toast.success("Tag deleted.");
      setToDelete(null);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete the tag.");
    }
  };

  if (loading) return <Spinner label="Loading tags…" />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Tags</h1>
        <p className="mt-0.5 text-sm text-slate-500">Labels attached to articles. Tags are also created automatically when saved on an article.</p>
      </div>

      <Card>
        <CardHeader title="Add a tag" />
        <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-end sm:px-5">
          <div className="flex-1">
            <Field label="Tag name" required>
              <TextInput
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Cricket"
                onKeyDown={(e) => {
                  if (e.key === "Enter") void create();
                }}
              />
            </Field>
          </div>
          <div className="flex-1">
            <Field label="Bengali name (optional)">
              <TextInput value={nameBn} onChange={(e) => setNameBn(e.target.value)} placeholder="ক্রিকেট" />
            </Field>
          </div>
          <Button onClick={() => void create()} disabled={saving}>
            <Plus size={16} /> {saving ? "Adding…" : "Add tag"}
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader title={`${items.length} tag${items.length === 1 ? "" : "s"}`} />
        {items.length === 0 ? (
          <EmptyState title="No tags yet" hint="Add a tag above, or save one on an article." />
        ) : (
          <ul className="flex flex-wrap gap-2 p-4 sm:p-5">
            {items.map((t) => (
              <li key={t.id} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800">
                <span className="font-medium">{t.name}</span>
                {t.name_bn ? <span className="text-slate-500">{t.name_bn}</span> : null}
                {t.article_count !== undefined ? <span className="text-xs text-slate-400">· {t.article_count}</span> : null}
                <button
                  type="button"
                  aria-label={`Edit tag ${t.name}`}
                  className="rounded-full p-1 hover:bg-slate-100"
                  onClick={() => {
                    setEditing(t);
                    setEditName(t.name);
                    setEditNameBn(t.name_bn ?? "");
                  }}
                >
                  <Pencil size={13} />
                </button>
                <button type="button" aria-label={`Delete tag ${t.name}`} className="rounded-full p-1 hover:bg-red-50" onClick={() => setToDelete(t)}>
                  <Trash2 size={13} className="text-red-600" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={`Edit tag — ${editing?.name ?? ""}`}>
        <div className="space-y-4">
          <Field label="Tag name" required>
            <TextInput value={editName} onChange={(e) => setEditName(e.target.value)} />
          </Field>
          <Field label="Bengali name (optional)">
            <TextInput value={editNameBn} onChange={(e) => setEditNameBn(e.target.value)} />
          </Field>
          <p className="text-xs text-slate-500">Slug: {slugify(editName || editing?.name || "")}</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={() => void saveEdit()} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={() => void confirmDelete()}
        title="Delete tag"
        message={`Delete the tag “${toDelete?.name ?? ""}”? It will be removed from its articles.`}
      />
    </div>
  );
}

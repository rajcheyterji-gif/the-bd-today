import { useEffect, useState } from "react";
import { Plus, Save } from "lucide-react";
import { adminApi, type SiteSettings } from "../lib/adminApi";
import { useToast } from "../components/Toast";
import { Button, Card, CardHeader, ErrorState, Field, Spinner, TextArea, TextInput } from "../components/ui";

const FIELDS: { key: string; label: string; placeholder: string; textarea?: boolean }[] = [
  { key: "site_name", label: "Site name", placeholder: "THE BD TODAY" },
  { key: "tagline", label: "Tagline", placeholder: "Truth, first — Bangladesh and the world" },
  { key: "description", label: "Site description", placeholder: "Short description used across the site and in search results", textarea: true },
  { key: "contact_email", label: "Contact email", placeholder: "newsroom@thebdtoday.example" },
  { key: "facebook_url", label: "Facebook URL", placeholder: "https://facebook.com/thebdtoday" },
  { key: "twitter_url", label: "X / Twitter URL", placeholder: "https://x.com/thebdtoday" },
  { key: "youtube_url", label: "YouTube URL", placeholder: "https://youtube.com/@thebdtoday" },
  { key: "instagram_url", label: "Instagram URL", placeholder: "https://instagram.com/thebdtoday" },
  { key: "linkedin_url", label: "LinkedIn URL", placeholder: "https://linkedin.com/company/thebdtoday" },
];

/** Settings are flat string key/value pairs (GET/PUT /api/v1/admin/settings,
 *  admin only). Known keys get labelled fields; any other stored key is
 *  shown below and stays editable, and new keys can be added. */
export function Settings() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const toast = useToast();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setSettings(await adminApi.getSettings());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const set = (key: string, value: string) => {
    setSettings((s) => ({ ...(s ?? {}), [key]: value }));
  };

  const save = async () => {
    if (!settings) return;
    if (!settings.site_name?.trim()) {
      toast.error("Site name is required.");
      return;
    }
    setSaving(true);
    try {
      const saved = await adminApi.updateSettings(settings);
      setSettings(saved);
      toast.success("Settings saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save settings.");
    } finally {
      setSaving(false);
    }
  };

  const addKey = () => {
    const key = newKey.trim();
    if (!key) {
      toast.error("Enter a setting key.");
      return;
    }
    if (settings && key in settings) {
      toast.error("That key already exists — edit it below.");
      return;
    }
    set(key, newValue);
    setNewKey("");
    setNewValue("");
    toast.success(`Setting “${key}” added — save to keep it.`);
  };

  if (loading) return <Spinner label="Loading settings…" />;
  if (error || !settings) return <ErrorState message={error ?? "Settings unavailable."} onRetry={() => void load()} />;

  const knownKeys = new Set(FIELDS.map((f) => f.key));
  const extraKeys = Object.keys(settings).filter((k) => !knownKeys.has(k)).sort();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Website Settings</h1>
        <p className="mt-0.5 text-sm text-slate-500">Site identity and social links shown in the header and footer. Saving needs the Admin role.</p>
      </div>

      <Card>
        <CardHeader title="Site identity" />
        <div className="space-y-4 p-4 sm:p-5">
          {FIELDS.slice(0, 4).map((f) =>
            f.textarea ? (
              <Field key={f.key} label={f.label}>
                <TextArea aria-label={f.label} rows={3} placeholder={f.placeholder} value={settings[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} />
              </Field>
            ) : (
              <Field key={f.key} label={f.label}>
                <TextInput aria-label={f.label} placeholder={f.placeholder} value={settings[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} />
              </Field>
            ),
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Social links" subtitle="Leave a field blank to hide that link" />
        <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
          {FIELDS.slice(4).map((f) => (
            <Field key={f.key} label={f.label}>
              <TextInput aria-label={f.label} type="url" placeholder={f.placeholder} value={settings[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} />
            </Field>
          ))}
        </div>
        <div className="flex justify-end border-t border-slate-100 px-4 py-3 sm:px-5">
          <Button onClick={() => void save()} disabled={saving}>
            <Save size={16} /> {saving ? "Saving…" : "Save settings"}
          </Button>
        </div>
      </Card>

      {extraKeys.length > 0 ? (
        <Card>
          <CardHeader title="Other stored settings" subtitle="Keys saved by other tools — still editable here" />
          <div className="space-y-4 p-4 sm:p-5">
            {extraKeys.map((k) => (
              <Field key={k} label={k}>
                <TextInput aria-label={k} value={settings[k] ?? ""} onChange={(e) => set(k, e.target.value)} />
              </Field>
            ))}
          </div>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Add a setting" subtitle="Custom key/value pairs are stored alongside the known settings" />
        <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-end sm:px-5">
          <div className="flex-1">
            <Field label="Key">
              <TextInput aria-label="New setting key" placeholder="e.g. breaking_banner" value={newKey} onChange={(e) => setNewKey(e.target.value)} />
            </Field>
          </div>
          <div className="flex-1">
            <Field label="Value">
              <TextInput aria-label="New setting value" placeholder="Value" value={newValue} onChange={(e) => setNewValue(e.target.value)} />
            </Field>
          </div>
          <Button variant="outline" onClick={addKey}>
            <Plus size={16} /> Add
          </Button>
        </div>
      </Card>
    </div>
  );
}

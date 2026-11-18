import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { adminApi } from "../lib/adminApi";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../components/Toast";
import { Badge, Button, Card, CardHeader, Field, PasswordInput, TextArea, TextInput } from "../components/ui";

/** My Profile: the signed-in admin edits their own name, email and bio,
 *  and changes their own password (current password required).
 *  The role is shown read-only — it can never be changed from here. */
export function Profile() {
  const { user, refresh } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [saving, setSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changing, setChanging] = useState(false);

  // Fill the form once the session user loads.
  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setBio(user.bio ?? "");
    }
  }, [user]);

  const saveProfile = async () => {
    if (!name.trim()) {
      toast.error("Enter your name.");
      return;
    }
    if (!email.trim()) {
      toast.error("Enter your email.");
      return;
    }
    setSaving(true);
    try {
      await adminApi.updateProfile({ name: name.trim(), email: email.trim(), bio: bio.trim() || null });
      await refresh();
      toast.success("Profile saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (!currentPassword) {
      toast.error("Enter your current password.");
      return;
    }
    if (newPassword.length < 12) {
      toast.error("The new password must be at least 12 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("The new passwords do not match.");
      return;
    }
    setChanging(true);
    try {
      await adminApi.changePassword({ current_password: currentPassword, new_password: newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password changed. Other devices have been signed out.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not change your password.");
    } finally {
      setChanging(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">My Profile</h1>
        <p className="mt-0.5 text-sm text-slate-500">Your name, email and password — only you can change these.</p>
      </div>

      <Card>
        <CardHeader
          title="Profile details"
          subtitle="Shown on your articles and in the team list"
          action={user ? <Badge value={user.role} /> : null}
        />
        <div className="space-y-4 p-4 sm:p-5">
          <Field label="Name" required>
            <TextInput aria-label="Name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </Field>
          <Field label="Email" required>
            <TextInput aria-label="Email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@thebdtoday.online" />
          </Field>
          <Field label="Bio" hint="A short line shown on your author page.">
            <TextArea aria-label="Bio" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Reporter at THE BD TODAY…" />
          </Field>
          <p className="text-xs text-slate-500">
            Your role ({user ? user.role.replace("_", " ") : "—"}) is set by the site owner and cannot be changed here.
          </p>
          <div className="flex">
            <Button className="w-full sm:w-auto" onClick={() => void saveProfile()} disabled={saving}>
              <Save size={16} /> {saving ? "Saving…" : "Save profile"}
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Change password" subtitle="Your other signed-in devices will be signed out" />
        <div className="space-y-4 p-4 sm:p-5">
          <Field label="Current password" required>
            <PasswordInput aria-label="Current password" autoComplete="current-password" placeholder="••••••••" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </Field>
          <Field label="New password" required hint="At least 12 characters.">
            <PasswordInput aria-label="New password" autoComplete="new-password" placeholder="••••••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </Field>
          <Field label="Confirm new password" required>
            <PasswordInput aria-label="Confirm new password" autoComplete="new-password" placeholder="••••••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </Field>
          <div className="flex">
            <Button variant="dark" className="w-full sm:w-auto" onClick={() => void changePassword()} disabled={changing}>
              {changing ? "Changing…" : "Change password"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

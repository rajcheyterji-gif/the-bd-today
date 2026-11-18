import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminApi } from "../lib/adminApi";
import { useToast } from "../components/Toast";
import { useAuth } from "../hooks/useAuth";
import { Button, Card, Field, TextInput } from "../components/ui";

/** Sign-in (cookie session). On a fresh install the page offers the
 *  one-time first-admin setup instead — it needs the ADMIN_INIT_TOKEN
 *  and a password of at least 12 characters, and it does NOT sign in:
 *  after setup, sign in with the new account. */
export function Login() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [setupDone, setSetupDone] = useState(false);

  useEffect(() => {
    if (user) navigate("/admin", { replace: true });
  }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setBusy(true);
    try {
      await adminApi.login(email.trim(), password);
      await refresh();
      toast.success("Welcome back.");
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Check your email and password.");
    } finally {
      setBusy(false);
    }
  };

  const setup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!token.trim() || name.trim().length < 2 || !email.trim() || password.length < 12) {
      setError("Enter the init token, your name, a valid email, and a password of at least 12 characters.");
      return;
    }
    setBusy(true);
    try {
      await adminApi.initAdmin({ token: token.trim(), name: name.trim(), email: email.trim(), password });
      setSetupDone(true);
      setShowSetup(false);
      toast.success("First admin account created — now sign in with it.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#c1121f]">The BD Today</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{showSetup ? "Set up your newsroom" : "Admin sign in"}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {showSetup ? "No admin account exists yet — create the first admin with the init token." : "Editors and administrators only."}
          </p>
        </div>
        <Card className="p-5 sm:p-6">
          {showSetup ? (
            <form onSubmit={setup} className="space-y-4">
              <Field label="Init token" required hint="The ADMIN_INIT_TOKEN configured on the server.">
                <TextInput aria-label="Init token" autoComplete="off" placeholder="Init token" value={token} onChange={(e) => setToken(e.target.value)} />
              </Field>
              <Field label="Your name" required>
                <TextInput aria-label="Your name" autoComplete="name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Email" required>
                <TextInput aria-label="Email" type="email" autoComplete="email" placeholder="you@thebdtoday.example" value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
              <Field label="Password" required hint="At least 12 characters.">
                <TextInput aria-label="Password" type="password" autoComplete="new-password" placeholder="••••••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
              </Field>
              {error ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                  {error}
                </p>
              ) : null}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Creating account…" : "Create admin account"}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => { setShowSetup(false); setError(null); }}>
                Back to sign in
              </Button>
            </form>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <Field label="Email" required>
                <TextInput aria-label="Email" type="email" autoComplete="email" placeholder="you@thebdtoday.example" value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
              <Field label="Password" required>
                <TextInput aria-label="Password" type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
              </Field>
              {setupDone ? (
                <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800" role="status">
                  Admin account created — sign in with it now.
                </p>
              ) : null}
              {error ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                  {error}
                </p>
              ) : null}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Signing in…" : "Sign in"}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => { setShowSetup(true); setError(null); }}>
                First time? Set up the first admin
              </Button>
            </form>
          )}
        </Card>
        <p className="mt-4 text-center text-xs text-slate-400">Sessions are cookie-based and verified on every admin page.</p>
      </div>
    </div>
  );
}

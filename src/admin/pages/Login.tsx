import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
      setError("ইমেইল ও পাসওয়ার্ড দিন।");
      return;
    }
    setBusy(true);
    try {
      await adminApi.login(email.trim(), password);
      await refresh();
      toast.success("Welcome back.");
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "সাইন ইন ব্যর্থ হয়েছে। ইমেইল ও পাসওয়ার্ড যাচাই করুন।");
    } finally {
      setBusy(false);
    }
  };

  const setup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!token.trim() || name.trim().length < 2 || !email.trim() || password.length < 12) {
      setError("ইনিট টোকেন, আপনার নাম, সঠিক ইমেইল এবং কমপক্ষে ১২ অক্ষরের পাসওয়ার্ড দিন।");
      return;
    }
    setBusy(true);
    try {
      await adminApi.initAdmin({ token: token.trim(), name: name.trim(), email: email.trim(), password });
      setSetupDone(true);
      setShowSetup(false);
      toast.success("First admin account created — now sign in with it.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "সেটআপ ব্যর্থ হয়েছে।");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 py-10">
      <div className="w-full max-w-md">
        {/* Newspaper brand */}
        <div className="mb-5 text-center">
          <Link to="/" className="inline-block" aria-label="THE BD TODAY — সাইটে ফিরে যান">
            <span className="font-serif text-[32px] font-black leading-none tracking-tight text-slate-900">
              THE BD <span className="text-[#c1121f]">TODAY</span>
            </span>
          </Link>
          <p className="mt-1.5 font-bengali text-sm text-slate-500">দ্য বিডি টুডে — সত্য, সবার আগে</p>
          <div className="mx-auto mt-4 max-w-xs border-t-[3px] border-slate-900" aria-hidden="true" />
        </div>

        <div className="mb-5 text-center">
          <h1 className="font-bengali text-2xl font-bold text-slate-900">
            {showSetup ? "প্রথম অ্যাডমিন তৈরি করুন" : "নিউজরুমে সাইন ইন"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {showSetup
              ? "এখনো কোনো অ্যাডমিন অ্যাকাউন্ট নেই — ইনিট টোকেন দিয়ে প্রথম অ্যাডমিন তৈরি করুন।"
              : "শুধুমাত্র সম্পাদক ও প্রশাসকদের জন্য।"}
          </p>
        </div>

        <Card className="p-5 sm:p-6">
          {showSetup ? (
            <form onSubmit={setup} className="space-y-4">
              <Field label="ইনিট টোকেন" required hint="সার্ভারে কনফিগার করা ADMIN_INIT_TOKEN।">
                <TextInput aria-label="ইনিট টোকেন" autoComplete="off" placeholder="ইনিট টোকেন" value={token} onChange={(e) => setToken(e.target.value)} />
              </Field>
              <Field label="আপনার নাম" required>
                <TextInput aria-label="আপনার নাম" autoComplete="name" placeholder="আপনার নাম" value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="ইমেইল" required>
                <TextInput aria-label="ইমেইল" type="email" autoComplete="email" placeholder="you@thebdtoday.online" value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
              <Field label="পাসওয়ার্ড" required hint="কমপক্ষে ১২ অক্ষর।">
                <TextInput aria-label="পাসওয়ার্ড" type="password" autoComplete="new-password" placeholder="••••••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
              </Field>
              {error ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                  {error}
                </p>
              ) : null}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "তৈরি হচ্ছে…" : "অ্যাডমিন অ্যাকাউন্ট তৈরি করুন"}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => { setShowSetup(false); setError(null); }}>
                সাইন ইনে ফিরে যান
              </Button>
            </form>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <Field label="ইমেইল" required>
                <TextInput aria-label="ইমেইল" type="email" autoComplete="email" placeholder="you@thebdtoday.online" value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
              <Field label="পাসওয়ার্ড" required>
                <TextInput aria-label="পাসওয়ার্ড" type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
              </Field>
              {setupDone ? (
                <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800" role="status">
                  অ্যাডমিন অ্যাকাউন্ট তৈরি হয়েছে — এখন সেটা দিয়ে সাইন ইন করুন।
                </p>
              ) : null}
              {error ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                  {error}
                </p>
              ) : null}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "সাইন ইন হচ্ছে…" : "সাইন ইন"}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => { setShowSetup(true); setError(null); }}>
                প্রথমবার? প্রথম অ্যাডমিন সেট আপ করুন
              </Button>
            </form>
          )}
        </Card>

        <p className="mt-5 text-center text-sm">
          <Link to="/" className="font-medium text-[#c1121f] hover:underline">
            ← সাইটে ফিরে যান
          </Link>
        </p>
        <p className="mt-2 text-center text-xs text-slate-400">
          সেশন কুকি-ভিত্তিক এবং প্রতিটি অ্যাডমিন পৃষ্ঠায় যাচাই করা হয়।
        </p>
      </div>
    </div>
  );
}

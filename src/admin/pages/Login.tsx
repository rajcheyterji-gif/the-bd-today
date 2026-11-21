import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight, Eye, EyeOff, KeyRound, Lock, Mail, User } from "lucide-react";
import { adminApi } from "../lib/adminApi";
import { useToast } from "../components/Toast";
import { useAuth } from "../hooks/useAuth";

/** Sign-in (cookie session). On a fresh install the page offers the
 *  one-time first-admin setup instead — it needs the ADMIN_INIT_TOKEN
 *  and a password of at least 12 characters, and it does NOT sign in:
 *  after setup, sign in with the new account.
 *
 *  Deliberately neutral copy: this page is reachable by anyone, so
 *  nothing on it says it is an admin panel — just the site logo, an
 *  email field, a password field and a sign-in button.
 *
 *  Visual style (user's reference, 2026-11-21): soft pink gradient
 *  backdrop with blurred rose blobs, a white rounded card, pill
 *  inputs with leading icons, and a red-gradient pill button. All
 *  fields and behaviour are unchanged — only the styling is new, and
 *  it is local to this page (the rest of the dashboard keeps its own
 *  shared UI components). */

const inputWrap =
  "flex items-center gap-2.5 rounded-full border border-rose-100 bg-white px-4 py-3 shadow-[0_2px_10px_rgba(225,17,43,0.04)] transition focus-within:border-rose-300 focus-within:ring-2 focus-within:ring-rose-200";
const inputCls =
  "min-w-0 flex-1 bg-transparent text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none";
const labelCls = "mb-1.5 block text-sm font-semibold text-slate-800";
const hintCls = "mt-1 text-xs text-slate-400";
const primaryBtn =
  "flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ff4157] to-[#e0112b] px-6 py-3.5 text-[15px] font-bold text-white shadow-[0_10px_24px_rgba(225,17,43,0.35)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";
const ghostBtn =
  "w-full rounded-full px-6 py-2.5 text-sm font-semibold text-[#e0112b] transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300";

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
  const [showPassword, setShowPassword] = useState(false);

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
      toast.success("Account created — now sign in with it.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "সেটআপ ব্যর্থ হয়েছে।");
    } finally {
      setBusy(false);
    }
  };

  const errorBox = error ? (
    <p className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
      <span>{error}</span>
    </p>
  ) : null;

  const passwordField = (autoComplete: string, placeholder: string) => (
    <div>
      <label htmlFor="login-password" className={labelCls}>
        পাসওয়ার্ড <span className="text-[#e0112b]">*</span>
      </label>
      <div className={inputWrap}>
        <Lock size={18} className="shrink-0 text-rose-300" aria-hidden="true" />
        <input
          id="login-password"
          aria-label="পাসওয়ার্ড"
          type={showPassword ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputCls}
        />
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          aria-label={showPassword ? "পাসওয়ার্ড লুকান" : "পাসওয়ার্ড দেখান"}
          className="shrink-0 rounded-full p-1 text-slate-400 transition hover:text-[#e0112b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );

  const emailField = (
    <div>
      <label htmlFor="login-email" className={labelCls}>
        ইমেইল <span className="text-[#e0112b]">*</span>
      </label>
      <div className={inputWrap}>
        <Mail size={18} className="shrink-0 text-rose-300" aria-hidden="true" />
        <input
          id="login-email"
          aria-label="ইমেইল"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@thebdtoday.online"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputCls}
        />
      </div>
    </div>
  );

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#ffe3e9] via-[#fff2f4] to-white px-4 py-10">
      {/* Soft rose blobs, like the reference backdrop */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-rose-200/50 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-rose-300/40 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute right-[12%] top-[18%] h-24 w-24 rounded-full bg-rose-200/40 blur-2xl" aria-hidden="true" />

      <div className="relative w-full max-w-md">
        {/* Newspaper brand — the same Bengali wordmark as the public
            header (/logo.png), not the old English text logo */}
        <div className="mb-5 text-center">
          <Link to="/" className="inline-block" aria-label="দ্য বিডি টুডে — সাইটে ফিরে যান">
            <img src="/logo.png" alt="দ্য বিডি টুডে" className="mx-auto h-14 w-auto" />
          </Link>
          <p className="mt-1.5 font-bengali text-sm text-slate-500">দ্য বিডি টুডে — সত্য, সবার আগে</p>
        </div>

        <div className="mb-5 text-center">
          <h1 className="font-bengali text-[26px] font-bold leading-snug text-slate-900">
            {showSetup ? (
              <>
                প্রথম <span className="text-[#e0112b]">অ্যাকাউন্ট</span> তৈরি করুন
              </>
            ) : (
              <>
                আবার <span className="text-[#e0112b]">স্বাগতম!</span>
              </>
            )}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {showSetup
              ? "এখনো কোনো অ্যাকাউন্ট নেই — ইনিট টোকেন দিয়ে প্রথম অ্যাকাউন্ট তৈরি করুন।"
              : "চালিয়ে যেতে আপনার ইমেইল ও পাসওয়ার্ড দিন।"}
          </p>
        </div>

        <div className="rounded-[28px] bg-white p-6 shadow-[0_24px_60px_rgba(225,17,43,0.12)] ring-1 ring-rose-100 sm:p-7">
          {showSetup ? (
            <form onSubmit={setup} className="space-y-4">
              <div>
                <label htmlFor="login-token" className={labelCls}>
                  ইনিট টোকেন <span className="text-[#e0112b]">*</span>
                </label>
                <div className={inputWrap}>
                  <KeyRound size={18} className="shrink-0 text-rose-300" aria-hidden="true" />
                  <input
                    id="login-token"
                    aria-label="ইনিট টোকেন"
                    autoComplete="off"
                    placeholder="ইনিট টোকেন"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <p className={hintCls}>সার্ভারে আগে থেকে দেওয়া গোপন টোকেনটি দিন।</p>
              </div>
              <div>
                <label htmlFor="login-name" className={labelCls}>
                  আপনার নাম <span className="text-[#e0112b]">*</span>
                </label>
                <div className={inputWrap}>
                  <User size={18} className="shrink-0 text-rose-300" aria-hidden="true" />
                  <input
                    id="login-name"
                    aria-label="আপনার নাম"
                    autoComplete="name"
                    placeholder="আপনার নাম"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
              {emailField}
              <div>
                {passwordField("new-password", "••••••••••••")}
                <p className={hintCls}>কমপক্ষে ১২ অক্ষর।</p>
              </div>
              {errorBox}
              <button type="submit" className={primaryBtn} disabled={busy}>
                {busy ? "তৈরি হচ্ছে…" : "অ্যাকাউন্ট তৈরি করুন"}
                {!busy && <ArrowRight size={18} aria-hidden="true" />}
              </button>
              <button type="button" className={ghostBtn} onClick={() => { setShowSetup(false); setError(null); }}>
                সাইন ইনে ফিরে যান
              </button>
            </form>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              {emailField}
              {passwordField("current-password", "••••••••")}
              {setupDone ? (
                <p className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800" role="status">
                  অ্যাকাউন্ট তৈরি হয়েছে — এখন সেটা দিয়ে সাইন ইন করুন।
                </p>
              ) : null}
              {errorBox}
              <button type="submit" className={primaryBtn} disabled={busy}>
                {busy ? "সাইন ইন হচ্ছে…" : "সাইন ইন"}
                {!busy && <ArrowRight size={18} aria-hidden="true" />}
              </button>
              <button type="button" className={ghostBtn} onClick={() => { setShowSetup(true); setError(null); }}>
                প্রথমবার? প্রথম অ্যাকাউন্ট সেট আপ করুন
              </button>
            </form>
          )}
        </div>

        <p className="mt-5 text-center text-sm">
          <Link to="/" className="font-medium text-[#e0112b] hover:underline">
            ← সাইটে ফিরে যান
          </Link>
        </p>
        <p className="mt-2 text-center text-xs text-slate-400">
          সেশন কুকি-ভিত্তিক এবং প্রতিটি পৃষ্ঠায় যাচাই করা হয়।
        </p>
      </div>
    </div>
  );
}

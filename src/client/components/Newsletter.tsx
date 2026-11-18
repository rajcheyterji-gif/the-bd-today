import { useState, type FormEvent } from "react";
import { Check, Mail, Send } from "lucide-react";
import { publicApi } from "../lib/api";

/** Newsletter signup: POST /api/v1/newsletter; honest success/error states. */
export function Newsletter({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!value || pending) return;
    setPending(true);
    setError(false);
    try {
      const res = await publicApi.subscribeNewsletter(value);
      setDone(
        res.already_subscribed
          ? "You are already subscribed — thank you."
          : "Thank you! You are subscribed to THE BD TODAY.",
      );
      setEmail("");
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  };

  if (done) {
    return (
      <div className="border border-green-300 bg-green-50 p-5 text-center">
        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-green-600 text-white">
          <Check size={20} />
        </span>
        <p className="mt-2 text-sm font-medium text-green-900">{done}</p>
      </div>
    );
  }

  if (compact) {
    return (
      <section aria-label="Newsletter" className="border border-slate-200 bg-[#f6f6f6] p-5">
        <h3 className="flex items-center gap-2 font-serif text-lg font-black text-slate-900">
          <Mail size={18} className="text-[#c1121f]" /> Newsletter
        </h3>
        <p className="mt-1 text-sm text-slate-600">The day&apos;s top stories in your inbox, every morning.</p>
        <form className="mt-3 flex flex-col gap-2" onSubmit={submit}>
          <label htmlFor="newsletter-email-compact" className="sr-only">Email address</label>
          <input
            id="newsletter-email-compact"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email address"
            className="border border-slate-300 px-3 py-2 text-sm focus:border-[#c1121f] focus:outline-none"
          />
          <button
            type="submit"
            disabled={pending}
            className="bg-[#c1121f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#9e0e19] disabled:opacity-60"
          >
            {pending ? "Subscribing…" : "Subscribe"}
          </button>
          {error && (
            <p className="text-xs text-red-700">Could not subscribe. Please check the address and try again.</p>
          )}
        </form>
      </section>
    );
  }

  return (
    <section aria-label="Newsletter" className="border-y border-slate-200 bg-[#f6f6f6] px-6 py-10 text-center">
      <h2 className="font-serif text-2xl font-black text-slate-900 sm:text-3xl">Never miss a story</h2>
      <p className="mt-1 font-bengali text-slate-600">প্রতিদিনের গুরুত্বপূর্ণ খবর আপনার ইনবক্সে</p>
      <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600">
        Join thousands of readers getting the day&apos;s top Bangladesh and world stories every morning. Free, no spam.
      </p>
      <form className="mx-auto mt-5 flex max-w-md flex-col gap-2 sm:flex-row" onSubmit={submit}>
        <label htmlFor="newsletter-email" className="sr-only">Email address</label>
        <input
          id="newsletter-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email address"
          className="min-w-0 flex-1 border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-[#c1121f] focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 bg-[#c1121f] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#9e0e19] disabled:opacity-60"
        >
          <Send size={16} /> {pending ? "Subscribing…" : "Subscribe"}
        </button>
      </form>
      {error && (
        <p className="mt-3 text-sm text-red-700">Could not subscribe. Please check the address and try again.</p>
      )}
      <p className="mt-3 text-xs text-slate-500">We respect your privacy. Unsubscribe anytime.</p>
    </section>
  );
}

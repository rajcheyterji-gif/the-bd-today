import { useState, type FormEvent } from "react";
import { Check, Mail, MapPin } from "lucide-react";
import { Seo } from "../components/Seo";
import { Breadcrumbs } from "../components/Breadcrumbs";

// No /api/v1/contact endpoint exists on the server, so the form opens the
// reader's email app addressed to the newsroom (a real send, not a fake
// submit) and shows a local success state. If a contact endpoint is added
// later, this form should POST to it instead.
const NEWSROOM_EMAIL = "news@thebdtoday.com";

export function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("News tip");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const mailto =
      `mailto:${NEWSROOM_EMAIL}?subject=${encodeURIComponent(`[THE BD TODAY] ${subject} — ${name}`)}` +
      `&body=${encodeURIComponent(`${message}\n\n— ${name} (${email})`)}`;
    window.location.href = mailto;
    setSent(true);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Seo title="Contact Us" description="Contact THE BD TODAY newsroom — tips, feedback and enquiries." />
      <Breadcrumbs items={[{ label: "Contact Us" }]} />
      <h1 className="mt-4 font-serif text-3xl font-black text-slate-900 sm:text-4xl">Contact Us</h1>
      <p className="mt-2 text-slate-600">
        News tips, corrections, feedback or partnership enquiries — every message is read by an editor.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="flex items-start gap-3 rounded border border-slate-200 p-4">
          <Mail size={20} className="mt-0.5 shrink-0 text-[#c1121f]" />
          <div>
            <p className="font-semibold text-slate-900">Email the newsroom</p>
            <a href={`mailto:${NEWSROOM_EMAIL}`} className="text-sm text-[#c1121f] hover:underline">{NEWSROOM_EMAIL}</a>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded border border-slate-200 p-4">
          <MapPin size={20} className="mt-0.5 shrink-0 text-[#c1121f]" />
          <div>
            <p className="font-semibold text-slate-900">Office</p>
            <p className="text-sm text-slate-600">Dhaka, Bangladesh</p>
          </div>
        </div>
      </div>

      {sent ? (
        <div className="mt-8 rounded border border-green-200 bg-green-50 p-6 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-green-600 text-white">
            <Check size={22} />
          </span>
          <h2 className="mt-3 font-serif text-xl font-bold text-green-900">Your email app should now be open</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-green-800">
            We addressed your message to the newsroom ({NEWSROOM_EMAIL}). Just press send in your
            email app — and if it did not open, you can write to us directly at that address.
          </p>
          <button
            type="button"
            onClick={() => setSent(false)}
            className="mt-4 rounded border border-green-700 px-4 py-2 text-sm font-semibold text-green-800 hover:bg-green-100"
          >
            Write another message
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-8 flex flex-col gap-4 rounded border border-slate-200 p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="contact-name" className="text-sm font-medium text-slate-700">Your name *</label>
              <input
                id="contact-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-[#c1121f] focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="contact-email" className="text-sm font-medium text-slate-700">Your email *</label>
              <input
                id="contact-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-[#c1121f] focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label htmlFor="contact-subject" className="text-sm font-medium text-slate-700">Subject *</label>
            <select
              id="contact-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#c1121f] focus:outline-none"
            >
              <option>News tip</option>
              <option>Correction</option>
              <option>Feedback</option>
              <option>Advertising / partnership</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label htmlFor="contact-message" className="text-sm font-medium text-slate-700">Message *</label>
            <textarea
              id="contact-message"
              required
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what happened, where and when — links and details help our editors verify quickly."
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-[#c1121f] focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="self-start rounded bg-[#c1121f] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#9e0e19]"
          >
            Send message
          </button>
          <p className="text-xs text-slate-500">
            Sending opens your email app with the message addressed to the newsroom. We never share your details.
          </p>
        </form>
      )}
    </div>
  );
}

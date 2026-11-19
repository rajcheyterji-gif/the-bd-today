import { Seo } from "../components/Seo";

export function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Seo title="Privacy Policy" description="Privacy Policy — THE BD TODAY." />
      <h1 className="mt-4 font-serif text-3xl font-black text-slate-900 sm:text-4xl">Privacy Policy</h1>
      <p className="mt-2 text-sm text-slate-500">Last updated: 18 November 2026</p>
      <div className="article-body mt-6">
        <p>
          THE BD TODAY respects your privacy. This policy explains what information we collect
          when you read our journalism, subscribe to our newsletter, or leave a comment — and
          what we do with it.
        </p>
        <h2>Information we collect</h2>
        <ul>
          <li><strong>Newsletter subscriptions:</strong> your email address, used only to send the newsletter you asked for.</li>
          <li><strong>Comments:</strong> the name, email address and comment text you submit. Comments are moderated before publication; email addresses are never published.</li>
          <li><strong>Reading:</strong> article view counts, collected in aggregate to understand which stories readers value. We do not build personal reading profiles.</li>
          <li><strong>Contact messages:</strong> the details you send us, used only to respond to you.</li>
        </ul>
        <h2>How we use it</h2>
        <p>
          We use your information only for the purpose you provided it: sending the newsletter,
          publishing and moderating comments, responding to messages, and improving our journalism.
          We do not sell, rent or trade your personal information.
        </p>
        <h2>Cookies and analytics</h2>
        <p>
          We use only the minimum technical storage needed for the site to work. If analytics are
          added in future, this policy will be updated and the tools will be configured to respect
          your browser&apos;s privacy settings.
        </p>
        <h2>Your rights</h2>
        <p>
          You may ask us at any time to stop sending the newsletter (every email includes an
          unsubscribe option), to correct your details, or to delete your subscription or comment.
          Write to <a href="mailto:news@thebdtoday.com">news@thebdtoday.com</a> and we will act promptly.
        </p>
        <h2>Changes</h2>
        <p>
          If this policy changes, we will update the date above and note the change here.
        </p>
      </div>
    </div>
  );
}

import { Seo } from "../components/Seo";

export function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Seo title="Terms of Use" description="Terms of Use — THE BD TODAY." />
      <h1 className="mt-4 font-serif text-3xl font-black text-slate-900 sm:text-4xl">Terms of Use</h1>
      <p className="mt-2 text-sm text-slate-500">Last updated: 18 November 2026</p>
      <div className="article-body mt-6">
        <p>
          By using THE BD TODAY you agree to these terms. If you do not agree, please do not use the site.
        </p>
        <h2>Our content</h2>
        <p>
          All articles, photographs, graphics and other content on this site belong to THE BD TODAY
          or its licensors and are protected by copyright. You may read, share links to, and quote
          short extracts for fair purposes with attribution. You may not reproduce, republish or
          commercially reuse substantial parts of our content without written permission.
        </p>
        <h2>Accuracy</h2>
        <p>
          We work hard to publish accurate journalism and we correct errors promptly and openly.
          News is, by nature, developing: breaking stories may be updated as facts are confirmed.
          The publication time shown on each story is when it was first published; updates are noted.
        </p>
        <h2>Your comments</h2>
        <p>
          Comments are moderated. By submitting a comment you confirm it is your own work, is lawful,
          and does not harass, defame or mislead. We may edit or remove comments that breach these
          standards, and we may remove commenting privileges for repeated breaches.
        </p>
        <h2>Acceptable use</h2>
        <p>
          You agree not to misuse the site — including attempting to disrupt it, scrape it at a rate
          that harms other readers, impersonate others, or submit unlawful material.
        </p>
        <h2>Links to other sites</h2>
        <p>
          Our stories may link to other websites for context. We are not responsible for their content
          or privacy practices.
        </p>
        <h2>Liability</h2>
        <p>
          The site is provided on an &quot;as is&quot; basis. To the extent permitted by law, we are not
          liable for any loss arising from use of the site or reliance on its content.
        </p>
        <h2>Changes</h2>
        <p>
          We may update these terms from time to time; the updated date above will change. Continued
          use of the site after a change means you accept the updated terms.
        </p>
        <h2>Contact</h2>
        <p>
          Questions about these terms: <a href="mailto:news@thebdtoday.com">news@thebdtoday.com</a>.
        </p>
      </div>
    </div>
  );
}

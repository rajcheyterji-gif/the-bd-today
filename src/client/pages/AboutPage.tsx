import { Link } from "react-router-dom";
import { Seo } from "../components/Seo";
import { Newsletter } from "../components/Newsletter";

export function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Seo title="About Us" description="About THE BD TODAY — independent journalism from Bangladesh." />
      <h1 className="mt-4 font-serif text-3xl font-black text-slate-900 sm:text-4xl">About THE BD TODAY</h1>
      <p className="mt-2 font-bengali text-lg text-slate-600">দ্য বিডি টুডে — সত্য, সবার আগে</p>
      <div className="article-body mt-6">
        <p>
          THE BD TODAY is an independent digital news organisation based in Dhaka, Bangladesh.
          We cover the stories that matter to Bangladeshis — national affairs, politics, the
          economy, sports, technology, education, entertainment and the wider world — with
          accuracy, fairness and independence.
        </p>
        <h2>What we stand for</h2>
        <ul>
          <li><strong>Accuracy first.</strong> We verify before we publish, and we correct openly when we get something wrong.</li>
          <li><strong>Independence.</strong> Our reporting is not beholden to any party, business or interest group.</li>
          <li><strong>Public service.</strong> Journalism exists to inform citizens and hold power to account.</li>
          <li><strong>Language for everyone.</strong> We publish in Bengali and English so news reaches every reader.</li>
        </ul>
        <h2>Our newsroom</h2>
        <p>
          Our reporters and editors work from Dhaka and correspondents across the country.
          Every story is checked by an editor before publication, and breaking news is updated
          as facts are confirmed — never before.
        </p>
        <h2>Corrections</h2>
        <p>
          If you spot an error in anything we publish, please write to{" "}
          <a href="mailto:news@thebdtoday.com">news@thebdtoday.com</a>. We review every
          correction request and publish corrections promptly and transparently.
        </p>
        <h2>Contact</h2>
        <p>
          News tips, feedback and partnership enquiries: see our{" "}
          <Link to="/contact">contact page</Link>.
        </p>
      </div>
      <div className="mt-10">
        <Newsletter />
      </div>
    </div>
  );
}

import { Link } from "react-router-dom";
import { Facebook, Instagram, Twitter, Youtube } from "lucide-react";
import { useSiteData } from "../hooks/useCategories";
import { toBengaliDigits } from "../lib/format";
import { Logo } from "./Logo";

/** Translates stored navigation hrefs (page:x, category:slug, collection:flag, /path, full URL) into real links. */
export function resolveNavHref(raw: string): string {
  if (!raw) return "/";
  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("mailto:")) return raw;
  if (raw.startsWith("page:")) return `/${raw.slice(5)}`;
  if (raw.startsWith("category:")) return `/category/${raw.slice(9)}`;
  if (raw.startsWith("collection:")) {
    const flag = raw.slice(11);
    if (flag === "mostread") return "/latest";
    return `/${flag}`;
  }
  if (raw.startsWith("/")) return raw;
  return `/${raw}`;
}

/**
 * Centered newspaper footer (screenshot 2): logo lockup with tagline,
 * centered link rows, premium round social icons, legal links
 * with dot separators, editor credit and the Bengali copyright line.
 */
export function Footer() {
  const { data } = useSiteData();
  const categories = data?.data?.categories ?? [];

  return (
    <footer className="mt-8 border-t border-[#0f172a] bg-[#0f172a] text-slate-300">
      <div className="mx-auto max-w-[1280px] px-4 pb-8 pt-7 text-center">
        {/* Logo lockup with tagline — the JPEG wordmark sits on a white
            pill so it reads cleanly on the navy band */}
        <Link to="/" className="inline-block rounded-lg bg-white px-4 py-2" aria-label="THE BD TODAY — home">
          <Logo
            markClassName="h-12 w-auto sm:h-14"
            wordmarkClassName="text-[28px] sm:text-3xl"
            tagline="দ্য বিডি টুডে — সত্য, সবার আগে"
            taglineClassName="text-sm"
            center
          />
        </Link>

        {/* Link row 1: categories */}
        <nav aria-label="Footer categories" className="mt-5 border-y border-white/15 py-3">
          <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 font-serif text-[17px] font-medium">
            {categories.map((c) => (
              <li key={c.id}>
                <Link to={`/category/${c.slug}`} className="text-white hover:text-[#c1121f]">
                  {c.name_bn ?? c.name_en}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Link row 2: site pages */}
        <nav aria-label="Footer pages" className="mt-3">
          <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 font-serif text-[17px]">
            <li><Link to="/latest" className="hover:text-[#c1121f]">সর্বশেষ</Link></li>
            <li><Link to="/breaking" className="hover:text-[#c1121f]">ব্রেকিং</Link></li>
            <li><Link to="/about" className="hover:text-[#c1121f]">আমাদের সম্পর্কে</Link></li>
            <li><Link to="/contact" className="hover:text-[#c1121f]">যোগাযোগ</Link></li>
            <li><Link to="/privacy" className="hover:text-[#c1121f]">গোপনীয়তা নীতি</Link></li>
            <li><Link to="/terms" className="hover:text-[#c1121f]">শর্তাবলি</Link></li>
          </ul>
        </nav>

        {/* Follow — premium round social icons */}
        <p className="mt-6 font-serif text-[17px] font-bold text-white">অনুসরণ করুন</p>
        <div className="mt-3 flex items-center justify-center gap-3">
          <a
            href="https://www.facebook.com"
            target="_blank"
            rel="noreferrer"
            aria-label="Facebook"
            className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#1877f2] text-white shadow-md shadow-slate-900/15 ring-1 ring-black/10 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c1121f] focus-visible:ring-offset-2"
          >
            <Facebook size={22} />
          </a>
          <a
            href="https://www.x.com"
            target="_blank"
            rel="noreferrer"
            aria-label="X (Twitter)"
            className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-neutral-900 text-white shadow-md shadow-slate-900/15 ring-1 ring-black/10 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c1121f] focus-visible:ring-offset-2"
          >
            <Twitter size={22} />
          </a>
          <a
            href="https://www.instagram.com"
            target="_blank"
            rel="noreferrer"
            aria-label="Instagram"
            className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-gradient-to-tr from-[#feda75] via-[#d62976] to-[#4f5bd5] text-white shadow-md shadow-slate-900/15 ring-1 ring-black/10 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c1121f] focus-visible:ring-offset-2"
          >
            <Instagram size={22} />
          </a>
          <a
            href="https://www.youtube.com"
            target="_blank"
            rel="noreferrer"
            aria-label="YouTube"
            className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#ff0000] text-white shadow-md shadow-slate-900/15 ring-1 ring-black/10 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c1121f] focus-visible:ring-offset-2"
          >
            <Youtube size={22} />
          </a>
          <a
            href="https://news.google.com"
            target="_blank"
            rel="noreferrer"
            aria-label="Google News"
            className="flex h-[52px] w-[52px] items-center justify-center rounded-full border border-slate-200 bg-white font-serif text-2xl font-black text-[#4285f4] shadow-md shadow-slate-900/10 ring-1 ring-black/5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c1121f] focus-visible:ring-offset-2"
          >
            G
          </a>
        </div>

        {/* Legal links with dot separators */}
        <nav aria-label="Footer legal" className="mt-7">
          <ul className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 font-serif text-[15px]">
            {[
              { label: "আমাদের সম্পর্কে", href: "/about" },
              { label: "বিজ্ঞাপন", href: "/contact" },
              { label: "সার্কুলেশন", href: "/about" },
              { label: "নীতি ও শর্ত", href: "/terms" },
              { label: "যোগাযোগ", href: "/contact" },
              { label: "নিউজলেটার", href: "/latest" },
            ].map((item, i, arr) => (
              <li key={item.label} className="flex items-center gap-2">
                <Link to={item.href} className="hover:text-[#c1121f]">
                  {item.label}
                </Link>
                {i < arr.length - 1 && <span className="text-slate-500" aria-hidden="true">•</span>}
              </li>
            ))}
          </ul>
        </nav>

        {/* Editor credit + copyright */}
        <p className="mt-5 text-[13px] text-slate-400">সম্পাদক ও প্রকাশক: দ্য বিডি টুডে</p>
        <p className="mt-1 text-xs text-slate-400">
          স্বত্ব © {toBengaliDigits(new Date().getFullYear())} দ্য বিডি টুডে
        </p>
      </div>
    </footer>
  );
}

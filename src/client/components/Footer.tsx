import { Link } from "react-router-dom";
import { Apple, Facebook, Instagram, Play, Twitter, Youtube } from "lucide-react";
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
 * centered link rows, round social icons, app-store badges, legal links
 * with dot separators, editor credit and the Bengali copyright line.
 */
export function Footer() {
  const { data } = useSiteData();
  const categories = data?.data?.categories ?? [];

  return (
    <footer className="mt-8 border-t-[3px] border-slate-800 bg-white text-slate-600">
      <div className="mx-auto max-w-[1280px] px-4 pb-8 pt-7 text-center">
        {/* Logo lockup with tagline */}
        <Link to="/" className="inline-block" aria-label="THE BD TODAY — home">
          <Logo
            markClassName="h-10 w-auto sm:h-12"
            wordmarkClassName="text-[28px] sm:text-3xl"
            tagline="দ্য বিডি টুডে — সত্য, সবার আগে"
            taglineClassName="text-sm"
            center
          />
        </Link>

        {/* Link row 1: categories */}
        <nav aria-label="Footer categories" className="mt-5 border-y border-slate-200 py-3">
          <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[15px] font-medium">
            {categories.map((c) => (
              <li key={c.id}>
                <Link to={`/category/${c.slug}`} className="text-slate-800 hover:text-[#c1121f]">
                  {c.name_bn ?? c.name_en}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Link row 2: site pages */}
        <nav aria-label="Footer pages" className="mt-3">
          <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
            <li><Link to="/latest" className="hover:text-[#c1121f]">সর্বশেষ</Link></li>
            <li><Link to="/breaking" className="hover:text-[#c1121f]">ব্রেকিং</Link></li>
            <li><Link to="/about" className="hover:text-[#c1121f]">আমাদের সম্পর্কে</Link></li>
            <li><Link to="/contact" className="hover:text-[#c1121f]">যোগাযোগ</Link></li>
            <li><Link to="/privacy" className="hover:text-[#c1121f]">গোপনীয়তা নীতি</Link></li>
            <li><Link to="/terms" className="hover:text-[#c1121f]">শর্তাবলি</Link></li>
          </ul>
        </nav>

        {/* Follow */}
        <p className="mt-6 font-bengali text-sm font-bold text-slate-900">অনুসরণ করুন</p>
        <div className="mt-3 flex items-center justify-center gap-3">
          <a
            href="https://www.facebook.com"
            target="_blank"
            rel="noreferrer"
            aria-label="Facebook"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1877f2] text-white transition-transform hover:scale-105"
          >
            <Facebook size={18} />
          </a>
          <a
            href="https://www.x.com"
            target="_blank"
            rel="noreferrer"
            aria-label="X (Twitter)"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white transition-transform hover:scale-105"
          >
            <Twitter size={18} />
          </a>
          <a
            href="https://www.instagram.com"
            target="_blank"
            rel="noreferrer"
            aria-label="Instagram"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white transition-transform hover:scale-105"
          >
            <Instagram size={18} />
          </a>
          <a
            href="https://www.youtube.com"
            target="_blank"
            rel="noreferrer"
            aria-label="YouTube"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ff0000] text-white transition-transform hover:scale-105"
          >
            <Youtube size={18} />
          </a>
          <a
            href="https://news.google.com"
            target="_blank"
            rel="noreferrer"
            aria-label="Google News"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white font-serif text-lg font-black text-[#4285f4] transition-transform hover:scale-105"
          >
            G
          </a>
        </div>

        {/* App badges */}
        <p className="mt-6 font-bengali text-sm font-bold text-slate-900">মোবাইল অ্যাপস ডাউনলোড করুন</p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
          <a
            href="https://play.google.com/store"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-md bg-slate-900 px-3.5 py-2 text-left text-white hover:bg-slate-700"
          >
            <Play size={22} className="shrink-0" />
            <span className="leading-tight">
              <span className="block text-[10px] uppercase tracking-wide text-white/70">Get it on</span>
              <span className="block text-sm font-semibold">Google Play</span>
            </span>
          </a>
          <a
            href="https://www.apple.com/app-store/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-md bg-slate-900 px-3.5 py-2 text-left text-white hover:bg-slate-700"
          >
            <Apple size={22} className="shrink-0" />
            <span className="leading-tight">
              <span className="block text-[10px] uppercase tracking-wide text-white/70">Download on the</span>
              <span className="block text-sm font-semibold">App Store</span>
            </span>
          </a>
        </div>

        {/* Legal links with dot separators */}
        <nav aria-label="Footer legal" className="mt-7">
          <ul className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[13px]">
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
                {i < arr.length - 1 && <span className="text-slate-300" aria-hidden="true">•</span>}
              </li>
            ))}
          </ul>
        </nav>

        {/* Editor credit + copyright */}
        <p className="mt-5 text-[13px] text-slate-600">সম্পাদক ও প্রকাশক: দ্য বিডি টুডে</p>
        <p className="mt-1 text-xs text-slate-500">
          স্বত্ব © {toBengaliDigits(new Date().getFullYear())} দ্য বিডি টুডে
        </p>
      </div>
    </footer>
  );
}

import { Link } from "react-router-dom";
import { Facebook, Mail, MapPin, Twitter } from "lucide-react";
import { useSiteData } from "../hooks/useCategories";

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

/** Site footer: brand, categories, company links, contact. All links from API where available. */
export function Footer() {
  const { data } = useSiteData();
  const categories = data?.data?.categories ?? [];
  const navigation = data?.data?.navigation ?? [];

  return (
    <footer className="mt-12 bg-[#0f172a] text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-serif text-2xl font-black tracking-tight text-white">
            THE BD <span className="text-[#ff4d5e]">TODAY</span>
          </p>
          <p className="mt-1 font-bengali text-sm text-slate-400">দ্য বিডি টুডে — সত্য, সবার আগে</p>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Independent journalism from Bangladesh — national affairs, politics, economy, sports,
            technology and the world, reported accurately and without fear or favour.
          </p>
          <div className="mt-4 flex gap-2">
            <a href="https://www.facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook" className="rounded-full bg-white/10 p-2 hover:bg-[#c1121f]">
              <Facebook size={16} />
            </a>
            <a href="https://www.x.com" target="_blank" rel="noreferrer" aria-label="X (Twitter)" className="rounded-full bg-white/10 p-2 hover:bg-[#c1121f]">
              <Twitter size={16} />
            </a>
            <a href="mailto:news@thebdtoday.com" aria-label="Email the newsroom" className="rounded-full bg-white/10 p-2 hover:bg-[#c1121f]">
              <Mail size={16} />
            </a>
          </div>
        </div>

        <nav aria-label="Footer categories">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">Sections</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {categories.length === 0 && (
              <li className="text-slate-500">Sections will appear once editors create them.</li>
            )}
            {categories.map((c) => (
              <li key={c.id}>
                <Link to={`/category/${c.slug}`} className="hover:text-white">
                  {c.name_en}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Footer company">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">Company</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/about" className="hover:text-white">About Us</Link></li>
            <li><Link to="/contact" className="hover:text-white">Contact</Link></li>
            <li><Link to="/privacy" className="hover:text-white">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-white">Terms of Use</Link></li>
            <li><Link to="/latest" className="hover:text-white">Latest News</Link></li>
            <li><Link to="/breaking" className="hover:text-white">Breaking News</Link></li>
            {navigation.map((n) => (
              <li key={n.id}>
                {resolveNavHref(n.url).startsWith("http") || resolveNavHref(n.url).startsWith("mailto:") ? (
                  <a href={resolveNavHref(n.url)} className="hover:text-white">
                    {n.label_bn ?? n.label}
                  </a>
                ) : (
                  <Link to={resolveNavHref(n.url)} className="hover:text-white">
                    {n.label_bn ?? n.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">Newsroom</h3>
          <ul className="mt-3 space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <MapPin size={16} className="mt-0.5 shrink-0" />
              <span>Dhaka, Bangladesh</span>
            </li>
            <li className="flex items-start gap-2">
              <Mail size={16} className="mt-0.5 shrink-0" />
              <a href="mailto:news@thebdtoday.com" className="hover:text-white">news@thebdtoday.com</a>
            </li>
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            Have a news tip? Write to the newsroom — every tip is read by an editor.
          </p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-slate-500 sm:flex-row">
          <p>© {new Date().getFullYear()} THE BD TODAY. All rights reserved.</p>
          <p>
            <Link to="/privacy" className="hover:text-white">Privacy</Link>
            <span className="mx-2">•</span>
            <Link to="/terms" className="hover:text-white">Terms</Link>
            <span className="mx-2">•</span>
            <Link to="/contact" className="hover:text-white">Contact</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}

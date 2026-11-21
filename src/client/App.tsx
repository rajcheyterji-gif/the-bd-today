// Public site shell: react-router-dom routing, global chrome (masthead,
// sticky category nav, footer) and the route table. All page data comes
// from the API via hooks — no hardcoded articles anywhere.
//
// The masthead + nav match the Prothom Alo mobile header screenshots:
// wordmark with search + Login, then the sticky category row. No date
// strip and no breaking ticker — the screenshots show the header bare.
//
// The admin CMS (src/admin/*) mounts chrome-free under /admin/* via a lazy
// import; that file is owned by a sibling agent.

import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { Route, Routes, useLocation, useNavigationType, useParams, useSearchParams } from "react-router-dom";
import { Masthead } from "./components/Masthead";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { ExchangeRates } from "./components/ExchangeRates";
import { Loading } from "./components/Loading";
import { HomePage } from "./pages/HomePage";

// HomePage stays eager — it is the first paint. Every other public page
// is a separate chunk, fetched only when its route is visited, so the
// first load does not download the code for all 12 pages. (The admin app
// was already lazy-loaded this way.)
const CategoryPage = lazy(() =>
  import("./pages/CategoryPage").then((m) => ({ default: m.CategoryPage })),
);
const ArticlePage = lazy(() =>
  import("./pages/ArticlePage").then((m) => ({ default: m.ArticlePage })),
);
const SearchPage = lazy(() =>
  import("./pages/SearchPage").then((m) => ({ default: m.SearchPage })),
);
const AuthorPage = lazy(() =>
  import("./pages/AuthorPage").then((m) => ({ default: m.AuthorPage })),
);
const AboutPage = lazy(() =>
  import("./pages/AboutPage").then((m) => ({ default: m.AboutPage })),
);
const ContactPage = lazy(() =>
  import("./pages/ContactPage").then((m) => ({ default: m.ContactPage })),
);
const PrivacyPage = lazy(() =>
  import("./pages/PrivacyPage").then((m) => ({ default: m.PrivacyPage })),
);
const TermsPage = lazy(() =>
  import("./pages/TermsPage").then((m) => ({ default: m.TermsPage })),
);
const NotFoundPage = lazy(() =>
  import("./pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })),
);
const BreakingPage = lazy(() =>
  import("./pages/BreakingPage").then((m) => ({ default: m.BreakingPage })),
);
const LatestPage = lazy(() =>
  import("./pages/LatestPage").then((m) => ({ default: m.LatestPage })),
);
const TagPage = lazy(() =>
  import("./pages/TagPage").then((m) => ({ default: m.TagPage })),
);

const AdminApp = lazy(() =>
  // NOTE: from src/client, "../admin" is src/admin; "../../admin" would
  // resolve to <repo-root>/admin, which does not exist.
  import("../admin/AdminApp").then((m) => ({ default: m.AdminApp })),
);

/**
 * Scroll handling on route changes.
 * - Forward navigation (PUSH/REPLACE): jump to the top of the new page.
 * - Browser back/forward (POP): restore the scroll position the reader
 *   left that page at, so "back" really goes back instead of dumping the
 *   reader at the top of the home page. The browser's own restoration is
 *   turned off so the two do not fight.
 */
function ScrollToTop() {
  const { pathname, search, key } = useLocation();
  const navType = useNavigationType();
  const positions = useRef(new Map<string, number>());

  useEffect(() => {
    window.history.scrollRestoration = "manual";
  }, []);

  // Remember the scroll position of the page being left.
  useEffect(() => {
    return () => {
      positions.current.set(key, window.scrollY);
    };
  }, [key]);

  useEffect(() => {
    if (navType === "POP") {
      const y = positions.current.get(key) ?? 0;
      // Content loads async; restore after paint and once more shortly
      // after, so the position survives the data arriving.
      requestAnimationFrame(() =>
        window.scrollTo({ top: y, behavior: "instant" as ScrollBehavior }),
      );
      const t = window.setTimeout(
        () => window.scrollTo({ top: y, behavior: "instant" as ScrollBehavior }),
        350,
      );
      return () => window.clearTimeout(t);
    }
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname, search, key, navType]);
  return null;
}

/**
 * Slim red top progress bar on route changes: a brief indeterminate
 * indicator that the next page is loading. Skips the first mount, and
 * never delays data — it is purely a visual cue, driven by a CSS
 * animation that restarts on every navigation (key change).
 */
function RouteProgress() {
  const { pathname, search } = useLocation();
  const [run, setRun] = useState(0);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setRun((n) => n + 1);
  }, [pathname, search]);
  if (run === 0) return null;
  return <div key={run} className="route-progress" aria-hidden="true" />;
}

function CategoryRoute() {
  const { slug = "" } = useParams();
  return <CategoryPage key={slug} slug={slug} />;
}

function ArticleRoute() {
  const { slug = "" } = useParams();
  return <ArticlePage key={slug} slug={slug} />;
}

function SearchRoute() {
  const [params] = useSearchParams();
  const q = params.get("q") ?? "";
  return <SearchPage key={q} initialQuery={q} />;
}

function AuthorRoute() {
  const { id = "" } = useParams();
  return <AuthorPage key={id} id={Number(id)} />;
}

function TagRoute() {
  const { slug = "" } = useParams();
  return <TagPage key={slug} slug={slug} />;
}

function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white font-sans text-[#0f172a] antialiased">
      {/* Sticky header block: masthead + category nav stay pinned; the
          masthead logo shrinks once the reader scrolls (see Masthead). */}
      <div className="sticky top-0 z-50 bg-white">
        <Masthead />
        <Navbar />
      </div>
      <main>{children}</main>
      {/* Exchange-rates strip: its own section above the footer, with
          breathing room (see ExchangeRates: my-10) — not flush against it. */}
      <ExchangeRates />
      <Footer />
    </div>
  );
}

export function App() {
  return (
    <>
      <ScrollToTop />
      <RouteProgress />
      <Routes>
        <Route
          path="/admin/*"
          element={
            <div>
              <Suspense fallback={<Loading label="Loading admin…" />}>
                <AdminApp />
              </Suspense>
            </div>
          }
        />
        <Route
          path="/*"
          element={
            <PublicLayout>
              <Suspense fallback={<Loading />}>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/category/:slug" element={<CategoryRoute />} />
                  <Route path="/article/:slug" element={<ArticleRoute />} />
                  <Route path="/search" element={<SearchRoute />} />
                  <Route path="/author/:id" element={<AuthorRoute />} />
                  <Route path="/tag/:slug" element={<TagRoute />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/contact" element={<ContactPage />} />
                  <Route path="/privacy" element={<PrivacyPage />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="/breaking" element={<BreakingPage />} />
                  <Route path="/latest" element={<LatestPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            </PublicLayout>
          }
        />
      </Routes>
    </>
  );
}

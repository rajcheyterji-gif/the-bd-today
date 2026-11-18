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

import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { Route, Routes, useLocation, useParams, useSearchParams } from "react-router-dom";
import { Masthead } from "./components/Masthead";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { Loading } from "./components/Loading";
import {
  ensureTranslateScript,
  getSiteLanguage,
  retranslateToEnglish,
} from "./lib/translate";
import { HomePage } from "./pages/HomePage";
import { CategoryPage } from "./pages/CategoryPage";
import { ArticlePage } from "./pages/ArticlePage";
import { SearchPage } from "./pages/SearchPage";
import { AuthorPage } from "./pages/AuthorPage";
import { AboutPage } from "./pages/AboutPage";
import { ContactPage } from "./pages/ContactPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { TermsPage } from "./pages/TermsPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { BreakingPage } from "./pages/BreakingPage";
import { LatestPage } from "./pages/LatestPage";
import { TagPage } from "./pages/TagPage";

const AdminApp = lazy(() =>
  // NOTE: from src/client, "../admin" is src/admin; "../../admin" would
  // resolve to <repo-root>/admin, which does not exist.
  import("../admin/AdminApp").then((m) => ({ default: m.AdminApp })),
);

function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname, search]);
  return null;
}

/**
 * Whole-site translation bootstrap (see lib/translate.ts). While the
 * reader is in English mode, load Google's translator on public pages
 * and re-trigger it after every route change, so freshly rendered
 * Bengali content gets translated too. The admin is never translated:
 * the script is skipped there and the admin root is wrapped in a
 * `notranslate` container below.
 */
function TranslateBootstrap() {
  const { pathname, search } = useLocation();
  const isAdmin = pathname.startsWith("/admin");
  useEffect(() => {
    if (isAdmin || getSiteLanguage() !== "en") return;
    let cancelled = false;
    void ensureTranslateScript().then(() => {
      if (cancelled) return;
      // Google auto-translates on load from the googtrans cookie; this
      // extra pass catches content React rendered after the widget did.
      window.setTimeout(() => {
        if (!cancelled) retranslateToEnglish();
      }, 300);
      window.setTimeout(() => {
        if (!cancelled) retranslateToEnglish();
      }, 900);
    });
    return () => {
      cancelled = true;
    };
  }, [pathname, search, isAdmin]);
  return null;
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
      <Masthead />
      <Navbar />
      <main>{children}</main>
      <Footer />
    </div>
  );
}

export function App() {
  return (
    <>
      <ScrollToTop />
      <TranslateBootstrap />
      <Routes>
        <Route
          path="/admin/*"
          element={
            <div className="notranslate" translate="no">
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
            </PublicLayout>
          }
        />
      </Routes>
    </>
  );
}

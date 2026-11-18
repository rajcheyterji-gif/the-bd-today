/**
 * Whole-site language switch via Google Translate.
 *
 * The Eng toggle in the navbar used to flip only the nav labels. The user
 * expects the ENTIRE page — headlines, articles, buttons, footer — to
 * become English. Article content lives in Bengali in the database, so
 * the only way to translate all of it client-side is Google Translate.
 *
 * How it works:
 * - Tapping Eng sets the `googtrans=/bn/en` cookie (+ a localStorage
 *   mirror for the toggle's own label) and reloads the page. On reload,
 *   the Google Translate script is loaded and translates the whole
 *   document from Bengali to English. Tapping বাংলা sets `/bn/bn` and
 *   reloads back to plain Bengali (the script is not loaded at all).
 * - The Google widget, its top banner, its "Powered by Google"
 *   attribution, its balloon popups and its loading spinner are all
 *   hidden with CSS in index.css — the Eng toggle is the only language
 *   control the reader ever sees.
 * - React Router navigations re-render fresh Bengali DOM, so after every
 *   route change (while English mode is on) we re-trigger translation
 *   through the hidden widget's language combo. Google also observes
 *   DOM mutations itself; the combo re-trigger is the belt to its
 *   suspenders.
 * - The admin (/admin/*) is never translated: the script is not loaded
 *   there, and the admin root is wrapped in a `notranslate` container.
 */

export type SiteLanguage = "bn" | "en";

const COOKIE_NAME = "googtrans";
const STORAGE_KEY = "bdt-site-lang";
const TRANSLATE_SCRIPT_URL =
  "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
const WIDGET_ID = "google_translate_element";

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: {
      translate?: {
        TranslateElement?: new (
          options: {
            pageLanguage: string;
            includedLanguages?: string;
            autoDisplay?: boolean;
          },
          element: string,
        ) => unknown;
      };
    };
  }
}

function readCookieLanguage(): SiteLanguage | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    /(?:^|;\s*)googtrans=\/bn\/(en|bn)(?:;|$)/,
  );
  return match ? (match[1] as SiteLanguage) : null;
}

/** Current site language: the googtrans cookie wins, localStorage is the fallback. */
export function getSiteLanguage(): SiteLanguage {
  const fromCookie = readCookieLanguage();
  if (fromCookie) return fromCookie;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "bn";
  } catch {
    return "bn";
  }
}

/** Hidden container the TranslateElement needs. Created on demand; CSS keeps it invisible. */
function getWidgetContainer(): HTMLElement {
  let el = document.getElementById(WIDGET_ID);
  if (!el) {
    el = document.createElement("div");
    el.id = WIDGET_ID;
    el.setAttribute("aria-hidden", "true");
    document.body.appendChild(el);
  }
  return el;
}

let scriptPromise: Promise<void> | null = null;

/**
 * Load Google's Translate element script (once) and initialise the hidden
 * widget. Resolves even if Google is unreachable, so the site never
 * blocks on the translator — worst case the page simply stays Bengali.
 */
export function ensureTranslateScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.translate?.TranslateElement) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve) => {
    let settled = false;
    const done = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };
    window.googleTranslateElementInit = () => {
      try {
        const TranslateElement = window.google?.translate?.TranslateElement;
        if (TranslateElement) {
          new TranslateElement(
            {
              pageLanguage: "bn",
              includedLanguages: "bn,en",
              autoDisplay: false,
            },
            WIDGET_ID,
          );
        }
      } catch {
        // Widget init failure must never break the page.
      }
      done();
    };
    getWidgetContainer();
    const script = document.createElement("script");
    script.src = TRANSLATE_SCRIPT_URL;
    script.async = true;
    script.onerror = done;
    document.head.appendChild(script);
    // Never wait forever: if the callback never fires, unblock callers.
    window.setTimeout(done, 8000);
  });
  return scriptPromise;
}

/**
 * Force the hidden widget to (re-)translate the current document to
 * English. Used after SPA route changes, when React has rendered fresh
 * Bengali nodes. No-op until the widget has initialised.
 */
export function retranslateToEnglish(): void {
  if (typeof document === "undefined") return;
  const combo = document.querySelector(".goog-te-combo") as HTMLSelectElement | null;
  if (!combo) return;
  try {
    combo.value = "en";
    combo.dispatchEvent(new Event("change", { bubbles: true }));
  } catch {
    // A missing/broken combo just means this pass is skipped.
  }
}

/**
 * Switch the whole site's language. Persists the choice in the googtrans
 * cookie (so it survives navigation and reloads) and reloads the page:
 * the reload is the reliable handoff — Google translates the freshly
 * loaded document from the cookie, and Bengali mode loads no Google
 * code at all.
 */
export function setSiteLanguage(lang: SiteLanguage): void {
  const value = `/bn/${lang}`;
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${60 * 60 * 24 * 365}`;
  try {
    window.localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Private mode etc. — the cookie alone is enough.
  }
  window.location.reload();
}

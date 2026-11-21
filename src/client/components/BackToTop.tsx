import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

/**
 * Floating "back to top" button, pinned bottom-right. Hidden until
 * the reader has scrolled well down the page (600px), then fades in.
 * Tapping smooth-scrolls to the top (instant jump when the reader
 * prefers reduced motion). 44px tap target, news-red accent.
 */
export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toTop = () => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  return (
    <button
      type="button"
      onClick={toTop}
      aria-label="উপরে যান"
      className={`fixed bottom-5 right-5 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-[#c1121f] text-white shadow-[0_4px_16px_rgba(193,18,31,0.35)] transition-all duration-300 hover:bg-[#a50f1a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c1121f] focus-visible:ring-offset-2 ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
      }`}
    >
      <ArrowUp size={22} strokeWidth={2.5} />
    </button>
  );
}

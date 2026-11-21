/**
 * THE BD TODAY — logo lockup (user-supplied artwork).
 *
 * The logo is the user's own design: a heavy black Bengali serif
 * wordmark "দ্য বিডি টুডে" with a red sun + black fountain-pen nib
 * mark on the left and a red/black swoosh underneath. It ships as a
 * transparent PNG (public/logo.png, 1903x403, 4.72:1 — the user's
 * horizontal logo artwork, used whole, background removed) and is rendered as an <img> so the artwork is used exactly
 * as designed. The square favicon (public/favicon.png, 512x512) is a
 * separate square version of the same mark with a black rounded border.
 *
 * Heights (mobile-first UI update, 2026-11-21): 36px on phones,
 * 44px from md (≥768px), 52px from lg (≥1024px); when the sticky
 * header is scrolled the masthead passes `scrolled` and the lockup
 * shrinks to 30px (36px md, 40px lg) with a smooth height transition.
 * width/height attributes carry the intrinsic 1903x403 size so the
 * browser reserves the right box before the PNG loads (no layout
 * shift). Callers may override the image height with `markClassName`
 * (the footer does: 48px / 56px). `wordmarkClassName` is accepted for
 * API compatibility only. The optional Bengali tagline still renders
 * under the image where a caller passes one (the footer).
 */

type LogoProps = {
  /** Image height classes; when omitted the header default applies. */
  markClassName?: string;
  /** Accepted for API compatibility; the wordmark is part of the image. */
  wordmarkClassName?: string;
  /** Bengali tagline under the image; omit where space is tight. */
  tagline?: string | null;
  /** Extra classes for the tagline line. */
  taglineClassName?: string;
  /** Center the tagline under the image (footer lockup). */
  center?: boolean;
  /** Extra classes for the lockup. */
  className?: string;
  /** Header scrolled state — shrinks the default lockup (ignored when markClassName is set). */
  scrolled?: boolean;
};

export function Logo({
  markClassName,
  tagline,
  taglineClassName = "text-[11px]",
  center = false,
  className,
  scrolled = false,
}: LogoProps) {
  return (
    <span className={`inline-flex flex-col ${center ? "items-center" : "items-start"} ${className ?? ""}`}>
      <img
        src="/logo.png"
        alt="THE BD TODAY"
        width={1903}
        height={403}
        className={
          markClassName ??
          (scrolled
            ? "h-[30px] w-auto max-w-full transition-[height] duration-200 md:h-9 lg:h-10"
            : "h-9 w-auto max-w-full transition-[height] duration-200 md:h-11 lg:h-[52px]")
        }
        draggable={false}
      />
      {tagline ? (
        <span
          className={`mt-1 font-bengali font-medium text-slate-500 ${taglineClassName}`}
        >
          {tagline}
        </span>
      ) : null}
    </span>
  );
}

/**
 * THE BD TODAY — logo lockup (user-supplied artwork).
 *
 * The logo is the user's own design: a black/red "BD" monogram with a red
 * swoosh, divider, "The BD Today" wordmark (BD in red) and a bar-chart +
 * red trending arrow. It ships as a JPEG (public/logo.jpg, tight-cropped
 * to the artwork: 1945x276, 7.05:1) and is rendered as an <img> so the
 * artwork is used exactly as designed.
 *
 * Heights: 48px on mobile, 64px from sm, 80px from md, 96px from lg.
 * Note the 7:1 aspect caps the mobile height: at 48px the lockup is
 * already ~338px wide, i.e. the full width of a 360px phone — it cannot
 * be taller on a phone without cropping the artwork, so the masthead
 * gives it a dedicated full-width row on small screens instead.
 *
 * The component keeps its old props/API so Masthead and Footer need no
 * changes: markClassName/wordmarkClassName are accepted but no longer
 * drive sizing (the image is one lockup now) — the image height is
 * 48px on mobile, 64px from sm, 80px from md and 96px from lg. The
 * optional Bengali tagline still renders under the image where a caller
 * passes one (the footer).
 */

type LogoProps = {
  /** Accepted for API compatibility; sizing is now fixed by the image. */
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
};

export function Logo({
  tagline,
  taglineClassName = "text-[11px]",
  center = false,
  className,
}: LogoProps) {
  return (
    <span className={`inline-flex flex-col ${center ? "items-center" : "items-start"} ${className ?? ""}`}>
      <img
        src="/logo.jpg"
        alt="THE BD TODAY"
        className="h-12 w-auto sm:h-16 md:h-20 lg:h-24"
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

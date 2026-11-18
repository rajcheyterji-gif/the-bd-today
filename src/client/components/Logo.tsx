/**
 * THE BD TODAY — logo lockup (user-supplied artwork).
 *
 * The logo is the user's own design: a heavy black Bengali serif
 * wordmark "দ্য বিডি টুডে" with a red sun + black fountain-pen nib
 * above it and a red/black swoosh underneath, inside a black rounded
 * border. It ships as a transparent PNG (public/logo.png, 1270x1270
 * square — the user's corrected square artwork used whole, background
 * removed, nothing rearranged) and is rendered as an <img> so the artwork is used exactly
 * as designed. The matching square favicon (public/favicon.png,
 * 512x512) is the same artwork with a black rounded border.
 *
 * Heights: the image is square (1:1), so on phones its height is
 * fluid — `clamp(48px, 15vw, 56px)` — and it renders the same width,
 * a compact square mark at the left of the dense header row (at 56px
 * the mark is 56px wide; the icons take ~83px; a 360px phone fits
 * both). From sm it is 64px, 80px from md, 96px from lg. Callers may override
 * the image height with `markClassName` (the footer does: 48px /
 * 56px). `wordmarkClassName` is accepted for API compatibility only.
 * The optional Bengali tagline still renders under the image where a
 * caller passes one (the footer).
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
};

export function Logo({
  markClassName,
  tagline,
  taglineClassName = "text-[11px]",
  center = false,
  className,
}: LogoProps) {
  return (
    <span className={`inline-flex flex-col ${center ? "items-center" : "items-start"} ${className ?? ""}`}>
      <img
        src="/logo.png"
        alt="THE BD TODAY"
        className={
          markClassName ??
          "h-[clamp(48px,15vw,56px)] w-auto max-w-full sm:h-16 md:h-20 lg:h-24"
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

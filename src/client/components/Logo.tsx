/**
 * THE BD TODAY — original logo lockup.
 *
 * Mark: a bold red rising sun — a half-disc rising over a thick black
 * horizon bar, with five short thick rays fanning above it. Flat, no
 * gradients, no glass. It is deliberately distinct from Prothom Alo's
 * sun: a half-disc on a horizon bar (not a full disc), short block
 * rays (not long thin ones), and no lettering inside the mark.
 *
 * The mark is a plain inline SVG (crisp at any size), the wordmark is
 * bold black serif with "TODAY" in news red #c1121f, and an optional
 * Bengali tagline sits under the wordmark where space allows.
 */

type LogoProps = {
  /** Height classes for the sun mark, e.g. "h-[26px] w-auto sm:h-9". */
  markClassName?: string;
  /** Font-size classes for the wordmark, e.g. "text-[24px] sm:text-4xl". */
  wordmarkClassName?: string;
  /** Bengali tagline under the wordmark; omit where space is tight. */
  tagline?: string | null;
  /** Extra classes for the tagline line. */
  taglineClassName?: string;
  /** Center the tagline under the wordmark (footer lockup). */
  center?: boolean;
  /** Extra classes for the lockup. */
  className?: string;
};

function SunMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 6 48 34"
      fill="none"
      aria-hidden="true"
      className={className}
      role="presentation"
    >
      {/* Five short thick rays fanning above the disc */}
      <g stroke="#c1121f" strokeWidth={3.5} strokeLinecap="round">
        <line x1="24" y1="17" x2="24" y2="11" />
        <line x1="30.5" y1="18.7" x2="33.5" y2="13.5" />
        <line x1="17.5" y1="18.7" x2="14.5" y2="13.5" />
        <line x1="35.3" y1="23.5" x2="40.5" y2="20.5" />
        <line x1="12.7" y1="23.5" x2="7.5" y2="20.5" />
      </g>
      {/* Rising half-disc */}
      <path d="M14 30 A10 10 0 0 1 34 30 Z" fill="#c1121f" />
      {/* Horizon bar */}
      <rect x="3" y="30" width="42" height="4.5" rx="1" fill="#0f172a" />
    </svg>
  );
}

export function Logo({
  markClassName = "h-7 w-auto",
  wordmarkClassName = "text-[26px]",
  tagline,
  taglineClassName = "text-[11px]",
  center = false,
  className,
}: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <SunMark className={markClassName} />
      <span className={`flex flex-col leading-none ${center ? "items-center" : "items-start"}`}>
        <span
          className={`whitespace-nowrap font-serif font-black tracking-tight text-slate-900 ${wordmarkClassName}`}
        >
          THE BD <span className="text-[#c1121f]">TODAY</span>
        </span>
        {tagline ? (
          <span className={`mt-1 font-bengali font-medium text-slate-500 ${taglineClassName}`}>
            {tagline}
          </span>
        ) : null}
      </span>
    </span>
  );
}

import { Flame } from "lucide-react";

/**
 * Solid red flame — the "trending" marker for breaking/trending
 * indicators (the ব্রেকিং nav item, the আলোচিত tab, the highlights
 * heading). Lucide's outline flame reads thin at small sizes, so the
 * path is filled solid in news red #c1121f.
 */
export function TrendingFlameIcon({
  size = 16,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return <Flame size={size} fill="#c1121f" stroke="none" className={className} aria-hidden="true" />;
}

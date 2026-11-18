// Small D1 / date helpers shared by the services. No Node APIs — the
// Worker runs on the plain Workers runtime (see wrangler.jsonc).

/** Current UTC time as an ISO-8601 string (what every *_at column stores). */
export function nowIso(): string {
  return new Date().toISOString();
}

/** ISO-8601 string for `days` days ago (UTC). */
export function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

/** ISO date part (YYYY-MM-DD) of an ISO timestamp, for daily grouping. */
export function isoDatePart(iso: string): string {
  return iso.slice(0, 10);
}

/** Escape `%` and `_` so user input is literal inside a LIKE pattern. */
export function escapeLike(input: string): string {
  return input.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/** `%term%` LIKE pattern for substring search. */
export function likePattern(term: string): string {
  return `%${escapeLike(term.trim())}%`;
}

/** "?, ?, ?" placeholder list for a dynamic IN (...) clause. */
export function placeholders(count: number): string {
  return Array.from({ length: count }, () => "?").join(", ");
}

/** True when the value looks like a positive integer id. */
export function isNumericId(value: string | undefined | null): value is string {
  return value !== undefined && value !== null && /^\d+$/.test(value);
}

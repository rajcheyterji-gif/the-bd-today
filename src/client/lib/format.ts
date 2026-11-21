// Formatting helpers: Bengali dates/numbers, reading time, excerpts.
// Shared pure helpers (digits, Bengali dates, HTML stripping) live in
// src/shared/utils.ts and are re-exported here for convenience.

import {
  formatDateBn as sharedFormatDateBn,
  stripHtml as sharedStripHtml,
  toBengaliDigits,
} from "../../shared/utils";

export { toBengaliDigits };

/** Full date in Bengali, e.g. "বুধবার, ১৮ নভেম্বর ২০২৬". */
export function formatDateBn(iso?: string | null, withWeekday = true): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  try {
    return sharedFormatDateBn(d, withWeekday ? { weekday: "long" } : {});
  } catch {
    return d.toLocaleDateString("bn-BD");
  }
}

/** Full date in English, e.g. "Wednesday, 18 November 2026". */
export function formatDateEn(iso?: string | null, withWeekday = true): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dhaka",
    weekday: withWeekday ? "long" : undefined,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

/** Short date, e.g. "18 Nov 2026" / Bengali "১৮ নভে ২০২৬". */
export function formatDateShort(iso?: string | null, bn = false): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(bn ? "bn-BD" : "en-GB", {
    timeZone: "Asia/Dhaka",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

/** Time, e.g. "3:45 PM" / Bengali "৩:৪৫ PM". */
export function formatTime(iso?: string | null, bn = false): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(bn ? "bn-BD" : "en-GB", {
    timeZone: "Asia/Dhaka",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

/** "x hours ago" style relative time (English; Bengali digits when bn). */
export function formatRelative(iso?: string | null, bn = false): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMin = Math.max(0, Math.floor((Date.now() - then) / 60000));
  const num = (n: number) => (bn ? toBengaliDigits(n) : String(n));
  if (diffMin < 1) return bn ? "এইমাত্র" : "Just now";
  if (diffMin < 60)
    return bn ? `${num(diffMin)} মিনিট আগে` : `${num(diffMin)} min ago`;
  const hours = Math.floor(diffMin / 60);
  if (hours < 24)
    return bn ? `${num(hours)} ঘণ্টা আগে` : `${num(hours)} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7)
    return bn ? `${num(days)} দিন আগে` : `${num(days)} day${days > 1 ? "s" : ""} ago`;
  return formatDateShort(iso, bn);
}

export function formatNumber(n: number, bn = false): string {
  try {
    return new Intl.NumberFormat(bn ? "bn-BD" : "en-US").format(n);
  } catch {
    return String(n);
  }
}

/** Compact view count: 1.2k, 3.4M. */
export function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

export function readingTimeLabel(minutes: number): string {
  const m = Math.max(1, minutes);
  return `${m} min read`;
}

/** Bengali reading-time label, e.g. "পড়তে ৩ মিনিট" (card meta lines). */
export function readingTimeLabelBn(minutes: number): string {
  const m = Math.max(1, minutes);
  return `পড়তে ${toBengaliDigits(m)} মিনিট`;
}

export function stripHtml(html: string): string {
  return sharedStripHtml(html);
}

export function excerptFrom(content: string, fallback: string, max = 160): string {
  const text = fallback.trim() || stripHtml(content);
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

/** Today's date line for the masthead: { bn, en }. */
export function todayLine(): { bn: string; en: string } {
  const now = new Date();
  return {
    bn: new Intl.DateTimeFormat("bn-BD", {
      timeZone: "Asia/Dhaka",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(now),
    en: new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Dhaka",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(now),
  };
}

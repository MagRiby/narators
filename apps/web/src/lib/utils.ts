import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes safely. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a Hijri year with optional CE conversion. */
export function formatYear(hijri?: number | null, ce?: number | null): string {
  if (!hijri && !ce) return '—';
  const parts: string[] = [];
  if (hijri) parts.push(`${hijri} AH`);
  if (ce)    parts.push(`${ce} CE`);
  return parts.join(' / ');
}

/**
 * Extract the isnad portion of an Arabic hadith text.
 * The isnad typically ends at قَالَ or عَنِ النَّبِيِّ.
 */
export function extractIsnad(text_ar: string): string {
  const endMarkers = /قَالَ|أَنَّ النَّبِيَّ|عَنِ النَّبِيِّ|عَنِ الرَّسُولِ/;
  const match = text_ar.search(endMarkers);
  return match > -1 ? text_ar.slice(0, match) : text_ar.slice(0, 300);
}

/**
 * Simple debounce utility for search inputs.
 */
export function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

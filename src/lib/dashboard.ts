import type { MessageKey, TFunction } from '@/i18n';

const DAY = 86_400_000;

/** Fills gaps so the series covers each of the last `days` calendar days (UTC). */
export function fillDays(points: { day: string; count: number }[], days = 30, now = Date.now()): { day: string; count: number }[] {
  const byDay = new Map(points.map((p) => [p.day, p.count]));
  return Array.from({ length: days }, (_, i) => {
    const day = new Date(now - (days - 1 - i) * DAY).toISOString().slice(0, 10);
    return { day, count: byDay.get(day) ?? 0 };
  });
}

/** Rounds a chart maximum up to 1/2/5 × 10ⁿ so the gridlines land on tidy numbers. */
export function niceMax(max: number): number {
  if (max <= 0) return 10;
  const pow = 10 ** Math.floor(Math.log10(max));
  const n = max / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

export interface WeekTrend {
  last: number;
  previous: number;
  /** percent change vs the previous week, null when there was nothing to compare with */
  pct: number | null;
}

/** New records in the last 7 days against the 7 days before that. */
export function weekOverWeek(perDay: { day: string; count: number }[], now = Date.now()): WeekTrend {
  const days = fillDays(perDay, 14, now);
  const sum = (xs: { count: number }[]) => xs.reduce((a, b) => a + b.count, 0);
  const previous = sum(days.slice(0, 7));
  const last = sum(days.slice(7));
  return { last, previous, pct: previous > 0 ? Math.round(((last - previous) / previous) * 100) : null };
}

export function percentOf(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

/** "CWE-79" → the translated plain-language name, or null for weaknesses we have no name for. */
export function cweName(t: TFunction, cwe: string): string | null {
  const num = /^CWE-(\d+)$/i.exec(cwe.trim())?.[1];
  if (!num) return null;
  const key = `cwe.${num}` as MessageKey;
  const name = t(key);
  return name === key ? null : name;
}

export function greetingName(full: string | undefined): string | null {
  const first = full?.trim().split(/\s+/)[0];
  return first || null;
}

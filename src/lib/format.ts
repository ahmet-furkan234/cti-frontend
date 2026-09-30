const pad = (n: number) => String(n).padStart(2, '0');

/** 2026-09-29 */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 2026-09-29 09:12 */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return `${formatDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? '—' : `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatNumber(n: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(n);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]![0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]![0] ?? '') : '';
  return (first + last).toUpperCase();
}

/** Compact "3 dk", "2 sa", "5 g" style age (units supplied by the caller for i18n). */
export function ageParts(value: string | Date | null | undefined, now = Date.now()): { n: number; unit: 'm' | 'h' | 'd' } | null {
  if (!value) return null;
  const ms = now - new Date(value).getTime();
  if (Number.isNaN(ms)) return null;
  const min = Math.max(0, Math.round(ms / 60_000));
  if (min < 60) return { n: min, unit: 'm' };
  if (min < 60 * 48) return { n: Math.round(min / 60), unit: 'h' };
  return { n: Math.round(min / 1440), unit: 'd' };
}

/** Splits `text` around case-insensitive occurrences of any query word, for <mark> highlighting. */
export function highlightParts(text: string, query: string): { text: string; hit: boolean }[] {
  const words = [...new Set(query.trim().split(/\s+/).filter((w) => w.length >= 2))].map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (words.length === 0) return [{ text, hit: false }];
  // With one capture group, split() puts the matches at the odd indexes.
  return text
    .split(new RegExp(`(${words.join('|')})`, 'i'))
    .map((chunk, i) => ({ text: chunk, hit: i % 2 === 1 }))
    .filter((p) => p.text !== '');
}

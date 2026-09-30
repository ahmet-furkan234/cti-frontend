'use client';

import { useT } from '@/i18n';
import { ageParts } from './format';

/** "4 dk önce" / "4 min ago" for an ISO timestamp. */
export function useAge(): (value: string | Date | null | undefined) => string {
  const t = useT();
  return (value) => {
    const a = ageParts(value);
    if (!a) return '—';
    if (a.unit === 'm' && a.n < 1) return t('age.now');
    return t(a.unit === 'm' ? 'age.m' : a.unit === 'h' ? 'age.h' : 'age.d', { n: a.n });
  };
}

/** Same, for a fixed number of minutes (demo data). */
export function useAgeMinutes(): (minutes: number) => string {
  const t = useT();
  return (minutes) => {
    if (minutes < 1) return t('age.now');
    if (minutes < 60) return t('age.m', { n: Math.round(minutes) });
    if (minutes < 60 * 48) return t('age.h', { n: Math.round(minutes / 60) });
    return t('age.d', { n: Math.round(minutes / 1440) });
  };
}

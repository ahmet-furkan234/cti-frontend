import type { SyncState } from './types';

const HOUR = 3_600_000;
/** How stale a source may get before it counts as delayed. */
export const MAX_AGE_HOURS: Record<string, number> = { nvd: 4, kev: 30, epss: 48 };

export type Health = 'healthy' | 'degraded' | 'failing';

export function sourceHealth(s: SyncState, now = Date.now()): Health {
  if (s.status === 'error') return 'failing';
  if (!s.lastSuccessAt) return 'degraded';
  return now - new Date(s.lastSuccessAt).getTime() > (MAX_AGE_HOURS[s.source] ?? 48) * HOUR ? 'degraded' : 'healthy';
}

/** healthy | degraded | failing across all data sources. */
export function overallHealth(states: SyncState[], now = Date.now()): Health {
  const all = states.map((s) => sourceHealth(s, now));
  return all.includes('failing') ? 'failing' : all.includes('degraded') ? 'degraded' : 'healthy';
}

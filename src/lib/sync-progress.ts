import type { SyncProgress } from './types';

export interface ProgressInfo {
  /** 0–100, or null when the total is unknown. */
  pct: number | null;
  /** Records per second, null until enough has been processed to measure. */
  rate: number | null;
  remainingMs: number | null;
  etaAt: Date | null;
}

const MIN_ELAPSED_S = 5;

/** Rate is measured over the phase (from `baseDone`, so a resumed full load is not skewed); ETA counts down against `now`. */
export function progressInfo(p: SyncProgress, now = Date.now()): ProgressInfo {
  const pct = p.total && p.total > 0 ? Math.min(100, (p.done / p.total) * 100) : null;
  const elapsedS = (new Date(p.updatedAt).getTime() - new Date(p.startedAt).getTime()) / 1000;
  const rate = elapsedS >= MIN_ELAPSED_S && p.done > p.baseDone ? (p.done - p.baseDone) / elapsedS : null;
  if (!rate || !p.total) return { pct, rate, remainingMs: null, etaAt: null };
  const etaAt = new Date(new Date(p.updatedAt).getTime() + (Math.max(0, p.total - p.done) / rate) * 1000);
  return { pct, rate, remainingMs: Math.max(0, etaAt.getTime() - now), etaAt };
}

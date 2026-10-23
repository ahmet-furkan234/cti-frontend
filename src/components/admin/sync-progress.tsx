'use client';

import { useI18n, type MessageKey, type TFunction } from '@/i18n';
import { formatNumber, formatTime } from '@/lib/format';
import { progressInfo } from '@/lib/sync-progress';
import { useNow } from '@/lib/use-now';
import type { SyncState } from '@/lib/types';

function duration(ms: number, t: TFunction): string {
  const s = Math.round(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h} ${t('sync.unit.h')} ${m} ${t('sync.unit.m')}`;
  if (m > 0) return `${m} ${t('sync.unit.m')}`;
  return `${s} ${t('sync.unit.s')}`;
}

function Bar({ pct, thin }: { pct: number | null; thin?: boolean }) {
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct === null ? undefined : Math.round(pct)}
      className={`w-full overflow-hidden rounded-full bg-surface-2 ${thin ? 'h-0.5' : 'h-2'}`}
    >
      <div
        className={`h-full rounded-full bg-accent transition-[width] duration-700 ease-out${pct === null ? ' w-1/3 animate-pulse' : ''}`}
        style={pct === null ? undefined : { width: `${Math.max(pct, 1)}%` }}
      />
    </div>
  );
}

/** Thin bar pinned to the bottom edge of a table row (the row must be `relative`). */
export function SyncRowProgress({ state }: { state: SyncState }) {
  const p = state.status === 'running' ? state.progress : null;
  const queued = state.status !== 'running' && !!state.runRequestedAt;
  if (!p && !queued && state.status !== 'running') return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0">
      <Bar pct={p ? progressInfo(p).pct : null} thin />
    </div>
  );
}

/** Detail panel block: percentage, records, speed and a live countdown to the estimated finish. */
export function SyncProgressPanel({ state }: { state: SyncState }) {
  const { t, locale } = useI18n();
  const running = state.status === 'running';
  const queued = !running && !!state.runRequestedAt;
  const now = useNow(running || queued);
  if (!running && !queued) return null;

  const p = running ? state.progress : null;
  if (!p) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-line bg-canvas p-3" aria-live="polite">
        <Bar pct={null} />
        <span className="text-sm text-ink-muted">{t(running ? 'sync.progress.starting' : 'sync.progress.queued')}</span>
      </div>
    );
  }

  const info = progressInfo(p, now);
  const elapsedMs = now - new Date(p.startedAt).getTime();
  const remaining =
    info.remainingMs === null ? t('sync.progress.calculating')
      : info.remainingMs < 5_000 ? t('sync.progress.finishing')
        : t('sync.progress.remaining', { time: duration(info.remainingMs, t) });

  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-line bg-canvas p-3" aria-live="polite">
      <div className="flex items-baseline gap-2">
        <span className="text-xs font-medium text-ink-muted grow">{t(`sync.progress.phase.${p.phase}` as MessageKey)}</span>
        {info.pct !== null ? <span className="tabular-nums text-lg font-semibold">{info.pct.toFixed(info.pct < 10 ? 1 : 0)}%</span> : null}
      </div>
      <Bar pct={info.pct} />
      <div className="flex flex-col gap-0.5 text-xs text-ink-muted">
        <span className="tabular-nums">
          {p.total
            ? t('sync.progress.records', { done: formatNumber(p.done, locale), total: formatNumber(p.total, locale) })
            : t('sync.progress.recordsOnly', { done: formatNumber(p.done, locale) })}
          {info.rate ? ` · ${t('sync.progress.rate', { n: formatNumber(Math.round(info.rate), locale) })}` : ''}
        </span>
        <span className="tabular-nums text-ink">
          {remaining}
          {info.etaAt && info.remainingMs !== null && info.remainingMs >= 5_000 ? ` · ${t('sync.progress.eta', { time: formatTime(info.etaAt) })}` : ''}
        </span>
        <span className="tabular-nums">{t('sync.progress.elapsed', { time: duration(Math.max(0, elapsedMs), t) })}</span>
      </div>
    </div>
  );
}

'use client';

import { PAGE_CONTAINER } from '@/components/shell/page-layout';

import { useState } from 'react';
import { errorMessage } from '@/components/admin/admin-parts';
import { SyncProgressPanel, SyncRowProgress } from '@/components/admin/sync-progress';
import { useAuth } from '@/components/auth-provider';
import { PageHeader, RequirePermission, RequirePlatform } from '@/components/shell/page-guard';
import { Banner, Button, Skeleton, StateBlock, StatusPill } from '@/components/ui';
import { useRunSync, useSyncStates } from '@/features/admin/hooks';
import { useI18n, type MessageKey } from '@/i18n';
import { formatDateTime, formatNumber } from '@/lib/format';
import { PERMISSIONS as P } from '@/lib/permissions';
import { sourceHealth } from '@/lib/sync-health';
import { useAge } from '@/lib/use-age';
import type { SyncSource, SyncState } from '@/lib/types';

const COLS = { '--cols': 'minmax(0, 1fr) 120px 150px 100px 96px' } as React.CSSProperties;
const HOUR = 3_600_000;

function pillStatus(s: SyncState): string {
  if (s.status === 'running') return 'running';
  return sourceHealth(s);
}

function SyncView() {
  const { t, locale } = useI18n();
  const { can } = useAuth();
  const age = useAge();
  const { data, isPending, isError, refetch } = useSyncStates();
  const run = useRunSync();
  const [selected, setSelected] = useState<SyncSource>('nvd');
  const [flash, setFlash] = useState(false);

  const canRun = can(P.SYNC_RUN);
  const states = data ?? [];
  const current = states.find((s) => s.source === selected);
  const now = Date.now();
  const failing = states.filter((s) => sourceHealth(s) === 'failing').length;
  const healthy = states.filter((s) => sourceHealth(s) === 'healthy').length;
  const lastSuccess = states.map((s) => s.lastSuccessAt).filter(Boolean).sort().at(-1);
  const oldest = states.reduce<number | null>((acc, s) => {
    if (!s.lastSuccessAt) return acc;
    const h = (now - new Date(s.lastSuccessAt).getTime()) / HOUR;
    return acc === null ? h : Math.max(acc, h);
  }, null);
  const nvdRecords = states.find((s) => s.source === 'nvd')?.recordsProcessed ?? 0;

  const trigger = (sources: SyncSource[]) => {
    setFlash(false);
    Promise.all(sources.map((s) => run.mutateAsync(s))).then(() => setFlash(true), () => undefined);
  };

  if (isError) {
    return (
      <div className={PAGE_CONTAINER}><div className="min-w-0 rounded-xl border border-line bg-surface shadow-card">
        <StateBlock kind="error" title={t('common.loadError')} description={t('common.tryAgainLater')} action={<Button onClick={() => void refetch()}>{t('common.retry')}</Button>} />
      </div></div>
    );
  }

  return (
    <div className={PAGE_CONTAINER}>
      <PageHeader
        title={t('sync.title')}
        subtitle={data ? t('sync.subtitle', { n: states.length, time: lastSuccess ? formatDateTime(lastSuccess) : '—' }) : <Skeleton width={260} height={14} />}
        actions={canRun ? <Button variant="primary" icon="refresh" loading={run.isPending} onClick={() => trigger(states.filter((s) => s.status !== 'running').map((s) => s.source))}>{t('sync.syncAll')}</Button> : undefined}
      />
      {flash ? <Banner tone="success" onDismiss={() => setFlash(false)}>{t('sync.requested')}</Banner> : null}
      {run.isError ? <Banner tone="error">{errorMessage(run.error, t('common.tryAgainLater'))}</Banner> : null}
      {failing > 0 ? (
        <Banner tone="warning" title={t('sync.banner.title', { n: failing })}>
          {t('sync.banner.text')}
        </Banner>
      ) : null}

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
        {[
          { k: t('sync.kpi.healthy'), v: data ? `${healthy} / ${states.length}` : '', c: 'ink', h: '' },
          { k: t('sync.kpi.records'), v: data ? formatNumber(nvdRecords, locale) : '', c: 'ink', h: '' },
          { k: t('sync.kpi.oldest'), v: data ? (oldest === null ? '—' : oldest < 1 ? `${Math.round(oldest * 60)} ${t('sla.h') === 'sa' ? 'dk' : 'min'}` : `${Math.round(oldest)} ${t('sla.h')}`) : '', c: oldest !== null && oldest > 4 ? 't-high' : 'ink', h: '' },
          { k: t('sync.kpi.failed'), v: data ? String(failing) : '', c: failing > 0 ? 't-critical' : 'ink', h: t('sync.kpi.failedHint') },
        ].map((k) => (
          <div key={k.k} className="min-w-0 rounded-xl border border-line bg-surface shadow-card flex flex-col gap-1 py-3.5 px-4">
            <span className="text-sm font-medium">{k.k}</span>
            {isPending ? <Skeleton width={72} height={24} /> : <span className={`tabular-nums ${k.c}`} style={{ fontSize: 24, lineHeight: '30px', fontWeight: 600 }}>{k.v}</span>}
            <span className="text-sm text-ink-subtle">{k.h}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-stretch gap-4 xl:flex-row xl:items-start">
        <section className="min-w-0 grow rounded-xl border border-line bg-surface shadow-card overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <div className="grid min-h-12 items-center gap-3 border-b border-line px-5 last:border-b-0 [grid-template-columns:var(--cols)] sticky top-0 z-1 h-10! min-h-0! bg-surface-2 text-sm font-medium text-ink-muted" style={COLS}>
              <span>{t('sync.col.source')}</span>
              <span>{t('sync.col.status')}</span>
              <span>{t('sync.col.lastSuccess')}</span>
              <span className="text-right">{t('sync.col.records')}</span>
              <span />
            </div>
            <div className="flex items-center gap-2 border-b border-line bg-canvas px-5 text-sm font-semibold text-ink-muted h-7">{t('sync.group.vuln')}</div>
            {isPending ? [0, 1, 2].map((i) => (
              <div key={i} className="grid items-center gap-3 border-b border-line px-5 last:border-b-0 [grid-template-columns:var(--cols)]" style={{ ...COLS, height: 50 }}>
                <Skeleton width="55%" height={14} /><Skeleton width={72} height={12} /><Skeleton width={64} height={12} /><Skeleton width={48} height={12} className="ml-auto" /><span />
              </div>
            )) : null}
            {states.map((s) => {
              const health = sourceHealth(s);
              const isSel = s.source === selected;
              return (
                <div
                  key={s.source}
                  role="button"
                  tabIndex={0}
                  className={`relative grid min-h-12 items-center gap-3 border-b border-line px-5 last:border-b-0 [grid-template-columns:var(--cols)] cursor-pointer hover:bg-surface-2${isSel ? ' bg-accent-soft' : ''}`}
                  style={{ ...COLS, height: 50, boxShadow: isSel ? 'inset 2px 0 0 var(--accent)' : undefined }}
                  onClick={() => setSelected(s.source)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSelected(s.source)}
                >
                  <span className="flex flex-col min-w-0">
                    <span className="font-medium">{t(`sync.src.${s.source}` as MessageKey)}</span>
                    <span className="truncate text-xs" style={{ color: health === 'failing' ? 'var(--critical-ink)' : 'var(--ink-muted)' }}>
                      {s.status === 'error' && s.lastError ? s.lastError : t(`sync.src.${s.source}.meta` as MessageKey)}
                    </span>
                  </span>
                  <StatusPill status={pillStatus(s)} label={s.runRequestedAt && s.status !== 'running' ? t('sync.queued') : undefined} />
                  <span className="tabular-nums text-[13px]" style={{ color: health === 'healthy' ? 'var(--ink)' : 'var(--high-ink)' }}>{s.lastSuccessAt ? age(s.lastSuccessAt) : t('common.never')}</span>
                  <span className="tabular-nums text-[13px] text-right text-ink-muted">{formatNumber(s.recordsProcessed, locale)}</span>
                  <span className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                    {canRun ? (
                      <Button
                        size="sm"
                        variant={s.status === 'error' ? 'secondary' : 'ghost'}
                        loading={s.status === 'running' || !!s.runRequestedAt}
                        disabled={run.isPending}
                        onClick={() => trigger([s.source])}
                      >
                        {s.status === 'error' ? t('sync.retry') : s.status === 'running' ? t('sync.running') : t('sync.now')}
                      </Button>
                    ) : null}
                  </span>
                  <SyncRowProgress state={s} />
                </div>
              );
            })}
          </div>
        </section>

        {isPending ? (
          <aside aria-hidden="true" className="min-w-0 rounded-xl border border-line bg-surface shadow-card p-5 border-line-strong flex flex-col w-full xl:w-[360px] xl:shrink-0 gap-3.5">
            <Skeleton width="50%" height={20} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={52} />)}
            </div>
            <Skeleton height={64} />
            <Skeleton lines={3} height={12} />
          </aside>
        ) : current ? (
          <aside aria-label={t(`sync.src.${current.source}` as MessageKey)} className="min-w-0 rounded-xl border border-line bg-surface shadow-card p-5 border-line-strong flex flex-col w-full xl:w-[360px] xl:shrink-0 gap-3.5">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold grow">{t(`sync.src.${current.source}` as MessageKey)}</h2>
              <StatusPill status={pillStatus(current)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                [t('sync.detail.lastSuccess'), formatDateTime(current.lastSuccessAt)],
                [t('sync.detail.records'), formatNumber(current.recordsProcessed, locale)],
                [t('sync.detail.lastStarted'), formatDateTime(current.lastStartedAt)],
                [t('sync.detail.lastFinished'), formatDateTime(current.lastFinishedAt)],
              ].map(([k, v]) => (
                <div key={k} className="flex flex-col gap-0.5 rounded-lg bg-surface-2 py-2 px-2.5">
                  <span className="text-xs text-ink-muted">{k}</span>
                  <span className="font-mono text-[13px]">{v}</span>
                </div>
              ))}
            </div>
            <SyncProgressPanel state={current} />
            {!current.lastSuccessAt && typeof current.cursor['startIndex'] === 'number' ? (
              <Banner tone="info">{t('sync.detail.fullLoad', { n: formatNumber(current.cursor['startIndex'] as number, locale) })}</Banner>
            ) : null}
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">{t('sync.detail.error')}</span>
              <div className="font-mono text-xs py-2.5 px-3 bg-canvas border border-line rounded-lg break-words" style={{ color: current.lastError ? 'var(--critical-ink)' : 'var(--ink-muted)' }}>
                {current.lastError ?? t('sync.detail.noError')}
              </div>
            </div>
            <div className="grow" />
            {canRun ? (
              <Button variant="primary" loading={current.status === 'running' || !!current.runRequestedAt} disabled={run.isPending} onClick={() => trigger([current.source])}>
                {t('sync.now')}
              </Button>
            ) : (
              <span className="text-sm text-ink-subtle">{t('sync.noPermissionRun')}</span>
            )}
          </aside>
        ) : null}
      </div>
    </div>
  );
}

export default function SyncPage() {
  return (
    <RequirePlatform><RequirePermission any={[P.SYNC_VIEW]}><SyncView /></RequirePermission></RequirePlatform>
  );
}

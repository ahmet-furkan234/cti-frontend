'use client';

import { useState } from 'react';
import { errorMessage } from '@/components/admin/admin-parts';
import { useAuth } from '@/components/auth-provider';
import { PageHeader, RequirePermission } from '@/components/shell/page-guard';
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
      <div className="page"><div className="card">
        <StateBlock kind="error" title={t('common.loadError')} description={t('common.tryAgainLater')} action={<Button onClick={() => void refetch()}>{t('common.retry')}</Button>} />
      </div></div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        title={t('sync.title')}
        subtitle={data ? t('sync.subtitle', { n: states.length, time: lastSuccess ? formatDateTime(lastSuccess) : '—' }) : undefined}
        actions={canRun ? <Button variant="primary" icon="refresh" loading={run.isPending} onClick={() => trigger(states.filter((s) => s.status !== 'running').map((s) => s.source))}>{t('sync.syncAll')}</Button> : undefined}
      />
      {flash ? <Banner tone="success" onDismiss={() => setFlash(false)}>{t('sync.requested')}</Banner> : null}
      {run.isError ? <Banner tone="error">{errorMessage(run.error, t('common.tryAgainLater'))}</Banner> : null}
      {failing > 0 ? (
        <Banner tone="warning" title={t('sync.banner.title', { n: failing })}>
          {t('sync.banner.text')}
        </Banner>
      ) : null}

      <div className="grid grid-4">
        {[
          { k: t('sync.kpi.healthy'), v: data ? `${healthy} / ${states.length}` : '', c: 'ink', h: '' },
          { k: t('sync.kpi.records'), v: data ? formatNumber(nvdRecords, locale) : '', c: 'ink', h: '' },
          { k: t('sync.kpi.oldest'), v: data ? (oldest === null ? '—' : oldest < 1 ? `${Math.round(oldest * 60)} ${t('sla.h') === 'sa' ? 'dk' : 'min'}` : `${Math.round(oldest)} ${t('sla.h')}`) : '', c: oldest !== null && oldest > 4 ? 't-high' : 'ink', h: '' },
          { k: t('sync.kpi.failed'), v: data ? String(failing) : '', c: failing > 0 ? 't-critical' : 'ink', h: t('sync.kpi.failedHint') },
        ].map((k) => (
          <div key={k.k} className="card col" style={{ gap: 4, padding: '14px 16px' }}>
            <span className="caps">{k.k}</span>
            {isPending ? <Skeleton width={72} height={24} /> : <span className={`tnum ${k.c}`} style={{ fontSize: 24, lineHeight: '30px', fontWeight: 600 }}>{k.v}</span>}
            <span className="sub subtle">{k.h}</span>
          </div>
        ))}
      </div>

      <div className="split">
        <section className="card card--clip main col">
          <div className="scroll-x">
            <div className="trow trow--head" style={COLS}>
              <span>{t('sync.col.source')}</span>
              <span>{t('sync.col.status')}</span>
              <span>{t('sync.col.lastSuccess')}</span>
              <span className="right">{t('sync.col.records')}</span>
              <span />
            </div>
            <div className="trow trow--group" style={{ height: 28 }}>{t('sync.group.vuln')}</div>
            {isPending ? <div style={{ padding: 16 }}><Skeleton lines={3} height={12} /></div> : null}
            {states.map((s) => {
              const health = sourceHealth(s);
              const isSel = s.source === selected;
              return (
                <div
                  key={s.source}
                  role="button"
                  tabIndex={0}
                  className={`trow trow--click${isSel ? ' trow--sel' : ''}`}
                  style={{ ...COLS, height: 50, boxShadow: isSel ? 'inset 2px 0 0 var(--accent)' : undefined }}
                  onClick={() => setSelected(s.source)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSelected(s.source)}
                >
                  <span className="col min0">
                    <span style={{ fontWeight: 500 }}>{t(`sync.src.${s.source}` as MessageKey)}</span>
                    <span className="ellipsis" style={{ fontSize: 11, lineHeight: '16px', color: health === 'failing' ? 'var(--critical-ink)' : 'var(--ink-muted)' }}>
                      {s.status === 'error' && s.lastError ? s.lastError : t(`sync.src.${s.source}.meta` as MessageKey)}
                    </span>
                  </span>
                  <StatusPill status={pillStatus(s)} label={s.runRequestedAt && s.status !== 'running' ? t('sync.queued') : undefined} />
                  <span className="mono-12" style={{ color: health === 'healthy' ? 'var(--ink)' : 'var(--high-ink)' }}>{s.lastSuccessAt ? age(s.lastSuccessAt) : t('common.never')}</span>
                  <span className="mono-12 right muted">{formatNumber(s.recordsProcessed, locale)}</span>
                  <span className="right" onClick={(e) => e.stopPropagation()}>
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
                </div>
              );
            })}
          </div>
        </section>

        {current ? (
          <aside aria-label={t(`sync.src.${current.source}` as MessageKey)} className="card card--pad card--strong col aside-360" style={{ gap: 14 }}>
            <div className="row">
              <h2 className="h2 grow">{t(`sync.src.${current.source}` as MessageKey)}</h2>
              <StatusPill status={pillStatus(current)} />
            </div>
            <div className="grid grid-2" style={{ gap: 8 }}>
              {[
                [t('sync.detail.lastSuccess'), formatDateTime(current.lastSuccessAt)],
                [t('sync.detail.records'), formatNumber(current.recordsProcessed, locale)],
                [t('sync.detail.lastStarted'), formatDateTime(current.lastStartedAt)],
                [t('sync.detail.lastFinished'), formatDateTime(current.lastFinishedAt)],
              ].map(([k, v]) => (
                <div key={k} className="kv-tile" style={{ padding: '8px 10px' }}>
                  <span className="k">{k}</span>
                  <span className="mono-12" style={{ lineHeight: '18px' }}>{v}</span>
                </div>
              ))}
            </div>
            {!current.lastSuccessAt && typeof current.cursor['startIndex'] === 'number' ? (
              <Banner tone="info">{t('sync.detail.fullLoad', { n: formatNumber(current.cursor['startIndex'] as number, locale) })}</Banner>
            ) : null}
            <div className="col gap-6">
              <span className="caps">{t('sync.detail.error')}</span>
              <div className="mono-11" style={{ padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', lineHeight: '17px', color: current.lastError ? 'var(--critical-ink)' : 'var(--ink-muted)', wordBreak: 'break-word' }}>
                {current.lastError ?? t('sync.detail.noError')}
              </div>
            </div>
            {current.source === 'nvd' ? (
              <div className="col gap-6">
                <span className="caps">{t('sync.detail.tipTitle')}</span>
                <span className="sub" style={{ lineHeight: '18px' }}>{t('sync.detail.tip')}</span>
              </div>
            ) : null}
            <span className="sub subtle">{t('sync.workerNote')}</span>
            <div className="grow" />
            {canRun ? (
              <Button variant="primary" loading={current.status === 'running' || !!current.runRequestedAt} disabled={run.isPending} onClick={() => trigger([current.source])}>
                {t('sync.now')}
              </Button>
            ) : (
              <span className="sub subtle">{t('sync.noPermissionRun')}</span>
            )}
          </aside>
        ) : null}
      </div>
    </div>
  );
}

export default function SyncPage() {
  return (
    <RequirePermission any={[P.SYNC_VIEW]}>
      <SyncView />
    </RequirePermission>
  );
}

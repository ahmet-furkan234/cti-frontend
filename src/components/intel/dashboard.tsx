'use client';

import Link from 'next/link';
import { useState } from 'react';
import { IocAssets } from '@/components/intel/ioc-assets';
import { LoadError, LoadingRows } from '@/components/shell/query-state';
import { Icon, KevFlag, Select, SeverityBadge, StateBlock, cx } from '@/components/ui';
import { useFindings, useNewKev } from '@/features/intel/hooks';
import { useI18n, type MessageKey } from '@/i18n';
import type { IntelFindingDto, NewKevDto, WatchlistDto } from '@/lib/types';
import type { Ioc } from '@/mocks/intel';

export const RANGES = [1, 7, 30] as const;

function Panel({ title, desc, count, aside, children }: { title: string; desc?: string; count?: number; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-card">
      <header className="flex flex-wrap items-start gap-x-4 gap-y-2 px-5 pt-5 pb-3">
        <div className="min-w-0 grow">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            {title}
            {count != null ? <span className="rounded-full bg-surface-3 px-2 py-0.5 text-xs font-medium text-ink-muted tabular-nums">{count}</span> : null}
          </h2>
          {desc ? <p className="m-0 text-sm text-ink-muted">{desc}</p> : null}
        </div>
        {aside}
      </header>
      {children}
    </section>
  );
}

function useAgo() {
  const { t } = useI18n();
  return (iso: string) => {
    const h = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000));
    return h < 24 ? t('intel.dash.ago.h', { n: Math.max(1, h) }) : t('intel.dash.ago.d', { n: Math.round(h / 24) });
  };
}

function FindingRow({ f }: { f: IntelFindingDto }) {
  const { t } = useI18n();
  const ago = useAgo();
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-t border-line px-5 py-3 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_90px_90px]">
      <span className="flex flex-wrap items-center gap-2">
        <Link href={`/cves/${f.cve}`} className="font-mono text-[15px] font-semibold">{f.cve}</Link>
        {f.kev ? <KevFlag /> : null}
        <SeverityBadge score={f.cvss} />
      </span>
      <span className="order-last col-span-2 flex min-w-0 flex-col md:order-none md:col-span-1">
        <Link href={`/assets/${f.assetId}`} className="truncate font-medium">{f.asset}</Link>
        <span className="truncate text-sm text-ink-muted">{t(`env.${f.env}` as MessageKey)} · {f.component} · {f.watchlist}</span>
      </span>
      <span className="hidden text-sm text-ink-muted tabular-nums md:block">EPSS {Math.round(f.epss * 100)}%</span>
      <span className="text-right text-sm text-ink-subtle md:text-left">{ago(f.firstSeenAt)}</span>
    </li>
  );
}

function Findings({ days, lists, watchlistId, onWatchlist }: { days: number; lists: WatchlistDto[]; watchlistId: string | null; onWatchlist: (id: string | null) => void }) {
  const { t } = useI18n();
  const q = useFindings(days, watchlistId);
  const items = q.data?.items ?? [];
  const total = q.data?.total ?? 0;
  const active = lists.filter((w) => w.enabled);
  return (
    <Panel
      title={t('intel.dash.findings')}
      desc={t('intel.dash.findings.desc', { n: days })}
      {...(q.data ? { count: total } : {})}
      aside={active.length > 1 || watchlistId ? (
        <Select
          size="sm"
          className="w-52"
          aria-label={t('intel.dash.filter')}
          value={watchlistId ?? ''}
          onChange={(v) => onWatchlist(v || null)}
          options={[{ value: '', label: t('intel.dash.allLists') }, ...lists.map((w) => ({ value: w.id, label: w.name }))]}
        />
      ) : null}
    >
      {q.isError ? <LoadError onRetry={() => void q.refetch()} />
        : q.isPending ? <LoadingRows />
        : active.length === 0 ? <StateBlock kind="empty" compact title={t('intel.dash.noLists')} description={t('intel.dash.noLists.desc')} />
        : items.length === 0 ? <StateBlock kind="empty" compact title={t('intel.dash.findings.none', { n: days })} description={t('intel.dash.findings.none.desc')} />
        : (
          <>
            <ul className="m-0 list-none p-0">{items.map((f) => <FindingRow key={f.id} f={f} />)}</ul>
            {total > items.length ? <p className="m-0 border-t border-line px-5 py-3 text-sm text-ink-subtle">{t('intel.dash.findings.capped', { shown: items.length, total })}</p> : null}
          </>
        )}
    </Panel>
  );
}

function IocMatch({ ioc }: { ioc: Ioc }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <li className="border-t border-line">
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-surface-2">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-critical-soft text-critical-ink"><Icon name="alert" size={16} /></span>
        <span className="flex min-w-0 grow flex-col">
          <span className="truncate font-mono text-[14px]">{ioc.value}</span>
          <span className="text-sm text-ink-muted">{t(`intel.type.${ioc.type}` as MessageKey)} · {ioc.source}</span>
        </span>
        <span className="shrink-0 text-sm font-semibold text-critical-ink">{t('intel.ioc.matches', { n: ioc.matches })}</span>
        <Icon name="down" size={16} className={cx('shrink-0 text-ink-subtle transition-transform', open && 'rotate-180')} />
      </button>
      {open ? <div className="bg-surface-2/60 px-5 py-3 pl-[68px]"><IocAssets id={ioc.id} /></div> : null}
    </li>
  );
}

function IocMatches({ iocs }: { iocs: Ioc[] }) {
  const { t } = useI18n();
  const hit = iocs.filter((i) => i.matches > 0);
  return (
    <Panel title={t('intel.dash.iocs')} desc={t('intel.dash.iocs.desc')} count={hit.length}>
      {hit.length === 0 ? <StateBlock kind="empty" compact title={t('intel.dash.iocs.none')} /> : <ul className="m-0 list-none p-0">{hit.map((i) => <IocMatch key={i.id} ioc={i} />)}</ul>}
    </Panel>
  );
}

function KevRow({ k }: { k: NewKevDto }) {
  const { t } = useI18n();
  const ago = useAgo();
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line px-5 py-3">
      <Link href={`/cves/${k.cve}`} className="font-mono text-[15px] font-semibold">{k.cve}</Link>
      <KevFlag ransomware={k.ransomware} />
      <SeverityBadge score={k.cvss} />
      <span className="grow" />
      <span className={cx('text-sm', k.assets > 0 ? 'font-semibold text-critical-ink' : 'text-ink-subtle')}>{k.assets > 0 ? t('intel.dash.kev.assets', { n: k.assets }) : t('intel.dash.kev.noAssets')}</span>
      <span className="w-full text-sm text-ink-subtle">{t('intel.dash.kev.added', { when: ago(k.addedAt) })}</span>
    </li>
  );
}

function NewKev({ days }: { days: number }) {
  const { t } = useI18n();
  const q = useNewKev(days);
  const items = q.data?.items ?? [];
  return (
    <Panel title={t('intel.dash.kev')} desc={t('intel.dash.kev.desc', { n: days })} {...(q.data ? { count: items.length } : {})}>
      {q.isError ? <LoadError onRetry={() => void q.refetch()} />
        : q.isPending ? <LoadingRows rows={2} />
        : items.length === 0 ? <StateBlock kind="empty" compact title={t('intel.dash.kev.none', { n: days })} />
        : <ul className="m-0 list-none p-0">{items.map((k) => <KevRow key={k.cve} k={k} />)}</ul>}
    </Panel>
  );
}

export function IntelDashboard({ days, onDays, watchlistId, onWatchlist, lists, iocs }: {
  days: number; onDays: (n: number) => void; watchlistId: string | null; onWatchlist: (id: string | null) => void; lists: WatchlistDto[]; iocs: Ioc[];
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('intel.dash.range')}>
        <span className="text-sm text-ink-muted">{t('intel.dash.range')}</span>
        {RANGES.map((n) => (
          <button key={n} type="button" aria-pressed={days === n} onClick={() => onDays(n)} className={cx('h-9 rounded-full border px-3.5 text-sm font-medium transition-colors', days === n ? 'border-transparent bg-accent text-on-accent' : 'border-line-strong bg-surface text-ink-muted hover:text-ink')}>
            {t(`intel.dash.range.${n}` as MessageKey)}
          </button>
        ))}
      </div>
      <Findings days={days} lists={lists} watchlistId={watchlistId} onWatchlist={onWatchlist} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <IocMatches iocs={iocs} />
        <NewKev days={days} />
      </div>
    </div>
  );
}

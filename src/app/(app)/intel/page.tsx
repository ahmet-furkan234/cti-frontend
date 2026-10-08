'use client';

import { useMemo, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { AddIndicatorsDrawer, IndicatorList } from '@/components/intel/indicators';
import { IntelDashboard } from '@/components/intel/dashboard';
import { WatchlistDrawer, WatchlistGrid, newWatchlist, type WatchlistDraft } from '@/components/intel/watchlists';
import { PageHeader, RequirePermission } from '@/components/shell/page-guard';
import { LoadError, LoadingRows } from '@/components/shell/query-state';
import { Banner, Button, Tabs, Tag, cx } from '@/components/ui';
import { useIntelMutations, useIocs, useWatchlists } from '@/features/intel/hooks';
import { toIoc } from '@/features/intel/map';
import { useI18n } from '@/i18n';
import { ApiError } from '@/lib/api';
import { useDemo } from '@/lib/demo';
import { PERMISSIONS as P } from '@/lib/permissions';
import type { Ioc } from '@/mocks/intel';

type TabId = 'overview' | 'watchlists' | 'indicators';

function Tile({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border border-line bg-surface px-5 py-4 shadow-card">
      <span className="text-sm text-ink-muted">{label}</span>
      <span className={cx('text-3xl leading-9 font-semibold tabular-nums', tone)}>{value}</span>
      <span className="text-sm text-ink-muted">{sub}</span>
    </div>
  );
}

function Intel() {
  const { t, locale } = useI18n();
  const demo = useDemo();
  const { can } = useAuth();
  const canManage = can(P.INTEL_MANAGE);
  const listsQ = useWatchlists();
  const iocsQ = useIocs();
  const m = useIntelMutations();
  const lists = listsQ.data?.items ?? [];
  const iocs = useMemo(() => (iocsQ.data?.items ?? []).map(toIoc), [iocsQ.data]);
  const [tab, setTab] = useState<TabId>('overview');
  const [editing, setEditing] = useState<WatchlistDraft | null>(null);
  const [adding, setAdding] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [days, setDays] = useState(7);
  const [watchlistId, setWatchlistId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const failed = (e: unknown) => setNotice({ tone: 'error', text: e instanceof ApiError && e.code === 'LOCAL_PREVIEW' ? t('asset.err.demo') : t('common.tryAgainLater') });

  const attention = iocs.filter((i) => i.matches > 0).length + lists.filter((w) => w.enabled && w.hits > 0).length;

  const saveList = (d: WatchlistDraft) => {
    const { id, ...body } = d;
    const done = { onSuccess: () => { setEditing(null); setNotice({ tone: 'success', text: t('intel.wl.saved') }); }, onError: failed };
    if (id) m.updateWatchlist.mutate({ id, ...body }, done);
    else m.createWatchlist.mutate(body, done);
  };
  const deleteList = (d: WatchlistDraft) => {
    if (!d.id || !window.confirm(t('intel.wl.deleteConfirm', { name: d.name }))) return;
    m.deleteWatchlist.mutate(d.id, { onSuccess: () => setEditing(null), onError: failed });
  };
  const addIocs = (items: { value: string; type: Ioc['type'] }[]) =>
    m.addIocs.mutate(items, {
      onSuccess: (res) => { setAdding(false); setTab('indicators'); setNotice({ tone: 'success', text: t('intel.imp.added', { n: res.added }) }); },
      onError: failed,
    });
  const deleteIoc = (ioc: Ioc) => {
    if (!window.confirm(t('intel.ioc.deleteConfirm', { value: ioc.value }))) return;
    m.deleteIoc.mutate(ioc.id, { onError: failed });
  };

  const loading = listsQ.isPending || iocsQ.isPending;
  const errored = listsQ.isError || iocsQ.isError;

  return (
    <div className="mx-auto flex w-full max-w-[1100px] min-w-0 grow flex-col gap-5 p-4 md:p-8">
      <PageHeader
        title={t('intel.title')}
        subtitle={t('intel.subtitle')}
        actions={
          <>
            {demo ? <Tag tone="accent">{t('common.demoData')}</Tag> : null}
            {canManage ? <Button onClick={() => setAdding(true)}>{t('intel.ioc.add')}</Button> : null}
            {canManage ? <Button variant="primary" icon="plus" onClick={() => setEditing(newWatchlist())}>{t('intel.wl.new')}</Button> : null}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Tile label={t('intel.sum.attention')} value={String(attention)} sub={t('intel.sum.attention.sub')} tone={attention > 0 ? 'text-critical-ink' : undefined} />
        <Tile label={t('intel.sum.indicators')} value={(iocsQ.data?.active ?? 0).toLocaleString(locale)} sub={t('intel.sum.indicators.sub')} />
        <Tile label={t('intel.sum.expiring')} value={String(iocsQ.data?.expiring ?? 0)} sub={t('intel.sum.expiring.sub')} />
      </div>

      {notice ? <Banner tone={notice.tone} onDismiss={() => setNotice(null)}>{notice.text}</Banner> : null}

      <Tabs
        label={t('intel.tabs.label')}
        value={tab}
        onChange={(v) => setTab(v as TabId)}
        items={[
          { id: 'overview', label: t('intel.tab.overview') },
          { id: 'watchlists', label: t('intel.tab.watchlists'), count: lists.length },
          { id: 'indicators', label: t('intel.tab.indicators') },
        ]}
      />

      {errored ? (
        <div className="rounded-xl border border-line bg-surface shadow-card"><LoadError onRetry={() => { void listsQ.refetch(); void iocsQ.refetch(); }} /></div>
      ) : loading ? (
        <div className="rounded-xl border border-line bg-surface shadow-card"><LoadingRows /></div>
      ) : null}

      {tab === 'overview' && !loading && !errored ? (
        <IntelDashboard days={days} onDays={setDays} watchlistId={watchlistId} onWatchlist={setWatchlistId} lists={lists} iocs={iocs} />
      ) : null}
      {tab === 'watchlists' && !loading && !errored ? (
        <WatchlistGrid
          lists={lists}
          onToggle={(id, on) => m.updateWatchlist.mutate({ id, enabled: on }, { onError: failed })}
          onEdit={(w) => canManage && setEditing({ ...w })}
          onNew={() => setEditing(newWatchlist())}
          onShow={(id) => { setWatchlistId(id); setTab('overview'); }}
        />
      ) : null}
      {tab === 'indicators' && !loading && !errored ? <IndicatorList key={focusId ?? 'all'} iocs={iocs} total={iocsQ.data?.total ?? 0} focusId={focusId} onAdd={() => canManage && setAdding(true)} onDelete={canManage ? deleteIoc : undefined} /> : null}

      {editing ? <WatchlistDrawer key={editing.id ?? 'new'} initial={editing} saving={m.createWatchlist.isPending || m.updateWatchlist.isPending} onSave={saveList} onDelete={editing.id ? () => deleteList(editing) : undefined} onClose={() => setEditing(null)} /> : null}
      {adding ? <AddIndicatorsDrawer saving={m.addIocs.isPending} onAdd={addIocs} onClose={() => setAdding(false)} /> : null}
    </div>
  );
}

export default function IntelPage() {
  return (
    <RequirePermission any={[P.INTEL_READ]}>
      <Intel />
    </RequirePermission>
  );
}

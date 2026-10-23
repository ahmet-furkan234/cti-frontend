'use client';

import { useMemo, useState } from 'react';
import { ChannelDrawer, ChannelGrid } from '@/components/alerts/channels';
import { LogFeed } from '@/components/alerts/log';
import { RuleDrawer, RuleList, newDraft, type RuleDraft } from '@/components/alerts/rules';
import { useAuth } from '@/components/auth-provider';
import { PageHeader, RequirePermission } from '@/components/shell/page-guard';
import { LoadError, LoadingRows } from '@/components/shell/query-state';
import { Banner, Button, Icon, Select, Tabs, Tag, TextField, cx } from '@/components/ui';
import { useAlertLog, useAlertMutations, useChannels, useRules } from '@/features/alerts/hooks';
import { toChannel, toLogEntry, toRule } from '@/features/alerts/map';
import { useI18n } from '@/i18n';
import { dayOfMinutesAgo, enabledRules, rulesAtRisk } from '@/lib/alerts';
import { ApiError } from '@/lib/api';
import { useDemo } from '@/lib/demo';
import { PERMISSIONS as P } from '@/lib/permissions';
import type { Channel, ChannelKind } from '@/mocks/alerts';

type TabId = 'rules' | 'channels' | 'log';
type Notice = { tone: 'success' | 'error' | 'warning'; text: string } | null;

function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-line px-6 py-5 last:border-0 sm:border-r sm:border-b-0">
      <span className="text-sm text-ink-muted">{label}</span>
      <span className="text-3xl leading-9 font-semibold tabular-nums">{value}</span>
      {sub ? <span className={cx('text-sm', tone ?? 'text-ink-muted')}>{sub}</span> : null}
    </div>
  );
}

function Alerts() {
  const { t, lang } = useI18n();
  const demo = useDemo();
  const { can } = useAuth();
  const canManage = can(P.ALERT_MANAGE);
  const rulesQ = useRules();
  const channelsQ = useChannels();
  const logQ = useAlertLog();
  const m = useAlertMutations();
  const rules = useMemo(() => (rulesQ.data?.items ?? []).map(toRule), [rulesQ.data]);
  const channels = useMemo(() => (channelsQ.data?.items ?? []).map(toChannel), [channelsQ.data]);
  const log = useMemo(() => (logQ.data?.items ?? []).map(toLogEntry), [logQ.data]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [tab, setTab] = useState<TabId>('rules');
  const [editingRule, setEditingRule] = useState<RuleDraft | null>(null);
  const [editingChannel, setEditingChannel] = useState<Channel | 'new' | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const failed = (e: unknown) =>
    setNotice({ tone: 'error', text: e instanceof ApiError && e.code === 'LOCAL_PREVIEW' ? t('asset.err.demo') : t('common.tryAgainLater') });

  const atRisk = rulesAtRisk(rules, channels);
  const badChannels = channels.filter((c) => c.status !== 'healthy');
  const failingNames = channels.filter((c) => c.status === 'failing' && atRisk.some((r) => r.channelIds.includes(c.id))).map((c) => c.name).join(', ');
  const today = log.filter((e) => dayOfMinutesAgo(e.min) === 'today').length;

  /* rules */
  const saveRule = (d: RuleDraft) => {
    const body = { name: typeof d.name === 'string' ? d.name : d.name[lang], trigger: d.trigger, assetIds: d.assetIds ?? [], envs: d.envs, minRisk: d.minRisk, exposedOnly: d.exposedOnly, tag: d.tag, channelIds: d.channelIds, throttle: d.throttle, enabled: d.enabled };
    const done = { onSuccess: () => { setEditingRule(null); setNotice({ tone: 'success', text: t('alerts.saved') }); }, onError: failed };
    if (d.id) m.updateRule.mutate({ id: d.id, ...body }, done);
    else m.createRule.mutate(body, done);
  };
  const deleteRule = (d: RuleDraft) => {
    if (!d.id || !window.confirm(t('alerts.deleteConfirm', { name: typeof d.name === 'string' ? d.name : d.name[lang] }))) return;
    m.deleteRule.mutate(d.id, { onSuccess: () => setEditingRule(null), onError: failed });
  };
  const testChannels = async (ids: string[]) => {
    let ok = 0;
    let bad = 0;
    for (const id of ids) {
      try {
        if ((await m.testChannel.mutateAsync(id)).ok) ok++;
        else bad++;
      } catch {
        bad++;
      }
    }
    return { ok, bad };
  };

  /* channels */
  const testChannel = (id: string) => {
    const c = channels.find((x) => x.id === id);
    if (!c) return;
    setTesting(id);
    m.testChannel.mutate(id, {
      onSuccess: (res) =>
        setNotice(res.ok ? { tone: 'success', text: t('alerts.ch.testOk', { name: c.name }) } : { tone: 'error', text: t('alerts.ch.testBad', { name: c.name, why: res.why ?? '' }) }),
      onError: failed,
      onSettled: () => setTesting(null),
    });
  };
  const saveChannel = (kind: ChannelKind, name: string, values: Record<string, string>) => {
    const done = { onSuccess: (channel: { id: string }) => { setEditingChannel(null); setEditingRule((draft) => draft ? { ...draft, channelIds: [...new Set([...draft.channelIds, channel.id])] } : null); setNotice({ tone: 'success', text: t('alerts.ch.saved') }); }, onError: failed };
    if (editingChannel && editingChannel !== 'new') m.updateChannel.mutate({ id: editingChannel.id, name, values }, done);
    else m.createChannel.mutate({ kind, name, values }, done);
  };
  const removeChannel = (c: Channel) => {
    if (!window.confirm(t('alerts.ch.removeConfirm', { name: c.name }))) return;
    m.deleteChannel.mutate(c.id, { onSuccess: () => setEditingChannel(null), onError: failed });
  };

  const visibleRules = rules.filter(r => (typeof r.name === 'string' ? r.name : r.name[lang]).toLocaleLowerCase(lang).includes(search.toLocaleLowerCase(lang)) && (status === 'all' || r.enabled === (status === 'active')));
  const actions = canManage ? <><Button icon="link" onClick={() => setEditingChannel('new')}>{t('alerts.integration.add')}</Button><Button variant="primary" icon="plus" onClick={() => setEditingRule(newDraft())}>{t('alerts.rule.new')}</Button></> : undefined;

  return (
    <div className="mx-auto flex w-full max-w-[1400px] min-w-0 grow flex-col gap-5 p-4 md:p-8">
      <PageHeader title={t('alerts.title')} subtitle={t('alerts.subtitle')} actions={<>{demo ? <Tag tone="accent">{t('common.demoData')}</Tag> : null}{actions}</>} />

      <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
        <div className="grid gap-6 p-6 md:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="max-w-2xl"><p className="mb-3 text-xs font-semibold tracking-[0.18em] text-accent">{t('alerts.design.eyebrow')}</p><h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{t('alerts.design.heading')}</h2><p className="mt-3 max-w-xl text-sm leading-6 text-ink-muted">{t('alerts.design.intro')}</p></div>
          <div aria-hidden="true" className="hidden items-center gap-3 lg:flex">{(['assets', 'bell', 'link'] as const).map((icon, i) => <div key={icon} className="flex items-center gap-3">{i > 0 ? <span className="h-px w-8 bg-line-strong" /> : null}<span className={cx('flex size-16 items-center justify-center rounded-2xl border', i === 1 ? 'border-accent/30 bg-accent-soft text-accent' : 'border-line bg-surface-2 text-ink-muted')}><Icon name={icon} size={25} /></span></div>)}</div>
        </div>
      <div className="grid grid-cols-1 border-t border-line bg-surface-2/40 sm:grid-cols-3">
        <Tile label={t('alerts.sum.rules')} value={`${enabledRules(rules)} / ${rules.length}`} />
        <Tile
          label={t('alerts.sum.channels')}
          value={String(channels.length)}
          sub={badChannels.length ? t('alerts.sum.channelsBad', { n: badChannels.length }) : t('alerts.sum.channelsOk')}
          tone={badChannels.length ? 'text-high-ink' : 'text-low-ink'}
        />
        <Tile label={t('alerts.sum.today')} value={String(today)} />
      </div>
      </section>

      {atRisk.length > 0 ? (
        <Banner
          tone="warning"
          title={t('alerts.risk.title', { n: atRisk.length })}
          action={tab !== 'channels' ? <Button size="sm" onClick={() => setTab('channels')}>{t('alerts.risk.fix')}</Button> : undefined}
        >
          {t('alerts.risk.text', { channels: failingNames })}
        </Banner>
      ) : null}
      {notice ? <Banner tone={notice.tone} onDismiss={() => setNotice(null)}>{notice.text}</Banner> : null}

      <Tabs
        label={t('alerts.tabs.label')}
        value={tab}
        onChange={(v) => setTab(v as TabId)}
        items={[
          { id: 'rules', label: t('alerts.tab.rules'), count: rules.length },
          { id: 'channels', label: t('alerts.tab.channels'), count: channels.length },
          { id: 'log', label: t('alerts.tab.log') },
        ]}
      />

      {rulesQ.isError || channelsQ.isError || logQ.isError ? (
        <div className="rounded-xl border border-line bg-surface shadow-card"><LoadError onRetry={() => { void rulesQ.refetch(); void channelsQ.refetch(); void logQ.refetch(); }} /></div>
      ) : rulesQ.isPending || channelsQ.isPending || logQ.isPending ? (
        <div className="rounded-xl border border-line bg-surface shadow-card"><LoadingRows /></div>
      ) : null}

      {tab === 'rules' ? <div className="flex flex-col gap-3 sm:flex-row sm:items-end"><div className="grow"><TextField label={t('alerts.design.search')} value={search} onChange={e => setSearch(e.target.value)} /></div><Select aria-label={t('alerts.design.all')} value={status} onChange={setStatus} options={[{value:'all',label:t('alerts.design.all')},{value:'active',label:t('alerts.design.active')},{value:'paused',label:t('alerts.rule.paused')}]} /></div> : null}
      {tab === 'rules' && rulesQ.isSuccess && rules.length > 0 && !visibleRules.length ? <p className="rounded-xl border border-dashed border-line p-10 text-center text-ink-muted">{t('alerts.design.noResults')}</p> : null}
      {tab === 'rules' && rulesQ.isSuccess && channelsQ.isSuccess && (visibleRules.length > 0 || rules.length === 0) ? (
        <RuleList
          rules={visibleRules}
          channels={channels}
          onToggle={(id, on) => m.updateRule.mutate({ id, enabled: on }, { onError: failed })}
          onEdit={(r) => canManage && setEditingRule({ ...r })}
          onNew={() => setEditingRule(newDraft())}
        />
      ) : null}
      {tab === 'channels' && channelsQ.isSuccess && rulesQ.isSuccess ? (
        <ChannelGrid channels={channels} rules={rules} testing={testing} onTest={testChannel} onEdit={(c) => canManage && setEditingChannel(c)} onAdd={() => setEditingChannel('new')} />
      ) : null}
      {tab === 'log' && logQ.isSuccess ? <LogFeed log={log} rules={rules} channels={channels} /> : null}

      {editingRule && !editingChannel ? (
        <RuleDrawer
          key={editingRule.id ?? 'new'}
          initial={editingRule}
          isNew={!editingRule.id}
          channels={channels}
          saving={m.createRule.isPending || m.updateRule.isPending}
          onAddChannel={(draft) => { setEditingRule(draft); setEditingChannel('new'); }}
          onSave={saveRule}
          onTest={testChannels}
          onDelete={editingRule.id ? () => deleteRule(editingRule) : undefined}
          onClose={() => setEditingRule(null)}
        />
      ) : null}
      {editingChannel ? (
        <ChannelDrawer
          saving={m.createChannel.isPending || m.updateChannel.isPending}
          key={editingChannel === 'new' ? 'new' : editingChannel.id}
          channel={editingChannel === 'new' ? null : editingChannel}
          onSave={saveChannel}
          onRemove={editingChannel === 'new' ? undefined : () => removeChannel(editingChannel)}
          onClose={() => setEditingChannel(null)}
        />
      ) : null}
    </div>
  );
}

export default function AlertsPage() {
  return (
    <RequirePermission any={[P.ALERT_READ]}>
      <Alerts />
    </RequirePermission>
  );
}

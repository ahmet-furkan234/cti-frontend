'use client';

import { useMemo, useState } from 'react';
import { ChannelDrawer, ChannelGrid } from '@/components/alerts/channels';
import { LogFeed } from '@/components/alerts/log';
import { RuleDrawer, RuleList, newDraft, type RuleDraft } from '@/components/alerts/rules';
import { useAuth } from '@/components/auth-provider';
import { PageHeader, RequirePermission } from '@/components/shell/page-guard';
import { LoadError, LoadingRows } from '@/components/shell/query-state';
import { Banner, Button, Tabs, Tag, cx } from '@/components/ui';
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
    <div className="flex flex-col gap-0.5 rounded-xl border border-line bg-surface px-5 py-4 shadow-card">
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
    const body = { name: typeof d.name === 'string' ? d.name : d.name[lang], trigger: d.trigger, envs: d.envs, minRisk: d.minRisk, exposedOnly: d.exposedOnly, tag: d.tag, channelIds: d.channelIds, throttle: d.throttle, enabled: d.enabled };
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
    const done = { onSuccess: () => { setEditingChannel(null); setNotice({ tone: 'success', text: t('alerts.ch.saved') }); }, onError: failed };
    if (editingChannel && editingChannel !== 'new') m.updateChannel.mutate({ id: editingChannel.id, name, values }, done);
    else m.createChannel.mutate({ kind, name, values }, done);
  };
  const removeChannel = (c: Channel) => {
    if (!window.confirm(t('alerts.ch.removeConfirm', { name: c.name }))) return;
    m.deleteChannel.mutate(c.id, { onSuccess: () => setEditingChannel(null), onError: failed });
  };

  const actions = !canManage ? undefined :
    tab === 'rules' ? <Button variant="primary" icon="plus" onClick={() => setEditingRule(newDraft())}>{t('alerts.rule.new')}</Button>
    : tab === 'channels' ? <Button variant="primary" icon="plus" onClick={() => setEditingChannel('new')}>{t('alerts.ch.add')}</Button>
    : undefined;

  return (
    <div className="mx-auto flex w-full max-w-[1100px] min-w-0 grow flex-col gap-5 p-4 md:p-8">
      <PageHeader title={t('alerts.title')} subtitle={t('alerts.subtitle')} actions={<>{demo ? <Tag tone="accent">{t('common.demoData')}</Tag> : null}{actions}</>} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Tile label={t('alerts.sum.rules')} value={`${enabledRules(rules)} / ${rules.length}`} />
        <Tile
          label={t('alerts.sum.channels')}
          value={String(channels.length)}
          sub={badChannels.length ? t('alerts.sum.channelsBad', { n: badChannels.length }) : t('alerts.sum.channelsOk')}
          tone={badChannels.length ? 'text-high-ink' : 'text-low-ink'}
        />
        <Tile label={t('alerts.sum.today')} value={String(today)} />
      </div>

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

      {tab === 'rules' && rulesQ.isSuccess && channelsQ.isSuccess ? (
        <RuleList
          rules={rules}
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

      {editingRule ? (
        <RuleDrawer
          key={editingRule.id ?? 'new'}
          initial={editingRule}
          isNew={!editingRule.id}
          channels={channels}
          saving={m.createRule.isPending || m.updateRule.isPending}
          onSave={saveRule}
          onTest={testChannels}
          onDelete={editingRule.id ? () => deleteRule(editingRule) : undefined}
          onClose={() => setEditingRule(null)}
        />
      ) : null}
      {editingChannel ? (
        <ChannelDrawer
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

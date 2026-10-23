'use client';

import { useState } from 'react';
import { AlertAssetPicker } from './asset-picker';
import { OptionalFields } from '@/components/forms/optional-fields';
import { AlertEditor } from './editor';
import { Card, ChannelStatusPill, KindBadge, ruleName } from '@/components/alerts/shared';
import { Banner, Button, Icon, Select, StateBlock, Switch, Tag, TextField, Toggle, cx } from '@/components/ui';
import { useI18n, type MessageKey, type TFunction } from '@/i18n';
import {
  ENVS, RISK_STEPS, TRIGGERS, TRIGGER_ICON, TRIGGER_THROTTLES, TRIGGER_USES_ASSETS, channelTarget,
} from '@/lib/alerts';
import { useAgeMinutes } from '@/lib/use-age';
import type { Channel, Rule, Throttle, Trigger } from '@/mocks/alerts';

export type RuleDraft = Omit<Rule, 'id' | 'lastFiredMin' | 'fired30'> & { id?: string; scopeMode?: 'all' | 'selected' };

export const newDraft = (): RuleDraft => ({
  name: '', assetIds: [], trigger: 'critical', envs: [], minRisk: 0, exposedOnly: false, tag: '', channelIds: [], throttle: 'asset6h', enabled: true,
});

/** "Ortam: Üretim, Test · risk puanı ≥ 80 · internete açık" */
export function scopeText(t: TFunction, r: Pick<Rule, 'trigger' | 'assetIds' | 'envs' | 'minRisk' | 'exposedOnly' | 'tag'>): string {
  if (!TRIGGER_USES_ASSETS[r.trigger]) return t('alerts.scope.na');
  const parts: string[] = [];
  if (r.assetIds?.length) parts.push(t('alerts.assets.count', { n: r.assetIds.length }));
  if (r.envs.length) parts.push(t('alerts.scope.env', { envs: r.envs.map((e) => t(`env.${e}` as MessageKey)).join(', ') }));
  if (r.minRisk > 0) parts.push(t('alerts.scope.risk', { n: r.minRisk }));
  if (r.exposedOnly) parts.push(t('alerts.scope.exposed'));
  if (r.tag.trim()) parts.push(t('alerts.scope.tag', { tag: r.tag.trim() }));
  return parts.length ? parts.join(' · ') : t('alerts.scope.all');
}

/* ---------- list ---------- */
export function RuleList({
  rules, channels, onToggle, onEdit, onNew,
}: {
  rules: Rule[];
  channels: Channel[];
  onToggle: (id: string, on: boolean) => void;
  onEdit: (rule: Rule) => void;
  onNew: () => void;
}) {
  const { t, lang } = useI18n();
  const ageMin = useAgeMinutes();
  if (rules.length === 0) {
    return (
      <Card>
        <StateBlock kind="empty" title={t('alerts.rule.emptyTitle')} description={t('alerts.rule.emptyDesc')} action={<Button variant="primary" icon="plus" onClick={onNew}>{t('alerts.rule.new')}</Button>} />
      </Card>
    );
  }
  const byId = new Map(channels.map((c) => [c.id, c]));
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {rules.map((r) => {
        const name = ruleName(r, lang);
        const chs = r.channelIds.map((id) => byId.get(id)).filter((c): c is Channel => !!c);
        const broken = r.enabled && chs.some((c) => c.status === 'failing');
        return (
          <Card key={r.id} className={cx('overflow-hidden border-t-2 border-t-accent/40 p-5 md:p-6', !r.enabled && 'bg-surface-2/60')}>
            <div className="flex flex-wrap items-start gap-3">
              <Toggle checked={r.enabled} onChange={(v) => onToggle(r.id, v)} className="mt-1" aria-label={t('alerts.rule.toggle', { name })} />
              <div className={cx('flex min-w-0 grow flex-col gap-2', !r.enabled && 'opacity-70')}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h2 className="text-base font-semibold">{name}</h2>
                  {!r.enabled ? <Tag>{t('alerts.rule.paused')}</Tag> : null}
                  {broken ? <Tag tone="exposed" icon="alert">{t('alerts.rule.channelProblem')}</Tag> : null}
                </div>
                <dl className="m-0 mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 border-y border-line py-4 text-sm">
                  <dt className="text-ink-muted">{t('alerts.when.label')}</dt>
                  <dd className="m-0 flex items-center gap-2"><Icon name={TRIGGER_ICON[r.trigger]} size={15} className="text-ink-subtle" />{t(`alerts.trg.${r.trigger}.when` as MessageKey)}</dd>
                  <dt className="text-ink-muted">{t('alerts.scope.label')}</dt>
                  <dd className="m-0">{scopeText(t, r)}</dd>
                  <dt className="text-ink-muted">{t('alerts.where.label')}</dt>
                  <dd className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1">
                    {chs.map((c) => <span key={c.id} className="inline-flex items-center gap-1.5"><span className={cx('size-2 rounded-full', c.status === 'failing' ? 'bg-critical' : c.status === 'degraded' ? 'bg-medium' : 'bg-low')} aria-hidden="true" />{c.name}</span>)}
                    <span className="text-ink-subtle">· {t(`alerts.thr.${r.throttle}` as MessageKey)}</span>
                  </dd>
                </dl>
                <p className="m-0 mt-2 text-xs text-ink-muted">
                  {r.lastFiredMin == null ? t('alerts.rule.never') : t('alerts.rule.lastFired', { age: ageMin(r.lastFiredMin) })}
                  {r.fired30 > 0 ? ` · ${t('alerts.rule.fired30', { n: r.fired30 })}` : ''}
                </p>
              </div>
              <Button size="sm" onClick={() => onEdit(r)}>{t('alerts.rule.edit')}</Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

/* ---------- editor ---------- */
function Step({ n, title, desc, children }: { n: number; title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-xs font-semibold text-accent">{String(n).padStart(2, '0')}</span>
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          {desc ? <p className="text-sm text-ink-muted">{desc}</p> : null}
        </div>
      </div>
      <div>{children}</div>
    </section>
  );
}

export function RuleDrawer({
  initial, channels, isNew, saving, onSave, onTest, onDelete, onClose, onAddChannel,
}: {
  onAddChannel: (draft: RuleDraft) => void;
  initial: RuleDraft;
  channels: Channel[];
  isNew: boolean;
  saving?: boolean;
  onSave: (draft: RuleDraft) => void;
  /** sends a real test message through the chosen channels */
  onTest: (channelIds: string[]) => Promise<{ ok: number; bad: number }>;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const { t, lang } = useI18n();
  const [d, setD] = useState<RuleDraft>({ ...initial, name: typeof initial.name === 'string' ? initial.name : initial.name[lang] });
  const [scope, setScope] = useState<'all' | 'selected'>(initial.scopeMode ?? (initial.assetIds?.length || isNew ? 'selected' : 'all'));
  const [showErrors, setShowErrors] = useState(false);
  const [tested, setTested] = useState<{ ok: number; bad: number } | null>(null);

  const name = typeof d.name === 'string' ? d.name : '';
  const set = <K extends keyof RuleDraft>(k: K, v: RuleDraft[K]) => setD((cur) => ({ ...cur, [k]: v }));
  const setTrigger = (trigger: Trigger) =>
    setD((cur) => {
      const allowed = TRIGGER_THROTTLES[trigger];
      return { ...cur, trigger, throttle: allowed.includes(cur.throttle) ? cur.throttle : allowed[allowed.length - 1]! };
    });
  const usesAssets = TRIGGER_USES_ASSETS[d.trigger];
  const toggleEnv = (e: string) => set('envs', d.envs.includes(e) ? d.envs.filter((x) => x !== e) : [...d.envs, e]);
  const toggleChannel = (id: string) => set('channelIds', d.channelIds.includes(id) ? d.channelIds.filter((x) => x !== id) : [...d.channelIds, id]);
  const errors = { name: !name.trim(), channel: d.channelIds.length === 0, assets: usesAssets && scope === 'selected' && !d.assetIds?.length };
  const [testing, setTesting] = useState(false);

  const save = () => {
    if (saving) return;
    if (errors.name || errors.channel || errors.assets) return setShowErrors(true);
    onSave({ ...d, assetIds: usesAssets && scope === 'selected' ? d.assetIds : [], name: name.trim(), tag: d.tag.trim() });
  };
  const sendTest = () => {
    setTesting(true);
    void onTest(d.channelIds).then(setTested).finally(() => setTesting(false));
  };

  return (
    <AlertEditor subtitle={t('alerts.design.intro')} summary={<div className="flex flex-col gap-6"><div><p className="text-xs font-semibold uppercase tracking-widest text-accent">{t('alerts.design.summary')}</p><h3 className="mt-3 break-words text-xl font-semibold">{name || t('alerts.design.unnamed')}</h3><p className="mt-2 text-sm text-ink-muted">{t('alerts.design.live')}</p></div><div className="border-t border-line pt-5"><p className="mb-2 text-xs text-ink-muted">{t('alerts.scope.label')}</p><p className="text-sm">{usesAssets && scope === 'selected' && !d.assetIds?.length ? t('alerts.assets.required') : scopeText(t, { ...d, assetIds: scope === 'selected' ? d.assetIds : [] })}</p></div><div><p className="mb-2 text-xs text-ink-muted">{t('alerts.when.label')}</p><p className="text-sm">{t(`alerts.trg.${d.trigger}.when` as MessageKey)}</p></div><div><p className="mb-2 text-xs text-ink-muted">{t('alerts.where.label')}</p><div className="flex flex-wrap gap-2">{channels.filter(c => d.channelIds.includes(c.id)).map(c => <Tag key={c.id}>{c.name}</Tag>)}{!d.channelIds.length ? <p className="text-sm text-ink-muted">{t('alerts.design.noChannel')}</p> : null}</div></div><p className="text-sm text-ink-muted">{t(`alerts.thr.${d.throttle}` as MessageKey)}</p></div>} title={t(isNew ? 'alerts.new.title' : 'alerts.edit.title')} onClose={onClose}
      footer={
        <>
          {onDelete ? <Button variant="danger" icon="trash" onClick={onDelete}>{t('alerts.delete')}</Button> : null}
          <span className="grow" />
          <Button variant="ghost" loading={testing} disabled={d.channelIds.length === 0} onClick={sendTest}>{t('alerts.testSend')}</Button>
          <Button variant="primary" icon="check" loading={saving} type="submit" form="rule-form">{t('alerts.save')}</Button>
        </>
      }
    >
      <form id="rule-form" onSubmit={(e) => { e.preventDefault(); save(); }} className="flex flex-col gap-4">
        <Step n={1} title={t('alerts.assets.title')}>
          {usesAssets ? <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface-2/40 p-4">
            <div className="flex gap-2">
              {(['selected', 'all'] as const).map((mode) => <Button key={mode} variant={scope === mode ? 'primary' : 'ghost'} aria-pressed={scope === mode} onClick={() => setScope(mode)}>{t(mode === 'all' ? 'alerts.assets.all' : 'alerts.assets.choose')}</Button>)}
            </div>
            {scope === 'selected' ? <AlertAssetPicker value={d.assetIds ?? []} onChange={(ids) => set('assetIds', ids)} /> : <p className="text-sm text-ink-muted">{t('alerts.scope.all')}</p>}
            {showErrors && errors.assets ? <p role="alert" className="text-sm text-critical-ink">{t('alerts.assets.required')}</p> : null}
          </div> : <Banner tone="info">{t('alerts.assets.global')}</Banner>}
        </Step>
        <Step n={2} title={t('alerts.design.condition')}>
        <TextField
          label={t('alerts.f.name')}
          hint={t('alerts.f.name.hint')}
          error={showErrors && errors.name ? t('alerts.err.name') : undefined}
          value={name}
          onChange={(e) => set('name', e.target.value)}
        />

        <div className="mt-5 flex flex-col gap-3">
          <span className="text-sm font-medium">{t('alerts.step.when')}</span>
          <div className="grid gap-2 sm:grid-cols-2">{TRIGGERS.map(id => <button key={id} type="button" aria-pressed={d.trigger === id} onClick={() => setTrigger(id)} className={cx('flex items-center gap-3 rounded-xl border p-3 text-left text-sm transition-colors', d.trigger === id ? 'border-accent bg-accent-soft' : 'border-line hover:bg-surface-2')}><Icon name={TRIGGER_ICON[id]} size={18} /><span className="grow">{t(`alerts.trg.${id}` as MessageKey)}</span>{d.trigger === id ? <Icon name="check" /> : null}</button>)}</div>
          <p className="text-sm text-ink-muted">{t(`alerts.trg.${d.trigger}.desc` as MessageKey)}</p>
        </div>

        {usesAssets ? (
          <OptionalFields title={t('alerts.assets.filters')} description={t('alerts.assets.filterHint')} defaultOpen={initial.envs.length > 0 || initial.minRisk > 0 || initial.exposedOnly || !!initial.tag}>
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">{t('alerts.f.env')}</span>
                <div className="flex flex-wrap gap-2">
                  {ENVS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      aria-pressed={d.envs.includes(e)}
                      onClick={() => toggleEnv(e)}
                      className={cx('h-9 rounded-full border px-3.5 text-sm font-medium transition-colors', d.envs.includes(e) ? 'border-transparent bg-accent text-on-accent' : 'border-line-strong bg-surface text-ink-muted hover:text-ink')}
                    >
                      {t(`env.${e}` as MessageKey)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">{t('alerts.f.minRisk')}</span>
                  <Select
                    aria-label={t('alerts.f.minRisk')}
                    value={String(d.minRisk)}
                    onChange={(v) => set('minRisk', Number(v))}
                    options={RISK_STEPS.map((n) => ({ value: String(n), label: n === 0 ? t('alerts.risk.any') : t('alerts.risk.min', { n }) }))}
                  />
                </div>
                <TextField label={t('alerts.f.tag')} hint={t('alerts.f.tag.hint')} value={d.tag} onChange={(e) => set('tag', e.target.value)} />
              </div>
              <Switch checked={d.exposedOnly} onChange={(v) => set('exposedOnly', v)} label={t('alerts.f.exposed')} />
            </div>
          </OptionalFields>
        ) : null}

        </Step>
        <Step n={3} title={t('alerts.design.delivery')}>
          <Button icon="plus" className="mb-3" onClick={() => onAddChannel({ ...d, scopeMode: scope, assetIds: scope === 'selected' ? d.assetIds : [] })}>{t('alerts.integration.add')}</Button>
          <div role="group" aria-label={t('alerts.step.where')} className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {channels.map((c) => {
              const on = d.channelIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleChannel(c.id)}
                  className={cx('flex items-center gap-3 rounded-xl border p-3 text-left transition-colors', on ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:border-line-strong')}
                >
                  <KindBadge kind={c.kind} size={36} />
                  <span className="flex min-w-0 grow flex-col">
                    <span className="truncate font-medium">{c.name}</span>
                    <span className="truncate text-sm text-ink-muted">{channelTarget(c)}</span>
                  </span>
                  {c.status !== 'healthy' ? <ChannelStatusPill status={c.status} /> : null}
                  <span className={cx('inline-flex size-5 shrink-0 items-center justify-center rounded border', on ? 'border-accent bg-accent text-on-accent' : 'border-line-control')}>
                    {on ? <Icon name="check" size={13} strokeWidth={2.5} /> : null}
                  </span>
                </button>
              );
            })}
          </div>
          {channels.length === 0 ? <Banner tone="info">{t('form.channels.empty')}</Banner> : null}
          {showErrors && errors.channel ? <p role="alert" className="mt-2 flex items-center gap-1 text-sm text-critical-ink"><Icon name="alert" size={14} />{t('alerts.err.channel')}</p> : null}

        <div className="mt-5 flex flex-col gap-1.5">
          <span className="text-sm font-medium">{t('alerts.step.how')}</span>
          <Select aria-label={t('alerts.step.how')} value={d.throttle} onChange={(v) => set('throttle', v as Throttle)} options={TRIGGER_THROTTLES[d.trigger].map((th) => ({ value: th, label: t(`alerts.thr.${th}` as MessageKey) }))} />
        </div>

        </Step>
        {tested ? <Banner tone={tested.bad ? 'warning' : 'success'}>{t('alerts.testResult', { ok: tested.ok, bad: tested.bad })}</Banner> : null}
      </form>
    </AlertEditor>
  );
}


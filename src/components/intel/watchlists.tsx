'use client';

import { useState } from 'react';
import { Drawer } from '@/components/admin/admin-parts';
import { TagInput } from '@/components/intel/tag-input';
import { Button, Icon, Select, StateBlock, Switch, TextField, Toggle, cx } from '@/components/ui';
import { useI18n, type TFunction } from '@/i18n';
import { hasTarget } from '@/lib/intel';
import { useChannels } from '@/features/alerts/hooks';
import type { Watchlist } from '@/mocks/intel';

export type WatchlistDraft = Omit<Watchlist, 'id' | 'count' | 'hits'> & { id?: string };
export const newWatchlist = (): WatchlistDraft => ({ name: '', vendors: [], products: [], tag: '', minCvss: 0, kevOnly: false, minEpss: 0, channelId: null, enabled: true });

const CVSS_STEPS = [0, 4, 7, 9];
const EPSS_STEPS = [0, 10, 30, 50];

/** What a list follows, in plain words ("Üretici: Fortinet · yalnızca aktif istismar edilenler"). */
export function ruleLines(t: TFunction, w: Pick<Watchlist, 'vendors' | 'products' | 'tag' | 'minCvss' | 'kevOnly' | 'minEpss'>): string[] {
  const what: string[] = [];
  if (w.vendors.length) what.push(t('intel.wl.vendors', { list: w.vendors.join(', ') }));
  if (w.products.length) what.push(t('intel.wl.products', { list: w.products.join(', ') }));
  if (w.tag.trim()) what.push(t('intel.wl.tag', { tag: w.tag.trim() }));
  const filters: string[] = [];
  if (w.kevOnly) filters.push(t('intel.wl.kev'));
  if (w.minCvss > 0) filters.push(t('intel.wl.cvss', { n: w.minCvss }));
  if (w.minEpss > 0) filters.push(t('intel.wl.epss', { n: w.minEpss }));
  return [what.join(' · '), filters.join(' · ')].filter(Boolean);
}

export function WatchlistGrid({ lists, onToggle, onEdit, onNew }: {
  lists: Watchlist[];
  onToggle: (id: string, on: boolean) => void;
  onEdit: (w: Watchlist) => void;
  onNew: () => void;
}) {
  const { t, locale } = useI18n();
  if (lists.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-surface shadow-card">
        <StateBlock kind="empty" title={t('intel.wl.emptyTitle')} description={t('intel.wl.emptyDesc')} action={<Button variant="primary" icon="plus" onClick={onNew}>{t('intel.wl.new')}</Button>} />
      </div>
    );
  }
  const channels = useChannels().data?.items ?? [];
  const channelName = (id: string | null) => channels.find((c) => c.id === id)?.name;
  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 text-[15px] text-ink-muted">{t('intel.wl.hint')}</p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {lists.map((w) => {
          const lines = ruleLines(t, w);
          const ch = channelName(w.channelId);
          return (
            <section key={w.id} className={cx('flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-surface p-5 shadow-card', !w.enabled && 'bg-surface-2/60')}>
              <div className="flex items-start gap-3">
                <Toggle checked={w.enabled} onChange={(v) => onToggle(w.id, v)} className="mt-0.5" aria-label={t('intel.wl.toggle', { name: w.name })} />
                <h2 className={cx('min-w-0 grow truncate text-base font-semibold', !w.enabled && 'text-ink-muted')}>{w.name}</h2>
                {w.enabled && w.hits > 0 ? (
                  <span className="shrink-0 rounded-full bg-critical-soft px-2.5 py-0.5 text-sm font-semibold text-critical-ink">{t('intel.wl.newHits', { n: w.hits })}</span>
                ) : null}
              </div>
              <div className={cx('flex flex-col gap-0.5 text-[15px]', !w.enabled && 'opacity-70')}>
                {lines.map((l, i) => <span key={i} className={i === 0 ? 'text-ink' : 'text-ink-muted'}>{l}</span>)}
              </div>
              <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-3 text-sm text-ink-muted">
                <span>{t('intel.wl.assets', { n: w.count.toLocaleString(locale) })}</span>
                <span aria-hidden="true">·</span>
                <span>{ch ? t('intel.wl.notify', { channel: ch }) : t('intel.wl.noChannel')}</span>
                <span className="grow" />
                <Button size="sm" variant="ghost" onClick={() => onEdit(w)}>{t('intel.wl.edit')}</Button>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export function WatchlistDrawer({ initial, saving, onSave, onDelete, onClose }: {
  initial: WatchlistDraft;
  saving?: boolean;
  onSave: (d: WatchlistDraft) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const channels = useChannels().data?.items ?? [];
  const { t } = useI18n();
  const [d, setD] = useState<WatchlistDraft>(initial);
  const [showErrors, setShowErrors] = useState(false);
  const set = <K extends keyof WatchlistDraft>(k: K, v: WatchlistDraft[K]) => setD((c) => ({ ...c, [k]: v }));
  const errors = { name: !d.name.trim(), target: !hasTarget(d) };

  const save = () => {
    if (errors.name || errors.target) return setShowErrors(true);
    onSave({ ...d, name: d.name.trim(), tag: d.tag.trim() });
  };

  return (
    <Drawer wide title={t(initial.id ? 'intel.wl.editTitle' : 'intel.wl.new')} onClose={onClose}
      footer={
        <>
          {onDelete ? <Button variant="danger" icon="trash" onClick={onDelete}>{t('intel.wl.delete')}</Button> : null}
          <span className="grow" />
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" icon="check" loading={saving} onClick={save}>{t('intel.wl.save')}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-7">
        <TextField label={t('intel.wl.f.name')} hint={t('intel.wl.f.name.hint')} error={showErrors && errors.name ? t('intel.wl.err.name') : undefined} value={d.name} onChange={(e) => set('name', e.target.value)} autoFocus={!initial.id} />

        <section className="flex flex-col gap-3">
          <div>
            <h3 className="text-base font-semibold">{t('intel.wl.step.what')}</h3>
            <p className="text-sm text-ink-muted">{t('intel.wl.step.what.desc')}</p>
          </div>
          {showErrors && errors.target ? <p role="alert" className="m-0 flex items-center gap-1 text-sm text-critical-ink"><Icon name="alert" size={14} />{t('intel.wl.err.target')}</p> : null}
          <TagInput label={t('intel.wl.f.vendors')} placeholder={t('intel.wl.f.vendors.hint')} value={d.vendors} onChange={(v) => set('vendors', v)} />
          <TagInput label={t('intel.wl.f.products')} placeholder={t('intel.wl.f.products.hint')} value={d.products} onChange={(v) => set('products', v)} />
          <TextField label={t('intel.wl.f.tag')} hint={t('intel.wl.f.tag.hint')} value={d.tag} onChange={(e) => set('tag', e.target.value)} />
        </section>

        <section className="flex flex-col gap-4">
          <h3 className="text-base font-semibold">{t('intel.wl.step.which')}</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">{t('intel.wl.f.cvss')}</span>
              <Select aria-label={t('intel.wl.f.cvss')} value={String(d.minCvss)} onChange={(v) => set('minCvss', Number(v))} options={CVSS_STEPS.map((n) => ({ value: String(n), label: n === 0 ? t('intel.wl.cvss.any') : t('intel.wl.cvss.min', { n }) }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">{t('intel.wl.f.epss')}</span>
              <Select aria-label={t('intel.wl.f.epss')} value={String(d.minEpss)} onChange={(v) => set('minEpss', Number(v))} options={EPSS_STEPS.map((n) => ({ value: String(n), label: n === 0 ? t('intel.wl.epss.any') : t('intel.wl.epss.min', { n }) }))} />
            </div>
          </div>
          <Switch checked={d.kevOnly} onChange={(v) => set('kevOnly', v)} label={t('intel.wl.f.kev')} />
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-base font-semibold">{t('intel.wl.step.notify')}</h3>
          <Select
            aria-label={t('intel.wl.step.notify')}
            value={d.channelId ?? ''}
            onChange={(v) => set('channelId', v || null)}
            options={[{ value: '', label: t('intel.wl.channel.none') }, ...channels.map((c) => ({ value: c.id, label: c.name }))]}
          />
        </section>
      </div>

    </Drawer>
  );
}


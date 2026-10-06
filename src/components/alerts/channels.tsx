'use client';

import { useState } from 'react';
import { Drawer } from '@/components/admin/admin-parts';
import { Card, ChannelStatusPill, KindBadge } from '@/components/alerts/shared';
import { Banner, Button, StateBlock, TextField, cx } from '@/components/ui';
import { useI18n, type MessageKey } from '@/i18n';
import { CHANNEL_KINDS, CHANNEL_KIND_ORDER, channelTarget } from '@/lib/alerts';
import { useAgeMinutes } from '@/lib/use-age';
import type { Channel, ChannelKind, Rule } from '@/mocks/alerts';

export function ChannelGrid({
  channels, rules, testing, onTest, onEdit, onAdd,
}: {
  channels: Channel[];
  rules: Rule[];
  testing: string | null;
  onTest: (id: string) => void;
  onEdit: (c: Channel) => void;
  onAdd: () => void;
}) {
  const { t, lang } = useI18n();
  const ageMin = useAgeMinutes();
  if (channels.length === 0) {
    return <Card><StateBlock kind="empty" title={t('alerts.tab.channels')} action={<Button variant="primary" icon="plus" onClick={onAdd}>{t('alerts.ch.add')}</Button>} /></Card>;
  }
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {channels.map((c) => {
        const used = rules.filter((r) => r.channelIds.includes(c.id)).length;
        return (
          <Card key={c.id} className={cx('flex flex-col gap-4 p-5', c.status === 'failing' && 'border-critical/40')}>
            <div className="flex items-start gap-3">
              <KindBadge kind={c.kind} />
              <div className="min-w-0 grow">
                <h2 className="truncate text-base font-semibold">{c.name}</h2>
                <p className="m-0 truncate text-sm text-ink-muted">{channelTarget(c) || '—'}</p>
              </div>
              <ChannelStatusPill status={c.status} />
            </div>
            {c.problem ? <p className={cx('m-0 rounded-lg px-3 py-2 text-sm', c.status === 'failing' ? 'bg-critical-soft text-critical-ink' : 'bg-medium-soft text-medium-ink')}>{c.problem[lang]}</p> : null}
            <p className="m-0 text-sm text-ink-muted">
              {used > 0 ? t('alerts.ch.usedBy', { n: used }) : t('alerts.ch.unused')}
              {' · '}
              {c.lastTestMin == null ? t('alerts.ch.neverTested') : t('alerts.ch.lastTest', { age: ageMin(c.lastTestMin) })}
            </p>
            <div className="mt-auto flex gap-2">
              <Button size="sm" loading={testing === c.id} onClick={() => onTest(c.id)}>{testing === c.id ? t('alerts.ch.testing') : t('alerts.ch.test')}</Button>
              <Button size="sm" variant="ghost" onClick={() => onEdit(c)}>{t('alerts.ch.settings')}</Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export function ChannelDrawer({
  channel, onSave, onRemove, onClose,
}: {
  /** null = adding a new channel (the kind is picked first) */
  channel: Channel | null;
  onSave: (kind: ChannelKind, name: string, values: Record<string, string>) => void;
  onRemove?: () => void;
  onClose: () => void;
}) {
  const { t, lang } = useI18n();
  const [kind, setKind] = useState<ChannelKind | null>(channel?.kind ?? null);
  const [name, setName] = useState(channel?.name ?? '');
  const [values, setValues] = useState<Record<string, string>>(channel?.values ?? {});
  const [showErrors, setShowErrors] = useState(false);

  const pick = (k: ChannelKind) => {
    setKind(k);
    setName((n) => n || t(`alerts.ch.kind.${k}` as MessageKey));
  };

  if (!kind) {
    return (
      <Drawer title={t('alerts.ch.add')} onClose={onClose}>
        <p className="text-[15px] text-ink-muted">{t('alerts.ch.pick')}</p>
        <div className="flex flex-col gap-3">
          {CHANNEL_KIND_ORDER.map((k) => (
            <button key={k} type="button" onClick={() => pick(k)} className="flex items-center gap-4 rounded-xl border border-line bg-surface p-4 text-left transition-colors hover:border-accent hover:bg-accent-soft">
              <KindBadge kind={k} size={44} />
              <span className="flex flex-col">
                <span className="font-semibold">{t(`alerts.ch.kind.${k}` as MessageKey)}</span>
                <span className="text-sm text-ink-muted">{t(`alerts.ch.kind.${k}.desc` as MessageKey)}</span>
              </span>
            </button>
          ))}
        </div>
      </Drawer>
    );
  }

  const spec = CHANNEL_KINDS[kind];
  const missing = spec.fields.filter((f) => f.required && !(values[f.id] ?? '').trim());
  const save = () => {
    if (!name.trim() || missing.length > 0) return setShowErrors(true);
    onSave(kind, name.trim(), values);
  };

  return (
    <Drawer title={channel ? channel.name : t(`alerts.ch.kind.${kind}` as MessageKey)} onClose={onClose}>
      {channel?.problem ? <Banner tone={channel.status === 'failing' ? 'error' : 'warning'}>{channel.problem[lang]}</Banner> : null}
      <p className="text-[15px] text-ink-muted">{t(`alerts.ch.kind.${kind}.desc` as MessageKey)}</p>
      <div className="flex flex-col gap-4">
        <TextField label={t('alerts.ch.name')} value={name} onChange={(e) => setName(e.target.value)} error={showErrors && !name.trim() ? t('alerts.err.name') : undefined} />
        {spec.fields.map((f) => (
          <TextField
            key={f.id}
            label={t(`alerts.chf.${kind}.${f.id}` as MessageKey)}
            type={f.secret ? 'password' : 'text'}
            mono={f.mono}
            autoComplete="off"
            hint={f.secret ? t('alerts.ch.secretHint') : undefined}
            error={showErrors && missing.some((m) => m.id === f.id) ? t('alerts.err.name') : undefined}
            value={values[f.id] ?? ''}
            onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))}
          />
        ))}
      </div>
      <div className="sticky bottom-0 -mx-6 -mb-6 mt-auto flex items-center gap-2 border-t border-line bg-surface px-6 py-4">
        {onRemove ? <Button variant="danger" icon="trash" onClick={onRemove}>{t('alerts.ch.remove')}</Button> : null}
        <span className="grow" />
        <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="primary" icon="check" onClick={save}>{t('alerts.ch.save')}</Button>
      </div>
    </Drawer>
  );
}

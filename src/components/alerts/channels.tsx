'use client';

import { useRef, useState } from 'react';
import { OptionalFields } from '@/components/forms/optional-fields';
import { Drawer } from '@/components/admin/admin-parts';
import { Card, ChannelStatusPill, KindBadge } from '@/components/alerts/shared';
import { Banner, Button, Select, StateBlock, TextField, cx } from '@/components/ui';
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
  channel, onSave, onRemove, onClose, saving,
}: {
  /** null = adding a new channel */
  channel: Channel | null;
  saving?: boolean;
  onSave: (kind: ChannelKind, name: string, values: Record<string, string>) => void;
  onRemove?: () => void;
  onClose: () => void;
}) {
  const { t, lang } = useI18n();
  const [kind, setKind] = useState<ChannelKind>(channel?.kind ?? 'webhook');
  const [name, setName] = useState(channel?.name ?? '');
  const [values, setValues] = useState<Record<string, string>>(channel?.values ?? {});
  const [showErrors, setShowErrors] = useState(false);

  const drafts = useRef<Partial<Record<ChannelKind, Record<string, string>>>>({});
  const pick = (next: ChannelKind) => {
    drafts.current[kind] = values;
    setKind(next);
    setValues(drafts.current[next] ?? (next === 'smtp' ? { port: '587' } : {}));
    setShowErrors(false);
  };

  const spec = CHANNEL_KINDS[kind];
  const missing = spec.fields.filter((f) => f.required && !(values[f.id] ?? '').trim());
  const save = () => {
    if (saving) return;
    if (!name.trim() || missing.length > 0) return setShowErrors(true);
    onSave(kind, name.trim(), values);
  };

  return (
    <Drawer medium title={channel ? channel.name : t('alerts.ch.add')} onClose={onClose}
      footer={
        <>
          {onRemove ? <Button variant="danger" icon="trash" onClick={onRemove}>{t('alerts.ch.remove')}</Button> : null}
          <span className="grow" />
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" icon="check" type="submit" form="channel-form" loading={saving}>{t('alerts.ch.save')}</Button>
        </>
      }
    >
      {channel?.problem ? <Banner tone={channel.status === 'failing' ? 'error' : 'warning'}>{channel.problem[lang]}</Banner> : null}
      <p className="text-[15px] text-ink-muted">{t(`alerts.ch.kind.${kind}.desc` as MessageKey)}</p>
      <form id="channel-form" onSubmit={(e) => { e.preventDefault(); save(); }} className="flex flex-col gap-4">
        {!channel ? <Select aria-label={t('alerts.ch.pick')} disabled={saving} value={kind} onChange={(v) => pick(v as ChannelKind)} options={CHANNEL_KIND_ORDER.map((k) => ({ value: k, label: t(`alerts.ch.kind.${k}` as MessageKey) }))} /> : null}
        <TextField autoFocus={!channel} disabled={saving} label={t('alerts.ch.name')} value={name} onChange={(e) => setName(e.target.value)} error={showErrors && !name.trim() ? t('alerts.err.name') : undefined} />
        {spec.fields.filter((f) => f.required).map((f) => (
          <TextField
            key={f.id}
            disabled={saving}
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
        {spec.fields.some((f) => !f.required) ? <OptionalFields key={kind} title={t('form.advanced')} defaultOpen={spec.fields.some((f) => !f.required && !!values[f.id])}>
          {spec.fields.filter((f) => !f.required).map((f) => <TextField key={f.id} label={t(`alerts.chf.${kind}.${f.id}` as MessageKey)} type={f.secret ? 'password' : 'text'} autoComplete="off" mono={f.mono} value={values[f.id] ?? ''} onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))} />)}
        </OptionalFields> : null}
      </form>
    </Drawer>
  );
}

'use client';

import { Fragment, useState } from 'react';
import { BADGE, Details } from '@/components/admin/activity-feed';
import { Icon, cx } from '@/components/ui';
import { useI18n, type MessageKey } from '@/i18n';
import { categoryOf, iconOf, isAlerting, groupByDay } from '@/lib/activity';
import { actorOf, targetOf } from '@/lib/audit';
import { formatTime } from '@/lib/format';
import type { AuditEntry } from '@/lib/types';

const ACTOR = '\u0000';
const TARGET = '\u0001';

/** One event as a sentence, with the person and the thing it was done to in bold. */
function Sentence({ entry }: { entry: AuditEntry }) {
  const { t } = useI18n();
  const actor = actorOf(entry) ?? (entry.action.startsWith('auth.') ? t('auditlog.unknown') : t('auditlog.nobody'));
  const named = targetOf(entry);
  const target =
    entry.action.startsWith('role.')
      ? named ? t('auditlog.roleNamed', { name: named }) : t('auditlog.aRole')
      : named ?? t('auditlog.aUser');
  const key = `auditlog.s.${entry.action}` as MessageKey;
  const raw = t(key, { actor: ACTOR, target: TARGET });
  if (raw === key) return <>{entry.action}</>;
  return (
    <>
      {raw.split(/([\u0000\u0001])/).map((part, i) =>
        part === ACTOR ? <strong key={i} className="font-semibold">{actor}</strong>
        : part === TARGET ? <strong key={i} className="font-semibold">{target}</strong>
        : <Fragment key={i}>{part}</Fragment>,
      )}
    </>
  );
}

function Row({ entry }: { entry: AuditEntry }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const tone = isAlerting(entry.action) ? 'alert' : categoryOf(entry.action);
  return (
    <li className="flex gap-4 border-b border-line py-4 last:border-b-0">
      <span className={cx('inline-flex size-10 shrink-0 items-center justify-center rounded-full', BADGE[tone])}><Icon name={iconOf(entry.action)} size={18} /></span>
      <div className="min-w-0 grow">
        <div className="flex items-start gap-3">
          <p className="m-0 grow pt-2 text-[15px] text-ink"><Sentence entry={entry} /></p>
          <time dateTime={entry.at} className="shrink-0 pt-2.5 text-sm text-ink-muted tabular-nums">{formatTime(entry.at)}</time>
        </div>
        <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="mt-0.5 inline-flex items-center gap-1 rounded text-sm text-ink-subtle hover:text-ink">
          {entry.ip ?? '—'} · {open ? t('activity.hideDetails') : t('activity.details')}
          <Icon name={open ? 'up' : 'down'} size={13} />
        </button>
        {open ? <Details entry={entry} t={t} /> : null}
      </div>
    </li>
  );
}

/** Day-by-day list of audit events across the whole workspace. */
export function AuditFeed({ items }: { items: AuditEntry[] }) {
  const { t } = useI18n();
  const groups = groupByDay(items);
  return (
    <div className="px-5">
      {groups.map((g) => (
        <section key={g.day} aria-label={g.day} className="border-b border-line py-5 last:border-b-0">
          <h3 className="mb-1 text-sm font-semibold text-ink-muted">{g.day === 'today' || g.day === 'yesterday' ? t(`activity.day.${g.day}`) : g.day}</h3>
          <ul className="m-0 list-none p-0">{g.items.map((e) => <Row key={e.id} entry={e} />)}</ul>
        </section>
      ))}
    </div>
  );
}

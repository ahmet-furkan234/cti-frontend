'use client';

import { Fragment, useMemo, useState } from 'react';
import { Banner, Button, Icon, Skeleton, StateBlock, cx } from '@/components/ui';
import { useAuth } from '@/components/auth-provider';
import { useAudit } from '@/features/admin/hooks';
import { useI18n, type MessageKey, type TFunction } from '@/i18n';
import { categoryOf, groupByDay, iconOf, isAlerting, matchesFilter, summarize, type ActivityCategory, type ActivityFilter } from '@/lib/activity';
import { formatDate, formatTime } from '@/lib/format';
import { PERMISSIONS as P } from '@/lib/permissions';
import { useAge } from '@/lib/use-age';
import type { AuditEntry } from '@/lib/types';

const FILTERS: ActivityFilter[] = ['all', 'account', 'access', 'security'];

export const BADGE: Record<ActivityCategory | 'alert', string> = {
  account: 'bg-low-soft text-low-ink',
  access: 'bg-accent-soft text-accent',
  security: 'bg-high-soft text-high-ink',
  alert: 'bg-critical-soft text-critical-ink',
  other: 'bg-surface-2 text-ink-muted',
};

/** The sentence for one event, with the person who did it in bold. */
function Sentence({ entry, userId }: { entry: AuditEntry; userId: string }) {
  const { t } = useI18n();
  const actorText = entry.actorId === userId ? t('activity.you') : entry.actorEmail ?? t('activity.system');
  const name = typeof entry.meta?.['name'] === 'string' ? (entry.meta['name'] as string) : null;
  const role = name ? t('activity.roleNamed', { name }) : t('activity.roleUnnamed');
  const key = `activity.${entry.action}` as MessageKey;
  const raw = t(key, { actor: '\u0000', role });
  if (raw === key) return <>{entry.action}</>;
  const parts = raw.split('\u0000');
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {part}
          {i < parts.length - 1 ? <strong className="font-semibold">{actorText}</strong> : null}
        </Fragment>
      ))}
    </>
  );
}

export function Details({ entry, t }: { entry: AuditEntry; t: TFunction }) {
  const meta = Object.entries(entry.meta ?? {}).filter(([k]) => k !== 'demo');
  const rows: [string, string][] = [
    [t('activity.time'), `${formatDate(entry.at)} ${formatTime(entry.at)}`],
    [t('activity.ip'), entry.ip ?? '—'],
    [t('activity.event'), entry.action],
    ...meta.map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)] as [string, string]),
  ];
  return (
    <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-lg bg-surface-2 px-4 py-3 text-sm">
      {rows.map(([k, v]) => (
        <Fragment key={k}>
          <dt className="text-ink-muted">{k}</dt>
          <dd className="m-0 min-w-0 font-mono break-all">{v}</dd>
        </Fragment>
      ))}
    </dl>
  );
}

function Event({ entry, userId, last }: { entry: AuditEntry; userId: string; last: boolean }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const tone = isAlerting(entry.action) ? 'alert' : categoryOf(entry.action);
  return (
    <li className="flex gap-4">
      <div className="flex flex-col items-center">
        <span className={cx('inline-flex size-9 shrink-0 items-center justify-center rounded-full', BADGE[tone])}>
          <Icon name={iconOf(entry.action)} size={16} />
        </span>
        {!last ? <span aria-hidden="true" className="my-1 w-px grow bg-line" /> : null}
      </div>
      <div className={cx('min-w-0 grow', last ? 'pb-1' : 'pb-5')}>
        <div className="flex items-start gap-3">
          <p className="m-0 grow pt-1.5 text-[15px] text-ink"><Sentence entry={entry} userId={userId} /></p>
          <time dateTime={entry.at} className="shrink-0 pt-2 text-sm text-ink-muted tabular-nums">{formatTime(entry.at)}</time>
        </div>
        <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="mt-0.5 inline-flex items-center gap-1 rounded text-sm text-ink-subtle hover:text-ink">
          {open ? t('activity.hideDetails') : t('activity.details')}
          <Icon name={open ? 'up' : 'down'} size={13} />
        </button>
        {open ? <Details entry={entry} t={t} /> : null}
      </div>
    </li>
  );
}

function SummaryTile({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border border-line bg-surface px-4 py-3 shadow-card">
      <span className="text-sm text-ink-muted">{label}</span>
      <span className={cx('text-xl font-semibold tabular-nums', tone)}>{value}</span>
    </div>
  );
}

/** What happened around one user: sign-ins, access changes and security events as a day-by-day timeline. */
export function ActivityFeed({ userId }: { userId: string }) {
  const { t } = useI18n();
  const { can } = useAuth();
  const age = useAge();
  const allowed = can(P.AUDIT_READ);
  const audit = useAudit({ targetId: userId }, allowed);
  const [filter, setFilter] = useState<ActivityFilter>('all');

  const items = useMemo(() => audit.data?.pages.flatMap((p) => p.items) ?? [], [audit.data]);
  const summary = useMemo(() => summarize(items, userId), [items, userId]);
  const groups = useMemo(() => groupByDay(items.filter((e) => matchesFilter(e, filter))), [items, filter]);

  if (!allowed) {
    return <div className="rounded-xl border border-line bg-surface shadow-card"><StateBlock kind="forbidden" compact title={t('ud.activity.noAccess')} /></div>;
  }
  if (audit.isError) {
    return (
      <div className="rounded-xl border border-line bg-surface shadow-card">
        <StateBlock kind="error" compact title={t('common.loadError')} description={t('common.tryAgainLater')} action={<Button size="sm" onClick={() => void audit.refetch()}>{t('common.retry')}</Button>} />
      </div>
    );
  }
  if (audit.isPending) {
    return <div className="flex max-w-[760px] flex-col gap-4"><Skeleton lines={3} height={14} /><Skeleton lines={3} height={14} /></div>;
  }
  if (items.length === 0) {
    return <div className="rounded-xl border border-line bg-surface shadow-card"><StateBlock kind="empty" compact title={t('ud.activity.empty')} /></div>;
  }

  return (
    <div className="flex max-w-[760px] flex-col gap-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryTile label={t('activity.sum.lastSignIn')} value={summary.lastSignIn ? age(summary.lastSignIn) : t('activity.sum.none')} />
        <SummaryTile label={t('activity.sum.failed')} value={String(summary.failedSignIns)} tone={summary.failedSignIns > 0 ? 'text-high-ink' : undefined} />
        <SummaryTile label={t('activity.sum.changes')} value={String(summary.accessChanges)} />
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label={t('activity.title')}>
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className={cx('h-9 rounded-full border px-3.5 text-sm font-medium transition-colors', filter === f ? 'border-transparent bg-accent text-on-accent' : 'border-line-strong bg-surface text-ink-muted hover:text-ink')}
          >
            {t(`activity.f.${f}` as MessageKey)}
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <Banner tone="info">{t('activity.noMatch')}{audit.hasNextPage ? ` ${t('activity.noMatchMore')}` : ''}</Banner>
      ) : (
        <div className="rounded-xl border border-line bg-surface px-5 shadow-card">
          {groups.map((g) => (
            <section key={g.day} aria-label={g.day} className="border-b border-line py-5 last:border-b-0">
              <h3 className="mb-4 text-sm font-semibold text-ink-muted">{g.day === 'today' || g.day === 'yesterday' ? t(`activity.day.${g.day}`) : g.day}</h3>
              <ol className="m-0 list-none p-0">
                {g.items.map((e, i) => <Event key={e.id} entry={e} userId={userId} last={i === g.items.length - 1} />)}
              </ol>
            </section>
          ))}
        </div>
      )}

      {audit.hasNextPage ? (
        <div><Button loading={audit.isFetchingNextPage} onClick={() => void audit.fetchNextPage()}>{t('audit.loadMore')}</Button></div>
      ) : (
        <p className="text-sm text-ink-subtle">{t('audit.allLoaded', { n: items.length })}</p>
      )}
    </div>
  );
}

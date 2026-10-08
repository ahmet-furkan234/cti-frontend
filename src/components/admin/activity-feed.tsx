'use client';

import { Fragment, useMemo, useState } from 'react';
import { Button, Icon, SearchInput, Select, Skeleton, StateBlock, cx } from '@/components/ui';
import { useAuth } from '@/components/auth-provider';
import { useAudit } from '@/features/admin/hooks';
import { useI18n, type MessageKey, type TFunction } from '@/i18n';
import { categoryOf, groupByDay, iconOf, isAlerting, matchesFilter, summarize, type ActivityCategory, type ActivityFilter } from '@/lib/activity';
import { actionLabel, matchesSearch, rangeBounds, type RangeKey } from '@/lib/audit';
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

function Event({ entry, userId }: { entry: AuditEntry; userId: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const tone = isAlerting(entry.action) ? 'alert' : categoryOf(entry.action);
  return (
    <li className="border-b border-line px-5 py-3 last:border-b-0">
      <div className="flex items-center gap-3">
        <span className={cx('inline-flex size-8 shrink-0 items-center justify-center rounded-full', BADGE[tone])}>
          <Icon name={iconOf(entry.action)} size={15} />
        </span>
        <p className="m-0 min-w-0 grow text-[15px] text-ink"><Sentence entry={entry} userId={userId} /></p>
        <time dateTime={entry.at} className="hidden shrink-0 text-sm text-ink-muted tabular-nums sm:block">{formatTime(entry.at)}</time>
        <button type="button" aria-expanded={open} aria-label={open ? t('activity.hideDetails') : t('activity.details')} title={open ? t('activity.hideDetails') : t('activity.details')} onClick={() => setOpen((o) => !o)} className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-subtle hover:bg-surface-2 hover:text-ink">
          <Icon name={open ? 'up' : 'down'} size={15} />
        </button>
      </div>
      {open ? <div className="pl-11"><Details entry={entry} t={t} /></div> : null}
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

const RANGE_KEYS: RangeKey[] = ['all', 'today', '7d', '30d'];
const PAGE_SIZE = 10;

/** What happened around one user: filters on top, summary, then a compact paged list grouped by day. */
export function ActivityFeed({ userId }: { userId: string }) {
  const { t } = useI18n();
  const { can } = useAuth();
  const age = useAge();
  const allowed = can(P.AUDIT_READ);
  const [filter, setFilter] = useState<ActivityFilter>('all');
  const [range, setRange] = useState<RangeKey>('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);

  const bounds = useMemo(() => rangeBounds(range, { from: '', to: '' }), [range]);
  const audit = useAudit({ targetId: userId, ...bounds }, allowed);

  const all = useMemo(() => audit.data?.pages.flatMap((p) => p.items) ?? [], [audit.data]);
  const summary = useMemo(() => summarize(all, userId), [all, userId]);
  const items = useMemo(() => all.filter((e) => matchesFilter(e, filter) && matchesSearch(e, q, actionLabel(t, e.action))), [all, filter, q, t]);
  const filtered = filter !== 'all' || range !== 'all' || !!q.trim();

  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const slice = items.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);
  const groups = useMemo(() => groupByDay(slice), [slice]);
  const reset = () => { setFilter('all'); setRange('all'); setQ(''); setPage(0); };
  const change = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(0); };

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

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryTile label={t('activity.sum.lastSignIn')} value={summary.lastSignIn ? age(summary.lastSignIn) : t('activity.sum.none')} />
        <SummaryTile label={t('activity.sum.failed')} value={String(summary.failedSignIns)} tone={summary.failedSignIns > 0 ? 'text-high-ink' : undefined} />
        <SummaryTile label={t('activity.sum.changes')} value={String(summary.accessChanges)} />
      </div>

      <div className="flex flex-wrap items-center gap-3 [&>*]:shrink-0" role="search">
        <SearchInput shortcut={null} className="w-full md:w-80 md:max-w-none" placeholder={t('auditlog.search')} value={q} onChange={(e) => change(setQ)(e.target.value)} />
        <Select className="min-w-[210px]" aria-label={t('activity.title')} value={filter} onChange={(v) => change(setFilter)(v as ActivityFilter)} options={FILTERS.map((f) => ({ value: f, label: t(`activity.f.${f}` as MessageKey) }))} />
        <Select className="min-w-[170px]" aria-label={t('auditlog.f.range')} value={range} onChange={(v) => change(setRange)(v as RangeKey)} options={RANGE_KEYS.map((r) => ({ value: r, label: t(`auditlog.range.${r}` as MessageKey) }))} />
        {filtered ? <Button variant="ghost" onClick={reset}>{t('auditlog.clear')}</Button> : null}
      </div>

      <section className="min-w-0 overflow-hidden rounded-xl border border-line bg-surface shadow-card" aria-busy={audit.isPending}>
        {audit.isPending ? (
          <div className="p-5"><Skeleton lines={6} height={14} /></div>
        ) : items.length === 0 ? (
          all.length === 0 && !filtered ? (
            <StateBlock kind="empty" compact title={t('ud.activity.empty')} />
          ) : (
            <StateBlock kind="no-results" compact title={t('activity.noMatch')} description={audit.hasNextPage ? t('activity.noMatchMore') : undefined} action={<Button size="sm" onClick={reset}>{t('auditlog.clear')}</Button>} />
          )
        ) : (
          <>
            {groups.map((g) => (
              <section key={g.day} aria-label={g.day}>
                <h3 className="m-0 border-b border-line bg-surface-2 px-5 py-2 text-sm font-semibold text-ink-muted">{g.day === 'today' || g.day === 'yesterday' ? t(`activity.day.${g.day}`) : g.day}</h3>
                <ol className="m-0 list-none p-0">
                  {g.items.map((e) => <Event key={e.id} entry={e} userId={userId} />)}
                </ol>
              </section>
            ))}
            <div className="flex flex-wrap items-center gap-3 border-t border-line px-5 py-3 text-sm text-ink-muted">
              <span className="grow tabular-nums">
                {current * PAGE_SIZE + 1}–{current * PAGE_SIZE + slice.length} / {items.length}
                {audit.hasNextPage ? '+' : ''}
              </span>
              {audit.hasNextPage && current === pages - 1 ? (
                <Button size="sm" loading={audit.isFetchingNextPage} onClick={() => void audit.fetchNextPage()}>{t('audit.loadMore')}</Button>
              ) : null}
              <Button size="sm" disabled={current === 0} onClick={() => setPage(current - 1)}>{t('common.previous')}</Button>
              <span className="tabular-nums">{current + 1} / {pages}</span>
              <Button size="sm" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>{t('common.next')}</Button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

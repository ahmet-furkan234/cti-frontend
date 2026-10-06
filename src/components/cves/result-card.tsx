'use client';

import Link from 'next/link';
import { Icon, TONE_SOFT, TONE_BG, Tag, cx, formatPct } from '@/components/ui';
import { useI18n, type MessageKey } from '@/i18n';
import { formatDate, highlightParts } from '@/lib/format';
import { SEVERITY_BY_LEVEL, epssTone, severityFromScore } from '@/lib/severity';
import { useAge } from '@/lib/use-age';
import type { CveListItem } from '@/lib/types';

const MAX_TAGS = 3;

/** One search result: how bad it is, what it is, how likely it is to be exploited, and when it appeared. */
export function ResultCard({ item, query }: { item: CveListItem; query: string }) {
  const { t } = useI18n();
  const age = useAge();
  const sev = item.cvssScore > 0 ? (SEVERITY_BY_LEVEL[item.cvssSeverity] ?? severityFromScore(item.cvssScore)) : 'none';
  const tone = epssTone(item.epss);
  const extra = item.affected.length - MAX_TAGS;

  return (
    <Link
      href={`/cves/${item.id}`}
      className="group grid grid-cols-[64px_minmax(0,1fr)] gap-x-4 gap-y-3 border-b border-line px-4 py-4 text-ink no-underline last:border-b-0 hover:bg-surface-2 hover:text-ink md:grid-cols-[72px_minmax(0,1fr)_170px] md:px-5"
    >
      <div className={cx('flex h-16 flex-col items-center justify-center rounded-xl md:h-[72px]', TONE_SOFT[sev])}>
        {item.cvssScore > 0 ? (
          <>
            <span className="text-2xl leading-7 font-semibold tabular-nums">{item.cvssScore.toFixed(1)}</span>
            <span className="text-xs font-medium">{t(`sev.${sev}` as MessageKey)}</span>
          </>
        ) : (
          <span className="px-1 text-center text-xs font-medium">{t('cves.noScore')}</span>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-mono text-[15px] font-semibold text-accent group-hover:underline">{item.id}</span>
          {item.isKev ? (
            <span className="inline-flex h-6 items-center gap-1 rounded-full bg-critical-soft px-2.5 text-sm font-medium text-critical-ink">
              <Icon name="flame" size={13} />
              {t('cves.kevBadge')}
            </span>
          ) : null}
        </div>
        <p className="m-0 line-clamp-2 text-[15px] text-ink">
          {highlightParts(item.description, query).map((p, i) => (p.hit ? <mark key={i}>{p.text}</mark> : <span key={i}>{p.text}</span>))}
        </p>
        {item.affected.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {item.affected.slice(0, MAX_TAGS).map((a) => <Tag key={a}>{a}</Tag>)}
            {extra > 0 ? <span className="text-sm text-ink-subtle">{t('cves.moreProducts', { n: extra })}</span> : null}
          </div>
        ) : null}
      </div>

      <div className="col-span-2 flex items-center gap-4 md:col-span-1 md:flex-col md:items-stretch md:gap-2">
        <div className="min-w-0 grow md:grow-0">
          <div className="text-xs text-ink-muted">{t('cves.epss.label')}</div>
          <div className="flex items-baseline gap-1.5 text-sm">
            <span className="font-semibold tabular-nums">{formatPct(item.epss)}</span>
            <span className="text-ink-muted">{t(`cves.epss.${tone}` as MessageKey)}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
            <div className={cx('h-full rounded-full', TONE_BG[tone])} style={{ width: `${Math.max(3, item.epss * 100)}%` }} />
          </div>
        </div>
        <time dateTime={item.published} title={formatDate(item.published)} className="shrink-0 text-sm text-ink-muted md:text-left">{age(item.published)}</time>
      </div>
    </Link>
  );
}

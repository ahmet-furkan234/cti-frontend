'use client';

import type { ReactNode } from 'react';
import { EpssMeter, MonoText } from '@/components/ui';
import { hasEpss } from '@/lib/severity';
import { useI18n, type MessageKey, type TFunction } from '@/i18n';
import { formatDate, formatDateTime } from '@/lib/format';
import type { CpeMatch, CveDetail, CveReference } from '@/lib/types';

/* ---------- helpers ---------- */

export type RefGroup = 'patch' | 'advisory' | 'exploit';

/** Exploit wins over patch, patch over generic advisory. */
export function groupOfRef(ref: CveReference): RefGroup {
  const tags = (ref.tags ?? []).map((x) => x.toLowerCase());
  if (tags.includes('exploit')) return 'exploit';
  if (tags.some((x) => x === 'patch' || x === 'mitigation' || x === 'release notes')) return 'patch';
  return 'advisory';
}

export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

export function cpeVersion(criteria: string): string | null {
  const v = criteria.split(/(?<!\\):/)[5];
  return v && v !== '*' && v !== '-' ? v : null;
}

export function affectedRange(m: CpeMatch, t: TFunction): string {
  const parts: string[] = [];
  if (m.vsi) parts.push(`≥ ${m.vsi}`);
  if (m.vse) parts.push(`> ${m.vse}`);
  if (m.vei) parts.push(`≤ ${m.vei}`);
  if (m.vee) parts.push(`< ${m.vee}`);
  if (parts.length) return parts.join(', ');
  return cpeVersion(m.c) ?? t('cve.range.all');
}

export interface TimelineEvent {
  at: string;
  label: string;
  tone: 'subtle' | 'critical' | 'high' | 'accent';
}

export function buildTimeline(cve: CveDetail, t: TFunction): TimelineEvent[] {
  const events: TimelineEvent[] = [{ at: cve.published, label: t('cve.ev.published'), tone: 'subtle' }];
  if (cve.kevAdded) events.push({ at: cve.kevAdded, label: t('cve.ev.kev'), tone: 'critical' });
  if (cve.kevDueDate) events.push({ at: cve.kevDueDate, label: t('cve.ev.kevDue'), tone: 'high' });
  if (cve.lastModified && cve.lastModified !== cve.published) {
    events.push({ at: cve.lastModified, label: cve.vulnStatus ? t('cve.ev.status', { status: cve.vulnStatus }) : t('cve.ev.modified'), tone: 'accent' });
  }
  return events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

const TONE_VAR: Record<TimelineEvent['tone'], string> = {
  subtle: 'var(--ink-subtle)',
  critical: 'var(--critical)',
  high: 'var(--high)',
  accent: 'var(--accent)',
};

/* ---------- pieces ---------- */

export function Section({ title, children, padded = true, span }: { title?: ReactNode; children: ReactNode; padded?: boolean; span?: boolean }) {
  return (
    <section className={`min-w-0 rounded-xl border border-line bg-surface shadow-card overflow-hidden${padded ? ' p-5' : ''}${span ? ' md:col-span-2' : ''}`} style={padded ? { display: 'flex', flexDirection: 'column', gap: 12 } : undefined}>
      {title ? <h2 className={padded ? 'text-lg font-semibold' : 'text-lg font-semibold flex items-center gap-2 px-5 py-4'}>{title}</h2> : null}
      {children}
    </section>
  );
}

export function EpssCard({ cve }: { cve: CveDetail }) {
  const { t } = useI18n();
  if (!hasEpss(cve.epss)) {
    return (
      <section className="min-w-0 rounded-xl border border-line bg-surface shadow-card p-5 flex flex-col items-start gap-2.5">
        <div className="flex w-full items-center gap-3">
          <h2 className="grow text-base font-semibold">{t('cve.epss.title')}</h2>
          <EpssMeter variant="gauge" value={0} />
        </div>
        <span className="text-sm text-ink-muted">{t('epss.pending.desc')}</span>
      </section>
    );
  }
  return (
    <section className="min-w-0 rounded-xl border border-line bg-surface shadow-card p-5 flex items-center gap-4">
      <EpssMeter variant="gauge" value={cve.epss} percentile={cve.epssPercentile} />
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold">{t('cve.epss.title')}</h2>
        <span className="text-sm text-ink-muted">{t('cve.epss.desc')}</span>
      </div>
    </section>
  );
}

export function CweCard({ cwe }: { cwe: string[] }) {
  const { t } = useI18n();
  return (
    <section className="min-w-0 rounded-xl border border-line bg-surface shadow-card p-5 flex flex-col gap-2">
      <h2 className="text-base font-semibold">{t('cve.cwe')}</h2>
      {cwe.length === 0 ? (
        <span className="text-ink-muted">{t('cve.cwe.none')}</span>
      ) : (
        cwe.map((c) => (
          <div key={c} className="flex items-center gap-2">
            <MonoText>{c}</MonoText>
          </div>
        ))
      )}
    </section>
  );
}

export function TimelineList({ events, compact }: { events: TimelineEvent[]; compact?: boolean }) {
  const { t } = useI18n();
  if (events.length === 0) return <span className="text-ink-muted">{t('cve.stream.empty')}</span>;
  return (
    <>
      {events.map((e, i) => (
        <div key={`${e.at}-${i}`} className="flex gap-3">
          <div className="flex flex-col items-center pt-1.5">
            <span className="inline-block size-2 shrink-0 rounded-full" style={{ background: TONE_VAR[e.tone] }} />
            {i < events.length - 1 ? <span className="line" /> : null}
          </div>
          <div className="flex flex-col" style={{ paddingBottom: compact ? 6 : 12 }}>
            <span className="tabular-nums text-xs text-ink-subtle">{formatDateTime(e.at)}</span>
            <span className="text-sm">{e.label}</span>
          </div>
        </div>
      ))}
    </>
  );
}

export function ProductsTable({ cve }: { cve: CveDetail }) {
  const { t } = useI18n();
  const LIMIT = 25;
  const rows = cve.cpeMatches.slice(0, LIMIT);
  const cols = { '--cols': 'minmax(0, 1.6fr) minmax(0, 1fr) 110px' } as React.CSSProperties;
  return (
    <section className="min-w-0 rounded-xl border border-line bg-surface shadow-card overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4">
        <h2 className="text-lg font-semibold">{t('cve.products')}</h2>
      </div>
      {rows.length === 0 ? (
        <div className="text-ink-muted p-[0px_16px_16px]">{t('cve.products.empty')}</div>
      ) : (
        <div className="overflow-x-auto">
          <div className="grid min-h-12 items-center gap-3 border-b border-line px-5 last:border-b-0 [grid-template-columns:var(--cols)] sticky top-0 z-1 h-10! min-h-0! bg-surface-2 text-sm font-medium text-ink-muted" style={cols}>
            <span>{t('cve.products.cpe')}</span>
            <span>{t('cve.products.affected')}</span>
            <span>{t('cve.products.fixed')}</span>
          </div>
          {rows.map((m, i) => (
            <div key={`${m.c}-${i}`} className="grid min-h-12 items-center gap-3 border-b border-line px-5 last:border-b-0 [grid-template-columns:var(--cols)] h-9" style={{ ...cols }}>
              <MonoText truncate>{m.c}</MonoText>
              <span className="font-mono text-[13px]">{affectedRange(m, t)}</span>
              <span className="font-mono text-[13px] text-low-ink">{m.vee ?? '—'}</span>
            </div>
          ))}
          {cve.cpeMatches.length > LIMIT ? (
            <div className="text-sm text-ink-muted py-2.5 px-4">{t('cve.products.more', { n: cve.cpeMatches.length - LIMIT })}</div>
          ) : null}
        </div>
      )}
    </section>
  );
}

export function ReferencesSummary({ refs }: { refs: CveReference[] }) {
  const { t } = useI18n();
  const groups: RefGroup[] = ['patch', 'advisory', 'exploit'];
  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-line bg-surface shadow-card">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="text-balance text-lg font-semibold">{t('cve.refs.title')}</h2>
        <span className="text-sm tabular-nums text-ink-muted">{refs.length}</span>
      </div>
      <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-3">
        {groups.map((g) => {
          const items = refs.filter((r) => groupOfRef(r) === g);
          return (
            <div key={g} className="flex min-w-0 flex-col gap-2 rounded-lg bg-surface-2 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold">{t(`cve.refs.${g}` as MessageKey)}</h3>
                <span className="rounded-md bg-surface-3 px-1.5 py-0.5 text-xs tabular-nums text-ink-muted">{items.length}</span>
              </div>
              {items.length === 0 ? <span className="text-sm text-ink-subtle">—</span> : items.slice(0, 3).map((r) => (
                <a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer nofollow" className="truncate text-[13px]" title={displayUrl(r.url)}>
                  {displayUrl(r.url)}
                </a>
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export { formatDate };

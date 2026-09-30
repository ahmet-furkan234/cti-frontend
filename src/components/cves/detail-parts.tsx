'use client';

import type { ReactNode } from 'react';
import { EpssMeter, MonoText } from '@/components/ui';
import { useI18n, type MessageKey, type TFunction } from '@/i18n';
import { parseCvss3 } from '@/lib/cvss';
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
    <section className={`card card--clip${padded ? ' card--pad' : ''}${span ? ' span-2' : ''}`} style={padded ? { display: 'flex', flexDirection: 'column', gap: 12 } : undefined}>
      {title ? <h2 className={padded ? 'h2' : 'h2 card-head'}>{title}</h2> : null}
      {children}
    </section>
  );
}

export function CvssBreakdown({ cve }: { cve: CveDetail }) {
  const { t } = useI18n();
  const metrics = parseCvss3(cve.cvssVector);
  if (!cve.cvssVector) return cve.cvssScore > 0 ? null : <p className="muted">{t('cve.notScored')}</p>;
  const color = { hi: 'var(--critical-ink)', mid: 'var(--high-ink)', ok: 'var(--ink)' } as const;
  return (
    <>
      <div className="row gap-12" style={{ paddingTop: 4 }}>
        <span className="caps">{t('cve.cvss', { v: cve.cvssVersion ?? '' }).trim()}</span>
        <MonoText copy>{cve.cvssVector}</MonoText>
      </div>
      {metrics.length > 0 ? (
        <div className="grid grid-4" style={{ gap: 8 }}>
          {metrics.map((m) => (
            <div key={m.metric} className="kv-tile">
              <span className="k">{t(m.labelKey)}</span>
              <span className="v" style={{ color: color[m.tone] }}>{t(m.valueKey)}</span>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}

export function EpssCard({ cve }: { cve: CveDetail }) {
  const { t } = useI18n();
  return (
    <section className="card card--pad row" style={{ gap: 16 }}>
      <EpssMeter variant="gauge" value={cve.epss} percentile={cve.epssPercentile} />
      <div className="col" style={{ gap: 4 }}>
        <h2 className="h3">{t('cve.epss.title')}</h2>
        <span className="sub">{t('cve.epss.desc')}</span>
      </div>
    </section>
  );
}

export function CweCard({ cwe }: { cwe: string[] }) {
  const { t } = useI18n();
  return (
    <section className="card card--pad col gap-8">
      <h2 className="h3">{t('cve.cwe')}</h2>
      {cwe.length === 0 ? (
        <span className="muted">{t('cve.cwe.none')}</span>
      ) : (
        cwe.map((c) => (
          <div key={c} className="row">
            <MonoText>{c}</MonoText>
          </div>
        ))
      )}
    </section>
  );
}

export function TimelineList({ events, compact }: { events: TimelineEvent[]; compact?: boolean }) {
  const { t } = useI18n();
  if (events.length === 0) return <span className="muted">{t('cve.stream.empty')}</span>;
  return (
    <>
      {events.map((e, i) => (
        <div key={`${e.at}-${i}`} className="tl-item">
          <div className="tl-rail">
            <span className="dot" style={{ background: TONE_VAR[e.tone] }} />
            {i < events.length - 1 ? <span className="line" /> : null}
          </div>
          <div className="col" style={{ paddingBottom: compact ? 6 : 12 }}>
            <span className="mono-11 subtle" style={{ lineHeight: '16px' }}>{formatDateTime(e.at)}</span>
            <span style={{ fontSize: 13, lineHeight: '18px' }}>{e.label}</span>
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
    <section className="card card--clip">
      <div className="card-head">
        <h2 className="h2">{t('cve.products')}</h2>
      </div>
      {rows.length === 0 ? (
        <div className="muted" style={{ padding: '0 16px 16px' }}>{t('cve.products.empty')}</div>
      ) : (
        <div className="scroll-x">
          <div className="trow trow--head" style={cols}>
            <span>{t('cve.products.cpe')}</span>
            <span>{t('cve.products.affected')}</span>
            <span>{t('cve.products.fixed')}</span>
          </div>
          {rows.map((m, i) => (
            <div key={`${m.c}-${i}`} className="trow" style={{ ...cols, height: 36 }}>
              <MonoText truncate>{m.c}</MonoText>
              <span className="mono-12">{affectedRange(m, t)}</span>
              <span className="mono-12 t-low">{m.vee ?? '—'}</span>
            </div>
          ))}
          {cve.cpeMatches.length > LIMIT ? (
            <div className="sub" style={{ padding: '10px 16px' }}>{t('cve.products.more', { n: cve.cpeMatches.length - LIMIT })}</div>
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
    <section className="card card--pad grid grid-3">
      {groups.map((g) => {
        const items = refs.filter((r) => groupOfRef(r) === g);
        return (
          <div key={g} className="col gap-6">
            <span className="caps">{t(`cve.refs.${g}` as MessageKey)} · {items.length}</span>
            {items.slice(0, 3).map((r) => (
              <a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer nofollow" className="ellipsis" style={{ fontSize: 12, lineHeight: '18px' }}>
                {displayUrl(r.url)}
              </a>
            ))}
          </div>
        );
      })}
    </section>
  );
}

export { formatDate };

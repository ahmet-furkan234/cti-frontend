'use client';

import { MonoText, SeverityBadge } from '@/components/ui';
import { useI18n } from '@/i18n';
import { decodeCvss, type Tone } from '@/lib/cvss-vector';
import { SEVERITY_BY_LEVEL } from '@/lib/severity';
import type { CveDetail } from '@/lib/types';
import { Section } from './detail-parts';

const INK: Record<Tone, string> = { hi: 'var(--critical-ink)', mid: 'var(--high-ink)', ok: 'var(--ink)' };
const DOT: Record<Tone, string> = { hi: 'var(--critical)', mid: 'var(--high)', ok: 'var(--neutral)' };
const COLS = 'md:grid-cols-[56px_minmax(0,220px)_110px_minmax(0,1fr)]';
const ROW = `grid grid-cols-[56px_minmax(0,1fr)] items-baseline gap-x-4 gap-y-0.5 border-b border-line px-5 py-2.5 last:border-b-0 ${COLS}`;

/** The CVSS vector of a CVE decoded metric by metric, for analysts who already know the standard. */
export function VectorTab({ cve }: { cve: CveDetail }) {
  const { t } = useI18n();
  const decoded = decodeCvss(cve.cvssVector);

  if (!cve.cvssVector) {
    return <Section title={t('cvx.title')}><p className="text-ink-muted">{t('cvx.none')}</p></Section>;
  }

  return (
    <div className="flex flex-col gap-4">
      <Section title={t('cvx.title')}>
        <div className="flex flex-wrap items-center gap-3">
          {decoded ? <span className="text-sm font-medium">{t('cvx.version', { v: decoded.version })}</span> : null}
          {cve.cvssScore > 0 ? (
            <span className="flex items-center gap-2 text-sm text-ink-muted">
              {t('cvx.score')}
              <SeverityBadge score={cve.cvssScore} severity={SEVERITY_BY_LEVEL[cve.cvssSeverity]} />
            </span>
          ) : null}
          <MonoText copy>{cve.cvssVector}</MonoText>
        </div>
        {!decoded ? <p className="m-0 text-sm text-ink-muted">{t('cvx.unreadable')}</p> : null}
      </Section>

      {decoded?.groups.map((g) => (
        <Section key={g.id} title={t(g.titleKey)} padded={false}>
          <div className={`hidden gap-x-4 border-y border-line bg-surface-2 px-5 py-2 text-xs font-medium text-ink-muted md:grid ${COLS}`} aria-hidden="true">
            <span>{t('cvx.h.metric')}</span>
            <span />
            <span>{t('cvx.h.value')}</span>
            <span>{t('cvx.h.meaning')}</span>
          </div>
          {g.metrics.map((m) => (
            <div key={m.code} className={ROW}>
              <span className="font-mono text-sm text-ink-muted">{m.code}:{m.value}</span>
              <span className="text-[15px] font-medium md:contents">
                <span className="md:block">{t(m.nameKey)}</span>
                <span className="flex items-center gap-2 md:mt-0" style={{ color: INK[m.tone] }}>
                  <span className="size-2 shrink-0 rounded-full" style={{ background: DOT[m.tone] }} aria-hidden="true" />
                  {t(m.valueKey)}
                </span>
              </span>
              <span className="col-start-2 text-sm text-ink-muted md:col-start-auto">{t(m.textKey)}</span>
            </div>
          ))}
        </Section>
      ))}
    </div>
  );
}

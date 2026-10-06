'use client';

import { useEffect } from 'react';
import { RiskRing } from '@/components/ui';
import { useI18n, type MessageKey } from '@/i18n';
import { riskFactors, riskOf, type VulnRow } from '@/mocks/vulns';

const FACTOR_COLOR = { cvss: 'var(--critical)', kev: 'var(--critical)', epss: 'var(--high)', exposed: 'var(--high)', crit: 'var(--medium)' } as const;
const WIDTH = 360;

export interface ExplainTarget {
  row: VulnRow;
  x: number;
  y: number;
}

/** "Why is this score N?" — a small card listing what pushed the risk score up. */
export function ExplainPopover({ target, onClose }: { target: ExplainTarget; onClose: () => void }) {
  const { t } = useI18n();
  const risk = riskOf(target.row);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 z-[19]" onClick={onClose} role="presentation" />
      <div
        role="dialog"
        aria-label={t('vulns.why', { score: risk })}
        className="fixed z-20 flex flex-col gap-3 rounded-xl border border-line-strong bg-surface p-4 shadow-pop"
        style={{ width: WIDTH, left: Math.max(8, Math.min(target.x, window.innerWidth - WIDTH - 8)), top: Math.max(8, Math.min(target.y, window.innerHeight - 360)) }}
      >
        <div className="flex items-center gap-3">
          <RiskRing score={risk} size={44} />
          <div className="flex flex-col">
            <span className="text-base font-semibold">{t('vulns.why', { score: risk })}</span>
            <span className="text-sm text-ink-muted">{target.row.cve} · {target.row.host}</span>
          </div>
        </div>
        {riskFactors(target.row).map((f) => (
          <div key={f.key} className="grid grid-cols-[150px_minmax(0,1fr)_36px] items-center gap-2.5">
            <span className="text-sm text-ink-muted">{t(`vulns.factor.${f.key}` as MessageKey, { v: f.label })}</span>
            <span className="h-2 overflow-hidden rounded-full bg-surface-3"><span className="block h-full rounded-full" style={{ width: `${(f.points / f.max) * 100}%`, background: FACTOR_COLOR[f.key] }} /></span>
            <span className="text-right text-sm tabular-nums">{f.points > 0 ? `+${f.points}` : '0'}</span>
          </div>
        ))}
        <p className="m-0 border-t border-line pt-2 text-sm text-ink-muted">{t('vulns.why.note')}</p>
      </div>
    </>
  );
}

import type { VulnDto, VulnStatusValue } from './types';

/** Matches the company still has to deal with (not accepted, not fixed). */
export const isActive = (v: Pick<VulnDto, 'status'>) => v.status === 'open' || v.status === 'in_progress';

export interface CompanyExposure {
  active: number;
  /** actively exploited (CISA KEV) and still unfixed */
  kev: number;
  /** actively exploited and reachable from the internet */
  kevExposed: number;
  /** fix window already missed */
  overdue: number;
  severity: { severity: 0 | 1 | 2 | 3 | 4; count: number }[];
  status: Record<VulnStatusValue, number>;
  /** what to fix first: highest risk, then tightest fix window */
  top: VulnDto[];
}

export function summarizeExposure(items: VulnDto[], topN = 6): CompanyExposure {
  const status: Record<VulnStatusValue, number> = { open: 0, in_progress: 0, accepted: 0, mitigated: 0 };
  const sev = new Map<VulnDto['severity'], number>();
  const active = items.filter(isActive);
  for (const v of items) status[v.status]++;
  for (const v of active) sev.set(v.severity, (sev.get(v.severity) ?? 0) + 1);
  return {
    active: active.length,
    kev: active.filter((v) => v.kev).length,
    kevExposed: active.filter((v) => v.kev && v.exposed).length,
    overdue: active.filter((v) => v.slaHours != null && v.slaHours < 0).length,
    severity: [...sev].map(([severity, count]) => ({ severity, count })),
    status,
    top: [...active].sort((a, b) => b.risk - a.risk || (a.slaHours ?? Infinity) - (b.slaHours ?? Infinity)).slice(0, topN),
  };
}

import { riskOf, type VulnRow, type VulnStatus } from '../mocks/vulns';

export type GroupBy = 'cve' | 'host';
export type StatusFilter = VulnStatus | 'all';
export type VulnSort = 'risk' | 'sla';

export const SOON_HOURS = 72;
export const isOverdue = (r: VulnRow) => r.slaHours != null && r.slaHours < 0;
export const isSoon = (r: VulnRow) => r.slaHours != null && r.slaHours >= 0 && r.slaHours <= SOON_HOURS;

export interface VulnFilters {
  q: string;
  status: StatusFilter;
  cvss: [number, number];
  /** lowest exploit probability in percent, 0 = any */
  epss: number;
  env: string;
  kev: boolean;
  exposed: boolean;
  /** only matches whose fix window is overdue or running out */
  sla: boolean;
  /** only matches whose fix window has already been missed */
  overdue: boolean;
}
export const noVulnFilters = (): VulnFilters => ({ q: '', status: 'all', cvss: [0, 10], epss: 0, env: '', kev: false, exposed: false, sla: false, overdue: false });
export const isVulnFiltered = (f: VulnFilters) => !!(f.q.trim() || f.status !== 'all' || f.cvss[0] > 0 || f.cvss[1] < 10 || f.epss > 0 || f.env || f.kev || f.exposed || f.sla || f.overdue);

/** Number of technical filter groups currently narrowing the result set. */
export const activeVulnFilterCount = (f: VulnFilters) =>
  (f.status !== 'all' ? 1 : 0) +
  (f.cvss[0] > 0 || f.cvss[1] < 10 ? 1 : 0) +
  (f.epss > 0 || f.kev ? 1 : 0) +
  (f.env || f.exposed ? 1 : 0) +
  (f.sla || f.overdue ? 1 : 0);

export function filterVulns<T extends VulnRow>(rows: T[], f: VulnFilters): T[] {
  const term = f.q.trim().toLowerCase();
  return rows.filter(
    (r) =>
      (f.status === 'all' || r.status === f.status) &&
      r.cvss >= f.cvss[0] && r.cvss <= f.cvss[1] &&
      (f.epss === 0 || r.epss * 100 >= f.epss) &&
      (!f.env || r.env === f.env) &&
      (!f.kev || r.kev) &&
      (!f.exposed || r.exposed) &&
      (!f.sla || isOverdue(r) || isSoon(r)) &&
      (!f.overdue || isOverdue(r)) &&
      (!term || `${r.cve} ${r.host} ${r.fix}`.toLowerCase().includes(term)),
  );
}

export function statusCounts(rows: VulnRow[]): Record<StatusFilter, number> {
  const out: Record<StatusFilter, number> = { all: rows.length, open: 0, in_progress: 0, accepted: 0, mitigated: 0 };
  for (const r of rows) out[r.status]++;
  return out;
}

export interface VulnGroup<T extends VulnRow = VulnRow> {
  key: string;
  by: GroupBy;
  rows: T[];
  /** highest risk score among the matches */
  risk: number;
  /** tightest fix window still running (negative = overdue), null when none is running */
  sla: number | null;
}

export function groupVulns<T extends VulnRow>(rows: T[], by: GroupBy, sort: VulnSort): VulnGroup<T>[] {
  const map = new Map<string, T[]>();
  for (const r of rows) map.set(r[by], [...(map.get(r[by]) ?? []), r]);
  const groups = [...map].map(([key, list]) => {
    const slas = list.map((r) => r.slaHours).filter((x): x is number => x != null);
    return { key, by, rows: [...list].sort((a, b) => riskOf(b) - riskOf(a)), risk: Math.max(...list.map(riskOf)), sla: slas.length ? Math.min(...slas) : null };
  });
  return groups.sort((a, b) => (sort === 'sla' ? (a.sla ?? Infinity) - (b.sla ?? Infinity) || b.risk - a.risk : b.risk - a.risk));
}

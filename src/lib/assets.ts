import type { AssetRow, AssetType, Criticality } from '../mocks/assets';

export type SortKey = 'risk' | 'seen' | 'name';

export interface AssetFilters {
  q: string;
  /** null = every type; otherwise the types a tab stands for */
  types: AssetType[] | null;
  exposedOnly: boolean;
  /** has at least one critical vulnerability */
  criticalVulns: boolean;
  staleOnly: boolean;
  env: string;
  crit: Criticality | '';
}

export const noFilters = (): AssetFilters => ({ q: '', types: null, exposedOnly: false, criticalVulns: false, staleOnly: false, env: '', crit: '' });

export function filterAssets(rows: AssetRow[], f: AssetFilters): AssetRow[] {
  const term = f.q.trim().toLowerCase();
  return rows.filter(
    (r) =>
      (!f.types || f.types.includes(r.type)) &&
      (!f.exposedOnly || r.exposed) &&
      (!f.criticalVulns || r.counts[0] > 0) &&
      (!f.staleOnly || r.status === 'stale') &&
      (!f.env || r.env === f.env) &&
      (!f.crit || r.crit === f.crit) &&
      (!term || `${r.host} ${r.ip} ${r.os}`.toLowerCase().includes(term)),
  );
}

export function sortAssets(rows: AssetRow[], key: SortKey): AssetRow[] {
  const by: Record<SortKey, (a: AssetRow, b: AssetRow) => number> = {
    risk: (a, b) => b.risk - a.risk,
    seen: (a, b) => a.seenMin - b.seenMin,
    name: (a, b) => a.host.localeCompare(b.host, 'tr'),
  };
  return [...rows].sort(by[key]);
}

export const isFiltered = (f: AssetFilters) => !!(f.q.trim() || f.types || f.exposedOnly || f.criticalVulns || f.staleOnly || f.env || f.crit);

export const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low'] as const;
/** The non-zero vulnerability counts of an asset, most severe first. */
export function vulnBreakdown(counts: AssetRow['counts']): { level: (typeof SEVERITY_ORDER)[number]; n: number }[] {
  return SEVERITY_ORDER.map((level, i) => ({ level, n: counts[i] ?? 0 })).filter((x) => x.n > 0);
}

import { describe, expect, it } from 'vitest';
import { ASSET_ROWS, TAB_TYPES } from '../mocks/assets';
import { filterAssets, isFiltered, noFilters, sortAssets, vulnBreakdown } from './assets';

describe('assets', () => {
  it('filters by search text, type, exposure and status together', () => {
    const f = noFilters();
    expect(filterAssets(ASSET_ROWS, f)).toHaveLength(ASSET_ROWS.length);
    expect(filterAssets(ASSET_ROWS, { ...f, q: 'ubuntu' }).every((r) => r.os.toLowerCase().includes('ubuntu'))).toBe(true);
    expect(filterAssets(ASSET_ROWS, { ...f, types: TAB_TYPES['net']! }).map((r) => r.type)).toEqual(['fw']);
    expect(filterAssets(ASSET_ROWS, { ...f, exposedOnly: true }).every((r) => r.exposed)).toBe(true);
    expect(filterAssets(ASSET_ROWS, { ...f, staleOnly: true }).map((r) => r.status)).toEqual(['stale']);
    expect(filterAssets(ASSET_ROWS, { ...f, criticalVulns: true }).every((r) => r.counts[0] > 0)).toBe(true);
  });

  it('sorts by risk, recency or name without touching the input', () => {
    const before = ASSET_ROWS.map((r) => r.host);
    expect(sortAssets(ASSET_ROWS, 'risk')[0]!.risk).toBe(Math.max(...ASSET_ROWS.map((r) => r.risk)));
    expect(sortAssets(ASSET_ROWS, 'seen')[0]!.seenMin).toBe(Math.min(...ASSET_ROWS.map((r) => r.seenMin)));
    const names = sortAssets(ASSET_ROWS, 'name').map((r) => r.host);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'tr')));
    expect(ASSET_ROWS.map((r) => r.host)).toEqual(before);
  });

  it('reports whether any filter is on and lists only non-zero vulnerability counts', () => {
    expect(isFiltered(noFilters())).toBe(false);
    expect(isFiltered({ ...noFilters(), env: 'prod' })).toBe(true);
    expect(vulnBreakdown([2, 0, 3, 0])).toEqual([{ level: 'critical', n: 2 }, { level: 'medium', n: 3 }]);
  });
});

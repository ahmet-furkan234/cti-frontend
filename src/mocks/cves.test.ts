import { afterEach, expect, it, vi } from 'vitest';
import { MOCK_CVES, mockCveStats, mockRead, searchMockCves } from './cves';
import { api } from '../lib/api';
import { setLocalSession } from '../lib/local-auth';

afterEach(() => {
  setLocalSession(false);
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it('keeps dashboard totals, severity counts and detail links consistent', () => {
  const stats = mockCveStats();
  expect(stats.total).toBe(MOCK_CVES.length);
  expect(stats.severityDistribution.reduce((sum, row) => sum + row.count, 0)).toBe(stats.total);
  expect(searchMockCves({ kev: true, includeTotal: true }).total).toBe(stats.kevCount);
  expect(searchMockCves({ severity: ['critical'], includeTotal: true }).total).toBe(stats.criticalCount);
  for (const row of stats.newestKev) expect(mockRead(`/cves/${row.id}`)).toEqual(row);
  expect(mockRead('/cves/CVE-2099-99999')).toBeUndefined();
});

it('supports combined filters and empty results', () => {
  const rows = searchMockCves({ q: 'gateway', vendor: 'northstar', product: 'gateway', severity: ['critical'], kev: true, cvssMin: 9, cvssMax: 10, epssMin: 0.5 }).items;
  expect(rows.length).toBeGreaterThan(0);
  expect(rows.every((c) => c.isKev && c.cvssScore >= 9 && c.epss >= 0.5 && c.affected.includes('northstar:gateway'))).toBe(true);
  expect(searchMockCves({ q: 'does-not-exist', includeTotal: true }).total).toBe(0);
  const recent = searchMockCves({ publishedFrom: new Date(Date.now() - 7 * 86400000).toISOString() }).items;
  expect(recent.length).toBeGreaterThan(0);
  expect(recent.length).toBeLessThan(MOCK_CVES.length);
});

it('sorts and paginates without duplicate or missing records', () => {
  for (const sort of ['cvss', 'epss', 'published', 'modified']) {
    const ids: string[] = [];
    let cursor: string | null = null;
    do {
      const page = searchMockCves({ sort, order: 'desc', cursor, limit: 50 });
      ids.push(...page.items.map((c) => c.id));
      cursor = page.nextCursor;
    } while (cursor);
    expect(new Set(ids).size).toBe(MOCK_CVES.length);
    expect(ids.length).toBe(MOCK_CVES.length);
  }
  const rows = searchMockCves({ sort: 'cvss', order: 'asc' }).items;
  expect(rows.map((c) => c.cvssScore)).toEqual(rows.map((c) => c.cvssScore).sort((a, b) => a - b));
});

it('serves local preview reads without network access and rejects writes', async () => {
  vi.stubEnv('NODE_ENV', 'development');
  vi.stubGlobal('window', { location: { hostname: 'localhost' } });
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  setLocalSession(true);
  expect(await api('/cves/stats')).toEqual(mockCveStats());
  expect(await api('/sync')).toHaveLength(3);
  await expect(api('/cves/missing')).rejects.toMatchObject({ status: 404 });
  await expect(api('/sync/nvd/run', { method: 'POST' })).rejects.toMatchObject({ status: 503 });
  expect(fetch).not.toHaveBeenCalled();
});

it('uses the real API outside local preview', async () => {
  vi.stubEnv('NODE_ENV', 'production');
  const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ total: 7 }) });
  vi.stubGlobal('fetch', fetch);
  expect(await api('/cves/stats')).toEqual({ total: 7 });
  expect(fetch).toHaveBeenCalledWith('/api/v1/cves/stats', expect.any(Object));
});

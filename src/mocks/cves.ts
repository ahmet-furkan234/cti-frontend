import type { CveDetail, CveSearchResponse, CveStats, SyncState } from '../lib/types';
import { LEVEL_BY_SEVERITY, SEVERITY_BY_LEVEL, severityFromScore } from '../lib/severity';

// Synthetic fixtures, not real vulnerability intelligence. Dates stay useful for relative filters.
const now = Date.now();
const DAY = 86_400_000;
const iso = (days: number) => new Date(now - days * DAY).toISOString();
const products = [
  ['northstar', 'gateway', 'Remote code execution in request processing', 'CWE-78'],
  ['atlas', 'workspace', 'Stored cross-site scripting in shared dashboards', 'CWE-79'],
  ['cedar', 'database', 'SQL injection in the report query interface', 'CWE-89'],
  ['orbit', 'identity', 'Authentication bypass in session validation', 'CWE-287'],
  ['harbor', 'fileserver', 'Path traversal in the document download endpoint', 'CWE-22'],
  ['summit', 'agent', 'Privilege escalation through a local service', 'CWE-269'],
  ['northstar', 'console', 'Information disclosure in diagnostic output', 'CWE-200'],
  ['atlas', 'proxy', 'Denial of service from malformed network requests', 'CWE-400'],
] as const;
const scores = [9.8, 7.5, 8.1, 9.1, 6.5, 7.8, 3.3, 5.3, 0, 4.3, 8.8, 2.7];

export const MOCK_CVES: CveDetail[] = Array.from({ length: 128 }, (_, i) => {
  const [vendor, product, summary, cwe] = products[i % products.length]!;
  const score = scores[i % scores.length]!;
  const age = ((i * 7) % 60) + (i % 8) / 10;
  const published = iso(age);
  const isKev = score >= 7 && i % 3 === 0;
  return {
    id: `CVE-2099-${String(10001 + i)}`, published, lastModified: iso(Math.max(0, age - 2)),
    vulnStatus: 'Analyzed',
    description: `[DEMO] ${summary} in ${vendor} ${product} versions before 3.${i % 10}.2. Synthetic record for local interface testing.`,
    cvssScore: score, cvssSeverity: LEVEL_BY_SEVERITY[severityFromScore(score)] as CveDetail['cvssSeverity'],
    cvssVector: score === 9.8 ? 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H' : null,
    cvssVersion: score > 0 ? '3.1' : null, cwe: [cwe], isKev,
    kevAdded: isKev ? iso(Math.max(0, age - 1)) : null,
    kevDueDate: isKev ? iso(Math.max(0, age - 1) - 21) : null,
    kevRansomware: isKev && i % 2 === 0,
    epss: Number((isKev ? 0.6 + (i % 37) / 100 : ((i * 17) % 400) / 1000).toFixed(3)),
    epssPercentile: isKev ? 0.99 : 0.35 + (i % 60) / 100,
    references: [
      { url: `https://example.com/advisories/demo-${i + 1}`, source: 'Demo vendor', tags: ['Vendor Advisory'] },
      { url: `https://example.com/patches/demo-${i + 1}`, source: 'Demo patch', tags: ['Patch'] },
    ],
    affected: [`${vendor}:${product}`], vendors: [vendor],
    cpeMatches: [{ c: `cpe:2.3:a:${vendor}:${product}:*:*:*:*:*:*:*:*`, vsi: '3.0.0', vee: `3.${i % 10}.2` }],
  };
});

type Query = Record<string, string | number | boolean | string[] | null | undefined>;
export function searchMockCves(query: Query = {}): CveSearchResponse {
  const text = String(query.q ?? '').toLowerCase();
  const severity = Array.isArray(query.severity) ? query.severity : String(query.severity ?? '').split(',').filter(Boolean);
  const rows = MOCK_CVES.filter((c) =>
    (!text || `${c.id} ${c.description} ${c.affected.join(' ')}`.toLowerCase().includes(text)) &&
    (!severity.length || severity.includes(SEVERITY_BY_LEVEL[c.cvssSeverity]!)) &&
    c.cvssScore >= Number(query.cvssMin ?? 0) && c.cvssScore <= Number(query.cvssMax ?? 10) &&
    (query.kev === undefined || c.isKev === (query.kev === true || query.kev === 'true')) &&
    c.epss >= Number(query.epssMin ?? 0) &&
    (!query.publishedFrom || c.published >= String(query.publishedFrom)) &&
    (!query.vendor || c.vendors.some((v) => v.includes(String(query.vendor).toLowerCase()))) &&
    (!query.product || c.affected.some((p) => p.split(':')[1]!.includes(String(query.product).toLowerCase())))
  );
  const value = (c: CveDetail): number => query.sort === 'cvss' ? c.cvssScore : query.sort === 'epss' ? c.epss : Date.parse(query.sort === 'modified' ? c.lastModified : c.published);
  rows.sort((a, b) => ((value(a) - value(b)) || a.id.localeCompare(b.id)) * (query.order === 'asc' ? 1 : -1));
  const offset = Math.max(0, Number(query.cursor) || 0);
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 50));
  return {
    items: rows.slice(offset, offset + limit),
    nextCursor: offset + limit < rows.length ? String(offset + limit) : null,
    ...(query.includeTotal === true || query.includeTotal === 'true' ? { total: rows.length } : {}),
    tookMs: 2,
  };
}

function counts(values: string[]) {
  const map = new Map<string, number>();
  for (const key of values) map.set(key, (map.get(key) ?? 0) + 1);
  return [...map].sort((a, b) => b[1] - a[1]);
}

export function mockCveStats(): CveStats {
  return {
    total: MOCK_CVES.length, kevCount: MOCK_CVES.filter((c) => c.isKev).length,
    criticalCount: MOCK_CVES.filter((c) => c.cvssSeverity === 4).length,
    addedLast24h: MOCK_CVES.filter((c) => Date.parse(c.published) >= now - DAY).length,
    severityDistribution: ([0, 1, 2, 3, 4] as const).map((severity) => ({ severity, count: MOCK_CVES.filter((c) => c.cvssSeverity === severity).length })),
    perDay: counts(MOCK_CVES.map((c) => c.published.slice(0, 10))).map(([day, count]) => ({ day, count })).sort((a, b) => a.day.localeCompare(b.day)),
    topCwe: counts(MOCK_CVES.flatMap((c) => c.cwe)).slice(0, 5).map(([cwe, count]) => ({ cwe, count })),
    topVendors: counts(MOCK_CVES.flatMap((c) => c.vendors)).slice(0, 5).map(([vendor, count]) => ({ vendor, count })),
    newestKev: MOCK_CVES.filter((c) => c.isKev).sort((a, b) => b.kevAdded!.localeCompare(a.kevAdded!)).slice(0, 5),
  };
}

export const MOCK_SYNC: SyncState[] = (['nvd', 'kev', 'epss'] as const).map((source) => ({
  source, status: 'idle', lastSuccessAt: iso(0), lastStartedAt: iso(0.001), lastFinishedAt: iso(0),
  lastError: null, recordsProcessed: source === 'kev' ? MOCK_CVES.filter((c) => c.isKev).length : MOCK_CVES.length,
  cursor: {}, runRequestedAt: null,
}));

export function mockRead(path: string, query?: Query): unknown {
  if (path === '/cves') return searchMockCves(query);
  if (path === '/cves/stats') return mockCveStats();
  if (path === '/sync') return MOCK_SYNC;
  if (path.startsWith('/cves/')) return MOCK_CVES.find((c) => c.id === decodeURIComponent(path.slice(6)));
  return undefined;
}

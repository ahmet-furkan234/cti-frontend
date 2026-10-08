import { describe, expect, it } from 'vitest';
import { summarizeExposure } from './company';
import type { VulnDto } from './types';

const v = (o: Partial<VulnDto>): VulnDto => ({
  id: 'x', cve: 'CVE-1', assetId: 'a', host: 'h', env: 'prod', exposed: false, kev: false, cvss: 5, severity: 2, epss: 0, status: 'open',
  firstSeenAt: '', component: 'a:b', installedVersion: null, fixedVersion: null, risk: 10, slaHours: null, ...o,
});

describe('summarizeExposure', () => {
  it('counts only unresolved matches and ranks by risk', () => {
    const s = summarizeExposure([
      v({ id: '1', risk: 40, kev: true, exposed: true, slaHours: -5, severity: 4 }),
      v({ id: '2', risk: 90, status: 'in_progress', severity: 4 }),
      v({ id: '3', risk: 99, status: 'mitigated' }),
      v({ id: '4', risk: 70, status: 'accepted', kev: true }),
    ]);
    expect(s).toMatchObject({ active: 2, kev: 1, kevExposed: 1, overdue: 1 });
    expect(s.top.map((x) => x.id)).toEqual(['2', '1']);
    expect(s.status).toEqual({ open: 1, in_progress: 1, accepted: 1, mitigated: 1 });
    expect(s.severity).toEqual([{ severity: 4, count: 2 }]);
  });
});

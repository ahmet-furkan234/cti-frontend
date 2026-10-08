import { describe, expect, it } from 'vitest';
import { VULN_ROWS } from '../mocks/vulns';
import { filterVulns, groupVulns, isOverdue, isSoon, noVulnFilters, statusCounts } from './vulns';

describe('vulns', () => {
  it('classifies overdue and running-out matches', () => {
    expect(VULN_ROWS.filter(isOverdue).map((r) => r.host)).toEqual(['fw-edge-01']);
    expect(VULN_ROWS.filter(isSoon).length).toBeGreaterThan(0);
    expect(filterVulns(VULN_ROWS, { ...noVulnFilters(), sla: true }).every((r) => isOverdue(r) || isSoon(r))).toBe(true);
    expect(filterVulns(VULN_ROWS, { ...noVulnFilters(), overdue: true }).map((r) => r.host)).toEqual(['fw-edge-01']);
  });

  it('filters by status, attacker use, exposure and text together', () => {
    const f = noVulnFilters();
    expect(filterVulns(VULN_ROWS, { ...f, kev: true }).every((r) => r.kev)).toBe(true);
    expect(filterVulns(VULN_ROWS, { ...f, status: 'accepted' }).map((r) => r.host)).toEqual(['intranet-cms']);
    expect(filterVulns(VULN_ROWS, { ...f, q: 'openssh' }).every((r) => /openssh/i.test(`${r.cve} ${r.host} ${r.fix}`))).toBe(true);
    expect(statusCounts(VULN_ROWS).all).toBe(VULN_ROWS.length);
  });

  it('filters by technical CVSS, EPSS and environment criteria', () => {
    const f = noVulnFilters();
    const rows = filterVulns(VULN_ROWS, { ...f, cvss: [9, 10], epss: 50, env: 'prod' });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.cvss >= 9 && r.epss >= 0.5 && r.env === 'prod')).toBe(true);
  });

  it('groups by CVE or asset, ranked by risk or fix window', () => {
    const byCve = groupVulns(VULN_ROWS, 'cve', 'risk');
    expect(byCve.find((g) => g.key === 'CVE-2024-6387')!.rows).toHaveLength(2);
    expect(byCve[0]!.risk).toBeGreaterThanOrEqual(byCve[byCve.length - 1]!.risk);
    const bySla = groupVulns(VULN_ROWS, 'host', 'sla');
    expect(bySla[0]!.key).toBe('fw-edge-01');
    expect(bySla[bySla.length - 1]!.sla).toBeNull();
  });
});

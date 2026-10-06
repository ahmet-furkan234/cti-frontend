import { describe, expect, it } from 'vitest';
import { confidenceOf, daysLeft, detectIocType, hasTarget, tacticExposure } from './intel';

describe('intel', () => {
  it('recognises every kind of indicator', () => {
    const cases: [string, string | null][] = [
      ['203.0.113.45', 'ipv4'], ['10.0.0.0/8', 'cidr'], ['2001:db8::bad:1', 'ipv6'], ['c2-update.example', 'domain'],
      ['hxxps://login-portal.example/login.php', 'url'], ['https://evil.example/a', 'url'], ['billing@invoice-alerts.example', 'email'],
      ['da39a3ee5e6b4b0d3255bfef95601890afd80709', 'sha1'], ['d41d8cd98f00b204e9800998ecf8427e', 'md5'],
      ['e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'sha256'],
      ['10.0.0.300', null], ['not a thing', null], ['', null],
    ];
    for (const [value, type] of cases) expect(detectIocType(value), value).toBe(type);
  });

  it('turns a confidence score into a word', () => {
    expect([97, 80, 79, 50, 49, 0].map(confidenceOf)).toEqual(['high', 'high', 'medium', 'medium', 'low', 'low']);
  });

  it('counts whole days until expiry, negative once passed, null when it never expires', () => {
    const now = new Date(2026, 9, 5, 15, 30);
    expect(daysLeft('2026-10-05', now)).toBe(0);
    expect(daysLeft('2026-10-14', now)).toBe(9);
    expect(daysLeft('2026-10-02', now)).toBe(-3);
    expect(daysLeft(null, now)).toBeNull();
  });

  it('sums technique exposure per tactic', () => {
    const rows = tacticExposure();
    expect(rows).toHaveLength(6);
    expect(rows[0]).toEqual({ tactic: 'initial', score: 3 + 2 + 1 + 0 + 1 + 0 });
  });

  it('knows whether a watchlist watches anything', () => {
    expect(hasTarget({ vendors: [], products: [], tag: ' ' })).toBe(false);
    expect(hasTarget({ vendors: ['Fortinet'], products: [], tag: '' })).toBe(true);
  });
});

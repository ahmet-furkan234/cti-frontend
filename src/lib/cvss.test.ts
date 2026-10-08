import { describe, expect, it } from 'vitest';
import { parseCvss3 } from './cvss';
import { highlightParts } from './format';
import { severityFromScore, scorePassword } from './severity';

describe('parseCvss3', () => {
  it('parses all eight base metrics in canonical order', () => {
    const m = parseCvss3('CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:H');
    expect(m.map((x) => x.metric)).toEqual(['AV', 'AC', 'PR', 'UI', 'S', 'C', 'I', 'A']);
    expect(m[0]).toMatchObject({ valueKey: 'cvss.v.network', tone: 'hi' });
    expect(m[1]).toMatchObject({ valueKey: 'cvss.v.high', tone: 'ok' });
  });
  it('returns nothing for non-3.x or empty vectors', () => {
    expect(parseCvss3('AV:N/AC:L/Au:N/C:P/I:P/A:P')).toEqual([]);
    expect(parseCvss3(null)).toEqual([]);
  });
});

describe('highlightParts', () => {
  it('marks every query word case-insensitively', () => {
    const parts = highlightParts('Remote Code Execution in sshd', 'remote execution');
    expect(parts.filter((p) => p.hit).map((p) => p.text)).toEqual(['Remote', 'Execution']);
    expect(parts.map((p) => p.text).join('')).toBe('Remote Code Execution in sshd');
  });
  it('handles empty and regex-special queries', () => {
    expect(highlightParts('abc', '')).toEqual([{ text: 'abc', hit: false }]);
    expect(() => highlightParts('a+b', '+++ (x')).not.toThrow();
  });
});

describe('severity helpers', () => {
  it('maps scores to severities', () => {
    expect([0, 3.9, 4, 6.9, 7, 8.9, 9, 10].map(severityFromScore)).toEqual(['none', 'low', 'medium', 'medium', 'high', 'high', 'critical', 'critical']);
  });
  it('scores passwords 0..4', () => {
    expect(scorePassword('')).toBe(0);
    expect(scorePassword('abc')).toBeLessThanOrEqual(1);
    expect(scorePassword('Correct-Horse-9!')).toBe(4);
  });
});

describe('hasEpss', () => {
  it('treats the stored 0 as "not scored yet"', async () => {
    const { hasEpss } = await import('./severity');
    expect(hasEpss(0)).toBe(false);
    expect(hasEpss(null)).toBe(false);
    expect(hasEpss(0.0004)).toBe(true);
  });
});

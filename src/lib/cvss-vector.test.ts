import { describe, expect, it } from 'vitest';
import { MESSAGES } from '../i18n/messages';
import { decodeCvss } from './cvss-vector';

const codes = (v: string) => decodeCvss(v)!.groups.flatMap((g) => g.metrics.map((m) => `${m.code}:${m.value}`));

describe('decodeCvss', () => {
  it('reads a CVSS 4.0 vector in specification order', () => {
    const d = decodeCvss('CVSS:4.0/AV:A/AC:L/AT:N/PR:H/UI:N/VC:N/VI:L/VA:H/SC:N/SI:N/SA:N')!;
    expect(d.version).toBe('4.0');
    expect(d.groups.map((g) => g.id)).toEqual(['exploit', 'vuln', 'sub']);
    expect(codes('CVSS:4.0/AV:A/AC:L/AT:N/PR:H/UI:N/VC:N/VI:L/VA:H/SC:N/SI:N/SA:N')).toEqual(['AV:A', 'AC:L', 'AT:N', 'PR:H', 'UI:N', 'VC:N', 'VI:L', 'VA:H', 'SC:N', 'SI:N', 'SA:N']);
    expect(d.unknown).toEqual([]);
  });

  it('reads CVSS 3.1 and 2.0', () => {
    expect(decodeCvss('CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:H/I:H/A:H')!.groups.map((g) => g.id)).toEqual(['exploit', 'scope', 'impact']);
    const v2 = decodeCvss('AV:N/AC:M/Au:N/C:P/I:P/A:C')!;
    expect(v2.version).toBe('2.0');
    expect(codes('AV:N/AC:M/Au:N/C:P/I:P/A:C')).toEqual(['AV:N', 'AC:M', 'Au:N', 'C:P', 'I:P', 'A:C']);
  });

  it('keeps what it cannot explain instead of dropping it', () => {
    const d = decodeCvss('CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N/S:P/AU:Y')!;
    expect(d.unknown.map((u) => u.code)).toEqual(['S', 'AU']);
  });

  it('returns null for anything that is not a vector', () => {
    expect(decodeCvss(null)).toBeNull();
    expect(decodeCvss('hello')).toBeNull();
    expect(decodeCvss('CVSS:9.9/AV:N')).toBeNull();
  });

  it('has an explanation in the messages for every metric and value it can produce', () => {
    for (const v of [
      'CVSS:4.0/AV:N/AC:H/AT:P/PR:L/UI:A/VC:H/VI:L/VA:N/SC:H/SI:L/SA:N/E:A',
      'CVSS:3.1/AV:P/AC:H/PR:H/UI:R/S:U/C:L/I:N/A:H',
      'AV:L/AC:H/Au:M/C:C/I:P/A:N',
    ]) {
      for (const g of decodeCvss(v)!.groups) {
        expect(MESSAGES).toHaveProperty([g.titleKey]);
        for (const m of g.metrics) for (const k of [m.nameKey, m.valueKey, m.textKey]) expect(MESSAGES, k).toHaveProperty([k]);
      }
    }
  });
});

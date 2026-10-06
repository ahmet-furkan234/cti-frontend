import { describe, expect, it } from 'vitest';
import { SAMPLE_CSV, autoMap, buildRows, parseCsv, parseSbom, parseSoftware } from './import';

describe('import', () => {
  it('parses quoted cells, doubled quotes and other separators', () => {
    expect(parseCsv('a,b\n"x, y","say ""hi"""\n')).toEqual({ columns: ['a', 'b'], rows: [['x, y', 'say "hi"']] });
    expect(parseCsv('a;b\n1;2').rows).toEqual([['1', '2']]);
    expect(parseCsv('﻿a,b\r\n1,2\r\n\r\n3,4').rows).toEqual([['1', '2'], ['3', '4']]);
  });

  it('maps common headers to fields, each field once', () => {
    const map = autoMap(['Host Name', 'IP', 'Operating System', 'Environment', 'Owner', 'Whatever']);
    expect(map).toMatchObject({ 'Host Name': 'hostname', IP: 'ip_address', 'Operating System': 'os', Environment: 'environment', Owner: 'owner', Whatever: '' });
  });

  it('splits software entries into product and version', () => {
    expect(parseSoftware('openssh 8.9p1; nginx 1.18.0; mystery')).toEqual([
      { product: 'openssh', version: '8.9p1' }, { product: 'nginx', version: '1.18.0' }, { product: 'mystery' },
    ]);
  });

  it('builds API rows from the sample with normalised environment and criticality', () => {
    const table = parseCsv(SAMPLE_CSV);
    const rows = buildRows(table, autoMap(table.columns), 2);
    expect(rows).toHaveLength(4);
    expect(rows[0]).toMatchObject({ row: 2, name: 'web-prod-01', addr: '10.20.4.17', env: 'prod', criticality: 'high', software: [{ product: 'openssh', version: '8.9p1' }, { product: 'nginx', version: '1.18.0' }] });
    expect(rows[1]!.criticality).toBe('critical');
  });

  it('turns a CycloneDX file into one asset with its components', () => {
    const t = parseSbom(JSON.stringify({ metadata: { component: { name: 'api-gateway' } }, components: [{ name: 'openssl', version: '3.0.2' }] }));
    expect(t.rows).toEqual([['api-gateway', 'openssl 3.0.2']]);
    expect(() => parseSbom('{}')).toThrow();
  });
});

import { describe, expect, it } from 'vitest';
import { MESSAGES } from '../i18n/messages';
import { ASSET_TYPE_ORDER, ASSET_TYPE_SPECS } from './asset-types';

const has = (key: string) => key in MESSAGES;

describe('asset type specs', () => {
  it('lists every type exactly once in the chooser', () => {
    expect([...ASSET_TYPE_ORDER].sort()).toEqual(Object.keys(ASSET_TYPE_SPECS).sort());
  });

  it('has a translated label for every field, section, identity text and option', () => {
    const missing: string[] = [];
    for (const spec of Object.values(ASSET_TYPE_SPECS)) {
      const keys = [`atype.desc.${spec.id}`, `atype.sec.${spec.id}`, `atype.id.${spec.id}.name`, `atype.id.${spec.id}.name.hint`];
      if (spec.addr !== 'none') keys.push(`atype.id.${spec.id}.addr`, `atype.id.${spec.id}.addr.hint`);
      if (spec.software) keys.push(`atype.sw.${spec.id}`);
      for (const f of spec.fields) {
        keys.push(`atype.f.${spec.id}.${f.id}`);
        for (const o of f.options ?? []) if (/^(role|res)\./.test(o) || o === 'physical') keys.push(`atype.o.${o}`);
      }
      missing.push(...keys.filter((k) => !has(k)));
    }
    expect(missing).toEqual([]);
  });

  it('has unique field ids per type', () => {
    for (const spec of Object.values(ASSET_TYPE_SPECS)) {
      const ids = spec.fields.map((f) => f.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

import { describe, expect, it } from 'vitest';
import { MESSAGES } from './messages';
import { translate } from './index';

const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('messages', () => {
  it('has non-empty text in both languages', () => {
    for (const [key, m] of Object.entries(MESSAGES)) {
      expect(m.tr.trim(), `${key} (tr)`).not.toBe('');
      expect(m.en.trim(), `${key} (en)`).not.toBe('');
    }
  });

  it('uses the same {placeholders} in both languages', () => {
    for (const [key, m] of Object.entries(MESSAGES)) {
      expect(vars(m.tr), `placeholders of ${key}`).toEqual(vars(m.en));
    }
  });

  it('interpolates variables and keeps unknown ones visible', () => {
    expect(translate('en', 'common.results', { n: 5 })).toBe('5 results');
    expect(translate('tr', 'common.results', { n: 5 })).toBe('5 sonuç');
    expect(translate('en', 'common.results')).toBe('{n} results');
  });
});

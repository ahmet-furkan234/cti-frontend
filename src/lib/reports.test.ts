import { describe, expect, it } from 'vitest';
import { nextRun, parseRecipients } from './reports';

describe('reports', () => {
  it('finds the next time a schedule fires', () => {
    const mon = new Date(2026, 9, 5, 12, 0); // Monday 5 Oct 2026, after 08:00
    expect(nextRun('weekly-mon', mon)).toEqual(new Date(2026, 9, 12, 8, 0));
    expect(nextRun('weekly-fri', mon)).toEqual(new Date(2026, 9, 9, 16, 0));
    expect(nextRun('daily', mon)).toEqual(new Date(2026, 9, 6, 7, 30));
    expect(nextRun('daily', new Date(2026, 9, 5, 6, 0))).toEqual(new Date(2026, 9, 5, 7, 30));
    expect(nextRun('monthly', mon)).toEqual(new Date(2026, 10, 1, 9, 0));
    expect(nextRun('weekly-mon', new Date(2026, 9, 5, 7, 0))).toEqual(new Date(2026, 9, 5, 8, 0));
  });

  it('validates a list of recipient addresses', () => {
    expect(parseRecipients('a@x.com, b@y.org; a@x.com')).toEqual({ list: ['a@x.com', 'b@y.org'], ok: true });
    expect(parseRecipients('a@x.com, nope').ok).toBe(false);
    expect(parseRecipients('  ')).toEqual({ list: [], ok: true });
  });
});

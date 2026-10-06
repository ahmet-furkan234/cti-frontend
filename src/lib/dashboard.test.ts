import { describe, expect, it } from 'vitest';
import { fillDays, greetingName, niceMax, percentOf, weekOverWeek } from './dashboard';

const NOW = Date.UTC(2026, 9, 5, 12);
const day = (back: number) => new Date(NOW - back * 86_400_000).toISOString().slice(0, 10);

describe('dashboard helpers', () => {
  it('fills missing days with zero and keeps oldest first', () => {
    const rows = fillDays([{ day: day(0), count: 4 }], 5, NOW);
    expect(rows).toHaveLength(5);
    expect(rows[4]).toEqual({ day: day(0), count: 4 });
    expect(rows.slice(0, 4).every((r) => r.count === 0)).toBe(true);
  });

  it('rounds chart maxima to tidy numbers', () => {
    expect([0, 3, 7, 13, 48, 120].map(niceMax)).toEqual([10, 5, 10, 20, 50, 200]);
  });

  it('compares this week with the one before', () => {
    const perDay = [...Array(7)].map((_, i) => ({ day: day(i), count: 3 })).concat([...Array(7)].map((_, i) => ({ day: day(i + 7), count: 2 })));
    expect(weekOverWeek(perDay, NOW)).toEqual({ last: 21, previous: 14, pct: 50 });
    expect(weekOverWeek([{ day: day(0), count: 5 }], NOW).pct).toBeNull();
  });

  it('computes shares and the first name', () => {
    expect(percentOf(22, 118)).toBe(19);
    expect(percentOf(1, 0)).toBe(0);
    expect(greetingName('  Ahmet Furkan Arpacı ')).toBe('Ahmet');
    expect(greetingName('')).toBeNull();
  });
});

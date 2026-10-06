import { describe, expect, it } from 'vitest';
import { categoryOf, groupByDay, matchesFilter, summarize } from './activity';
import type { AuditEntry } from './types';

const entry = (action: string, at: string, actorId: string | null = 'u1'): AuditEntry => ({
  id: `${action}-${at}`, actorId, actorEmail: null, action, targetType: 'user', targetId: 'u1', meta: {}, ip: null, at,
});

describe('activity', () => {
  it('sorts every known audit action into a category', () => {
    expect(categoryOf('auth.login')).toBe('account');
    expect(categoryOf('user.permissions_changed')).toBe('access');
    expect(categoryOf('auth.login_failed')).toBe('security');
    expect(categoryOf('sync.requested')).toBe('other');
  });

  it('keeps uncategorised events visible only under "all"', () => {
    const sync = entry('sync.requested', '2026-10-05T10:00:00');
    expect(matchesFilter(sync, 'all')).toBe(true);
    expect(matchesFilter(sync, 'security')).toBe(false);
  });

  it('groups newest-first events by local day with today and yesterday labelled', () => {
    const now = new Date(2026, 9, 5, 12, 0);
    const items = [
      entry('auth.login', new Date(2026, 9, 5, 9, 0).toISOString()),
      entry('auth.login', new Date(2026, 9, 5, 8, 0).toISOString()),
      entry('auth.login', new Date(2026, 9, 4, 22, 0).toISOString()),
      entry('auth.login', new Date(2026, 9, 1, 10, 0).toISOString()),
    ];
    const groups = groupByDay(items, now);
    expect(groups.map((g) => [g.day, g.items.length])).toEqual([['today', 2], ['yesterday', 1], ['2026-10-01', 1]]);
  });

  it('summarises sign-ins and access changes', () => {
    const items = [
      entry('auth.login', '2026-10-05T10:00:00Z'),
      entry('auth.login', '2026-10-03T10:00:00Z'),
      entry('auth.login', '2026-10-04T10:00:00Z', 'admin'),
      entry('auth.login_failed', '2026-10-02T10:00:00Z'),
      entry('user.permissions_changed', '2026-10-01T10:00:00Z', 'admin'),
    ];
    expect(summarize(items, 'u1')).toEqual({ lastSignIn: '2026-10-05T10:00:00Z', failedSignIns: 1, accessChanges: 1 });
  });
});

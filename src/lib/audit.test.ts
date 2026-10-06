import { describe, expect, it } from 'vitest';
import { actorOf, matchesSearch, rangeBounds, summarizeAudit, targetOf } from './audit';
import type { AuditEntry } from './types';

const e = (action: string, over: Partial<AuditEntry> = {}): AuditEntry => ({
  id: action, actorId: 'u1', actorEmail: 'ece@example.com', action, targetType: 'user', targetId: 'u2', meta: {}, ip: '192.0.2.1', at: '2026-10-05T10:00:00Z', ...over,
});

describe('audit', () => {
  it('turns quick ranges into time bounds', () => {
    const now = new Date(2026, 9, 5, 15, 0);
    expect(rangeBounds('all', { from: '', to: '' }, now)).toEqual({});
    expect(rangeBounds('today', { from: '', to: '' }, now).from).toBe(new Date(2026, 9, 5).toISOString());
    expect(rangeBounds('7d', { from: '', to: '' }, now).from).toBe(new Date(2026, 8, 29).toISOString());
    expect(rangeBounds('30d', { from: '', to: '' }, now).from).toBe(new Date(2026, 8, 6).toISOString());
    expect(rangeBounds('custom', { from: '2026-10-01', to: '2026-10-03' }, now)).toEqual({
      from: new Date('2026-10-01T00:00:00').toISOString(),
      to: new Date('2026-10-03T23:59:59').toISOString(),
    });
  });

  it('names the person and the target of an event', () => {
    expect(actorOf(e('user.updated'))).toBe('ece@example.com');
    expect(actorOf(e('auth.login_failed', { actorEmail: null, meta: { email: 'typo@example.com' } }))).toBe('typo@example.com');
    expect(actorOf(e('sync.requested', { actorEmail: null }))).toBeNull();
    expect(targetOf(e('user.invited', { meta: { email: 'new@example.com' } }))).toBe('new@example.com');
    expect(targetOf(e('role.created', { meta: { name: 'soc_lead' } }))).toBe('soc_lead');
    expect(targetOf(e('sync.requested', { meta: { source: 'nvd' } }))).toBe('NVD');
  });

  it('summarises a list of events', () => {
    const items = [e('auth.login'), e('auth.login_failed', { actorEmail: null, meta: { email: 'x@example.com' } }), e('user.permissions_changed'), e('role.updated', { actorEmail: 'MERT@example.com' })];
    expect(summarizeAudit(items)).toEqual({ total: 4, alerts: 1, accessChanges: 2, people: 3 });
  });

  it('searches person, target, action name and address', () => {
    const ev = e('user.updated', { meta: { email: 'selin@example.com' } });
    expect(matchesSearch(ev, 'selin', 'Kullanıcı güncellendi')).toBe(true);
    expect(matchesSearch(ev, 'güncellendi', 'Kullanıcı güncellendi')).toBe(true);
    expect(matchesSearch(ev, '192.0.2', '')).toBe(true);
    expect(matchesSearch(ev, 'nope', 'Kullanıcı güncellendi')).toBe(false);
    expect(matchesSearch(ev, '  ', '')).toBe(true);
  });
});

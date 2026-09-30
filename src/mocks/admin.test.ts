import { afterEach, expect, it, vi } from 'vitest';
import { MOCK_USERS, MOCK_ROLES, MOCK_AUDIT, MOCK_PERMISSIONS, effectivePermissions, mockUsers, mockAudit } from './admin';
import { api } from '../lib/api';
import { setLocalSession } from '../lib/local-auth';

afterEach(() => { setLocalSession(false); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it('keeps role memberships and permissions consistent', () => {
  for (const role of MOCK_ROLES) {
    expect(role.memberCount).toBe(MOCK_USERS.filter((u) => u.roles.some((r) => r.id === role.id)).length);
    expect(role.permissionKeys.every((key) => MOCK_PERMISSIONS.some((p) => p.key === key))).toBe(true);
  }
  const user = MOCK_USERS.find((u) => u.overrides.length)!;
  const effective = effectivePermissions(user).permissions;
  for (const override of user.overrides) expect(effective.find((p) => p.key === override.key)).toMatchObject({ allowed: override.effect === 'grant', source: { type: override.effect } });
});

it('filters users by search, role and status and paginates', () => {
  const user = MOCK_USERS[7]!;
  const result = mockUsers({ q: user.email, status: user.status, roleId: user.roles[0]!.id });
  expect(result.items).toEqual([user]);
  expect(mockUsers({ q: 'missing-user' }).total).toBe(0);
  const pages = [1, 2, 3, 4].flatMap((page) => mockUsers({ page, pageSize: 10 }).items);
  expect(new Set(pages.map((u) => u.id)).size).toBe(MOCK_USERS.length);
});

it('filters audit events by action, target and inclusive dates', () => {
  const event = MOCK_AUDIT[10]!;
  expect(mockAudit({ action: event.action, targetId: event.targetId, from: event.at, to: event.at }).items).toEqual([event]);
  expect(mockAudit({ action: 'missing' }).items).toEqual([]);
  const ids: string[] = [];
  let cursor: string | null = null;
  do {
    const page = mockAudit({ cursor, limit: 50 });
    ids.push(...page.items.map((a) => a.id));
    cursor = page.nextCursor;
  } while (cursor);
  expect(ids).toEqual(MOCK_AUDIT.map((a) => a.id));
});

it('serves admin preview routes locally and keeps writes blocked', async () => {
  vi.stubEnv('NODE_ENV', 'development');
  vi.stubGlobal('window', { location: { hostname: 'localhost' } });
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  setLocalSession(true);
  expect(await api('/users')).toMatchObject({ total: 36 });
  expect(await api('/roles')).toHaveLength(6);
  expect(await api('/permissions')).toEqual(MOCK_PERMISSIONS);
  expect(await api('/audit')).toMatchObject({ nextCursor: '50' });
  expect(await api(`/users/${MOCK_USERS[0]!.id}`)).toEqual(MOCK_USERS[0]);
  expect(await api(`/users/${MOCK_USERS[0]!.id}/effective-permissions`)).toEqual(effectivePermissions(MOCK_USERS[0]!));
  await expect(api('/users/missing')).rejects.toMatchObject({ status: 404 });
  await expect(api('/roles', { method: 'POST', body: {} })).rejects.toMatchObject({ status: 503 });
  expect(fetch).not.toHaveBeenCalled();
});

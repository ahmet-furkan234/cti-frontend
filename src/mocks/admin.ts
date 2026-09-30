import { PERMISSIONS as P } from '../lib/permissions';
import { AUDIT_ACTIONS } from '../lib/audit-actions';
import type { AuditEntry, AuditResponse, EffectivePermission, PermissionDef, Role, UserDetail, UserListResponse } from '../lib/types';

const now = Date.now();
const ago = (hours: number) => new Date(now - hours * 3_600_000).toISOString();
const definitions = [
  ['super_admin', 'Tüm modüllere erişim', Object.values(P)],
  ['admin', 'Kullanıcı ve operasyon yönetimi', [P.CVE_READ, P.DASHBOARD_VIEW, P.SYNC_VIEW, P.SYNC_RUN, P.USER_READ, P.USER_CREATE, P.USER_UPDATE, P.USER_DELETE, P.USER_RESET_PASSWORD, P.ROLE_READ, P.AUDIT_READ]],
  ['analyst', 'Tehdit analizi ve zafiyet inceleme', [P.CVE_READ, P.DASHBOARD_VIEW, P.SYNC_VIEW]],
  ['viewer', 'Salt okunur erişim', [P.CVE_READ, P.DASHBOARD_VIEW]],
  ['soc_lead', 'SOC ekibi ve denetim görünürlüğü', [P.CVE_READ, P.DASHBOARD_VIEW, P.SYNC_VIEW, P.AUDIT_READ, P.USER_READ]],
  ['auditor', 'Denetim kayıtları ve rol inceleme', [P.AUDIT_READ, P.USER_READ, P.ROLE_READ]],
] as const;

export const MOCK_ROLES: Role[] = definitions.map(([name, description, permissions], i) => ({
  id: `demo-role-${i + 1}`, name, description, permissionKeys: [...permissions],
  isSystem: i < 4, memberCount: 0, createdAt: ago(24 * 180), updatedAt: ago(24 * (i + 1)),
}));

const names = ['Deniz Yılmaz', 'Ece Kaya', 'Mert Demir', 'Selin Aydın', 'Arda Çelik', 'İpek Şahin', 'Can Arslan', 'Duru Koç', 'Bora Aksoy', 'Elif Yıldız', 'Emre Güneş', 'Ada Polat'];
export const MOCK_USERS: UserDetail[] = Array.from({ length: 36 }, (_, i) => {
  const roles = [MOCK_ROLES[i % MOCK_ROLES.length]!];
  if (i % 7 === 0 && i > 0 && roles[0] !== MOCK_ROLES[5]) roles.push(MOCK_ROLES[5]!);
  return {
    id: `demo-user-${String(i + 1).padStart(2, '0')}`,
    name: `${names[i % names.length]}${i >= names.length ? ` ${Math.floor(i / names.length) + 1}` : ''}`,
    email: `demo.user${i + 1}@example.com`, status: i % 8 === 7 ? 'disabled' : 'active',
    lastLoginAt: i % 9 === 8 ? null : ago(i * 3 + 0.25), createdAt: ago(24 * (120 - i)),
    roles: roles.map(({ id, name }) => ({ id, name })),
    overrides: i % 6 === 2 ? [{ key: P.AUDIT_READ, effect: 'grant' }, { key: P.SYNC_VIEW, effect: 'deny' }] : [],
  };
});
for (const role of MOCK_ROLES) role.memberCount = MOCK_USERS.filter((u) => u.roles.some((r) => r.id === role.id)).length;

const descriptions: Record<string, string> = {
  [P.CVE_READ]: 'CVE kayıtlarını görüntüleme', [P.DASHBOARD_VIEW]: 'Dashboard görüntüleme',
  [P.SYNC_VIEW]: 'Senkronizasyon durumunu görüntüleme', [P.SYNC_RUN]: 'Senkronizasyon başlatma',
  [P.USER_READ]: 'Kullanıcıları görüntüleme', [P.USER_CREATE]: 'Kullanıcı davet etme',
  [P.USER_UPDATE]: 'Kullanıcıları düzenleme', [P.USER_DELETE]: 'Kullanıcı silme',
  [P.USER_RESET_PASSWORD]: 'Parola sıfırlama bağlantısı oluşturma', [P.ROLE_READ]: 'Rolleri görüntüleme',
  [P.ROLE_MANAGE]: 'Rolleri yönetme', [P.PERMISSION_ASSIGN]: 'İzin atama', [P.AUDIT_READ]: 'Denetim kayıtlarını görüntüleme',
};
export const MOCK_PERMISSIONS: PermissionDef[] = Object.values(P).map((key) => ({
  key, module: key === P.PERMISSION_ASSIGN ? 'role' : key.split(':')[0]!, description: descriptions[key]!,
}));

export function effectivePermissions(user: UserDetail): { permissions: EffectivePermission[] } {
  return { permissions: MOCK_PERMISSIONS.map(({ key }) => {
    const override = user.overrides.find((o) => o.key === key);
    const roles = MOCK_ROLES.filter((r) => user.roles.some((ref) => ref.id === r.id) && r.permissionKeys.includes(key)).map((r) => r.name);
    return { key, allowed: override ? override.effect === 'grant' : roles.length > 0,
      source: override ? { type: override.effect } : { type: 'role', roles } };
  }) };
}

export const MOCK_AUDIT: AuditEntry[] = Array.from({ length: 144 }, (_, i) => {
  const action = AUDIT_ACTIONS[i % AUDIT_ACTIONS.length]!;
  const actor = MOCK_USERS[i % MOCK_USERS.length]!;
  const target = MOCK_USERS[(i + 2) % MOCK_USERS.length]!;
  const isRole = action.startsWith('role.');
  const isSync = action.startsWith('sync.');
  return {
    id: `demo-audit-${i + 1}`, actorId: actor.id, actorEmail: actor.email, action,
    targetType: isRole ? 'role' : isSync ? 'sync' : 'user',
    targetId: isRole ? MOCK_ROLES[i % MOCK_ROLES.length]!.id : isSync ? 'nvd' : action.startsWith('auth.') ? actor.id : target.id,
    meta: { demo: true, ...(isSync ? { source: 'nvd' } : isRole ? { name: MOCK_ROLES[i % MOCK_ROLES.length]!.name } : { email: action.startsWith('auth.') ? actor.email : target.email }) },
    ip: `192.0.2.${1 + i % 250}`, at: ago(i * 5 + 0.1),
  };
});

type Query = Record<string, string | number | boolean | string[] | null | undefined>;
export function mockUsers(query: Query = {}): UserListResponse {
  const q = String(query.q ?? '').toLocaleLowerCase('tr');
  const rows = MOCK_USERS.filter((u) => (!q || `${u.name} ${u.email}`.toLocaleLowerCase('tr').includes(q))
    && (!query.status || u.status === query.status) && (!query.roleId || u.roles.some((r) => r.id === query.roleId)));
  const page = Math.max(1, Math.floor(Number(query.page) || 1));
  const pageSize = Math.max(1, Math.min(100, Math.floor(Number(query.pageSize) || 20)));
  return { items: rows.slice((page - 1) * pageSize, page * pageSize), total: rows.length, page, pageSize };
}
export function mockAudit(query: Query = {}): AuditResponse {
  const rows = MOCK_AUDIT.filter((a) => (!query.action || a.action === query.action)
    && (!query.targetId || a.targetId === query.targetId)
    && (!query.from || Date.parse(a.at) >= Date.parse(String(query.from)))
    && (!query.to || Date.parse(a.at) <= Date.parse(String(query.to))));
  const offset = Math.max(0, Math.floor(Number(query.cursor) || 0));
  const limit = Math.max(1, Math.min(100, Math.floor(Number(query.limit) || 50)));
  return { items: rows.slice(offset, offset + limit), nextCursor: offset + limit < rows.length ? String(offset + limit) : null };
}
export function mockAdminRead(path: string, query?: Query): unknown {
  if (path === '/users') return mockUsers(query);
  if (path === '/roles') return MOCK_ROLES;
  if (path === '/permissions') return MOCK_PERMISSIONS;
  if (path === '/audit') return mockAudit(query);
  const match = /^\/users\/([^/]+)(\/effective-permissions)?$/.exec(path);
  if (match) {
    const user = MOCK_USERS.find((u) => u.id === decodeURIComponent(match[1]!));
    if (user) return match[2] ? effectivePermissions(user) : user;
  }
  return undefined;
}

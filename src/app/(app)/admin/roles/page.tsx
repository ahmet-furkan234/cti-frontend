'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminHeader, Drawer, errorMessage } from '@/components/admin/admin-parts';
import { AccessEditor } from '@/components/admin/access-editor';
import { useAuth } from '@/components/auth-provider';
import { RequirePermission } from '@/components/shell/page-guard';
import { Banner, Button, Icon, Skeleton, StateBlock, Tag, TextField } from '@/components/ui';
import { usePermissionCatalog, useRoleMutations, useRoles } from '@/features/admin/hooks';
import { useI18n } from '@/i18n';
import { areaTitle, groupByArea, roleLabel, type AccessArea } from '@/lib/access';
import { PERMISSIONS as P, SENSITIVE_PERMISSIONS } from '@/lib/permissions';
import type { Role } from '@/lib/types';

const NEW = 'new';

/** Areas in which the role grants at least one action. */
const areasOf = (role: Role, areas: AccessArea[]) => areas.filter((a) => a.perms.some((p) => role.permissionKeys.includes(p.key)));

function RoleCard({ role, areas, onOpen }: { role: Role; areas: AccessArea[]; onOpen: () => void }) {
  const { t } = useI18n();
  const mine = areasOf(role, areas);
  const shown = mine.slice(0, 4);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-surface p-5 text-left shadow-card transition-colors hover:border-line-strong hover:bg-surface-2"
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 grow">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-base font-semibold">{roleLabel(t, role.name)}</h2>
            {role.isSystem ? <Icon name="lock" size={14} className="shrink-0 text-ink-subtle" aria-label={t('roles.system')} /> : null}
          </div>
          <p className="line-clamp-2 min-h-10 text-sm text-ink-muted">{role.description}</p>
        </div>
      </div>
      <div className="flex min-h-7 flex-wrap gap-1.5">
        {shown.length === 0 ? <span className="text-sm text-ink-subtle">{t('access.none')}</span> : null}
        {shown.map((a) => <Tag key={a.module}>{areaTitle(t, a.module)}</Tag>)}
        {mine.length > shown.length ? <Tag>+{mine.length - shown.length}</Tag> : null}
      </div>
      <div className="flex items-center gap-1.5 border-t border-line pt-3 text-sm text-ink-muted">
        <Icon name="users" size={15} />
        {role.memberCount > 0 ? t('roles.card.members', { n: role.memberCount }) : t('roles.card.noMembers')}
      </div>
    </button>
  );
}

function RoleDrawer({ role, areas, onClose }: { role: Role | null; areas: AccessArea[]; onClose: () => void }) {
  const { t } = useI18n();
  const { can, user } = useAuth();
  const m = useRoleMutations();
  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [keys, setKeys] = useState<string[]>(role?.permissionKeys ?? []);

  useEffect(() => {
    setName(role?.name ?? '');
    setDescription(role?.description ?? '');
    setKeys(role?.permissionKeys ?? []);
    m.create.reset();
    m.update.reset();
    m.remove.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role?.id, role?.updatedAt]);

  const canManage = can(P.ROLE_MANAGE);
  const isSuper = role?.name === 'super_admin';
  const held = new Set(user?.permissions ?? []);
  const original = new Set(role?.permissionKeys ?? []);
  const selected = new Set(keys);
  // An admin can hand out only what they hold themselves; taking something away is always allowed.
  const canChange = (k: string) => canManage && !isSuper && (held.has(k) || selected.has(k));
  const changed = keys.filter((k) => !original.has(k)).length + [...original].filter((k) => !selected.has(k)).length;
  const dirty = !role || changed > 0 || name.trim() !== role.name || description.trim() !== role.description;
  const addedSensitive = keys.find((k) => SENSITIVE_PERMISSIONS.includes(k) && !original.has(k));

  const save = () => {
    const body = { name: name.trim(), description: description.trim(), permissionKeys: keys };
    if (!role) {
      m.create.mutate(body, { onSuccess: onClose });
    } else {
      m.update.mutate(
        { id: role.id, description: body.description, ...(role.isSystem ? {} : { name: body.name }), ...(isSuper ? {} : { permissionKeys: keys }) },
        { onSuccess: onClose },
      );
    }
  };
  const remove = () => {
    if (!role || !window.confirm(t('roles.editor.deleteConfirm', { name: roleLabel(t, role.name) }))) return;
    m.remove.mutate(role.id, { onSuccess: onClose });
  };
  const err = m.create.error ?? m.update.error ?? m.remove.error;

  return (
    <Drawer
      wide
      title={role ? roleLabel(t, role.name) : t('roles.editor.new')}
      onClose={onClose}
      footer={canManage ? (
        <div className="flex w-full items-center justify-between gap-2">
          {role && !role.isSystem ? (
            <Button variant="danger" icon="trash" onClick={remove} loading={m.remove.isPending} disabled={role.memberCount > 0} title={role.memberCount > 0 ? t('roles.editor.affected', { n: role.memberCount }) : undefined}>
              {t('roles.editor.delete')}
            </Button>
          ) : <span />}
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
            <Button variant="primary" icon="check" onClick={save} loading={m.create.isPending || m.update.isPending} disabled={!dirty || !name.trim()}>{t('common.save')}</Button>
          </div>
        </div>
      ) : undefined}
    >
      {err ? <Banner tone="error">{errorMessage(err, t('common.tryAgainLater'))}</Banner> : null}
      {role?.isSystem ? <Banner tone="info">{isSuper ? t('roles.editor.superNote') : t('roles.editor.systemNote')}</Banner> : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TextField label={t('roles.editor.name')} value={name} onChange={(e) => setName(e.target.value)} disabled={!canManage || !!role?.isSystem} hint={t('roles.editor.nameHint')} />
        <TextField label={t('roles.editor.description')} value={description} onChange={(e) => setDescription(e.target.value)} disabled={!canManage} />
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-base font-semibold">{t('roles.editor.access')}</h3>
        <p className="text-sm text-ink-muted">{canManage && !isSuper ? `${t('roles.editor.accessHint')} ${t('roles.editor.heldOnly')}` : t('roles.editor.accessHint')}</p>
        <AccessEditor areas={areas} keys={keys} onChange={setKeys} canChange={canChange} />
      </div>

      {addedSensitive ? (
        <Banner tone="warning" title={t('perm.critical.title')}>
          {t('perm.critical.text', { key: areas.flatMap((a) => a.perms).find((p) => p.key === addedSensitive)?.description ?? addedSensitive })}
        </Banner>
      ) : null}
      {role && role.memberCount > 0 && !role.isSystem && dirty ? <p className="text-sm text-ink-muted">{t('roles.editor.affected', { n: role.memberCount })}</p> : null}

    </Drawer>
  );
}

function RolesView() {
  const { t } = useI18n();
  const { can } = useAuth();
  const roles = useRoles();
  const catalog = usePermissionCatalog();
  const [openId, setOpenId] = useState<string | null>(null);

  const list = roles.data ?? [];
  const areas = useMemo(() => groupByArea(catalog.data ?? []), [catalog.data]);
  const open = openId && openId !== NEW ? (list.find((r) => r.id === openId) ?? null) : null;

  return (
    <div className="mx-auto flex w-full max-w-[1100px] min-w-0 grow flex-col gap-5 p-4 md:p-8">
      <AdminHeader subtitle={t('roles.subtitle')} actions={can(P.ROLE_MANAGE) ? <Button variant="primary" icon="plus" onClick={() => setOpenId(NEW)}>{t('roles.new')}</Button> : undefined} />
      {roles.isError || catalog.isError ? (
        <div className="min-w-0 rounded-xl border border-line bg-surface shadow-card"><StateBlock kind="error" title={t('common.loadError')} description={t('common.tryAgainLater')} /></div>
      ) : roles.isPending || catalog.isPending ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => <div key={i} className="rounded-xl border border-line bg-surface p-5"><Skeleton lines={3} height={12} /></div>)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((r) => <RoleCard key={r.id} role={r} areas={areas} onOpen={() => setOpenId(r.id)} />)}
        </div>
      )}
      {(openId === NEW || open) && catalog.data ? <RoleDrawer key={openId} role={open} areas={areas} onClose={() => setOpenId(null)} /> : null}
    </div>
  );
}

export default function RolesPage() {
  return (
    <RequirePermission any={[P.ROLE_READ]}>
      <RolesView />
    </RequirePermission>
  );
}

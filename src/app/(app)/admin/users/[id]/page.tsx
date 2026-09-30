'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { errorMessage } from '@/components/admin/admin-parts';
import { AuditRows } from '@/components/admin/audit-rows';
import { PermissionMatrix } from '@/components/admin/permission-matrix';
import { useAuth } from '@/components/auth-provider';
import { RequirePermission } from '@/components/shell/page-guard';
import { Banner, Button, Checkbox, MonoText, Skeleton, StateBlock, StatusPill, Tabs, Tag, TextField, buttonClass } from '@/components/ui';
import { useAudit, usePermissionCatalog, useRoles, useUser, useUserMutations } from '@/features/admin/hooks';
import { useI18n } from '@/i18n';
import { ApiError } from '@/lib/api';
import { formatDate, initials } from '@/lib/format';
import { PERMISSIONS as P } from '@/lib/permissions';
import { useAge } from '@/lib/use-age';
import type { UserDetail } from '@/lib/types';

type TabId = 'profile' | 'roles' | 'permissions' | 'sessions' | 'activity';

function ProfileTab({ user }: { user: UserDetail }) {
  const { t } = useI18n();
  const { can } = useAuth();
  const m = useUserMutations(user.id);
  const [name, setName] = useState(user.name);
  useEffect(() => setName(user.name), [user.name]);
  const dirty = name.trim() !== user.name && name.trim().length > 0;

  return (
    <div className="grid grid-2" style={{ alignItems: 'start' }}>
      <section className="card card--pad col gap-16">
        {m.update.isSuccess && !dirty ? <Banner tone="success">{t('ud.profile.saved')}</Banner> : null}
        {m.update.isError ? <Banner tone="error">{errorMessage(m.update.error, t('common.tryAgainLater'))}</Banner> : null}
        <TextField label={t('ud.profile.name')} value={name} onChange={(e) => setName(e.target.value)} disabled={!can(P.USER_UPDATE)} />
        <TextField label={t('ud.profile.email')} value={user.email} readOnly disabled mono />
        <div className="grid grid-2" style={{ gap: 8 }}>
          <div className="kv-tile"><span className="k">{t('ud.profile.status')}</span><span className="v"><StatusPill status={user.status} /></span></div>
          <div className="kv-tile"><span className="k">{t('ud.profile.created')}</span><span className="v mono-12">{formatDate(user.createdAt)}</span></div>
        </div>
        {can(P.USER_UPDATE) ? (
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Button variant="primary" icon="check" disabled={!dirty} loading={m.update.isPending} onClick={() => m.update.mutate({ name: name.trim() })}>{t('common.save')}</Button>
          </div>
        ) : null}
      </section>
      {can(P.USER_RESET_PASSWORD) ? <ResetCard userId={user.id} /> : null}
    </div>
  );
}

function ResetCard({ userId }: { userId: string }) {
  const { t } = useI18n();
  const m = useUserMutations(userId);
  const r = m.issueReset;
  return (
    <section className="card card--pad col gap-12">
      <h2 className="h3">{t('ud.reset.title')}</h2>
      <p className="sub">{t('ud.reset.desc')}</p>
      {r.isError ? <Banner tone="error">{errorMessage(r.error, t('common.tryAgainLater'))}</Banner> : null}
      {r.data ? (
        <Banner tone="success" title={t('ud.reset.ready')}>
          <span>{t('ud.reset.valid', { date: formatDate(r.data.expiresAt) })}</span>
          <div style={{ marginTop: 6 }}>
            <MonoText copy truncate>{r.data.resetUrl}</MonoText>
          </div>
        </Banner>
      ) : null}
      <div><Button loading={r.isPending} onClick={() => r.mutate()} icon="key">{t('ud.reset.button')}</Button></div>
    </section>
  );
}

function RolesTab({ user }: { user: UserDetail }) {
  const { t } = useI18n();
  const { can, user: me } = useAuth();
  const roles = useRoles();
  const m = useUserMutations(user.id);
  const [selected, setSelected] = useState<string[]>(user.roles.map((r) => r.id));
  const key = user.roles.map((r) => r.id).sort().join(',');
  useEffect(() => setSelected(key ? key.split(',') : []), [key]);
  const dirty = selected.slice().sort().join(',') !== key;
  const isSelf = me?.id === user.id;
  const editable = can(P.USER_UPDATE) && !isSelf;

  return (
    <section className="card card--pad col gap-12" style={{ maxWidth: 640 }}>
      <p className="sub">{t('ud.roles.desc')}</p>
      {m.update.isError ? <Banner tone="error">{errorMessage(m.update.error, t('common.tryAgainLater'))}</Banner> : null}
      {(roles.data ?? []).map((r) => (
        <label key={r.id} className="row" style={{ cursor: editable ? 'pointer' : 'default' }}>
          <Checkbox disabled={!editable} checked={selected.includes(r.id)} onChange={(e) => setSelected((cur) => (e.target.checked ? [...cur, r.id] : cur.filter((x) => x !== r.id)))} />
          <span className="col">
            <span style={{ fontWeight: 500 }}>{r.name}</span>
            <span className="sub">{r.description}</span>
          </span>
        </label>
      ))}
      {editable ? (
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          {selected.length === 0 ? <span className="sub t-critical grow">{t('ud.roles.needOne')}</span> : null}
          <Button variant="primary" icon="check" disabled={!dirty || selected.length === 0} loading={m.update.isPending} onClick={() => m.update.mutate({ roleIds: selected })}>{t('ud.roles.save')}</Button>
        </div>
      ) : null}
    </section>
  );
}

function PermissionsTab({ user }: { user: UserDetail }) {
  const { t } = useI18n();
  const { can, user: me } = useAuth();
  const catalog = usePermissionCatalog();
  const roles = useRoles();
  const m = useUserMutations(user.id);
  if (catalog.isPending || roles.isPending) return <Skeleton lines={6} height={14} />;
  if (catalog.isError || roles.isError) {
    return <div className="card"><StateBlock kind="error" title={t('common.loadError')} description={t('common.tryAgainLater')} /></div>;
  }
  const userRoles = roles.data.filter((r) => user.roles.some((x) => x.id === r.id));
  return (
    <div className="col gap-12">
      {m.setOverrides.isSuccess ? <Banner tone="success">{t('perm.saved')}</Banner> : null}
      {m.setOverrides.isError ? <Banner tone="error">{errorMessage(m.setOverrides.error, t('common.tryAgainLater'))}</Banner> : null}
      <PermissionMatrix
        catalog={catalog.data}
        userRoles={userRoles}
        overrides={user.overrides}
        canEdit={can(P.PERMISSION_ASSIGN) && me?.id !== user.id}
        saving={m.setOverrides.isPending}
        onSave={(o) => m.setOverrides.mutate(o)}
      />
    </div>
  );
}

function ActivityTab({ userId }: { userId: string }) {
  const { t } = useI18n();
  const { can } = useAuth();
  const audit = useAudit({ targetId: userId }, can(P.AUDIT_READ));
  if (!can(P.AUDIT_READ)) return <div className="card"><StateBlock kind="forbidden" compact title={t('ud.activity.noAccess')} /></div>;
  const items = audit.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <section className="card card--clip">
      {audit.isPending ? <div style={{ padding: 16 }}><Skeleton lines={4} height={10} /></div> : null}
      {!audit.isPending && items.length === 0 ? <StateBlock kind="empty" compact title={t('ud.activity.empty')} /> : null}
      <AuditRows items={items} />
      {audit.hasNextPage ? (
        <div style={{ padding: 12 }}><Button size="sm" loading={audit.isFetchingNextPage} onClick={() => void audit.fetchNextPage()}>{t('audit.loadMore')}</Button></div>
      ) : null}
    </section>
  );
}

function UserDetailView() {
  const { t } = useI18n();
  const { can, user: me } = useAuth();
  const age = useAge();
  const { id } = useParams<{ id: string }>();
  const { data: user, isPending, error, refetch } = useUser(id);
  const m = useUserMutations(id);
  const [tab, setTab] = useState<TabId>('permissions');
  const [flash, setFlash] = useState<string | null>(null);

  if (error instanceof ApiError && (error.status === 404 || error.status === 422)) {
    return (
      <div className="page"><div className="card">
        <StateBlock kind="no-results" code="404" title={t('ud.notFound')} action={<Link href="/admin/users" className={buttonClass()}>{t('ud.backToUsers')}</Link>} />
      </div></div>
    );
  }
  if (error) {
    return <div className="page"><div className="card"><StateBlock kind="error" title={t('common.loadError')} description={t('common.tryAgainLater')} action={<Button onClick={() => void refetch()}>{t('common.retry')}</Button>} /></div></div>;
  }
  if (isPending || !user) return <div className="page page--tight"><Skeleton width={280} height={28} /><Skeleton lines={5} height={12} /></div>;

  const isSelf = me?.id === user.id;
  const disabled = user.status === 'disabled';
  const tabs = [
    { id: 'profile', label: t('ud.tab.profile') },
    { id: 'roles', label: t('ud.tab.roles'), count: user.roles.length },
    { id: 'permissions', label: t('ud.tab.permissions') },
    { id: 'sessions', label: t('ud.tab.sessions') },
    { id: 'activity', label: t('ud.tab.activity') },
  ];

  const toggleStatus = () => {
    if (!disabled && !window.confirm(t('ud.disableConfirm', { name: user.name }))) return;
    m.update.mutate({ status: disabled ? 'active' : 'disabled' });
  };
  const revoke = () =>
    m.revokeSessions.mutate(undefined, { onSuccess: () => setFlash(t('ud.revoked')) });

  return (
    <div className="page page--tight">
      <nav className="breadcrumb" aria-label="breadcrumb">
        <Link href="/admin/users">{t('ud.breadcrumb.users')}</Link> / {user.name}
      </nav>
      <div className="row" style={{ gap: 14, flexWrap: 'wrap' }}>
        <span className="avatar" style={{ width: 44, height: 44, fontSize: 15 }}>{initials(user.name)}</span>
        <div className="col grow min0">
          <div className="row" style={{ gap: 10 }}>
            <h1 className="h1">{user.name}</h1>
            <StatusPill status={user.status} />
          </div>
          <div className="row wrap muted" style={{ fontSize: 12 }}>
            <span className="mono">{user.email}</span>·
            {user.roles.map((r) => <Tag key={r.id}>{r.name}</Tag>)}·
            <span>{user.lastLoginAt ? t('ud.lastLogin', { age: age(user.lastLoginAt) }) : t('ud.neverSignedIn')}</span>
          </div>
        </div>
        {can(P.USER_UPDATE) && !isSelf ? (
          <>
            <Button onClick={revoke} loading={m.revokeSessions.isPending}>{t('ud.revokeSessions')}</Button>
            <Button variant={disabled ? 'secondary' : 'danger'} onClick={toggleStatus} loading={m.update.isPending}>{disabled ? t('ud.enable') : t('ud.disable')}</Button>
          </>
        ) : null}
      </div>
      {flash ? <Banner tone="success" onDismiss={() => setFlash(null)}>{flash}</Banner> : null}
      {m.revokeSessions.isError ? <Banner tone="error">{errorMessage(m.revokeSessions.error, t('common.tryAgainLater'))}</Banner> : null}
      {m.update.isError && tab === 'profile' ? null : m.update.isError ? <Banner tone="error">{errorMessage(m.update.error, t('common.tryAgainLater'))}</Banner> : null}

      <Tabs label={t('ud.tabs.label')} items={tabs} value={tab} onChange={(v) => setTab(v as TabId)} />
      {tab === 'profile' ? <ProfileTab user={user} /> : null}
      {tab === 'roles' ? <RolesTab user={user} /> : null}
      {tab === 'permissions' ? <PermissionsTab user={user} /> : null}
      {tab === 'sessions' ? (
        <div className="card">
          <StateBlock kind="empty" title={t('ud.sessions.title')} description={t('ud.sessions.desc')} action={can(P.USER_UPDATE) && !isSelf ? <Button onClick={revoke} loading={m.revokeSessions.isPending}>{t('ud.revokeSessions')}</Button> : undefined} />
        </div>
      ) : null}
      {tab === 'activity' ? <ActivityTab userId={user.id} /> : null}
    </div>
  );
}

export default function UserDetailPage() {
  return (
    <RequirePermission any={[P.USER_READ]}>
      <UserDetailView />
    </RequirePermission>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { AdminTabs, Drawer, errorMessage } from '@/components/admin/admin-parts';
import { useAuth } from '@/components/auth-provider';
import { PageHeader, RequirePermission } from '@/components/shell/page-guard';
import { Banner, Button, Checkbox, DataTable, MonoText, SearchInput, StateBlock, StatusPill, Tag, TextField } from '@/components/ui';
import { useInviteUser, useRoles, useUsers } from '@/features/admin/hooks';
import { useI18n } from '@/i18n';
import { ApiError } from '@/lib/api';
import { formatDate, initials } from '@/lib/format';
import { PERMISSIONS as P } from '@/lib/permissions';
import { useAge } from '@/lib/use-age';
import type { UserListItem } from '@/lib/types';

function InviteDrawer({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const roles = useRoles();
  const invite = useInviteUser();
  const [email, setEmail] = useState('');
  const [roleIds, setRoleIds] = useState<string[]>([]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    invite.mutate({ email, roleIds });
  };
  const result = invite.data;
  const errorText = invite.error
    ? invite.error instanceof ApiError && invite.error.status === 409
      ? t('invite.exists')
      : errorMessage(invite.error, t('common.tryAgainLater'))
    : null;

  return (
    <Drawer title={t('invite.title')} onClose={onClose}>
      {result ? (
        <>
          <Banner tone="success" title={t('invite.created')}>
            {t('invite.createdText', { email: result.email, date: formatDate(result.expiresAt) })}
          </Banner>
          <div className="col gap-8">
            <MonoText copy truncate>{result.inviteUrl}</MonoText>
            <Button icon="copy" onClick={() => void navigator.clipboard?.writeText(result.inviteUrl)}>{t('invite.copyLink')}</Button>
          </div>
          <Button
            variant="ghost"
            onClick={() => {
              invite.reset();
              setEmail('');
              setRoleIds([]);
            }}
          >
            {t('invite.another')}
          </Button>
        </>
      ) : (
        <form className="col gap-16" onSubmit={submit}>
          <p className="sub">{t('invite.desc')}</p>
          {errorText ? <Banner tone="error">{errorText}</Banner> : null}
          <TextField label={t('invite.email')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          <fieldset style={{ border: 0, padding: 0, margin: 0 }} className="col gap-8">
            <legend className="cti-field__label" style={{ marginBottom: 6 }}>{t('invite.roles')}</legend>
            {(roles.data ?? []).map((r) => (
              <label key={r.id} className="row" style={{ cursor: 'pointer' }}>
                <Checkbox checked={roleIds.includes(r.id)} onChange={(e) => setRoleIds((cur) => (e.target.checked ? [...cur, r.id] : cur.filter((x) => x !== r.id)))} />
                <span className="col">
                  <span style={{ fontWeight: 500 }}>{r.name}</span>
                  <span className="sub">{r.description}</span>
                </span>
              </label>
            ))}
            <span className="sub subtle">{t('invite.rolesHint')}</span>
          </fieldset>
          <Button variant="primary" type="submit" loading={invite.isPending} disabled={!email || roleIds.length === 0}>{t('invite.submit')}</Button>
        </form>
      )}
    </Drawer>
  );
}

function UsersList() {
  const { t } = useI18n();
  const { can, user: me } = useAuth();
  const router = useRouter();
  const age = useAge();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'' | 'active' | 'disabled'>('');
  const [roleId, setRoleId] = useState('');
  const [page, setPage] = useState(1);
  const [inviting, setInviting] = useState(false);
  const pageSize = 25;

  const users = useUsers({ page, pageSize, ...(q.trim() ? { q: q.trim() } : {}), ...(status ? { status } : {}), ...(roleId ? { roleId } : {}) });
  const roles = useRoles(can(P.ROLE_READ, P.USER_READ));
  const total = users.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="page">
      <PageHeader
        title={t('users.title')}
        subtitle={users.data ? t('users.subtitle', { n: total }) : undefined}
        actions={can(P.USER_CREATE) ? <Button variant="primary" icon="plus" onClick={() => setInviting(true)}>{t('users.invite')}</Button> : undefined}
      />
      <AdminTabs />
      <div className="row gap-12 wrap">
        <SearchInput
          shortcut={null}
          style={{ width: 300 }}
          placeholder={t('users.searchPlaceholder')}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <select className="cti-select" aria-label={t('users.f.status')} value={status} onChange={(e) => { setStatus(e.target.value as typeof status); setPage(1); }}>
          <option value="">{t('users.f.allStatuses')}</option>
          <option value="active">{t('status.active')}</option>
          <option value="disabled">{t('status.disabled')}</option>
        </select>
        <select className="cti-select" aria-label={t('users.f.role')} value={roleId} onChange={(e) => { setRoleId(e.target.value); setPage(1); }}>
          <option value="">{t('users.f.allRoles')}</option>
          {(roles.data ?? []).map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </div>

      {users.isError ? (
        <div className="card">
          <StateBlock kind="error" title={t('common.loadError')} description={t('common.tryAgainLater')} action={<Button onClick={() => void users.refetch()}>{t('common.retry')}</Button>} />
        </div>
      ) : (
        <>
          <DataTable<UserListItem>
            loading={users.isPending}
            rows={users.data?.items ?? []}
            rowKey={(r) => r.id}
            onRowClick={(r) => router.push(`/admin/users/${r.id}`)}
            empty={<StateBlock kind="no-results" compact title={t('users.empty')} />}
            columns={[
              {
                key: 'user',
                header: t('users.col.user'),
                render: (r) => (
                  <span className="row" style={{ gap: 10 }}>
                    <span className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>{initials(r.name)}</span>
                    <span className="col">
                      <span style={{ fontWeight: 500, lineHeight: '16px' }}>{r.name}{r.id === me?.id ? <span className="subtle"> · {t('users.you')}</span> : null}</span>
                      <span className="mono-11 muted" style={{ lineHeight: '14px' }}>{r.email}</span>
                    </span>
                  </span>
                ),
              },
              {
                key: 'roles',
                header: t('users.col.roles'),
                render: (r) =>
                  r.roles.length ? (
                    <span className="row gap-4">{r.roles.map((x) => <Tag key={x.id}>{x.name}</Tag>)}</span>
                  ) : (
                    <span className="subtle">{t('users.noRoles')}</span>
                  ),
              },
              { key: 'status', header: t('users.col.status'), render: (r) => <StatusPill status={r.status} /> },
              { key: 'lastLogin', header: t('users.col.lastLogin'), render: (r) => <span className="muted" style={{ fontSize: 12 }}>{r.lastLoginAt ? age(r.lastLoginAt) : t('common.never')}</span> },
              { key: 'created', header: t('users.col.created'), align: 'right', render: (r) => <span className="mono-12 muted">{formatDate(r.createdAt)}</span> },
            ]}
          />
          <div className="row gap-12 muted" style={{ fontSize: 12 }}>
            <span className="grow">{t('users.page', { page, pages, total })}</span>
            <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{t('common.previous')}</Button>
            <Button size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>{t('common.next')}</Button>
          </div>
        </>
      )}
      {inviting ? <InviteDrawer onClose={() => setInviting(false)} /> : null}
    </div>
  );
}

export default function UsersPage() {
  return (
    <RequirePermission any={[P.USER_READ]}>
      <UsersList />
    </RequirePermission>
  );
}

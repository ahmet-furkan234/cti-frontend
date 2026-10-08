'use client';

import { useState, type FormEvent } from 'react';
import { Drawer, errorMessage } from '@/components/admin/admin-parts';
import { useAuth } from '@/components/auth-provider';
import { PageHeader, RequirePermission } from '@/components/shell/page-guard';
import { Banner, Button, MonoText, Skeleton, StateBlock, StatusPill, Tag, TextField } from '@/components/ui';
import { useCompanies, useCompanyMutations } from '@/features/companies/hooks';
import { useI18n } from '@/i18n';
import { ApiError } from '@/lib/api';
import { PERMISSIONS as P } from '@/lib/permissions';
import type { CompanyListItem, CreateCompanyResult } from '@/lib/types';

const PAGE = 'mx-auto flex w-full max-w-[1100px] min-w-0 grow flex-col gap-5 p-4 md:p-8';

function CreateDrawer({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const { create } = useCompanyMutations();
  const [name, setName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [result, setResult] = useState<CreateCompanyResult | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    create.mutate({ name: name.trim(), ...(adminEmail.trim() ? { adminEmail: adminEmail.trim() } : {}) }, { onSuccess: setResult });
  };
  const error = create.error
    ? create.error instanceof ApiError && create.error.status === 409
      ? t('companies.exists')
      : errorMessage(create.error, t('common.tryAgainLater'))
    : null;

  return (
    <Drawer
      title={t('companies.add.title')}
      onClose={onClose}
      footer={result ? (
        <>
          <span className="grow" />
          <Button variant="primary" onClick={onClose}>{t('common.close')}</Button>
        </>
      ) : (
        <>
          <span className="grow" />
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" type="submit" form="company-form" icon="check" loading={create.isPending} disabled={!name.trim()}>{t('companies.create')}</Button>
        </>
      )}
    >
      {result ? (
        <>
          <Banner tone="success" title={t('companies.created', { name: result.company.name })}>
            {result.invite ? t('companies.invite.text', { email: result.invite.email }) : null}
          </Banner>
          {result.invite ? (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">{t('companies.invite.title')}</span>
              <MonoText copy truncate>{result.invite.inviteUrl}</MonoText>
              <Button icon="copy" onClick={() => void navigator.clipboard?.writeText(result.invite!.inviteUrl)}>{t('companies.invite.copy')}</Button>
            </div>
          ) : null}
        </>
      ) : (
        <form id="company-form" className="flex flex-col gap-4" onSubmit={submit}>
          <p className="text-[15px] text-ink-muted">{t('companies.add.desc')}</p>
          {error ? <Banner tone="error">{error}</Banner> : null}
          <TextField label={t('companies.f.name')} value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          <TextField label={t('companies.f.admin')} hint={t('companies.f.admin.hint')} type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
        </form>
      )}
    </Drawer>
  );
}

function RenameDrawer({ company, onClose }: { company: CompanyListItem; onClose: () => void }) {
  const { t } = useI18n();
  const { update } = useCompanyMutations();
  const [name, setName] = useState(company.name);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim() && name.trim() !== company.name) update.mutate({ id: company.id, name: name.trim() }, { onSuccess: onClose });
  };
  const error = update.error
    ? update.error instanceof ApiError && update.error.status === 409
      ? t('companies.exists')
      : errorMessage(update.error, t('common.tryAgainLater'))
    : null;
  return (
    <Drawer
      title={t('companies.rename')}
      onClose={onClose}
      footer={
        <>
          <span className="grow" />
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" type="submit" form="rename-form" icon="check" loading={update.isPending} disabled={!name.trim() || name.trim() === company.name}>{t('common.save')}</Button>
        </>
      }
    >
      <form id="rename-form" className="flex flex-col gap-4" onSubmit={submit}>
        {error ? <Banner tone="error">{error}</Banner> : null}
        <TextField label={t('companies.f.name')} value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
      </form>
    </Drawer>
  );
}

function Companies() {
  const { t, locale } = useI18n();
  const { user, switchCompany } = useAuth();
  const { data, isPending, isError, refetch } = useCompanies();
  const { update } = useCompanyMutations();
  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState<CompanyListItem | null>(null);
  const acting = user?.actingCompany?.id;
  const items = data?.items ?? [];
  const hasOthers = items.some((c) => !c.isPlatform);

  const toggle = (c: CompanyListItem) => {
    const suspend = c.status === 'active';
    if (suspend && !window.confirm(t('companies.suspend.confirm', { name: c.name }))) return;
    update.mutate({ id: c.id, status: suspend ? 'suspended' : 'active' });
  };

  return (
    <div className={PAGE}>
      <PageHeader
        title={t('companies.title')}
        subtitle={t('companies.subtitle')}
        actions={<Button variant="primary" icon="plus" onClick={() => setAdding(true)}>{t('companies.add')}</Button>}
      />

      {isError ? (
        <div className="rounded-xl border border-line bg-surface shadow-card">
          <StateBlock kind="error" title={t('common.loadError')} description={t('common.tryAgainLater')} action={<Button onClick={() => void refetch()}>{t('common.retry')}</Button>} />
        </div>
      ) : (
        <section className="min-w-0 overflow-hidden rounded-xl border border-line bg-surface shadow-card" aria-busy={isPending}>
          {isPending ? Array.from({ length: 3 }, (_, i) => <div key={i} className="border-b border-line px-5 py-5 last:border-b-0"><Skeleton lines={2} height={12} /></div>) : null}
          {items.map((c) => (
            <div key={c.id} className="flex flex-col gap-3 border-b border-line px-5 py-4 last:border-b-0 md:flex-row md:items-center">
              <div className="flex min-w-0 grow flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-[15px] font-semibold">{c.name}</span>
                  {c.isPlatform ? <Tag>{t('companies.platform')}</Tag> : null}
                  <StatusPill status={c.status === 'active' ? 'active' : 'disabled'} label={t(`companies.status.${c.status}` as 'companies.status.active')} />
                </div>
                <span className="text-sm text-ink-muted">
                  {t('companies.users', { n: c.users.toLocaleString(locale) })} · {t('companies.assets', { n: c.assets.toLocaleString(locale) })}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {c.id === acting ? (
                  <span className="text-sm text-ink-subtle">{t('companies.current')}</span>
                ) : c.status === 'active' ? (
                  <Button size="sm" onClick={() => switchCompany(c.id === user?.company?.id ? null : c.id)}>{t('companies.enter')}</Button>
                ) : null}
                <Button size="sm" variant="ghost" onClick={() => setRenaming(c)}>{t('companies.rename')}</Button>
                {!c.isPlatform ? (
                  <Button size="sm" variant={c.status === 'active' ? 'danger' : 'secondary'} loading={update.isPending && update.variables?.id === c.id} onClick={() => toggle(c)}>
                    {t(c.status === 'active' ? 'companies.suspend' : 'companies.activate')}
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
          {!isPending && !hasOthers ? <StateBlock kind="empty" compact title={t('companies.empty')} description={t('companies.empty.desc')} /> : null}
        </section>
      )}

      {update.error ? <Banner tone="error">{errorMessage(update.error, t('common.tryAgainLater'))}</Banner> : null}
      {adding ? <CreateDrawer onClose={() => setAdding(false)} /> : null}
      {renaming ? <RenameDrawer company={renaming} onClose={() => setRenaming(null)} /> : null}
    </div>
  );
}

export default function CompaniesPage() {
  return (
    <RequirePermission any={[P.COMPANY_READ, P.COMPANY_MANAGE]}>
      <Companies />
    </RequirePermission>
  );
}

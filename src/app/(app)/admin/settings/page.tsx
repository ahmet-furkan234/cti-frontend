'use client';

import { useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { SoftwareCombobox } from '@/components/assets/software-combobox';
import { PageHeader, RequirePermission, RequirePlatform } from '@/components/shell/page-guard';
import { LoadError, LoadingRows } from '@/components/shell/query-state';
import { Banner, Button, Select, StateBlock, TextField } from '@/components/ui';
import { useAliasMutations, useSoftwareAliases } from '@/features/assets/hooks';
import { useI18n } from '@/i18n';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { PERMISSIONS as P } from '@/lib/permissions';
import type { ProductSuggestionDto } from '@/lib/types';

/** The software list: names the team uses for products, mapped to what the CVE data calls them. */
function SoftwareList() {
  const { t } = useI18n();
  const { can } = useAuth();
  const canEdit = can(P.ASSET_WRITE);
  const query = useSoftwareAliases();
  const m = useAliasMutations();
  const [name, setName] = useState('');
  const [product, setProduct] = useState('');
  const [picked, setPicked] = useState<ProductSuggestionDto | null>(null);
  const [vendor, setVendor] = useState('');
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const vendors = picked?.vendors ?? [];
  const chosenVendor = vendor || vendors[0] || '';
  const pair = picked ? `${chosenVendor}:${picked.product}` : '';
  const ready = name.trim().length >= 2 && !!picked && !!chosenVendor;

  const add = () => {
    setNotice(null);
    m.create.mutate({ name: name.trim(), pair }, {
      onSuccess: () => { setName(''); setProduct(''); setPicked(null); setVendor(''); setNotice({ tone: 'success', text: t('settings.sw.added') }); },
      onError: (e) => setNotice({ tone: 'error', text: e instanceof ApiError && e.code === 'ALREADY_EXISTS' ? t('settings.sw.exists') : t('common.tryAgainLater') }),
    });
  };
  const remove = (id: string, label: string) => {
    if (!window.confirm(t('settings.sw.deleteConfirm', { name: label }))) return;
    m.remove.mutate(id, { onError: () => setNotice({ tone: 'error', text: t('common.tryAgainLater') }) });
  };

  return (
    <section className="flex min-w-0 flex-col gap-5 rounded-xl border border-line bg-surface p-6 shadow-card">
      <div>
        <h2 className="text-lg font-semibold">{t('settings.sw.title')}</h2>
        <p className="text-[15px] text-ink-muted">{t('settings.sw.desc')}</p>
      </div>
      {notice ? <Banner tone={notice.tone} onDismiss={() => setNotice(null)}>{notice.text}</Banner> : null}

      {canEdit ? (
        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-[1fr_1.4fr_auto]">
          <TextField label={t('settings.sw.name')} hint={t('settings.sw.name.hint')} value={name} onChange={(e) => setName(e.target.value)} />
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="text-sm font-medium text-ink">{t('settings.sw.product')}</span>
            <SoftwareCombobox
              label={t('settings.sw.product')}
              placeholder={t('settings.sw.product.hint')}
              value={product}
              onChange={(v) => { setProduct(v); setPicked(null); setVendor(''); }}
              onPick={(s) => { setPicked(s); setVendor(s.vendors[0] ?? ''); }}
            />
            {vendors.length > 1 ? (
              <Select aria-label={t('settings.sw.vendor')} value={chosenVendor} onChange={setVendor} options={vendors.map((v) => ({ value: v, label: v }))} />
            ) : null}
            <span className="text-sm text-ink-subtle">{picked ? t('settings.sw.maps', { pair }) : t('settings.sw.pick')}</span>
          </div>
          <Button variant="primary" icon="plus" className="md:mt-7" disabled={!ready} loading={m.create.isPending} onClick={add}>{t('settings.sw.add')}</Button>
        </div>
      ) : null}

      {query.isError ? (
        <LoadError onRetry={() => void query.refetch()} />
      ) : query.isPending ? (
        <LoadingRows rows={2} />
      ) : query.data.items.length === 0 ? (
        <StateBlock kind="empty" compact title={t('settings.sw.empty')} description={t('settings.sw.emptyDesc')} />
      ) : (
        <ul className="m-0 list-none overflow-hidden rounded-lg border border-line p-0">
          {query.data.items.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line px-4 py-3 last:border-b-0">
              <span className="min-w-0 grow font-medium">{a.name}</span>
              <span className="font-mono text-sm text-ink-muted">{a.pair}</span>
              <span className="text-sm text-ink-subtle">{formatDate(a.createdAt)}</span>
              {canEdit ? <Button size="sm" variant="ghost" icon="trash" aria-label={t('settings.sw.delete')} title={t('settings.sw.delete')} onClick={() => remove(a.id, a.name)} /> : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function SettingsPage() {
  const { t } = useI18n();
  return (
    <RequirePlatform><RequirePermission any={[P.ASSET_READ]}>
      <div className="mx-auto flex w-full max-w-[1100px] min-w-0 grow flex-col gap-5 p-4 md:p-8">
        <PageHeader title={t('settings.title')} />
        <SoftwareList />
      </div>
    </RequirePermission></RequirePlatform>
  );
}

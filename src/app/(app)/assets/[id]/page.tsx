'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AssetForm, AssetPreview, validate, type AssetDraft } from '@/components/assets/asset-form';
import { useAuth } from '@/components/auth-provider';
import { PageHeader, RequirePermission } from '@/components/shell/page-guard';
import { LoadError, LoadingRows } from '@/components/shell/query-state';
import { Banner, Button, StateBlock, StatusPill, Tag, buttonClass } from '@/components/ui';
import { useAsset, useDeleteAsset, useUpdateAsset } from '@/features/assets/hooks';
import { useI18n } from '@/i18n';
import { ApiError } from '@/lib/api';
import { useDemo } from '@/lib/demo';
import { PERMISSIONS as P } from '@/lib/permissions';
import type { AssetDetailDto } from '@/lib/types';

const toDraft = (a: AssetDetailDto): AssetDraft => ({
  type: a.type, name: a.name, addr: a.addr ?? '', env: a.env, owner: a.owner ?? '', crit: a.criticality, exposed: a.exposed, attrs: a.attrs,
  software: a.software.map((s, i) => ({ id: i + 1, name: s.product, version: s.version ?? '' })),
});

function EditAsset() {
  const { t } = useI18n();
  const demo = useDemo();
  const router = useRouter();
  const { can } = useAuth();
  const { id } = useParams<{ id: string }>();
  const query = useAsset(id);
  const update = useUpdateAsset(id);
  const remove = useDeleteAsset(id);
  const [draft, setDraft] = useState<AssetDraft | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  // The form edits a copy; load it once, then again only when the server data really changed (after a save).
  useEffect(() => {
    if (query.data) setDraft(toDraft(query.data));
  }, [query.data]);

  const failed = (e: unknown) =>
    setNotice({
      tone: 'error',
      text: e instanceof ApiError && e.code === 'ALREADY_EXISTS' ? t('asset.err.exists') : e instanceof ApiError && e.code === 'LOCAL_PREVIEW' ? t('asset.err.demo') : t('common.tryAgainLater'),
    });

  if (query.isError) {
    const gone = query.error instanceof ApiError && query.error.status === 404;
    return (
      <div className="mx-auto w-full max-w-[1100px] p-4 md:p-8">
        <div className="rounded-xl border border-line bg-surface shadow-card">
          {gone ? (
            <StateBlock kind="empty" title={t('assets.edit.gone')} action={<Link href="/assets" className={buttonClass()}>{t('asset.saved.list')}</Link>} />
          ) : (
            <LoadError onRetry={() => void query.refetch()} />
          )}
        </div>
      </div>
    );
  }
  if (!query.data || !draft) {
    return <div className="mx-auto w-full max-w-[1100px] p-4 md:p-8"><div className="rounded-xl border border-line bg-surface shadow-card"><LoadingRows /></div></div>;
  }
  const asset = query.data;
  const archived = asset.status === 'archived';

  const save = () => {
    if (Object.keys(validate(draft)).length > 0) return setShowErrors(true);
    setNotice(null);
    update.mutate(
      {
        name: draft.name.trim() || draft.addr.trim(), addr: draft.addr.trim() || null, env: draft.env, criticality: draft.crit, exposed: draft.exposed,
        owner: draft.owner.trim() || null, attrs: draft.attrs, software: draft.software.filter((x) => x.name.trim()).map((x) => ({ product: x.name.trim(), version: x.version.trim() })),
      },
      { onSuccess: () => setNotice({ tone: 'success', text: t('asset.updated') }), onError: failed },
    );
  };
  const toggleArchive = () => update.mutate({ archived: !archived }, { onSuccess: () => setNotice({ tone: 'success', text: t(archived ? 'asset.unarchived' : 'asset.archived') }), onError: failed });
  const del = () => {
    if (!window.confirm(t('asset.deleteConfirm', { name: asset.name }))) return;
    remove.mutate(undefined, { onSuccess: () => router.push('/assets'), onError: failed });
  };

  return (
    <div className="mx-auto flex w-full max-w-[1100px] min-w-0 grow flex-col gap-5 p-4 md:p-8">
      <nav className="text-sm text-ink-muted [&_a]:text-ink-muted [&_a:hover]:text-ink" aria-label="breadcrumb">
        <Link href="/assets">{t('assets.title')}</Link> / {asset.name}
      </nav>
      <PageHeader
        title={t('assets.edit.title')}
        subtitle={<span className="flex flex-wrap items-center gap-2">{asset.name}{archived ? <StatusPill status="archived" /> : null}</span>}
        actions={demo ? <Tag tone="accent">{t('common.demoData')}</Tag> : undefined}
      />
      {notice ? <Banner tone={notice.tone} onDismiss={() => setNotice(null)}>{notice.text}</Banner> : null}

      <div className="flex flex-col items-stretch gap-5 lg:flex-row lg:items-start">
        <div className="flex min-w-0 grow flex-col gap-5">
          <AssetForm draft={draft} onChange={setDraft} showErrors={showErrors} />
          <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-end gap-3 border-t border-line bg-canvas/95 px-4 py-4 backdrop-blur md:mx-0 md:rounded-xl md:border md:bg-surface md:px-5">
            {can(P.ASSET_DELETE) ? <Button variant="danger" icon="trash" loading={remove.isPending} onClick={del}>{t('asset.delete')}</Button> : null}
            <Button onClick={toggleArchive} loading={update.isPending}>{t(archived ? 'asset.unarchive' : 'asset.archive')}</Button>
            <span className="grow" />
            <Link href="/assets" className={buttonClass('ghost')}>{t('assets.edit.back')}</Link>
            <Button variant="primary" icon="check" loading={update.isPending} onClick={save}>{t('asset.update')}</Button>
          </div>
        </div>
        <div className="flex w-full shrink-0 flex-col gap-4 lg:sticky lg:top-24 lg:w-[320px]">
          <AssetPreview draft={draft} />
        </div>
      </div>
    </div>
  );
}

export default function EditAssetPage() {
  return (
    <RequirePermission any={[P.ASSET_WRITE]}>
      <EditAsset />
    </RequirePermission>
  );
}

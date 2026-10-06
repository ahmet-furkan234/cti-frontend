'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AssetForm, AssetPreview, TypeChooser, emptyDraft, validate, type AssetDraft } from '@/components/assets/asset-form';
import { PageHeader, RequirePermission } from '@/components/shell/page-guard';
import { Banner, Button, Icon, Tag, buttonClass } from '@/components/ui';
import { useCreateAsset } from '@/features/assets/hooks';
import { useI18n } from '@/i18n';
import { ApiError } from '@/lib/api';
import { useDemo } from '@/lib/demo';
import { PERMISSIONS as P } from '@/lib/permissions';
import type { NewAssetBody } from '@/lib/types';

function NewAsset() {
  const { t } = useI18n();
  const demo = useDemo();
  const create = useCreateAsset();
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<AssetDraft | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const label = draft ? draft.name.trim() || draft.addr.trim() : '';
  const submit = (another: boolean) => {
    if (!draft) return;
    if (Object.keys(validate(draft)).length > 0) {
      setShowErrors(true);
      return;
    }
    setError(null);
    const body: NewAssetBody = {
      type: draft.type, name: draft.name.trim(), ...(draft.addr.trim() ? { addr: draft.addr.trim() } : {}), env: draft.env, criticality: draft.crit,
      exposed: draft.exposed, ...(draft.owner.trim() ? { owner: draft.owner.trim() } : {}), attrs: draft.attrs,
      software: draft.software.filter((x) => x.name.trim()).map((x) => ({ product: x.name.trim(), version: x.version.trim() })),
    };
    create.mutate(body, {
      onSuccess: () => {
        if (another) {
          setJustAdded(label);
          setDraft(emptyDraft(draft.type));
          setShowErrors(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          setSaved(label);
        }
      },
      onError: (e) => setError(e instanceof ApiError && e.code === 'ALREADY_EXISTS' ? t('asset.err.exists') : e instanceof ApiError && e.code === 'LOCAL_PREVIEW' ? t('asset.err.demo') : t('common.tryAgainLater')),
    });
  };

  if (saved) {
    return (
      <div className="mx-auto flex w-full max-w-[640px] grow flex-col items-center justify-center gap-5 p-8 text-center">
        <span className="inline-flex size-16 items-center justify-center rounded-full bg-low-soft text-low-ink">
          <Icon name="check" size={32} strokeWidth={2.25} />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('asset.saved.title', { name: saved })}</h1>
          <p className="mt-1 text-[15px] text-ink-muted">{t('asset.saved.matching')}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={() => { setSaved(null); setDraft(null); setJustAdded(null); }}>{t('asset.saved.another')}</Button>
          <Link href="/assets" className={buttonClass('primary')}>{t('asset.saved.list')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1100px] min-w-0 grow flex-col gap-5 p-4 md:p-8">
      <nav className="text-sm text-ink-muted [&_a]:text-ink-muted [&_a:hover]:text-ink" aria-label="breadcrumb">
        <Link href="/assets">{t('assets.title')}</Link> / {t('assets.add')}
      </nav>
      <PageHeader title={t('assets.new.title')} subtitle={t('assets.new.subtitle')} actions={demo ? <Tag tone="accent">{t('common.demoData')}</Tag> : undefined} />
      {error ? <Banner tone="error" onDismiss={() => setError(null)}>{error}</Banner> : null}
      {justAdded ? <Banner tone="success" onDismiss={() => setJustAdded(null)}>{t('asset.saved.title', { name: justAdded })}</Banner> : null}

      {draft === null ? (
        <TypeChooser onPick={(type) => setDraft(emptyDraft(type))} />
      ) : (
        <div className="flex flex-col items-stretch gap-5 lg:flex-row lg:items-start">
          <div className="flex min-w-0 grow flex-col gap-5">
            <AssetForm
              draft={draft}
              onChange={setDraft}
              showErrors={showErrors}
              onChangeType={() => { setDraft(null); setShowErrors(false); }}
            />
            <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-end gap-3 border-t border-line bg-canvas/95 px-4 py-4 backdrop-blur md:mx-0 md:rounded-xl md:border md:bg-surface md:px-5">
              <Link href="/assets" className={`${buttonClass('ghost')} mr-auto`}>{t('common.cancel')}</Link>
              <Button loading={create.isPending} onClick={() => submit(true)}>{t('asset.saveAnother')}</Button>
              <Button variant="primary" icon="check" loading={create.isPending} onClick={() => submit(false)}>{t('asset.save')}</Button>
            </div>
          </div>
          <div className="flex w-full shrink-0 flex-col gap-4 lg:sticky lg:top-24 lg:w-[320px]">
            <AssetPreview draft={draft} />
            <p className="px-1 text-sm text-ink-muted">
              {t('assets.new.bulkHint')} <Link href="/assets/import" className="font-medium">{t('assets.new.bulkLink')}</Link>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NewAssetPage() {
  return (
    <RequirePermission any={[P.ASSET_WRITE]}>
      <NewAsset />
    </RequirePermission>
  );
}

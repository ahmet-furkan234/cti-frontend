'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { AssetForm, emptyDraft, validate, type AssetDraft } from '@/components/assets/asset-form';
import { PageHeader, RequirePermission } from '@/components/shell/page-guard';
import { Banner, Button, Icon, Tag, buttonClass } from '@/components/ui';
import { useCreateAsset } from '@/features/assets/hooks';
import { useI18n } from '@/i18n';
import { ApiError } from '@/lib/api';
import { useDemo } from '@/lib/demo';
import { PERMISSIONS as P } from '@/lib/permissions';
import { ASSET_TYPE_SPECS } from '@/lib/asset-types';
import type { AssetType } from '@/mocks/assets';
import type { NewAssetBody } from '@/lib/types';

const newDraft = (type: AssetType): AssetDraft => ({ ...emptyDraft(type), software: ASSET_TYPE_SPECS[type].software ? [{ id: 1, name: '', version: '' }] : [] });

function NewAsset() {
  const { t } = useI18n();
  const demo = useDemo();
  const create = useCreateAsset();
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<AssetDraft>(() => newDraft('server'));
  const [showErrors, setShowErrors] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const drafts = useRef<Partial<Record<AssetType, AssetDraft>>>({});
  const changeType = (type: AssetType) => {
    drafts.current[draft.type] = draft;
    const previous = drafts.current[type];
    setDraft(previous ?? { ...newDraft(type), name: draft.name, owner: draft.owner, env: draft.env,
      addr: ASSET_TYPE_SPECS[type].addr !== 'none' && ASSET_TYPE_SPECS[type].addr === ASSET_TYPE_SPECS[draft.type].addr ? draft.addr : '',
    });
    setShowErrors(false);
    setError(null);
  };
  const label = draft.name.trim() || draft.addr.trim();
  const submit = (another: boolean) => {
    if (create.isPending) return;
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
          setDraft(newDraft(draft.type));
          drafts.current = {};
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
          <Button onClick={() => { setSaved(null); setDraft(newDraft(draft.type)); drafts.current = {}; setShowErrors(false); setJustAdded(null); }}>{t('asset.saved.another')}</Button>
          <Link href="/assets" className={buttonClass('primary')}>{t('asset.saved.list')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[880px] min-w-0 grow flex-col gap-5 p-4 md:p-8">
      <nav className="text-sm text-ink-muted [&_a]:text-ink-muted [&_a:hover]:text-ink" aria-label="breadcrumb">
        <Link href="/assets">{t('assets.title')}</Link> / {t('assets.add')}
      </nav>
      <PageHeader title={t('assets.new.title')} subtitle={t('asset.simple.subtitle')} actions={demo ? <Tag tone="accent">{t('common.demoData')}</Tag> : undefined} />
      {error ? <Banner tone="error" onDismiss={() => setError(null)}>{error}</Banner> : null}
      {justAdded ? <Banner tone="success" onDismiss={() => setJustAdded(null)}>{t('asset.saved.title', { name: justAdded })}</Banner> : null}

      <nav className="flex gap-2 border-b border-line pb-3" aria-label={t('asset.simple.method')}>
        <Link href="/assets/new" aria-current="page" className={buttonClass('secondary', 'sm')}>{t('asset.simple.single')}</Link>
        <Link href="/assets/import" className={buttonClass('ghost', 'sm')}>{t('assets.new.bulkLink')}</Link>
      </nav>
      <form onSubmit={(e) => { e.preventDefault(); submit(false); }} className="flex flex-col gap-4">
        <fieldset disabled={create.isPending} className="m-0 min-w-0 border-0 p-0">
          <AssetForm draft={draft} onChange={setDraft} showErrors={showErrors} simplified onSelectType={changeType} />
        </fieldset>
        <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-end gap-2 rounded-xl border border-line bg-surface/95 px-4 py-3 backdrop-blur">
          <Link href="/assets" className={`${buttonClass('ghost')} mr-auto`}>{t('common.cancel')}</Link>
          <Button disabled={create.isPending} onClick={() => submit(true)}>{t('asset.saveAnother')}</Button>
          <Button type="submit" variant="primary" icon="check" loading={create.isPending}>{t('asset.save')}</Button>
        </div>
      </form>
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

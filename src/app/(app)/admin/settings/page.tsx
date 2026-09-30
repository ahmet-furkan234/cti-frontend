'use client';

import { PageHeader } from '@/components/shell/page-guard';
import { StateBlock } from '@/components/ui';
import { useT } from '@/i18n';

export default function SettingsPage() {
  const t = useT();
  return (
    <div className="page">
      <PageHeader title={t('settings.title')} />
      <div className="card">
        <StateBlock kind="empty" title={t('settings.soon.title')} description={t('settings.soon.desc')} />
      </div>
    </div>
  );
}

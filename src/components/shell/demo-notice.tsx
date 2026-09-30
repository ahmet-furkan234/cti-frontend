'use client';

import { Banner } from '@/components/ui';
import { useT } from '@/i18n';

/** Marks screens whose data is sample content because the backend module ships in a later phase. */
export function DemoNotice() {
  const t = useT();
  return (
    <Banner tone="info" title={t('shell.demoBanner.title')}>
      {t('shell.demoBanner.text')}
    </Banner>
  );
}

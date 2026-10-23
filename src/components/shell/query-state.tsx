'use client';

import { Button, LoadingBlock, StateBlock } from '@/components/ui';
import { useT } from '@/i18n';

/** Spinner panel while a list loads. */
export function LoadingRows() {
  return <LoadingBlock className="min-h-[240px]" />;
}

/** The standard "could not load" block with a retry button. */
export function LoadError({ onRetry }: { onRetry: () => void }) {
  const t = useT();
  return <StateBlock kind="error" title={t('common.loadError')} description={t('common.tryAgainLater')} action={<Button onClick={onRetry}>{t('common.retry')}</Button>} />;
}

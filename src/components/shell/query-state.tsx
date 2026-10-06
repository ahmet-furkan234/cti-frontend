'use client';

import { Button, Skeleton, StateBlock } from '@/components/ui';
import { useT } from '@/i18n';

/** Placeholder rows while a list loads. */
export function LoadingRows({ rows = 4 }: { rows?: number }) {
  const t = useT();
  return (
    <div className="flex flex-col gap-4 p-5" role="status" aria-label={t('common.loading')}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton width={40} height={40} circle />
          <div className="grow"><Skeleton lines={2} height={12} /></div>
        </div>
      ))}
    </div>
  );
}

/** The standard "could not load" block with a retry button. */
export function LoadError({ onRetry }: { onRetry: () => void }) {
  const t = useT();
  return <StateBlock kind="error" title={t('common.loadError')} description={t('common.tryAgainLater')} action={<Button onClick={onRetry}>{t('common.retry')}</Button>} />;
}

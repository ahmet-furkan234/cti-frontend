'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Button } from '@/components/ui';
import { useI18n } from '@/i18n';

export function AlertEditor({ title, subtitle, children, summary, footer, onClose }: {
  title: string; subtitle: string; children: ReactNode; summary: ReactNode; footer: ReactNode; onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const { t } = useI18n();
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    return () => { dialog.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  return <dialog ref={ref} aria-labelledby={titleId} onCancel={(e) => { e.preventDefault(); onClose(); }} className="m-auto h-[min(900px,94dvh)] max-h-none w-[min(1120px,96vw)] max-w-none overflow-hidden rounded-2xl border border-line bg-surface p-0 text-ink shadow-pop backdrop:bg-black/60">
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-line px-5 py-5 md:px-8">
        <div><h2 id={titleId} className="text-xl font-semibold tracking-tight">{title}</h2><p className="mt-1 text-sm text-ink-muted">{subtitle}</p></div>
        <Button variant="ghost" icon="x" aria-label={t('common.close')} onClick={onClose} />
      </header>
      <div className="grid min-h-0 grow overflow-y-auto lg:grid-cols-[minmax(0,1fr)_290px]">
        <div className="min-w-0 p-5 md:p-8 lg:overflow-y-auto">{children}</div>
        <aside className="border-t border-line bg-surface-2/60 p-6 lg:overflow-y-auto lg:border-t-0 lg:border-l">{summary}</aside>
      </div>
      <footer className="flex shrink-0 flex-wrap items-center gap-2 border-t border-line px-5 py-4 md:px-8">{footer}</footer>
    </div>
  </dialog>;
}

'use client';

import { useState, type ReactNode } from 'react';
import { Icon } from '@/components/ui';

/** Optional settings stay mounted so collapsing a section never discards entered values. */
export function OptionalFields({ title, description, defaultOpen = false, invalid = false, children }: {
  title: string; description?: string; defaultOpen?: boolean; invalid?: boolean; children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details open={open || invalid} onToggle={(e) => setOpen(e.currentTarget.open)} className="group rounded-xl border border-line bg-surface">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0"><span className="block text-sm font-medium">{title}</span>{description ? <span className="block text-sm text-ink-subtle">{description}</span> : null}</span>
        <Icon name="down" size={16} className="shrink-0 text-ink-muted transition-transform group-open:rotate-180" />
      </summary>
      <div className="flex flex-col gap-4 border-t border-line p-4">{children}</div>
    </details>
  );
}

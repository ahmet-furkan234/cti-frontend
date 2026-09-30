'use client';

import { useState } from 'react';
import { Icon, Tag } from '@/components/ui';
import { useI18n, type MessageKey } from '@/i18n';
import { formatDateTime } from '@/lib/format';
import type { AuditEntry } from '@/lib/types';

const COLS = { '--cols': '150px 210px minmax(0, 1fr) 200px 120px 24px' } as React.CSSProperties;

export function actionLabel(t: (k: MessageKey) => string, action: string): string {
  const key = `audit.action.${action}` as MessageKey;
  const label = t(key);
  return label === key ? action : label;
}

function tone(action: string): 'neutral' | 'accent' | 'exposed' {
  if (action.includes('failed') || action.includes('blocked') || action.includes('reuse') || action.includes('deleted')) return 'exposed';
  if (action.startsWith('user.') || action.startsWith('role.')) return 'accent';
  return 'neutral';
}

export function AuditRows({ items, showHeader }: { items: AuditEntry[]; showHeader?: boolean }) {
  const { t } = useI18n();
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="scroll-x">
      {showHeader ? (
        <div className="trow trow--head" style={COLS}>
          <span>{t('audit.col.time')}</span>
          <span>{t('audit.col.actor')}</span>
          <span>{t('audit.col.action')}</span>
          <span>{t('audit.col.target')}</span>
          <span>{t('audit.col.ip')}</span>
          <span />
        </div>
      ) : null}
      {items.map((e) => {
        const isOpen = open === e.id;
        const hasMeta = Object.keys(e.meta ?? {}).length > 0;
        return (
          <div key={e.id}>
            <div className={`trow${hasMeta ? ' trow--click' : ''}`} style={{ ...COLS, height: 40 }} onClick={hasMeta ? () => setOpen(isOpen ? null : e.id) : undefined}>
              <span className="mono-12 muted">{formatDateTime(e.at)}</span>
              <span className="ellipsis" style={{ fontSize: 12 }}>{e.actorEmail ?? <span className="subtle">{t('audit.system')}</span>}</span>
              <span className="row gap-8 min0">
                <Tag tone={tone(e.action)}>{actionLabel(t, e.action)}</Tag>
                <span className="mono-11 subtle ellipsis">{e.action}</span>
              </span>
              <span className="mono-11 muted ellipsis" title={e.targetId ?? undefined}>{e.targetType ? `${e.targetType}:${e.targetId ?? ''}` : '—'}</span>
              <span className="mono-11 muted">{e.ip ?? '—'}</span>
              <span>{hasMeta ? <Icon name={isOpen ? 'up' : 'down'} size={13} /> : null}</span>
            </div>
            {isOpen ? (
              <pre className="mono-11" style={{ margin: 0, padding: '10px 16px', background: 'var(--bg)', borderBottom: '1px solid var(--border)', overflow: 'auto', lineHeight: '17px' }} aria-label={t('audit.details')}>
                {JSON.stringify(e.meta, null, 2)}
              </pre>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

'use client';

import { Drawer } from '@/components/admin/admin-parts';
import { RangeSlider } from '@/components/cves/range-slider';
import { Button, Select, TextField } from '@/components/ui';
import { useI18n, type MessageKey } from '@/i18n';

export type Published = 'any' | '7d' | '30d' | '12m';

/** The less common filters, kept out of the way so the search stays uncluttered. */
export function FilterDrawer({
  cvss, onCvss, epss, onEpss, published, onPublished, vendorProduct, onVendorProduct, vendorError, onClear, canClear, onClose,
}: {
  cvss: [number, number];
  onCvss: (v: [number, number]) => void;
  epss: string;
  onEpss: (v: string) => void;
  published: Published;
  onPublished: (v: Published) => void;
  vendorProduct: string;
  onVendorProduct: (v: string) => void;
  vendorError: boolean;
  onClear: () => void;
  canClear: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <Drawer title={t('cves.filters')} onClose={onClose}
      footer={
        <>
          <Button variant="ghost" disabled={!canClear} onClick={onClear}>{t('common.clearFilters')}</Button>
          <span className="grow" />
          <Button variant="primary" onClick={onClose}>{t('cves.drawer.done')}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <span className="text-sm font-medium">{t('cves.f.cvss')}</span>
          <RangeSlider min={0} max={10} value={cvss} onChange={onCvss} labelMin={t('cves.f.cvssMin')} labelMax={t('cves.f.cvssMax')} />
          <div className="flex justify-between text-sm text-ink-muted tabular-nums"><span>{cvss[0].toFixed(1)}</span><span>{cvss[1].toFixed(1)}</span></div>
        </div>
        <TextField label={t('cves.f.epss')} inputMode="decimal" placeholder="10" value={epss} onChange={(e) => onEpss(e.target.value)} />
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">{t('cves.f.published')}</span>
          <Select
            aria-label={t('cves.f.published')}
            value={published}
            onChange={(v) => onPublished(v as Published)}
            options={(['any', '7d', '30d', '12m'] as Published[]).map((p) => ({ value: p, label: t(`cves.f.pub.${p}` as MessageKey) }))}
          />
        </div>
        <TextField
          label={t('cves.f.vendor')}
          mono
          placeholder={t('cves.f.vendorPlaceholder')}
          value={vendorProduct}
          onChange={(e) => onVendorProduct(e.target.value)}
          error={vendorError ? t('cves.f.productNeedsVendor') : undefined}
        />
      </div>
    </Drawer>
  );
}

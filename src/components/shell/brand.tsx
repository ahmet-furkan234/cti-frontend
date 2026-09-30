import { Icon } from '@/components/ui';

export function BrandMark({ large }: { large?: boolean }) {
  return (
    <div className={`brand-mark${large ? ' brand-mark--lg' : ''}`}>
      <Icon name="shield" size={large ? 18 : 14} strokeWidth={2.25} />
    </div>
  );
}

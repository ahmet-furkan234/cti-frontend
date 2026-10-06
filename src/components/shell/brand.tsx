import { Icon } from '@/components/ui';

export function BrandMark({ large }: { large?: boolean }) {
  return (
    <div className={`flex items-center justify-center bg-accent text-on-accent ${large ? 'size-10 rounded-xl' : 'size-8 rounded-lg'}`}>
      <Icon name="shield" size={large ? 20 : 17} strokeWidth={2} />
    </div>
  );
}

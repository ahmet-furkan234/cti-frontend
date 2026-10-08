'use client';

import { Button } from '@/components/ui';
import { CompanySwitcher } from './company-switcher';
import { GlobalSearch } from './global-search';
import { useI18n } from '@/i18n';


export function Topbar({ onToggleNav }: { onToggleNav: () => void }) {
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-3 border-b border-line bg-canvas/90 px-4 backdrop-blur md:px-8">
      <Button variant="ghost" className="lg:hidden" onClick={onToggleNav} aria-label={t('shell.menu')} icon="menu" />
      <GlobalSearch />
      <div className="hidden grow md:block" />
      <div className="hidden md:block"><CompanySwitcher /></div>
    </header>
  );
}

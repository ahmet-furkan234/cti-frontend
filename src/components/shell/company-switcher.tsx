'use client';

import { useAuth } from '@/components/auth-provider';
import { Select } from '@/components/ui';
import { useCompanies } from '@/features/companies/hooks';
import { useT } from '@/i18n';
import { isLocalSession } from '@/lib/local-auth';
import { PERMISSIONS as P } from '@/lib/permissions';

/** Platform managers pick the company whose data they work with; everyone else never sees this. */
export function CompanySwitcher() {
  const t = useT();
  const { can, user, switchCompany } = useAuth();
  const allowed = can(P.COMPANY_MANAGE) && !isLocalSession();
  const companies = useCompanies(allowed);
  const acting = user?.actingCompany?.id;
  if (!allowed || !companies.data || companies.data.items.length < 2) return null;

  return (
    <Select
      size="sm"
      className="w-48"
      aria-label={t('companies.switcher')}
      value={acting ?? ''}
      onChange={(id) => {
        if (id && id !== acting) switchCompany(id === user?.company?.id ? null : id);
      }}
      options={companies.data.items
        .filter((c) => c.status === 'active')
        .map((c) => ({ value: c.id, label: c.isPlatform ? `${c.name} · ${t('companies.platform')}` : c.name }))}
    />
  );
}

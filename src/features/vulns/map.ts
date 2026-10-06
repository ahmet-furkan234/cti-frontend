import { minutesSince } from '@/lib/minutes';
import type { CveAssetDto, VulnDto } from '@/lib/types';
import type { CveAssetRow } from '@/mocks/cve-assets';
import type { VulnRow } from '@/mocks/vulns';

export type VulnItem = VulnRow & { id: string };

/** "openbsd:openssh" → "openssh" */
const productOf = (component: string) => component.split(':')[1] ?? component;

export const toVulnItem = (d: VulnDto): VulnItem => ({
  id: d.id, cve: d.cve, kev: d.kev, host: d.host, env: d.env, exposed: d.exposed, cvss: d.cvss, epss: d.epss, status: d.status,
  slaHours: d.slaHours, fix: d.fixedVersion ? `${productOf(d.component)} ${d.fixedVersion}` : '—',
});

export const toCveAssetRow = (d: CveAssetDto): CveAssetRow => ({
  risk: d.risk, host: d.host, ip: d.ip ?? '—', exposed: d.exposed, os: d.os ?? '—', installed: d.installedVersion ?? '—', fixed: d.fixedVersion ?? '—',
  env: d.env, status: d.status, owner: d.owner, slaHours: d.slaHours, source: d.source, seenMin: minutesSince(d.lastSeenAt),
});

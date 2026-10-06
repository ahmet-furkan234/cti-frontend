import { minutesSince } from '@/lib/minutes';
import type { AssetDto } from '@/lib/types';
import type { AssetRow } from '@/mocks/assets';

export type AssetItem = AssetRow & { id: string };

export const toAssetItem = (d: AssetDto): AssetItem => ({
  id: d.id, type: d.type, host: d.name, ip: d.addr ?? '—', os: d.os ?? '—', crit: d.criticality, env: d.env, exposed: d.exposed,
  risk: d.risk, counts: d.counts, status: d.status, seenMin: minutesSince(d.lastSeenAt), source: d.source,
});

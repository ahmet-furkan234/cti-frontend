import { bi, type Bi } from './types';

export interface ImportHistory {
  source: string;
  kind: string;
  date: string;
  status: 'healthy' | 'degraded' | 'failing';
  detail: Bi;
}

export const IMPORT_HISTORY: ImportHistory[] = [
  { source: 'nmap_dmz_0928.xml', kind: 'Nmap XML', date: '2026-09-28', status: 'healthy', detail: bi('64 yeni, 118 güncel', '64 new, 118 updated') },
  { source: 'api-gateway.cdx.json', kind: 'CycloneDX', date: '2026-09-27', status: 'healthy', detail: bi('212 bileşen', '212 components') },
  { source: 'masscan_10.30.0.0-16', kind: 'Masscan', date: '2026-09-25', status: 'degraded', detail: bi('9 satır atlandı', '9 rows skipped') },
  { source: 'inventory_q2.xlsx', kind: 'Excel', date: '2026-07-02', status: 'healthy', detail: bi('380 yeni', '380 new') },
  { source: 'sbom_mobile.spdx', kind: 'SPDX', date: '2026-06-30', status: 'failing', detail: bi('şema hatası', 'schema error') },
];

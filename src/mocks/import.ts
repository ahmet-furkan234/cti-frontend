import { bi, type Bi } from './types';

export interface MappingRow {
  column: string;
  field: string;
  sample: string;
  unmapped?: boolean;
}

export const MAPPING_ROWS: MappingRow[] = [
  { column: 'Host Name', field: 'hostname', sample: 'prod-web-01' },
  { column: 'IP', field: 'ip_address', sample: '10.20.4.17' },
  { column: 'Operating System', field: 'os.name + os.version', sample: 'Ubuntu 22.04.4 LTS' },
  { column: 'Environment', field: 'environment', sample: 'prod' },
  { column: 'Criticality', field: 'criticality', sample: 'High' },
  { column: 'Owner', field: '', sample: 'infra-team', unmapped: true },
  { column: 'Open ports', field: 'services[] (port/proto)', sample: '22/tcp, 443/tcp, 8080/tcp' },
];

export const FIELD_OPTIONS = ['hostname', 'ip_address', 'os.name + os.version', 'environment', 'criticality', 'owner', 'services[] (port/proto)', 'tags[]'];

export interface ImportIssue {
  row: number;
  level: 'error' | 'warning';
  value: string;
  message: 'invalidIp' | 'noIdentity' | 'matched' | 'osNormalized';
}

export const IMPORT_ISSUES: ImportIssue[] = [
  { row: 37, level: 'error', value: '10.20.4.300', message: 'invalidIp' },
  { row: 112, level: 'error', value: '(empty)', message: 'noIdentity' },
  { row: 208, level: 'warning', value: 'prod-web-01', message: 'matched' },
  { row: 341, level: 'warning', value: 'Win 2012 R2', message: 'osNormalized' },
];

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

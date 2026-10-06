import type { IconName } from '@/components/ui';

export type AssetType = 'fw' | 'server' | 'web' | 'db' | 'container' | 'cloud' | 'laptop';
export type Criticality = 'critical' | 'high' | 'medium' | 'low';

export interface AssetRow {
  type: AssetType;
  host: string;
  ip: string;
  os: string;
  crit: Criticality;
  env: string;
  exposed: boolean;
  risk: number;
  counts: [number, number, number, number];
  status: 'active' | 'stale' | 'archived';
  seenMin: number;
  /** i18n key suffix for manual, otherwise raw source name */
  source: string;
}

export const ASSET_ICON: Record<AssetType, IconName> = {
  fw: 'shield', server: 'server', web: 'globe', db: 'db', container: 'container', cloud: 'cloud', laptop: 'laptop',
};

/** Demo: asset inventory (backend module ships in phase 2). */
export const ASSET_ROWS: AssetRow[] = [
  { type: 'fw', host: 'fw-edge-01', ip: '185.34.12.9', os: 'FortiOS 7.4.1', crit: 'critical', env: 'prod', exposed: true, risk: 97, counts: [4, 6, 3, 1], status: 'active', seenMin: 4, source: 'Nmap XML' },
  { type: 'server', host: 'vpn-gw-ist', ip: '185.34.12.14', os: 'Ivanti ICS 22.6', crit: 'critical', env: 'prod', exposed: true, risk: 93, counts: [3, 2, 5, 0], status: 'active', seenMin: 12, source: 'manual' },
  { type: 'web', host: 'prod-web-01', ip: '10.20.4.17', os: 'Ubuntu 22.04 LTS', crit: 'high', env: 'prod', exposed: true, risk: 88, counts: [2, 9, 14, 6], status: 'active', seenMin: 60, source: 'Agent' },
  { type: 'server', host: 'jenkins-ci', ip: '10.20.8.3', os: 'Debian 12', crit: 'high', env: 'prod', exposed: false, risk: 81, counts: [2, 4, 7, 2], status: 'active', seenMin: 120, source: 'CycloneDX' },
  { type: 'db', host: 'db-core-02', ip: '10.20.6.21', os: 'RHEL 9.2', crit: 'critical', env: 'prod', exposed: false, risk: 74, counts: [1, 3, 6, 4], status: 'active', seenMin: 180, source: 'CSV' },
  { type: 'container', host: 'api-gateway:3.4.1', ip: 'k8s/prod/ns-api', os: 'Alpine 3.18', crit: 'medium', env: 'prod', exposed: true, risk: 66, counts: [0, 5, 8, 3], status: 'active', seenMin: 20, source: 'SPDX' },
  { type: 'cloud', host: 'i-0a4f…c21', ip: 'eu-central-1', os: 'Amazon Linux 2', crit: 'medium', env: 'staging', exposed: false, risk: 49, counts: [0, 2, 9, 5], status: 'active', seenMin: 1440, source: 'AWS' },
  { type: 'laptop', host: 'lt-ahmet-07', ip: '10.30.2.88', os: 'Windows 11 23H2', crit: 'low', env: 'corp', exposed: false, risk: 31, counts: [0, 1, 4, 2], status: 'stale', seenMin: 23040, source: 'Masscan' },
  { type: 'server', host: 'legacy-ftp', ip: '10.20.9.4', os: 'CentOS 7', crit: 'low', env: 'dev', exposed: false, risk: 22, counts: [0, 0, 3, 8], status: 'archived', seenMin: 132480, source: 'CSV' },
];

export const ASSET_TYPE_TABS: { id: 'all' | 'srv' | 'ep' | 'net' | 'ctr' | 'cld'; count: number }[] = [
  { id: 'all', count: 2418 }, { id: 'srv', count: 912 }, { id: 'ep', count: 1104 }, { id: 'net', count: 88 }, { id: 'ctr', count: 241 }, { id: 'cld', count: 73 },
];

/** Which demo rows each tab shows. */
export const TAB_TYPES: Record<string, AssetType[] | null> = {
  all: null, srv: ['server', 'web', 'db'], ep: ['laptop'], net: ['fw'], ctr: ['container'], cld: ['cloud'],
};

export const EXPOSURE = { internet: 184, kev: 17, stale: 164, unowned: 96 };

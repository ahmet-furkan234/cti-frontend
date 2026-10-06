/** Demo: threat intelligence (backend ships with the later phases). */
export type IocType = 'ipv4' | 'ipv6' | 'cidr' | 'domain' | 'url' | 'email' | 'sha256' | 'sha1' | 'md5';

export interface Watchlist {
  id: string;
  name: string;
  vendors: string[];
  products: string[];
  tag: string;
  /** lowest CVSS score to report, 0 = any */
  minCvss: number;
  /** only vulnerabilities known to be exploited in the wild */
  kevOnly: boolean;
  /** lowest exploit probability in percent, 0 = any */
  minEpss: number;
  /** id of a channel from the alerts module, null = no notification */
  channelId: string | null;
  /** assets covered by the list */
  count: number;
  /** findings since it was last looked at */
  hits: number;
  enabled: boolean;
}

export const WATCHLISTS: Watchlist[] = [
  { id: 'w-edge', name: 'Edge cihazları', vendors: ['Fortinet', 'Ivanti', 'Citrix', 'Palo Alto'], products: [], tag: '', minCvss: 0, kevOnly: true, minEpss: 0, channelId: 'ch-slack', count: 42, hits: 2, enabled: true },
  { id: 'w-ssh', name: 'OpenSSH', vendors: [], products: ['openssh'], tag: '', minCvss: 7, kevOnly: false, minEpss: 0, channelId: 'ch-smtp', count: 312, hits: 0, enabled: true },
  { id: 'w-crypto', name: 'Kriptografi kütüphaneleri', vendors: [], products: ['openssl', 'libssl', 'gnutls', 'xz'], tag: '', minCvss: 0, kevOnly: false, minEpss: 0, channelId: 'ch-tg', count: 1140, hits: 1, enabled: true },
  { id: 'w-portal', name: 'Müşteri portalı', vendors: [], products: [], tag: 'portal', minCvss: 0, kevOnly: false, minEpss: 10, channelId: 'ch-hook', count: 18, hits: 0, enabled: false },
];

export interface Ioc {
  id: string;
  type: IocType;
  value: string;
  source: string;
  /** 0–100 */
  confidence: number;
  /** YYYY-MM-DD, null = does not expire */
  expires: string | null;
  /** how many of your assets it matches */
  matches: number;
}

export const IOCS: Ioc[] = [
  { id: 'i1', type: 'ipv4', value: '203.0.113.45', source: 'AlienVault OTX', confidence: 92, expires: '2026-10-14', matches: 2 },
  { id: 'i2', type: 'domain', value: 'c2-update.example', source: 'MISP · CERT', confidence: 85, expires: '2026-11-01', matches: 0 },
  { id: 'i3', type: 'sha256', value: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', source: 'VirusTotal', confidence: 97, expires: null, matches: 1 },
  { id: 'i4', type: 'url', value: 'hxxps://login-portal.example/login.php', source: 'Abuse.ch URLhaus', confidence: 74, expires: '2026-10-07', matches: 0 },
  { id: 'i5', type: 'ipv4', value: '198.51.100.23', source: 'GreyNoise', confidence: 48, expires: '2026-10-02', matches: 0 },
  { id: 'i6', type: 'domain', value: 'cdn-check.example', source: 'Manual', confidence: 60, expires: '2026-12-31', matches: 0 },
  { id: 'i7', type: 'sha1', value: 'da39a3ee5e6b4b0d3255bfef95601890afd80709', source: 'MISP · CERT', confidence: 81, expires: null, matches: 0 },
  { id: 'i8', type: 'ipv6', value: '2001:db8::bad:1', source: 'AlienVault OTX', confidence: 55, expires: '2026-09-20', matches: 0 },
  { id: 'i9', type: 'email', value: 'billing@invoice-alerts.example', source: 'Manual', confidence: 66, expires: '2026-10-30', matches: 0 },
  { id: 'i10', type: 'cidr', value: '192.0.2.0/24', source: 'Spamhaus DROP', confidence: 88, expires: '2026-10-29', matches: 0 },
];

/** ATT&CK tactics in kill-chain order; the pattern below is 6 tactic columns × 6 technique rows of exposure (0–3). */
export const ATTACK_TACTICS = ['initial', 'execution', 'persistence', 'privesc', 'evasion', 'lateral'] as const;
export type AttackTactic = (typeof ATTACK_TACTICS)[number];
export const ATTACK_PATTERN = [3, 1, 0, 2, 0, 1, 2, 0, 1, 3, 1, 0, 1, 2, 0, 1, 0, 2, 0, 1, 2, 0, 1, 1, 1, 0, 0, 1, 2, 0, 0, 0, 1, 0, 0, 1];
export const ATTACK_TOP = [
  { id: 'T1190', count: 184 },
  { id: 'T1068', count: 96 },
  { id: 'T1133', count: 41 },
] as const;

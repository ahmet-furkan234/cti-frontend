export interface Watchlist {
  name: string;
  rule: string;
  count: number;
  channel: string;
  hits: number;
}

export const WATCHLISTS: Watchlist[] = [
  { name: 'Edge cihazları', rule: 'vendor ∈ Fortinet, Ivanti, Citrix, Palo Alto · KEV', count: 42, channel: 'Slack #soc', hits: 2 },
  { name: 'OpenSSH', rule: 'product = openssh · CVSS ≥ 7', count: 312, channel: 'Email', hits: 0 },
  { name: 'Crypto libs', rule: 'openssl, libssl, gnutls, xz', count: 1140, channel: 'Telegram', hits: 1 },
  { name: 'Portal', rule: 'tag = portal · EPSS ≥ 10%', count: 18, channel: 'Webhook', hits: 0 },
];

export interface Ioc {
  type: string;
  value: string;
  source: string;
  confidence: number;
  expires: string;
  matches: number;
  expired?: boolean;
}

export const IOCS: Ioc[] = [
  { type: 'IPv4', value: '203.0.113.45', source: 'AlienVault OTX', confidence: 92, expires: '2026-10-14', matches: 2 },
  { type: 'Domain', value: 'c2-update.example', source: 'MISP · CERT', confidence: 85, expires: '2026-11-01', matches: 0 },
  { type: 'SHA256', value: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', source: 'VirusTotal', confidence: 97, expires: '—', matches: 1 },
  { type: 'URL', value: 'hxxps://login-portal.example/login.php', source: 'Abuse.ch URLhaus', confidence: 74, expires: '2026-10-05', matches: 0 },
  { type: 'IPv4', value: '198.51.100.23', source: 'GreyNoise', confidence: 48, expires: '2026-10-02', matches: 0 },
  { type: 'Domain', value: 'cdn-check.example', source: 'Manual', confidence: 60, expires: '2026-12-31', matches: 0 },
  { type: 'SHA1', value: 'da39a3ee5e6b4b0d3255bfef95601890afd80709', source: 'MISP · CERT', confidence: 81, expires: '—', matches: 0 },
  { type: 'IPv6', value: '2001:db8::bad:1', source: 'AlienVault OTX', confidence: 55, expires: '2026-09-20', matches: 0, expired: true },
  { type: 'Email', value: 'billing@invoice-alerts.example', source: 'Manual', confidence: 66, expires: '2026-10-30', matches: 0 },
  { type: 'CIDR', value: '192.0.2.0/24', source: 'Spamhaus DROP', confidence: 88, expires: '2026-10-29', matches: 0 },
];

export const ATTACK_TACTICS = ['Initial Access', 'Execution', 'Persistence', 'Priv. Esc.', 'Def. Evasion', 'Lateral Mvmt'];
export const ATTACK_PATTERN = [3, 1, 0, 2, 0, 1, 2, 0, 1, 3, 1, 0, 1, 2, 0, 1, 0, 2, 0, 1, 2, 0, 1, 1, 1, 0, 0, 1, 2, 0, 0, 0, 1, 0, 0, 1];
export const ATTACK_TOP = [
  { id: 'T1190', name: 'Exploit Public-Facing App', count: 184 },
  { id: 'T1068', name: 'Privilege Escalation', count: 96 },
  { id: 'T1133', name: 'External Remote Services', count: 41 },
];

export type VulnStatus = 'open' | 'in_progress' | 'accepted' | 'mitigated';

export interface VulnRow {
  cve: string;
  kev: boolean;
  host: string;
  env: string;
  exposed: boolean;
  cvss: number;
  epss: number;
  status: VulnStatus;
  slaHours: number | null;
  fix: string;
}

export const CRIT_POINTS: Record<string, number> = { prod: 10, staging: 6, dev: 3 };

export interface RiskFactor {
  key: 'cvss' | 'kev' | 'epss' | 'exposed' | 'crit';
  points: number;
  max: number;
  label: string;
}

/** Demo risk model: additive points, capped at 100 (weights are configurable later). */
export function riskFactors(r: VulnRow): RiskFactor[] {
  return [
    { key: 'cvss', points: Math.round(r.cvss * 3), max: 30, label: r.cvss.toFixed(1) },
    { key: 'kev', points: r.kev ? 25 : 0, max: 25, label: '' },
    { key: 'epss', points: Math.round(r.epss * 20), max: 20, label: `${Math.round(r.epss * 100)}%` },
    { key: 'exposed', points: r.exposed ? 15 : 0, max: 15, label: '' },
    { key: 'crit', points: CRIT_POINTS[r.env] ?? 5, max: 10, label: '' },
  ];
}

export const riskOf = (r: VulnRow): number => Math.min(100, riskFactors(r).reduce((a, f) => a + f.points, 0));

/** Demo: CVE × asset matches (backend matching ships in phase 2). */
export const VULN_ROWS: VulnRow[] = [
  { cve: 'CVE-2024-21762', kev: true, host: 'fw-edge-01', env: 'prod', exposed: true, cvss: 9.8, epss: 0.92, status: 'open', slaHours: -52, fix: 'FortiOS 7.4.3' },
  { cve: 'CVE-2024-23897', kev: true, host: 'jenkins-ci', env: 'prod', exposed: false, cvss: 9.8, epss: 0.97, status: 'in_progress', slaHours: 18, fix: 'Jenkins 2.442' },
  { cve: 'CVE-2023-46805', kev: true, host: 'vpn-gw-ist', env: 'prod', exposed: true, cvss: 8.2, epss: 0.96, status: 'open', slaHours: 30, fix: 'ICS 22.7R2.1' },
  { cve: 'CVE-2024-6387', kev: true, host: 'prod-web-01', env: 'prod', exposed: true, cvss: 8.1, epss: 0.94, status: 'in_progress', slaHours: 44, fix: 'OpenSSH 9.8p1' },
  { cve: 'CVE-2024-6387', kev: true, host: 'prod-web-02', env: 'prod', exposed: true, cvss: 8.1, epss: 0.94, status: 'in_progress', slaHours: 44, fix: 'OpenSSH 9.8p1' },
  { cve: 'CVE-2023-44487', kev: true, host: 'lb-nginx-01', env: 'prod', exposed: true, cvss: 7.5, epss: 0.7, status: 'open', slaHours: 96, fix: 'nginx 1.25.3' },
  { cve: 'CVE-2024-3094', kev: false, host: 'build-agent-07', env: 'staging', exposed: false, cvss: 10.0, epss: 0.86, status: 'mitigated', slaHours: null, fix: 'xz 5.4.6' },
  { cve: 'CVE-2023-38408', kev: false, host: 'bastion-01', env: 'prod', exposed: false, cvss: 9.8, epss: 0.41, status: 'open', slaHours: 210, fix: 'OpenSSH 9.3p2' },
  { cve: 'CVE-2023-4863', kev: false, host: 'intranet-cms', env: 'prod', exposed: false, cvss: 8.8, epss: 0.3, status: 'accepted', slaHours: null, fix: 'libwebp 1.3.2' },
  { cve: 'CVE-2023-51385', kev: false, host: 'dev-box-12', env: 'dev', exposed: false, cvss: 6.5, epss: 0.12, status: 'open', slaHours: 400, fix: 'OpenSSH 9.6' },
  { cve: 'CVE-2023-48795', kev: false, host: 'git-mirror', env: 'prod', exposed: false, cvss: 5.9, epss: 0.17, status: 'open', slaHours: 520, fix: 'OpenSSH 9.6' },
  { cve: 'CVE-2023-5678', kev: false, host: 'mail-relay', env: 'prod', exposed: false, cvss: 5.3, epss: 0.01, status: 'open', slaHours: 610, fix: 'OpenSSL 3.0.13' },
];

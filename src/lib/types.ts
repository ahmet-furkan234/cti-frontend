import type { Severity } from './severity';

export interface RoleRef {
  id: string;
  name: string;
}

export interface CompanyRef {
  id: string;
  name: string;
  isPlatform: boolean;
}

export interface Me {
  id: string;
  email: string;
  name: string;
  roles: RoleRef[];
  permissions: string[];
  lastLoginAt: string | null;
  /** the company the user belongs to */
  company?: CompanyRef | null;
  /** the company whose data is on screen; differs from `company` while a platform user works inside another one */
  actingCompany?: CompanyRef | null;
}

export interface CompanyDto extends CompanyRef {
  status: 'active' | 'suspended';
  createdAt: string;
}

export interface CompanyListItem extends CompanyDto {
  users: number;
  assets: number;
}

export interface CreateCompanyResult {
  company: CompanyDto;
  /** link for the first administrator, when an e-mail was given */
  invite: { email: string; expiresAt: string; inviteUrl: string } | null;
}

export interface LoginResponse {
  accessToken: string;
  expiresIn: number;
  user: Me;
}

/* ---- CVE */
export interface CveListItem {
  id: string;
  published: string;
  lastModified: string;
  description: string;
  cvssScore: number;
  cvssSeverity: 0 | 1 | 2 | 3 | 4;
  isKev: boolean;
  epss: number;
  affected: string[];
}

export interface CveSearchResponse {
  items: CveListItem[];
  nextCursor: string | null;
  total?: number;
  tookMs: number;
}

export interface CveReference {
  url: string;
  source?: string;
  tags?: string[];
}

export interface CpeMatch {
  c: string;
  vsi?: string;
  vse?: string;
  vei?: string;
  vee?: string;
}

export interface CveDetail {
  id: string;
  published: string;
  lastModified: string;
  vulnStatus: string | null;
  description: string;
  cvssScore: number;
  cvssSeverity: 0 | 1 | 2 | 3 | 4;
  cvssVector: string | null;
  cvssVersion: string | null;
  cwe: string[];
  isKev: boolean;
  kevAdded: string | null;
  kevDueDate: string | null;
  kevRansomware: boolean;
  epss: number;
  epssPercentile: number;
  references: CveReference[];
  affected: string[];
  vendors: string[];
  cpeMatches: CpeMatch[];
}

export interface CveStats {
  total: number;
  kevCount: number;
  criticalCount: number;
  addedLast24h: number;
  severityDistribution: { severity: 0 | 1 | 2 | 3 | 4; count: number }[];
  perDay: { day: string; count: number }[];
  topCwe: { cwe: string; count: number }[];
  topVendors: { vendor: string; count: number }[];
  newestKev: { id: string; kevAdded: string | null; description: string; cvssScore: number }[];
}

export type { Severity };

/* ---- users / roles / permissions */
export interface UserListItem {
  id: string;
  email: string;
  name: string;
  status: 'active' | 'disabled';
  lastLoginAt: string | null;
  createdAt: string;
  roles: RoleRef[];
}

export interface UserListResponse {
  items: UserListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export type OverrideEffect = 'grant' | 'deny';
export interface PermissionOverride {
  key: string;
  effect: OverrideEffect;
}

export interface UserDetail extends UserListItem {
  overrides: PermissionOverride[];
}

export interface Role {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissionKeys: string[];
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PermissionDef {
  key: string;
  module: string;
  description: string;
}

export interface EffectivePermission {
  key: string;
  allowed: boolean;
  source: { type: 'role'; roles: string[] } | { type: 'grant' } | { type: 'deny' };
}

export interface AuditEntry {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  meta: Record<string, unknown>;
  ip: string | null;
  at: string;
}

export interface AuditResponse {
  items: AuditEntry[];
  nextCursor: string | null;
}

export type SyncSource = 'nvd' | 'kev' | 'epss';
export interface SyncState {
  source: SyncSource;
  status: 'idle' | 'running' | 'error';
  lastSuccessAt: string | null;
  lastStartedAt: string | null;
  lastFinishedAt: string | null;
  lastError: string | null;
  recordsProcessed: number;
  cursor: Record<string, unknown>;
  runRequestedAt: string | null;
}

/* ---- inventory */
export type AssetType = 'fw' | 'server' | 'web' | 'db' | 'container' | 'cloud' | 'laptop';
export type AssetTab = 'all' | 'srv' | 'ep' | 'net' | 'ctr' | 'cld';
export type CriticalityLevel = 'critical' | 'high' | 'medium' | 'low';

export interface AssetDto {
  id: string;
  type: AssetType;
  name: string;
  addr: string | null;
  os: string | null;
  env: string;
  criticality: CriticalityLevel;
  exposed: boolean;
  source: string;
  owner: string | null;
  tags: string[];
  status: 'active' | 'stale' | 'archived';
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
  risk: number;
  /** open vulnerabilities: critical, high, medium, low */
  counts: [number, number, number, number];
}

/** One asset with what the form edits: the type-specific answers and its software. */
export interface AssetDetailDto extends Omit<AssetDto, 'risk' | 'counts'> {
  attrs: Record<string, string | boolean>;
  software: { vendor: string | null; product: string; version: string | null }[];
}

export interface UpdateAssetBody {
  name?: string;
  addr?: string | null;
  env?: string;
  criticality?: CriticalityLevel;
  exposed?: boolean;
  owner?: string | null;
  attrs?: Record<string, string | boolean>;
  software?: { product: string; version: string }[];
  archived?: boolean;
}

/** What matching makes of one software entry, before the asset is saved. */
export interface SoftwareCheckDto {
  product: string;
  status: 'matched' | 'unknown';
  /** "vendor:product" names it will be matched under */
  pairs: string[];
  /** close or partial names the CVE data knows, best first */
  suggestions: { product: string; vendors: string[]; cves: number }[];
  versionMissing: boolean;
}

/** A product the CVE data knows (or a name the team defined for one). */
export interface ProductSuggestionDto {
  product: string;
  vendors: string[];
  cves: number;
  alias?: boolean;
  /** browse-list section, set only while nothing is typed */
  group?: string;
}

export interface SoftwareAliasDto {
  id: string;
  name: string;
  /** "vendor:product" */
  pair: string;
  createdAt: string;
}

export interface AssetStatsDto {
  total: number;
  active: number;
  stale: number;
  archived: number;
  exposed: number;
  withCritical: number;
  tabs: Record<AssetTab, number>;
}

export interface AssetListResponse {
  items: AssetDto[];
  total: number;
  stats: AssetStatsDto;
}

export interface NewAssetBody {
  type: AssetType;
  name: string;
  addr?: string;
  env: string;
  owner?: string;
  criticality: CriticalityLevel;
  exposed: boolean;
  attrs: Record<string, string | boolean>;
  software: { product: string; version: string }[];
}

export interface ImportRowBody {
  row: number;
  type?: AssetType;
  name?: string;
  addr?: string;
  os?: string;
  env?: string;
  criticality?: CriticalityLevel;
  owner?: string;
  tags?: string[];
  exposed?: boolean;
  software?: { product: string; version?: string; vendor?: string }[];
}

export interface ImportResult {
  applied: boolean;
  totals: { rows: number; valid: number; warnings: number; errors: number; created: number; updated: number; skipped: number; software: number };
  issues: { row: number; level: 'error' | 'warning'; value: string; message: 'invalidIp' | 'noIdentity' | 'matched' | 'osNormalized' }[];
}

export interface ImportRecordDto {
  id: string;
  source: string;
  kind: string;
  rows: number;
  created: number;
  updated: number;
  skipped: number;
  status: 'healthy' | 'degraded' | 'failing';
  createdAt: string;
}

/* ---- vulnerabilities */
export type VulnStatusValue = 'open' | 'in_progress' | 'accepted' | 'mitigated';

export interface VulnDto {
  id: string;
  cve: string;
  assetId: string;
  host: string;
  env: string;
  exposed: boolean;
  kev: boolean;
  cvss: number;
  severity: 0 | 1 | 2 | 3 | 4;
  epss: number;
  status: VulnStatusValue;
  firstSeenAt: string;
  component: string;
  installedVersion: string | null;
  fixedVersion: string | null;
  risk: number;
  /** hours left on the fix window, negative = overdue, null = no window running */
  slaHours: number | null;
}

export interface CveAssetDto extends VulnDto {
  ip: string | null;
  os: string | null;
  owner: string | null;
  source: string;
  lastSeenAt: string;
}

export interface CveAssetsResponse {
  items: CveAssetDto[];
  stats: { affected: number; exposed: number; open: number; inProgress: number; mitigated: number };
}

/* ---- alerts */
export type ChannelKindValue = 'slack' | 'smtp' | 'telegram' | 'webhook';

export interface ChannelDto {
  id: string;
  kind: ChannelKindValue;
  name: string;
  values: Record<string, string>;
  status: 'healthy' | 'degraded' | 'failing';
  problem: string | null;
  lastTestAt: string | null;
}

export interface RuleDto {
  id: string;
  name: string;
  trigger: 'kev' | 'critical' | 'sla' | 'epss' | 'sync' | 'digest';
  envs: string[];
  minRisk: number;
  exposedOnly: boolean;
  tag: string;
  channelIds: string[];
  throttle: 'every' | 'asset6h' | 'daily';
  enabled: boolean;
  lastFiredAt: string | null;
  fired30: number;
}

export interface AlertLogDto {
  id: string;
  ruleId: string | null;
  channelIds: string[];
  result: 'sent' | 'throttled' | 'failed';
  detail: string;
  at: string;
}

/* ---- threat intel */
export interface WatchlistDto {
  id: string;
  name: string;
  vendors: string[];
  products: string[];
  tag: string;
  minCvss: number;
  kevOnly: boolean;
  minEpss: number;
  channelId: string | null;
  enabled: boolean;
  count: number;
  hits: number;
}

export interface IocDto {
  id: string;
  type: 'ipv4' | 'ipv6' | 'cidr' | 'domain' | 'url' | 'email' | 'sha256' | 'sha1' | 'md5';
  value: string;
  source: string;
  confidence: number;
  expiresAt: string | null;
  matches: number;
}

export interface IocListResponse {
  items: IocDto[];
  total: number;
  active: number;
  expiring: number;
}

/* ---- reports */
export interface ReportScheduleDto {
  id: string;
  template: 'exec' | 'kev' | 'sla' | 'owner';
  scope: string | null;
  freq: 'daily' | 'weekly-mon' | 'weekly-fri' | 'monthly';
  recipients: string[];
  formats: 'csv'[];
  enabled: boolean;
}

export interface ReportRunDto {
  id: string;
  scheduleId: string | null;
  template: 'exec' | 'kev' | 'sla' | 'owner';
  scope: string | null;
  formats: 'csv'[];
  status: 'ready' | 'failed' | 'generating';
  manual: boolean;
  sizeBytes: number | null;
  error: string | null;
  createdAt: string;
}

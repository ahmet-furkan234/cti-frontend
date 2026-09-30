import type { Severity } from './severity';

export interface RoleRef {
  id: string;
  name: string;
}

export interface Me {
  id: string;
  email: string;
  name: string;
  roles: RoleRef[];
  permissions: string[];
  lastLoginAt: string | null;
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

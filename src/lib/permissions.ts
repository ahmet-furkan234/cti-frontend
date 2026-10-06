/** Permission keys — must match the backend catalog (cti-backend/src/domain/rbac/permission-catalog.ts). */
export const PERMISSIONS = {
  CVE_READ: 'cve:read',
  DASHBOARD_VIEW: 'dashboard:view',
  SYNC_VIEW: 'sync:view',
  SYNC_RUN: 'sync:run',
  USER_READ: 'user:read',
  USER_CREATE: 'user:create',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  USER_RESET_PASSWORD: 'user:reset-password',
  ROLE_READ: 'role:read',
  ROLE_MANAGE: 'role:manage',
  PERMISSION_ASSIGN: 'permission:assign',
  AUDIT_READ: 'audit:read',
  ASSET_READ: 'asset:read',
  ASSET_WRITE: 'asset:write',
  ASSET_DELETE: 'asset:delete',
  VULN_READ: 'vuln:read',
  VULN_UPDATE: 'vuln:update',
  ALERT_READ: 'alert:read',
  ALERT_MANAGE: 'alert:manage',
  INTEL_READ: 'intel:read',
  INTEL_MANAGE: 'intel:manage',
  REPORT_READ: 'report:read',
  REPORT_MANAGE: 'report:manage',
} as const;

/** Permissions that deserve a warning when handed out. */
export const SENSITIVE_PERMISSIONS: string[] = [
  PERMISSIONS.PERMISSION_ASSIGN,
  PERMISSIONS.ROLE_MANAGE,
  PERMISSIONS.USER_DELETE,
  PERMISSIONS.USER_RESET_PASSWORD,
];

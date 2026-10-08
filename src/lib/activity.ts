import type { IconName } from '@/components/ui/icon';
import type { AuditEntry } from '@/lib/types';

/** How a person-facing activity feed groups audit events. */
export type ActivityCategory = 'account' | 'access' | 'security' | 'other';
export type ActivityFilter = 'all' | Exclude<ActivityCategory, 'other'>;

const SECURITY = new Set(['auth.login_failed', 'auth.login_blocked', 'auth.refresh_reuse_detected', 'user.sessions_revoked', 'user.password_reset_issued', 'user.deleted']);
/** The subset of security events that signal something went wrong rather than an admin acting. */
const ALERTING = new Set(['auth.login_failed', 'auth.login_blocked', 'auth.refresh_reuse_detected']);
const ACCOUNT = new Set(['auth.login', 'auth.registered', 'auth.password_changed', 'auth.password_reset']);
const ACCESS = new Set(['user.invited', 'user.created', 'user.updated', 'user.permissions_changed', 'role.created', 'role.updated', 'role.deleted']);

export function categoryOf(action: string): ActivityCategory {
  if (SECURITY.has(action)) return 'security';
  if (ACCOUNT.has(action)) return 'account';
  if (ACCESS.has(action)) return 'access';
  return 'other';
}

export const isAlerting = (action: string) => ALERTING.has(action);

const ICONS: Record<string, IconName> = {
  'auth.login': 'key',
  'auth.login_failed': 'alert',
  'auth.login_blocked': 'lock',
  'auth.registered': 'users',
  'auth.password_changed': 'key',
  'auth.password_reset': 'key',
  'auth.refresh_reuse_detected': 'alert',
  'user.invited': 'plus',
  'user.created': 'plus',
  'user.updated': 'edit',
  'user.deleted': 'trash',
  'user.permissions_changed': 'shield',
  'user.password_reset_issued': 'key',
  'user.sessions_revoked': 'logout',
  'role.created': 'shield',
  'role.updated': 'shield',
  'role.deleted': 'shield',
  'sync.requested': 'sync',
};
export const iconOf = (action: string): IconName => ICONS[action] ?? 'info';

export function matchesFilter(entry: AuditEntry, filter: ActivityFilter): boolean {
  return filter === 'all' || categoryOf(entry.action) === filter;
}

export type DayKey = 'today' | 'yesterday' | string;
export interface DayGroup {
  /** 'today', 'yesterday', or a local YYYY-MM-DD */
  day: DayKey;
  items: AuditEntry[];
}

const localDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Groups newest-first events by local calendar day, labelling today and yesterday. */
export function groupByDay(items: AuditEntry[], now = new Date()): DayGroup[] {
  const today = localDay(now);
  const yesterday = localDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  const groups: DayGroup[] = [];
  for (const e of items) {
    const d = localDay(new Date(e.at));
    const day: DayKey = d === today ? 'today' : d === yesterday ? 'yesterday' : d;
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(e);
    else groups.push({ day, items: [e] });
  }
  return groups;
}

export interface ActivitySummary {
  lastSignIn: string | null;
  failedSignIns: number;
  accessChanges: number;
}

/** Headline numbers for one user, from the loaded events (own sign-ins only count when the user was the actor). */
export function summarize(items: AuditEntry[], userId: string): ActivitySummary {
  let lastSignIn: string | null = null;
  let failedSignIns = 0;
  let accessChanges = 0;
  for (const e of items) {
    if (e.action === 'auth.login' && e.actorId === userId && (!lastSignIn || e.at > lastSignIn)) lastSignIn = e.at;
    if (e.action === 'auth.login_failed' || e.action === 'auth.login_blocked') failedSignIns++;
    if (categoryOf(e.action) === 'access') accessChanges++;
  }
  return { lastSignIn, failedSignIns, accessChanges };
}

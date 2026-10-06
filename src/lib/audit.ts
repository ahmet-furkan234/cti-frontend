import type { MessageKey } from '../i18n';
import { categoryOf, type ActivityFilter } from './activity';
import type { AuditEntry } from './types';

export type RangeKey = 'all' | 'today' | '7d' | '30d' | 'custom';
export const RANGES: RangeKey[] = ['all', 'today', '7d', '30d', 'custom'];

const DAY = 86_400_000;

/** ISO bounds for a quick time range; `custom` takes the two YYYY-MM-DD inputs instead. */
export function rangeBounds(range: RangeKey, custom: { from: string; to: string }, now = new Date()): { from?: string; to?: string } {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (range) {
    case 'today':
      return { from: startOfToday.toISOString() };
    case '7d':
      return { from: new Date(startOfToday.getTime() - 6 * DAY).toISOString() };
    case '30d':
      return { from: new Date(startOfToday.getTime() - 29 * DAY).toISOString() };
    case 'custom':
      return {
        ...(custom.from ? { from: new Date(`${custom.from}T00:00:00`).toISOString() } : {}),
        ...(custom.to ? { to: new Date(`${custom.to}T23:59:59`).toISOString() } : {}),
      };
    default:
      return {};
  }
}

/** Who did it: the account's e-mail, an address typed into a failed sign-in, or nobody (the system). */
export function actorOf(e: AuditEntry): string | null {
  if (e.actorEmail) return e.actorEmail;
  const typed = e.meta?.['email'];
  return typeof typed === 'string' && e.action.startsWith('auth.') ? typed : null;
}

/** What it was done to, in words a person would use (an address, a role name, a data source). */
export function targetOf(e: AuditEntry): string | null {
  const m = e.meta ?? {};
  const pick = (k: string) => (typeof m[k] === 'string' && m[k] ? (m[k] as string) : null);
  if (e.action.startsWith('role.')) return pick('name');
  if (e.action.startsWith('sync.')) return (pick('source') ?? e.targetId)?.toUpperCase() ?? null;
  return pick('email') ?? e.targetId;
}

export interface AuditSummary {
  total: number;
  alerts: number;
  accessChanges: number;
  people: number;
}

export function summarizeAudit(items: AuditEntry[]): AuditSummary {
  const people = new Set<string>();
  let alerts = 0;
  let accessChanges = 0;
  for (const e of items) {
    const who = actorOf(e);
    if (who) people.add(who.toLowerCase());
    const cat = categoryOf(e.action);
    if (cat === 'security') alerts++;
    if (cat === 'access') accessChanges++;
  }
  return { total: items.length, alerts, accessChanges, people: people.size };
}

/** Free-text match over the person, the target and the action's readable name. */
export function matchesSearch(e: AuditEntry, term: string, actionLabel: string): boolean {
  const t = term.trim().toLowerCase();
  if (!t) return true;
  return `${actorOf(e) ?? ''} ${targetOf(e) ?? ''} ${actionLabel} ${e.action} ${e.ip ?? ''}`.toLowerCase().includes(t);
}

/** Translated name of an audit action ("Kullanıcı davet edildi"); unknown actions show their code. */
export function actionLabel(t: (k: MessageKey) => string, action: string): string {
  const key = `audit.action.${action}` as MessageKey;
  const label = t(key);
  return label === key ? action : label;
}

export type { ActivityFilter };

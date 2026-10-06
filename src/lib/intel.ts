import type { IconName } from '@/components/ui/icon';
import { isIPv4 } from './net';
import { ATTACK_PATTERN, ATTACK_TACTICS, type AttackTactic, type IocType, type Watchlist } from '../mocks/intel';

export const IOC_TYPES: IocType[] = ['ipv4', 'ipv6', 'cidr', 'domain', 'url', 'email', 'sha256', 'sha1', 'md5'];
export const IOC_ICON: Record<IocType, IconName> = {
  ipv4: 'server', ipv6: 'server', cidr: 'cloud', domain: 'globe', url: 'link', email: 'report', sha256: 'key', sha1: 'key', md5: 'key',
};
/** Filter chips group the nine technical types into four everyday ones. */
export type IocGroup = 'address' | 'domain' | 'file' | 'other';
export const IOC_GROUP: Record<IocType, IocGroup> = {
  ipv4: 'address', ipv6: 'address', cidr: 'address', domain: 'domain', url: 'domain', email: 'other', sha256: 'file', sha1: 'file', md5: 'file',
};

/** Works out what kind of indicator a pasted value is; null if it looks like none of them. */
export function detectIocType(raw: string): IocType | null {
  const v = raw.trim();
  if (!v) return null;
  if (isIPv4(v)) return 'ipv4';
  const cidr = /^(.+)\/(\d{1,2})$/.exec(v);
  if (cidr && isIPv4(cidr[1]!) && Number(cidr[2]) <= 32) return 'cidr';
  if (/^[0-9a-f:]+$/i.test(v) && v.includes(':') && v.length >= 3) return 'ipv6';
  if (/^[a-f0-9]{64}$/i.test(v)) return 'sha256';
  if (/^[a-f0-9]{40}$/i.test(v)) return 'sha1';
  if (/^[a-f0-9]{32}$/i.test(v)) return 'md5';
  if (/^(hxxps?|https?|ftp):\/\/\S+$/i.test(v)) return 'url';
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return 'email';
  if (/^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(v)) return 'domain';
  return null;
}

export type Confidence = 'high' | 'medium' | 'low';
export const confidenceOf = (score: number): Confidence => (score >= 80 ? 'high' : score >= 50 ? 'medium' : 'low');

/** Whole days from today until the expiry date (negative = already expired); null when it never expires. */
export function daysLeft(expires: string | null, now = new Date()): number | null {
  if (!expires) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(expires);
  if (!m) return null;
  const end = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((end - today) / 86_400_000);
}

export const isExpired = (expires: string | null, now = new Date()) => (daysLeft(expires, now) ?? 0) < 0;

/** How exposed each ATT&CK tactic is: the pattern holds 6 columns (one per tactic) of 0–3 levels. */
export function tacticExposure(): { tactic: AttackTactic; score: number }[] {
  return ATTACK_TACTICS.map((tactic, col) => ({
    tactic,
    score: ATTACK_PATTERN.filter((_, i) => i % ATTACK_TACTICS.length === col).reduce((a, b) => a + b, 0),
  }));
}

/** The parts of a watchlist's rule that are set, in reading order; the UI turns them into a sentence. */
export function watchParts(w: Pick<Watchlist, 'vendors' | 'products' | 'tag' | 'minCvss' | 'kevOnly' | 'minEpss'>) {
  return {
    vendors: w.vendors,
    products: w.products,
    tag: w.tag.trim(),
    minCvss: w.minCvss,
    kevOnly: w.kevOnly,
    minEpss: w.minEpss,
  };
}

export const hasTarget = (w: Pick<Watchlist, 'vendors' | 'products' | 'tag'>) => w.vendors.length + w.products.length > 0 || w.tag.trim() !== '';

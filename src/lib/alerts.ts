import type { IconName } from '@/components/ui/icon';
import type { Channel, ChannelKind, Rule, Throttle, Trigger } from '@/mocks/alerts';

export const TRIGGERS: Trigger[] = ['kev', 'critical', 'sla', 'epss', 'sync', 'digest'];
export const THROTTLES: Throttle[] = ['every', 'asset6h', 'daily'];
export const RISK_STEPS = [0, 40, 60, 80, 90];
export const ENVS = ['prod', 'staging', 'dev', 'corp'] as const;

export const TRIGGER_ICON: Record<Trigger, IconName> = { kev: 'flame', critical: 'alert', sla: 'clock', epss: 'up', sync: 'sync', digest: 'report' };

/** Only vulnerability-driven triggers can be narrowed down by asset. */
export const TRIGGER_USES_ASSETS: Record<Trigger, boolean> = { kev: true, critical: true, sla: true, epss: true, sync: false, digest: false };

/** A "once a day" throttle only makes sense for the digest, and the digest only works that way. */
export const TRIGGER_THROTTLES: Record<Trigger, Throttle[]> = {
  kev: ['every', 'asset6h'], critical: ['every', 'asset6h'], sla: ['every', 'asset6h'], epss: ['every', 'asset6h'], sync: ['every'], digest: ['daily'],
};

export interface ChannelKindSpec {
  abbr: string;
  icon: IconName;
  /** form fields; `secret` ones are masked, `mono` use the code font */
  fields: { id: string; secret?: boolean; mono?: boolean; required?: boolean }[];
}

export const CHANNEL_KINDS: Record<ChannelKind, ChannelKindSpec> = {
  slack: { abbr: 'SL', icon: 'link', fields: [{ id: 'url', secret: true, mono: true, required: true }, { id: 'channel', required: true }] },
  smtp: { abbr: 'EP', icon: 'report', fields: [{ id: 'host', mono: true, required: true }, { id: 'port', mono: true, required: true }, { id: 'from', required: true }, { id: 'to', required: true }] },
  telegram: { abbr: 'TG', icon: 'bell', fields: [{ id: 'token', secret: true, mono: true, required: true }, { id: 'chat', mono: true, required: true }] },
  webhook: { abbr: 'WH', icon: 'external', fields: [{ id: 'url', mono: true, required: true }, { id: 'secret', secret: true, mono: true }] },
};
export const CHANNEL_KIND_ORDER: ChannelKind[] = ['slack', 'smtp', 'telegram', 'webhook'];

/** The short "where" line shown under a channel's name. */
export function channelTarget(c: Pick<Channel, 'kind' | 'values'>): string {
  const v = c.values;
  switch (c.kind) {
    case 'slack': return v['channel'] ?? '';
    case 'smtp': return `${v['host'] ?? ''}${v['port'] ? `:${v['port']}` : ''}`;
    case 'telegram': return v['chat'] ?? '';
    case 'webhook': return v['url'] ?? '';
  }
}

export function enabledRules(rules: Rule[]): number {
  return rules.filter((r) => r.enabled).length;
}

/** Enabled rules that send to a channel that is currently failing, i.e. alerts that silently go nowhere. */
export function rulesAtRisk(rules: Rule[], channels: Channel[]): Rule[] {
  const failing = new Set(channels.filter((c) => c.status === 'failing').map((c) => c.id));
  return rules.filter((r) => r.enabled && r.channelIds.some((id) => failing.has(id)));
}

export type DayKey = 'today' | 'yesterday' | string;
const localDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Which calendar day an event "N minutes ago" falls on. */
export function dayOfMinutesAgo(min: number, now = new Date()): DayKey {
  const at = new Date(now.getTime() - min * 60_000);
  const today = localDay(now);
  const yesterday = localDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  const d = localDay(at);
  return d === today ? 'today' : d === yesterday ? 'yesterday' : d;
}

import { minutesSince } from '@/lib/minutes';
import type { AlertLogDto, ChannelDto, RuleDto } from '@/lib/types';
import type { Channel, LogEntry, Rule } from '@/mocks/alerts';
import { bi } from '@/mocks/types';

export const toChannel = (d: ChannelDto): Channel => ({
  id: d.id, kind: d.kind, name: d.name, values: d.values, status: d.status,
  ...(d.problem ? { problem: bi(d.problem) } : {}), lastTestMin: d.lastTestAt ? minutesSince(d.lastTestAt) : null,
});

export const toRule = (d: RuleDto): Rule => ({
  id: d.id, name: d.name, trigger: d.trigger, envs: d.envs, minRisk: d.minRisk, exposedOnly: d.exposedOnly, tag: d.tag, channelIds: d.channelIds,
  throttle: d.throttle, enabled: d.enabled, lastFiredMin: d.lastFiredAt ? minutesSince(d.lastFiredAt) : null, fired30: d.fired30,
});

export const toLogEntry = (d: AlertLogDto): LogEntry => ({
  id: d.id, min: minutesSince(d.at), ruleId: d.ruleId ?? '', channelIds: d.channelIds, result: d.result, detail: bi(d.detail),
});

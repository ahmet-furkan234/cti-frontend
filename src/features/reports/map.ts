import { minutesSince } from '@/lib/minutes';
import type { ReportRunDto, ReportScheduleDto } from '@/lib/types';
import type { ReportRun, ReportSchedule } from '@/mocks/reports';

const size = (bytes: number | null) => (bytes == null ? '—' : bytes >= 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

export const toRun = (d: ReportRunDto): ReportRun => ({
  id: d.id, template: d.template, ...(d.scope ? { scope: d.scope } : {}), min: minutesSince(d.createdAt), size: size(d.sizeBytes), formats: d.formats,
  status: d.status, manual: d.manual,
});

export const toSchedule = (d: ReportScheduleDto): ReportSchedule => ({
  id: d.id, template: d.template, ...(d.scope ? { scope: d.scope } : {}), freq: d.freq, recipients: d.recipients, formats: d.formats, enabled: d.enabled,
});

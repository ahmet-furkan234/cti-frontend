export interface ReportTemplate {
  id: 'exec' | 'kev' | 'sla' | 'owner';
  audience: string;
  bars: { h: number; tone: 'accent' | 'critical' | 'high' | 'medium' | 'low' | 'teal' }[];
}

const B = (hs: number[], tones: ReportTemplate['bars'][number]['tone'][]) => hs.map((h, i) => ({ h, tone: tones[i % tones.length]! }));

export const REPORT_TEMPLATES: ReportTemplate[] = [
  { id: 'exec', audience: 'CISO', bars: B([40, 55, 50, 62, 70, 78], ['accent']) },
  { id: 'kev', audience: 'SOC', bars: B([90, 70, 40, 20], ['critical', 'high', 'medium', 'low']) },
  { id: 'sla', audience: 'Mgmt', bars: B([80, 30, 65, 20, 72, 25], ['teal', 'critical']) },
  { id: 'owner', audience: 'Teams', bars: B([60, 45, 80, 30, 55, 40], ['accent']) },
];

export interface ReportSchedule {
  name: string;
  to: string;
  freq: string;
  next: string;
  status: 'healthy' | 'disabled';
}

export const REPORT_SCHEDULES: ReportSchedule[] = [
  { name: 'exec', to: 'ciso@, management@ · PDF', freq: 'weekly-mon', next: '2026-10-05', status: 'healthy' },
  { name: 'kev', to: 'soc@ · PDF + CSV', freq: 'daily', next: '2026-09-30', status: 'healthy' },
  { name: 'sla', to: 'management@ · PDF', freq: 'monthly', next: '2026-10-01', status: 'healthy' },
  { name: 'owner-infra', to: 'infra@ · CSV', freq: 'weekly-fri', next: '2026-10-02', status: 'disabled' },
  { name: 'owner-app', to: 'apps@ · CSV', freq: 'weekly-fri', next: '2026-10-02', status: 'healthy' },
];

export interface ReportRun {
  name: string;
  at: string;
  size: string;
  failed?: boolean;
}

export const REPORT_RUNS: ReportRun[] = [
  { name: 'kev', at: '2026-09-29 07:30', size: '412 KB' },
  { name: 'exec', at: '2026-09-28 08:00', size: '1.8 MB' },
  { name: 'kev', at: '2026-09-28 07:30', size: '405 KB' },
  { name: 'owner-app', at: '2026-09-26 16:00', size: '88 KB' },
  { name: 'owner-infra', at: '2026-09-26 16:00', size: '—', failed: true },
  { name: 'sla', at: '2026-09-01 09:00', size: '960 KB' },
  { name: 'exec-manual', at: '2026-08-29 14:12', size: '1.7 MB' },
];

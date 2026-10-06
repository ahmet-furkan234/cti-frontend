/** Demo: reports (generation and delivery ship with a later backend phase). */
export type TemplateId = 'exec' | 'kev' | 'sla' | 'owner';
export type Freq = 'daily' | 'weekly-mon' | 'weekly-fri' | 'monthly';
export type Format = 'pdf' | 'csv';
export interface ReportSchedule {
  id: string;
  template: TemplateId;
  /** what the report is limited to, e.g. a team ("Altyapı") */
  scope?: string;
  freq: Freq;
  recipients: string[];
  formats: Format[];
  enabled: boolean;
}

export const REPORT_SCHEDULES: ReportSchedule[] = [
  { id: 's1', template: 'exec', freq: 'weekly-mon', recipients: ['ciso@example.com', 'management@example.com'], formats: ['pdf'], enabled: true },
  { id: 's2', template: 'kev', freq: 'daily', recipients: ['soc@example.com'], formats: ['pdf', 'csv'], enabled: true },
  { id: 's3', template: 'sla', freq: 'monthly', recipients: ['management@example.com'], formats: ['pdf'], enabled: true },
  { id: 's4', template: 'owner', scope: 'Altyapı', freq: 'weekly-fri', recipients: ['infra@example.com'], formats: ['csv'], enabled: false },
  { id: 's5', template: 'owner', scope: 'Uygulama', freq: 'weekly-fri', recipients: ['apps@example.com'], formats: ['csv'], enabled: true },
];

export interface ReportRun {
  id: string;
  template: TemplateId;
  scope?: string;
  /** minutes ago */
  min: number;
  size: string;
  formats: Format[];
  status: 'ready' | 'failed' | 'generating';
  manual?: boolean;
}

export const REPORT_RUNS: ReportRun[] = [
  { id: 'r1', template: 'kev', min: 8 * 60, size: '412 KB', formats: ['pdf', 'csv'], status: 'ready' },
  { id: 'r2', template: 'exec', min: 31 * 60, size: '1.8 MB', formats: ['pdf'], status: 'ready' },
  { id: 'r3', template: 'kev', min: 32 * 60, size: '405 KB', formats: ['pdf', 'csv'], status: 'ready' },
  { id: 'r4', template: 'owner', scope: 'Uygulama', min: 3 * 1440, size: '88 KB', formats: ['csv'], status: 'ready' },
  { id: 'r5', template: 'owner', scope: 'Altyapı', min: 3 * 1440, size: '—', formats: ['csv'], status: 'failed' },
  { id: 'r6', template: 'sla', min: 28 * 1440, size: '960 KB', formats: ['pdf'], status: 'ready' },
  { id: 'r7', template: 'exec', min: 31 * 1440, size: '1.7 MB', formats: ['pdf'], status: 'ready', manual: true },
];

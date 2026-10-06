import type { Format, Freq, TemplateId } from '../mocks/reports';

export const FREQS: Freq[] = ['daily', 'weekly-mon', 'weekly-fri', 'monthly'];
export const PERIODS = [7, 30, 90] as const;
/** PDF is not produced yet; reports are CSV files that open in any spreadsheet. */
export const FORMATS: Format[] = ['csv'];

/** When a schedule fires next, counted from `now` (local time). */
export function nextRun(freq: Freq, now = new Date()): Date {
  const at = (d: Date, h: number, m: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m);
  if (freq === 'daily') {
    const today = at(now, 7, 30);
    return today > now ? today : at(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1), 7, 30);
  }
  if (freq === 'monthly') {
    const thisMonth = at(new Date(now.getFullYear(), now.getMonth(), 1), 9, 0);
    return thisMonth > now ? thisMonth : at(new Date(now.getFullYear(), now.getMonth() + 1, 1), 9, 0);
  }
  const [weekday, h, m] = freq === 'weekly-mon' ? [1, 8, 0] : [5, 16, 0];
  const base = at(now, h!, m!);
  const ahead = (weekday! - now.getDay() + 7) % 7;
  const candidate = new Date(base.getFullYear(), base.getMonth(), base.getDate() + ahead, h, m);
  return candidate > now ? candidate : new Date(candidate.getFullYear(), candidate.getMonth(), candidate.getDate() + 7, h, m);
}

const EMAIL = /^[^@\s,;]+@[^@\s,;]+\.[^@\s,;]+$/;

/** Splits "a@x.com, b@y.com" into addresses; `ok` is false if any entry is not an address. */
export function parseRecipients(raw: string): { list: string[]; ok: boolean } {
  const list = [...new Set(raw.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean))];
  return { list, ok: list.every((e) => EMAIL.test(e)) };
}

export type Tone = 'accent' | 'critical' | 'high' | 'medium' | 'low' | 'teal';

export interface ReportTemplate {
  id: TemplateId;
  audience: 'CISO' | 'SOC' | 'Mgmt' | 'Teams';
  /** the little bar sketch on the card; decoration only */
  bars: { h: number; tone: Tone }[];
}

const B = (hs: number[], tones: Tone[]) => hs.map((h, i) => ({ h, tone: tones[i % tones.length]! }));

export const REPORT_TEMPLATES: ReportTemplate[] = [
  { id: 'exec', audience: 'CISO', bars: B([40, 55, 50, 62, 70, 78], ['accent']) },
  { id: 'kev', audience: 'SOC', bars: B([90, 70, 40, 20], ['critical', 'high', 'medium', 'low']) },
  { id: 'sla', audience: 'Mgmt', bars: B([80, 30, 65, 20, 72, 25], ['teal', 'critical']) },
  { id: 'owner', audience: 'Teams', bars: B([60, 45, 80, 30, 55, 40], ['accent']) },
];

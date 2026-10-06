import { bi, type Bi } from './types';

/** Demo: alert rules, channels and the notification log (backend ships with the alerts phase). */
export type ChannelKind = 'slack' | 'smtp' | 'telegram' | 'webhook';
export type ChannelStatus = 'healthy' | 'degraded' | 'failing';
export type Trigger = 'kev' | 'critical' | 'sla' | 'epss' | 'sync' | 'digest';
export type Throttle = 'every' | 'asset6h' | 'daily';

export interface Channel {
  id: string;
  kind: ChannelKind;
  name: string;
  /** field id → value; the fields per kind are defined in lib/alerts.ts */
  values: Record<string, string>;
  status: ChannelStatus;
  /** short, human reason when the channel is not healthy */
  problem?: Bi;
  lastTestMin: number | null;
}

export interface Rule {
  id: string;
  name: Bi | string;
  trigger: Trigger;
  envs: string[];
  minRisk: number;
  exposedOnly: boolean;
  tag: string;
  channelIds: string[];
  throttle: Throttle;
  enabled: boolean;
  /** minutes since it last fired, null = never */
  lastFiredMin: number | null;
  fired30: number;
}

export const CHANNELS: Channel[] = [
  { id: 'ch-slack', kind: 'slack', name: 'Slack', values: { url: 'https://hooks.slack.com/services/T000/B000/XXXX', channel: '#soc-alerts' }, status: 'healthy', lastTestMin: 190 },
  { id: 'ch-smtp', kind: 'smtp', name: 'E-posta', values: { host: 'smtp.example.com', port: '587', from: 'cti@example.com', to: 'soc@example.com' }, status: 'healthy', lastTestMin: 2900 },
  { id: 'ch-tg', kind: 'telegram', name: 'Telegram', values: { token: '123456:ABC-DEF', chat: '-1001234567890' }, status: 'degraded', problem: bi('Yanıt süresi uzadı (ortalama 41 sn)', 'Responses are slow (about 41 s)'), lastTestMin: 480 },
  { id: 'ch-hook', kind: 'webhook', name: 'SIEM webhook', values: { url: 'https://siem.example.com/hooks/cti', secret: '' }, status: 'failing', problem: bi('Sunucu HTTP 502 döndürüyor; son 3 deneme başarısız', 'The server returns HTTP 502; the last 3 attempts failed'), lastTestMin: 120 },
];

export const RULES: Rule[] = [
  { id: 'r-kev', name: bi('Edge cihazlarında yeni KEV', 'New KEV on edge devices'), trigger: 'kev', envs: ['prod'], minRisk: 80, exposedOnly: false, tag: 'edge', channelIds: ['ch-slack', 'ch-smtp'], throttle: 'asset6h', enabled: true, lastFiredMin: 2 * 1440, fired30: 7 },
  { id: 'r-crit', name: bi('Kritik zafiyet (internete açık)', 'Critical vulnerability (internet-facing)'), trigger: 'critical', envs: ['prod'], minRisk: 0, exposedOnly: true, tag: '', channelIds: ['ch-slack'], throttle: 'asset6h', enabled: true, lastFiredMin: 40, fired30: 19 },
  { id: 'r-sla', name: bi('SLA süresi yaklaşınca', 'When an SLA is running out'), trigger: 'sla', envs: [], minRisk: 0, exposedOnly: false, tag: '', channelIds: ['ch-smtp'], throttle: 'every', enabled: true, lastFiredMin: 62, fired30: 12 },
  { id: 'r-epss', name: bi('EPSS sıçraması', 'EPSS jump'), trigger: 'epss', envs: ['prod', 'staging'], minRisk: 60, exposedOnly: false, tag: '', channelIds: ['ch-slack'], throttle: 'every', enabled: true, lastFiredMin: 1500, fired30: 4 },
  { id: 'r-sync', name: bi('Veri senkronizasyonu hatası', 'Data sync failure'), trigger: 'sync', envs: [], minRisk: 0, exposedOnly: false, tag: '', channelIds: ['ch-hook'], throttle: 'every', enabled: true, lastFiredMin: 7 * 60, fired30: 1 },
  { id: 'r-digest', name: bi('Günlük özet', 'Daily digest'), trigger: 'digest', envs: [], minRisk: 0, exposedOnly: false, tag: '', channelIds: ['ch-tg', 'ch-smtp'], throttle: 'daily', enabled: false, lastFiredMin: 9 * 1440, fired30: 21 },
];

export interface LogEntry {
  id: string;
  /** minutes ago */
  min: number;
  ruleId: string;
  channelIds: string[];
  result: 'sent' | 'throttled' | 'failed';
  detail: Bi;
}

export const NOTIFICATION_LOG: LogEntry[] = [
  { id: 'l1', min: 40, ruleId: 'r-crit', channelIds: ['ch-slack'], result: 'sent', detail: bi('CVE-2024-6387 × prod-web-01', 'CVE-2024-6387 × prod-web-01') },
  { id: 'l2', min: 62, ruleId: 'r-sla', channelIds: ['ch-smtp'], result: 'sent', detail: bi('3 zafiyetin SLA süresi 24 saatten az', '3 vulnerabilities have under 24 h left on their SLA') },
  { id: 'l3', min: 95, ruleId: 'r-crit', channelIds: ['ch-slack'], result: 'throttled', detail: bi('Aynı varlık için son 6 saatte zaten bildirildi', 'This asset was already reported in the last 6 hours') },
  { id: 'l4', min: 7 * 60, ruleId: 'r-sync', channelIds: ['ch-hook'], result: 'failed', detail: bi('HTTP 502 · 3 deneme yapıldı', 'HTTP 502 · 3 attempts made') },
  { id: 'l5', min: 11 * 60, ruleId: 'r-digest', channelIds: ['ch-tg'], result: 'sent', detail: bi('41 yeni kayıt · 41 sn gecikmeyle iletildi', '41 new records · delivered 41 s late') },
  { id: 'l6', min: 1500, ruleId: 'r-epss', channelIds: ['ch-slack'], result: 'sent', detail: bi('CVE-2024-6387 · EPSS %92’ye yükseldi', 'CVE-2024-6387 · EPSS rose to 92%') },
  { id: 'l7', min: 2 * 1440, ruleId: 'r-kev', channelIds: ['ch-slack', 'ch-smtp'], result: 'sent', detail: bi('CVE-2024-21762 × fw-edge-01', 'CVE-2024-21762 × fw-edge-01') },
  { id: 'l8', min: 2 * 1440 + 30, ruleId: 'r-sync', channelIds: ['ch-hook'], result: 'failed', detail: bi('HTTP 502 · 3 deneme yapıldı', 'HTTP 502 · 3 attempts made') },
];

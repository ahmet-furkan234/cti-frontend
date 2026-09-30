import { bi, type Bi } from './types';

export interface Channel {
  abbr: string;
  name: string;
  target: string;
  status: 'healthy' | 'degraded' | 'failing';
  /** i18n key suffix */
  label: 'connected' | 'delayed' | 'error';
}

export const CHANNELS: Channel[] = [
  { abbr: 'SL', name: 'Slack', target: '#soc-alerts', status: 'healthy', label: 'connected' },
  { abbr: 'SM', name: 'SMTP', target: 'smtp.example.com:587', status: 'healthy', label: 'connected' },
  { abbr: 'TG', name: 'Telegram', target: 'bot · [chat id]', status: 'degraded', label: 'delayed' },
  { abbr: 'WH', name: 'Webhook', target: 'https://siem.example.com/hooks/cti', status: 'failing', label: 'error' },
];

export interface NotificationLog {
  time: string;
  rule: Bi;
  result: 'sent' | 'throttled' | 'failed';
  meta: Bi;
}

export const NOTIFICATION_LOG: NotificationLog[] = [
  { time: '09:14', rule: bi('Edge cihazlarında yeni KEV', 'New KEV on edge devices'), result: 'sent', meta: bi('Slack, E-posta · CVE-2024-21762 × fw-edge-01', 'Slack, Email · CVE-2024-21762 × fw-edge-01') },
  { time: '08:52', rule: bi('SLA 24 saat kala', 'SLA 24 hours left'), result: 'sent', meta: bi('E-posta · 3 zafiyet', 'Email · 3 vulnerabilities') },
  { time: '08:40', rule: bi('Kritik zafiyet (internete açık)', 'Critical vulnerability (internet-facing)'), result: 'throttled', meta: bi('Kısıtlama · aynı varlık 6 sa', 'Throttle · same asset 6 h') },
  { time: '07:05', rule: bi('Sync hatası', 'Sync failure'), result: 'failed', meta: bi('Webhook · HTTP 502 · 3 deneme', 'Webhook · HTTP 502 · 3 attempts') },
  { time: '03:00', rule: bi('Günlük özet', 'Daily digest'), result: 'sent', meta: bi('Telegram · 41 sn gecikme', 'Telegram · 41 s delay') },
  { time: 'yesterday', rule: bi('EPSS sıçraması ≥ %20', 'EPSS jump ≥ 20%'), result: 'sent', meta: bi('Slack · CVE-2024-6387', 'Slack · CVE-2024-6387') },
];

export interface Condition {
  join: 'if' | 'and';
  field: string;
  op: string;
  value: string;
}

export const CONDITIONS: Condition[] = [
  { join: 'if', field: 'event', op: '=', value: 'new KEV match' },
  { join: 'and', field: 'assetTag', op: 'contains', value: 'edge' },
  { join: 'and', field: 'env', op: '=', value: 'prod' },
  { join: 'and', field: 'risk', op: '≥', value: '80' },
];

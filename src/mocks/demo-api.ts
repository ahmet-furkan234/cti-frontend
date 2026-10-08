import type {
  AlertLogDto, AssetDto, AssetListResponse, ChannelDto, CveAssetDto, CveAssetsResponse, ImportRecordDto, IocDto, IocListResponse, ReportRunDto,
  ReportScheduleDto, RuleDto, VulnDto, WatchlistDto,
} from '../lib/types';
import { CHANNELS, NOTIFICATION_LOG, RULES } from './alerts';
import { ASSET_TYPE_TABS, ASSET_ROWS, EXPOSURE, TAB_TYPES } from './assets';
import { CVE_ASSET_ROWS, CVE_ASSET_STATS } from './cve-assets';
import { IMPORT_HISTORY } from './import';
import { IOCS, WATCHLISTS } from './intel';
import { REPORT_RUNS, REPORT_SCHEDULES } from './reports';
import { VULN_ROWS, riskOf } from './vulns';

/**
 * Sample data for the local preview session only (signing in with the "skip login" button).
 * A real session never reaches this file: it talks to the backend and shows "no data" when there is none.
 */
type Query = Record<string, string | number | boolean | string[] | null | undefined>;

const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
const bi = (v: string | { tr: string; en: string }) => (typeof v === 'string' ? v : v.tr);

const assets = (): AssetDto[] =>
  ASSET_ROWS.map((r, i) => ({
    id: `demo-asset-${i}`, type: r.type, name: r.host, addr: r.ip, os: r.os, env: r.env, criticality: r.crit, exposed: r.exposed, source: r.source,
    owner: null, tags: [], status: r.status, lastSeenAt: ago(r.seenMin), createdAt: ago(r.seenMin), updatedAt: ago(r.seenMin), risk: r.risk, counts: r.counts,
  }));

function assetList(q: Query): AssetListResponse {
  const types = TAB_TYPES[String(q['tab'] ?? 'all')] ?? null;
  const term = String(q['q'] ?? '').toLowerCase();
  const rows = assets()
    .filter((a) => (!types || types.includes(a.type)) && (!q['exposed'] || a.exposed) && (!q['criticalVulns'] || a.counts[0] > 0)
      && (!q['stale'] || a.status === 'stale') && (!q['env'] || a.env === q['env']) && (!q['criticality'] || a.criticality === q['criticality'])
      && (!term || `${a.name} ${a.addr} ${a.os}`.toLowerCase().includes(term)))
    .sort((a, b) => (q['sort'] === 'name' ? a.name.localeCompare(b.name) : q['sort'] === 'seen' ? +new Date(b.lastSeenAt) - +new Date(a.lastSeenAt) : b.risk - a.risk));
  const page = Math.max(1, Number(q['page']) || 1);
  const size = Math.max(1, Number(q['pageSize']) || 50);
  const tabs = Object.fromEntries(ASSET_TYPE_TABS.map((t) => [t.id, t.count])) as AssetListResponse['stats']['tabs'];
  return {
    items: rows.slice((page - 1) * size, page * size), total: rows.length,
    stats: { total: tabs.all, active: 2201, stale: EXPOSURE.stale, archived: 53, exposed: EXPOSURE.internet, withCritical: EXPOSURE.kev, tabs },
  };
}

const sev = (cvss: number): VulnDto['severity'] => (cvss >= 9 ? 4 : cvss >= 7 ? 3 : cvss >= 4 ? 2 : 1);
const vulns = (): VulnDto[] =>
  VULN_ROWS.map((r, i) => ({
    id: `demo-vuln-${i}`, cve: r.cve, assetId: `demo-host-${r.host}`, host: r.host, env: r.env, exposed: r.exposed, kev: r.kev, cvss: r.cvss, severity: sev(r.cvss),
    epss: r.epss, status: r.status, firstSeenAt: ago(60 * 24 * 3), component: `demo:${r.fix.split(' ')[0]?.toLowerCase() ?? 'component'}`,
    installedVersion: null, fixedVersion: r.fix.split(' ').slice(1).join(' ') || null, risk: riskOf(r), slaHours: r.slaHours,
  }));

function cveAssets(): CveAssetsResponse {
  const items: CveAssetDto[] = CVE_ASSET_ROWS.map((r, i) => ({
    id: `demo-cve-asset-${i}`, cve: 'CVE-2024-6387', assetId: `demo-host-${r.host}`, host: r.host, env: r.env, exposed: r.exposed, kev: false, cvss: 8.1, severity: 3,
    epss: 0.9, status: r.status, firstSeenAt: ago(60 * 24 * 3), component: 'openbsd:openssh', installedVersion: r.installed, fixedVersion: r.fixed, risk: r.risk,
    slaHours: r.slaHours, ip: r.ip, os: r.os, owner: r.owner, source: r.source, lastSeenAt: ago(r.seenMin),
  }));
  return { items, stats: CVE_ASSET_STATS };
}

const channels = (): ChannelDto[] =>
  CHANNELS.map((c) => ({ id: c.id, kind: c.kind, name: c.name, values: c.values, status: c.status, problem: c.problem?.tr ?? null, lastTestAt: c.lastTestMin == null ? null : ago(c.lastTestMin) }));
const rules = (): RuleDto[] =>
  RULES.map((r) => ({ id: r.id, name: bi(r.name), trigger: r.trigger, envs: r.envs, minRisk: r.minRisk, exposedOnly: r.exposedOnly, tag: r.tag, channelIds: r.channelIds, throttle: r.throttle, enabled: r.enabled, lastFiredAt: r.lastFiredMin == null ? null : ago(r.lastFiredMin), fired30: r.fired30 }));
const alertLog = (): AlertLogDto[] => NOTIFICATION_LOG.map((e) => ({ id: e.id, ruleId: e.ruleId, channelIds: e.channelIds, result: e.result, detail: e.detail.tr, at: ago(e.min) }));

const watchlists = (): WatchlistDto[] => WATCHLISTS.map((w) => ({ ...w }));
const iocs = (): IocListResponse => {
  const items: IocDto[] = IOCS.map((i) => ({ id: i.id, type: i.type, value: i.value, source: i.source, confidence: i.confidence, expiresAt: i.expires ? `${i.expires}T00:00:00.000Z` : null, matches: i.matches }));
  return { items, total: items.length, active: 18_442, expiring: 3 };
};

const runs = (): ReportRunDto[] =>
  REPORT_RUNS.map((r) => ({ id: r.id, scheduleId: null, template: r.template, scope: r.scope ?? null, formats: ['csv'], status: r.status, manual: !!r.manual, sizeBytes: r.status === 'ready' ? 412_000 : null, error: null, createdAt: ago(r.min) }));
const schedules = (): ReportScheduleDto[] => REPORT_SCHEDULES.map((s) => ({ id: s.id, template: s.template, scope: s.scope ?? null, freq: s.freq, recipients: s.recipients, formats: ['csv'], enabled: s.enabled }));

const imports = (): { items: ImportRecordDto[] } => ({
  items: IMPORT_HISTORY.map((h, i) => ({ id: `demo-import-${i}`, source: h.source, kind: h.kind, rows: 0, created: 0, updated: 0, skipped: 0, status: h.status, createdAt: `${h.date}T09:00:00.000Z` })),
});

function assetDetail(id: string): unknown {
  const a = assets().find((x) => x.id === id);
  return a ? { ...a, attrs: {}, software: [] } : undefined;
}

export function mockDemoRead(path: string, query: Query = {}): unknown {
  if (/^\/assets\/demo-asset-\d+$/.test(path)) return assetDetail(path.slice(8));
  if (path === '/assets') return assetList(query);
  if (path === '/assets/imports') return imports();
  if (path === '/vulns') return { items: vulns() };
  if (/^\/cves\/[^/]+\/assets$/.test(path)) return cveAssets();
  if (path === '/alerts/channels') return { items: channels() };
  if (path === '/alerts/rules') return { items: rules() };
  if (path === '/alerts/log') return { items: alertLog() };
  if (path === '/intel/watchlists') return { items: watchlists() };
  if (path === '/intel/iocs') return iocs();
  if (path === '/intel/findings') return { items: [], total: 0 };
  if (path === '/intel/new-kev') return { items: [] };
  if (/^\/intel\/iocs\/[^/]+\/assets$/.test(path)) return { items: [] };
  if (path === '/reports/runs') return { items: runs() };
  if (path === '/reports/schedules') return { items: schedules() };
  return undefined;
}

import type { AssetType, CriticalityLevel, ImportRowBody } from './types';

/** A parsed file as a table: the first row of a spreadsheet becomes the column names. */
export interface Table {
  columns: string[];
  rows: string[][];
}

export const FIELD_OPTIONS = ['hostname', 'ip_address', 'os', 'type', 'environment', 'criticality', 'owner', 'software', 'tags'] as const;
export type ImportField = (typeof FIELD_OPTIONS)[number];

/** Splits CSV text into cells; handles quotes, doubled quotes and ; or tab as the separator. */
export function parseCsv(text: string): Table {
  const src = text.replace(/^﻿/, '');
  const first = src.split(/\r?\n/, 1)[0] ?? '';
  const sep = [',', ';', '\t'].map((c) => [c, first.split(c).length] as const).sort((a, b) => b[1] - a[1])[0]![0];
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== '')) rows.push(row);
  const [head, ...body] = rows;
  return { columns: (head ?? []).map((c) => c.trim()), rows: body.map((r) => (head ?? []).map((_, i) => (r[i] ?? '').trim())) };
}

/** Nmap -oX output: one row per host that is up, with its open services as software. */
export function parseNmap(xml: string): Table {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror') || doc.documentElement.nodeName !== 'nmaprun') throw new Error('not-nmap');
  const rows: string[][] = [];
  for (const host of Array.from(doc.querySelectorAll('host'))) {
    if (host.querySelector('status')?.getAttribute('state') === 'down') continue;
    const ip = host.querySelector('address[addrtype="ipv4"]')?.getAttribute('addr') ?? '';
    const name = host.querySelector('hostnames hostname')?.getAttribute('name') ?? '';
    const os = host.querySelector('os osmatch')?.getAttribute('name') ?? '';
    const software = Array.from(host.querySelectorAll('port'))
      .filter((p) => p.querySelector('state')?.getAttribute('state') === 'open')
      .map((p) => {
        const svc = p.querySelector('service');
        const product = svc?.getAttribute('product') ?? '';
        return product ? `${product} ${svc?.getAttribute('version') ?? ''}`.trim() : '';
      })
      .filter(Boolean)
      .join('; ');
    rows.push([name, ip, os, software]);
  }
  return { columns: ['hostname', 'ip', 'os', 'software'], rows };
}

/** CycloneDX or SPDX JSON: one asset (the described application) whose components are its software. */
export function parseSbom(json: string): Table {
  const doc = JSON.parse(json) as Record<string, unknown>;
  type Comp = { name?: string; version?: string; versionInfo?: string };
  let name = '';
  let comps: Comp[] = [];
  if (Array.isArray(doc['components'])) {
    name = String((doc['metadata'] as { component?: { name?: string } } | undefined)?.component?.name ?? '');
    comps = doc['components'] as Comp[];
  } else if (Array.isArray(doc['packages'])) {
    name = String(doc['name'] ?? '');
    comps = doc['packages'] as Comp[];
  } else throw new Error('not-sbom');
  const software = comps
    .filter((c) => c.name)
    .map((c) => `${c.name} ${c.version ?? c.versionInfo ?? ''}`.trim())
    .join('; ');
  return { columns: ['hostname', 'software'], rows: [[name, software]] };
}

const HEADER_HINTS: [ImportField, RegExp][] = [
  ['hostname', /^(host ?name|host|name|ad|asset( name)?|computer|server|device|varl[ıi]k)$/i],
  ['ip_address', /^(ip( ?address)?|ipv4|address|adres|ip adresi)$/i],
  ['os', /^(os|operating ?system|i[sş]letim ?sistemi|platform)$/i],
  ['type', /^(type|asset ?type|t[uü]r|kind)$/i],
  ['environment', /^(env|environment|ortam|stage)$/i],
  ['criticality', /^(crit(icality)?|importance|priority|[oö]nem|kritiklik)$/i],
  ['owner', /^(owner|team|sahip|ekip|responsible)$/i],
  ['software', /^(software|packages?|applications?|yaz[ıi]l[ıi]m|services?)$/i],
  ['tags', /^(tags?|labels?|etiket(ler)?)$/i],
];

/** Best guess of what each column holds; a field is used for at most one column. */
export function autoMap(columns: string[]): Record<string, ImportField | ''> {
  const taken = new Set<ImportField>();
  const out: Record<string, ImportField | ''> = {};
  for (const col of columns) {
    const hit = HEADER_HINTS.find(([f, re]) => !taken.has(f) && re.test(col.trim()));
    out[col] = hit ? hit[0] : '';
    if (hit) taken.add(hit[0]);
  }
  return out;
}

const ENV: [string, RegExp][] = [
  ['prod', /^(prod|production|canl[ıi])/i], ['staging', /^(stag|stage|uat|test|pre)/i], ['dev', /^(dev|development|geli[sş])/i], ['corp', /^(corp|office|ofis|kurumsal)/i],
];
const CRIT: [CriticalityLevel, RegExp][] = [
  ['critical', /^(crit|kritik|1\b|p0|p1)/i], ['high', /^(high|y[uü]ksek|2\b|p2)/i], ['medium', /^(med|orta|3\b|p3)/i], ['low', /^(low|d[uü][sş][uü]k|4\b|p4)/i],
];
const TYPE: [AssetType, RegExp][] = [
  ['fw', /firewall|g[uü]venlik duvar|^fw/i], ['db', /database|veritaban|^db/i], ['web', /web|app|uygulama/i], ['container', /container|konteyner|docker|pod/i],
  ['cloud', /cloud|bulut|aws|azure|gcp/i], ['laptop', /laptop|endpoint|workstation|desktop|uç nokta|pc/i], ['server', /server|sunucu|vm|host/i],
];
const pick = <T,>(table: [T, RegExp][], v: string): T | undefined => table.find(([, re]) => re.test(v.trim()))?.[0];

const splitList = (v: string, seps: RegExp) => v.split(seps).map((s) => s.trim()).filter(Boolean);

/** "openssh 8.9p1; nginx 1.18.0" → software entries; a trailing version-looking word is the version. */
export function parseSoftware(v: string): { product: string; version?: string }[] {
  return splitList(v, /[;|\n]/).map((entry) => {
    const m = /^(.*\S)\s+v?(\d[\w.+~:-]*)$/.exec(entry);
    return m ? { product: m[1]!, version: m[2]! } : { product: entry };
  });
}

/** Turns the table plus the column → field mapping into rows the API takes; `row` is the spreadsheet line. */
export function buildRows(table: Table, mapping: Record<string, ImportField | ''>, firstLine: number): ImportRowBody[] {
  const idx = (f: ImportField) => table.columns.findIndex((c) => mapping[c] === f);
  const at = (r: string[], f: ImportField) => {
    const i = idx(f);
    return i < 0 ? '' : (r[i] ?? '').trim();
  };
  return table.rows.map((r, n) => {
    const out: ImportRowBody = { row: n + firstLine };
    const set = <K extends keyof ImportRowBody>(k: K, v: ImportRowBody[K] | undefined | '') => { if (v !== undefined && v !== '') out[k] = v as ImportRowBody[K]; };
    set('name', at(r, 'hostname'));
    set('addr', at(r, 'ip_address'));
    set('os', at(r, 'os'));
    set('type', pick(TYPE, at(r, 'type')));
    set('env', pick(ENV, at(r, 'environment')));
    set('criticality', pick(CRIT, at(r, 'criticality')));
    set('owner', at(r, 'owner'));
    const tags = splitList(at(r, 'tags'), /[,;|]/);
    if (tags.length) out.tags = tags;
    const sw = parseSoftware(at(r, 'software'));
    if (sw.length) out.software = sw;
    return out;
  });
}

/** A small file to try the wizard with; the second data row has an invalid address on purpose. */
export const SAMPLE_CSV = [
  'Host Name,IP,Operating System,Environment,Criticality,Owner,Software',
  'web-prod-01,10.20.4.17,Ubuntu 22.04 LTS,prod,High,infra-team,openssh 8.9p1; nginx 1.18.0',
  'db-core-02,10.20.6.300,RHEL 9.2,prod,Critical,data-team,postgresql 14.2',
  'jenkins-ci,10.20.8.3,Debian 12,prod,High,devops,jenkins 2.440',
  'dev-box-12,10.50.2.12,Fedora 40,dev,Low,devops,openssh 9.6',
].join('\n');

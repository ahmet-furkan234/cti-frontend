import type { AssetType, Criticality } from '@/mocks/assets';

/**
 * What the "Add asset" form asks for, per asset type. Labels live in i18n/messages/asset-types.ts under
 * `atype.f.<type>.<field>` (+ optional `.hint`); a test keeps the two in sync.
 */
export type FieldKind = 'text' | 'select' | 'switch';

export interface FieldSpec {
  id: string;
  kind: FieldKind;
  /** select choices; shown as `atype.o.<value>` when such a message exists, otherwise verbatim (product names) */
  options?: string[];
  mono?: boolean;
  /** shown in the live preview when filled */
  summary?: boolean;
}

export interface AssetTypeSpec {
  id: AssetType;
  /** what kind of address identifies it: an IP, a URL, or nothing */
  addr: 'ip' | 'url' | 'none';
  /** a name is always enough; some types also accept just the address */
  required: 'name' | 'name-or-addr';
  /** whether to ask if it is reachable from the internet */
  exposure: boolean;
  defaults: { crit: Criticality; exposed: boolean };
  fields: FieldSpec[];
  /** whether to ask for a list of installed software / packages */
  software: boolean;
}

const OS_LINUX_WIN = ['Ubuntu', 'Debian', 'Red Hat Enterprise Linux', 'Rocky / AlmaLinux', 'CentOS', 'SUSE', 'Windows Server', 'other'];

export const ASSET_TYPE_SPECS: Record<AssetType, AssetTypeSpec> = {
  server: {
    id: 'server', addr: 'ip', required: 'name-or-addr', exposure: true, software: true,
    defaults: { crit: 'medium', exposed: false },
    fields: [
      { id: 'os', kind: 'select', options: OS_LINUX_WIN, summary: true },
      { id: 'os_version', kind: 'text', mono: true, summary: true },
      { id: 'role', kind: 'select', options: ['role.app', 'role.web', 'role.db', 'role.file', 'role.mail', 'role.ad', 'other'] },
      { id: 'platform', kind: 'select', options: ['physical', 'VMware', 'Hyper-V', 'KVM', 'other'] },
    ],
  },
  web: {
    id: 'web', addr: 'url', required: 'name-or-addr', exposure: true, software: true,
    defaults: { crit: 'high', exposed: true },
    fields: [
      { id: 'webserver', kind: 'select', options: ['nginx', 'Apache HTTP Server', 'Microsoft IIS', 'Apache Tomcat', 'Caddy', 'other'], summary: true },
      { id: 'webserver_version', kind: 'text', mono: true },
      { id: 'framework', kind: 'text', summary: true },
      { id: 'runtime', kind: 'text' },
      { id: 'host', kind: 'text' },
      { id: 'tls', kind: 'switch' },
      { id: 'waf', kind: 'switch' },
    ],
  },
  db: {
    id: 'db', addr: 'ip', required: 'name-or-addr', exposure: true, software: false,
    defaults: { crit: 'high', exposed: false },
    fields: [
      { id: 'engine', kind: 'select', options: ['PostgreSQL', 'MySQL / MariaDB', 'Microsoft SQL Server', 'Oracle Database', 'MongoDB', 'Redis', 'Elasticsearch', 'other'], summary: true },
      { id: 'version', kind: 'text', mono: true, summary: true },
      { id: 'port', kind: 'text', mono: true },
      { id: 'host', kind: 'text' },
      { id: 'sensitive', kind: 'switch' },
      { id: 'encrypted', kind: 'switch' },
    ],
  },
  container: {
    id: 'container', addr: 'none', required: 'name', exposure: true, software: true,
    defaults: { crit: 'medium', exposed: false },
    fields: [
      { id: 'tag', kind: 'text', mono: true, summary: true },
      { id: 'registry', kind: 'text' },
      { id: 'orchestrator', kind: 'select', options: ['Kubernetes', 'Docker', 'OpenShift', 'Amazon ECS', 'Nomad', 'other'], summary: true },
      { id: 'namespace', kind: 'text', mono: true },
      { id: 'base_os', kind: 'text' },
      { id: 'privileged', kind: 'switch' },
    ],
  },
  cloud: {
    id: 'cloud', addr: 'ip', required: 'name', exposure: true, software: false,
    defaults: { crit: 'medium', exposed: false },
    fields: [
      { id: 'provider', kind: 'select', options: ['AWS', 'Microsoft Azure', 'Google Cloud', 'other'], summary: true },
      { id: 'resource_type', kind: 'select', options: ['res.vm', 'res.storage', 'res.db', 'res.function', 'res.k8s', 'other'], summary: true },
      { id: 'account', kind: 'text', mono: true },
      { id: 'region', kind: 'text', mono: true },
      { id: 'resource_id', kind: 'text', mono: true },
      { id: 'os', kind: 'text' },
    ],
  },
  fw: {
    id: 'fw', addr: 'ip', required: 'name-or-addr', exposure: false, software: false,
    defaults: { crit: 'critical', exposed: true },
    fields: [
      { id: 'vendor', kind: 'select', options: ['Fortinet', 'Palo Alto Networks', 'Cisco', 'Check Point', 'Juniper', 'SonicWall', 'pfSense', 'other'], summary: true },
      { id: 'model', kind: 'text', summary: true },
      { id: 'firmware', kind: 'text', mono: true, summary: true },
      { id: 'mgmt_exposed', kind: 'switch' },
      { id: 'vpn', kind: 'switch' },
      { id: 'ha', kind: 'switch' },
    ],
  },
  laptop: {
    id: 'laptop', addr: 'ip', required: 'name', exposure: false, software: true,
    defaults: { crit: 'low', exposed: false },
    fields: [
      { id: 'user', kind: 'text' },
      { id: 'os', kind: 'select', options: ['Windows 11', 'Windows 10', 'macOS', 'Ubuntu', 'other'], summary: true },
      { id: 'os_version', kind: 'text', mono: true, summary: true },
      { id: 'make', kind: 'text' },
      { id: 'disk_encrypted', kind: 'switch' },
      { id: 'edr', kind: 'switch' },
      { id: 'mdm', kind: 'switch' },
    ],
  },
};

/** Order shown in the type chooser: what people add most often first. */
export const ASSET_TYPE_ORDER: AssetType[] = ['server', 'web', 'db', 'container', 'cloud', 'fw', 'laptop'];

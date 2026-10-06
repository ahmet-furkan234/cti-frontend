import type { IconName } from '@/components/ui/icon';
import type { MessageKey, TFunction } from '@/i18n';
import type { PermissionDef, PermissionOverride, Role } from '@/lib/types';

/** Permissions are shown to people as "areas" (the backend module) with a few plain-language actions each. */
export interface AccessArea {
  module: string;
  perms: PermissionDef[];
  /** The "view" permission of the area, if it has one; every other action in the area builds on it. */
  viewKey: string | null;
}

const AREA_ICON: Record<string, IconName> = {
  cve: 'search',
  dashboard: 'dashboard',
  sync: 'sync',
  user: 'users',
  role: 'shield',
  audit: 'audit',
  asset: 'assets',
  vuln: 'alert',
  alert: 'bell',
  intel: 'intel',
  report: 'report',
};
export const areaIcon = (module: string): IconName => AREA_ICON[module] ?? 'settings';

const text = (t: TFunction, key: string, fallback: string) => {
  const out = t(key as MessageKey);
  return out === key ? fallback : out;
};

export const areaTitle = (t: TFunction, module: string) => text(t, `mod.${module}`, module);
export const areaDescription = (t: TFunction, module: string) => text(t, `moddesc.${module}`, '');
/** Short action name ("View", "Edit"…); falls back to the backend description for permissions the UI doesn't know yet. */
export const actionLabel = (t: TFunction, p: PermissionDef) => text(t, `permlabel.${p.key}`, p.description || p.key);
/** "Users · Edit" — used wherever an action is shown outside its area. */
export const fullActionLabel = (t: TFunction, p: PermissionDef) => `${areaTitle(t, p.module)} · ${actionLabel(t, p)}`;

/** System roles get a translated name; custom roles keep what the admin typed (snake_case shown with spaces). */
export function roleLabel(t: TFunction, name: string): string {
  const known = t(`rolename.${name}` as MessageKey);
  if (known !== `rolename.${name}`) return known;
  const spaced = name.replace(/[_-]+/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function groupByArea(catalog: PermissionDef[]): AccessArea[] {
  const map = new Map<string, PermissionDef[]>();
  for (const p of catalog) map.set(p.module, [...(map.get(p.module) ?? []), p]);
  return [...map.entries()].map(([module, perms]) => ({
    module,
    perms,
    viewKey: perms.find((p) => /:(read|view)$/.test(p.key))?.key ?? null,
  }));
}

/** Toggling an action on also turns the area's "view" on; turning "view" off turns the rest of the area off. */
export function toggleAction(keys: string[], area: AccessArea, key: string, on: boolean, canChange: (k: string) => boolean): string[] {
  const set = new Set(keys);
  if (on) {
    set.add(key);
    if (area.viewKey && canChange(area.viewKey)) set.add(area.viewKey);
  } else {
    set.delete(key);
    if (key === area.viewKey) for (const p of area.perms) if (canChange(p.key)) set.delete(p.key);
  }
  return [...set];
}

export type AccessSource = 'role' | 'extra' | 'blocked' | 'none';
export interface AccessState {
  allowed: boolean;
  source: AccessSource;
  roles: string[];
}

export function accessState(key: string, roles: Role[], overrides: PermissionOverride[]): AccessState {
  const via = roles.filter((r) => r.permissionKeys.includes(key)).map((r) => r.name);
  const o = overrides.find((x) => x.key === key);
  if (o?.effect === 'deny') return { allowed: false, source: 'blocked', roles: via };
  if (o?.effect === 'grant') return { allowed: true, source: 'extra', roles: via };
  return via.length ? { allowed: true, source: 'role', roles: via } : { allowed: false, source: 'none', roles: [] };
}

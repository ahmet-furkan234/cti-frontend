import type { MessageKey, TFunction } from '@/i18n';
import type { PermissionDef } from '@/lib/types';

/** Localized permission description; falls back to the backend's text for keys the UI doesn't know. */
export function permissionDescription(t: TFunction, p: PermissionDef): string {
  const key = `permdesc.${p.key}` as MessageKey;
  const text = t(key);
  return text === key ? p.description : text;
}
